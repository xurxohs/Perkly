import Foundation
import Security
import LocalAuthentication
import SwiftUI

final class KeychainHelper {
    static let shared = KeychainHelper()
    private init() {}
    
    func save(_ data: String, forKey key: String) {
        guard let data = data.data(using: .utf8) else { return }
        
        // Delete existing item first
        let deleteQuery: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key
        ]
        SecItemDelete(deleteQuery as CFDictionary)
        
        // Add new item
        let addQuery: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock
        ]
        SecItemAdd(addQuery as CFDictionary, nil)
    }
    
    func read(forKey key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        guard status == errSecSuccess, let data = result as? Data else {
            return nil
        }
        return String(data: data, encoding: .utf8)
    }
    
    func delete(forKey key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key
        ]
        SecItemDelete(query as CFDictionary)
    }
}

@MainActor
final class BiometricLockManager: ObservableObject {
    static let shared = BiometricLockManager()

    @Published private(set) var isEnabled: Bool
    @Published private(set) var isLocked = false
    @Published var errorMessage: String?

    private let enabledKey = "perkly_biometric_lock_enabled"
    private var isAuthenticating = false

    private init() {
        let enabled = UserDefaults.standard.bool(forKey: enabledKey)
        isEnabled = enabled
        isLocked = enabled
    }

    var biometricName: String {
        let context = LAContext()
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: nil) else {
            return L10n.tr("biometric.generic_name")
        }
        switch context.biometryType {
        case .faceID: return "Face ID"
        case .touchID: return "Touch ID"
        case .opticID: return "Optic ID"
        default: return L10n.tr("biometric.generic_name")
        }
    }

    var isAvailable: Bool {
        LAContext().canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: nil)
    }

    func enable() async -> Bool {
        guard await authenticate(
            policy: .deviceOwnerAuthenticationWithBiometrics,
            reason: L10n.tr("biometric.enable_reason")
        ) else { return false }
        isEnabled = true
        isLocked = false
        UserDefaults.standard.set(true, forKey: enabledKey)
        return true
    }

    func disable() {
        isEnabled = false
        isLocked = false
        errorMessage = nil
        UserDefaults.standard.set(false, forKey: enabledKey)
    }

    func lock() {
        guard isEnabled else { return }
        isLocked = true
    }

    func unlock() async {
        guard isEnabled, isLocked else { return }
        if await authenticate(
            policy: .deviceOwnerAuthentication,
            reason: L10n.tr("biometric.unlock_reason")
        ) {
            isLocked = false
        }
    }

    private func authenticate(policy: LAPolicy, reason: String) async -> Bool {
        guard !isAuthenticating else { return false }
        let context = LAContext()
        context.localizedCancelTitle = L10n.tr("common.cancel")
        var evaluationError: NSError?
        guard context.canEvaluatePolicy(policy, error: &evaluationError) else {
            errorMessage = L10n.tr("biometric.unavailable")
            return false
        }

        isAuthenticating = true
        defer { isAuthenticating = false }
        do {
            let success = try await context.evaluatePolicy(
                policy,
                localizedReason: reason
            )
            if success { errorMessage = nil }
            return success
        } catch {
            if let laError = error as? LAError, laError.code == .userCancel {
                return false
            }
            errorMessage = L10n.tr("biometric.authentication_failed")
            return false
        }
    }
}
