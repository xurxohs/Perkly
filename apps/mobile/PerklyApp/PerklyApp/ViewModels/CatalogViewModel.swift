import CoreLocation
import Foundation

enum CatalogSegment: String, CaseIterable, Identifiable {
    case today
    case hot
    case nearby
    case free
    case stores
    case favorites

    var id: String { rawValue }

    var title: String {
        switch self {
        case .today: return L10n.tr("Для вас")
        case .hot: return L10n.tr("Горячие")
        case .nearby: return L10n.tr("Рядом")
        case .free: return L10n.tr("Бесплатные")
        case .stores: return L10n.tr("Магазины")
        case .favorites: return L10n.tr("Избранное")
        }
    }

    var icon: String {
        switch self {
        case .today: return "sparkles"
        case .hot: return "flame.fill"
        case .nearby: return "location.fill"
        case .free: return "gift.fill"
        case .stores: return "storefront.fill"
        case .favorites: return "heart.fill"
        }
    }
}

enum CatalogCategoryOption: String, CaseIterable, Identifiable {
    case all
    case promocodes
    case digitalGoods
    case gamesAndAccounts
    case subscriptions
    case marketplaces
    case restaurants
    case courses
    case tourism
    case fitness
    case links
    case other

    var id: String { rawValue }

    var title: String {
        switch self {
        case .all: return L10n.tr("Все товары")
        case .promocodes: return L10n.tr("Промокоды")
        case .digitalGoods: return L10n.tr("Цифровые товары")
        case .gamesAndAccounts: return L10n.tr("Игры и аккаунты")
        case .subscriptions: return L10n.tr("Подписки")
        case .marketplaces: return L10n.tr("Маркетплейсы")
        case .restaurants: return L10n.tr("Еда и рестораны")
        case .courses: return L10n.tr("Курсы")
        case .tourism: return L10n.tr("Путешествия")
        case .fitness: return L10n.tr("Фитнес")
        case .links: return L10n.tr("Ссылки и доступы")
        case .other: return L10n.tr("Другое")
        }
    }

    var icon: String {
        switch self {
        case .all: return "square.grid.2x2.fill"
        case .promocodes: return "ticket.fill"
        case .digitalGoods: return "shippingbox.fill"
        case .gamesAndAccounts: return "person.crop.circle.badge.checkmark"
        case .subscriptions: return "repeat.circle.fill"
        case .marketplaces: return "bag.fill"
        case .restaurants: return "fork.knife"
        case .courses: return "graduationcap.fill"
        case .tourism: return "airplane"
        case .fitness: return "figure.run"
        case .links: return "link.circle.fill"
        case .other: return "ellipsis.circle.fill"
        }
    }

    var category: String? {
        switch self {
        case .gamesAndAccounts: return "GAMES"
        case .subscriptions: return "SUBSCRIPTIONS"
        case .marketplaces: return "MARKETPLACES"
        case .restaurants: return "RESTAURANTS"
        case .courses: return "COURSES"
        case .tourism: return "TOURISM"
        case .fitness: return "FITNESS"
        case .other: return "OTHER"
        case .all, .promocodes, .digitalGoods, .links: return nil
        }
    }

    var fulfillmentType: String? {
        switch self {
        case .promocodes: return "PROMOCODE"
        case .digitalGoods: return "DIGITAL_CODE"
        case .links: return "LINK"
        default: return nil
        }
    }

    static func matching(category: String) -> CatalogCategoryOption? {
        allCases.first { $0.category == category.uppercased() }
    }
}

enum CatalogRadius: Double, CaseIterable, Identifiable {
    case one = 1
    case three = 3
    case five = 5
    case ten = 10

    var id: Double { rawValue }

    var title: String {
        switch self {
        case .one: return L10n.tr("1 км")
        case .three: return L10n.tr("3 км")
        case .five: return L10n.tr("5 км")
        case .ten: return L10n.tr("10 км")
        }
    }
}

