import Foundation

@MainActor
final class ProfileViewModel: ObservableObject {
    @Published var stats: UserStats?
    @Published var transactions: [Transaction] = []
    @Published var historyOffers: [RecommendedOffer] = []
    @Published var nearbyOffers: [RecommendedOffer] = []
    @Published var tierOffers: [RecommendedOffer] = []
    @Published var savedOffers: [SavedOffer] = []
    @Published var promocodeActivations: [PromocodeActivation] = []
    @Published var b2cProfile: B2CProfile?
    @Published var userInterests: [UserInterest] = []
    @Published var partnerCapabilities: PartnerCapabilities?
    @Published var wheelStatus: WheelStatusResponse?
    @Published var squadProgress: SquadProgress?
    @Published var isLoading = false
    @Published var error: String?
    
    // Top-up
    @Published var topUpAmount = ""
    @Published var isTopUpLoading = false
    @Published var topUpSuccess = false
    @Published var paymentUrl: String?
    @Published var topUpStatusText: String?
    @Published var isWaitingForTopUp = false
    @Published var lastDepositId: String? {
        didSet {
            if let lastDepositId {
                UserDefaults.standard.set(lastDepositId, forKey: Self.pendingDepositKey)
            } else {
                UserDefaults.standard.removeObject(forKey: Self.pendingDepositKey)
            }
        }
    }
    
    private let usersService = UsersService.shared
    private let transactionsService = TransactionsService.shared
    private let offersService = OffersService.shared
    private let promocodesService = PromocodesService.shared
    private let paymentsService = PaymentsService.shared
    private let recommendationsService = RecommendationsService.shared
    private let sellerService = SellerService.shared
    private let wheelService = WheelService.shared
    private let squadsService = SquadsService.shared
    private var recommendationSourceTransactions: [Transaction] = []
    private static let pendingDepositKey = "perkly.pendingDepositId"

    init() {
        lastDepositId = UserDefaults.standard.string(forKey: Self.pendingDepositKey)
    }

