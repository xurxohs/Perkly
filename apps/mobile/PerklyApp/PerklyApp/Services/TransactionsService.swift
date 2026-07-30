import Foundation

final class TransactionsService {
    static let shared = TransactionsService()
    private let api = APIClient.shared
    private init() {}
    
    func purchase(
        offerId: String,
        isGift: Bool = false,
        pointsToRedeem: Int = 0,
        promoCode: String? = nil,
        promocodeActivationId: String? = nil
    ) async throws -> Transaction {
        var body: [String: Any] = [
            "offerId": offerId,
            "isGift": isGift,
            "pointsUsed": pointsToRedeem,
            "idempotencyKey": UUID().uuidString
        ]
        if let promoCode, !promoCode.isEmpty {
            body["promoCode"] = promoCode
        }
        if let promocodeActivationId, !promocodeActivationId.isEmpty {
            body["promocodeActivationId"] = promocodeActivationId
        }

        return try await api.post("/transactions", body: body)
    }

    func validatePromo(code: String, amount: Double) async throws -> PromoValidationResponse {
        try await api.post("/transactions/promo/validate", body: [
            "code": code,
            "amount": amount
        ])
    }
    
    func list(skip: Int = 0, take: Int = 20) async throws -> TransactionListResponse {
        try await api.get("/transactions", queryItems: [
            .init(name: "skip", value: "\(skip)"),
            .init(name: "take", value: "\(take)")
        ])
    }

    func subscriptions() async throws -> [Transaction] {
        try await api.get("/transactions/subscriptions")
    }
    
    func getById(_ id: String) async throws -> Transaction {
        try await api.get("/transactions/\(id)")
    }
    
    func confirm(_ id: String) async throws -> Transaction {
        try await api.patch("/transactions/\(id)/confirm")
    }

    func updateStatus(_ id: String, status: TransactionStatus) async throws -> Transaction {
        try await api.patch("/transactions/\(id)/status", body: ["status": status.rawValue])
    }
    
    func redeem(code: String) async throws -> Transaction {
        try await api.post("/transactions/redeem", body: ["code": code])
    }
    
}

final class WalletService {
    static let shared = WalletService()
    private let api = APIClient.shared
    private init() {}

    func downloadTransactionPass(transactionId: String) async throws -> Data {
        try await api.data("/wallet/transactions/\(transactionId).pkpass")
    }
}

struct PromoValidationResponse: Codable {
    let code: String
    let label: String?
    let percent: Int
    let discountAmount: Double
    let finalAmount: Double
}

struct AdminTransactionsResponse: Codable {
    let transactions: [Transaction]
    let total: Int
    let page: Int?
    let totalPages: Int?
}

struct AdminUsersResponse: Codable {
    let users: [User]
    let total: Int
    let page: Int?
    let totalPages: Int?
}

struct AdminOffersResponse: Codable {
    let offers: [Offer]
    let total: Int
    let page: Int?
    let totalPages: Int?
}

struct AdminDisputesResponse: Codable {
    let disputes: [Dispute]
    let total: Int
    let page: Int?
    let totalPages: Int?
}

struct AdminMessageResponse: Codable {
    let message: String
}

struct AdminStatsResponse: Codable {
    let usersCount: Int
    let newUsersToday: Int
    let activeOffersCount: Int
    let totalVolume: Double
    let openDisputesCount: Int
    let platformIncome: Double
    let pendingCompaniesCount: Int?
    let openReportsCount: Int?
    let openAppealsCount: Int?
    let diagnosticOccurrences: Int?
}

final class AdminService {
    static let shared = AdminService()
    private let api = APIClient.shared
    private init() {}

    func getTransactions(page: Int = 1, limit: Int = 20) async throws -> AdminTransactionsResponse {
        try await api.get("/admin/transactions", queryItems: [
            .init(name: "page", value: "\(page)"),
            .init(name: "limit", value: "\(limit)")
        ])
    }

    func getStats() async throws -> AdminStatsResponse {
        try await api.get("/admin/stats")
    }

    func getUsers(page: Int = 1, limit: Int = 20, search: String = "") async throws -> AdminUsersResponse {
        try await api.get("/admin/users", queryItems: [
            .init(name: "page", value: "\(page)"),
            .init(name: "limit", value: "\(limit)"),
            .init(name: "search", value: search)
        ])
    }

    func updateUser(_ user: User, role: UserRole, tier: UserTier, balance: Int) async throws -> User {
        try await api.patch("/admin/users/\(user.id)", body: [
            "role": role.rawValue,
            "tier": tier.rawValue,
            "balance": balance
        ])
    }

    func getOffers(page: Int = 1, limit: Int = 30) async throws -> AdminOffersResponse {
        try await api.get("/admin/offers", queryItems: [
            .init(name: "page", value: "\(page)"),
            .init(name: "limit", value: "\(limit)")
        ])
    }

    func updateOffer(_ offer: Offer, isActive: Bool) async throws -> Offer {
        try await api.patch("/admin/offers/\(offer.id)", body: ["isActive": isActive])
    }

