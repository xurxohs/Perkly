import Foundation

struct Squad: Codable, Identifiable {
    let id: String
    let name: String
    let inviteCode: String
    let monthlyGoal: Double?
    let rewardTriggeredDate: String?
    let createdAt: String?
    let members: [User]?
}

// Response from GET /squads/me — matches backend SquadsService.getSquadProgress()
struct SquadProgress: Codable {
    let squadId: String
    let name: String
    let inviteCode: String
    let members: [SquadMember]
    let monthlyGoal: Double
    let currentSpending: Double
    let isGoalReached: Bool
    let rewardTriggeredDate: String?
    
    var progressPercent: Double {
        guard monthlyGoal > 0 else { return 0 }
        return min(currentSpending / monthlyGoal, 1.0)
    }
}

struct SquadMember: Codable, Identifiable {
    let id: String
    let displayName: String?
    let avatarUrl: String?
}
