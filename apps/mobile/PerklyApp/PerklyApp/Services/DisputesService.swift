import Foundation

final class DisputesService {
    static let shared = DisputesService()
    private let api = APIClient.shared
    private init() {}
    
    func create(transactionId: String, reason: String) async throws -> Dispute {
        try await api.post("/disputes", body: [
            "transactionId": transactionId,
            "reason": reason
        ])
    }
    
    func getById(_ id: String) async throws -> Dispute {
        try await api.get("/disputes/\(id)")
    }
    
    func list() async throws -> [Dispute] {
        try await api.get("/disputes/my")
    }
}
