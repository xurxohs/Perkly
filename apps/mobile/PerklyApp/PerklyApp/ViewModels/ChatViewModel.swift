import Foundation

@MainActor
final class ChatViewModel: ObservableObject {
    @Published var rooms: [ChatRoom] = []
    @Published var messages: [Message] = []
    @Published var isLoadingRooms = false
    @Published var isLoadingMessages = false
    @Published var error: String?
    
    // Message input
    @Published var messageText = ""
    @Published var isSending = false
    @Published var isOtherTyping = false
    
    // Polling
    private var pollingTask: Task<Void, Never>?
    private var realtimeTask: Task<Void, Never>?
    private var typingStopTask: Task<Void, Never>?
    private var sentTypingState = false
    
    private let service = ChatService.shared
    
    var totalUnread: Int {
        rooms.reduce(0) { $0 + $1.unreadCount }
    }
    
    // MARK: - Rooms
    
    func loadRooms() async {
        isLoadingRooms = true
        error = nil
        
        do {
            self.rooms = try await service.getRooms()
        } catch is CancellationError {
            // Leaving the screen cancels the request and is not an error state.
        } catch {
            self.error = error.localizedDescription
        }
        
        isLoadingRooms = false
    }
    
    // MARK: - Messages
    
    func loadMessages(roomId: String) async {
        isLoadingMessages = true
        
        do {
            self.messages = try await service.getMessages(roomId: roomId)
            // Mark as read
            try? await service.markRoomAsRead(roomId: roomId)
        } catch {
            self.error = error.localizedDescription
        }
        
        isLoadingMessages = false
    }
    
    func sendMessage(roomId: String) async {
        let content = messageText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !content.isEmpty else { return }
        
        isSending = true
        
        do {
            let msg = try await service.sendMessage(roomId: roomId, content: content)
            messages.append(msg)
            messageText = ""
            await stopTyping(roomId: roomId)
        } catch {
            self.error = error.localizedDescription
        }
        
        isSending = false
    }
    
    // MARK: - Polling
    
    func startPolling(roomId: String) {
        stopPolling()
        pollingTask = Task {
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 5_000_000_000) // 5 sec
                guard !Task.isCancelled else { break }
                do {
                    let fresh = try await service.getMessages(roomId: roomId)
                    if fresh.count != messages.count {
                        self.messages = fresh
                    }
                } catch {
                    // Silently ignore polling errors
                }
            }
        }
    }

    func startRealtime(roomId: String, currentUserId: String?) {
        realtimeTask?.cancel()
        realtimeTask = Task {
            do {
                for try await event in service.realtimeEvents() where event.roomId == roomId {
                    guard !Task.isCancelled else { break }
                    if event.type == "typing", event.actorId != currentUserId {
                        isOtherTyping = event.isTyping == true
                    } else if event.type == "message_created" {
                        if let message = event.message,
                           !messages.contains(where: { $0.id == message.id }) {
                            messages.append(message)
                        }
                        if event.actorId != currentUserId { isOtherTyping = false }
                    }
                }
            } catch {
                // Five-second polling remains active as a network fallback.
            }
        }
    }

    func messageChanged(roomId: String) {
        typingStopTask?.cancel()
        let hasText = !messageText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        if hasText && !sentTypingState {
            sentTypingState = true
            Task { try? await service.setTyping(roomId: roomId, isTyping: true) }
        }
        guard hasText else {
            Task { await stopTyping(roomId: roomId) }
            return
        }
        typingStopTask = Task {
            try? await Task.sleep(for: .seconds(2))
            guard !Task.isCancelled else { return }
            await stopTyping(roomId: roomId)
        }
    }

    private func stopTyping(roomId: String) async {
        typingStopTask?.cancel()
        typingStopTask = nil
        guard sentTypingState else { return }
        sentTypingState = false
        try? await service.setTyping(roomId: roomId, isTyping: false)
    }
    
    func stopPolling() {
        pollingTask?.cancel()
        pollingTask = nil
        realtimeTask?.cancel()
        realtimeTask = nil
        typingStopTask?.cancel()
        typingStopTask = nil
        isOtherTyping = false
    }
}
