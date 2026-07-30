import Foundation

struct Transaction: Codable, Identifiable {
    let id: String
    let offerId: String
    let buyerId: String
    let price: Double
    let status: String
    let expiresAt: String?
    let isGift: Bool?
    let giftCode: String?
    let isRedeemed: Bool?
    let createdAt: String?
    let offer: Offer?
    let buyer: User?
    
    var statusEnum: TransactionStatus {
        TransactionStatus(rawValue: status) ?? .pending
    }

    var expirationDate: Date? {
        guard let expiresAt else { return nil }

        let fractional = ISO8601DateFormatter()
        fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = fractional.date(from: expiresAt) {
            return date
        }

        return ISO8601DateFormatter().date(from: expiresAt)
    }

    var isTimeActive: Bool {
        guard let expirationDate else { return false }
        return expirationDate > Date()
    }

    var canRevealAccessData: Bool {
        switch statusEnum {
        case .success, .paid, .completed, .activated, .escrow, .disputed:
            return true
        case .pending, .failed, .cancelled, .refunded:
            return false
        }
    }

    var canAddToAppleWallet: Bool {
        switch statusEnum {
        case .failed, .cancelled, .refunded:
            return false
        case .pending, .success, .paid, .completed, .disputed, .escrow, .activated:
            return true
        }
    }
}

enum TransactionStatus: String, Codable {
    case pending = "PENDING"
    case success = "SUCCESS"
    case failed = "FAILED"
    case paid = "PAID"
    case completed = "COMPLETED"
    case cancelled = "CANCELLED"
    case refunded = "REFUNDED"
    case disputed = "DISPUTED"
    case escrow = "ESCROW"
    case activated = "ACTIVATED"
    
    var displayName: String {
        switch self {
        case .pending: return L10n.tr("transaction.status.pending")
        case .success: return L10n.tr("transaction.status.success")
        case .failed: return L10n.tr("transaction.status.failed")
        case .paid: return L10n.tr("transaction.status.paid")
        case .completed: return L10n.tr("transaction.status.completed")
        case .cancelled: return L10n.tr("transaction.status.cancelled")
        case .refunded: return L10n.tr("transaction.status.refunded")
        case .disputed: return L10n.tr("transaction.status.disputed")
        case .escrow: return L10n.tr("transaction.status.escrow")
        case .activated: return L10n.tr("transaction.status.activated")
        }
    }
    
    var icon: String {
        switch self {
        case .pending: return "clock.fill"
        case .success, .completed: return "checkmark.circle.fill"
        case .failed, .cancelled: return "xmark.circle.fill"
        case .paid: return "creditcard.fill"
        case .refunded: return "arrow.uturn.backward.circle.fill"
        case .disputed: return "exclamationmark.triangle.fill"
        case .escrow: return "lock.shield.fill"
        case .activated: return "bolt.circle.fill"
        }
    }
    
    var color: String {
        switch self {
        case .success, .completed: return "green"
        case .pending, .escrow, .paid: return "yellow"
        case .failed, .cancelled: return "red"
        case .refunded: return "blue"
        case .disputed: return "orange"
        case .activated: return "green"
        }
    }
}

struct TransactionListResponse: Codable {
    let data: [Transaction]
    let total: Int
}
