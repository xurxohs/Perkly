import SwiftUI

// MARK: - Screen 1

struct PhotoEditorialPage: View {
    let event: Event
    let safeAreaInsets: EdgeInsets
    let onOpen: (TopkaHeroOrigin) -> Void

    var body: some View {
        GeometryReader { geometry in
            let horizontalInset = TopkaLayout.horizontalInset(for: geometry.size.width)
            let cardWidth = max(0, geometry.size.width - horizontalInset * 2)
            let safeHeight = max(
                0,
                geometry.size.height
                    - safeAreaInsets.top
                    - safeAreaInsets.bottom
            )
            let headlineHeight = min(max(safeHeight * 0.23, 164), 190)
            let headlineTopInset = safeAreaInsets.top + 24
            let cardGap: CGFloat = 36
            let bottomInset = safeAreaInsets.bottom + 12
            let desiredCardHeight = cardWidth / TopkaLayout.artworkAspectRatio
            let availableCardHeight = max(
                0,
                geometry.size.height
                    - headlineTopInset
                    - headlineHeight
                    - cardGap
                    - bottomInset
            )
            let cardHeight = min(desiredCardHeight, availableCardHeight)
            let cornerRadius = TopkaLayout.cardCornerRadius(for: geometry.size.width)

            VStack(spacing: 0) {
                Text(TopkaEditorialCopy.headline(for: event))
                    .font(
                        TopkaTypography.display(
                            size: TopkaLayout.headlineSize(for: geometry.size.width)
                        )
                    )
                    .foregroundStyle(TopkaPalette.ink)
                    .tracking(-1.8)
                    .lineSpacing(-9)
                    .multilineTextAlignment(.center)
                    .minimumScaleFactor(0.74)
                    .lineLimit(3)
                    .frame(width: geometry.size.width * 0.88, height: headlineHeight)
                    .padding(.top, headlineTopInset)
                    .accessibilityAddTraits(.isHeader)

                PhotoPreviewCard(
                    event: event,
                    cornerRadius: cornerRadius,
                    onOpen: onOpen
                )
                .frame(width: cardWidth, height: cardHeight)
                .padding(.top, cardGap)

                Spacer(minLength: bottomInset)
            }
            .frame(width: geometry.size.width, height: geometry.size.height)
            .clipped()
        }
        .background(TopkaPalette.canvas)
        .accessibilityElement(children: .contain)
    }
}

struct PhotoPreviewCard: View {
    let event: Event
    let cornerRadius: CGFloat
    let onOpen: (TopkaHeroOrigin) -> Void

    private var accent: Color {
        TopkaPalette.accent(for: event)
    }

    private var actionTitle: String {
        let title = event.ctaText?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return title.isEmpty ? "ОТКРЫТЬ" : L10n.tr(title).uppercased()
    }

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .bottomLeading) {
                heroArtwork

                LinearGradient(
                    stops: [
                        .init(color: .clear, location: 0.34),
                        .init(color: accent.opacity(0.08), location: 0.5),
                        .init(color: .black.opacity(0.9), location: 1)
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )

                VStack(alignment: .leading, spacing: 10) {
                    Spacer(minLength: 0)

                    Text(L10n.tr(event.title))
                        .font(TopkaTypography.title(size: 27))
                        .tracking(-0.7)
                        .foregroundStyle(.white)
                        .lineLimit(2)
                        .minimumScaleFactor(0.82)

                    Text(L10n.tr(event.subtitle ?? event.description))
                        .font(TopkaTypography.body(size: 13))
                        .foregroundStyle(.white.opacity(0.78))
                        .lineSpacing(2)
                        .lineLimit(2)
                        .frame(maxWidth: 310, alignment: .leading)

                    HStack(spacing: 7) {
                        Text(actionTitle)
                        Image(systemName: "arrow.up.right")
                    }
                    .font(TopkaTypography.button(size: 11))
                    .tracking(0.7)
                    .foregroundStyle(.black)
                    .padding(.horizontal, 15)
                    .frame(height: 38)
                    .background(.white)
                    .clipShape(Capsule())
                    .padding(.top, 1)
                }
                .padding(20)
            }
            .frame(width: geometry.size.width, height: geometry.size.height)
            .clipShape(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
            )
            .overlay {
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .stroke(.white.opacity(0.14), lineWidth: 1)
            }
            .contentShape(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
            )
            .gesture(
                SpatialTapGesture()
                    .onEnded { value in
                        onOpen(
                            TopkaHeroOrigin(
                                anchor: TopkaLayout.normalizedAnchor(
                                    at: value.location,
                                    in: geometry.size
                                ),
                                frame: geometry.frame(in: .global),
                                cornerRadius: cornerRadius
                            )
                        )
                    }
            )
            .accessibilityAction {
                onOpen(
                    TopkaHeroOrigin(
                        anchor: .center,
                        frame: geometry.frame(in: .global),
                        cornerRadius: cornerRadius
                    )
                )
            }
        }
        .shadow(color: .black.opacity(0.16), radius: 22, y: 11)
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(.isButton)
        .accessibilityLabel(L10n.tr(event.title))
        .accessibilityHint("Открывает подробную информацию о событии")
        .accessibilityIdentifier("topka.photoCard.\(event.id)")
    }

    private var heroArtwork: some View {
        TopkaEventArtwork(event: event)
    }
}
