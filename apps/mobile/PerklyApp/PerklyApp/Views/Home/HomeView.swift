import SwiftUI

struct HomeView: View {
    @StateObject private var vm = HomeViewModel()
    @EnvironmentObject var authVM: AuthViewModel
    @StateObject private var locationManager = LocationManager.shared
    
    var body: some View {
        ZStack {
            SmartHomeBackground()

            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 22) {
                    SmartHeroSection(
                        user: vm.homeFeed?.userSummary ?? authVM.user,
                        isAuthenticated: authVM.isAuthenticated,
                        primaryAction: vm.priorityActions.first,
                        feed: vm.homeFeed,
                        onDailyBonus: {
                            Task { await vm.claimDailyBonus() }
                        }
                    )
                    .padding(.horizontal, 20)
                    .padding(.top, 16)

                    HomeValueRail(
                        user: vm.homeFeed?.userSummary ?? authVM.user,
                        feed: vm.homeFeed,
                        isLoading: vm.isLoading && !hasRenderableContent
                    )

                    if vm.isShowingCachedData {
                        HomeUpdateNotice(title: cachedNoticeTitle) {
                            Task { await vm.loadData(for: authVM.user) }
                        }
                        .padding(.horizontal, PerklyDesign.Spacing.lg)
                    } else if vm.error != nil, hasRenderableContent {
                        HomeUpdateNotice {
                            Task { await vm.loadData(for: authVM.user) }
                        }
                        .padding(.horizontal, PerklyDesign.Spacing.lg)
                    }

                    if let banners = vm.homeFeed?.promoBanners, !banners.isEmpty {
                        PromoBannerCarousel(banners: banners)
                    }

                    if let dailyBonus = vm.homeFeed?.dailyBonus {
                        DailyStreakCard(
                            status: dailyBonus,
                            multiplier: vm.homeFeed?.streakMultiplier,
                            isClaiming: vm.isClaimingDailyBonus,
                            onClaim: {
                                Task { await vm.claimDailyBonus() }
                            }
                        )
                        .padding(.horizontal, 20)
                    }

                    if !vm.flashDrops.isEmpty {
                        FlashDropsSection(drops: Array(vm.flashDrops.prefix(5)))
                    }

                    VStack(spacing: 18) {
                        OfferRecommendationSection(
                            title: authVM.isAuthenticated ? "Для вас" : "Свежие находки",
                            subtitle: authVM.isAuthenticated
                                ? "Предложения на основе ваших покупок и интересов."
                                : "Популярные предложения для быстрого старта.",
                            icon: "sparkles",
                            accent: .perklyPurple,
                            offers: vm.personalizedOffers,
                            trackingScreen: "home",
                            trackingSection: "home_personalized",
                            emptyState: "Новых подходящих предложений пока нет."
                        )

                    }
                    .padding(.horizontal, 20)

                    Spacer(minLength: 18)
                }
                .padding(.bottom, 40)
            }
        }
        .background(Color.perklyDark)
        .overlay {
            if vm.isLoading && !hasRenderableContent {
                HomeInitialLoadingState()
            } else if vm.error != nil && !hasRenderableContent {
                HomeInitialFailureState {
                    Task { await vm.loadData(for: authVM.user) }
                }
            }
        }
        .overlay(alignment: .top) {
            if let celebration = vm.bonusCelebration {
                DailyBonusClaimToast(
                    celebration: celebration,
                    onDismiss: vm.dismissBonusCelebration
                )
                .padding(.horizontal, 20)
                .padding(.top, 10)
                .transition(.move(edge: .top).combined(with: .opacity).combined(with: .scale(scale: 0.96)))
            }
        }
        .animation(.spring(response: 0.48, dampingFraction: 0.82), value: vm.bonusCelebration?.id)
        .refreshable {
            await authVM.refreshUser()
            await vm.loadData(for: authVM.user)
        }
        .task(id: homeLoadKey) {
            await vm.loadData(for: authVM.user)
        }
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(for: AppRoute.self) { route in
            switch route {
            case .offer(let offerId):
                OfferDetailView(offerId: offerId)
            case .catalog(let cat):
                CatalogView(initialCategory: cat)
            case .fortuneWheel:
                FortuneWheelView()
            case .sell:
                SellerDashboardView()
            case .purchases:
                ActivePurchasesView()
            case .purchase(let transactionId):
                PurchaseCenterView(transactionId: transactionId)
            case .chats:
                ChatListView()
            case .sessions:
                ActiveSessionsView()
            }
        }
        .toolbar {
            ToolbarItem(placement: .principal) {
                HStack(spacing: 8) {
                    PerklyBrandMark(size: 30)
                    Text("Perkly")
                        .font(.system(size: 20, weight: .bold))
                        .foregroundColor(.perklyTextPrimary)
                }
            }
            
            ToolbarItem(placement: .navigationBarTrailing) {
                NavigationLink(destination: ChatListView()) {
                    ZStack {
                        Image(systemName: "message.fill")
                            .font(.system(size: 18))
                            .foregroundColor(.perklyTextPrimary)

                        if let unread = vm.homeFeed?.unreadChats?.totalUnread, unread > 0 {
                            Text(unread > 9 ? "9+" : "\(unread)")
                                .font(.system(size: 9, weight: .black))
                                .foregroundColor(.perklyTextPrimary)
                                .frame(minWidth: 16, minHeight: 16)
                                .background(Color.perklyRed)
                                .clipShape(Circle())
                                .offset(x: 10, y: -9)
                        }
                    }
                }
            }
        }
        .onChange(of: locationManager.lastLocation) { _, location in
            guard location != nil else { return }
            Task {
                await vm.reloadRecommendations(for: authVM.user)
            }
        }
    }

    private var cachedNoticeTitle: String {
        guard let date = vm.cachedDataDate else { return "Показаны сохранённые данные" }
        return "Сохранено: \(date.formatted(date: .abbreviated, time: .shortened))"
    }

    private var homeLoadKey: String {
        [
            authVM.user?.id ?? "",
            authVM.user?.tier ?? "",
            authVM.user?.updatedAt ?? "",
            authVM.isAuthenticated ? "auth" : "guest"
        ].joined(separator: "|")
    }

    private var hasRenderableContent: Bool {
        vm.homeFeed != nil || !vm.flashDrops.isEmpty || !vm.personalizedOffers.isEmpty
    }
}

private struct HomeInitialLoadingState: View {
    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(alignment: .leading, spacing: 20) {
                HStack {
                    VStack(alignment: .leading, spacing: 10) {
                        PerklySkeletonBlock(width: 118, height: 14, cornerRadius: 7)
                        PerklySkeletonBlock(width: 274, height: 42, cornerRadius: 14)
                        PerklySkeletonBlock(width: 228, height: 18, cornerRadius: 9)
                    }
                    Spacer()
                    PerklySkeletonBlock(width: 58, height: 58, cornerRadius: 29)
                }

                PerklySkeletonBlock(height: 54, cornerRadius: 18)

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(0..<3, id: \.self) { _ in
                            PerklySkeletonBlock(
                                width: 190,
                                height: 166,
                                cornerRadius: PerklyDesign.Radius.tile
                            )
                        }
                    }
                }

                PerklySkeletonBlock(height: 226, cornerRadius: 26)

                HStack(spacing: 12) {
                    PerklySkeletonBlock(height: 220, cornerRadius: 24)
                    PerklySkeletonBlock(height: 220, cornerRadius: 24)
                }
            }
            .padding(.horizontal, 20)
            .padding(.top, 20)
            .padding(.bottom, 40)
        }
        .background(Color.perklyDark.ignoresSafeArea())
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Загружаем главную")
    }
}

private struct HomeInitialFailureState: View {
    let onRetry: () -> Void

    var body: some View {
        ZStack {
            Color.perklyDark.ignoresSafeArea()
            VStack(spacing: 14) {
                Image(systemName: "wifi.exclamationmark")
                    .font(.system(size: 36, weight: .bold))
                    .foregroundColor(.perklyOrange)
                Text("Главная не загрузилась")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(.perklyTextPrimary)
                Text("Проверьте соединение и попробуйте ещё раз.")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(Color.perklyTextPrimary.opacity(0.5))
                    .multilineTextAlignment(.center)
                Button("Повторить", action: onRetry)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.black)
                    .padding(.horizontal, 18)
                    .frame(height: PerklyDesign.Size.minimumTouchTarget)
                    .background(Color.white)
                    .clipShape(Capsule())
                    .buttonStyle(.plain)
            }
            .padding(24)
        }
    }
}

private struct HomeUpdateNotice: View {
    let title: String
    let onRetry: () -> Void

    init(title: String = "Не удалось обновить данные", onRetry: @escaping () -> Void) {
        self.title = title
        self.onRetry = onRetry
    }

