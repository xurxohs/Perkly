// Центральное состояние авторизации iOS.
// Восстанавливает сессию, хранит текущего пользователя и синхронизирует данные с Widget/Keychain.
import Foundation
import SwiftUI

@MainActor
final class AuthViewModel: ObservableObject {
    @Published var user: User? {
        didSet {
            if let user, let points = user.rewardPoints {
                let suite = UserDefaults(suiteName: "group.com.perkly.app")
                let streak = suite?.integer(forKey: "perkly_streak") ?? 0
                let claimed = suite?.bool(forKey: "perkly_claimed_today") ?? false
                WidgetDataManager.shared.updateWidgetData(balance: points, streak: streak, claimedToday: claimed)
            }
            if let user,
               let data = try? JSONEncoder().encode(user),
               let json = String(data: data, encoding: .utf8) {
                KeychainHelper.shared.save(json, forKey: Constants.keychainCachedUserKey)
            }
        }
    }
    @Published var isAuthenticated = false
    @Published var isRestoringSession = true
    @Published var isLoading = false
    @Published var isLinkingTelegram = false
    @Published var telegramLinkSucceeded = false
    @Published private(set) var telegramLoginURL: URL?
    @Published private(set) var telegramWaitSeconds = 0
    @Published var error: String?
    
    // Login form
    @Published var loginEmail = ""
    @Published var loginPassword = ""
    
    // Register form
    @Published var registerEmail = ""
    @Published var registerPassword = ""
    @Published var registerName = ""
    
    private let authService = AuthService.shared
    private var telegramLoginAttemptID = UUID()
    
    init() {
        Task { await restoreSession() }
        
        NotificationCenter.default.addObserver(forName: NSNotification.Name("APNSTokenReceived"), object: nil, queue: .main) { [weak self] _ in
            Task { @MainActor [weak self] in
                guard let self, self.isAuthenticated else { return }
                await self.sendDeviceTokenIfNeeded()
            }
        }
    }
    
    func restoreSession() async {
        guard KeychainHelper.shared.read(forKey: Constants.keychainTokenKey) != nil else {
            isRestoringSession = false
            return
        }
        
        do {
            let user = try await authService.getMe()
            self.user = user
            self.isAuthenticated = true
            await sendDeviceTokenIfNeeded()
        } catch APIError.unauthorized {
            KeychainHelper.shared.delete(forKey: Constants.keychainTokenKey)
            KeychainHelper.shared.delete(forKey: Constants.keychainCachedUserKey)
            self.user = nil
            self.isAuthenticated = false
        } catch {
            // Keep the token on transient failures such as networking issues.
            if let cachedUser = cachedUserFromKeychain() {
                self.user = cachedUser
                self.isAuthenticated = true
            } else {
                self.user = nil
                self.isAuthenticated = false
            }
        }
        isRestoringSession = false
    }
    
    func login() async {
        guard !loginEmail.isEmpty, !loginPassword.isEmpty else {
            self.error = L10n.tr("Заполните все поля")
            return
        }
        
        error = nil
        isLoading = true
        
        do {
            let res = try await authService.login(email: loginEmail, password: loginPassword)
            KeychainHelper.shared.save(res.access_token, forKey: Constants.keychainTokenKey)
            
            let profile = try await authService.getMe()
            self.user = profile
            self.isAuthenticated = true
            await sendDeviceTokenIfNeeded()
            
            // Clear form
            loginEmail = ""
            loginPassword = ""
        } catch APIError.unauthorized {
            self.error = L10n.tr("Неверный email или пароль")
        } catch APIError.networkError {
            self.error = L10n.tr("Не удалось подключиться. Проверьте интернет и попробуйте снова.")
        } catch {
            self.error = error.localizedDescription
        }
        
        isLoading = false
    }
    
    func register() async {
        guard !registerEmail.isEmpty, !registerPassword.isEmpty else {
            self.error = L10n.tr("Заполните все поля")
            return
        }
        
        error = nil
        isLoading = true
        
        do {
            let res = try await authService.register(
                email: registerEmail,
                password: registerPassword,
                displayName: registerName.isEmpty ? nil : registerName
            )
            KeychainHelper.shared.save(res.access_token, forKey: Constants.keychainTokenKey)
            
            let profile = try await authService.getMe()
            self.user = profile
            self.isAuthenticated = true
            await sendDeviceTokenIfNeeded()
            
            // Clear form
            registerEmail = ""
            registerPassword = ""
            registerName = ""
        } catch {
            self.error = error.localizedDescription
        }
        
        isLoading = false
    }
    
