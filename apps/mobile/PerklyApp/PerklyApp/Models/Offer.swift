import Foundation

struct Offer: Codable, Identifiable {
    let id: String
    let title: String?
    let description: String?
    let price: Double?
    let discountPercent: Int?
    let vendorLogo: String?
    let imageUrl: String?
    let thumbnailUrl: String?
    let images: [String]?
    let category: String?
    let fulfillmentType: String?
    let isExclusive: Bool?
    let isFlashDrop: Bool?
    let expiresAt: String?
    let sellerId: String?
    let isActive: Bool?
    let usageInstructions: String?
    let hiddenData: String?
    let latitude: Double?
    let longitude: Double?
    let periodDays: Int?
    let featuredUntil: String?
    let deliveryEstimateMinutes: Int?
    let warrantyDays: Int?
    let stockQuantity: Int?
    let buyerInputPrompt: String?
    let buyerInputRequired: Bool?
    let isDemo: Bool?
    let sourceUrl: String?
    let createdAt: String?
    let updatedAt: String?
    let seller: User?
    let _count: OfferCount?
    
    // Safe accessors with defaults for views that expect non-optional values
    var safeTitle: String { title ?? "Без названия" }
    var safeDescription: String { description ?? "" }
    var safePrice: Double { price ?? 0 }
    var safeCategory: String { category ?? "OTHER" }
    var fulfillment: OfferFulfillmentType {
        if let fulfillmentType,
           let value = OfferFulfillmentType(rawValue: fulfillmentType.uppercased()) {
            return value
        }
        return safeCategory == "COUPONS" ? .promocode : .digitalCode
    }
    var safeIsExclusive: Bool { isExclusive ?? false }
    var safeIsFlashDrop: Bool { isFlashDrop ?? false }
    var safeIsActive: Bool { isActive ?? true }

    var featuredDate: Date? {
        guard let featuredUntil else { return nil }

        let fractional = ISO8601DateFormatter()
        fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = fractional.date(from: featuredUntil) {
            return date
        }

        return ISO8601DateFormatter().date(from: featuredUntil)
    }

    var isFeaturedNow: Bool {
        guard let featuredDate else { return false }
        return featuredDate > Date()
    }
    
    var safeVendorLogo: String {
        guard let value = vendorLogo?.trimmingCharacters(in: .whitespacesAndNewlines), !value.isEmpty else { return "" }
        return value
    }

    /// Product artwork, with backwards compatibility for offers created before
    /// the API gained a dedicated image field.
    var safeProductImage: String {
        if let value = images?.first?.trimmingCharacters(in: .whitespacesAndNewlines), !value.isEmpty { return value }
        if let value = imageUrl?.trimmingCharacters(in: .whitespacesAndNewlines), !value.isEmpty { return value }
        if let value = vendorLogo?.trimmingCharacters(in: .whitespacesAndNewlines), !value.isEmpty { return value }
        return "https://perkly.uz/demo-events/food.png"
    }

    var productImages: [String] {
        let gallery = (images ?? []).filter { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
        return gallery.isEmpty ? [safeProductImage] : gallery
    }

    var safeProductThumbnail: String {
        if let value = thumbnailUrl?.trimmingCharacters(in: .whitespacesAndNewlines), !value.isEmpty { return value }
        return safeProductImage
    }

    /// The production API often returns official brand artwork here rather than
    /// a product photograph, so cards must not crop and upscale it like a photo.
    var usesBrandLogoArtwork: Bool {
        guard imageUrl?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty != false,
              let value = vendorLogo?.lowercased() else { return false }
        return value.contains("/brands/") || value.hasSuffix(".svg")
    }
    
    var originalPrice: Double? {
        guard let price, let discount = discountPercent, discount > 0 else { return nil }
        return price / (1 - Double(discount) / 100)
    }
    
    var hoursLeft: Double? {
        guard let expiresAt = expiresAt else { return nil }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: expiresAt) else {
            // Try without fractional seconds
            let basic = ISO8601DateFormatter()
            guard let d = basic.date(from: expiresAt) else { return nil }
            let diff = d.timeIntervalSince(Date())
            return max(0, diff / 3600)
        }
        let diff = date.timeIntervalSince(Date())
        return max(0, diff / 3600)
    }
    
