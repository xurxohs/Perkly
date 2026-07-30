import Foundation

@MainActor
final class SellerViewModel: ObservableObject {
    @Published var stats: SellerStats?
    @Published var capabilities: PartnerCapabilities?
    @Published var offers: [Offer] = []
    @Published var events: [Event] = []
    @Published var transactions: [Transaction] = []
    @Published var promocodes: [Promocode] = []
    @Published var promocodeAnalytics: PromocodeAnalytics?
    @Published var company: Company?
    @Published var isLoading = false
    @Published var isSavingPromocode = false
    @Published var isApplyingCompany = false
    @Published var error: String?
    
    private let service = SellerService.shared
    private let companiesService = CompaniesService.shared
    private let transactionsService = TransactionsService.shared
    private let offersService = OffersService.shared
    private let promocodesService = PromocodesService.shared
    
    func loadData(currentUser: User? = nil) async {
        isLoading = true
        error = nil
        
        do {
            async let companyTask = companiesService.getMine()
            async let capabilitiesTask = service.getCapabilities()
            let fetchedCompany = try? await companyTask
            self.company = fetchedCompany
            self.capabilities = (try? await capabilitiesTask) ?? PartnerCapabilities.fallback(for: currentUser)

            guard fetchedCompany?.status == .active || currentUser?.roleEnum == .admin else {
                self.stats = nil
                self.offers = []
                self.events = []
                self.transactions = []
                self.promocodes = []
                self.promocodeAnalytics = nil
                isLoading = false
                return
            }

            async let statsTask = service.getStats()
            async let offersTask = service.getMyOffers()
            async let promocodesTask = promocodesService.listCompanyPromocodes()
            async let promocodeAnalyticsTask = promocodesService.companyAnalytics()
            
            let (fetchedStats, fetchedOffers) = try await (statsTask, offersTask)
            
            self.stats = fetchedStats
            self.offers = fetchedOffers
            self.transactions = fetchedStats.recentTransactions
            self.events = (try? await service.getMyEvents()) ?? []
            self.promocodes = (try? await promocodesTask) ?? []
            self.promocodeAnalytics = try? await promocodeAnalyticsTask
        } catch {
            self.capabilities = PartnerCapabilities.fallback(for: currentUser)
            self.error = error.localizedDescription
        }
        
        isLoading = false
    }

    func applyCompany(
        legalName: String,
        brandName: String,
        inn: String,
        phone: String?
    ) async -> Bool {
        isApplyingCompany = true
        error = nil
        defer { isApplyingCompany = false }

        do {
            company = try await companiesService.apply(
                legalName: legalName,
                brandName: brandName,
                inn: inn,
                phone: phone
            )
            HapticManager.shared.playSuccess()
            return true
        } catch {
            self.error = error.localizedDescription
            HapticManager.shared.playError()
            return false
        }
    }

    func cancelTransaction(_ transaction: Transaction) async {
        isLoading = true
        error = nil

        do {
            let updated = try await transactionsService.updateStatus(transaction.id, status: .cancelled)
            replaceTransaction(updated)
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    func featureOffer(_ offer: Offer, days: Int) async {
        isLoading = true
        error = nil

        do {
            let updated = try await offersService.featureOffer(id: offer.id, days: days)
            replaceOffer(updated)
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    func createPromocode(_ input: PromocodeInput) async -> Bool {
        isSavingPromocode = true
        error = nil
        defer { isSavingPromocode = false }

        do {
            let promocode = try await promocodesService.create(input)
            promocodes.insert(promocode, at: 0)
            promocodeAnalytics = try? await promocodesService.companyAnalytics()
            HapticManager.shared.playSuccess()
            return true
        } catch {
            self.error = error.localizedDescription
            HapticManager.shared.playError()
            return false
        }
    }

    func updatePromocode(_ promocode: Promocode, input: PromocodeInput) async -> Bool {
        isSavingPromocode = true
        error = nil
        defer { isSavingPromocode = false }

        do {
            let updated = try await promocodesService.update(id: promocode.id, input: input)
            replacePromocode(updated)
            promocodeAnalytics = try? await promocodesService.companyAnalytics()
            HapticManager.shared.playSuccess()
            return true
        } catch {
            self.error = error.localizedDescription
            HapticManager.shared.playError()
            return false
        }
    }

    func updatePromocodeStatus(_ promocode: Promocode, status: PromocodeStatus) async {
        error = nil

        do {
            let updated = try await promocodesService.updateStatus(id: promocode.id, status: status)
            replacePromocode(updated)
            promocodeAnalytics = try? await promocodesService.companyAnalytics()
            HapticManager.shared.lightImpact()
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

    private func replaceOffer(_ offer: Offer) {
        if let index = offers.firstIndex(where: { $0.id == offer.id }) {
            offers[index] = offer
        }
    }

    private func replacePromocode(_ promocode: Promocode) {
        if let index = promocodes.firstIndex(where: { $0.id == promocode.id }) {
            promocodes[index] = promocode
        }
    }
}
