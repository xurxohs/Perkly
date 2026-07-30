import SwiftUI

struct GradientText: View {
    let text: String
    var font: Font = .title.bold()
    var gradient: LinearGradient = .perklyPrimary
    
    var body: some View {
        Text(text)
            .font(font)
            .foregroundStyle(gradient)
    }
}

// MARK: - Gradient Text Modifier
struct GradientTextModifier: ViewModifier {
    var gradient: LinearGradient = .perklyPrimary
    
    func body(content: Content) -> some View {
        content
            .foregroundStyle(gradient)
    }
}

extension View {
    func gradientForeground(_ gradient: LinearGradient = .perklyPrimary) -> some View {
        modifier(GradientTextModifier(gradient: gradient))
    }
}
