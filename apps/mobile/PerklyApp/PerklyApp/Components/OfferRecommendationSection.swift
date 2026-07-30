import SwiftUI

struct OfferRecommendationSection: View {
    let title: String
    let subtitle: String
    let icon: String
    let accent: Color
    let offers: [RecommendedOffer]
    let trackingScreen: String
    let trackingSection: String
    var trackingVariant: String = "v2_multi_badge"
    let emptyState: String
    var actionTitle: String? = nil
    var action: (() -> Void)? = nil
    @State private var trackedImpressionKey: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .top, spacing: 12) {
                ZStack {
                    Circle()
                        .fill(accent.opacity(0.16))
                        .frame(width: 42, height: 42)

                    Image(systemName: icon)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(accent)
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(.white)

                    Text(subtitle)
                        .font(.system(size: 13))
                        .foregroundColor(.white.opacity(0.55))
                        .fixedSize(horizontal: false, vertical: true)
                }

                Spacer()
            }

            if offers.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    Text(emptyState)
                        .font(.system(size: 14))
                        .foregroundColor(.white.opacity(0.45))
                        .fixedSize(horizontal: false, vertical: true)

                    if let actionTitle, let action {
                        Button(action: action) {
                            Text(actionTitle)
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(.white)
                                .padding(.horizontal, 14)
                                .padding(.vertical, 10)
                                .background(accent.opacity(0.22))
                                .clipShape(Capsule())
                        }
                        .buttonStyle(.plain)
                    }
                }
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 14) {
                        ForEach(Array(offers.enumerated()), id: \.element.id) { index, recommendedOffer in
                            NavigationLink(destination: OfferDetailView(offerId: recommendedOffer.offer.id)) {
                                OfferCard(
                                    offer: recommendedOffer.offer,
                                    badges: recommendedOffer.badges
                                )
                                .frame(width: 220)
                            }
                            .buttonStyle(.plain)
                            .simultaneousGesture(
                                TapGesture().onEnded {
                                    AnalyticsService.shared.trackEvent(
                                        eventType: "recommendation_click",
                                        offerId: recommendedOffer.offer.id,
                                        metadata: [
                                            "index": index,
                                            "screen": trackingScreen,
                                            "section": trackingSection,
                                            "variant": trackingVariant
                                        ]
                                    )
                                }
                            )
                        }
                    }
                    .padding(.horizontal, 1)
                }
            }
        }
        .padding(20)
        .perklySurface(cornerRadius: 24)
        .onAppear {
            trackSectionImpressionIfNeeded()
        }
        .onChange(of: impressionKey) { _, _ in
            trackSectionImpressionIfNeeded()
        }
    }

    private var impressionKey: String {
        [
            trackingScreen,
            trackingSection,
            trackingVariant,
            offers.map(\.offer.id).joined(separator: ",")
        ].joined(separator: "|")
    }

    private func trackSectionImpressionIfNeeded() {
        guard !offers.isEmpty else { return }
        guard trackedImpressionKey != impressionKey else { return }
        trackedImpressionKey = impressionKey

        AnalyticsService.shared.trackEvent(
            eventType: "recommendation_section_impression",
            metadata: [
                "count": offers.count,
                "offerIds": offers.map(\.offer.id),
                "screen": trackingScreen,
                "section": trackingSection,
                "variant": trackingVariant
            ]
        )
    }
}
