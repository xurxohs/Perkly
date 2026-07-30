import Foundation

struct Deposit: Codable {
    let id: String
    let amount: Double
    let status: String
}

struct TopUpResponse: Codable {
    let deposit: Deposit?
    let paymentUrl: String?
}

final class PaymentsService {
    static let shared = PaymentsService()
    private let api = APIClient.shared
    private init() {}
    
    func topUp(amount: Int) async throws -> TopUpResponse {
        try await api.post("/payments/topup", body: [
            "amount": amount,
            "idempotencyKey": UUID().uuidString
        ])
    }

    func depositStatus(id: String) async throws -> Deposit {
        try await api.get("/payments/deposits/\(id)")
    }

}
