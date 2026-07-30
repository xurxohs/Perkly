import SwiftUI

// MARK: - Subscription Center (Тарифный кабинет)

struct SubscriptionCenterView: View {
    let capabilities: PartnerCapabilities
    let onUpgrade: () -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var selectedTab: SCTab = .status

    enum SCTab: String, CaseIterable {
        case status  = "Статус"
        case limits  = "Лимиты"
        case compare = "Сравнение"
        case history = "История"
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.perklyDark.ignoresSafeArea()

                VStack(spacing: 0) {
                    // — Hero card —
                    SCHeroCard(capabilities: capabilities, onUpgrade: onUpgrade)
                        .padding(.horizontal, 20)
                        .padding(.top, 12)
                        .padding(.bottom, 16)

                    // — Tab bar —
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(SCTab.allCases, id: \.self) { tab in
                                Button {
                                    withAnimation(.spring(response: 0.3, dampingFraction: 0.75)) {
                                        selectedTab = tab
                                    }
                                } label: {
                                    Text(tab.rawValue)
                                        .font(.system(size: 13, weight: .semibold))
                                        .foregroundColor(selectedTab == tab ? .black : .white.opacity(0.55))
                                        .padding(.horizontal, 16)
                                        .padding(.vertical, 9)
                                        .background(
                                            Capsule()
                                                .fill(selectedTab == tab ? Color.white : Color.white.opacity(0.07))
                                        )
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(.horizontal, 20)
                    }
                    .padding(.bottom, 14)

                    // — Tab content —
                    ScrollView(.vertical, showsIndicators: false) {
                        VStack(spacing: 20) {
                            switch selectedTab {
                            case .status:  SCStatusTab(capabilities: capabilities)
                            case .limits:  SCLimitsTab(capabilities: capabilities)
                            case .compare: SCCompareTab(capabilities: capabilities)
                            case .history: SCHistoryTab(capabilities: capabilities)
                            }
                        }
                        .padding(.horizontal, 20)
                        .padding(.bottom, 40)
                    }
                }
            }
            .navigationTitle("Тарифный кабинет")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button { dismiss() } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 22))
                            .foregroundColor(.white.opacity(0.4))
                    }
                }
            }
        }
    }
}

// MARK: - Hero Card

private struct SCHeroCard: View {
    let capabilities: PartnerCapabilities
    let onUpgrade: () -> Void

    private var tierColor: Color {
        switch capabilities.tierEnum {
        case .silver:   return .white.opacity(0.6)
        case .gold:     return .perklyGold
        case .platinum: return .perklyPurple
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            HStack(alignment: .top, spacing: 14) {
                ZStack {
                    Circle()
                        .fill(tierColor.opacity(0.15))
                        .frame(width: 52, height: 52)
                    Image(systemName: capabilities.tierEnum.icon)
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(tierColor)
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text(capabilities.planName)
                        .font(.system(size: 20, weight: .heavy))
                        .foregroundColor(.white)

                    Text(capabilities.timerSubtitle)
                        .font(.system(size: 13))
                        .foregroundColor(.white.opacity(0.55))
                        .fixedSize(horizontal: false, vertical: true)
                }

                Spacer(minLength: 0)

                // Status pill
                Text(statusLabel)
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(statusColor)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(statusColor.opacity(0.15))
                    .clipShape(Capsule())
            }
            .padding(16)

            // Upgrade strip — only if not platinum
            if capabilities.tierEnum != .platinum {
                Divider().background(Color.white.opacity(0.07))

                Button(action: onUpgrade) {
                    HStack(spacing: 6) {
                        Image(systemName: "arrow.up.circle.fill")
                            .font(.system(size: 14))
                        Text(capabilities.upgrade?.ctaTitle ?? "Улучшить план")
                            .font(.system(size: 13, weight: .bold))
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.system(size: 12))
                    }
                    .foregroundColor(tierColor)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                }
                .buttonStyle(.plain)
            }
        }
        .background(
            RoundedRectangle(cornerRadius: 22)
                .fill(tierColor.opacity(0.06))
                .overlay(
                    RoundedRectangle(cornerRadius: 22)
                        .stroke(tierColor.opacity(0.22), lineWidth: 1)
                )
        )
    }

    private var statusLabel: String {
        switch capabilities.status {
        case "ACTIVE":   return capabilities.daysRemaining.map { "• \($0) дн." } ?? "• Активна"
        case "EXPIRED":  return "Истекла"
        case "CANCELED": return "Отменена"
        default:         return "Basic"
        }
    }

    private var statusColor: Color {
        switch capabilities.status {
        case "ACTIVE":   return .perklyGreen
        case "EXPIRED":  return .perklyRed
        case "CANCELED": return .perklyOrange
        default:         return .white.opacity(0.4)
        }
    }
}

