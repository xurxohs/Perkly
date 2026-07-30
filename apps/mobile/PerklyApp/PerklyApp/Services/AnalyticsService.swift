import Foundation

final class AnalyticsService {
    static let shared = AnalyticsService()
    private let api = APIClient.shared
    private let defaults = UserDefaults.standard
    private let consentKey = "perkly_analytics_consent_v1"
    private let sessionKey = "perkly_session_id"

    var isAnalyticsConsentGranted: Bool {
        defaults.bool(forKey: consentKey)
    }

    private init() {
        // Old builds created a session before asking. Treat the absence of the
        // explicit consent flag as a refusal and remove that legacy identifier.
        if !isAnalyticsConsentGranted {
            defaults.removeObject(forKey: sessionKey)
        }
    }

    func setAnalyticsConsent(_ granted: Bool) {
        defaults.set(granted, forKey: consentKey)
        if !granted {
            defaults.removeObject(forKey: sessionKey)
        }
    }

    private func consentedSessionId() -> String? {
        guard isAnalyticsConsentGranted else { return nil }
        if let existing = defaults.string(forKey: sessionKey) {
            return existing
        }

        let newId = UUID().uuidString
        defaults.set(newId, forKey: sessionKey)
        return newId
    }
    
    /// Track an analytics event
    /// - Parameters:
    ///   - eventType: The type/name of the event (e.g., "offer_view", "app_open")
    ///   - offerId: Optional related offer ID
    ///   - metadata: Optional JSON string with extra details
    func trackEvent(eventType: String, offerId: String? = nil, metadata: String? = nil) {
        guard isAnalyticsConsentGranted else { return }

        // Fire and forget - wrap in unstructured task to not block caller
        Task {
            guard let sessionId = consentedSessionId() else { return }

            var body: [String: Any] = ["eventType": eventType]
            if let offerId {
                body["offerId"] = offerId
            }
            if let metadata {
                body["metadata"] = metadata
            }
            
            do {
                // Post to API without expecting a decoded return value since we don't care about the response body
                let _: EmptyResponse = try await api.request(
                    endpoint: "/analytics/events",
                    method: "POST",
                    body: body,
                    headers: [
                        "X-Session-Id": sessionId,
                        "X-Analytics-Consent": "granted"
                    ]
                )
            } catch {
                #if DEBUG
                print("Analytics tracking failed for \(eventType)")
                #endif
            }
        }
    }

    func trackEvent(eventType: String, offerId: String? = nil, metadata: [String: Any]) {
        guard JSONSerialization.isValidJSONObject(metadata),
              let data = try? JSONSerialization.data(withJSONObject: metadata, options: [.sortedKeys]),
              let json = String(data: data, encoding: .utf8) else {
            trackEvent(eventType: eventType, offerId: offerId, metadata: nil)
            return
        }

        trackEvent(eventType: eventType, offerId: offerId, metadata: json)
    }
}

// Helper struct for empty response
struct EmptyResponse: Decodable {}
