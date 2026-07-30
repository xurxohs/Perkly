import Foundation

@MainActor
final class OfferDetailViewModel: ObservableObject {
    @Published var offer: Offer?
    @Published var reviews: [Review] = []
    @Published var reviewStats: ReviewStats?
    @Published var personalizedOffers: [RecommendedOffer] = []
    @Published var availablePromocodes: [Promocode] = []
    @Published var activatedPromocodeIds: Set<String> = []
    @Published var isLoading = false
    @Published var isPurchasing = false
    @Published var isSaved = false
    @Published var isSavingSavedState = false
    @Published var activatingPromocodeId: String?
    @Published var error: String?
    @Published var purchaseSuccess = false
    @Published var userTransaction: Transaction? // Non-nil if user has purchased this offer
    @Published var lastGiftCode: String?
    @Published var activeChatRoom: ChatRoom?
    
    private let offersService = OffersService.shared
    private let usersService = UsersService.shared
    private let reviewsService = ReviewsService.shared
    private let transactionsService = TransactionsService.shared
    private let chatService = ChatService.shared
    private let recommendationsService = RecommendationsService.shared
    private let promocodesService = PromocodesService.shared
    private var recommendationSourceTransactions: [Transaction] = []
    
    func loadOffer(_ id: String, user: User? = nil) async {
        isLoading = true
        error = nil
        defer { isLoading = false }
        
        do {
            let offer = try await offersService.getById(id)
            self.offer = offer

            AnalyticsService.shared.trackEvent(
                eventType: "offer_view",
                offerId: offer.id
            )
        } catch {
            self.error = error.localizedDescription
        }
    }

    func loadSupplementalContent(_ id: String, user: User? = nil) async {
        guard let offer, offer.id == id else { return }

        async let reviewsTask = reviewsService.findByOfferId(id)
        async let statsTask = reviewsService.getOfferStats(id)
        async let transactionsTask = loadTransactionsIfNeeded(for: user)
        async let promocodesTask = promocodesService.listForOffer(id: id)

        let reviews = (try? await reviewsTask) ?? []
        let stats = try? await statsTask
        let transactions = await transactionsTask
        let promocodes = (try? await promocodesTask) ?? []
        let personalizedSections = await recommendationsService.personalizedSections(
            for: user,
            transactions: transactions,
            excluding: [offer.id],
            limit: 6
        )

        guard self.offer?.id == id else { return }
        self.reviews = reviews
        self.reviewStats = stats
        self.recommendationSourceTransactions = transactions
        self.personalizedOffers = personalizedSections.personalized
        self.availablePromocodes = promocodes

        if user != nil {
            await loadSavedState(offerId: offer.id)
            await loadActivatedPromocodes()
        } else {
            self.isSaved = false
            self.activatedPromocodeIds = []
        }
    }

    func reloadRecommendations(for user: User?) async {
        guard let offer else { return }
        let personalizedSections = await recommendationsService.personalizedSections(
            for: user,
            transactions: recommendationSourceTransactions,
            excluding: [offer.id],
            limit: 6
        )

        personalizedOffers = personalizedSections.personalized
    }

    func loadSavedState(offerId: String? = nil) async {
        let targetOfferId = offerId ?? offer?.id
        guard let targetOfferId else { return }

        do {
            let saved = try await usersService.getSavedOffers()
            isSaved = saved.contains { $0.offerId == targetOfferId }
        } catch APIError.unauthorized {
            isSaved = false
        } catch {
            // Saved state is not critical for opening an offer.
        }
    }

    func toggleSaved(isAuthenticated: Bool) async {
        guard let offer else { return }
        guard isAuthenticated else {
            error = L10n.tr("Войдите, чтобы сохранить оффер")
            return
        }

        let previous = isSaved
        isSaved.toggle()
        isSavingSavedState = true
        defer { isSavingSavedState = false }

        do {
            if previous {
                _ = try await offersService.unsaveOffer(id: offer.id)
            } else {
                _ = try await offersService.saveOffer(id: offer.id)
            }
            HapticManager.shared.lightImpact()
        } catch {
            isSaved = previous
            self.error = error.localizedDescription
            HapticManager.shared.playError()
        }
    }

    func loadActivatedPromocodes() async {
        do {
            let activations = try await promocodesService.listMyActivations()
            activatedPromocodeIds = Set(activations.map(\.promocodeId))
        } catch APIError.unauthorized {
            activatedPromocodeIds = []
        } catch {
            // Activation state is non-critical for opening an offer.
        }
    }

    func activatePromocode(_ promocode: Promocode, isAuthenticated: Bool) async {
        guard isAuthenticated else {
            error = L10n.tr("Войдите, чтобы активировать промокод")
            return
        }

        activatingPromocodeId = promocode.id
        defer { activatingPromocodeId = nil }

        do {
            let activation = try await promocodesService.activate(id: promocode.id)
            activatedPromocodeIds.insert(activation.promocodeId)
            HapticManager.shared.playSuccess()
        } catch {
            self.error = error.localizedDescription
            HapticManager.shared.playError()
        }
    }
    
    func checkIfPurchased() async {
        guard let offer else { return }
        userTransaction = nil

        do {
            let res = try await transactionsService.list(skip: 0, take: 50)
            userTransaction = res.data.first(where: {
                guard $0.offerId == offer.id else { return false }

                switch $0.statusEnum {
                case .success, .paid, .completed, .activated, .escrow, .disputed:
                    return true
                case .pending, .failed, .cancelled, .refunded:
                    return false
                }
            })
        } catch {
            userTransaction = nil
        }
    }
    
    func purchase(isGift: Bool = false) async {
        guard let offer else { return }
        
        isPurchasing = true
        error = nil
        lastGiftCode = nil
        
        // Analytics
        AnalyticsService.shared.trackEvent(eventType: "offer_purchase_intent", offerId: offer.id)
        
        do {
            let tx = try await transactionsService.purchase(offerId: offer.id, isGift: isGift)
            userTransaction = tx
            lastGiftCode = tx.giftCode
            HapticManager.shared.playPurchaseSuccess()

            purchaseSuccess = true
            
            // Analytics
            AnalyticsService.shared.trackEvent(eventType: "offer_purchase_success", offerId: offer.id)
        } catch {
            self.error = error.localizedDescription
            HapticManager.shared.playPurchaseError()
        }
        
        isPurchasing = false
    }

    @discardableResult
    func startChatWithSeller(silently: Bool = false) async -> Bool {
        guard let sellerId = offer?.sellerId else { return false }

        do {
            activeChatRoom = try await chatService.createOrGetDirectRoom(targetUserId: sellerId)
            return true
        } catch {
            if !silently {
                self.error = error.localizedDescription
            }
            return false
        }
    }

    private func loadTransactionsIfNeeded(for user: User?) async -> [Transaction] {
        guard user != nil else { return [] }
        let response = try? await transactionsService.list(skip: 0, take: 30)
        return response?.data ?? []
    }
}
