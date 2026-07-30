import Foundation

final class SquadsService {
    static let shared = SquadsService()
    private let api = APIClient.shared
    private init() {}
    
    func create(name: String) async throws -> Squad {
        try await api.post("/squads", body: ["name": name])
    }
    
    func join(inviteCode: String) async throws -> Squad {
        try await api.post("/squads/join", body: ["inviteCode": inviteCode])
    }
    
    /// Returns nil if user is not in a squad
    func getMyProgress() async throws -> SquadProgress? {
        try await api.get("/squads/me")
    }
}
