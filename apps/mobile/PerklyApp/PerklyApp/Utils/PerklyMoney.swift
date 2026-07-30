import Foundation

enum PerklyMoney {
    static let rewardPointValueUZS: Double = 120

    static func rewardPointsValue(_ points: Int) -> Double {
        Double(max(0, points)) * rewardPointValueUZS
    }
}
