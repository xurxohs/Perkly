import Foundation

struct User: Codable, Identifiable, Equatable {
    let id: String
    let email: String?
    let displayName: String?
    let avatarUrl: String?
    let role: String?
    let tier: String?
    let balance: Double?
    let rewardPoints: Int?
    let createdAt: String?
    let updatedAt: String?
    let telegramId: String?
    let phone: String?
    let preferredLanguage: String?
    
    var tierEnum: UserTier {
        guard let tier else { return .silver }
        return UserTier(rawValue: tier) ?? .silver
    }
    
    var roleEnum: UserRole {
        guard let role else { return .user }
        return UserRole(rawValue: role) ?? .user
    }
    
    static func == (lhs: User, rhs: User) -> Bool {
        lhs.id == rhs.id
    }
}

enum UserTier: String, Codable {
    case silver = "SILVER"
    case gold = "GOLD"
    case platinum = "PLATINUM"
    
    var displayName: String {
        switch self {
        case .silver: return "Silver"
        case .gold: return "Gold"
        case .platinum: return "Platinum"
        }
    }
    
    var icon: String {
        switch self {
        case .silver: return "shield.fill"
        case .gold: return "medal.fill"
        case .platinum: return "diamond.fill"
        }
    }
}

enum UserRole: String, Codable {
    case user = "USER"
    case vendor = "VENDOR"
    case admin = "ADMIN"
}

struct B2CProfile: Codable {
    let userId: String?
    let birthYear: Int?
    let gender: String?
    let city: String?
    let anonymousId: String?
    let createdAt: String?
    let updatedAt: String?
}

struct UserInterest: Codable, Identifiable {
    let id: String
    let userId: String
    let category: String
    let weight: Double?
    let source: String?
    let createdAt: String?
    let updatedAt: String?
}

enum CompanyStatus: String, Codable {
    case pendingModeration = "PENDING_MODERATION"
    case active = "ACTIVE"
    case suspended = "SUSPENDED"

    var title: String {
        switch self {
        case .pendingModeration: return L10n.tr("company.status.pending_moderation")
        case .active: return L10n.tr("company.status.active")
        case .suspended: return L10n.tr("company.status.suspended")
        }
    }
}

struct CompanyCounts: Codable {
    let offers: Int?
    let promocodes: Int?
}

struct Company: Codable, Identifiable {
    let id: String
    let ownerUserId: String
    let legalName: String
    let brandName: String
    let inn: String
    let phone: String?
    let status: CompanyStatus
    let createdAt: String?
    let updatedAt: String?
    let _count: CompanyCounts?
    let owner: CompanyOwner?
}

struct CompanyOwner: Codable {
    let id: String
    let email: String?
    let displayName: String?
    let role: String?
    let phone: String?
    let telegramId: String?
}
