import Foundation

/// Centralized access for strings that cannot be localized automatically by SwiftUI,
/// such as model status labels, service errors and notification content.
enum L10n {
    static var locale: Locale {
        AppAppearance.selectedLanguage.locale
    }

    static func tr(_ key: String) -> String {
        localizationBundle.localizedString(
            forKey: key,
            value: key,
            table: "Localizable"
        )
    }

    private static var localizationBundle: Bundle {
        let selected = AppAppearance.selectedLanguage
        guard selected != .system,
              let path = Bundle.main.path(forResource: selected.rawValue, ofType: "lproj"),
              let bundle = Bundle(path: path) else {
            return .main
        }
        return bundle
    }

    static func format(_ key: String, _ arguments: CVarArg...) -> String {
        String(
            format: tr(key),
            locale: locale,
            arguments: arguments
        )
    }
}
