import CoreLocation
import Foundation

struct OfferBadge: Identifiable, Hashable {
    enum Style: String, Hashable {
        case distance
        case urgency
        case status
        case tier
    }

    let text: String
    let style: Style

    var id: String { "\(style.rawValue):\(text)" }
}

struct RecommendedOffer: Identifiable {
    let offer: Offer
    let badges: [OfferBadge]

    var id: String { offer.id }
}

struct RecommendationSections {
    let personalized: [RecommendedOffer]
    let nearby: [RecommendedOffer]
    let tier: [RecommendedOffer]
}

final class RecommendationsService {
    static let shared = RecommendationsService()

    private let offersService = OffersService.shared
    private let locationManager = LocationManager.shared

    private init() {}

    func personalizedSections(
        for user: User?,
        transactions: [Transaction],
        excluding excludedOfferIds: Set<String> = [],
        limit: Int = 6
    ) async -> RecommendationSections {
        if user != nil {
            let location = locationManager.lastLocation?.coordinate
            if let server = try? await offersService.recommendations(
                lat: location?.latitude,
                lng: location?.longitude,
                limit: limit,
                excluding: excludedOfferIds
            ) {
                let result = RecommendationSections(
                    personalized: server.personalized.map { recommendedOffer(for: $0) },
                    nearby: server.nearby.map { recommendedOffer(for: $0, includeDistance: true) },
                    tier: server.tier.map { recommendedOffer(for: $0) }
                )
                AnalyticsService.shared.trackEvent(
                    eventType: "recommendations_loaded",
                    metadata: ["source": "server", "personalizedCount": result.personalized.count]
                )
                return result
            }
        }

        // Offline/guest fallback keeps the home screen useful if personalization
        // is temporarily unavailable.
        let purchasedOfferIds = Set(transactions.map(\.offerId)).union(excludedOfferIds)
        let topCategories = preferredCategories(from: transactions)
        let averageSpend = averageSpend(from: transactions)

        async let baseFeedTask = offersService.list(filters: OfferFilters(take: 60, sort: "newest"))
        async let nearbyFeedTask = loadNearbyFeed()

        let baseFeed = (try? await baseFeedTask)?.data ?? []
        let nearbyFeed = await nearbyFeedTask

        var usedOfferIds = Set<String>()
        let personalized = pickOffers(
            from: baseFeed,
            limit: limit,
            excluding: purchasedOfferIds,
            usedOfferIds: &usedOfferIds
        ) { offer in
            historyScore(for: offer, preferredCategories: topCategories, averageSpend: averageSpend)
        }

        let nearby = pickOffers(
            from: sortedNearbyOffers(nearbyFeed),
            limit: limit,
            excluding: purchasedOfferIds,
            usedOfferIds: &usedOfferIds
        ) { _ in
            1
        }
        .map { recommendedOffer(for: $0, includeDistance: true) }

        let tier = pickOffers(
            from: baseFeed,
            limit: limit,
            excluding: purchasedOfferIds,
            usedOfferIds: &usedOfferIds
        ) { offer in
            tierScore(for: offer, tier: user?.tierEnum ?? .silver)
        }

        AnalyticsService.shared.trackEvent(
            eventType: "recommendations_loaded",
            metadata: [
                "nearbyCount": nearby.count,
                "personalizedCount": personalized.count,
                "tierCount": tier.count
            ]
        )

        return RecommendationSections(
            personalized: personalized.map { recommendedOffer(for: $0) },
            nearby: nearby,
            tier: tier.map { recommendedOffer(for: $0) }
        )
    }

    func relatedOffers(
        for offer: Offer,
        user _: User?,
        transactions _: [Transaction],
        limit: Int = 6
    ) async -> [RecommendedOffer] {
        let backendRelated = (try? await offersService.getRelated(offer.id, take: limit))?.data ?? []
        return backendRelated.map { recommendedOffer(for: $0) }
    }

    private func loadNearbyFeed() async -> [Offer] {
        guard let location = locationManager.lastLocation else { return [] }

        let filters = OfferFilters(
            take: 24,
            sort: "newest",
            lat: location.coordinate.latitude,
            lng: location.coordinate.longitude,
            radiusKm: 5
        )

        let nearbyResponse = try? await offersService.list(filters: filters)
        return nearbyResponse?.data ?? []
    }

    private func pickOffers(
        from candidates: [Offer],
        limit: Int,
        excluding excludedIds: Set<String>,
        usedOfferIds: inout Set<String>,
        score: (Offer) -> Int
    ) -> [Offer] {
        let rankedOffers = candidates
            .filter { offer in
                offer.safeIsActive && !excludedIds.contains(offer.id) && !usedOfferIds.contains(offer.id)
            }
            .map { offer in
                (offer, score(offer))
            }
            .filter { $0.1 > 0 }
            .sorted { lhs, rhs in
                if lhs.1 == rhs.1 {
                    return lhs.0.safePrice < rhs.0.safePrice
                }
                return lhs.1 > rhs.1
            }
            .prefix(limit)
            .map(\.0)

        for offer in rankedOffers {
            usedOfferIds.insert(offer.id)
        }

        return rankedOffers
    }

