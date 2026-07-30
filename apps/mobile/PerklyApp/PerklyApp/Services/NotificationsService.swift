import Foundation

struct NotificationPreferences: Codable, Equatable {
    var purchases: Bool
    var messages: Bool
    var nearby: Bool

    static let enabled = NotificationPreferences(purchases: true, messages: true, nearby: true)
}

final class NotificationsService {
    static let shared = NotificationsService()
    private let api = APIClient.shared
    private let cacheKey = "perkly_notification_preferences"
    private init() {}

    var cachedPreferences: NotificationPreferences {
        guard let data = UserDefaults.standard.data(forKey: cacheKey),
              let preferences = try? JSONDecoder().decode(NotificationPreferences.self, from: data) else {
            return .enabled
        }
        return preferences
    }
    
    func updateDeviceToken(token: String) async throws {
        let _: EmptyResponse = try await api.post("/notifications/device-token", body: ["token": token])
    }

    func loadPreferences() async throws -> NotificationPreferences {
        let preferences: NotificationPreferences = try await api.get("/notifications/preferences")
        cache(preferences)
        return preferences
    }

    func updatePreferences(_ preferences: NotificationPreferences) async throws -> NotificationPreferences {
        let updated: NotificationPreferences = try await api.patch(
            "/notifications/preferences",
            body: [
                "purchases": preferences.purchases,
                "messages": preferences.messages,
                "nearby": preferences.nearby,
            ]
        )
        cache(updated)
        return updated
    }

    func cache(_ preferences: NotificationPreferences) {
        guard let data = try? JSONEncoder().encode(preferences) else { return }
        UserDefaults.standard.set(data, forKey: cacheKey)
    }

    func isEnabled(for userInfo: [AnyHashable: Any], categoryIdentifier: String) -> Bool {
        let preferences = cachedPreferences
        if categoryIdentifier == "PERKLY_SECURITY" || userInfo["notificationType"] as? String == "security" {
            return true
        }
        if categoryIdentifier == "PERKLY_MESSAGE" || userInfo["roomId"] != nil {
            return preferences.messages
        }
        if categoryIdentifier == "PERKLY_NEARBY" {
            return preferences.nearby
        }
        return preferences.purchases
    }
}
