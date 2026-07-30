import Foundation

final class ChatService {
    static let shared = ChatService()
    private let api = APIClient.shared
    private init() {}
    
    func getRooms() async throws -> [ChatRoom] {
        let response: ChatRoomsResponse = try await api.get("/chat/rooms")
        return response.data
    }
    
    func getMessages(roomId: String, skip: Int = 0, take: Int = 50) async throws -> [Message] {
        let response: ChatMessagesResponse = try await api.get("/chat/rooms/\(roomId)/messages", queryItems: [
            .init(name: "skip", value: "\(skip)"),
            .init(name: "take", value: "\(take)")
        ])
        return Array(response.data.reversed())
    }
    
    func createOrGetDirectRoom(targetUserId: String) async throws -> ChatRoom {
        try await api.post("/chat/rooms", body: ["targetUserId": targetUserId])
    }
    
    func sendMessage(roomId: String, content: String) async throws -> Message {
        try await api.post("/chat/messages", body: [
            "roomId": roomId,
            "content": content
        ])
    }

    func setTyping(roomId: String, isTyping: Bool) async throws {
        let _: TypingResponse = try await api.post(
            "/chat/rooms/\(roomId)/typing",
            body: ["isTyping": isTyping]
        )
    }

    func realtimeEvents() -> AsyncThrowingStream<ChatRealtimeEvent, Error> {
        AsyncThrowingStream { continuation in
            let task = Task {
                do {
                    guard let url = URL(string: Constants.apiBaseURL + "/chat/events") else {
                        throw APIError.invalidURL
                    }
                    var request = URLRequest(url: url)
                    request.setValue("text/event-stream", forHTTPHeaderField: "Accept")
                    if let token = KeychainHelper.shared.read(forKey: Constants.keychainTokenKey) {
                        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                    }
                    let (bytes, response) = try await URLSession.shared.bytes(for: request)
                    guard (response as? HTTPURLResponse)?.statusCode == 200 else {
                        throw APIError.unauthorized
                    }
                    let decoder = JSONDecoder()
                    for try await line in bytes.lines where line.hasPrefix("data:") {
                        let json = line.dropFirst(5).trimmingCharacters(in: .whitespaces)
                        guard let data = json.data(using: .utf8),
                              let event = try? decoder.decode(ChatRealtimeEvent.self, from: data) else { continue }
                        continuation.yield(event)
                    }
                    continuation.finish()
                } catch is CancellationError {
                    continuation.finish()
                } catch {
                    continuation.finish(throwing: error)
                }
            }
            continuation.onTermination = { _ in task.cancel() }
        }
    }
}

struct TypingResponse: Codable { let success: Bool; let roomId: String; let isTyping: Bool }

struct ChatRealtimeEvent: Codable {
    let type: String
    let roomId: String
    let actorId: String?
    let isTyping: Bool?
    let expiresAt: String?
    let message: Message?
}

// Wrapper for markAsRead response. Backend variants may return success/count.
extension ChatService {
    struct ReadResponse: Codable {
        let success: Bool?
        let count: Int?
    }
    
    func markRoomAsRead(roomId: String) async throws {
        let _: ReadResponse = try await api.patch("/chat/messages/read", body: ["roomId": roomId])
    }
}
