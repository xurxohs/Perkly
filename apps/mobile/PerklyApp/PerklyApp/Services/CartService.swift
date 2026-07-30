import Foundation

struct ServerCartItem: Codable, Identifiable {
    let id: String
    let offerId: String
    let isGift: Bool
    let offer: Offer

    var localItem: CartItem {
        CartItem(
            offerId: offerId,
            title: offer.safeTitle,
            price: offer.safePrice,
            category: offer.safeCategory,
            image: offer.safeProductImage,
            sellerId: offer.sellerId,
            isGift: isGift
        )
    }
}

final class CartService {
    static let shared = CartService()
    private let api = APIClient.shared
    private init() {}

    func list() async throws -> [ServerCartItem] { try await api.get("/cart") }

    func upsert(offerId: String, isGift: Bool) async throws -> [ServerCartItem] {
        try await api.put("/cart/items/\(offerId)", body: ["isGift": isGift])
    }

    func remove(offerId: String) async throws -> [ServerCartItem] {
        try await api.delete("/cart/items/\(offerId)")
    }

    func clear() async throws -> [ServerCartItem] { try await api.delete("/cart") }
}