// MARK: - Status Tab

private struct SCStatusTab: View {
    let capabilities: PartnerCapabilities

    var body: some View {
        VStack(spacing: 14) {

            // Feature access list
            SectionHeader(title: "Доступные функции", icon: "checkmark.seal")

            VStack(spacing: 10) {
                FeatureRow(
                    title: "Создание офферов",
                    icon: "tag.fill",
                    granted: capabilities.capabilities.canCreateOffers,
                    blockedReason: capabilities.capabilities.canCreateOffers ? nil : "Офферы недоступны на вашем плане"
                )
                FeatureRow(
                    title: "Продвижение офферов",
                    icon: "bolt.fill",
                    granted: capabilities.capabilities.canFeatureOffers,
                    blockedReason: "Доступно на Gold и Platinum"
                )
                FeatureRow(
                    title: "Публикация в Topka",
                    icon: "mappin.and.ellipse",
                    granted: capabilities.capabilities.canPublishTopka,
                    blockedReason: "Только для Platinum партнёров"
                )
                FeatureRow(
                    title: "Базовая аналитика",
                    icon: "chart.bar.fill",
                    granted: capabilities.capabilities.canViewBasicAnalytics,
                    blockedReason: nil
                )
                FeatureRow(
                    title: "Расширенная аналитика",
                    icon: "chart.xyaxis.line",
                    granted: capabilities.capabilities.canViewAdvancedAnalytics,
                    blockedReason: "Доступно на Gold и Platinum"
                )
                FeatureRow(
                    title: "Приоритетная поддержка",
                    icon: "headphones",
                    granted: capabilities.capabilities.hasPrioritySupport,
                    blockedReason: "Доступно на Gold и Platinum"
                )
            }

            // Upgrade reason card
            if let upgrade = capabilities.upgrade {
                SectionHeader(title: "Почему заблокировано?", icon: "lock.fill")
                HStack(alignment: .top, spacing: 12) {
                    Image(systemName: "lock.circle.fill")
                        .font(.system(size: 18))
                        .foregroundColor(.perklyOrange)
                        .padding(.top, 1)
                    VStack(alignment: .leading, spacing: 5) {
                        Text(upgrade.reason)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.white)
                        Text("Некоторые функции недоступны на текущем плане. Обновите тариф, чтобы снять ограничения.")
                            .font(.system(size: 12))
                            .foregroundColor(.white.opacity(0.5))
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
                .padding(16)
                .background(Color.perklyOrange.opacity(0.08))
                .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.perklyOrange.opacity(0.22), lineWidth: 1))
                .clipShape(RoundedRectangle(cornerRadius: 16))
            }
        }
    }
}

// MARK: - Limits Tab

private struct SCLimitsTab: View {
    let capabilities: PartnerCapabilities