struct CatalogStoreSpotlight: Identifiable {
    let id: String
    let name: String
    let subtitle: String
    let imageURL: String
    let offers: [Offer]
    let promotedCount: Int

    var offersCount: Int { offers.count }
    var heroOffer: Offer? { offers.first }
}

@MainActor
final class CatalogViewModel: ObservableObject {
    @Published var offers: [Offer] = []
    @Published var promotedOffers: [Offer] = []
    @Published var nearbyOffers: [Offer] = []
    @Published var freeOffers: [Offer] = []
    @Published var limitedOffers: [Offer] = []
    @Published var stores: [CatalogStoreSpotlight] = []
    @Published var savedOffers: [SavedOffer] = []
    @Published var savedOfferIds: Set<String> = []
    @Published private(set) var savingOfferIds: Set<String> = []
    @Published var isLoading = false
    @Published var isLoadingShelves = false
    @Published var isLoadingSavedOffers = false
    @Published var error: String?
    @Published var searchQuery = ""
    @Published var selectedCategory: String? = nil
    @Published var selectedFulfillmentType: String? = nil
    @Published var selectedCategoryOption: CatalogCategoryOption = .all
    @Published var selectedSegment: CatalogSegment = .today
    @Published var selectedRadius: CatalogRadius = .three
    @Published var total = 0
    
    private var currentSkip = 0
    private let pageSize = 16
    private let offersService = OffersService.shared
    private let usersService = UsersService.shared

    // MARK: - Public API

    func loadCatalog(location: CLLocation? = nil, reset: Bool = true, isAuthenticated: Bool = false) async {
        await loadOffers(reset: reset)

        guard reset else { return }
        async let shelvesTask: Void = loadShelves(location: location)
        async let savedTask: Void = loadSavedOffers(isAuthenticated: isAuthenticated)
        _ = await (shelvesTask, savedTask)
    }
    