    var body: some View {
        HStack(spacing: 11) {
            Image(systemName: "arrow.clockwise.circle.fill")
                .foregroundColor(.perklyOrange)
            Text(L10n.tr(title))
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(Color.perklyTextPrimary.opacity(0.72))
            Spacer()
            Button("Повторить", action: onRetry)
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(.perklyOrange)
                .frame(minHeight: PerklyDesign.Size.minimumTouchTarget)
                .buttonStyle(.plain)
        }
        .padding(.horizontal, 14)
        .background(Color.perklyOverlay.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: PerklyDesign.Radius.control))
    }
}

private struct DailyBonusClaimToast: View {
    let celebration: DailyBonusCelebration
    let onDismiss: () -> Void
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var isPresented = false

    var body: some View {
        Button(action: onDismiss) {
            HStack(spacing: 12) {
                Circle()
                    .fill(Color.perklyOrange.opacity(0.18))
                    .frame(width: 42, height: 42)
                    .overlay {
                    Image(systemName: "flame.fill")
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundStyle(Color.perklyOrange)
                    }

                VStack(alignment: .leading, spacing: 3) {
                    Text("Серия сохранена")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Color.perklyTextPrimary)

                    Text("\(celebration.streakDays) дней подряд · завтра \(celebration.nextMultiplierLabel)")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(Color.perklyTextPrimary.opacity(0.62))
                        .lineLimit(1)
                        .minimumScaleFactor(0.78)
                }

                Spacer(minLength: 6)

                VStack(alignment: .trailing, spacing: 2) {
                    Text("+\(celebration.rewardPoints)")
                        .font(.system(size: 17, weight: .bold, design: .rounded))
                        .foregroundStyle(Color.perklyTextPrimary)
                    Text("баллов")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(Color.perklyTextPrimary.opacity(0.52))
                }

                Image(systemName: "chevron.right")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(Color.perklyTextPrimary.opacity(0.34))
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 11)
            .contentShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
            .perklyGlass(cornerRadius: 22, tint: Color.perklyOrange.opacity(0.12), isInteractive: true)
            .shadow(color: Color.black.opacity(0.2), radius: 18, y: 8)
            .scaleEffect(isPresented ? 1 : 0.98)
            .offset(y: isPresented ? 0 : -8)
            .opacity(isPresented ? 1 : 0)
        }
        .buttonStyle(.plain)
        .onAppear {
            if reduceMotion {
                isPresented = true
            } else {
                withAnimation(.spring(response: 0.42, dampingFraction: 0.86)) {
                    isPresented = true
                }
            }
        }
        .accessibilityLabel("Серия сохранена. Получено \(celebration.rewardPoints) баллов. Серия \(celebration.streakDays) дней")
        .accessibilityHint("Нажмите, чтобы закрыть")
    }
}

private struct SmartHomeBackground: View {
    var body: some View {
        ZStack {
            Color.perklyDark.ignoresSafeArea()

            LinearGradient(
                colors: [
                    Color(red: 5/255, green: 8/255, blue: 14/255),
                    Color.perklyDark,
                    Color.black.opacity(0.98)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 0) {
                RadialGradient(
                    colors: [
                        Color.perklyPurple.opacity(0.2),
                        Color.perklyCyan.opacity(0.08),
                        Color.clear
                    ],
                    center: .topTrailing,
                    startRadius: 20,
                    endRadius: 360
                )
                .frame(height: 340)
                Spacer()
            }
            .ignoresSafeArea()
        }
    }
}

private struct SmartHeroSection: View {
    let user: User?
    let isAuthenticated: Bool
    let primaryAction: HomePriorityAction?
    let feed: HomeFeedResponse?
    let onDailyBonus: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 22) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 7) {
                    Text(todayDateText)
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(Color.perklyTextPrimary.opacity(0.4))
                        .textCase(.uppercase)

                    Text(heroTitle)
                        .font(.largeTitle.weight(.black))
                        .foregroundColor(.perklyTextPrimary)
                        .lineLimit(3)
                        .minimumScaleFactor(0.72)
                        .accessibilityAddTraits(.isHeader)
                }

                Spacer(minLength: 14)

                HomeAvatarBubble(user: user)
            }

            VStack(alignment: .leading, spacing: 11) {
                HStack(spacing: 7) {
                    Image(systemName: heroIcon)
                        .font(.system(size: 12, weight: .black))
                    Text(heroKicker)
                        .font(.system(size: 12, weight: .black))
                }
                .foregroundColor(heroTint)
                .padding(.horizontal, 10)
                .frame(minHeight: 30)
                .background(heroTint.opacity(0.14), in: Capsule())

                Text(heroSubtitle)
                    .font(.system(size: 15, weight: .medium))
                    .foregroundColor(Color.perklyTextPrimary.opacity(0.5))
                    .lineSpacing(2)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Group {
                if let primaryAction {
                    HomeActionLink(action: primaryAction, onDailyBonus: onDailyBonus) {
                        heroButton
                    }
                } else {
                    NavigationLink(value: AppRoute.catalog(nil)) {
                        heroButton
                    }
                }
            }
            .buttonStyle(PerklyPressStyle())
        }
        .padding(.vertical, 8)
    }

    private var heroButton: some View {
        HStack(spacing: 10) {
            Image(systemName: ctaIcon)
                .font(.system(size: 15, weight: .bold))

            Text(ctaTitle)
                .font(.system(size: 16, weight: .black))

            Spacer()

            Image(systemName: "arrow.right")
                .font(.system(size: 14, weight: .bold))
        }
        .foregroundColor(.black)
        .padding(.horizontal, 18)
        .frame(maxWidth: .infinity, minHeight: 56)
        .background(Color.white)
        .clipShape(
            RoundedRectangle(
                cornerRadius: PerklyDesign.Radius.control,
                style: .continuous
            )
        )
    }

    private var heroTitle: String {
        guard isAuthenticated else {
            return L10n.tr("home.identity.hero.guest_title")
        }

        if let bonus = feed?.dailyBonus, bonus.canClaimToday {
            return L10n.format(
                "home.identity.hero.points_now",
                bonus.todayReward.points
            )
        }

        if let bonus = feed?.dailyBonus, bonus.streakAtRisk == true {
            return L10n.format(
                "home.identity.hero.streak",
                bonus.currentStreak
            )
        }

        if let potential = feed?.savingsSummary?.todayPotentialSavings, potential > 0 {
            return L10n.format(
                "home.identity.hero.savings",
                homeMoney(potential)
            )
        }

        return L10n.tr("home.identity.hero.default_title")
    }

    private var heroSubtitle: String {
        guard isAuthenticated else {
            return L10n.tr("home.identity.hero.guest_subtitle")
        }

        if let primaryAction {
            return primaryAction.subtitle
        }

        if let savings = feed?.savingsSummary, savings.totalSaved > 0 {
            return L10n.format(
                "home.identity.hero.saved",
                homeMoney(savings.totalSaved)
            )
        }

        return L10n.tr("home.identity.hero.default_subtitle")
    }

    private var heroKicker: String {
        if feed?.dailyBonus?.canClaimToday == true {
            return L10n.tr("Бонус доступен")
        }
        if let flashCount = feed?.flashDrops.count, flashCount > 0 {
            return L10n.format("home.identity.hero.flash_count", flashCount)
        }
        if let streak = feed?.dailyBonus?.currentStreak, streak > 0 {
            return L10n.format("home.identity.hero.streak_count", streak)
        }
        return L10n.tr(isAuthenticated ? "Подобрано для вас" : "Выгода дня")
    }

    private var heroIcon: String {
        if feed?.dailyBonus?.canClaimToday == true { return "gift.fill" }
        if feed?.dailyBonus?.streakAtRisk == true { return "flame.fill" }
        return "arrow.down.circle.fill"
    }

    private var heroTint: Color {
        if feed?.dailyBonus?.canClaimToday == true { return .perklyOrange }
        if feed?.dailyBonus?.streakAtRisk == true { return .perklyRed }
        return .perklyGreen
    }

    private var ctaTitle: String {
        switch primaryAction?.destination {
        case "daily_bonus": return L10n.tr("Забрать бонус")
        case "transactions": return L10n.tr("Открыть покупки")
        case "chat": return L10n.tr("Открыть сообщения")
        case "wheel": return L10n.tr("Испытать удачу")
        default: return L10n.tr("Смотреть предложения")
        }
    }

    private var ctaIcon: String {
        switch primaryAction?.destination {
        case "daily_bonus": return "gift.fill"
        case "transactions": return "bag.fill"
        case "chat": return "message.fill"
        case "wheel": return "sparkles"
        default: return "magnifyingglass"
        }
    }

    private var todayDateText: String {
        let formatter = DateFormatter()
        formatter.locale = L10n.locale
        formatter.dateFormat = "d MMMM, yyyy"
        return formatter.string(from: Date())
    }
}