    var body: some View {
        VStack(spacing: 14) {
            SectionHeader(title: "Использование лимитов", icon: "gauge.medium")

            VStack(spacing: 14) {
                let offerLimit = capabilities.limits.offersLimit
                LimitBar(
                    title: "Активные офферы",
                    icon: "tag.fill",
                    used: capabilities.usage.activeOffers,
                    limit: offerLimit,
                    color: .perklyGreen
                )

                LimitBar(
                    title: "Topka в этом месяце",
                    icon: "mappin.and.ellipse",
                    used: capabilities.usage.topkaPublishedThisMonth,
                    limit: capabilities.limits.topkaMonthlyLimit,
                    color: .perklyPurple
                )

                LimitBar(
                    title: "Продвижений в месяц",
                    icon: "bolt.fill",
                    used: 0,
                    limit: capabilities.limits.featuredOffersPerMonth,
                    color: .perklyGold
                )
            }
        }
    }
}

// MARK: - Compare Tab

private struct SCCompareTab: View {
    let capabilities: PartnerCapabilities

    private struct PlanSpec {
        let name: String
        let price: String
        let color: Color
        let icon: String
        let offers: String
        let topka: String
        let featured: String
        let analytics: Bool
        let priority: Bool
    }

    private let specs: [PlanSpec] = [
        PlanSpec(name: "Basic",    price: "Бесплатно",  color: .white.opacity(0.5), icon: "shield.fill",  offers: "3",      topka: "–",   featured: "–",  analytics: false, priority: false),
        PlanSpec(name: "Gold",     price: "59 880 soʻm/мес",  color: .perklyGold,         icon: "medal.fill",   offers: "20",     topka: "–",   featured: "3",  analytics: true,  priority: true),
        PlanSpec(name: "Platinum", price: "119 880 soʻm/мес", color: .perklyPurple,       icon: "diamond.fill", offers: "∞",      topka: "30",  featured: "10", analytics: true,  priority: true),
    ]

    init(capabilities: PartnerCapabilities) {
        self.capabilities = capabilities
    }

    var body: some View {
        VStack(spacing: 14) {
            SectionHeader(title: "Сравнение планов", icon: "list.star")

            // Header row
            HStack(spacing: 0) {
                Text("Функция")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(.white.opacity(0.4))
                    .frame(maxWidth: .infinity, alignment: .leading)

                ForEach(specs, id: \.name) { spec in
                    VStack(spacing: 3) {
                        Image(systemName: spec.icon)
                            .font(.system(size: 13))
                            .foregroundColor(spec.color)
                        Text(spec.name)
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(spec.color)
                    }
                    .frame(width: 72)
                    .overlay(alignment: .top) {
                        if capabilities.planName == spec.name {
                            Text("Ваш")
                                .font(.system(size: 8, weight: .black))
                                .foregroundColor(.black)
                                .padding(.horizontal, 5)
                                .padding(.vertical, 2)
                                .background(spec.color)
                                .clipShape(Capsule())
                                .offset(y: -14)
                        }
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 20)
            .padding(.bottom, 8)
            .background(Color.white.opacity(0.04))
            .clipShape(RoundedRectangle(cornerRadius: 16))

            // Data rows
            VStack(spacing: 2) {
                textRow("Цена",               specs.map { $0.price })
                textRow("Офферы (макс.)",     specs.map { $0.offers })
                textRow("Topka / месяц",      specs.map { $0.topka })
                textRow("Продвижений / мес.", specs.map { $0.featured })
                boolRow("Расш. аналитика",    specs.map { $0.analytics })
                boolRow("Приор. поддержка",   specs.map { $0.priority })
            }
            .background(Color.white.opacity(0.03))
            .clipShape(RoundedRectangle(cornerRadius: 16))
        }
    }

    @ViewBuilder
    private func textRow(_ feature: String, _ values: [String]) -> some View {
        HStack(spacing: 0) {
            Text(feature)
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(.white.opacity(0.55))
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.leading, 14)
            ForEach(Array(specs.enumerated()), id: \.offset) { idx, spec in
                let isCurrent = (capabilities.planName == spec.name)
                let v = idx < values.count ? values[idx] : "–"
                Text(v)
                    .font(.system(size: 12, weight: isCurrent ? .bold : .medium))
                    .foregroundColor(isCurrent ? spec.color : (v == "–" ? .white.opacity(0.2) : .white.opacity(0.7)))
                    .frame(width: 72)
                    .padding(.vertical, 12)
                    .background(isCurrent ? spec.color.opacity(0.07) : Color.clear)
            }
        }
    }

    @ViewBuilder
    private func boolRow(_ feature: String, _ bools: [Bool]) -> some View {
        HStack(spacing: 0) {
            Text(feature)
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(.white.opacity(0.55))
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.leading, 14)
            ForEach(Array(specs.enumerated()), id: \.offset) { idx, spec in
                let isCurrent = (capabilities.planName == spec.name)
                let v = idx < bools.count ? bools[idx] : false
                Image(systemName: v ? "checkmark" : "minus")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(v ? (isCurrent ? spec.color : .perklyGreen.opacity(0.7)) : .white.opacity(0.2))
                    .frame(width: 72)
                    .padding(.vertical, 12)
                    .background(isCurrent ? spec.color.opacity(0.07) : Color.clear)
            }
        }
    }
}

