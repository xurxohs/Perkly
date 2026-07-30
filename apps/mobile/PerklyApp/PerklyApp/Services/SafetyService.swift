import Foundation

final class SafetyService {
    static let shared = SafetyService()
    private let api = APIClient.shared
    private init() {}

    func report(
        targetType: String,
        targetId: String,
        category: String,
        description: String
    ) async throws {
        let _: EmptyResponse = try await api.post("/safety/reports", body: [
            "targetType": targetType,
            "targetId": targetId,
            "category": category,
            "description": description
        ])
    }

    func blockUser(_ userId: String) async throws {
        let _: EmptyResponse = try await api.post("/safety/blocks", body: [
            "userId": userId
        ])
    }
}
