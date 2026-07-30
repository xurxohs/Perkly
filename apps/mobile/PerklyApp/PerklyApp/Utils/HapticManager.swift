import Foundation
import UIKit
import AudioToolbox

final class HapticManager {
    static let shared = HapticManager()

    private let notificationGenerator = UINotificationFeedbackGenerator()
    private let selectionGenerator = UISelectionFeedbackGenerator()
    private let lightImpactGenerator = UIImpactFeedbackGenerator(style: .light)
    private let softImpactGenerator = UIImpactFeedbackGenerator(style: .soft)
    private let rigidImpactGenerator = UIImpactFeedbackGenerator(style: .rigid)

    private init() {}

    func playPurchaseSuccess() {
        performOnMain {
            self.softImpactGenerator.prepare()
            self.notificationGenerator.prepare()

            self.softImpactGenerator.impactOccurred(intensity: 0.9)
            self.notificationGenerator.notificationOccurred(.success)
            AudioServicesPlaySystemSound(1407)

            self.softImpactGenerator.prepare()
            self.notificationGenerator.prepare()
        }
    }

    func playSuccess() {
        performOnMain {
            self.notificationGenerator.prepare()
            self.notificationGenerator.notificationOccurred(.success)
            self.notificationGenerator.prepare()
        }
    }

    func playPurchaseError() {
        playError()
    }

    func playError() {
        performOnMain {
            self.rigidImpactGenerator.prepare()
            self.notificationGenerator.prepare()

            self.rigidImpactGenerator.impactOccurred(intensity: 0.75)
            self.notificationGenerator.notificationOccurred(.error)

            self.rigidImpactGenerator.prepare()
            self.notificationGenerator.prepare()
        }
    }

    func playTabSwitch() {
        playSelection()
    }

    func playMapMarkerSelection() {
        performOnMain {
            self.selectionGenerator.prepare()
            self.lightImpactGenerator.prepare()

            self.selectionGenerator.selectionChanged()
            self.lightImpactGenerator.impactOccurred(intensity: 0.65)

            self.selectionGenerator.prepare()
            self.lightImpactGenerator.prepare()
        }
    }

    func playSelection() {
        performOnMain {
            self.selectionGenerator.prepare()
            self.selectionGenerator.selectionChanged()
            self.selectionGenerator.prepare()
        }
    }

    func lightImpact() {
        performOnMain {
            self.lightImpactGenerator.prepare()
            self.lightImpactGenerator.impactOccurred(intensity: 0.6)
            self.lightImpactGenerator.prepare()
        }
    }

    func prepareQRCodeReveal() {
        performOnMain {
            self.softImpactGenerator.prepare()
            self.notificationGenerator.prepare()
        }
    }

    func playQRCodeScanTick(intensity: CGFloat) {
        performOnMain {
            self.softImpactGenerator.impactOccurred(
                intensity: min(max(intensity, 0.1), 0.72)
            )
            self.softImpactGenerator.prepare()
        }
    }

    private func performOnMain(_ action: @escaping () -> Void) {
        if Thread.isMainThread {
            action()
        } else {
            DispatchQueue.main.async(execute: action)
        }
    }
}
