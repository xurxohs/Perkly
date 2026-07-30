import Foundation

struct DailyBonusCelebration: Identifiable {
    let id = UUID()
    let rewardPoints: Int
    let streakDays: Int
    let nextMultiplierLabel: String
    let nextRewardLabel: String
}

@MainActor
final class HomeViewModel: ObservableObject {
    @Published var homeFeed: HomeFeedResponse?
    @Published var trendingOffers: [Offer] = []
    @Published var flashDrops: [Offer] = []
    @Published var personalizedOffers: [RecommendedOffer] = []
    @Published var nearbyOffers: [RecommendedOffer] = []
    @Published var tierOffers: [RecommendedOffer] = []
    @Published var upcomingEvents: [HomeEventItem] = []
    @Published var isClaimingDailyBonus = false
    @Published var claimingMissionId: String?
    @Published var bonusCelebration: DailyBonusCelebration?
    @Published var isLoading = false
    @Published var error: String?
    @Published var isShowingCachedData = false
    @Published var cachedDataDate: Date?
    
    private let offersService = OffersService.shared
    private let homeFeedService = HomeFeedService.shared
    private let transactionsService = TransactionsService.shared
    private let recommendationsService = RecommendationsService.shared
    private var recommendationSourceTransactions: [Transaction] = []

    var priorityActions: [HomePriorityAction] {
        homeFeed?.priorityActions ?? []
    }
    
    func loadData(for user: User?) async {
        isLoading = true
        error = nil
        
        do {
            if let userId = user?.id {
                let result = try await homeFeedService.getFeedCached(
                    location: LocationManager.shared.lastLocation,
                    userId: userId
                )
                apply(result.value)
                isShowingCachedData = result.isStale
                cachedDataDate = result.cachedAt
            } else {
                let feed = try await homeFeedService.getFeed(location: LocationManager.shared.lastLocation)
                apply(feed)
                isShowingCachedData = false
                cachedDataDate = nil
            }
        } catch is CancellationError {
            isShowingCachedData = false
            cachedDataDate = nil
        } catch {
            isShowingCachedData = false
            await loadLegacyData(for: user, sourceError: error)
        }
        
        isLoading = false
    }

    func reloadRecommendations(for user: User?) async {
        if let feed = try? await homeFeedService.getFeed(location: LocationManager.shared.lastLocation) {
            apply(feed)
            return
        }

        let sections = await recommendationsService.personalizedSections(
            for: user,
            transactions: recommendationSourceTransactions
        )
        personalizedOffers = sections.personalized
        nearbyOffers = sections.nearby
        tierOffers = sections.tier
    }

    func claimDailyBonus() async {
        guard homeFeed?.dailyBonus?.canClaimToday == true, !isClaimingDailyBonus else { return }
        isClaimingDailyBonus = true
        defer { isClaimingDailyBonus = false }

        do {
            let response = try await homeFeedService.claimDailyBonus()
            HapticManager.shared.playSuccess()
            if let feed = try? await homeFeedService.getFeed(location: LocationManager.shared.lastLocation) {
                apply(feed)
            }
            showBonusCelebration(from: response)
            AnalyticsService.shared.trackEvent(eventType: "daily_bonus_claim")
        } catch {
            self.error = error.localizedDescription
            HapticManager.shared.playError()
        }
    }

    func dismissBonusCelebration() {
        bonusCelebration = nil
    }

    func claimDailyMission(_ mission: HomeDailyMission) async {
        guard mission.claimable, claimingMissionId == nil else { return }
        claimingMissionId = mission.id
        defer { claimingMissionId = nil }

        do {
            _ = try await homeFeedService.claimDailyMission(id: mission.id)
            HapticManager.shared.playSuccess()
            if let feed = try? await homeFeedService.getFeed(location: LocationManager.shared.lastLocation) {
                apply(feed)
            }
            AnalyticsService.shared.trackEvent(
                eventType: "daily_mission_claim",
                metadata: [
                    "missionId": mission.id,
                    "rewardPoints": mission.rewardPoints
                ]
            )
        } catch {
            self.error = error.localizedDescription
            HapticManager.shared.playError()
        }
    }

