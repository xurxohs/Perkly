import Foundation

final class ReviewsService {
    static let shared = ReviewsService()
    private let api = APIClient.shared
    private init() {}
    
    func create(rating: Int, comment: String?, offerId: String, authorId: String) async throws -> Review {
        var body: [String: Any] = [
            "rating": rating,
            "offerId": offerId,
            "authorId": authorId
        ]
        if let comment, !comment.isEmpty {
            body["comment"] = comment
        }
        return try await api.post("/reviews", body: body)
    }
    
    func findByOfferId(_ offerId: String) async throws -> [Review] {
        try await api.get("/reviews/offer/\(offerId)")
    }
    
    func getOfferStats(_ offerId: String) async throws -> ReviewStats {
        try await api.get("/reviews/offer/\(offerId)/stats")
    }

    func findByAuthorId(_ authorId: String) async throws -> [Review] {
        try await api.get("/reviews/author/\(authorId)")
    }
}