private struct HomeAvatarBubble: View {
    let user: User?

    var body: some View {
        ZStack {
            Circle()
                .fill(Color.perklyOverlay.opacity(0.1))
                .frame(width: 58, height: 58)
                .overlay(
                    Circle()
                        .stroke(Color.perklyOverlay.opacity(0.12), lineWidth: 1)
                )

            if let avatarUrl = user?.avatarUrl, let url = RemoteImageURL.url(from: avatarUrl) {
                AsyncImage(url: url) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    initialsView
                }
                .frame(width: 58, height: 58)
                .clipShape(Circle())
            } else {
                initialsView
            }
        }
        .overlay(alignment: .bottomTrailing) {
            Circle()
                .fill(Color.perklyGreen)
                .frame(width: 13, height: 13)
                .overlay(Circle().stroke(Color.perklyDark, lineWidth: 2))
        }
    }

    private var initialsView: some View {
        Text(initials)
            .font(.system(size: 18, weight: .black))
            .foregroundColor(.perklyTextPrimary)
    }

    private var initials: String {
        let source = user?.displayName ?? user?.email?.components(separatedBy: "@").first ?? "P"
        let parts = source
            .split(separator: " ")
            .prefix(2)
            .compactMap { $0.first }
        let value = parts.map(String.init).joined().uppercased()
        return value.isEmpty ? "P" : value
    }
}

private struct HomeValueRail: View {
    let user: User?
    let feed: HomeFeedResponse?
    let isLoading: Bool

    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                if isLoading {
                    ForEach(0..<3, id: \.self) { _ in
                        PerklySkeletonBlock(
                            width: tileWidth,
                            height: tileHeight,
                            cornerRadius: PerklyDesign.Radius.tile
                        )
                    }
                } else {
                    HomeValueTile(
                        icon: "wallet.pass.fill",
                        value: uzs(user?.balance ?? 0),
                        title: "Баланс",
                        subtitle: "Только в сумах",
                        color: .perklyElectricCyan
                    )

                    NavigationLink(value: AppRoute.catalog(nil)) {
                        HomeValueTile(
                            icon: "arrow.down.circle.fill",
                            value: homeMoney(
                                feed?.savingsSummary?.todayPotentialSavings ?? 0
                            ),
                            title: "Сегодня",
                            subtitle: "Можно сэкономить",
                            color: .perklyMint
                        )
                    }

                    NavigationLink(value: AppRoute.fortuneWheel) {
                        HomeValueTile(
                            icon: "gift.fill",
                            value: "\(user?.rewardPoints ?? 0)",
                            title: "Баллы",
                            subtitle: "Ежедневные бонусы",
                            color: .perklyLavender
                        )
                    }

                    NavigationLink(value: AppRoute.purchases) {
                        HomeValueTile(
                            icon: "bag.fill",
                            value: "\(feed?.activeTransactions?.totalActive ?? 0)",
                            title: "Покупки",
                            subtitle: "Активные сейчас",
                            color: .perklyCoral
                        )
                    }
                }
            }
            .padding(.horizontal, 20)
        }
        .buttonStyle(PerklyPressStyle())
    }

    private var tileWidth: CGFloat {
        dynamicTypeSize.isAccessibilitySize ? 210 : 158
    }

    private var tileHeight: CGFloat {
        dynamicTypeSize.isAccessibilitySize ? 184 : 124
    }
}

private struct HomeValueTile: View {
    let icon: String
    let value: String
    let title: String
    let subtitle: String
    let color: Color

    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Image(systemName: icon)
                .font(.system(size: 15, weight: .bold))
                .foregroundStyle(color)
                .frame(width: 32, height: 32)
                .background(color.opacity(0.12))
                .clipShape(Circle())
                .accessibilityHidden(true)

            Spacer(minLength: 14)

            Text(value)
                .font(.system(size: 18, weight: .black, design: .rounded))
                .foregroundStyle(Color.perklyTextPrimary)
                .lineLimit(2)
                .minimumScaleFactor(0.68)

            Text(L10n.tr(title))
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(Color.perklyTextPrimary.opacity(0.72))
                .padding(.top, 3)

            Text(L10n.tr(subtitle))
                .font(.system(size: 10, weight: .medium))
                .foregroundStyle(Color.perklyTextPrimary.opacity(0.34))
                .lineLimit(2)
                .padding(.top, 2)
        }
        .frame(
            width: dynamicTypeSize.isAccessibilitySize ? 180 : 128,
            height: dynamicTypeSize.isAccessibilitySize ? 154 : 94,
            alignment: .leading
        )
        .padding(15)
        .background(Color.perklyOverlay.opacity(0.055))
        .clipShape(
            RoundedRectangle(
                cornerRadius: PerklyDesign.Radius.tile,
                style: .continuous
            )
        )
        .contentShape(
            RoundedRectangle(
                cornerRadius: PerklyDesign.Radius.tile,
                style: .continuous
            )
        )
        .accessibilityElement(children: .combine)
    }
}

private struct OneCardScrollTargetBehavior: ScrollTargetBehavior {
    let spacing: CGFloat

    func updateTarget(_ target: inout ScrollTarget, context: TargetContext) {
        let original = context.originalTarget.rect
        let proposed = target.rect
        let step = original.width + spacing
        let delta = proposed.minX - original.minX

        guard abs(delta) > 1 else {
            target.rect.origin.x = original.minX
            return
        }

        let direction: CGFloat = delta > 0 ? 1 : -1
        let maximumX = max(0, context.contentSize.width - context.containerSize.width)
        target.rect.origin.x = min(max(0, original.minX + direction * step), maximumX)
    }
}

private struct PromoBannerCarousel: View {
    let banners: [HomePromoBanner]
    private let cardHeight: CGFloat = 180

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("Акции дня")
                    .font(.system(size: 28, weight: .black))
                    .foregroundColor(.perklyTextPrimary)

                Spacer()

                Text("сейчас")
                    .font(.system(size: 12, weight: .black))
                    .foregroundColor(.perklyGreen)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(Color.perklyGreen.opacity(0.14))
                    .clipShape(Capsule())
            }
            .padding(.horizontal, 20)

            GeometryReader { proxy in
                let cardWidth = max(278, proxy.size.width - 56)

                ScrollView(.horizontal, showsIndicators: false) {
                    LazyHStack(spacing: 12) {
                        ForEach(Array(banners.prefix(5).enumerated()), id: \.element.id) { index, banner in
                            PromoBannerLink(banner: banner) {
                                PromoBannerCard(banner: banner, index: index)
                                    .frame(width: cardWidth, height: cardHeight)
                                    .contentShape(RoundedRectangle(cornerRadius: 26, style: .continuous))
                            }
                            .buttonStyle(.plain)
                            .simultaneousGesture(
                                TapGesture().onEnded {
                                    AnalyticsService.shared.trackEvent(
                                        eventType: "promo_banner_click",
                                        metadata: [
                                            "bannerId": banner.id,
                                            "index": index,
                                            "destinationType": banner.destinationType
                                        ]
                                    )
                                }
                            )
                        }
                    }
                    .scrollTargetLayout()
                }
                .contentMargins(.horizontal, 20, for: .scrollContent)
                .scrollTargetBehavior(OneCardScrollTargetBehavior(spacing: 12))
                .frame(width: proxy.size.width, height: cardHeight)
                .clipped()
            }
            .frame(height: cardHeight)
        }
        .onAppear {
            AnalyticsService.shared.trackEvent(
                eventType: "promo_banner_impression",
                metadata: ["count": min(banners.count, 5)]
            )
        }
    }
}

private struct PromoBannerLink<Label: View>: View {
    let banner: HomePromoBanner
    @ViewBuilder let label: () -> Label

    var body: some View {
        switch banner.destinationType {
        case "offer":
            if let id = banner.destinationId {
                NavigationLink(value: AppRoute.offer(id), label: label)
            } else {
                NavigationLink(value: AppRoute.catalog(nil), label: label)
            }
        case "wheel":
            NavigationLink(value: AppRoute.fortuneWheel, label: label)
        case "event", "events":
            NavigationLink(destination: FeedView(), label: label)
        default:
            NavigationLink(value: AppRoute.catalog(nil), label: label)
        }
    }
}

private struct PromoBannerCard: View {
    let banner: HomePromoBanner
    let index: Int
    private let cornerRadius: CGFloat = 26

