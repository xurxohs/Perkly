import SwiftUI

struct PerklyBrandMark: View {
    let size: CGFloat

    var body: some View {
        Image("PerklyChevron")
            .resizable()
            .renderingMode(.template)
            .scaledToFit()
            .foregroundStyle(Color.primaryGradient)
            .frame(width: size, height: size * 0.74)
            .accessibilityHidden(true)
    }
}