    func loadOffers(reset: Bool = true) async {
        let requestedQuery = searchQuery.trimmingCharacters(in: .whitespacesAndNewlines)
        let requestedCategory = selectedCategory
        let requestedFulfillmentType = selectedFulfillmentType

        if reset {
            currentSkip = 0
            offers = []
        }
        
        isLoading = true
        defer { isLoading = false }
        error = nil
        
        do {
            var filters = OfferFilters(
                skip: currentSkip,
                take: pageSize,
                category: selectedCategory,
                fulfillmentType: selectedFulfillmentType,
                sort: "newest"
            )

            if !searchQuery.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                filters.search = searchQuery.trimmingCharacters(in: .whitespacesAndNewlines)
            }

            let response = try await offersService.list(filters: filters)

            guard !Task.isCancelled else { return }
            if reset {
                let currentQuery = searchQuery.trimmingCharacters(in: .whitespacesAndNewlines)
                guard currentQuery == requestedQuery,
                      selectedCategory == requestedCategory,
                      selectedFulfillmentType == requestedFulfillmentType else { return }
            }

            if reset {
                self.offers = response.data
            } else {
                self.offers.append(contentsOf: response.data)
            }

            self.total = response.total
            self.currentSkip += response.data.count
        } catch is CancellationError {
            return
        } catch {
            self.error = error.localizedDescription
        }
        
    }

    func loadShelves(location: CLLocation? = nil) async {
        isLoadingShelves = true
        defer { isLoadingShelves = false }

        // Load promoted offers (featured / flash drops)
        do {
            let promotedResponse = try await offersService.list(filters: OfferFilters(take: 12, sort: "newest"))
            let featured = promotedResponse.data.filter { offer in
                offer.isFeaturedNow || offer.safeIsFlashDrop
            }
            promotedOffers = featured.isEmpty ? Array(promotedResponse.data.prefix(8)) : Array(featured.prefix(12))
        } catch {
            #if DEBUG
            print("Failed to update promoted catalog shelf")
            #endif
            promotedOffers = Array(offers.filter { $0.isFeaturedNow || $0.safeIsFlashDrop }.prefix(12))
            if promotedOffers.isEmpty {
                promotedOffers = Array(offers.prefix(8))
            }
        }

        // Load free offers (price = 0)
        do {
            let freeResponse = try await offersService.list(filters: OfferFilters(take: 12, maxPrice: 0))
            freeOffers = freeResponse.data
        } catch {
            #if DEBUG
            print("Failed to update free catalog shelf")
            #endif
            freeOffers = offers.filter { $0.safePrice <= 0 }
        }

        // Limited offers (flash drops or high discount)
        limitedOffers = offers.filter { offer in
            offer.safeIsFlashDrop || (offer.discountPercent ?? 0) >= 20
        }
        if limitedOffers.isEmpty {
            limitedOffers = Array(offers.prefix(6))
        }

        // Build stores from ALL loaded offers
        stores = Self.makeStores(from: offers + promotedOffers + freeOffers)

        await loadNearby(location: location)
    }

    func loadNearby(location: CLLocation?) async {
        guard let location else {
            nearbyOffers = []
            return
        }

        do {
            let response = try await offersService.list(filters: OfferFilters(
                take: 20,
                lat: location.coordinate.latitude,
                lng: location.coordinate.longitude,
                radiusKm: selectedRadius.rawValue
            ))
            nearbyOffers = response.data
        } catch {
            #if DEBUG
            print("Failed to update nearby catalog shelf")
            #endif
            // Fallback: filter local offers by distance
            nearbyOffers = offers
                .filter { offer in
                    guard let d = distance(to: offer, from: location) else { return false }
                    return d <= selectedRadius.rawValue * 1000
                }
                .sorted { lhs, rhs in
                    let ld = distance(to: lhs, from: location) ?? .greatestFiniteMagnitude
                    let rd = distance(to: rhs, from: location) ?? .greatestFiniteMagnitude
                    return ld < rd
                }
        }
    }

    func loadSavedOffers(isAuthenticated: Bool) async {
        guard isAuthenticated else {
            savedOffers = []
            savedOfferIds = []
            return
        }

        isLoadingSavedOffers = true
        defer { isLoadingSavedOffers = false }

        do {
            let saved = try await usersService.getSavedOffers()
            savedOffers = saved
            savedOfferIds = Set(saved.map(\.offerId))
        } catch APIError.unauthorized {
            savedOffers = []
            savedOfferIds = []
        } catch {
            #if DEBUG
            print("Failed to load saved offers")
            #endif
        }
    }

    func toggleSavedOffer(_ offer: Offer, isAuthenticated: Bool) async {
        guard isAuthenticated else {
            error = L10n.tr("Войдите, чтобы сохранять предложения")
            HapticManager.shared.playError()
            return
        }

        guard savingOfferIds.insert(offer.id).inserted else { return }
        defer { savingOfferIds.remove(offer.id) }

        let wasSaved = savedOfferIds.contains(offer.id)

        if wasSaved {
            savedOfferIds.remove(offer.id)
            savedOffers.removeAll { $0.offerId == offer.id }
        } else {
            savedOfferIds.insert(offer.id)
        }
        HapticManager.shared.lightImpact()

        do {
            if wasSaved {
                let result = try await offersService.unsaveOffer(id: offer.id)
                if !result.deleted {
                    await loadSavedOffers(isAuthenticated: true)
                }
            } else {
                let saved = try await offersService.saveOffer(id: offer.id)
                savedOffers.removeAll { $0.offerId == saved.offerId }
                savedOffers.insert(saved, at: 0)
            }
        } catch {
            if wasSaved {
                savedOfferIds.insert(offer.id)
                if !savedOffers.contains(where: { $0.offerId == offer.id }) {
                    await loadSavedOffers(isAuthenticated: isAuthenticated)
                }
            } else {
                savedOfferIds.remove(offer.id)
                savedOffers.removeAll { $0.offerId == offer.id }
            }
            self.error = error.localizedDescription
            HapticManager.shared.playError()
        }
    }
    
    func loadMore() async {
        guard !isLoading, currentSkip < total else { return }
        await loadOffers(reset: false)
    }
    
    func search(location: CLLocation? = nil, isAuthenticated: Bool = false) async {
        AnalyticsService.shared.trackEvent(eventType: "catalog_search", metadata: "query: \(searchQuery)")
        await loadCatalog(location: location, reset: true, isAuthenticated: isAuthenticated)
    }
    
    func selectCategory(_ category: String?, location: CLLocation? = nil, isAuthenticated: Bool = false) async {
        selectedCategory = category
        selectedFulfillmentType = nil
        selectedCategoryOption = category.flatMap(CatalogCategoryOption.matching(category:)) ?? .all
        AnalyticsService.shared.trackEvent(eventType: "category_select", metadata: "category: \(category ?? "all")")
        await loadCatalog(location: location, reset: true, isAuthenticated: isAuthenticated)
    }

    func selectCategoryOption(
        _ option: CatalogCategoryOption,
        location: CLLocation? = nil,
        isAuthenticated: Bool = false
    ) async {
        selectedCategoryOption = option
        selectedCategory = option.category
        selectedFulfillmentType = option.fulfillmentType
        AnalyticsService.shared.trackEvent(
            eventType: "catalog_category_drawer_select",
            metadata: "option: \(option.rawValue)"
        )
        await loadCatalog(location: location, reset: true, isAuthenticated: isAuthenticated)
    }

    func selectSegment(_ segment: CatalogSegment) {
        selectedSegment = segment
        AnalyticsService.shared.trackEvent(eventType: "catalog_segment_select", metadata: "segment: \(segment.rawValue)")
    }

    func refreshFavoritesIfNeeded(isAuthenticated: Bool) async {
        guard isAuthenticated else {
            savedOffers = []
            savedOfferIds = []
            return
        }
        await loadSavedOffers(isAuthenticated: true)
    }

    func selectRadius(_ radius: CatalogRadius, location: CLLocation?) async {
        selectedRadius = radius
        AnalyticsService.shared.trackEvent(eventType: "catalog_radius_select", metadata: "radiusKm: \(radius.rawValue)")
        await loadNearby(location: location)
    }

    // MARK: - Private Helpers

    private func distance(to offer: Offer, from location: CLLocation) -> CLLocationDistance? {
        guard let latitude = offer.latitude, let longitude = offer.longitude else { return nil }
        return location.distance(from: CLLocation(latitude: latitude, longitude: longitude))
    }

    private static func makeStores(from allOffers: [Offer]) -> [CatalogStoreSpotlight] {
        // Deduplicate offers by ID
        var seen = Set<String>()
        var uniqueOffers: [Offer] = []
        for offer in allOffers {
            if seen.insert(offer.id).inserted {
                uniqueOffers.append(offer)
            }
        }

        let grouped = Dictionary(grouping: uniqueOffers) { offer in
            offer.sellerId ?? offer.seller?.id ?? offer.seller?.displayName ?? offer.safeTitle
        }

        return grouped.compactMap { key, offers -> CatalogStoreSpotlight? in
            guard let first = offers.first else { return nil }
            let seller = first.seller
            let name = seller?.displayName ?? seller?.email ?? L10n.tr("Магазин Perkly")
            let promotedCount = offers.filter { $0.isFeaturedNow || $0.safeIsFlashDrop }.count
            let subtitle: String

            if promotedCount > 0 {
                subtitle = L10n.format("catalog.store.promoted_count", promotedCount)
            } else if offers.count == 1 {
                subtitle = L10n.tr("1 активное предложение")
            } else {
                subtitle = L10n.format("catalog.store.active_count", offers.count)
            }

            return CatalogStoreSpotlight(
                id: key,
                name: name,
                subtitle: subtitle,
                imageURL: seller?.avatarUrl ?? first.safeVendorLogo,
                offers: offers,
                promotedCount: promotedCount
            )
        }
        .sorted { lhs, rhs in
            if lhs.promotedCount == rhs.promotedCount {
                return lhs.offersCount > rhs.offersCount
            }
            return lhs.promotedCount > rhs.promotedCount
        }
    }
}
