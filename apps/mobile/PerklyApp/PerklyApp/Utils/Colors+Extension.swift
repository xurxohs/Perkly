import SwiftUI
import UIKit

private let uzsFormatter: NumberFormatter = {
    let formatter = NumberFormatter()
    formatter.numberStyle = .decimal
    formatter.locale = Locale(identifier: "uz_UZ")
    formatter.maximumFractionDigits = 0
    formatter.minimumFractionDigits = 0
    formatter.groupingSeparator = " "
    return formatter
}()

func uzs(_ value: Double) -> String {
    let amount = uzsFormatter.string(from: NSNumber(value: value.rounded())) ?? "0"
    return "\(amount) soʻm"
}

enum PerklyDesign {
    enum Spacing {
        static let xs: CGFloat = 8
        static let sm: CGFloat = 12
        static let md: CGFloat = 16
        static let lg: CGFloat = 20
        static let xl: CGFloat = 24
        static let xxl: CGFloat = 32
    }

    enum Radius {
        static let control: CGFloat = 16
        static let card: CGFloat = 20
        static let feature: CGFloat = 24
        static let tile: CGFloat = 28
        static let panel: CGFloat = 32
    }

    enum Size {
        static let minimumTouchTarget: CGFloat = 44
        static let controlHeight: CGFloat = 52
    }
}

extension Color {
    private static func adaptive(light: UIColor, dark: UIColor) -> Color {
        Color(UIColor { traits in
            traits.userInterfaceStyle == .dark ? dark : light
        })
    }

    // MARK: - Primary Palette
    static let perklyPurple = Color(red: 168/255, green: 85/255, blue: 247/255)
    static let perklyPink = Color(red: 236/255, green: 72/255, blue: 153/255)
    static let perklyDark = adaptive(
        light: UIColor(red: 246/255, green: 246/255, blue: 248/255, alpha: 1),
        dark: UIColor(red: 10/255, green: 10/255, blue: 15/255, alpha: 1)
    )
    static let perklyCardBg = adaptive(
        light: UIColor.white.withAlphaComponent(0.82),
        dark: UIColor.white.withAlphaComponent(0.05)
    )
    static let perklyBorder = adaptive(
        light: UIColor.black.withAlphaComponent(0.08),
        dark: UIColor.white.withAlphaComponent(0.08)
    )
    static let perklyOverlay = adaptive(light: .black, dark: .white)
    
    // MARK: - Accent Colors
    static let perklyGreen = Color(red: 34/255, green: 197/255, blue: 94/255)
    static let perklyOrange = Color(red: 249/255, green: 115/255, blue: 22/255)
    static let perklyRed = Color(red: 239/255, green: 68/255, blue: 68/255)
    static let perklyCyan = Color(red: 6/255, green: 182/255, blue: 212/255)
    static let perklyGold = Color(red: 251/255, green: 191/255, blue: 36/255)
    static let perklyElectricCyan = Color(red: 15/255, green: 216/255, blue: 226/255)
    static let perklyLavender = Color(red: 161/255, green: 157/255, blue: 247/255)
    static let perklyMint = Color(red: 10/255, green: 220/255, blue: 151/255)
    static let perklyCoral = Color(red: 255/255, green: 134/255, blue: 94/255)
    
    // MARK: - Text Colors
    static let perklyTextPrimary = adaptive(
        light: UIColor(red: 20/255, green: 20/255, blue: 23/255, alpha: 1),
        dark: .white
    )
    static let perklyTextSecondary = adaptive(
        light: UIColor.black.withAlphaComponent(0.58),
        dark: UIColor.white.withAlphaComponent(0.6)
    )
    static let perklyTextMuted = adaptive(
        light: UIColor.black.withAlphaComponent(0.34),
        dark: UIColor.white.withAlphaComponent(0.3)
    )
    
    // MARK: - Gradients
    static let primaryGradient = LinearGradient(
        colors: [perklyPurple, perklyPink],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
    
    static let greenGradient = LinearGradient(
        colors: [Color(red: 34/255, green: 197/255, blue: 94/255), Color(red: 16/255, green: 185/255, blue: 129/255)],
        startPoint: .leading,
        endPoint: .trailing
    )
    
    static let fireGradient = LinearGradient(
        colors: [perklyOrange, perklyRed],
        startPoint: .leading,
        endPoint: .trailing
    )
    
    static let goldGradient = LinearGradient(
        colors: [Color(red: 251/255, green: 191/255, blue: 36/255), Color(red: 245/255, green: 158/255, blue: 11/255)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
    
    static let platinumGradient = LinearGradient(
        colors: [perklyPurple, Color(red: 217/255, green: 70/255, blue: 239/255)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
}

// MARK: - Gradient Helpers
extension LinearGradient {
    static let perklyPrimary = Color.primaryGradient
    static let perklyGreen = Color.greenGradient
    static let perklyFire = Color.fireGradient
    static let perklyGold = Color.goldGradient
    static let perklyPlatinum = Color.platinumGradient
}