    private func apply(_ feed: HomeFeedResponse) {
        homeFeed = feed
        trendingOffers = feed.trendingOffers.map(\.offer)
        flashDrops = feed.flashDrops.map(\.offer).filter { offer in
            guard let hours = offer.hoursLeft else { return true }
            return hours > 0
        }
        personalizedOffers = recommendedOffers(from: feed.personalizedOffers)
        nearbyOffers = recommendedOffers(from: feed.nearbyOffers)
        tierOffers = recommendedOffers(from: feed.tierOffers)
        upcomingEvents = feed.upcomingEvents

        if let user = feed.userSummary {
            WidgetDataManager.shared.updateWidgetData(
                balance: user.rewardPoints ?? 0,
                streak: feed.dailyBonus?.currentStreak ?? 0,
                claimedToday: feed.dailyBonus?.claimedToday ?? false
            )
        }

        LocationManager.shared.setupGeofences(for: trendingOffers + flashDrops)
        AnalyticsService.shared.trackEvent(
            eventType: "home_feed_loaded",
            metadata: [
                "actions": priorityActions.count,
                "flashDrops": flashDrops.count,
                "nearby": nearbyOffers.count,
                "events": upcomingEvents.count
            ]
        )
    }

    private func showBonusCelebration(from response: HomeDailyBonusClaimResponse) {
        let celebration = DailyBonusCelebration(
            rewardPoints: response.reward.points,
            streakDays: response.status.currentStreak,
            nextMultiplierLabel: Self.multiplierLabel(for: response.status.currentStreak + 1),
            nextRewardLabel: response.status.nextReward.label
        )
        bonusCelebration = celebration

        Task { [weak self] in
            try? await Task.sleep(nanoseconds: 3_200_000_000)
            guard let self else { return }
            if self.bonusCelebration?.id == celebration.id {
                self.bonusCelebration = nil
            }
        }
    }

    private static func multiplierLabel(for streakDays: Int) -> String {
        if streakDays >= 7 { return "x2.0" }
        if streakDays >= 5 { return "x1.5" }
        if streakDays >= 3 { return "x1.2" }
        return "x1.0"
    }

    private func recommendedOffers(from items: [HomeOfferItem]) -> [RecommendedOffer] {
        items.map { item in
            RecommendedOffer(
                offer: item.offer,
                badges: item.badges.map { OfferBadge(text: $0.text, style: $0.offerBadgeStyle) }
            )
        }
    }

    private func loadLegacyData(for user: User?, sourceError: Error) async {
        do {
            async let trendingTask = offersService.getTrending(take: 4)
            async let flashTask = offersService.getFlashDrops()
            async let transactionsTask = loadTransactionsIfNeeded(for: user)
            
            let trending = try await trendingTask
            let flash = try await flashTask
            let transactions = await transactionsTask
            let sections = await recommendationsService.personalizedSections(for: user, transactions: transactions)
            
            self.trendingOffers = trending.data
            self.flashDrops = flash.data.filter { offer in
                guard let hours = offer.hoursLeft else { return false }
                return hours > 0
            }
            self.recommendationSourceTransactions = transactions
            self.personalizedOffers = sections.personalized
            self.nearbyOffers = sections.nearby
            self.tierOffers = sections.tier
            
            // Setup geofences for proximity alerts
            LocationManager.shared.setupGeofences(for: self.trendingOffers + self.flashDrops)
        } catch {
            self.error = sourceError.localizedDescription
        }
    }

    private func loadTransactionsIfNeeded(for user: User?) async -> [Transaction] {
        guard user != nil else { return [] }
        let response = try? await transactionsService.list(skip: 0, take: 30)
        return response?.data ?? []
    }
}
