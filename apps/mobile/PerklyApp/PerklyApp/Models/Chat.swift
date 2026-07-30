import Foundation

struct ChatRoomsResponse: Decodable {
    let data: [ChatRoom]

    private enum CodingKeys: String, CodingKey {
        case data
        case rooms
    }

    init(from decoder: Decoder) throws {
        if let legacy = try? decoder.singleValueContainer().decode([ChatRoom].self) {
            data = legacy
            return
        }

        let container = try decoder.container(keyedBy: CodingKeys.self)
        if let current = try container.decodeIfPresent([ChatRoom].self, forKey: .data) {
            data = current
        } else {
            data = try container.decode([ChatRoom].self, forKey: .rooms)
        }
    }
}

struct ChatRoom: Codable, Identifiable {
    let id: String
    let type: String
    let roomType: String?
    let roomStatus: String?
    let transactionId: String?
    let createdAt: String?
    let updatedAt: String?
    let lastMessageAt: String?
    let transactionSummary: ChatTransactionSummary?
    let messages: [Message]?
    let participants: [User]?
    let serverLastMessage: Message?
    let serverUnreadCount: Int?

    enum CodingKeys: String, CodingKey {
        case id
        case type
        case roomType
        case roomStatus
        case transactionId
        case createdAt
        case updatedAt
        case lastMessageAt
        case transactionSummary
        case messages
        case participants
        case serverLastMessage = "lastMessage"
        case serverUnreadCount = "unreadCount"
    }
    
    /// Last message preview
    var lastMessage: Message? {
        serverLastMessage ?? messages?.last
    }
    
    /// Count of unread messages
    var unreadCount: Int {
        serverUnreadCount ?? messages?.filter { !$0.isRead }.count ?? 0
    }

    var isDispute: Bool {
        type.uppercased() == "DISPUTE" || roomStatus == "ARBITRATION"
    }

    var isSupport: Bool {
        type.uppercased() == "SUPPORT" || participants?.contains(where: { ($0.role ?? "").uppercased() == "ADMIN" }) == true
    }

    var lastActivityDate: Date? {
        if let lastMessage {
            return lastMessage.createdDate
        }
        return ChatDateParser.date(from: lastMessageAt ?? updatedAt ?? createdAt)
    }
}

struct ChatTransactionSummary: Codable {
    let id: String
    let offerId: String
    let buyerId: String
    let sellerId: String?
    let price: Double
    let status: String
    let isGift: Bool?
    let isRedeemed: Bool?
    let expiresAt: String?
    let createdAt: String?
    let updatedAt: String?
    let roleForUser: String?
    let offer: ChatOfferSummary?
    let dispute: ChatDisputeSummary?

    var roleLabel: String {
        switch roleForUser {
        case "BUYER": return L10n.tr("chat.role.purchase")
        case "SELLER": return L10n.tr("chat.role.sale")
        case "ADMIN": return L10n.tr("chat.role.arbitration")
        default: return L10n.tr("chat.role.transaction")
        }
    }
}

struct ChatOfferSummary: Codable {
    let id: String
    let title: String
    let price: Double?
    let category: String?
    let vendorLogo: String?
}

struct ChatDisputeSummary: Codable {
    let id: String
    let status: String
    let reason: String?
    let createdAt: String?
}

struct Message: Codable, Identifiable {
    let id: String
    let content: String
    let roomId: String
    let senderId: String?
    let isRead: Bool
    let createdAt: String?
    let sender: User?
    
    /// Time formatted for display
    var timeString: String {
        guard let createdDate else { return "" }
        let formatter = DateFormatter()
        formatter.locale = L10n.locale
        formatter.dateFormat = "HH:mm"
        return formatter.string(from: createdDate)
    }

    var createdDate: Date? {
        ChatDateParser.date(from: createdAt)
    }

    var dayKey: String {
        guard let createdDate else { return "unknown" }
        return Calendar.current.startOfDay(for: createdDate).ISO8601Format()
    }

    var dayLabel: String {
        guard let createdDate else { return "" }

        let calendar = Calendar.current
        if calendar.isDateInToday(createdDate) { return L10n.tr("chat.date.today") }
        if calendar.isDateInYesterday(createdDate) { return L10n.tr("chat.date.yesterday") }

        let formatter = DateFormatter()
        formatter.locale = L10n.locale
        formatter.dateFormat = "d MMM"
        return formatter.string(from: createdDate)
    }

    var relativeTimeString: String {
        guard let createdDate else { return "" }

        let seconds = max(0, Date().timeIntervalSince(createdDate))
        if seconds < 60 { return L10n.tr("chat.date.just_now") }
        if seconds < 3600 { return L10n.format("chat.date.minutes_ago", Int(seconds / 60)) }
        if seconds < 86_400 { return L10n.format("chat.date.hours_ago", Int(seconds / 3600)) }
        if seconds < 604_800 { return L10n.format("chat.date.days_ago", Int(seconds / 86_400)) }
        return dayLabel
    }
}

struct ChatMessagesResponse: Codable {
    let data: [Message]
    let pagination: ChatPagination?
    let room: ChatRoomContext?
}

struct ChatPagination: Codable {
    let skip: Int?
    let take: Int?
    let total: Int?
    let hasMore: Bool?
    let nextSkip: Int?
}

struct ChatRoomContext: Codable {
    let id: String
    let type: String?
    let roomType: String?
    let roomStatus: String?
    let transactionSummary: ChatTransactionSummary?
}

private enum ChatDateParser {
    static func date(from value: String?) -> Date? {
        guard let value else { return nil }

        let fractional = ISO8601DateFormatter()
        fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = fractional.date(from: value) {
            return date
        }

        return ISO8601DateFormatter().date(from: value)
    }
}