// MARK: - History Tab

private struct SCHistoryTab: View {
    let capabilities: PartnerCapabilities

    var body: some View {
        VStack(spacing: 14) {
            SectionHeader(title: "История подписок", icon: "clock.arrow.circlepath")

            if let sub = capabilities.currentSubscription {
                HistoryRow(subscription: sub)
            } else {
                PerklyContentStateView(
                    kind: .empty,
                    icon: "clock.arrow.circlepath",
                    title: "История пока пуста",
                    message: "Оформленные и завершённые подписки появятся здесь."
                )
                .frame(maxWidth: .infinity)
                .padding(.vertical, 40)
                .background(Color.white.opacity(0.03))
                .clipShape(RoundedRectangle(cornerRadius: 16))
            }

            // Subscription details when active
            if let sub = capabilities.currentSubscription {
                VStack(spacing: 0) {
                    DetailRow(label: "Тариф",        value: UserTier(rawValue: sub.tier)?.displayName ?? sub.tier)
                    Divider().background(Color.white.opacity(0.06))
                    DetailRow(label: "Статус",       value: localizedStatus(sub.status))
                    Divider().background(Color.white.opacity(0.06))
                    DetailRow(label: "Начало",       value: formatDate(sub.startsAt))
                    Divider().background(Color.white.opacity(0.06))
                    DetailRow(label: "Действует до", value: sub.displayEndsAt)
                    Divider().background(Color.white.opacity(0.06))
                    DetailRow(label: "Осталось",     value: sub.daysRemaining.map { "\($0) дн." } ?? "—")
                    Divider().background(Color.white.opacity(0.06))
                    DetailRow(label: "Автообновление", value: sub.autoRenew ? "Да" : "Нет")
                    Divider().background(Color.white.opacity(0.06))
                    DetailRow(label: "Провайдер",    value: sub.provider)
                }
                .background(Color.white.opacity(0.04))
                .clipShape(RoundedRectangle(cornerRadius: 16))
            }
        }
    }

    private func localizedStatus(_ s: String) -> String {
        switch s {
        case "ACTIVE":   return "Активна ✓"
        case "EXPIRED":  return "Истекла"
        case "CANCELED": return "Отменена"
        default:         return s
        }
    }

    private func formatDate(_ iso: String) -> String {
        let fmtFrac = ISO8601DateFormatter()
        fmtFrac.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let fmt = ISO8601DateFormatter()
        guard let date = fmtFrac.date(from: iso) ?? fmt.date(from: iso) else { return iso }
        let out = DateFormatter()
        out.locale = L10n.locale
        out.dateFormat = "d MMM yyyy"
        return out.string(from: date)
    }
}

// MARK: - Reusable sub-components

private struct SectionHeader: View {
    let title: String
    let icon: String
    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(.white.opacity(0.4))
            Text(title)
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(.white.opacity(0.5))
            Spacer()
        }
    }
}

