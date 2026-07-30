import Foundation

struct AuthResponse: Codable {
    let access_token: String
}

struct TelegramInitResponse: Codable {
    let token: String
    let url: String
}

struct TelegramPollResponse: Codable {
    let status: String
    let access_token: String?
    let message: String?
}

struct AuthSession: Codable, Identifiable {
    let id: String
    let deviceName: String?
    let userAgent: String?
    let createdAt: String
    let lastUsedAt: String
    let expiresAt: String
    let isCurrent: Bool
}

final class AuthService {
    static let shared = AuthService()
    private let api = APIClient.shared
    private init() {}
    
    func login(email: String, password: String) async throws -> AuthResponse {
        try await api.post("/auth/login", body: [
            "email": email,
            "password": password
        ])
    }
    
    func register(email: String, password: String, displayName: String?) async throws -> AuthResponse {
        var body: [String: Any] = [
            "email": email,
            "password": password
        ]
        if let displayName, !displayName.isEmpty {
            body["displayName"] = displayName
        }
        // Backend register endpoint returns raw User, not AuthResponse.
        // So we register first, then login to get the access_token.
        let _: User = try await api.post("/auth/register", body: body)
        return try await login(email: email, password: password)
    }
    
    func getMe() async throws -> User {
        // /auth/me is a stub; real profile is at /users/me
        try await api.get("/users/me")
    }

    func listSessions() async throws -> [AuthSession] {
        try await api.get("/auth/sessions")
    }

    func revokeSession(id: String) async throws {
        let _: EmptyResponse = try await api.delete("/auth/sessions/\(id)")
    }

    func revokeOtherSessions() async throws {
        let _: EmptyResponse = try await api.delete("/auth/sessions/others")
    }

    func revokeCurrentSession(using token: String) async throws {
        let _: EmptyResponse = try await api.request(
            endpoint: "/auth/sessions/current",
            method: "DELETE",
            headers: ["Authorization": "Bearer \(token)"]
        )
    }

    func requestPasswordReset(email: String) async throws {
        let _: EmptyResponse = try await api.post(
            "/auth/password/forgot",
            body: ["email": email]
        )
    }

    func resetPassword(email: String, code: String, newPassword: String) async throws {
        let _: EmptyResponse = try await api.post(
            "/auth/password/reset",
            body: ["email": email, "code": code, "newPassword": newPassword]
        )
    }

    func loginWithApple(identityToken: String, nonce: String, displayName: String?) async throws -> AuthResponse {
        var body: [String: Any] = [
            "identityToken": identityToken,
            "nonce": nonce,
        ]
        if let displayName, !displayName.isEmpty {
            body["displayName"] = displayName
        }
        return try await api.post("/auth/apple", body: body)
    }
    
    // MARK: - Telegram Auth
    
    func initTelegramAuth() async throws -> TelegramInitResponse {
        try await api.get("/auth/telegram-init")
    }
    
    func pollTelegramAuth(token: String) async throws -> TelegramPollResponse {
        try await api.get("/auth/telegram-poll", queryItems: [
            URLQueryItem(name: "token", value: token)
        ])
    }

    func initTelegramLink() async throws -> TelegramInitResponse {
        try await api.post("/auth/telegram-link/init")
    }

    func pollTelegramLink(token: String) async throws -> TelegramPollResponse {
        try await api.get("/auth/telegram-link/poll", queryItems: [
            URLQueryItem(name: "token", value: token)
        ])
    }

    func loginWithTelegram(authData: [String: Any]) async throws -> AuthResponse {
        try await api.post("/auth/telegram", body: authData)
    }

    func loginWithTelegramMiniApp(initData: String) async throws -> AuthResponse {
        try await api.post("/auth/telegram-miniapp", body: ["initData": initData])
    }
}
