import Foundation

struct SellerStats: Codable {
    let totalEarnings: Double
    let totalSales: Int
    let activeOffers: Int
    let activeEvents: Int
    let eventViews: Int
    let eventParticipants: Int
    let recentTransactions: [Transaction]

    enum CodingKeys: String, CodingKey {
        case totalEarnings
        case totalSales
        case activeOffers
        case activeEvents
        case eventViews
        case eventParticipants
        case recentTransactions
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        totalEarnings = try container.decodeIfPresent(Double.self, forKey: .totalEarnings) ?? 0
        totalSales = try container.decodeIfPresent(Int.self, forKey: .totalSales) ?? 0
        activeOffers = try container.decodeIfPresent(Int.self, forKey: .activeOffers) ?? 0
        activeEvents = try container.decodeIfPresent(Int.self, forKey: .activeEvents) ?? 0
        eventViews = try container.decodeIfPresent(Int.self, forKey: .eventViews) ?? 0
        eventParticipants = try container.decodeIfPresent(Int.self, forKey: .eventParticipants) ?? 0
        recentTransactions = try container.decodeIfPresent([Transaction].self, forKey: .recentTransactions) ?? []
    }
}

struct PartnerCapabilities: Codable {
    let userId: String?
    let role: String
    let tier: String
    let planName: String
    let status: String
    let isActive: Bool
    let currentSubscription: PartnerSubscription?
    let daysRemaining: Int?
    let capabilities: PartnerCapabilitySet
    let limits: PartnerPlanLimits
    let usage: PartnerUsage
    let upgrade: PartnerUpgrade?
    let plans: [PartnerPlan]

    var tierEnum: UserTier {
        UserTier(rawValue: tier) ?? .silver
    }

    var canPublishTopka: Bool {
        capabilities.canPublishTopka
    }

    var statusText: String {
        if status == "EXPIRED" { return L10n.tr("seller.subscription.expired") }
        if tierEnum == .silver { return "Basic" }
        if let daysRemaining {
            return L10n.format("seller.subscription.plan_days_remaining", planName, daysRemaining)
        }
        return planName
    }

    var timerTitle: String {
        switch status {
        case "ACTIVE":
            if let daysRemaining {
                if daysRemaining <= 0 { return L10n.tr("seller.subscription.ends_today") }
                return L10n.format("seller.subscription.days_remaining", daysRemaining)
            }
            return L10n.tr("seller.subscription.active")
        case "EXPIRED":
            return L10n.tr("seller.subscription.expired")
        case "CANCELED":
            return L10n.tr("seller.subscription.cancelled")
        default:
            return L10n.tr("seller.subscription.none")
        }
    }

    var timerSubtitle: String {
        guard let subscription = currentSubscription else {
            return L10n.tr("seller.subscription.upgrade_hint")
        }

        let tierName = UserTier(rawValue: subscription.tier)?.displayName ?? subscription.tier
        let dateText = subscription.displayEndsAt

        switch subscription.status {
        case "ACTIVE":
            return L10n.format("seller.subscription.active_until", tierName, dateText)
        case "EXPIRED":
            return L10n.format("seller.subscription.expired_on", tierName, dateText)
        case "CANCELED":
            return L10n.format("seller.subscription.cancelled_until", tierName, dateText)
        default:
            return L10n.format("seller.subscription.tier_date", tierName, dateText)
        }
    }

    static func fallback(for user: User?) -> PartnerCapabilities {
        let tier = user?.tierEnum ?? .silver
        let role = user?.roleEnum ?? .user
        let canPublish = tier == .platinum || role == .admin
        let capabilities = PartnerCapabilitySet(
            canCreateOffers: true,
            canFeatureOffers: tier != .silver,
            canPublishTopka: canPublish,
            canViewBasicAnalytics: true,
            canViewAdvancedAnalytics: tier != .silver,
            hasPrioritySupport: tier != .silver
        )

        return PartnerCapabilities(
            userId: user?.id,
            role: user?.role ?? "USER",
            tier: tier.rawValue,
            planName: tier == .silver ? "Basic" : tier.displayName,
            status: canPublish ? "ACTIVE" : "NONE",
            isActive: tier != .silver,
            currentSubscription: nil,
            daysRemaining: nil,
            capabilities: capabilities,
            limits: PartnerPlanLimits(
                offersLimit: tier == .silver ? 3 : (tier == .gold ? 20 : -1),
                topkaMonthlyLimit: tier == .platinum ? 30 : 0,
                featuredOffersPerMonth: tier == .silver ? 0 : (tier == .gold ? 3 : 10)
            ),
            usage: PartnerUsage(activeOffers: 0, activeEvents: 0, topkaPublishedThisMonth: 0),
            upgrade: canPublish ? nil : PartnerUpgrade(
                requiredTier: "PLATINUM",
                reason: "Публикации в Topka доступны на Platinum",
                ctaTitle: "Перейти на Platinum"
            ),
            plans: []
        )
    }
}

struct PartnerCapabilitySet: Codable {
    let canCreateOffers: Bool
    let canFeatureOffers: Bool
    let canPublishTopka: Bool
    let canViewBasicAnalytics: Bool
    let canViewAdvancedAnalytics: Bool
    let hasPrioritySupport: Bool

    init(
        canCreateOffers: Bool = true,
        canFeatureOffers: Bool = false,
        canPublishTopka: Bool = false,
        canViewBasicAnalytics: Bool = true,
        canViewAdvancedAnalytics: Bool = false,
        hasPrioritySupport: Bool = false
    ) {
        self.canCreateOffers = canCreateOffers
        self.canFeatureOffers = canFeatureOffers
        self.canPublishTopka = canPublishTopka
        self.canViewBasicAnalytics = canViewBasicAnalytics
        self.canViewAdvancedAnalytics = canViewAdvancedAnalytics
        self.hasPrioritySupport = hasPrioritySupport
    }
}

struct PartnerPlanLimits: Codable {
    let offersLimit: Int
    let topkaMonthlyLimit: Int
    let featuredOffersPerMonth: Int
}

struct PartnerUsage: Codable {
    let activeOffers: Int
    let activeEvents: Int
    let topkaPublishedThisMonth: Int
}

struct PartnerUpgrade: Codable {
    let requiredTier: String
    let reason: String
    let ctaTitle: String
}

struct PartnerSubscription: Codable {
    let id: String
    let tier: String
    let status: String
    let startsAt: String
    let endsAt: String
    let daysRemaining: Int?
    let autoRenew: Bool
    let provider: String

    var displayEndsAt: String {
        guard let date = Self.date(from: endsAt) else {
            return endsAt
        }

        let formatter = DateFormatter()
        formatter.locale = L10n.locale
        formatter.dateFormat = "d MMM yyyy"
        return formatter.string(from: date)
    }

    private static func date(from value: String) -> Date? {
        if let date = isoFormatterWithFraction.date(from: value) {
            return date
        }
        return isoFormatter.date(from: value)
    }

    private static let isoFormatterWithFraction: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    private static let isoFormatter = ISO8601DateFormatter()
}

struct PartnerPlan: Codable, Identifiable {
    var id: String { tier }
    let tier: String
    let displayName: String
    let priceMonthly: Double
    let recommended: Bool
    let benefits: [String]
    let capabilities: PartnerCapabilitySet
    let limits: PartnerPlanLimits
}
