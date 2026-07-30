import Foundation

struct Review: Codable, Identifiable {
    let id: String
    let rating: Int
    let comment: String?
    let offerId: String
    let authorId: String
    let createdAt: String?
    let author: User?
}

struct ReviewStats: Codable {
    let averageRating: Double
    let totalReviews: Int
}
