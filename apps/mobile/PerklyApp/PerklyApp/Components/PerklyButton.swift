import SwiftUI

enum PerklyButtonStyle {
    case primary    // White bg, black text
    case glass      // Glass effect
    case accent     // Gradient bg
    case danger     // Red
}

struct PerklyButton: View {
    let title: String
    var icon: String?
    var style: PerklyButtonStyle = .primary
    var isLoading: Bool = false
    var isFullWidth: Bool = false
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                if isLoading {
                    ProgressView()
                        .tint(textColor)
                        .scaleEffect(0.85)
                } else {
                    if let icon {
                        Image(systemName: icon)
                            .font(.system(size: 15, weight: .semibold))
                    }
                    Text(title)
                        .font(.system(size: 15, weight: .semibold))
                }
            }
            .foregroundColor(textColor)
            .frame(maxWidth: isFullWidth ? .infinity : nil)
            .padding(.horizontal, 24)
            .padding(.vertical, 14)
            .background(background)
            .clipShape(Capsule())
            .overlay(
                Capsule()
                    .stroke(borderColor, lineWidth: style == .glass ? 1 : 0)
            )
        }
        .buttonStyle(.plain)
        .opacity(isLoading ? 0.7 : 1)
        .disabled(isLoading)
    }
    
    private var textColor: Color {
        switch style {
        case .primary: return .black
        case .glass: return .white
        case .accent: return .white
        case .danger: return .white
        }
    }
    
    @ViewBuilder
    private var background: some View {
        switch style {
        case .primary:
            Capsule().fill(.white)
        case .glass:
            if #available(iOS 26.0, *) {
                Color.clear.glassEffect(.regular.interactive(), in: Capsule())
            } else {
                Capsule().fill(.ultraThinMaterial).environment(\.colorScheme, .dark)
            }
        case .accent:
            Capsule().fill(Color.primaryGradient)
        case .danger:
            Capsule().fill(Color.perklyRed.gradient)
        }
    }
    
    private var borderColor: Color {
        style == .glass ? .white.opacity(0.1) : .clear
    }
}
