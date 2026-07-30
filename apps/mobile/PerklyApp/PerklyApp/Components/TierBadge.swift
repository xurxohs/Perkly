import SwiftUI

struct TierBadge: View {
    let tier: UserTier
    var compact: Bool = false
    
    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: tier.icon)
                .font(.system(size: compact ? 10 : 13, weight: .bold))
            
            if !compact {
                Text(tier.displayName)
                    .font(.system(size: 11, weight: .bold))
                    .textCase(.uppercase)
            }
        }
        .foregroundColor(.white)
        .padding(.horizontal, compact ? 6 : 10)
        .padding(.vertical, compact ? 3 : 5)
        .background(gradient)
        .clipShape(Capsule())
        .shadow(color: shadowColor, radius: 6, y: 2)
    }
    
    private var gradient: LinearGradient {
        switch tier {
        case .silver:
            return LinearGradient(colors: [.gray, .gray.opacity(0.7)], startPoint: .topLeading, endPoint: .bottomTrailing)
        case .gold:
            return .perklyGold
        case .platinum:
            return .perklyPlatinum
        }
    }
    
    private var shadowColor: Color {
        switch tier {
        case .silver: return .gray.opacity(0.3)
        case .gold: return .perklyGold.opacity(0.4)
        case .platinum: return .perklyPurple.opacity(0.4)
        }
    }
}
