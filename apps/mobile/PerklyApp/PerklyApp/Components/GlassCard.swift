import SwiftUI

// Content and controls intentionally use different surfaces. Liquid Glass is a
// functional layer for navigation and interaction, not a generic card style.
struct PerklySurfaceModifier: ViewModifier {
    var cornerRadius: CGFloat = PerklyDesign.Radius.card
    var fill: Color = .perklyCardBg
    var showsBorder = true

    func body(content: Content) -> some View {
        let shape = RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)

        content
            .background(fill, in: shape)
            .overlay {
                if showsBorder {
                    shape.stroke(Color.perklyBorder, lineWidth: 1)
                }
            }
            .clipShape(shape)
    }
}

struct PerklyGlassModifier: ViewModifier {
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency

    var cornerRadius: CGFloat = PerklyDesign.Radius.feature
    var tint: Color? = nil
    var isInteractive = true

    @ViewBuilder
    func body(content: Content) -> some View {
        let shape = RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)

        if reduceTransparency {
            content
                .background(Color.perklyCardBg.opacity(0.98), in: shape)
                .overlay {
                    ZStack {
                        if let tint { shape.fill(tint.opacity(0.14)) }
                        shape.stroke(Color.perklyBorder, lineWidth: 1)
                    }
                }
                .clipShape(shape)
        } else if #available(iOS 26.0, *) {
            content
                .glassEffect(
                    .regular.tint(tint).interactive(isInteractive),
                    in: shape
                )
        } else {
            content
                .background(.ultraThinMaterial, in: shape)
                .overlay {
                    shape.stroke(Color.perklyBorder, lineWidth: 1)
                }
                .clipShape(shape)
        }
    }
}

struct PerklyGlassGroup<Content: View>: View {
    var spacing: CGFloat = 12
    @ViewBuilder var content: () -> Content

    @ViewBuilder
    var body: some View {
        if #available(iOS 26.0, *) {
            GlassEffectContainer(spacing: spacing) {
                content()
            }
        } else {
            content()
        }
    }
}

struct PerklyPressStyle: ButtonStyle {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed && !reduceMotion ? 0.985 : 1)
            .opacity(configuration.isPressed ? 0.82 : 1)
            .animation(
                reduceMotion ? nil : .spring(response: 0.22, dampingFraction: 0.82),
                value: configuration.isPressed
            )
    }
}

struct PerklySkeletonBlock: View {
    var width: CGFloat? = nil
    let height: CGFloat
    var cornerRadius: CGFloat = PerklyDesign.Radius.control

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var shimmerOffset: CGFloat = -1

    var body: some View {
        RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
            .fill(Color.perklyOverlay.opacity(0.065))
            .frame(width: width, height: height)
            .overlay {
                if !reduceMotion {
                    GeometryReader { proxy in
                        LinearGradient(
                            colors: [
                                .clear,
                                Color.perklyOverlay.opacity(0.11),
                                .clear
                            ],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                        .frame(width: proxy.size.width * 0.72)
                        .offset(x: shimmerOffset * proxy.size.width * 1.8)
                    }
                    .clipShape(
                        RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    )
                }
            }
            .onAppear {
                guard !reduceMotion else { return }
                shimmerOffset = -1
                withAnimation(.linear(duration: 1.15).repeatForever(autoreverses: false)) {
                    shimmerOffset = 1
                }
            }
            .accessibilityHidden(true)
    }
}

extension View {
    func perklySurface(
        cornerRadius: CGFloat = PerklyDesign.Radius.card,
        fill: Color = .perklyCardBg,
        showsBorder: Bool = true
    ) -> some View {
        modifier(
            PerklySurfaceModifier(
                cornerRadius: cornerRadius,
                fill: fill,
                showsBorder: showsBorder
            )
        )
    }

    func perklyGlass(
        cornerRadius: CGFloat = PerklyDesign.Radius.feature,
        tint: Color? = nil,
        isInteractive: Bool = true
    ) -> some View {
        modifier(
            PerklyGlassModifier(
                cornerRadius: cornerRadius,
                tint: tint,
                isInteractive: isInteractive
            )
        )
    }
}

struct PerklyContentStateView: View {
    enum Kind: Equatable {
        case loading
        case empty
        case error
    }

    let kind: Kind
    let icon: String
    let title: String
    var message: String? = nil
    var actionTitle: String? = nil
    var action: (() -> Void)? = nil

    var body: some View {
        VStack(spacing: 14) {
            if kind == .loading {
                ProgressView()
                    .tint(.perklyPurple)
                    .scaleEffect(1.15)
                    .accessibilityLabel(title)
            } else {
                Image(systemName: icon)
                    .font(.system(size: 42, weight: .semibold))
                    .foregroundColor(kind == .error ? .perklyOrange : Color.perklyTextMuted)
                    .accessibilityHidden(true)
            }

            Text(title)
                .font(.system(size: 17, weight: .bold))
                .foregroundColor(.white)
                .multilineTextAlignment(.center)

            if let message, !message.isEmpty {
                Text(message)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(.white.opacity(0.5))
                    .multilineTextAlignment(.center)
                    .lineLimit(4)
            }

            if let actionTitle, let action {
                Button(actionTitle, action: action)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.black)
                    .frame(minWidth: 130, minHeight: PerklyDesign.Size.minimumTouchTarget)
                    .padding(.horizontal, 16)
                    .background(Color.white)
                    .clipShape(Capsule())
                    .buttonStyle(.plain)
            }
        }
        .frame(maxWidth: 360)
        .padding(.horizontal, 28)
        .accessibilityElement(children: .contain)
    }
}