    private func preferredCategories(from transactions: [Transaction]) -> [String] {
        let categoryCounts = transactions.reduce(into: [String: Int]()) { counts, transaction in
            guard let category = transaction.offer?.category, !category.isEmpty else { return }
            counts[category, default: 0] += 1
        }

        return categoryCounts
            .sorted { lhs, rhs in
                if lhs.value == rhs.value {
                    return lhs.key < rhs.key
                }
                return lhs.value > rhs.value
            }
            .map(\.key)
    }

    private func averageSpend(from transactions: [Transaction]) -> Double {
        guard !transactions.isEmpty else { return 0 }
        let totalSpend = transactions.reduce(0.0) { $0 + $1.price }
        return totalSpend / Double(transactions.count)
    }

    private func historyScore(for offer: Offer, preferredCategories: [String], averageSpend: Double) -> Int {
        var score = 0

        if let category = offer.category,
           let categoryIndex = preferredCategories.firstIndex(of: category) {
            score += max(30 - (categoryIndex * 8), 10)
        } else if preferredCategories.isEmpty {
            score += 12
        }

        if averageSpend > 0 {
            let priceGap = abs(offer.safePrice - averageSpend)
            let threshold = max(averageSpend * 0.35, 5)
            if priceGap <= threshold {
                score += 20
            }
        }

        if offer.discountPercent ?? 0 >= 15 {
            score += 12
        }

        if offer.safeIsFlashDrop {
            score += 8
        }

        if offer.isFeaturedNow {
            score += 8
        }

        return score
    }

    private func tierScore(for offer: Offer, tier: UserTier) -> Int {
        var score = 10

        switch tier {
        case .silver:
            if offer.safePrice <= 15 { score += 24 }
            if offer.discountPercent ?? 0 >= 20 { score += 16 }
            if !offer.safeIsExclusive { score += 8 }
        case .gold:
            if offer.discountPercent ?? 0 >= 15 { score += 16 }
            if offer.safeIsFlashDrop { score += 14 }
            if offer.isFeaturedNow { score += 14 }
            if offer.safePrice >= 10 && offer.safePrice <= 50 { score += 10 }
        case .platinum:
            if offer.safeIsExclusive { score += 18 }
            if offer.isFeaturedNow { score += 18 }
            if offer.safeIsFlashDrop { score += 12 }
            if offer.safePrice >= 20 { score += 8 }
        }

        return score
    }

    private func sortedNearbyOffers(_ offers: [Offer]) -> [Offer] {
        guard let location = locationManager.lastLocation else { return offers }

        return offers.sorted { lhs, rhs in
            let lhsDistance = distance(to: lhs, from: location) ?? .greatestFiniteMagnitude
            let rhsDistance = distance(to: rhs, from: location) ?? .greatestFiniteMagnitude
            return lhsDistance < rhsDistance
        }
    }

    private func distanceLabel(for offer: Offer) -> String? {
        guard let location = locationManager.lastLocation,
              let distance = distance(to: offer, from: location) else { return nil }

        if distance < 1000 {
            return L10n.format("recommendation.distance.meters", Int(distance.rounded()))
        }

        return L10n.format("recommendation.distance.kilometers", distance / 1000)
    }

    private func timeLeftLabel(for offer: Offer) -> String? {
        guard let hoursLeft = offer.hoursLeft, hoursLeft > 0, hoursLeft <= 72 else { return nil }

        if hoursLeft < 1 {
            return L10n.tr("recommendation.time.less_than_hour")
        }

        if hoursLeft < 24 {
            return L10n.format("recommendation.time.hours", Int(hoursLeft.rounded(.up)))
        }

        return L10n.format("recommendation.time.days", Int((hoursLeft / 24).rounded(.up)))
    }

    private func badges(for offer: Offer, includeDistance: Bool) -> [OfferBadge] {
        var badges: [OfferBadge] = []

        if includeDistance, let distanceLabel = distanceLabel(for: offer) {
            badges.append(OfferBadge(text: distanceLabel, style: .distance))
        }

        if let timeLeftLabel = timeLeftLabel(for: offer) {
            badges.append(OfferBadge(text: timeLeftLabel, style: .urgency))
        }

        return badges
    }

    private func recommendedOffer(for offer: Offer, includeDistance: Bool = false) -> RecommendedOffer {
        RecommendedOffer(offer: offer, badges: badges(for: offer, includeDistance: includeDistance))
    }

    private func distance(to offer: Offer, from location: CLLocation) -> CLLocationDistance? {
        guard let latitude = offer.latitude, let longitude = offer.longitude else { return nil }

        let offerLocation = CLLocation(latitude: latitude, longitude: longitude)
        return location.distance(from: offerLocation)
    }
}