    func logout() {
        cancelTelegramLogin()
        let token = KeychainHelper.shared.read(forKey: Constants.keychainTokenKey)
        KeychainHelper.shared.delete(forKey: Constants.keychainTokenKey)
        KeychainHelper.shared.delete(forKey: Constants.keychainCachedUserKey)
        user = nil
        isAuthenticated = false
        BiometricLockManager.shared.disable()
        Task { await DiskResponseCache.shared.clear() }
        if let token {
            Task { try? await authService.revokeCurrentSession(using: token) }
        }
    }

    private func cachedUserFromKeychain() -> User? {
        guard let json = KeychainHelper.shared.read(forKey: Constants.keychainCachedUserKey),
              let data = json.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(User.self, from: data)
    }
    
    func refreshUser() async {
        do {
            let profile = try await UsersService.shared.getMe()
            self.user = profile
        } catch {}
    }
    
    // MARK: - Telegram Login

    func loginWithApple(identityToken: String, nonce: String, displayName: String?) async {
        isLoading = true
        error = nil
        defer { isLoading = false }
        do {
            let response = try await authService.loginWithApple(
                identityToken: identityToken,
                nonce: nonce,
                displayName: displayName
            )
            KeychainHelper.shared.save(response.access_token, forKey: Constants.keychainTokenKey)
            user = try await authService.getMe()
            isAuthenticated = true
            await sendDeviceTokenIfNeeded()
        } catch is CancellationError {
            return
        } catch {
            self.error = error.localizedDescription
        }
    }
    
    func loginWithTelegram() async {
        guard !isLoading else { return }
        let attemptID = UUID()
        telegramLoginAttemptID = attemptID
        isLoading = true
        error = nil
        telegramWaitSeconds = 120
        
        do {
            let res = try await authService.initTelegramAuth()
            guard let url = URL(string: res.url) else {
                throw APIError.invalidURL
            }
            guard telegramLoginAttemptID == attemptID else { return }
            telegramLoginURL = url

            #if os(iOS)
            let opened = await UIApplication.shared.open(url)
            guard opened else {
                throw APIError.serverError(
                    400,
                    L10n.tr("Не удалось открыть Telegram. Откройте приложение и попробуйте снова.")
                )
            }
            #endif

            // The same Telegram flow signs in existing users and creates new ones.
            try await pollTelegramAuth(token: res.token, attemptID: attemptID)
        } catch is CancellationError {
            finishTelegramLogin(attemptID: attemptID)
        } catch {
            guard telegramLoginAttemptID == attemptID else { return }
            self.error = friendlyTelegramError(error)
            finishTelegramLogin(attemptID: attemptID, keepURL: true)
        }
    }

    func reopenTelegramLogin() {
        guard let telegramLoginURL else { return }
        #if os(iOS)
        UIApplication.shared.open(telegramLoginURL)
        #endif
    }

    func cancelTelegramLogin() {
        telegramLoginAttemptID = UUID()
        isLoading = false
        telegramWaitSeconds = 0
        telegramLoginURL = nil
        error = nil
    }

    func linkTelegramAccount() async {
        guard isAuthenticated, !isLinkingTelegram else { return }
        isLinkingTelegram = true
        telegramLinkSucceeded = false
        error = nil
        defer { isLinkingTelegram = false }

        do {
            let response = try await authService.initTelegramLink()
            guard let url = URL(string: response.url) else {
                throw APIError.invalidURL
            }

            #if os(iOS)
            await MainActor.run {
                UIApplication.shared.open(url)
            }
            #endif

            try await pollTelegramLink(token: response.token)
            user = try await authService.getMe()
            telegramLinkSucceeded = true
            HapticManager.shared.playSuccess()
        } catch is CancellationError {
            return
        } catch {
            self.error = error.localizedDescription
            HapticManager.shared.playError()
        }
    }

