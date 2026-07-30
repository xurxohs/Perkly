import Foundation

struct UploadResponse: Codable {
    let url: String
    let thumbnailUrl: String?
}

final class OffersService {
    static let shared = OffersService()
    private let api = APIClient.shared
    private init() {}
    
    func list(filters: OfferFilters = OfferFilters()) async throws -> OfferListResponse {
        let queryItems = filters.queryItems
        let key = "offers:uzs:v2:" + queryItems
            .map { "\($0.name)=\($0.value ?? "")" }
            .joined(separator: "&")
        return try await DiskResponseCache.shared.fetch(key: key, maximumFreshAge: 10) {
            try await self.api.get("/offers", queryItems: queryItems)
        }.value
    }
    
    func getById(_ id: String) async throws -> Offer {
        try await api.get("/offers/\(id)")
    }

    func getRelated(_ id: String, take: Int = 6) async throws -> OfferListResponse {
        try await api.get("/offers/\(id)/related", queryItems: [
            .init(name: "take", value: "\(take)")
        ])
    }

    func recommendations(lat: Double?, lng: Double?, limit: Int, excluding: Set<String>) async throws -> ServerRecommendationResponse {
        var query: [URLQueryItem] = [.init(name: "limit", value: "\(limit)")]
        if let lat, let lng {
            query.append(.init(name: "lat", value: "\(lat)"))
            query.append(.init(name: "lng", value: "\(lng)"))
        }
        if !excluding.isEmpty {
            query.append(.init(name: "exclude", value: excluding.sorted().joined(separator: ",")))
        }
        return try await api.get("/offers/recommendations/me", queryItems: query)
    }

    func saveOffer(id: String) async throws -> SavedOffer {
        try await api.post("/offers/\(id)/save")
    }

    func unsaveOffer(id: String) async throws -> UnsaveOfferResponse {
        try await api.delete("/offers/\(id)/save")
    }
    
    func getTrending(take: Int = 4) async throws -> OfferListResponse {
        try await api.get("/offers", queryItems: [
            .init(name: "take", value: "\(take)"),
            .init(name: "sort", value: "newest")
        ])
    }
    
    func getFlashDrops() async throws -> OfferListResponse {
        try await api.get("/offers", queryItems: [
            .init(name: "isFlashDrop", value: "true")
        ])
    }
    
    func createVendorOffer(
        title: String,
        description: String,
        price: Int,
        category: String,
        imageURL: String,
        hiddenData: String,
        fulfillmentType: OfferFulfillmentType = .instructions,
        usageInstructions: String? = nil,
        periodDays: Int? = nil
    ) async throws -> Offer {
        let body: [String: Any] = [
            "title": title,
            "description": description,
            "price": price,
            "category": category,
            "imageUrl": imageURL,
            "hiddenData": hiddenData,
            "fulfillmentType": fulfillmentType.rawValue,
            "isActive": true
        ]
        
        var payload = body
        if let thumbnailURL = derivedThumbnailURL(from: imageURL) {
            payload["thumbnailUrl"] = thumbnailURL
        }
        if let usageInstructions, !usageInstructions.isEmpty {
            payload["usageInstructions"] = usageInstructions
        }
        if let periodDays, periodDays > 0 {
            payload["periodDays"] = periodDays
        }
        
        let offer: Offer = try await api.post("/offers/vendor", body: payload)
        await DiskResponseCache.shared.clear()
        return offer
    }

    func uploadVendorImage(base64DataUrl: String) async throws -> String {
        let payload: [String: Any] = [
            "dataUrl": base64DataUrl
        ]
        let response: UploadResponse = try await api.post("/offers/vendor/upload", body: payload)
        return response.url
    }

    func featureOffer(id: String, days: Int) async throws -> Offer {
        let offer: Offer = try await api.post("/offers/\(id)/feature", body: ["days": days])
        await DiskResponseCache.shared.clear()
        return offer
    }

    func updateOffer(
        id: String,
        title: String,
        description: String,
        price: Int,
        category: String,
        imageURL: String,
        hiddenData: String,
        isActive: Bool,
        fulfillmentType: OfferFulfillmentType? = nil
    ) async throws -> Offer {
        var body: [String: Any] = [
            "title": title,
            "description": description,
            "price": price,
            "category": category,
            "imageUrl": imageURL,
            "hiddenData": hiddenData,
            "isActive": isActive
        ]
        if let thumbnailURL = derivedThumbnailURL(from: imageURL) {
            body["thumbnailUrl"] = thumbnailURL
        }
        if let fulfillmentType {
            body["fulfillmentType"] = fulfillmentType.rawValue
        }
        let offer: Offer = try await api.patch("/offers/\(id)", body: body)
        await DiskResponseCache.shared.clear()
        return offer
    }

    private func derivedThumbnailURL(from imageURL: String) -> String? {
        guard imageURL.contains("/uploads/vendor/"), imageURL.hasSuffix(".webp") else { return nil }
        return String(imageURL.dropLast(5)) + "-thumb.webp"
    }

    func deleteOffer(id: String) async throws -> AdminMessageResponse {
        let response: AdminMessageResponse = try await api.delete("/offers/\(id)")
        await DiskResponseCache.shared.clear()
        return response
    }
}

final class PromocodesService {
    static let shared = PromocodesService()
    private let api = APIClient.shared
    private init() {}

    func activate(id: String) async throws -> PromocodeActivation {
        try await api.post("/promocodes/\(id)/activate")
    }

    func copyActivation(id: String) async throws -> PromocodeActivation {
        try await api.post("/promocodes/activations/\(id)/copy")
    }

    func useActivation(id: String) async throws -> PromocodeActivation {
        try await api.post("/promocodes/activations/\(id)/use")
    }

    func listMyActivations() async throws -> [PromocodeActivation] {
        try await api.get("/users/me/promocode-activations")
    }

    func listForOffer(id: String) async throws -> [Promocode] {
        try await api.get("/offers/\(id)/promocodes")
    }

    func listCompanyPromocodes() async throws -> [Promocode] {
        try await api.get("/promocodes/company/me")
    }

    func companyAnalytics() async throws -> PromocodeAnalytics {
        try await api.get("/promocodes/company/me/analytics")
    }

    func create(_ input: PromocodeInput) async throws -> Promocode {
        try await api.post("/promocodes", body: input.body)
    }

    func update(id: String, input: PromocodeInput) async throws -> Promocode {
        try await api.patch("/promocodes/\(id)", body: input.body)
    }

    func updateStatus(id: String, status: PromocodeStatus) async throws -> Promocode {
        try await api.patch("/promocodes/\(id)/status", body: ["status": status.rawValue])
    }
}