    var body: some View {
        GeometryReader { proxy in
            let cardShape = RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)

            ZStack(alignment: .bottomLeading) {
                promoBackground
                    .frame(width: proxy.size.width, height: proxy.size.height)
                    .clipped()
                    .mask(cardShape)

                Color.black.opacity(0.14)

                LinearGradient(
                    colors: [
                        Color.black.opacity(0.12),
                        Color.black.opacity(0.34),
                        Color.black.opacity(0.9)
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )

                VStack(alignment: .leading, spacing: 7) {
                    HStack {
                        if let badge = banner.badge {
                            Text(badge.uppercased())
                                .font(.system(size: 10, weight: .black))
                                .foregroundColor(.black)
                                .lineLimit(1)
                                .minimumScaleFactor(0.72)
                                .padding(.horizontal, 9)
                                .padding(.vertical, 6)
                                .background(Color.perklyOverlay.opacity(0.9))
                                .clipShape(Capsule())
                        }

                        Spacer()

                        if banner.estimatedSavings > 0 {
                            Text("+\(homeMoney(banner.estimatedSavings))")
                                .font(.system(size: 12, weight: .black))
                                .foregroundColor(.perklyGreen)
                                .lineLimit(1)
                                .minimumScaleFactor(0.72)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 6)
                                .background(Color.black.opacity(0.58))
                                .clipShape(Capsule())
                        }
                    }

                    Spacer()

                    VStack(alignment: .leading, spacing: 7) {
                        Text(banner.title)
                            .font(.system(size: 20, weight: .black))
                            .foregroundColor(.perklyTextPrimary)
                            .lineLimit(2)
                            .minimumScaleFactor(0.72)

                        if let subtitle = banner.subtitle {
                            Text(subtitle)
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(Color.perklyTextPrimary.opacity(0.82))
                                .lineLimit(1)
                                .minimumScaleFactor(0.82)
                        }

                        HStack(spacing: 10) {
                            Text(banner.ctaTitle)
                                .font(.system(size: 14, weight: .black))
                                .foregroundColor(.black)
                                .lineLimit(1)
                                .minimumScaleFactor(0.72)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 8)
                                .background(Color.white)
                                .clipShape(Capsule())

                            Spacer(minLength: 8)

                            Image(systemName: "arrow.up.right")
                                .font(.system(size: 13, weight: .black))
                                .foregroundColor(.perklyTextPrimary)
                                .frame(width: 36, height: 36)
                                .background(Color.perklyOverlay.opacity(0.16))
                                .clipShape(Circle())
                        }
                    }
                    .padding(11)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.black.opacity(0.66))
                    .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 20, style: .continuous)
                            .stroke(Color.perklyOverlay.opacity(0.12), lineWidth: 1)
                    )
                }
                .padding(10)
            }
            .frame(width: proxy.size.width, height: proxy.size.height)
            .background(fallbackGradient)
            .clipShape(cardShape)
            .contentShape(cardShape)
        }
        .clipped()
        .compositingGroup()
        .overlay(
            RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                .strokeBorder(Color.perklyOverlay.opacity(0.08), lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.18), radius: 16, y: 8)
    }

    @ViewBuilder
    private var promoBackground: some View {
        if let imageUrl = banner.imageUrl, let url = RemoteImageURL.url(from: imageUrl) {
            AsyncImage(url: url, transaction: SwiftUI.Transaction(animation: .easeInOut(duration: 0.18))) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .scaledToFill()
                default:
                    fallbackGradient
                }
            }
        } else {
            fallbackGradient
        }
    }

    private var fallbackGradient: some View {
        LinearGradient(
            colors: [
                borderTint.opacity(0.92),
                Color.perklyPurple.opacity(index.isMultiple(of: 2) ? 0.75 : 0.28),
                Color.black.opacity(0.88)
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    private var borderTint: Color {
        switch banner.backgroundStyle {
        case "cyan": return .perklyCyan
        case "green": return .perklyGreen
        case "orange": return .perklyOrange
        default: return .perklyPurple
        }
    }
}

private struct HomeDayMetrics: View {
    let feed: HomeFeedResponse?
    let user: User?
    let isAuthenticated: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Мой день")
                .font(.system(size: 30, weight: .black))
                .foregroundColor(.perklyTextPrimary)

            HStack(spacing: 10) {
                HomeDayMetricCard(
                    icon: "arrow.down.circle.fill",
                    value: homeMoney(feed?.savingsSummary?.todayPotentialSavings ?? 0),
                    title: "можно сэкономить",
                    tint: .perklyGreen
                )

                HomeDayMetricCard(
                    icon: "gift.fill",
                    value: wheelValue,
                    title: "попытки рулетки",
                    tint: .perklyPurple
                )

                HomeDayMetricCard(
                    icon: "flame.fill",
                    value: streakValue,
                    title: isAuthenticated ? "дней подряд" : "бонус дня",
                    tint: .perklyOrange
                )
            }
        }
    }

    private var wheelValue: String {
        guard let wheel = feed?.wheelStatus else { return "3/3" }
        return "\(wheel.spinsRemaining)/\(wheel.dailyLimit)"
    }

    private var streakValue: String {
        guard let streak = feed?.dailyBonus?.currentStreak else { return isAuthenticated ? "0" : "войти" }
        return "\(streak)"
    }
}

private struct HomeDayMetricCard: View {
    let icon: String
    let value: String
    let title: String
    let tint: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 18, weight: .black))
                .foregroundColor(tint)

            Spacer(minLength: 2)

            Text(value)
                .font(.system(size: 26, weight: .black))
                .foregroundColor(.perklyTextPrimary)
                .lineLimit(1)
                .minimumScaleFactor(0.65)

            Text(title)
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(Color.perklyTextPrimary.opacity(0.45))
                .lineLimit(2)
                .minimumScaleFactor(0.82)
        }
        .frame(maxWidth: .infinity, minHeight: 116, alignment: .leading)
        .padding(14)
        .background(Color.perklyOverlay.opacity(0.07))
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .stroke(tint.opacity(0.14), lineWidth: 1)
        )
    }
}

private struct LostSavingsCard: View {
    let lostSavings: HomeLostSavings

    var body: some View {
        NavigationLink(value: AppRoute.catalog(nil)) {
            VStack(alignment: .leading, spacing: 16) {
                HStack(alignment: .top, spacing: 12) {
                    Image(systemName: lostSavings.cashValue > 0 ? "exclamationmark.triangle.fill" : "checkmark.shield.fill")
                        .font(.system(size: 18, weight: .black))
                        .foregroundColor(tint)
                        .frame(width: 42, height: 42)
                        .background(tint.opacity(0.15))
                        .clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))

                    VStack(alignment: .leading, spacing: 5) {
                        Text(lostSavings.title)
                            .font(.system(size: 21, weight: .black))
                            .foregroundColor(.perklyTextPrimary)
                            .lineLimit(2)
                            .minimumScaleFactor(0.78)

                        Text(lostSavings.subtitle)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(Color.perklyTextPrimary.opacity(0.52))
                            .fixedSize(horizontal: false, vertical: true)
                    }

                    Spacer()
                }

                HStack(spacing: 8) {
                    LostSavingsChip(title: "горит", value: homeMoney(lostSavings.expiringSavings), tint: .perklyOrange)
                    LostSavingsChip(title: "wheel", value: "\(lostSavings.wheelAttempts)", tint: .perklyPurple)
                    LostSavingsChip(title: "баллы", value: "\(lostSavings.lostPoints)", tint: .perklyGreen)
                }
            }
            .padding(18)
            .background(Color.perklyOverlay.opacity(lostSavings.cashValue > 0 ? 0.075 : 0.055))
            .clipShape(RoundedRectangle(cornerRadius: 26, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 26, style: .continuous)
                    .stroke(tint.opacity(lostSavings.cashValue > 0 ? 0.28 : 0.1), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }

    private var tint: Color {
        lostSavings.cashValue > 0 ? .perklyRed : .perklyGreen
    }
}

private struct LostSavingsChip: View {
    let title: String
    let value: String
    let tint: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(value)
                .font(.system(size: 14, weight: .black))
                .foregroundColor(.perklyTextPrimary)
                .lineLimit(1)
                .minimumScaleFactor(0.7)