private struct FeatureRow: View {
    let title: String
    let icon: String
    let granted: Bool
    let blockedReason: String?

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(granted ? Color.perklyGreen.opacity(0.12) : Color.white.opacity(0.05))
                    .frame(width: 36, height: 36)
                Image(systemName: icon)
                    .font(.system(size: 15))
                    .foregroundColor(granted ? .perklyGreen : .white.opacity(0.2))
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(granted ? .white : .white.opacity(0.4))
                if !granted, let reason = blockedReason {
                    Text(reason)
                        .font(.system(size: 11))
                        .foregroundColor(.white.opacity(0.3))
                }
            }

            Spacer()

            Image(systemName: granted ? "checkmark.circle.fill" : "lock.fill")
                .font(.system(size: granted ? 18 : 14))
                .foregroundColor(granted ? .perklyGreen : .white.opacity(0.2))
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(Color.white.opacity(granted ? 0.04 : 0.02))
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }
}

private struct LimitBar: View {
    let title: String
    let icon: String
    let used: Int
    let limit: Int
    let color: Color

    private var fraction: Double {
        guard limit > 0 else { return 0 }
        return min(Double(used) / Double(limit), 1.0)
    }

    private var limitLabel: String {
        limit <= 0 ? "Недоступно" : (limit == -1 ? "∞" : "\(used) / \(limit)")
    }

    var body: some View {
        VStack(spacing: 10) {
            HStack(spacing: 10) {
                Image(systemName: icon)
                    .font(.system(size: 14))
                    .foregroundColor(color)
                    .frame(width: 22)
                Text(title)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.white)
                Spacer()
                Text(limitLabel)
                    .font(.system(size: 12, weight: .bold, design: .monospaced))
                    .foregroundColor(limit <= 0 ? .white.opacity(0.25) : color)
            }

            if limit > 0 {
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Capsule()
                            .fill(Color.white.opacity(0.07))
                            .frame(height: 7)
                        Capsule()
                            .fill(color)
                            .frame(width: geo.size.width * fraction, height: 7)
                            .animation(.spring(response: 0.6, dampingFraction: 0.8), value: fraction)
                    }
                }
                .frame(height: 7)
            }
        }
        .padding(14)
        .background(Color.white.opacity(0.04))
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }
}

private struct HistoryRow: View {
    let subscription: PartnerSubscription

    private var tierColor: Color {
        switch UserTier(rawValue: subscription.tier) {
        case .gold:     return .perklyGold
        case .platinum: return .perklyPurple
        default:        return .white.opacity(0.5)
        }
    }

    var body: some View {
        HStack(spacing: 14) {
            ZStack {
                Circle()
                    .fill(tierColor.opacity(0.15))
                    .frame(width: 44, height: 44)
                Image(systemName: UserTier(rawValue: subscription.tier)?.icon ?? "shield.fill")
                    .font(.system(size: 18))
                    .foregroundColor(tierColor)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(UserTier(rawValue: subscription.tier)?.displayName ?? subscription.tier)
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(.white)
                Text("До \(subscription.displayEndsAt)")
                    .font(.system(size: 12))
                    .foregroundColor(.white.opacity(0.45))
            }

            Spacer()

            statusPill
        }
        .padding(16)
        .background(Color.white.opacity(0.04))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private var statusPill: some View {
        let (label, color) = pillInfo
        return Text(label)
            .font(.system(size: 11, weight: .bold))
            .foregroundColor(color)
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(color.opacity(0.15))
            .clipShape(Capsule())
    }

    private var pillInfo: (String, Color) {
        switch subscription.status {
        case "ACTIVE":   return ("Активна", .perklyGreen)
        case "EXPIRED":  return ("Истекла", .perklyRed)
        case "CANCELED": return ("Отменена", .perklyOrange)
        default:         return (subscription.status, .white.opacity(0.4))
        }
    }
}

private struct DetailRow: View {
    let label: String
    let value: String
    var body: some View {
        HStack {
            Text(label)
                .font(.system(size: 13))
                .foregroundColor(.white.opacity(0.45))
            Spacer()
            Text(value)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(.white)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }
}
