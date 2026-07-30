import SwiftUI
import UIKit

struct PerklyAuthHeroBackground: View {
    var body: some View {
        ZStack {
            Image("WelcomeHero")
                .resizable()
                .scaledToFill()
                .ignoresSafeArea()
                .accessibilityHidden(true)

            LinearGradient(
                colors: [
                    .black.opacity(0.04),
                    .clear,
                    .black.opacity(0.36)
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()
            .accessibilityHidden(true)
        }
        .accessibilityHidden(true)
    }
}

struct PerklyAuthTextField: View {
    let title: String
    @Binding var text: String
    var keyboardType: UIKeyboardType = .default
    var textContentType: UITextContentType?

    var body: some View {
        TextField(L10n.tr(title), text: $text)
            .font(.body.weight(.semibold))
            .foregroundColor(.white)
            .tint(.white)
            .keyboardType(keyboardType)
            .textContentType(textContentType)
            .textInputAutocapitalization(keyboardType == .emailAddress ? .never : .words)
            .autocorrectionDisabled(keyboardType == .emailAddress)
            .submitLabel(.next)
            .padding(.horizontal, 18)
            .padding(.vertical, 14)
            .frame(minHeight: 54)
            .background {
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .fill(Color.black.opacity(0.26))
            }
            .overlay {
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .stroke(Color.white.opacity(0.18), lineWidth: 1)
            }
            .accessibilityLabel(L10n.tr(title))
    }
}

struct PerklyAuthSecureField: View {
    let title: String
    @Binding var text: String

    var body: some View {
        SecureField(L10n.tr(title), text: $text)
            .font(.body.weight(.semibold))
            .foregroundColor(.white)
            .tint(.white)
            .textContentType(.password)
            .submitLabel(.done)
            .padding(.horizontal, 18)
            .padding(.vertical, 14)
            .frame(minHeight: 54)
            .background {
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .fill(Color.black.opacity(0.26))
            }
            .overlay {
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .stroke(Color.white.opacity(0.18), lineWidth: 1)
            }
            .accessibilityLabel(L10n.tr(title))
    }
}

struct PerklyAuthErrorView: View {
    let error: String

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "exclamationmark.circle.fill")
                .accessibilityHidden(true)
            Text(L10n.tr(error))
                .fixedSize(horizontal: false, vertical: true)
        }
        .font(.footnote.weight(.semibold))
        .foregroundColor(.white)
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(Color.red.opacity(0.38), in: Capsule())
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Ошибка: \(error)")
    }
}

struct PerklyAuthButtonLabel: View {
    let title: String
    let isLoading: Bool
    let loadingTint: Color

    var body: some View {
        Group {
            if isLoading {
                ProgressView()
                    .tint(loadingTint)
                    .accessibilityLabel("Загрузка")
            } else {
                Text(L10n.tr(title))
            }
        }
    }
}

struct PerklyAuthPrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline.weight(.semibold))
            .foregroundColor(.black)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .frame(minHeight: 60)
            .background {
                Capsule()
                    .fill(Color.white.opacity(configuration.isPressed ? 0.90 : 0.98))
            }
            .shadow(color: .black.opacity(0.18), radius: 18, y: 10)
            .scaleEffect(configuration.isPressed ? 0.985 : 1)
    }
}

struct PerklyAuthGlassButtonStyle: ButtonStyle {
    @ViewBuilder
    func makeBody(configuration: Configuration) -> some View {
        if #available(iOS 26.0, *) {
            configuration.label
                .font(.headline.weight(.semibold))
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .frame(minHeight: 60)
                .background {
                    Color.clear
                        .glassEffect(
                            .regular
                                .tint(Color.black.opacity(configuration.isPressed ? 0.44 : 0.36))
                                .interactive(),
                            in: Capsule()
                        )
                }
                .shadow(color: .black.opacity(0.24), radius: 20, y: 11)
                .scaleEffect(configuration.isPressed ? 0.985 : 1)
        } else {
            configuration.label
                .font(.headline.weight(.semibold))
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .frame(minHeight: 60)
                .background {
                    Capsule()
                        .fill(.ultraThinMaterial)
                        .overlay {
                            Capsule()
                                .fill(Color.black.opacity(configuration.isPressed ? 0.36 : 0.26))
                        }
                }
                .overlay {
                    Capsule()
                        .stroke(Color.white.opacity(0.24), lineWidth: 1)
                }
                .shadow(color: .black.opacity(0.24), radius: 20, y: 11)
                .scaleEffect(configuration.isPressed ? 0.985 : 1)
        }
    }
}

private struct AuthPanelGlassModifier: ViewModifier {
    func body(content: Content) -> some View {
        if #available(iOS 26.0, *) {
            content
                .background {
                    Color.clear
                        .glassEffect(
                            .regular
                                .tint(Color.black.opacity(0.20)),
                            in: RoundedRectangle(cornerRadius: 34, style: .continuous)
                        )
                }
        } else {
            content
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 34, style: .continuous))
                .background(Color.black.opacity(0.18), in: RoundedRectangle(cornerRadius: 34, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: 34, style: .continuous)
                        .stroke(Color.white.opacity(0.18), lineWidth: 1)
                }
        }
    }
}

extension View {
    func authPanelGlass() -> some View {
        modifier(AuthPanelGlassModifier())
    }
}