    func loadOverview(for user: User?) async {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            async let statsTask = usersService.getStats()
            async let capabilitiesTask = sellerService.getCapabilities()
            async let transactionsTask = transactionsService.list(skip: 0, take: 30)

            stats = try await statsTask
            transactions = (try await transactionsTask).data
            partnerCapabilities =
                (try? await capabilitiesTask)
                ?? PartnerCapabilities.fallback(for: user)
        } catch {
            partnerCapabilities = PartnerCapabilities.fallback(for: user)
            self.error = error.localizedDescription
        }
    }
    
    func loadData(for user: User?) async {
        isLoading = true
        error = nil
        
        do {
            async let statsTask = usersService.getStats()
            async let transactionsTask = transactionsService.list(skip: 0, take: 30)
            async let capabilitiesTask = sellerService.getCapabilities()
            async let wheelTask = wheelService.status()
            async let squadTask = squadsService.getMyProgress()
            async let savedOffersTask = usersService.getSavedOffers()
            async let activationsTask = promocodesService.listMyActivations()
            async let b2cProfileTask = usersService.getB2CProfile()
            async let interestsTask = usersService.getInterests()
            
            let stats = try await statsTask
            let transactionsResponse = try await transactionsTask
            let sections = await recommendationsService.personalizedSections(
                for: user,
                transactions: transactionsResponse.data
            )
            
            self.stats = stats
            self.recommendationSourceTransactions = transactionsResponse.data
            self.transactions = Array(transactionsResponse.data.prefix(10))
            self.partnerCapabilities = (try? await capabilitiesTask) ?? PartnerCapabilities.fallback(for: user)
            self.wheelStatus = try? await wheelTask
            self.squadProgress = try? await squadTask
            self.savedOffers = (try? await savedOffersTask) ?? []
            self.promocodeActivations = (try? await activationsTask) ?? []
            self.b2cProfile = try? await b2cProfileTask
            self.userInterests = (try? await interestsTask) ?? []
            apply(sections)
        } catch {
            self.partnerCapabilities = PartnerCapabilities.fallback(for: user)
            self.error = error.localizedDescription
        }
        
        isLoading = false
    }

    func reloadRecommendations(for user: User?) async {
        let sourceTransactions = recommendationSourceTransactions.isEmpty ? transactions : recommendationSourceTransactions
        let sections = await recommendationsService.personalizedSections(
            for: user,
            transactions: sourceTransactions
        )
        apply(sections)
    }
    
    func topUp() async {
        let normalizedAmount = topUpAmount
            .replacingOccurrences(of: " ", with: "")
            .replacingOccurrences(of: "\u{00a0}", with: "")
        guard let amount = Int(normalizedAmount), amount >= 1_000 else {
            error = L10n.tr("profile.error.invalid_amount")
            return
        }
        
        isTopUpLoading = true
        topUpSuccess = false
        paymentUrl = nil
        error = nil
        topUpStatusText = "Создаём защищённый платёж…"
        
        do {
            let res = try await paymentsService.topUp(amount: amount)
            self.paymentUrl = res.paymentUrl
            self.lastDepositId = res.deposit?.id
            topUpSuccess = false
            topUpStatusText = "Ожидаем подтверждение Click"
            topUpAmount = ""
        } catch {
            self.error = error.localizedDescription
            topUpStatusText = nil
        }
        
        isTopUpLoading = false
    }

    func refreshPendingTopUp() async -> Bool {
        guard let id = lastDepositId else { return false }
        do {
            let deposit = try await paymentsService.depositStatus(id: id)
            if deposit.status == "SUCCESS" {
                topUpSuccess = true
                paymentUrl = nil
                lastDepositId = nil
                isWaitingForTopUp = false
                topUpStatusText = "Баланс пополнен"
                HapticManager.shared.playSuccess()
                return true
            }
            if deposit.status == "FAILED" {
                paymentUrl = nil
                lastDepositId = nil
                error = L10n.tr("profile.error.payment_incomplete")
                isWaitingForTopUp = false
                topUpStatusText = "Платёж не завершён"
            }
        } catch {
            self.error = error.localizedDescription
        }
        return false
    }

    func waitForPendingTopUp() async -> Bool {
        guard lastDepositId != nil else { return false }
        isWaitingForTopUp = true
        topUpStatusText = "Проверяем платёж…"
        for attempt in 0..<10 {
            if await refreshPendingTopUp() { return true }
            if lastDepositId == nil { return false }
            if attempt < 9 {
                try? await Task.sleep(for: .seconds(1.5))
            }
        }
        isWaitingForTopUp = false
        topUpStatusText = "Платёж обрабатывается — сообщим о зачислении"
        return false
    }

    func confirmTransaction(_ transaction: Transaction) async {
        isLoading = true
        error = nil

        do {
            let updated = try await transactionsService.confirm(transaction.id)
            replaceTransaction(updated)
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    func updateProfile(displayName: String, avatarUrl: String) async throws {
        isLoading = true
        defer { isLoading = false }
        
        _ = try await usersService.updateProfile(displayName: displayName, avatarUrl: avatarUrl)
    }

    func updateB2CProfile(
        birthYear: Int?,
        gender: String?,
        city: String?,
        interests: [String]
    ) async -> Bool {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            async let profileTask = usersService.updateB2CProfile(
                birthYear: birthYear,
                gender: gender,
                city: city
            )
            async let interestsTask = usersService.updateInterests(interests)
            let (profile, updatedInterests) = try await (profileTask, interestsTask)
            self.b2cProfile = profile
            self.userInterests = updatedInterests
            HapticManager.shared.playSuccess()
            return true
        } catch {
            self.error = error.localizedDescription
            HapticManager.shared.playError()
            return false
        }
    }

    func removeSavedOffer(_ offerId: String) async {
        let previous = savedOffers
        savedOffers.removeAll { $0.offerId == offerId }

        do {
            _ = try await offersService.unsaveOffer(id: offerId)
            HapticManager.shared.lightImpact()
        } catch {
            savedOffers = previous
            self.error = error.localizedDescription
            HapticManager.shared.playError()
        }
    }

    func copyPromocode(_ activation: PromocodeActivation) async {
        do {
            let updated = try await promocodesService.copyActivation(id: activation.id)
            replacePromocodeActivation(updated)
            HapticManager.shared.playSuccess()
        } catch {
            self.error = error.localizedDescription
            HapticManager.shared.playError()
        }
    }

    func markPromocodeUsed(_ activation: PromocodeActivation) async {
        do {
            let updated = try await promocodesService.useActivation(id: activation.id)
            replacePromocodeActivation(updated)
            HapticManager.shared.playSuccess()
        } catch {
            self.error = error.localizedDescription
            HapticManager.shared.playError()
        }
    }

    private func replaceTransaction(_ transaction: Transaction) {
        if let index = transactions.firstIndex(where: { $0.id == transaction.id }) {
            transactions[index] = transaction
        }
    }

    private func replacePromocodeActivation(_ activation: PromocodeActivation) {
        if let index = promocodeActivations.firstIndex(where: { $0.id == activation.id }) {
            promocodeActivations[index] = activation
        }
    }

    private func apply(_ sections: RecommendationSections) {
        historyOffers = sections.personalized
        nearbyOffers = sections.nearby
        tierOffers = sections.tier
    }
}
