import UIKit
import SwiftUI
import UserNotifications

class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
        // Register for remote notifications
        let center = UNUserNotificationCenter.current()
        center.delegate = self
        registerNotificationCategories(on: center)
        application.registerForRemoteNotifications()
        return true
    }
    
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        let tokenParts = deviceToken.map { data in String(format: "%02.2hhx", data) }
        let token = tokenParts.joined()
        
        // Save the token globally or send it immediately if authenticated
        UserDefaults.standard.set(token, forKey: "apns_device_token")
        
        // Post notification so AuthViewModel can pick it up
        NotificationCenter.default.post(name: NSNotification.Name("APNSTokenReceived"), object: token)
    }
    
    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        #if DEBUG
        print("Failed to register for remote notifications")
        #endif
    }
    
    // MARK: - UNUserNotificationCenterDelegate
    
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        guard NotificationsService.shared.isEnabled(
            for: notification.request.content.userInfo,
            categoryIdentifier: notification.request.content.categoryIdentifier
        ) else {
            completionHandler([])
            return
        }
        // Show banner and play sound even if app is in foreground
        completionHandler([.banner, .sound, .list])
    }
    
    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        let userInfo = response.notification.request.content.userInfo
        
        // Handle deep links (e.g. to a specific offer or chat)
        if let roomId = userInfo["roomId"] as? String {
            DispatchQueue.main.async {
                NotificationCenter.default.post(name: NSNotification.Name("PerklyChatDeepLink"), object: roomId)
            }
        } else if let transactionId = userInfo["transactionId"] as? String {
            DispatchQueue.main.async {
                NotificationCenter.default.post(name: NSNotification.Name("PerklyPurchasesDeepLink"), object: transactionId)
            }
        } else if let eventId = userInfo["eventId"] as? String {
            DispatchQueue.main.async {
                NotificationCenter.default.post(name: NSNotification.Name("PerklyEventDeepLink"), object: eventId)
            }
        } else if let depositId = userInfo["depositId"] as? String {
            DispatchQueue.main.async {
                NotificationCenter.default.post(name: NSNotification.Name("PerklyWalletDeepLink"), object: depositId)
            }
        } else if let offerId = userInfo["offerId"] as? String {
            DispatchQueue.main.async {
                NotificationCenter.default.post(name: NSNotification.Name("PerklyDeepLink"), object: offerId)
            }
        } else if userInfo["notificationType"] as? String == "security" {
            DispatchQueue.main.async {
                NotificationCenter.default.post(name: NSNotification.Name("PerklySecurityDeepLink"), object: nil)
            }
        } else if userInfo["notificationType"] as? String == "purchases" {
            DispatchQueue.main.async {
                NotificationCenter.default.post(name: NSNotification.Name("PerklyPurchasesDeepLink"), object: nil)
            }
        }
        
        completionHandler()
    }

    private func registerNotificationCategories(on center: UNUserNotificationCenter) {
        let openAction = UNNotificationAction(
            identifier: "PERKLY_OPEN",
            title: "Открыть",
            options: [.foreground]
        )
        let purchase = UNNotificationCategory(
            identifier: "PERKLY_PURCHASE",
            actions: [openAction],
            intentIdentifiers: []
        )
        let message = UNNotificationCategory(
            identifier: "PERKLY_MESSAGE",
            actions: [openAction],
            intentIdentifiers: []
        )
        let nearby = UNNotificationCategory(
            identifier: "PERKLY_NEARBY",
            actions: [openAction],
            intentIdentifiers: []
        )
        let security = UNNotificationCategory(
            identifier: "PERKLY_SECURITY",
            actions: [openAction],
            intentIdentifiers: []
        )
        center.setNotificationCategories([purchase, message, nearby, security])
    }
}