            Text(title)
                .font(.system(size: 9, weight: .bold))
                .foregroundColor(Color.perklyTextPrimary.opacity(0.4))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(tint.opacity(0.11))
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

private struct DailyStreakCard: View {
    let status: HomeDailyBonusStatus
    let multiplier: HomeStreakMultiplier?
    let isClaiming: Bool
    let onClaim: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack(alignment: .top, spacing: 12) {
                ZStack {
                    Circle()
                        .fill(Color.perklyPurple.opacity(0.14))
                        .frame(width: 46, height: 46)

                    Image(systemName: "flame.fill")
                        .font(.system(size: 20, weight: .black))
                        .foregroundColor(.perklyPurple)
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text("\(status.currentStreak) дней подряд")
                        .font(.system(size: 20, weight: .black))
                        .foregroundColor(.perklyTextPrimary)

                    Text(streakSubtitle)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(Color.perklyTextPrimary.opacity(0.52))
                        .fixedSize(horizontal: false, vertical: true)
                }

                Spacer()

                if let multiplier {
                    VStack(spacing: 2) {
                        Text(multiplier.label)
                            .font(.system(size: 16, weight: .black))
                            .foregroundColor(.perklyTextPrimary)
                        Text("BOOST")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(Color.perklyTextPrimary.opacity(0.55))
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 8)
                    .perklyGlass(cornerRadius: 14, tint: Color.perklyPurple.opacity(0.12), isInteractive: false)
                }
            }

            HStack(spacing: 7) {
                ForEach(status.weekProgress) { day in
                    VStack(spacing: 7) {
                        RoundedRectangle(cornerRadius: 9, style: .continuous)
                            .fill(day.claimed ? Color.perklyPurple.opacity(0.9) : Color.perklyOverlay.opacity(0.09))
                            .frame(height: 38)
                            .overlay(
                                Image(systemName: day.claimed ? "checkmark" : "gift")
                                    .font(.system(size: 10, weight: .black))
                                    .foregroundColor(day.claimed ? .white : .white.opacity(0.38))
                            )

                        Text(String(day.label.prefix(2)).capitalized)
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(Color.perklyTextPrimary.opacity(0.38))
                    }
                    .frame(maxWidth: .infinity, alignment: .bottom)
                }
            }
            .frame(height: 68, alignment: .bottom)

            Button(action: {
                HapticManager.shared.lightImpact()
                onClaim()
            }) {
                HStack(spacing: 9) {
                    if isClaiming {
                        ProgressView()
                            .tint(.black)
                    } else {
                        Image(systemName: status.canClaimToday ? "gift.fill" : "checkmark.circle.fill")
                    }

                    Text(status.canClaimToday ? "Забрать +\(status.todayReward.points) баллов" : "Бонус сегодня забран")
                        .font(.system(size: 15, weight: .black))

                    Spacer()

                    Text(status.nextReward.label)
                        .font(.system(size: 11, weight: .black))
                        .foregroundColor(.black.opacity(0.55))
                }
                .foregroundColor(.black)
                .padding(.horizontal, 16)
                .padding(.vertical, 14)
                .background(status.canClaimToday ? Color.white : Color.perklyOverlay.opacity(0.72))
                .clipShape(RoundedRectangle(cornerRadius: 17, style: .continuous))
            }
            .buttonStyle(.plain)
            .disabled(!status.canClaimToday || isClaiming)
        }
        .padding(18)
        .background(Color.perklyOverlay.opacity(0.065))
        .clipShape(RoundedRectangle(cornerRadius: 26, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 26, style: .continuous)
                .stroke(Color.perklyOverlay.opacity(status.canClaimToday ? 0.12 : 0.07), lineWidth: 1)
        )
    }

    private var streakSubtitle: String {
        if let multiplier, multiplier.currentMultiplier > 1 {
            return multiplier.description
        }
        if status.canClaimToday {
            return "Сегодня бонус доступен. Заберите его, чтобы не обнулить привычку."
        }
        return "Зайдите завтра и получите \(status.nextReward.label)."
    }
}

private struct DailyMissionsSection: View {
    let missions: [HomeDailyMission]
    let claimingMissionId: String?
    let onClaim: (HomeDailyMission) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Миссии дня")
                        .font(.system(size: 24, weight: .black))
                        .foregroundColor(.perklyTextPrimary)

                    Text("\(completedCount)/\(missions.count) выполнено · серия увеличивает награды")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(Color.perklyTextPrimary.opacity(0.44))
                }

                Spacer()

                Text("+\(claimablePoints)")
                    .font(.system(size: 13, weight: .black))
                    .foregroundColor(.perklyGreen)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 7)
                    .background(Color.perklyGreen.opacity(0.14))
                    .clipShape(Capsule())
            }

            VStack(spacing: 10) {
                ForEach(missions.sorted { $0.priority > $1.priority }) { mission in
                    DailyMissionRow(
                        mission: mission,
                        isClaiming: claimingMissionId == mission.id,
                        onClaim: { onClaim(mission) }
                    )
                }
            }
        }
        .padding(18)
        .background(Color.perklyOverlay.opacity(0.06))
        .clipShape(RoundedRectangle(cornerRadius: 26, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 26, style: .continuous)
                .stroke(Color.perklyOverlay.opacity(0.07), lineWidth: 1)
        )
    }

    private var completedCount: Int {
        missions.filter(\.completed).count
    }

    private var claimablePoints: Int {
        missions.filter(\.claimable).reduce(0) { $0 + $1.rewardPoints }
    }
}

private struct DailyMissionRow: View {
    let mission: HomeDailyMission
    let isClaiming: Bool
    let onClaim: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: mission.claimed ? "checkmark.circle.fill" : mission.icon)
                .font(.system(size: 15, weight: .black))
                .foregroundColor(tint)
                .frame(width: 34, height: 34)
                .background(tint.opacity(0.14))
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

            VStack(alignment: .leading, spacing: 7) {
                HStack(spacing: 6) {
                    Text(mission.title)
                        .font(.system(size: 13, weight: .black))
                        .foregroundColor(.perklyTextPrimary)
                        .lineLimit(1)
                        .minimumScaleFactor(0.72)

                    Spacer()

                    Text("\(mission.progress)/\(mission.goal)")
                        .font(.system(size: 11, weight: .black))
                        .foregroundColor(Color.perklyTextPrimary.opacity(0.42))
                }

                GeometryReader { proxy in
                    ZStack(alignment: .leading) {
                        Capsule()
                            .fill(Color.perklyOverlay.opacity(0.1))

                        Capsule()
                            .fill(tint)
                            .frame(width: max(8, proxy.size.width * progressRatio))
                    }
                }
                .frame(height: 5)
            }

            Button(action: {
                HapticManager.shared.lightImpact()
                onClaim()
            }) {
                Group {
                    if isClaiming {
                        ProgressView()
                            .tint(.black)
                    } else if mission.claimed {
                        Image(systemName: "checkmark")
                            .font(.system(size: 12, weight: .black))
                    } else {
                        Text("+\(mission.rewardPoints)")
                            .font(.system(size: 12, weight: .black))
                    }
                }
                .foregroundColor(mission.claimable ? .black : .white.opacity(0.34))
                .frame(width: 54, height: 34)
                .background(mission.claimable ? tint : Color.perklyOverlay.opacity(0.08))
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
            .buttonStyle(.plain)
            .disabled(!mission.claimable || isClaiming)
        }
        .padding(12)
        .background(Color.black.opacity(0.16))
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    private var progressRatio: CGFloat {
        guard mission.goal > 0 else { return 0 }
        return CGFloat(min(Double(mission.progress) / Double(mission.goal), 1))
    }

    private var tint: Color {
        homeTint(mission.tint)
    }
}

private struct HomeStatPill: View {
    let title: String
    let value: String
    let icon: String

    var body: some View {
        HStack(spacing: 7) {
            Image(systemName: icon)
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(Color.perklyTextPrimary.opacity(0.54))

            VStack(alignment: .leading, spacing: 1) {
                Text(value)
                    .font(.system(size: 12, weight: .black))
                    .foregroundColor(.perklyTextPrimary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.72)
                Text(title)
                    .font(.system(size: 9, weight: .bold))
                    .foregroundColor(Color.perklyTextPrimary.opacity(0.34))
            }
        }
        .frame(maxWidth: .infinity, minHeight: 48)
        .background(Color.perklyOverlay.opacity(0.06))
        .clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
    }
}

private struct SmartActionRail: View {
    let actions: [HomePriorityAction]
    let onDailyBonus: () -> Void

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                ForEach(actions) { action in
                    HomeActionLink(action: action, onDailyBonus: onDailyBonus) {
                        SmartActionCard(action: action)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 20)
        }
    }
}

private struct SmartActionCard: View {
    let action: HomePriorityAction

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: action.icon)
                    .font(.system(size: 15, weight: .black))
                    .foregroundColor(tint)
                    .frame(width: 34, height: 34)
                    .background(tint.opacity(0.14))
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

                Spacer()

                Text(action.value)
                    .font(.system(size: 15, weight: .black))
                    .foregroundColor(.perklyTextPrimary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(action.title)
                    .font(.system(size: 14, weight: .black))
                    .foregroundColor(.perklyTextPrimary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.78)
                Text(action.subtitle)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(Color.perklyTextPrimary.opacity(0.42))
                    .lineLimit(2)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .frame(width: 148, height: 112)
        .padding(14)
        .background(Color.perklyOverlay.opacity(action.priority > 80 ? 0.085 : 0.055))
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .stroke(tint.opacity(action.priority > 80 ? 0.24 : 0.1), lineWidth: 1)
        )
    }

    private var tint: Color {
        homeTint(action.tint)
    }
}

