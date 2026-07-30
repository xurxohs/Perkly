import Foundation

final class SellerService {
    static let shared = SellerService()
    private let api = APIClient.shared
    private init() {}
    
    func getStats() async throws -> SellerStats {
        try await api.get("/seller/stats")
    }
    
    func getMyOffers() async throws -> [Offer] {
        try await api.get("/seller/offers")
    }

    func getMyEvents() async throws -> [Event] {
        try await api.get("/seller/events")
    }

    func getCapabilities() async throws -> PartnerCapabilities {
        do {
            return try await api.get("/partner/capabilities")
        } catch {
            return try await api.get("/seller/capabilities")
        }
    }
    
    func getMyTransactions(skip: Int = 0, take: Int = 20) async throws -> TransactionListResponse {
        try await api.get("/seller/transactions", queryItems: [
            .init(name: "skip", value: "\(skip)"),
            .init(name: "take", value: "\(take)")
        ])
    }
}

final class CompaniesService {
    static let shared = CompaniesService()
    private let api = APIClient.shared
    private init() {}

    func getMine() async throws -> Company? {
        try await api.get("/companies/me")
    }

    func apply(
        legalName: String,
        brandName: String,
        inn: String,
        phone: String?
    ) async throws -> Company {
        var body: [String: Any] = [
            "legalName": legalName,
            "brandName": brandName,
            "inn": inn
        ]
        if let phone, !phone.isEmpty {
            body["phone"] = phone
        }
        return try await api.post("/companies/apply", body: body)
    }
}
