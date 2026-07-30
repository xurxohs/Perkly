import Foundation
import SwiftUI

extension Notification.Name {
    static let perklyWheelRewardClaimed = Notification.Name("PerklyWheelRewardClaimed")
}

@MainActor
final class WheelViewModel: ObservableObject {
    @Published var isSpinning = false
    @Published var rotation: Double = 0
    @Published var result: String?
    @Published var showResult = false
    @Published var claimError: String?
    @Published var claimMessage: String?
    @Published var claimedPoints: Int?
    @Published var spinsRemaining = 0
    @Published var dailyLimit = 3
    @Published var resetAt: String?
    @Published var lastWinIndex: Int?

    let spinDuration: Double = 4.6
    
    private let service = WheelService.shared
    
    let segments = [
        ("25 Points", Color.perklyOrange),
        ("50 Points", Color.perklyPurple),
        ("75 Points", Color.perklyPink),
        ("100 Points", Color.perklyGreen),
        ("150 Points", Color.perklyCyan),
        ("200 Points", Color.perklyGold),
        ("300 Points", Color.perklyRed),
        ("Попробуйте ещё", Color.perklyPurple.opacity(0.8)),
    ]
    
    var canSpin: Bool {
        spinsRemaining > 0 && !isSpinning
    }

    func loadStatus(clearError: Bool = true) async {
        if clearError {
            claimError = nil
        }

        do {
            let status = try await service.status()
            applyStatus(status)
        } catch {
            claimError = error.localizedDescription
        }
    }

    func resetStatusForGuest() {
        result = nil
        showResult = false
        claimError = nil
        claimMessage = nil
        claimedPoints = nil
        spinsRemaining = 0
        dailyLimit = 3
        resetAt = nil
    }

    func spin() async {
        guard canSpin else { return }

        isSpinning = true
        showResult = false
        claimError = nil
        claimMessage = nil
        claimedPoints = nil
        
        AnalyticsService.shared.trackEvent(eventType: "wheel_spin_start")

        do {
            let response = try await service.spin()
            applyStatus(response)

            let rewardLabel = response.reward ?? segments[0].0
            let winIndex = segments.firstIndex(where: { $0.0 == rewardLabel }) ?? 0
            let segmentAngle = 360.0 / Double(segments.count)
            let targetAngle = nextTargetRotation(for: winIndex, segmentAngle: segmentAngle)
            lastWinIndex = winIndex
            HapticManager.shared.lightImpact()

            withAnimation(.timingCurve(0.12, 0.86, 0.18, 1.0, duration: spinDuration)) {
                rotation += targetAngle
            }

            DispatchQueue.main.asyncAfter(deadline: .now() + spinDuration + 0.18) { [weak self] in
                guard let self else { return }
                self.result = rewardLabel
                self.showResult = true
                self.isSpinning = false
                self.claimMessage = response.message
                self.claimedPoints = response.points
                NotificationCenter.default.post(name: .perklyWheelRewardClaimed, object: nil)
                if response.points ?? 0 > 0 {
                    HapticManager.shared.playSuccess()
                } else {
                    HapticManager.shared.playSelection()
                }

                AnalyticsService.shared.trackEvent(
                    eventType: "wheel_spin_result",
                    metadata: "reward: \(rewardLabel), points: \(response.points ?? 0)"
                )
            }
        } catch {
            claimError = error.localizedDescription
            isSpinning = false
            await loadStatus(clearError: false)
        }
    }

    func claimReward() async {
        guard let rewardLabel = result else { return }
        
        do {
            let _ = try await service.claim(reward: rewardLabel)
            // Successfully claimed
        } catch {
            claimError = error.localizedDescription
        }
    }

    private func applyStatus(_ status: WheelStatusResponse) {
        spinsRemaining = status.spinsRemaining
        dailyLimit = status.dailyLimit
        resetAt = status.resetAt
    }

    private func applyStatus(_ response: WheelSpinResponse) {
        spinsRemaining = response.spinsRemaining
        dailyLimit = response.dailyLimit
        resetAt = response.resetAt
    }

    private func nextTargetRotation(for winIndex: Int, segmentAngle: Double) -> Double {
        let current = rotation.truncatingRemainder(dividingBy: 360)
        let desired = 360 - (Double(winIndex) * segmentAngle + segmentAngle / 2)
        var delta = desired - current
        while delta < 0 { delta += 360 }
        return Double.random(in: 5.0...7.0) * 360 + delta
    }
}