private struct WeeklyRecapCard: View {
    let recap: HomeWeeklyRecap

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 5) {
                    Text("Итог недели")
                        .font(.system(size: 24, weight: .black))
                        .foregroundColor(.perklyTextPrimary)

                    Text(recap.message)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(Color.perklyTextPrimary.opacity(0.52))
                        .fixedSize(horizontal: false, vertical: true)
                }

                Spacer()

                Image(systemName: "chart.line.uptrend.xyaxis")
                    .font(.system(size: 17, weight: .black))
                    .foregroundColor(.perklyGreen)
                    .frame(width: 38, height: 38)
                    .background(Color.perklyGreen.opacity(0.14))
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            }

            HStack(spacing: 9) {
                WeeklyRecapMetric(value: homeMoney(recap.savedThisWeek), title: "сэкономлено", tint: .perklyGreen)
                WeeklyRecapMetric(value: "\(recap.bonusesClaimed)", title: "бонусов", tint: .perklyOrange)
                WeeklyRecapMetric(value: "\(recap.wheelSpins)", title: "wheel", tint: .perklyPurple)
                WeeklyRecapMetric(value: "\(recap.streakDays)", title: "дней подряд", tint: .perklyCyan)
            }

            if let topCategory = recap.topCategory {
                Text("Лучшее направление недели: \(topCategory)")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(Color.perklyTextPrimary.opacity(0.4))
            }
        }
        .padding(18)
        .background(Color.perklyOverlay.opacity(0.055))
        .clipShape(RoundedRectangle(cornerRadius: 26, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 26, style: .continuous)
                .stroke(Color.perklyOverlay.opacity(0.07), lineWidth: 1)
        )
    }
}

private struct WeeklyRecapMetric: View {
    let value: String
    let title: String
    let tint: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(value)
                .font(.system(size: 15, weight: .black))
                .foregroundColor(.perklyTextPrimary)
                .lineLimit(1)
                .minimumScaleFactor(0.68)

            Text(title)
                .font(.system(size: 9, weight: .bold))
                .foregroundColor(Color.perklyTextPrimary.opacity(0.36))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(10)
        .background(tint.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

private struct HomeTrustStrip: View {
    let feed: HomeFeedResponse?

    var body: some View {
        HStack(spacing: 12) {
            TrustMetric(
                icon: "lock.shield.fill",
                title: "Escrow",
                value: activeText,
                tint: .perklyGreen
            )

            TrustMetric(
                icon: "message.fill",
                title: "Чаты",
                value: unreadText,
                tint: .perklyCyan
            )

            TrustMetric(
                icon: "gift.fill",
                title: "Бонус",
                value: wheelText,
                tint: .perklyPurple
            )
        }
    }

    private var activeText: String {
        guard let active = feed?.activeTransactions?.totalActive else { return "защита" }
        return active > 0 ? "\(active) активн." : "активен"
    }

    private var unreadText: String {
        guard let unread = feed?.unreadChats?.totalUnread else { return "0 новых" }
        return unread > 0 ? "\(unread) новых" : "тихо"
    }

    private var wheelText: String {
        guard let wheel = feed?.wheelStatus else { return "3/day" }
        return "\(wheel.spinsRemaining)/\(wheel.dailyLimit)"
    }
}

private struct TrustMetric: View {
    let icon: String
    let title: String
    let value: String
    let tint: Color

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 12, weight: .black))
                .foregroundColor(tint)
            VStack(alignment: .leading, spacing: 1) {
                Text(value)
                    .font(.system(size: 12, weight: .black))
                    .foregroundColor(.perklyTextPrimary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.75)
                Text(title)
                    .font(.system(size: 9, weight: .bold))
                    .foregroundColor(Color.perklyTextPrimary.opacity(0.35))
            }
        }
        .frame(maxWidth: .infinity, minHeight: 54)
        .background(Color.perklyOverlay.opacity(0.055))
        .clipShape(RoundedRectangle(cornerRadius: 17, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 17, style: .continuous)
                .stroke(Color.perklyOverlay.opacity(0.065), lineWidth: 1)
        )
    }
}

private struct HomeActionLink<Label: View>: View {
    let action: HomePriorityAction
    let onDailyBonus: () -> Void
    @ViewBuilder let label: () -> Label

    var body: some View {
        switch action.destination {
        case "daily_bonus":
            Button(action: onDailyBonus, label: label)
        case "chat":
            NavigationLink(destination: ChatListView(), label: label)
        case "transactions":
            NavigationLink(destination: ActivePurchasesView(), label: label)
        case "squad":
            NavigationLink(destination: SquadView(), label: label)
        case "events":
            NavigationLink(destination: FeedView(), label: label)
        case "seller":
            NavigationLink(value: AppRoute.sell, label: label)
        case "wheel":
            NavigationLink(value: AppRoute.fortuneWheel, label: label)
        default:
            NavigationLink(value: AppRoute.catalog(nil), label: label)
        }
    }
}

private func homeTint(_ value: String) -> Color {
    switch value {
    case "cyan": return .perklyCyan
    case "orange": return .perklyOrange
    case "green": return .perklyGreen
    case "red": return .perklyRed
    case "gold": return .perklyGold
    default: return .perklyPurple
    }
}

private func homeMoney(_ value: Double) -> String {
    if value.rounded() == value || value >= 20 {
        return uzs(value)
    }
    return "\(uzs(value))"
}

// MARK: - Hero Section
struct HeroSection: View {
    var body: some View {
        VStack(spacing: 16) {
            // Badge
            HStack(spacing: 6) {
                Image(systemName: "sparkles")
                    .font(.system(size: 12))
                    .foregroundColor(.perklyPurple)
                Text("Добро пожаловать в будущее цифровой торговли")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.perklyPurple.opacity(0.8))
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(Color.perklyPurple.opacity(0.12))
            .clipShape(Capsule())
            
            // Title
            VStack(spacing: 6) {
                Text("Безопасный и Быстрый")
                    .font(.system(size: 30, weight: .heavy))
                    .foregroundColor(.perklyTextPrimary)
                
                GradientText(
                    text: "Цифровой Маркетплейс",
                    font: .system(size: 30, weight: .heavy)
                )
            }
            .multilineTextAlignment(.center)
            
            // Subtitle
            Text("Находите невероятные скидки на подписки, игры, кафе и многое другое.")
                .font(.system(size: 15))
                .foregroundColor(Color.perklyTextPrimary.opacity(0.4))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 20)
            
            // CTA buttons
            VStack(spacing: 10) {
                NavigationLink(value: AppRoute.catalog(nil)) {
                    HStack(spacing: 8) {
                        Text("Начать Покупки")
                            .font(.system(size: 15, weight: .semibold))
                        Image(systemName: "arrow.right")
                            .font(.system(size: 14, weight: .semibold))
                    }
                    .foregroundColor(.black)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(Color.white)
                    .clipShape(Capsule())
                }
                
                NavigationLink(value: AppRoute.sell) {
                    Text("Продать Товар")
                        .font(.system(size: 15, weight: .medium))
                        .foregroundColor(.perklyTextPrimary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .perklySurface(cornerRadius: 99)
                }
            }
            .padding(.horizontal, 20)
        }
        .padding(.top, 20)
        .padding(.bottom, 40)
        .background(
            // Neon glow behind hero
            RadialGradient(
                colors: [.perklyPurple.opacity(0.15), .clear],
                center: .center,
                startRadius: 20,
                endRadius: 250
            )
        )
    }
}

// MARK: - Flash Drops Section
struct FlashDropsSection: View {
    let drops: [Offer]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            // Header
            HStack {
                HStack(spacing: 6) {
                    Text("Временные Акции")
                        .font(.system(size: 22, weight: .bold))
                        .gradientForeground(.perklyFire)
                    Image(systemName: "flame.fill")
                        .foregroundColor(.perklyOrange)
                }
                Spacer()
                Text("Исчезнут совсем скоро")
                    .font(.system(size: 12))
                    .foregroundColor(Color.perklyTextPrimary.opacity(0.3))
            }
            .padding(.horizontal, 20)
            
