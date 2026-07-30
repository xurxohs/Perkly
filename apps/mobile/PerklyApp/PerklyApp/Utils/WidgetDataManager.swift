import Foundation
import WidgetKit

struct WidgetDataManager {
    static let shared = WidgetDataManager()
    private let suiteName = "group.com.perkly.app"
    
    func updateWidgetData(balance: Int, streak: Int, claimedToday: Bool) {
        guard let defaults = UserDefaults(suiteName: suiteName) else {
            #if DEBUG
            print("WidgetDataManager: Failed to initialize shared defaults")
            #endif
            return
        }
        
        defaults.set(balance, forKey: "perkly_points")
        defaults.set(streak, forKey: "perkly_streak")
        defaults.set(claimedToday, forKey: "perkly_claimed_today")
        defaults.synchronize()
        
        WidgetCenter.shared.reloadAllTimelines()
    }
}
