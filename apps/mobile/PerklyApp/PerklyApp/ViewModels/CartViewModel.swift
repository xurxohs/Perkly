import Foundation

struct CartItem: Codable, Identifiable, Equatable {
    let offerId: String
    let title: String
    let price: Double
    let category: String
    let image: String?
    let sellerId: String?
    var isGift: Bool = false
    
    var id: String { offerId }
}

@MainActor
final class CartViewModel: ObservableObject {
    @Published var items: [CartItem] = []
    @Published var usePoints: Bool = false
    
    // Promocode state
    @Published var promoCode: String = ""
    @Published var isPromoApplied: Bool = false
    @Published var promoDiscount: Double = 0
    @Published var promoPercent: Int = 0
    @Published var isValidatingPromo: Bool = false
    @Published var promoError: String?
    @Published var promocodeActivations: [PromocodeActivation] = []
    @Published var selectedPromocodeActivationIds: [String: String] = [:]
    @Published private(set) var isSyncing = false
    private var serverSyncEnabled = false
    private var currentUserId: String?
    private var syncRevision = 0
    private let syncQueue = CartSyncQueue()
    
    
    var count: Int { items.count }
    var total: Double { items.reduce(0) { $0 + $1.price } }
    
    func calculatePointsDiscount(userPoints: Int) -> Double {
        guard usePoints else { return 0 }
        let pointsValue = PerklyMoney.rewardPointsValue(userPoints)
        return min(pointsValue, total * 0.5) // Max 50% discount
    }
    
    var finalTotal: Double {
        // This is a helper, real points value comes from User model in View
        total
    }
    
    func applyPromoCode() async {
        guard !promoCode.isEmpty else { return }
        isValidatingPromo = true
        promoError = nil
        
        do {
            let promo = try await TransactionsService.shared.validatePromo(code: promoCode, amount: total)
            await MainActor.run {
                self.promoCode = promo.code
                self.promoDiscount = promo.discountAmount
                self.promoPercent = promo.percent
                self.isPromoApplied = true
                self.isValidatingPromo = false
                HapticManager.shared.playSuccess()
            }
        } catch {
            await MainActor.run {
                self.promoError = error.localizedDescription
                self.isPromoApplied = false
                self.isValidatingPromo = false
                self.promoDiscount = 0
                HapticManager.shared.playError()
            }
        }
    }
    
    func resetPromo() {
        promoCode = ""
        isPromoApplied = false
        promoDiscount = 0
        promoPercent = 0
        promoError = nil
    }

    func loadPromocodeActivations(isAuthenticated: Bool) async {
        guard isAuthenticated else {
            promocodeActivations = []
            selectedPromocodeActivationIds = [:]
            return
        }

        do {
            promocodeActivations = try await PromocodesService.shared.listMyActivations()
        } catch {
            #if DEBUG
            print("Failed to load promocode activations")
            #endif
        }
    }

    func usableActivations(for offerId: String) -> [PromocodeActivation] {
        promocodeActivations.filter { activation in
            activation.isUsable && (activation.offerId == nil || activation.offerId == offerId)
        }
    }

    func selectedActivation(for offerId: String) -> PromocodeActivation? {
        guard let id = selectedPromocodeActivationIds[offerId] else { return nil }
        return promocodeActivations.first { $0.id == id }
    }

    func selectPromocodeActivation(_ activationId: String?, for offerId: String) {
        if let activationId {
            selectedPromocodeActivationIds[offerId] = activationId
        } else {
            selectedPromocodeActivationIds.removeValue(forKey: offerId)
        }
        HapticManager.shared.lightImpact()
    }

    func discountAmount(for item: CartItem) -> Double {
        guard let activation = selectedActivation(for: item.offerId),
              let discount = activation.promocode?.discountValue else { return 0 }
        return min(item.price, item.price * discount / 100.0)
    }
    
    init() {
        loadFromStorage()
    }
    
    func addItem(_ item: CartItem) {
        guard !items.contains(where: { $0.offerId == item.offerId }) else { return }
        items.append(item)
        saveToStorage()
        HapticManager.shared.lightImpact()
        // Analytics
        AnalyticsService.shared.trackEvent(eventType: "cart_add_item", offerId: item.offerId)
        syncUpsert(item)
    }
    
    func toggleGift(for offerId: String) {
        if let index = items.firstIndex(where: { $0.offerId == offerId }) {
            items[index].isGift.toggle()
            self.objectWillChange.send()
            saveToStorage()
            HapticManager.shared.lightImpact()
            AnalyticsService.shared.trackEvent(eventType: "cart_toggle_gift", metadata: "offerId: \(offerId), isGift: \(items[index].isGift)")
            syncUpsert(items[index])
        }
    }
    
    func removeItem(_ offerId: String, shouldPlayHaptic: Bool = false) {
        items.removeAll { $0.offerId == offerId }
        selectedPromocodeActivationIds.removeValue(forKey: offerId)
        saveToStorage()
        if shouldPlayHaptic {
            HapticManager.shared.lightImpact()
        }
        // Analytics
        AnalyticsService.shared.trackEvent(eventType: "cart_remove_item", offerId: offerId)
        guard serverSyncEnabled else { return }
        Task { await syncQueue.remove(offerId: offerId) }
    }
    
    func clearCart() {
        items.removeAll()
        selectedPromocodeActivationIds = [:]
        saveToStorage()
        guard serverSyncEnabled else { return }
        Task { await syncQueue.clear() }
    }
    
    func isInCart(_ offerId: String) -> Bool {
        items.contains { $0.offerId == offerId }
    }

    func synchronize(userId: String?) async {
        syncRevision += 1
        let revision = syncRevision
        serverSyncEnabled = userId != nil
        currentUserId = userId
        loadFromStorage()
        guard userId != nil else { return }
        isSyncing = true
        defer { isSyncing = false }

        do {
            // Merge guest/local items into the account before reading the
            // canonical server cart. Upsert keeps this operation idempotent.
            for item in items {
                _ = try await CartService.shared.upsert(offerId: item.offerId, isGift: item.isGift)
            }
            let serverItems = try await CartService.shared.list().map(\.localItem)
            guard revision == syncRevision else { return }
            items = serverItems
            saveToStorage()
        } catch {
            #if DEBUG
            print("Cart synchronization failed: \(error.localizedDescription)")
            #endif
        }
    }

    private func syncUpsert(_ item: CartItem) {
        guard serverSyncEnabled else { return }
        let revision = syncRevision
        Task {
            await syncQueue.upsert(item)
            guard revision == syncRevision else { return }
        }
    }
    
    // MARK: - Persistence
    
    private func saveToStorage() {
        if let data = try? JSONEncoder().encode(items) {
            UserDefaults.standard.set(data, forKey: storageKey)
        }
    }
    
    private func loadFromStorage() {
        guard let data = UserDefaults.standard.data(forKey: storageKey),
              let saved = try? JSONDecoder().decode([CartItem].self, from: data) else {
            items = []
            return
        }
        items = saved
    }

    private var storageKey: String {
        guard let currentUserId else { return "\(Constants.cartStorageKey).guest" }
        return "\(Constants.cartStorageKey).user.\(currentUserId)"
    }
}

private actor CartSyncQueue {
    func upsert(_ item: CartItem) async {
        _ = try? await CartService.shared.upsert(offerId: item.offerId, isGift: item.isGift)
    }

    func remove(offerId: String) async {
        _ = try? await CartService.shared.remove(offerId: offerId)
    }

    func clear() async {
        _ = try? await CartService.shared.clear()
    }
}