            GeometryReader { proxy in
                let cardWidth = max(278, proxy.size.width - 56)

                ScrollView(.horizontal, showsIndicators: false) {
                    LazyHStack(spacing: 12) {
                        ForEach(drops) { drop in
                            NavigationLink(value: AppRoute.offer(drop.id)) {
                                FlashDropCard(offer: drop)
                                    .frame(width: cardWidth)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .scrollTargetLayout()
                }
                .contentMargins(.horizontal, 20, for: .scrollContent)
                .scrollTargetBehavior(OneCardScrollTargetBehavior(spacing: 12))
                .frame(width: proxy.size.width, height: 104)
            }
            .frame(height: 104)
        }
        .background(
            RadialGradient(
                colors: [.perklyOrange.opacity(0.06), .clear],
                center: .center,
                startRadius: 50,
                endRadius: 300
            )
        )
    }
}

// MARK: - Flash Drop Card
struct FlashDropCard: View {
    let offer: Offer
    
    var body: some View {
        HStack(spacing: 14) {
            // Image/Logo
            ZStack {
                RoundedRectangle(cornerRadius: 14)
                    .fill(Color.perklyOverlay.opacity(0.05))
                    .frame(width: 68, height: 68)
                
                if let url = RemoteImageURL.url(from: offer.safeProductThumbnail) {
                    AsyncImage(url: url) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .padding(10)
                    } placeholder: {
                        Image(systemName: "flame.fill")
                            .font(.title2)
                            .foregroundColor(.perklyOrange.opacity(0.8))
                    }
                    .frame(width: 68, height: 68)
                } else {
                    Image(systemName: "flame.fill")
                        .font(.title2)
                        .foregroundColor(.perklyOrange.opacity(0.8))
                }
            }
            
            // Info
            VStack(alignment: .leading, spacing: 6) {
                Text(offer.safeTitle)
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(.perklyTextPrimary)
                    .lineLimit(1)
                
                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    Text("\(uzs(offer.safePrice))")
                        .font(.system(size: 17, weight: .heavy))
                        .foregroundColor(.perklyTextPrimary)
                    
                    if let original = offer.originalPrice {
                        Text("\(uzs(original))")
                            .font(.system(size: 12))
                            .foregroundColor(Color.perklyTextPrimary.opacity(0.25))
                            .strikethrough()
                    }
                }
                
                if let hours = offer.hoursLeft, hours > 0 {
                    CountdownTimer(hours: hours)
                }
            }
            
            Spacer()
            
            // Buy button
            Text("Забрать")
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(.perklyTextPrimary)
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(Color.primaryGradient)
                .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .padding(14)
        .perklySurface(cornerRadius: 18)
    }
}

// MARK: - Wheel Banner
struct WheelBanner: View {
    var status: WheelStatusResponse? = nil

    var body: some View {
        NavigationLink(value: AppRoute.fortuneWheel) {
            HStack(spacing: 20) {
                VStack(alignment: .leading, spacing: 8) {
                    HStack(spacing: 6) {
                        Image(systemName: "gift.fill")
                            .font(.system(size: 12))
                        Text("Испытайте Удачу")
                            .font(.system(size: 12, weight: .semibold))
                    }
                    .foregroundColor(.perklyPurple)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(Color.perklyPurple.opacity(0.15))
                    .clipShape(Capsule())
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Колесо Фортуны")
                            .font(.system(size: 22, weight: .heavy))
                            .foregroundColor(.perklyTextPrimary)
                        Text(statusText)
                            .font(.system(size: 22, weight: .heavy))
                            .foregroundColor(.perklyPurple)
                    }
                    
                    Text(subtitleText)
                        .font(.system(size: 13))
                        .foregroundColor(Color.perklyTextPrimary.opacity(0.4))
                        .lineLimit(2)
                }
                
                Spacer()
                
                // Wheel preview
                ZStack {
                    Circle()
                        .fill(Color.perklyPurple.opacity(0.15))
                        .frame(width: 80, height: 80)
                        .blur(radius: 15)
                    
                    Circle()
                        .fill(Color.primaryGradient)
                        .frame(width: 60, height: 60)
                    
                    Circle()
                        .fill(Color.perklyPurple.opacity(0.5))
                        .frame(width: 40, height: 40)
                    
                    Text("P")
                        .font(.system(size: 24, weight: .black))
                        .foregroundColor(.perklyTextPrimary)
                }
                .overlay(alignment: .bottomTrailing) {
                    if let status {
                        Text("\(status.spinsRemaining)/\(status.dailyLimit)")
                            .font(.system(size: 10, weight: .black))
                            .foregroundColor(.black)
                            .padding(.horizontal, 7)
                            .padding(.vertical, 4)
                            .background(Color.white)
                            .clipShape(Capsule())
                            .offset(x: 4, y: 6)
                    }
                }
            }
            .padding(24)
            .perklySurface(cornerRadius: 22)
            .overlay(
                // Glow
                RoundedRectangle(cornerRadius: 22)
                    .fill(
                        RadialGradient(
                            colors: [.perklyPurple.opacity(0.08), .clear],
                            center: .topTrailing,
                            startRadius: 10,
                            endRadius: 180
                        )
                    )
                    .allowsHitTesting(false)
            )
        }
        .buttonStyle(.plain)
    }

    private var statusText: String {
        guard let status else { return "Баллы Perkly" }
        if status.spinsRemaining == 0 { return "Завтра снова" }
        if status.spinsRemaining == 1 { return "1 попытка" }
        return "\(status.spinsRemaining) попытки"
    }

    private var subtitleText: String {
        guard let status else { return "Крутите рулетку и выигрывайте бесплатные промокоды!" }
        if status.spinsRemaining == 0 {
            return "Сегодня лимит исчерпан. Новые попытки появятся после обновления."
        }
        return "Daily-бонус доступен сейчас. Осталось \(status.spinsRemaining) из \(status.dailyLimit)."
    }
}

// MARK: - AR Discovery Banner
struct ARDiscoveryBanner: View {
    let onTap: () -> Void
    
    @State private var pulseScale: CGFloat = 1.0
    @State private var glowOpacity: Double = 0.4
    @State private var scanLineOffset: CGFloat = -80
    
    var body: some View {
        Button(action: {
            HapticManager.shared.lightImpact()
            onTap()
        }) {
            ZStack {
                // Deep dark background
                RoundedRectangle(cornerRadius: 24)
                    .fill(
                        LinearGradient(
                            colors: [
                                Color(red: 0.04, green: 0.04, blue: 0.12),
                                Color(red: 0.06, green: 0.02, blue: 0.18)
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                
                // Animated scan line
                RoundedRectangle(cornerRadius: 24)
                    .fill(
                        LinearGradient(
                            colors: [
                                Color.clear,
                                Color.perklyPurple.opacity(0.12),
                                Color.clear
                            ],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    .frame(height: 30)
                    .offset(y: scanLineOffset)
                    .clipped()
                
                // Border glow
                RoundedRectangle(cornerRadius: 24)
                    .stroke(
                        LinearGradient(
                            colors: [
                                Color.perklyPurple.opacity(glowOpacity),
                                Color(red: 0.4, green: 0.0, blue: 1.0).opacity(glowOpacity * 0.6),
                                Color.perklyPurple.opacity(glowOpacity * 0.2)
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 1.5
                    )
                
                // Content
                HStack(spacing: 18) {
                    // Camera icon with pulsing rings
                    ZStack {
                        // Outer pulsing ring
                        Circle()
                            .stroke(Color.perklyPurple.opacity(0.2), lineWidth: 1)
                            .frame(width: 72, height: 72)
                            .scaleEffect(pulseScale)
                        
                        // Mid ring
                        Circle()
                            .stroke(Color.perklyPurple.opacity(0.15), lineWidth: 1.5)
                            .frame(width: 58, height: 58)
                        
                        // Inner filled circle
                        Circle()
                            .fill(Color.perklyPurple.opacity(0.15))
                            .frame(width: 52, height: 52)
                            .overlay(
                                Circle()
                                    .stroke(Color.perklyPurple.opacity(0.4), lineWidth: 1)
                            )
                        
                        Image(systemName: "camera.viewfinder")
                            .font(.system(size: 26, weight: .light))
                            .foregroundStyle(
                                LinearGradient(
                                    colors: [Color.white, Color.perklyPurple],
                                    startPoint: .top,
                                    endPoint: .bottom
                                )
                            )
                    }
                    
                    VStack(alignment: .leading, spacing: 6) {
                        HStack(spacing: 6) {
                            // Blinking AR badge
                            Text("AR")
                                .font(.system(size: 10, weight: .black))
                                .foregroundColor(.black)
                                .padding(.horizontal, 7)
                                .padding(.vertical, 3)
                                .background(Color.perklyPurple)
                                .clipShape(Capsule())
                            
                            Text("НОВАЯ ФУНКЦИЯ")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(.perklyPurple.opacity(0.8))
                                .tracking(0.5)
                        }
                        
                        Text("Режим Дополненной\nРеальности")
                            .font(.system(size: 20, weight: .heavy))
                            .foregroundColor(.perklyTextPrimary)
                            .lineSpacing(2)
                        
                        Text("Наведите камеру — и скидки появятся прямо в воздухе вокруг вас")
                            .font(.system(size: 12))
                            .foregroundColor(Color.perklyTextPrimary.opacity(0.45))
                            .lineSpacing(2)
                    }
                    
                    Spacer()
                    
                    // Arrow
                    ZStack {
                        Circle()
                            .fill(Color.perklyPurple.opacity(0.15))
                            .frame(width: 36, height: 36)
                        Image(systemName: "arrow.right")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.perklyPurple)
                    }
                }
                .padding(20)
            }
            .frame(height: 130)
            .shadow(color: Color.perklyPurple.opacity(0.3), radius: 20, x: 0, y: 8)
        }
        .buttonStyle(.plain)
        .onAppear {
            // Pulse animation
            withAnimation(
                .easeInOut(duration: 1.8).repeatForever(autoreverses: true)
            ) {
                pulseScale = 1.18
                glowOpacity = 0.9
            }
            // Scan line animation
            withAnimation(
                .linear(duration: 2.5).repeatForever(autoreverses: false)
            ) {
                scanLineOffset = 80
            }
        }
    }
}

// MARK: - Categories Section
struct CategoriesSection: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Категории Товаров")
                .font(.system(size: 22, weight: .bold))
                .foregroundColor(.perklyTextPrimary)
                .padding(.horizontal, 20)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    ForEach(Constants.Category.allCases, id: \.rawValue) { cat in
                        NavigationLink(value: AppRoute.catalog(cat.rawValue)) {
                            CategoryCard(category: cat)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 20)
            }
        }
    }
}

struct CategoryCard: View {
    let category: Constants.Category
    
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            ZStack {
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.primaryGradient)
                    .frame(width: 42, height: 42)
                
                Image(systemName: category.icon)
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundColor(.perklyTextPrimary)
            }
            
            Text(category.displayName)
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(.perklyTextPrimary)
                .lineLimit(1)
            
            Text(L10n.tr("category.open"))
                .font(.system(size: 11))
                .foregroundColor(Color.perklyTextPrimary.opacity(0.3))
        }
        .frame(width: 140)
        .padding(18)
        .perklySurface(cornerRadius: 18)
    }
}

