import Foundation

struct UserStats: Codable {
    let totalSpent: Double
    let totalPurchases: Int
    let reviewsCount: Int

    enum CodingKeys: String, CodingKey {
        case totalSpent
        case totalPurchases
        case reviewsCount
    }

    init(totalSpent: Double, totalPurchases: Int, reviewsCount: Int) {
        self.totalSpent = totalSpent
        self.totalPurchases = totalPurchases
        self.reviewsCount = reviewsCount
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        totalSpent = try container.decodeIfPresent(Double.self, forKey: .totalSpent) ?? 0
        totalPurchases = try container.decodeIfPresent(Int.self, forKey: .totalPurchases) ?? 0
        reviewsCount = try container.decodeIfPresent(Int.self, forKey: .reviewsCount) ?? 0
    }
}

struct SubscribeResponse: Codable {
    let tier: String
    let endDate: String
    let cost: Double
}

struct PasswordStatusResponse: Codable {
    let hasPassword: Bool
}

final class UsersService {
    static let shared = UsersService()
    private let api = APIClient.shared
    private init() {}
    
    func getMe() async throws -> User {
        try await api.get("/users/me")
    }

    func exportPersonalData() async throws -> Data {
        try await api.data("/users/me/export")
    }
    
    func updateProfile(displayName: String? = nil, avatarUrl: String? = nil, preferredLanguage: String? = nil) async throws -> User {
        var body: [String: Any] = [:]
        if let displayName { body["displayName"] = displayName }
        if let avatarUrl { body["avatarUrl"] = avatarUrl }
        if let preferredLanguage { body["preferredLanguage"] = preferredLanguage }
        return try await api.patch("/users/me", body: body)
    }

    func uploadAvatar(jpegData: Data) async throws -> User {
        let dataUrl = "data:image/jpeg;base64,\(jpegData.base64EncodedString())"
        return try await api.post("/users/me/avatar", body: ["dataUrl": dataUrl])
    }

    func removeAvatar() async throws -> User {
        try await api.delete("/users/me/avatar")
    }

    func getPasswordStatus() async throws -> PasswordStatusResponse {
        try await api.get("/users/me/password/status")
    }

    func changePassword(currentPassword: String?, newPassword: String) async throws {
        var body: [String: Any] = ["newPassword": newPassword]
        if let currentPassword, !currentPassword.isEmpty {
            body["currentPassword"] = currentPassword
        }
        let _: EmptyResponse = try await api.patch("/users/me/password", body: body)
    }

    func deleteAccount(currentPassword: String?, confirmation: String) async throws {
        var body: [String: Any] = ["confirmation": confirmation]
        if let currentPassword, !currentPassword.isEmpty {
            body["currentPassword"] = currentPassword
        }
        let _: EmptyResponse = try await api.post("/users/me/delete", body: body)
    }

    func getB2CProfile() async throws -> B2CProfile {
        try await api.get("/users/me/profile")
    }

    func updateB2CProfile(
        birthYear: Int? = nil,
        gender: String? = nil,
        city: String? = nil,
        anonymousId: String? = nil
    ) async throws -> B2CProfile {
        var body: [String: Any] = [:]
        if let birthYear { body["birthYear"] = birthYear }
        if let gender { body["gender"] = gender }
        if let city { body["city"] = city }
        if let anonymousId { body["anonymousId"] = anonymousId }
        return try await api.patch("/users/me/profile", body: body)
    }

    func getInterests() async throws -> [UserInterest] {
        try await api.get("/users/me/interests")
    }

    func updateInterests(_ interests: [String]) async throws -> [UserInterest] {
        try await api.put("/users/me/interests", body: ["interests": interests])
    }
    
    func getStats() async throws -> UserStats {
        try await api.get("/users/me/stats")
    }

    func getSavedOffers() async throws -> [SavedOffer] {
        try await api.get("/users/me/saved-offers")
    }
    
    func subscribe(tier: String, months: Int) async throws -> SubscribeResponse {
        try await api.post("/users/me/subscribe", body: [
            "tier": tier,
            "months": months
        ])
    }
}
