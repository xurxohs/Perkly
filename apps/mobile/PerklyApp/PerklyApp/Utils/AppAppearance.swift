import SwiftUI

enum PerklyTheme: String, CaseIterable, Identifiable {
    case system
    case light
    case dark

    var id: String { rawValue }

    var title: String {
        switch self {
        case .system: return L10n.tr("Системная")
        case .light: return L10n.tr("Светлая")
        case .dark: return L10n.tr("Тёмная")
        }
    }

    var icon: String {
        switch self {
        case .system: return "circle.lefthalf.filled"
        case .light: return "sun.max.fill"
        case .dark: return "moon.stars.fill"
        }
    }

    var colorScheme: ColorScheme? {
        switch self {
        case .system: return nil
        case .light: return .light
        case .dark: return .dark
        }
    }
}

enum PerklyLanguage: String, CaseIterable, Identifiable {
    case system
    case ru
    case uz

    var id: String { rawValue }

    var title: String {
        switch self {
        case .system: return L10n.tr("Как на iPhone")
        case .ru: return "Русский"
        case .uz: return "O‘zbekcha"
        }
    }

    var locale: Locale {
        switch self {
        case .system: return .autoupdatingCurrent
        case .ru: return Locale(identifier: "ru")
        case .uz: return Locale(identifier: "uz")
        }
    }
}

@MainActor
final class AppAppearance: ObservableObject {
    static let shared = AppAppearance()
    nonisolated static let themeKey = "perkly.appearance.theme"
    nonisolated static let languageKey = "perkly.appearance.language"

    @Published var theme: PerklyTheme {
        didSet { UserDefaults.standard.set(theme.rawValue, forKey: Self.themeKey) }
    }

    @Published var language: PerklyLanguage {
        didSet {
            UserDefaults.standard.set(language.rawValue, forKey: Self.languageKey)
            guard language != .system else { return }
            let value = language.rawValue
            Task {
                _ = try? await UsersService.shared.updateProfile(preferredLanguage: value)
            }
        }
    }

    private init() {
        let defaults = UserDefaults.standard
        theme = PerklyTheme(rawValue: defaults.string(forKey: Self.themeKey) ?? "") ?? .system
        language = PerklyLanguage(rawValue: defaults.string(forKey: Self.languageKey) ?? "") ?? .system
    }

    nonisolated static var selectedLanguage: PerklyLanguage {
        PerklyLanguage(
            rawValue: UserDefaults.standard.string(forKey: languageKey) ?? ""
        ) ?? .system
    }

    func syncLanguageFromAccount() async {
        guard let user = try? await UsersService.shared.getMe(),
              let value = user.preferredLanguage,
              let remoteLanguage = PerklyLanguage(rawValue: value),
              remoteLanguage != language else { return }
        language = remoteLanguage
    }
}