// MARK: - Events Section
private struct HomeEventsSection: View {
    let events: [HomeEventItem]

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("События рядом")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(.perklyTextPrimary)
                    Text("Topka, городские активности и то, что стоит не пропустить.")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(Color.perklyTextPrimary.opacity(0.42))
                }

                Spacer()

                NavigationLink(destination: FeedView()) {
                    Image(systemName: "arrow.right")
                        .font(.system(size: 13, weight: .black))
                        .foregroundColor(.perklyTextPrimary)
                        .frame(width: 34, height: 34)
                        .background(Color.perklyOverlay.opacity(0.08))
                        .clipShape(Circle())
                }
            }
            .padding(.horizontal, 20)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(events.prefix(6)) { item in
                        HomeEventCard(item: item)
                    }
                }
                .padding(.horizontal, 20)
            }
        }
    }
}

private struct HomeEventCard: View {
    let item: HomeEventItem

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ZStack(alignment: .topLeading) {
                if let url = RemoteImageURL.url(from: item.event.imageUrl) {
                    AsyncImage(url: url) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Color.perklyOverlay.opacity(0.05)
                    }
                } else {
                    Color.perklyOverlay.opacity(0.05)
                }

                LinearGradient(
                    colors: [Color.black.opacity(0.02), Color.black.opacity(0.52)],
                    startPoint: .top,
                    endPoint: .bottom
                )

                HStack(spacing: 6) {
                    ForEach(item.badges.prefix(2)) { badge in
                        Text(badge.text)
                            .font(.system(size: 10, weight: .black))
                            .foregroundColor(.perklyTextPrimary)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 5)
                            .background(Color.perklyOrange.opacity(0.9))
                            .clipShape(Capsule())
                    }
                }
                .padding(10)
            }
            .frame(width: 220, height: 124)
            .clipped()

            VStack(alignment: .leading, spacing: 7) {
                Text(item.event.title)
                    .font(.system(size: 15, weight: .black))
                    .foregroundColor(.perklyTextPrimary)
                    .lineLimit(2)

                HStack(spacing: 7) {
                    Label(item.event.shortDisplayDate, systemImage: "calendar")
                    Text("•")
                    Text(item.event.location)
                        .lineLimit(1)
                }
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(Color.perklyTextPrimary.opacity(0.45))
            }
            .padding(13)
        }
        .frame(width: 220)
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .background(Color.perklyOverlay.opacity(0.055))
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .stroke(Color.perklyOverlay.opacity(0.065), lineWidth: 1)
        )
    }
}

// MARK: - Trending Section
struct TrendingSection: View {
    let offers: [Offer]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("Популярные Сделки")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundColor(.perklyTextPrimary)
                
                Spacer()
                
                NavigationLink(value: AppRoute.catalog(nil)) {
                    HStack(spacing: 4) {
                        Text("Все")
                            .font(.system(size: 13))
                        Image(systemName: "arrow.right")
                            .font(.system(size: 12))
                    }
                    .foregroundColor(.perklyPurple)
                }
            }
            .padding(.horizontal, 20)
            
            if offers.isEmpty {
                Text("Новых предложений пока нет")
                    .foregroundColor(Color.perklyTextPrimary.opacity(0.5))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 40)
            } else {
                LazyVGrid(columns: [
                    GridItem(.flexible(), spacing: 12),
                    GridItem(.flexible(), spacing: 12)
                ], spacing: 12) {
                    ForEach(offers) { offer in
                        NavigationLink(value: AppRoute.offer(offer.id)) {
                            OfferCard(offer: offer)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 20)
            }
        }
    }
}

// MARK: - Offer Card
struct OfferCard: View {
    let offer: Offer
    var badges: [OfferBadge] = []
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Image area
            ZStack(alignment: .topLeading) {
                if let url = RemoteImageURL.url(from: offer.safeProductThumbnail) {
                    AsyncImage(url: url) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .padding(20)
                    } placeholder: {
                        Image(systemName: "bag.fill")
                            .font(.system(size: 32))
                            .foregroundColor(Color.perklyTextPrimary.opacity(0.2))
                    }
                } else {
                    Image(systemName: "bag.fill")
                        .font(.system(size: 32))
                        .foregroundColor(Color.perklyTextPrimary.opacity(0.2))
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 120)
            .background(Color.perklyOverlay.opacity(0.04))
            .overlay(alignment: .topLeading) {
                // Category badge
                Text(offer.safeCategory)
                    .font(.system(size: 9, weight: .semibold))
                    .textCase(.uppercase)
                    .tracking(0.5)
                    .foregroundColor(Color.perklyTextPrimary.opacity(0.8))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.perklyOverlay.opacity(0.1))
                    .clipShape(Capsule())
                    .padding(10)
            }
            .overlay(alignment: .topTrailing) {
                if !badges.isEmpty {
                    VStack(alignment: .trailing, spacing: 6) {
                        ForEach(badges) { badge in
                            Text(badge.text)
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(.perklyTextPrimary)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 5)
                                .background(color(for: badge.style).opacity(0.9))
                                .clipShape(Capsule())
                        }
                    }
                    .padding(10)
                }
            }
            
            // Info
            VStack(alignment: .leading, spacing: 8) {
                Text(offer.safeTitle)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.perklyTextPrimary)
                    .lineLimit(2)
                
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        if let original = offer.originalPrice {
                            Text("\(uzs(original))")
                                .font(.system(size: 11))
                                .foregroundColor(Color.perklyTextPrimary.opacity(0.25))
                                .strikethrough()
                        }
                        Text("\(uzs(offer.safePrice))")
                            .font(.system(size: 16, weight: .heavy))
                            .gradientForeground(.perklyGreen)
                    }
                    
                    Spacer()
                    
                    Text("Купить")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.perklyTextPrimary)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 7)
                        .background(Color.primaryGradient)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                }
            }
            .padding(14)
        }
        .clipShape(RoundedRectangle(cornerRadius: 18))
        .perklySurface(cornerRadius: 18)
    }

    private func color(for style: OfferBadge.Style) -> Color {
        switch style {
        case .distance:
            return .perklyCyan
        case .urgency:
            return .perklyOrange
        case .status:
            return .perklyGreen
        case .tier:
            return .perklyPurple
        }
    }
}