    var categoryEnum: Constants.Category? {
        guard let category else { return nil }
        return Constants.Category(rawValue: category)
    }
}

enum OfferFulfillmentType: String, Codable, CaseIterable, Identifiable {
    case promocode = "PROMOCODE"
    case digitalCode = "DIGITAL_CODE"
    case link = "LINK"
    case instructions = "INSTRUCTIONS"

    var id: String { rawValue }

    var usesQRCode: Bool {
        self == .promocode || self == .digitalCode
    }

    var accessTitle: String {
        switch self {
        case .promocode: return "ПРОМОКОД"
        case .digitalCode: return "ЦИФРОВОЙ КОД"
        case .link: return "ССЫЛКА"
        case .instructions: return "ДАННЫЕ ЗАКАЗА"
        }
    }

    var displayName: String {
        switch self {
        case .promocode: return "Промокод · с QR"
        case .digitalCode: return "Цифровой код · с QR"
        case .link: return "Ссылка · без QR"
        case .instructions: return "Обычный товар · без QR"
        }
    }
}

struct OfferCount: Codable {
    let transactions: Int?
    let promocodes: Int?
}

struct OfferListResponse: Codable {
    let data: [Offer]
    let total: Int
}

struct ServerRecommendationResponse: Codable {
    let personalized: [Offer]
    let nearby: [Offer]
    let tier: [Offer]
}

struct SavedOffer: Codable, Identifiable {
    let id: String
    let userId: String
    let offerId: String
    let source: String?
    let createdAt: String?
    let offer: Offer
}

struct UnsaveOfferResponse: Codable {
    let deleted: Bool
}

enum PromocodeStatus: String, Codable {
    case active = "ACTIVE"
    case paused = "PAUSED"
    case archived = "ARCHIVED"
}

enum PromocodeCodeType: String, Codable {
    case staticCode = "STATIC"
    case dynamic = "DYNAMIC"
}

enum PromocodeActivationStatus: String, Codable {
    case issued = "ISSUED"
    case copied = "COPIED"
    case used = "USED"
}

struct PromocodeCompanySummary: Codable {
    let id: String
    let brandName: String?
}

struct PromocodeOfferSummary: Codable {
    let id: String
    let title: String?
    let vendorLogo: String?
    let category: String?
    let isActive: Bool?
}

struct Promocode: Codable, Identifiable {
    let id: String
    let companyId: String
    let offerId: String?
    let title: String
    let description: String?
    let codeType: PromocodeCodeType
    let code: String?
    let discountValue: Double
    let maxActivations: Int?
    let perUserLimit: Int
    let validFrom: String?
    let validTo: String?
    let status: PromocodeStatus
    let createdAt: String?
    let updatedAt: String?
    let offer: PromocodeOfferSummary?
    let company: PromocodeCompanySummary?
}

struct PromocodeInput {
    var offerId: String?
    var title: String
    var description: String?
    var codeType: PromocodeCodeType
    var code: String?
    var discountValue: Double
    var maxActivations: Int?
    var perUserLimit: Int
    var validFrom: String?
    var validTo: String?
    var status: PromocodeStatus

    var body: [String: Any] {
        var payload: [String: Any] = [
            "title": title,
            "codeType": codeType.rawValue,
            "discountValue": discountValue,
            "perUserLimit": perUserLimit,
            "status": status.rawValue
        ]
        payload["offerId"] = offerId ?? NSNull()
        if let description, !description.isEmpty { payload["description"] = description }
        if let code, !code.isEmpty { payload["code"] = code }
        if let maxActivations { payload["maxActivations"] = maxActivations }
        payload["validFrom"] = validFrom ?? NSNull()
        payload["validTo"] = validTo ?? NSNull()
        return payload
    }
}