    func updateOffer(
        id: String,
        title: String,
        description: String,
        price: Int,
        discountPercent: Int,
        category: String,
        isActive: Bool
    ) async throws -> Offer {
        try await api.patch("/admin/offers/\(id)", body: [
            "title": title,
            "description": description,
            "price": price,
            "discountPercent": discountPercent,
            "category": category,
            "isActive": isActive
        ])
    }

    func deleteOffer(_ offer: Offer) async throws -> Offer {
        try await api.delete("/admin/offers/\(offer.id)")
    }

    func refundTransaction(_ id: String) async throws -> AdminMessageResponse {
        try await api.patch("/admin/transactions/\(id)/refund")
    }

    func getDisputes(page: Int = 1, limit: Int = 30) async throws -> AdminDisputesResponse {
        try await api.get("/admin/disputes", queryItems: [
            .init(name: "page", value: "\(page)"),
            .init(name: "limit", value: "\(limit)")
        ])
    }

    func resolveDispute(
        _ dispute: Dispute,
        resolution: AdminDisputeResolution,
        adminNote: String?
    ) async throws -> AdminMessageResponse {
        var body: [String: Any] = ["resolution": resolution.rawValue]
        if let adminNote, !adminNote.isEmpty {
            body["adminNote"] = adminNote
        }
        return try await api.patch("/admin/disputes/\(dispute.id)/resolve", body: body)
    }

    func getModerationReports(status: String = "") async throws -> [AdminModerationReport] {
        let query = status.isEmpty ? nil : [URLQueryItem(name: "status", value: status)]
        return try await api.get("/safety/admin/reports", queryItems: query)
    }

    func getModerationAppeals(status: String = "") async throws -> [AdminModerationAppeal] {
        let query = status.isEmpty ? nil : [URLQueryItem(name: "status", value: status)]
        return try await api.get("/safety/admin/appeals", queryItems: query)
    }

    func resolveModerationReport(id: String, status: String, resolution: String) async throws -> AdminModerationReport {
        try await api.patch("/safety/admin/reports/\(id)", body: [
            "status": status,
            "resolution": resolution
        ])
    }

    func resolveModerationAppeal(id: String, status: String, resolution: String) async throws -> AdminModerationAppeal {
        try await api.patch("/safety/admin/appeals/\(id)", body: [
            "status": status,
            "resolution": resolution
        ])
    }

    func getAdminLogs(page: Int = 1, limit: Int = 50, action: String = "") async throws -> AdminLogsResponse {
        var queryItems = [
            URLQueryItem(name: "page", value: "\(page)"),
            URLQueryItem(name: "limit", value: "\(limit)")
        ]
        if !action.isEmpty {
            queryItems.append(URLQueryItem(name: "action", value: action))
        }
        return try await api.get("/admin/logs", queryItems: queryItems)
    }

    func getAnalyticsEvents(page: Int = 1, limit: Int = 50, eventType: String = "") async throws -> AdminAnalyticsResponse {
        var queryItems: [URLQueryItem] = [
            .init(name: "page", value: "\(page)"),
            .init(name: "limit", value: "\(limit)")
        ]
        if !eventType.isEmpty {
            queryItems.append(.init(name: "eventType", value: eventType))
        }
        return try await api.get("/analytics/events", queryItems: queryItems)
    }

    func getDiagnosticsSummary() async throws -> DiagnosticsSummary {
        try await api.get("/diagnostics/summary")
    }

    func getCompanies(status: CompanyStatus? = nil) async throws -> [Company] {
        let query = status.map { [URLQueryItem(name: "status", value: $0.rawValue)] }
        return try await api.get("/companies", queryItems: query)
    }

    func updateCompanyStatus(id: String, status: CompanyStatus) async throws -> Company {
        try await api.patch("/companies/\(id)/status", body: ["status": status.rawValue])
    }
}

struct DiagnosticsSummary: Codable {
    let totalOccurrences: Int
    let issues: [DiagnosticIssue]
}

struct DiagnosticIssue: Codable, Identifiable {
    let id: String
    let fingerprint: String
    let kind: String
    let message: String
    let appVersion: String?
    let osVersion: String?
    let deviceModel: String?
    let userId: String?
    let breadcrumbs: String?
    let occurrences: Int
    let firstSeenAt: String
    let lastSeenAt: String

    var breadcrumbItems: [String] {
        guard let data = breadcrumbs?.data(using: .utf8),
              let items = try? JSONDecoder().decode([String].self, from: data) else { return [] }
        return items
    }
}

struct AnalyticsEvent: Codable, Identifiable {
    let id: String
    let eventType: String
    let offerId: String?
    let userId: String?
    let sessionId: String?
    let metadata: String?
    let createdAt: String?
}

struct AdminAnalyticsResponse: Codable {
    let events: [AnalyticsEvent]?
    let data: [AnalyticsEvent]?
    let total: Int?

    var items: [AnalyticsEvent] {
        return events ?? data ?? []
    }
}

enum AdminDisputeResolution: String {
    case buyer = "BUYER"
    case seller = "SELLER"

    var title: String {
        switch self {
        case .buyer: return L10n.tr("admin.dispute.resolve_for_buyer")
        case .seller: return L10n.tr("admin.dispute.resolve_for_seller")
        }
    }
}
