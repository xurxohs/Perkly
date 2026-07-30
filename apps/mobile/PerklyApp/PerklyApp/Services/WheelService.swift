import Foundation

struct WheelSpinResponse: Codable {
    let success: Bool
    let message: String
    let reward: String?
    let points: Int?
    let newRewardPoints: Int?
    let newBalance: Double?
    let dailyLimit: Int
    let spinsUsed: Int
    let spinsRemaining: Int
    let resetAt: String
}

struct WheelStatusResponse: Codable {
    let dailyLimit: Int
    let spinsUsed: Int
    let spinsRemaining: Int
    let canSpin: Bool
    let resetAt: String
}

final class WheelService {
    static let shared = WheelService()
    private let api = APIClient.shared
    private init() {}
    
    func status() async throws -> WheelStatusResponse {
        try await api.get("/users/me/wheel/status")
    }

    func spin() async throws -> WheelSpinResponse {
        try await api.post("/users/me/wheel/spin")
    }

    func claim(reward: String? = nil) async throws -> User {
        var body: [String: Any] = [:]
        if let reward {
            body["reward"] = reward
        }
        return try await api.post("/users/me/rewards/claim", body: body)
    }
}
