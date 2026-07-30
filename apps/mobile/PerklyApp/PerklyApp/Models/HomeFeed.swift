import Foundation

struct HomeFeedResponse: Codable {
    let userSummary: User?
    let savingsSummary: HomeSavingsSummary?
    let streakStatus: HomeDailyBonusStatus?
    let dailyBonus: HomeDailyBonusStatus?
    let promoBanners: [HomePromoBanner]?
    let priorityActions: [HomePriorityAction]
    let wheelStatus: WheelStatusResponse?
    let unreadChats: HomeUnreadChats?
    let activeTransactions: HomeActiveTransactions?
    let flashDrops: [HomeOfferItem]
    let personalizedOffers: [HomeOfferItem]
    let nearbyOffers: [HomeOfferItem]
    let tierOffers: [HomeOfferItem]
    let trendingOffers: [HomeOfferItem]
    let upcomingEvents: [HomeEventItem]
    let squadProgress: SquadProgress?
    let sellerSummary: HomeSellerSummary?
    let capabilities: HomeCapabilities?
    let trustSummary: HomeTrustSummary?
    let streakMultiplier: HomeStreakMultiplier?
    let dailyMissions: [HomeDailyMission]?
    let lostSavings: HomeLostSavings?
    let weeklyRecap: HomeWeeklyRecap?
    let generatedAt: String?
}

struct HomePriorityAction: Codable, Identifiable {
    let id: String
    let type: String
    let title: String
    let subtitle: String
    let value: String
    let icon: String
    let tint: String
    let destination: String
    let priority: Int
}

struct HomeUnreadChats: Codable {
    let rooms: Int
    let totalUnread: Int
    let latestRoomId: String?
}

struct HomeActiveTransactions: Codable {
    let totalActive: Int
    let paid: Int
    let escrow: Int
    let disputed: Int
    let completed: Int
    let recent: [Transaction]
}

struct HomeSavingsSummary: Codable {
    let totalSaved: Double
    let monthlySaved: Double
    let todayPotentialSavings: Double
    let expiringSavings: Double
    let bestDealSavings: Double
    let savedFromDiscounts: Double
    let savedFromPoints: Double
}

struct HomeDailyBonusStatus: Codable {
    let currentStreak: Int
    let longestStreak: Int
    let canClaimToday: Bool
    let claimedToday: Bool
    let streakAtRisk: Bool?
    let todayReward: HomeDailyBonusReward
    let nextReward: HomeDailyBonusReward
    let weekProgress: [HomeDailyBonusDay]
    let resetAt: String
}

struct HomeDailyBonusReward: Codable {
    let points: Int
    let label: String
}

struct HomeDailyBonusDay: Codable, Identifiable {
    let day: String
    let label: String
    let claimed: Bool
    let reward: HomeDailyBonusReward

    var id: String { day }
}

struct HomePromoBanner: Codable, Identifiable {
    let id: String
    let title: String
    let subtitle: String?
    let imageUrl: String?
    let ctaTitle: String
    let destinationType: String
    let destinationId: String?
    let priority: Int
    let startsAt: String?
    let endsAt: String?
    let badge: String?
    let estimatedSavings: Double
    let backgroundStyle: String?
}

struct HomeOfferItem: Codable, Identifiable {
    let offer: Offer
    let reason: String
    let score: Int
    let estimatedSavings: Double?
    let badges: [HomeOfferBadge]
    let urgencyScore: Int
    let distanceMeters: Double?

    var id: String { offer.id }
}

struct HomeOfferBadge: Codable, Identifiable {
    let text: String
    let style: String

    var id: String { "\(style):\(text)" }

    var offerBadgeStyle: OfferBadge.Style {
        OfferBadge.Style(rawValue: style) ?? .status
    }
}

struct HomeEventItem: Codable, Identifiable {
    let event: Event
    let badges: [HomeOfferBadge]
    let startsAt: String?

    var id: String { event.id }
}

struct HomeSellerSummary: Codable {
    let activeOffers: Int
    let salesToday: Int
    let revenueToday: Double
    let unreadBuyerChats: Int
}

struct HomeCapabilities: Codable {
    let tier: String?
    let planName: String?
    let status: String?
    let isActive: Bool?
    let capabilities: HomeCapabilitySet?
    let usage: HomeCapabilityUsage?
}

struct HomeCapabilitySet: Codable {
    let canCreateOffers: Bool?
    let canFeatureOffers: Bool?
    let canPublishTopka: Bool?
    let canViewBasicAnalytics: Bool?
    let canViewAdvancedAnalytics: Bool?
    let hasPrioritySupport: Bool?
}

struct HomeCapabilityUsage: Codable {
    let activeOffers: Int?
    let activeEvents: Int?
    let topkaPublishedThisMonth: Int?
}

struct HomeTrustSummary: Codable {
    let title: String
    let subtitle: String
    let escrowActive: Bool
    let activeProtectedPurchases: Int
    let disputed: Int
}

struct HomeStreakMultiplier: Codable {
    let currentMultiplier: Double
    let nextMultiplier: Double
    let nextMilestoneDays: Int
    let nextMilestoneMultiplier: Double
    let label: String
    let description: String
}

struct HomeDailyMission: Codable, Identifiable {
    let id: String
    let title: String
    let subtitle: String
    let icon: String
    let tint: String
    let progress: Int
    let goal: Int
    let rewardPoints: Int
    let destination: String
    let priority: Int
    let completed: Bool
    let claimed: Bool
    let claimable: Bool
}

struct HomeLostSavings: Codable {
    let cashValue: Double
    let expiringSavings: Double
    let lostPoints: Int
    let wheelAttempts: Int
    let expiringOffersCount: Int
    let title: String
    let subtitle: String
    let resetAt: String?
}

struct HomeWeeklyRecap: Codable {
    let savedThisWeek: Double
    let purchasesThisWeek: Int
    let bonusesClaimed: Int
    let wheelSpins: Int
    let offerViews: Int
    let streakDays: Int
    let topCategory: String?
    let message: String
}

struct HomeDailyBonusClaimResponse: Codable {
    let success: Bool
    let message: String
    let reward: HomeDailyBonusReward
    let status: HomeDailyBonusStatus
}

struct HomeMissionClaimResponse: Codable {
    let success: Bool
    let message: String
    let rewardPoints: Int
    let missionId: String
    let user: User
    let missions: [HomeDailyMission]
}