struct PromocodeAnalytics: Codable {
    let summary: PromocodeAnalyticsSummary
    let promocodes: [PromocodeAnalyticsItem]
}

struct PromocodeAnalyticsSummary: Codable {
    let totalPromocodes: Int
    let activePromocodes: Int
    let totalActivations: Int
    let copiedActivations: Int
    let usedActivations: Int
    let copyRate: Double
    let useRate: Double
}

struct PromocodeAnalyticsItem: Codable, Identifiable {
    let id: String
    let title: String
    let status: PromocodeStatus
    let discountValue: Double
    let maxActivations: Int?
    let perUserLimit: Int
    let offerTitle: String?
    let activations: Int
    let copied: Int
    let used: Int
    let issued: Int
    let copyRate: Double
    let useRate: Double
    let quotaUsedRate: Double?
}

struct PromocodeActivation: Codable, Identifiable {
    let id: String
    let userId: String
    let promocodeId: String
    let offerId: String?
    let status: PromocodeActivationStatus
    let codeSnapshot: String?
    let copiedAt: String?
    let usedAt: String?
    let expiresAt: String?
    let createdAt: String?
    let updatedAt: String?
    let promocode: Promocode?

    var isUsable: Bool {
        status == .issued || status == .copied
    }
}

struct OfferFilters {
    var skip: Int? = nil
    var take: Int? = nil
    var category: String? = nil
    var fulfillmentType: String? = nil
    var search: String? = nil
    var sort: String? = nil
    var isFlashDrop: Bool? = nil
    var minPrice: Double? = nil
    var maxPrice: Double? = nil
    var lat: Double? = nil
    var lng: Double? = nil
    var radiusKm: Double? = nil
    
    // Explicit init to allow partial initialization
    init(
        skip: Int? = nil,
        take: Int? = nil,
        category: String? = nil,
        fulfillmentType: String? = nil,
        search: String? = nil,
        sort: String? = nil,
        isFlashDrop: Bool? = nil,
        minPrice: Double? = nil,
        maxPrice: Double? = nil,
        lat: Double? = nil,
        lng: Double? = nil,
        radiusKm: Double? = nil
    ) {
        self.skip = skip
        self.take = take
        self.category = category
        self.fulfillmentType = fulfillmentType
        self.search = search
        self.sort = sort
        self.isFlashDrop = isFlashDrop
        self.minPrice = minPrice
        self.maxPrice = maxPrice
        self.lat = lat
        self.lng = lng
        self.radiusKm = radiusKm
    }
    
    var queryItems: [URLQueryItem] {
        var items: [URLQueryItem] = []
        if let skip { items.append(.init(name: "skip", value: "\(skip)")) }
        if let take { items.append(.init(name: "take", value: "\(take)")) }
        if let category, !category.isEmpty { items.append(.init(name: "category", value: category)) }
        if let fulfillmentType, !fulfillmentType.isEmpty { items.append(.init(name: "fulfillmentType", value: fulfillmentType)) }
        if let search, !search.isEmpty { items.append(.init(name: "search", value: search)) }
        if let sort { items.append(.init(name: "sort", value: sort)) }
        if let isFlashDrop { items.append(.init(name: "isFlashDrop", value: "\(isFlashDrop)")) }
        if let minPrice { items.append(.init(name: "minPrice", value: "\(minPrice)")) }
        if let maxPrice { items.append(.init(name: "maxPrice", value: "\(maxPrice)")) }
        if let lat { items.append(.init(name: "lat", value: "\(lat)")) }
        if let lng { items.append(.init(name: "lng", value: "\(lng)")) }
        if let radiusKm { items.append(.init(name: "radiusKm", value: "\(radiusKm)")) }
        return items
    }
}
