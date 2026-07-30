import Foundation

struct Dispute: Codable, Identifiable {
    let id: String
    let transactionId: String
    let reason: String
    let status: String
    let evidenceUrls: [String]?
    let resolution: String?
    let adminNote: String?
    let resolvedBy: String?
    let resolvedAt: String?
    let createdAt: String?
    let updatedAt: String?
    let transaction: Transaction?
    
    var statusEnum: DisputeStatus {
        DisputeStatus(rawValue: status) ?? .open
    }
}

enum DisputeStatus: String, Codable {
    case open = "OPEN"
    case resolved = "RESOLVED"
    case closed = "CLOSED"
    
    var displayName: String {
        switch self {
        case .open: return L10n.tr("dispute.status.open")
        case .resolved: return L10n.tr("dispute.status.resolved")
        case .closed: return L10n.tr("dispute.status.closed")
        }
    }
    
    var icon: String {
        switch self {
        case .open: return "exclamationmark.bubble.fill"
        case .resolved: return "checkmark.circle.fill"
        case .closed: return "xmark.circle.fill"
        }
    }
    
    var color: String {
        switch self {
        case .open: return "orange"
        case .resolved: return "green"
        case .closed: return "gray"
        }
    }
}
