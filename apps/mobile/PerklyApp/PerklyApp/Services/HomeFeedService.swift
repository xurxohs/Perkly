import CoreLocation
import Foundation

final class HomeFeedService {
    static let shared = HomeFeedService()
    private let api = APIClient.shared
    private init() {}

    func getFeed(location: CLLocation? = nil, radiusKm: Double = 5) async throws -> HomeFeedResponse {
        try await api.get("/home/feed", queryItems: feedQuery(location: location, radiusKm: radiusKm))
    }

    func getFeedCached(location: CLLocation? = nil, radiusKm: Double = 5, userId: String) async throws -> CachedResponse<HomeFeedResponse> {
        let queryItems = feedQuery(location: location, radiusKm: radiusKm)
        let locationKey = location.map {
            String(format: "%.2f:%.2f", $0.coordinate.latitude, $0.coordinate.longitude)
        } ?? "none"
        return try await DiskResponseCache.shared.fetch(key: "home:\(userId):\(locationKey):\(radiusKm)") {
            try await self.api.get("/home/feed", queryItems: queryItems)
        }
    }

    private func feedQuery(location: CLLocation?, radiusKm: Double) -> [URLQueryItem] {
        var queryItems: [URLQueryItem] = []
        if let location {
            queryItems.append(.init(name: "lat", value: "\(location.coordinate.latitude)"))
            queryItems.append(.init(name: "lng", value: "\(location.coordinate.longitude)"))
            queryItems.append(.init(name: "radiusKm", value: "\(radiusKm)"))
        }
        return queryItems
    }

    func claimDailyBonus() async throws -> HomeDailyBonusClaimResponse {
        try await api.post("/users/me/daily-bonus/claim")
    }

    func claimDailyMission(id: String) async throws -> HomeMissionClaimResponse {
        try await api.post("/users/me/missions/\(id)/claim")
    }
}
