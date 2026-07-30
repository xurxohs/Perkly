import SwiftUI

struct AppearanceSettingsView: View {
    @EnvironmentObject private var appearance: AppAppearance

    var body: some View {
        List {
            Section {
                ForEach(PerklyTheme.allCases) { theme in
                    selectionRow(
                        title: theme.title,
                        icon: theme.icon,
                        selected: appearance.theme == theme
                    ) {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            appearance.theme = theme
                        }
                    }
                }
            } header: {
                Text(L10n.tr("Оформление"))
            } footer: {
                Text(L10n.tr("Системная тема автоматически повторяет оформление iPhone."))
            }

            Section {
                ForEach(PerklyLanguage.allCases) { language in
                    selectionRow(
                        title: language.title,
                        icon: language == .uz ? "character.book.closed.fill" : "globe",
                        selected: appearance.language == language
                    ) {
                        appearance.language = language
                        HapticManager.shared.playSelection()
                    }
                }
            } header: {
                Text(L10n.tr("Язык"))
            } footer: {
                Text(L10n.tr("Язык интерфейса меняется сразу и сохраняется на этом устройстве."))
            }
        }
        .navigationTitle(L10n.tr("Оформление и язык"))
        .navigationBarTitleDisplayMode(.inline)
    }

    private func selectionRow(
        title: String,
        icon: String,
        selected: Bool,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(spacing: 14) {
                Image(systemName: icon)
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(selected ? Color.perklyPurple : .secondary)
                    .frame(width: 28)

                Text(title)
                    .foregroundStyle(.primary)

                Spacer()

                if selected {
                    Image(systemName: "checkmark")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(Color.perklyPurple)
                }
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(selected ? .isSelected : [])
    }
}