    func loginWithTelegramMiniApp(initData: String) async {
        isLoading = true
        error = nil
        do {
            let res = try await authService.loginWithTelegramMiniApp(initData: initData)
            KeychainHelper.shared.save(res.access_token, forKey: Constants.keychainTokenKey)
            
            let profile = try await authService.getMe()
            self.user = profile
            self.isAuthenticated = true
            await sendDeviceTokenIfNeeded()
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func loginWithTelegramWidget(authData: [String: Any]) async {
        isLoading = true
        error = nil
        do {
            let res = try await authService.loginWithTelegram(authData: authData)
            KeychainHelper.shared.save(res.access_token, forKey: Constants.keychainTokenKey)
            
            let profile = try await authService.getMe()
            self.user = profile
            self.isAuthenticated = true
            await sendDeviceTokenIfNeeded()
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
    
    private func pollTelegramAuth(token: String, attemptID: UUID) async throws {
        var attempts = 0
        let maxAttempts = 60 // 2 minutes (2s * 60)
        
        while attempts < maxAttempts {
            guard telegramLoginAttemptID == attemptID else {
                throw CancellationError()
            }
            attempts += 1
            
            // Wait for 2 seconds
            try await Task.sleep(nanoseconds: 2 * 1_000_000_000)
            guard telegramLoginAttemptID == attemptID else {
                throw CancellationError()
            }
            telegramWaitSeconds = max(0, 120 - attempts * 2)
            
            do {
                let poll = try await authService.pollTelegramAuth(token: token)
                
                if poll.status == "ok", let access_token = poll.access_token {
                    KeychainHelper.shared.save(access_token, forKey: Constants.keychainTokenKey)
                    let profile = try await authService.getMe()
                    self.user = profile
                    self.isAuthenticated = true
                    await sendDeviceTokenIfNeeded()
                    finishTelegramLogin(attemptID: attemptID)
                    return
                } else if poll.status == "error" {
                    self.error = poll.message ?? L10n.tr("Ошибка авторизации через Telegram")
                    finishTelegramLogin(attemptID: attemptID, keepURL: true)
                    return
                } else if poll.status == "expired" {
                    self.error = L10n.tr("Ссылка устарела. Нажмите «Попробовать снова», чтобы получить новую.")
                    finishTelegramLogin(attemptID: attemptID)
                    return
                }
            } catch is CancellationError {
                throw CancellationError()
            } catch {
                // Ignore transient errors during polling (network hiccups)
                if attempts == maxAttempts {
                    self.error = friendlyTelegramError(error)
                    finishTelegramLogin(attemptID: attemptID, keepURL: true)
                }
            }
        }
        
        guard telegramLoginAttemptID == attemptID else { return }
        self.error = L10n.tr("Время ожидания истекло. Подтвердите вход в Telegram и попробуйте ещё раз.")
        finishTelegramLogin(attemptID: attemptID)
    }

    private func finishTelegramLogin(attemptID: UUID, keepURL: Bool = false) {
        guard telegramLoginAttemptID == attemptID else { return }
        isLoading = false
        telegramWaitSeconds = 0
        if !keepURL {
            telegramLoginURL = nil
        }
    }

    private func friendlyTelegramError(_ error: Error) -> String {
        switch error {
        case APIError.networkError:
            return L10n.tr("Нет связи с Perkly. Проверьте интернет и попробуйте снова.")
        case APIError.timeout:
            return L10n.tr("Telegram отвечает слишком долго. Попробуйте ещё раз.")
        default:
            return error.localizedDescription
        }
    }

    private func pollTelegramLink(token: String) async throws {
        for _ in 0..<60 {
            try await Task.sleep(for: .seconds(2))
            let poll = try await authService.pollTelegramLink(token: token)

            switch poll.status {
            case "linked":
                return
            case "error":
                throw APIError.serverError(
                    400,
                    poll.message ?? L10n.tr("Не удалось подключить Telegram")
                )
            case "expired":
                throw APIError.serverError(410, L10n.tr("Сессия входа истекла"))
            default:
                continue
            }
        }
        throw APIError.timeout
    }
    
    private func sendDeviceTokenIfNeeded() async {
        guard let token = UserDefaults.standard.string(forKey: "apns_device_token") else { return }
        do {
            try await NotificationsService.shared.updateDeviceToken(token: token)
        } catch {
            #if DEBUG
            print("Failed to register push token")
            #endif
        }
    }
}
