import Foundation

final class EventsService {
    static let shared = EventsService()
    private let api = APIClient.shared
    private init() {}

    func uploadCover(jpegData: Data) async throws -> String {
        let dataUrl = "data:image/jpeg;base64,\(jpegData.base64EncodedString())"
        let response: UploadResponse = try await api.post("/events/media/upload", body: ["dataUrl": dataUrl])
        return response.url
    }
    
    func list(skip: Int? = nil, take: Int? = nil, category: String? = nil, search: String? = nil) async throws -> EventListResponse {
        var items: [URLQueryItem] = []
        if let skip { items.append(.init(name: "skip", value: "\(skip)")) }
        if let take { items.append(.init(name: "take", value: "\(take)")) }
        if let category, !category.isEmpty { items.append(.init(name: "category", value: category)) }
        if let search, !search.isEmpty { items.append(.init(name: "search", value: search)) }
        return try await api.get("/events", queryItems: items)
    }
    
    func getById(_ id: String) async throws -> Event {
        try await api.get("/events/\(id)")
    }

    func mine() async throws -> [Event] {
        try await api.get("/events/mine")
    }

    func saved() async throws -> [SavedEventRecord] {
        try await api.get("/events/saved")
    }

    func save(_ id: String) async throws -> SavedEventRecord {
        try await api.post("/events/\(id)/save")
    }

    func unsave(_ id: String) async throws -> UnsaveEventResponse {
        try await api.delete("/events/\(id)/save")
    }
    
    func create(title: String, description: String, category: String, date: String, location: String, imageUrl: String) async throws -> Event {
        let body: [String: Any] = [
            "title": title,
            "description": description,
            "category": category,
            "date": date,
            "location": location,
            "imageUrl": imageUrl
        ]
        return try await api.post("/events/vendor", body: body)
    }

    func update(_ id: String, title: String, description: String, category: String, date: String, location: String, imageUrl: String) async throws -> Event {
        let body: [String: Any] = [
            "title": title,
            "description": description,
            "category": category,
            "date": date,
            "location": location,
            "imageUrl": imageUrl
        ]
        return try await api.patch("/events/\(id)", body: body)
    }
    
    func delete(_ id: String) async throws -> EventDeleteResponse {
        return try await api.delete("/events/\(id)")
    }
}

struct SavedEventRecord: Codable, Identifiable {
    let id: String
    let eventId: String
    let createdAt: String?
}

struct UnsaveEventResponse: Codable { let deleted: Bool }

struct EventDeleteResponse: Codable {
    let message: String?
}
