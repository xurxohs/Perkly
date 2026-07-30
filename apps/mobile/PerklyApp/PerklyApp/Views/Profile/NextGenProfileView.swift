import SwiftUI
import CoreLocation
import UserNotifications

struct NextGenProfileView: View {
    @EnvironmentObject var authVM: AuthViewModel
    @Environment(\.scenePhase) private var scenePhase
    @StateObject private var vm = ProfileViewModel()

    @State private var showTopUp = false
    @State private var showSubscriptionSheet = false
    @State private var showEditProfile = false
    @State private var showPointsCard = false
    @State private var showPointsCardSetup = false
    @State private var activeChatRoom: ChatRoom?
    @State private var chatError: String?
    @AppStorage("perkly_profile_show_today") private var showTodayModule = true
    @AppStorage("perkly_profile_show_path") private var showPathModule = false
    @AppStorage("perkly_profile_show_purchases") private var showPurchasesModule = true
    @AppStorage("perkly_profile_show_recommendations") private var showRecommendationsModule = true
    @AppStorage("perkly_profile_show_seller") private var showSellerModule = false
    @AppStorage("perkly_profile_show_security") private var showSecurityModule = false

    var body: some View {
        ZStack {
            NGProfileBackground()

            if !authVM.isAuthenticated {
                NGGuestProfileView()
            } else if let user = authVM.user {
                profileContent(for: user)
            }
        }
        .navigationTitle("")
        .navigationBarHidden(true)
        .navigationDestination(for: AppRoute.self) { route in
            switch route {
            case .purchases:
                ActivePurchasesView()
            case .purchase(let transactionId):
                PurchaseCenterView(transactionId: transactionId)
            case .chats:
                ChatListView()
            case .sessions:
                ActiveSessionsView()
            case .offer(let offerId):
                OfferDetailView(offerId: offerId)
            case .catalog(let category):
                CatalogView(initialCategory: category)
            case .fortuneWheel:
                FortuneWheelView()
            case .sell:
                SellerDashboardView()
            }
        }
        .sheet(isPresented: $showEditProfile) {
            if let user = authVM.user {
                NextGenEditProfileView(user: user) { updated in
                    authVM.user = updated
                    Task { await vm.loadOverview(for: updated) }
                }
                .presentationDetents([.large])
                .presentationDragIndicator(.visible)
            }
        }
        .sheet(isPresented: $showTopUp) {
            TopUpSheet(vm: vm, onSuccess: refreshProfile)
                .presentationDetents([.large])
                .presentationDragIndicator(.visible)
        }
        .sheet(isPresented: $showSubscriptionSheet) {
            if let user = authVM.user {
                SubscriptionSheet(
                    currentTier: user.tierEnum,
                    initialCapabilities: vm.partnerCapabilities,
                    onSuccess: refreshProfile
                )
                .presentationDetents([.large])
                .presentationDragIndicator(.visible)
            }
        }
        .fullScreenCover(isPresented: $showPointsCard) {
            if let user = authVM.user {
                PerklyPointsCardDetail(user: user)
            }
        }
        .fullScreenCover(isPresented: $showPointsCardSetup) {
            PerklyPointsCardSetupView(
                onUpgrade: {
                    showPointsCardSetup = false
                    Task { @MainActor in
                        try? await Task.sleep(for: .milliseconds(260))
                        showSubscriptionSheet = true
                    }
                }
            )
        }
        .fullScreenCover(item: $activeChatRoom) { room in
            NavigationStack {
                ChatRoomView(room: room)
                    .environmentObject(authVM)
            }
        }
        .alert("Не удалось открыть чат", isPresented: .init(get: { chatError != nil }, set: { if !$0 { chatError = nil } })) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(chatError ?? "Попробуйте позже")
        }
        .task(id: profileLoadKey) {
            guard authVM.isAuthenticated else { return }
            await vm.loadOverview(for: authVM.user)
        }
        .onChange(of: scenePhase) { _, phase in
            guard phase == .active, vm.lastDepositId != nil else { return }
            Task {
                if await vm.waitForPendingTopUp() {
                    refreshProfile()
                }
            }
        }
        .safeAreaInset(edge: .top, spacing: 0) {
            if vm.lastDepositId != nil, let status = vm.topUpStatusText {
                HStack(spacing: 11) {
                    if vm.isWaitingForTopUp {
                        ProgressView().tint(.perklyPurple)
                    } else {
                        Image(systemName: "clock.badge.checkmark")
                            .foregroundStyle(Color.perklyPurple)
                    }
                    VStack(alignment: .leading, spacing: 2) {
                        Text(status)
                            .font(.system(size: 13, weight: .bold))
                        Text("Статус Click обновится автоматически")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(Color.perklyTextPrimary.opacity(0.44))
                    }
                    Spacer()
                }
                .foregroundStyle(Color.perklyTextPrimary)
                .padding(.horizontal, 14)
                .frame(height: 58)
                .perklyGlass(cornerRadius: 20, tint: Color.perklyPurple.opacity(0.1), isInteractive: false)
                .padding(.horizontal, 12)
                .padding(.top, 5)
            }
        }
        .alert("Баланс пополнен", isPresented: $vm.topUpSuccess) {
            Button("Готово", role: .cancel) {}
        } message: {
            Text("Средства уже доступны на балансе Perkly.")
        }
    }

    private func profileContent(for user: User) -> some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(alignment: .leading, spacing: 0) {
                NGReferenceProfileHeader(
                    user: user,
                    onEdit: { showEditProfile = true }
                )
                .padding(.horizontal, 20)

                Button {
                    HapticManager.shared.lightImpact()
                    if user.tierEnum == .platinum {
                        showPointsCard = true
                    } else {
                        showPointsCardSetup = true
                    }
                } label: {
                    PerklyPointsCard(
                        isUnlocked: user.tierEnum == .platinum
                    )
                }
                .buttonStyle(PerklyPressStyle())
                .padding(.horizontal, 20)
                .padding(.top, 18)

                NGReferenceIdentityBadges(user: user)
                    .padding(.horizontal, 20)
                    .padding(.top, 14)

                NGReferenceBenefitRail(
                    user: user,
                    stats: vm.stats,
                    isLoading: vm.isLoading && vm.stats == nil,
                    onTopUp: { showTopUp = true },
                    onSubscription: { showSubscriptionSheet = true }
                )
                .padding(.top, 30)

                if let error = vm.error, vm.stats == nil {
                    NGProfileInlineStatus(
                        title: "Не всё загрузилось",
                        message: error
                    ) {
                        Task { await vm.loadOverview(for: authVM.user) }
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 18)
                }

                VStack(spacing: 0) {
                    NavigationLink(destination: NearbyAlertsSettingsView()) {
                        NGReferenceMenuRow(
                            icon: "bell",
                            title: "Уведомления",
                            subtitle: "Покупки, сообщения и предложения рядом"
                        )
                    }

                    NGReferenceDivider()

                    NavigationLink(destination: NGSecurityCenterView(user: user)) {
                        NGReferenceMenuRow(
                            icon: "checkmark.shield",
                            title: "Безопасность",
                            subtitle: "Пароль, устройства и защита входа"
                        )
                    }

                    NGReferenceDivider()

                    NavigationLink {
                        NGProfileSettingsView(
                            user: user,
                            capabilities: vm.partnerCapabilities,
                            showToday: $showTodayModule,
                            showPath: $showPathModule,
                            showPurchases: $showPurchasesModule,
                            showRecommendations: $showRecommendationsModule,
                            showSeller: $showSellerModule,
                            showSecurity: $showSecurityModule,
                            onEditProfile: { showEditProfile = true },
                            onLogout: { authVM.logout() }
                        )
                    } label: {
                        NGReferenceMenuRow(
                            icon: "slider.horizontal.3",
                            title: "Настройки",
                            subtitle: "Аккаунт и данные приложения"
                        )
                    }

                    NGReferenceDivider()

                    NavigationLink(destination: DisputeListView()) {
                        NGReferenceMenuRow(
                            icon: "person.2.wave.2",
                            title: "Поддержка",
                            subtitle: "Помощь, жалобы и спорные покупки"
                        )
                    }

                    NGReferenceDivider()

                    if let termsURL = URL(string: "https://perkly.uz/terms") {
                        Link(destination: termsURL) {
                        NGReferenceMenuRow(
                            icon: "doc.text",
                            title: "Условия использования",
                            subtitle: nil,
                            external: true
                        )
                        }
                    }
                }
                .buttonStyle(PerklyPressStyle())
                .padding(.horizontal, 20)
                .padding(.top, 30)

                NGReferenceSectionTitle("Отдельные пространства")
                    .padding(.horizontal, 20)
                    .padding(.top, 34)

                VStack(spacing: 0) {
                    NavigationLink(destination: SellerDashboardView()) {
                        NGReferenceMenuRow(
                            icon: "storefront",
                            title: "Для бизнеса",
                            subtitle: "Товары, продажи и аналитика"
                        )
                    }

                    if user.roleEnum == .admin {
                        NGReferenceDivider()

                        NavigationLink(destination: AdminControlCenterView()) {
                            NGReferenceMenuRow(
                                icon: "shield.lefthalf.filled",
                                title: "Управление Perkly",
                                subtitle: "Модерация, операции и мониторинг"
                            )
                        }
                    }
                }
                .buttonStyle(PerklyPressStyle())
                .padding(.horizontal, 20)

                Text(appVersionText)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(Color.perklyTextPrimary.opacity(0.32))
                    .padding(.horizontal, 20)
                    .padding(.top, 34)
            }
            .padding(.top, 18)
            .padding(.bottom, 44)
        }
        .safeAreaPadding(.top, 10)
        .refreshable {
            await authVM.refreshUser()
            await vm.loadOverview(for: authVM.user)
        }
    }

    private var profileLoadKey: String {
        [
            authVM.isAuthenticated ? "auth" : "guest",
            authVM.user?.id ?? "",
            authVM.user?.tier ?? "",
            authVM.user?.updatedAt ?? ""
        ].joined(separator: "|")
    }

    private var hasActivePurchases: Bool {
        vm.transactions.contains { transaction in
            transaction.statusEnum == .escrow ||
            transaction.statusEnum == .paid ||
            transaction.statusEnum == .activated ||
            transaction.isTimeActive
        }
    }

    private var hasRecommendations: Bool {
        !vm.historyOffers.isEmpty || !vm.nearbyOffers.isEmpty || !vm.tierOffers.isEmpty
    }

    private var appVersionText: String {
        let version = Bundle.main.object(
            forInfoDictionaryKey: "CFBundleShortVersionString"
        ) as? String ?? "1.0"
        let build = Bundle.main.object(
            forInfoDictionaryKey: "CFBundleVersion"
        ) as? String ?? "1"
        return "Perkly \(version) (\(build))"
    }

    private func refreshProfile() {
        Task {
            await authVM.refreshUser()
            await vm.loadOverview(for: authVM.user)
        }
    }

    private var attentionCount: Int {
        var count = 0
        count += vm.transactions.filter { $0.statusEnum == .escrow }.count
        if vm.wheelStatus?.canSpin == true { count += 1 }
        if vm.partnerCapabilities?.status == "EXPIRED" { count += 1 }
        return count
    }

    private func smartStatusText(for user: User) -> String {
        if vm.partnerCapabilities?.status == "EXPIRED" {
            return "Подписка ждёт обновления"
        }
        if vm.transactions.contains(where: { $0.statusEnum == .escrow }) {
            return "Есть сделки на подтверждение"
        }
        if vm.wheelStatus?.canSpin == true {
            return "Доступен ежедневный бонус"
        }
        if user.tierEnum == .platinum {
            return "Платиновый режим активен"
        }
        return "Профиль готов к выгоде"
    }

    private func openSellerChat(for transaction: Transaction) async {
        guard let sellerId = transaction.offer?.sellerId else {
            chatError = "Продавец для этой покупки не найден."
            return
        }

        do {
            activeChatRoom = try await ChatService.shared.createOrGetDirectRoom(targetUserId: sellerId)
        } catch {
            chatError = error.localizedDescription
        }
    }
}

private struct NGProfileBackground: View {
    var body: some View {
        ZStack {
            Color.perklyDark.ignoresSafeArea()

            RadialGradient(
                colors: [
                    Color.perklyPurple.opacity(0.08),
                    Color.clear
                ],
                center: .topTrailing,
                startRadius: 0,
                endRadius: 320
            )
            .ignoresSafeArea()
        }
    }
}

private struct NGGuestProfileView: View {
    var body: some View {
        VStack(spacing: 24) {
            Image(systemName: "person.crop.circle.badge.plus")
                .font(.system(size: 72))
                .foregroundStyle(Color.primaryGradient)

            VStack(spacing: 8) {
                Text("Войдите в Perkly")
                    .font(.system(size: 26, weight: .bold))
                    .foregroundColor(.perklyTextPrimary)

                Text("Баланс, покупки, подарки и персональные рекомендации появятся в одном профиле.")
                    .font(.system(size: 15))
                    .foregroundColor(Color.perklyTextPrimary.opacity(0.55))
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(.horizontal, 34)

            NavigationLink(destination: LoginView()) {
                Text("Войти или зарегистрироваться")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.black)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(Color.white)
                    .clipShape(RoundedRectangle(cornerRadius: 18))
            }
            .padding(.horizontal, 34)
        }
    }
}

private struct NGReferenceProfileHeader: View {
    let user: User
    let onEdit: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 22) {
            HStack(alignment: .top) {
                NGReferenceAvatar(user: user)

                Spacer()

                Button {
                    HapticManager.shared.lightImpact()
                    onEdit()
                } label: {
                    Image(systemName: "pencil")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(Color.perklyTextPrimary)
                        .frame(
                            width: PerklyDesign.Size.minimumTouchTarget,
                            height: PerklyDesign.Size.minimumTouchTarget
                        )
                        .perklyGlass(
                            cornerRadius: 16,
                            tint: Color.perklyOverlay.opacity(0.02),
                            isInteractive: true
                        )
                }
                .buttonStyle(PerklyPressStyle())
                .accessibilityLabel("Изменить профиль")
            }

            VStack(alignment: .leading, spacing: 7) {
                Text(contactText)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Color.perklyTextPrimary.opacity(0.48))
                    .lineLimit(1)

                Text(primaryName)
                    .font(.largeTitle.weight(.black))
                    .foregroundStyle(Color.perklyTextPrimary)
                    .lineLimit(2)
                    .minimumScaleFactor(0.72)

                if let secondaryName {
                    Text(secondaryName)
                        .font(.largeTitle.weight(.black))
                        .foregroundStyle(Color.perklyTextPrimary.opacity(0.34))
                        .lineLimit(2)
                        .minimumScaleFactor(0.72)
                }
            }

        }
        .accessibilityElement(children: .contain)
    }

    private var nameParts: [String] {
        let name = (user.displayName ?? "")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        return name.isEmpty ? ["Пользователь"] : name.split(separator: " ").map(String.init)
    }

    private var primaryName: String {
        nameParts.first ?? "Пользователь"
    }

    private var secondaryName: String? {
        guard nameParts.count > 1 else { return nil }
        return nameParts.dropFirst().joined(separator: " ")
    }

    private var contactText: String {
        if let phone = user.phone, !phone.isEmpty { return phone }
        if let email = user.email, !email.isEmpty { return email }
        return "Профиль Perkly"
    }
}

private struct NGReferenceIdentityBadges: View {
    let user: User

    var body: some View {
        HStack(spacing: 9) {
            TierBadge(tier: user.tierEnum, compact: true)

            Label(
                user.telegramId == nil ? "Perkly ID" : "Telegram подключён",
                systemImage: user.telegramId == nil
                    ? "person.text.rectangle"
                    : "checkmark.seal.fill"
            )
            .font(.system(size: 11, weight: .bold))
            .foregroundStyle(Color.perklyTextPrimary.opacity(0.6))
            .padding(.horizontal, 10)
            .frame(minHeight: 30)
            .background(Color.perklyOverlay.opacity(0.06), in: Capsule())

            Spacer()
        }
    }
}

private struct NGReferenceAvatar: View {
    let user: User

    var body: some View {
        ZStack {
            Circle()
                .fill(Color.perklyOverlay.opacity(0.075))

            if let avatarUrl = user.avatarUrl,
               let url = RemoteImageURL.url(from: avatarUrl) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFill()
                    default:
                        initials
                    }
                }
            } else {
                initials
            }
        }
        .frame(width: 82, height: 82)
        .clipShape(Circle())
        .overlay {
            Circle()
                .stroke(Color.perklyOverlay.opacity(0.08), lineWidth: 1)
        }
        .accessibilityHidden(true)
    }

    private var initials: some View {
        Text(initialsText)
            .font(.system(size: 26, weight: .bold))
            .foregroundStyle(Color.perklyTextPrimary.opacity(0.58))
    }

    private var initialsText: String {
        let source = user.displayName ?? user.email ?? "P"
        let value = source
            .split(separator: " ")
            .prefix(2)
            .compactMap(\.first)
            .map(String.init)
            .joined()
            .uppercased()
        return value.isEmpty ? "P" : value
    }
}

private struct NGReferenceBenefitRail: View {
    let user: User
    let stats: UserStats?
    let isLoading: Bool
    let onTopUp: () -> Void
    let onSubscription: () -> Void

    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    var body: some View {
        Group {
            if isLoading {
                PerklySkeletonBlock(
                    height: dynamicTypeSize.isAccessibilitySize ? 278 : 154,
                    cornerRadius: 26
                )
            } else {
                VStack(spacing: 0) {
                    Button(action: onTopUp) {
                        HStack(spacing: 13) {
                            Image(systemName: "wallet.pass.fill")
                                .font(.system(size: 17, weight: .bold))
                                .foregroundStyle(Color.perklyCyan)
                                .frame(width: 38, height: 38)
                                .background(Color.perklyCyan.opacity(0.12), in: RoundedRectangle(cornerRadius: 12))

                            VStack(alignment: .leading, spacing: 2) {
                                Text("Баланс")
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundStyle(Color.perklyTextPrimary.opacity(0.42))
                                Text(uzs(user.balance ?? 0))
                                    .font(.system(size: 19, weight: .black, design: .rounded))
                                    .foregroundStyle(Color.perklyTextPrimary)
                                    .lineLimit(1)
                                    .minimumScaleFactor(0.68)
                            }

                            Spacer()

                            Text("Пополнить")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundStyle(Color.perklyTextPrimary.opacity(0.7))
                            Image(systemName: "chevron.right")
                                .font(.system(size: 10, weight: .black))
                                .foregroundStyle(Color.perklyTextPrimary.opacity(0.28))
                        }
                        .padding(.horizontal, 15)
                        .frame(minHeight: 64)
                    }

                    NGReferenceDivider()

                    quickActions
                }
                .perklySurface(cornerRadius: 26)
            }
        }
        .padding(.horizontal, 20)
        .buttonStyle(PerklyPressStyle())
    }

    @ViewBuilder
    private var quickActions: some View {
        if dynamicTypeSize.isAccessibilitySize {
            VStack(spacing: 0) {
                NavigationLink(destination: FortuneWheelView()) {
                    NGReferenceQuickAction(icon: "gift.fill", title: "Бонус", value: "Крутить", tint: .perklyLavender, horizontal: true)
                }
                NGReferenceDivider()
                NavigationLink(destination: ActivePurchasesView()) {
                    NGReferenceQuickAction(icon: "bag.fill", title: "Покупки", value: "\(stats?.totalPurchases ?? 0)", tint: .perklyMint, horizontal: true)
                }
                NGReferenceDivider()
                Button(action: onSubscription) {
                    NGReferenceQuickAction(icon: user.tierEnum.icon, title: "Perkly Pass", value: user.tierEnum.displayName, tint: .perklyCoral, horizontal: true)
                }
            }
        } else {
            HStack(spacing: 0) {
                NavigationLink(destination: FortuneWheelView()) {
                    NGReferenceQuickAction(icon: "gift.fill", title: "Бонус", value: "Крутить", tint: .perklyLavender)
                }
                NGReferenceVerticalDivider()
                NavigationLink(destination: ActivePurchasesView()) {
                    NGReferenceQuickAction(icon: "bag.fill", title: "Покупки", value: "\(stats?.totalPurchases ?? 0)", tint: .perklyMint)
                }
                NGReferenceVerticalDivider()
                Button(action: onSubscription) {
                    NGReferenceQuickAction(icon: user.tierEnum.icon, title: "Pass", value: user.tierEnum.displayName, tint: .perklyCoral)
                }
            }
        }
    }
}

private struct NGReferenceQuickAction: View {
    let icon: String
    let title: String
    let value: String
    let tint: Color
    var horizontal = false

    var body: some View {
        Group {
            if horizontal {
                HStack(spacing: 13) {
                    actionIcon
                    actionText
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.system(size: 10, weight: .black))
                        .foregroundStyle(Color.perklyTextPrimary.opacity(0.24))
                }
                .padding(.horizontal, 15)
                .frame(minHeight: 64)
            } else {
                VStack(alignment: .leading, spacing: 7) {
                    actionIcon
                    actionText
                }
                .padding(12)
                .frame(maxWidth: .infinity, minHeight: 84, alignment: .leading)
            }
        }
        .accessibilityElement(children: .combine)
    }

    private var actionIcon: some View {
        Image(systemName: icon)
            .font(.system(size: 15, weight: .bold))
            .foregroundStyle(tint)
    }

    private var actionText: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title)
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(Color.perklyTextPrimary.opacity(0.42))
            Text(value)
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(Color.perklyTextPrimary)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
    }
}

private struct NGReferenceVerticalDivider: View {
    var body: some View {
        Rectangle()
            .fill(Color.perklyOverlay.opacity(0.07))
            .frame(width: 1)
            .padding(.vertical, 12)
    }
}

private struct NGReferenceMenuRow: View {
    let icon: String
    let title: String
    var subtitle: String?
    var external = false

    var body: some View {
        HStack(spacing: 16) {
            Image(systemName: icon)
                .font(.system(size: 21, weight: .medium))
                .foregroundStyle(Color.perklyTextPrimary.opacity(0.92))
                .frame(width: 30)
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 3) {
                Text(L10n.tr(title))
                    .font(.headline.weight(.bold))
                    .foregroundStyle(Color.perklyTextPrimary)

                if let subtitle {
                    Text(L10n.tr(subtitle))
                        .font(.caption.weight(.medium))
                        .foregroundStyle(Color.perklyTextPrimary.opacity(0.4))
                        .lineLimit(2)
                }
            }

            Spacer(minLength: 12)

            Image(systemName: external ? "arrow.up.right" : "chevron.right")
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(Color.perklyTextPrimary.opacity(0.72))
                .accessibilityHidden(true)
        }
        .frame(maxWidth: .infinity, minHeight: 68, alignment: .leading)
        .contentShape(Rectangle())
        .accessibilityElement(children: .combine)
    }
}

private struct NGReferenceDivider: View {
    var body: some View {
        Rectangle()
            .fill(Color.perklyOverlay.opacity(0.07))
            .frame(height: 1)
            .padding(.leading, 46)
            .accessibilityHidden(true)
    }
}

private struct NGReferenceSectionTitle: View {
    let title: String

    init(_ title: String) {
        self.title = title
    }

    var body: some View {
        Text(L10n.tr(title).uppercased())
            .font(.system(size: 11, weight: .black))
            .tracking(1.2)
            .foregroundStyle(Color.perklyTextPrimary.opacity(0.3))
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct NGProfileInlineStatus: View {
    let title: String
    let message: String
    let onRetry: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "arrow.clockwise")
                .foregroundStyle(Color.perklyOrange)
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 2) {
                Text(L10n.tr(title))
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(Color.perklyTextPrimary)
                Text(L10n.tr(message))
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(Color.perklyTextPrimary.opacity(0.42))
                    .lineLimit(2)
            }

            Spacer()

            Button("Повторить", action: onRetry)
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(Color.perklyTextPrimary)
                .frame(minHeight: PerklyDesign.Size.minimumTouchTarget)
        }
        .padding(.horizontal, 14)
        .perklySurface(cornerRadius: 18)
    }
}

private struct NGProfileTopBar: View {
    let onEdit: () -> Void

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("Perkly")
                    .font(.system(size: 12, weight: .black))
                    .foregroundColor(Color.perklyTextPrimary.opacity(0.45))
                    .textCase(.uppercase)
                Text("Профиль")
                    .font(.system(size: 22, weight: .heavy))
                    .foregroundColor(.perklyTextPrimary)
            }

            Spacer()

            Button {
                HapticManager.shared.lightImpact()
                onEdit()
            } label: {
                Image(systemName: "slider.horizontal.3")
                    .font(.headline.weight(.bold))
                    .foregroundColor(.perklyTextPrimary)
                    .frame(width: PerklyDesign.Size.minimumTouchTarget, height: PerklyDesign.Size.minimumTouchTarget)
                    .ngGlass(cornerRadius: 15)
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 20)
    }
}

private struct NGProfileHero: View {
    let user: User
    let attentionCount: Int
    let statusText: String
    let onEdit: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack(alignment: .top, spacing: 16) {
                NGLivingAvatar(user: user, onEdit: onEdit)

                VStack(alignment: .leading, spacing: 10) {
                    HStack(spacing: 8) {
                        TierBadge(tier: user.tierEnum, compact: true)
                        NGTrustChip(icon: "checkmark.seal.fill", text: user.telegramId == nil ? "Perkly ID" : "Telegram")
                    }

                    VStack(alignment: .leading, spacing: 3) {
                        Text(user.displayName ?? "Пользователь")
                            .font(.system(size: 28, weight: .heavy))
                            .foregroundColor(.perklyTextPrimary)
                            .lineLimit(2)
                            .minimumScaleFactor(0.82)

                        Text(user.email ?? "Профиль Perkly")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(Color.perklyTextPrimary.opacity(0.45))
                            .lineLimit(1)
                    }
                }
            }

            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(attentionCount == 0 ? "Сегодня спокойно" : "В фокусе: \(attentionCount)")
                        .font(.system(size: 17, weight: .bold))
                        .foregroundColor(.perklyTextPrimary)

                    Text(statusText)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(Color.perklyTextPrimary.opacity(0.55))
                        .lineLimit(2)
                }

                Spacer(minLength: 0)
            }
            .padding(15)
            .background(
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .fill(
                        LinearGradient(
                            colors: [Color.perklyOverlay.opacity(0.095), Color.perklyOverlay.opacity(0.035)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
            )
            .overlay(
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .stroke(Color.perklyOverlay.opacity(0.08), lineWidth: 1)
            )
        }
        .padding(18)
        .ngGlass(cornerRadius: 28)
        .shadow(color: .black.opacity(0.26), radius: 22, y: 14)
    }
}

private struct NGLivingAvatar: View {
    let user: User
    let onEdit: () -> Void
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var pulse = false

    var body: some View {
        Button {
            HapticManager.shared.lightImpact()
            onEdit()
        } label: {
            ZStack {
                Circle()
                    .stroke(
                        AngularGradient(
                            colors: [.perklyCyan, .perklyPurple, .perklyGold, .perklyGreen, .perklyCyan],
                            center: .center
                        ),
                        lineWidth: 3
                    )
                    .frame(width: 94, height: 94)
                    .scaleEffect(pulse ? 1.05 : 0.98)
                    .opacity(pulse ? 0.9 : 0.55)

                Circle()
                    .fill(Color.perklyOverlay.opacity(0.06))
                    .frame(width: 84, height: 84)

                if let avatarUrl = user.avatarUrl, let url = RemoteImageURL.url(from: avatarUrl) {
                    AsyncImage(url: url) { image in
                        image.resizable().aspectRatio(contentMode: .fill)
                    } placeholder: {
                        avatarPlaceholder
                    }
                    .frame(width: 78, height: 78)
                    .clipShape(Circle())
                } else {
                    avatarPlaceholder
                        .frame(width: 78, height: 78)
                }

                Image(systemName: "plus")
                    .font(.system(size: 12, weight: .black))
                    .foregroundColor(.black)
                    .frame(width: 26, height: 26)
                    .background(Color.white)
                    .clipShape(Circle())
                    .offset(x: 30, y: 30)
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Изменить фотографию профиля")
        .onAppear {
            guard !reduceMotion else { return }
            withAnimation(.easeInOut(duration: 2.2).repeatForever(autoreverses: true)) {
                pulse.toggle()
            }
        }
    }

    private var avatarPlaceholder: some View {
        ZStack {
            LinearGradient(
                colors: [.perklyPurple, .perklyCyan, .perklyGold.opacity(0.85)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            Text(String((user.displayName ?? "P").prefix(1)).uppercased())
                .font(.system(size: 32, weight: .black))
                .foregroundColor(.perklyTextPrimary)
        }
        .clipShape(Circle())
    }
}

private struct NGTrustChip: View {
    let icon: String
    let text: String

    var body: some View {
        HStack(spacing: 5) {
            Image(systemName: icon)
                .font(.system(size: 10, weight: .bold))
            Text(text)
                .font(.system(size: 11, weight: .bold))
                .lineLimit(1)
        }
        .foregroundColor(Color.perklyTextPrimary.opacity(0.78))
        .padding(.horizontal, 9)
        .padding(.vertical, 6)
        .background(Color.perklyOverlay.opacity(0.08))
        .clipShape(Capsule())
    }
}

private struct NGQuickActionDock: View {
    let onTopUp: () -> Void

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                NGQuickActionButton(icon: "plus.circle.fill", title: "Пополнить", tint: .perklyGreen, action: onTopUp)
                NGQuickActionLink(icon: "sparkles", title: "Колесо", tint: .perklyGold, destination: FortuneWheelView())
                NGQuickActionLink(icon: "gift.fill", title: "Подарки", tint: .perklyOrange, destination: GiftCodesView())
                NGQuickActionLink(icon: "person.3.fill", title: "Команда", tint: .perklyCyan, destination: SquadView())
                NGQuickActionLink(icon: "message.fill", title: "Чат", tint: .perklyPurple, destination: ChatListView())
            }
            .padding(.horizontal, 1)
        }
    }
}

private struct NGQuickActionButton: View {
    let icon: String
    let title: String
    let tint: Color
    let action: () -> Void

    var body: some View {
        Button {
            HapticManager.shared.lightImpact()
            action()
        } label: {
            NGQuickActionContent(icon: icon, title: title, tint: tint)
        }
        .buttonStyle(.plain)
    }
}

private struct NGQuickActionLink<Destination: View>: View {
    let icon: String
    let title: String
    let tint: Color
    let destination: Destination

    var body: some View {
        NavigationLink(destination: destination) {
            NGQuickActionContent(icon: icon, title: title, tint: tint)
        }
        .buttonStyle(.plain)
        .simultaneousGesture(TapGesture().onEnded { HapticManager.shared.playSelection() })
    }
}

private struct NGQuickActionContent: View {
    let icon: String
    let title: String
    let tint: Color

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(tint)
                .frame(width: PerklyDesign.Size.minimumTouchTarget, height: PerklyDesign.Size.minimumTouchTarget)
                .background(tint.opacity(0.13))
                .clipShape(RoundedRectangle(cornerRadius: 15))

            Text(title)
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(Color.perklyTextPrimary.opacity(0.82))
                .lineLimit(1)
                .minimumScaleFactor(0.82)
        }
        .frame(width: 78, height: 86)
        .ngGlass(cornerRadius: 20)
    }
}

private struct NGStatsRail: View {
    let user: User
    let stats: UserStats?
    let onTopUp: () -> Void

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                Button(action: onTopUp) {
                    NGMetricTile(
                        icon: "wallet.pass.fill",
                        title: "Баланс",
                        value: "\(uzs(user.balance ?? 0))",
                        subtitle: "пополнить",
                        tint: .perklyGreen,
                        progress: nil
                    )
                }
                .buttonStyle(.plain)

                NGMetricTile(
                    icon: "bolt.fill",
                    title: "Баллы",
                    value: "\(user.rewardPoints ?? 0)",
                    subtitle: "≈ \(uzs(PerklyMoney.rewardPointsValue(user.rewardPoints ?? 0)))",
                    tint: .perklyGold,
                    progress: min(Double(user.rewardPoints ?? 0) / 2000, 1)
                )

                NavigationLink(destination: ActivePurchasesView()) {
                    NGMetricTile(
                        icon: "bag.fill",
                        title: "Покупки",
                        value: "\(stats?.totalPurchases ?? 0)",
                        subtitle: "\(stats?.reviewsCount ?? 0) отзывов",
                        tint: .perklyPurple,
                        progress: min(Double(stats?.totalPurchases ?? 0) / 10, 1)
                    )
                }
                .buttonStyle(.plain)

            }
            .padding(.horizontal, 20)
        }
    }

}

private struct NGMetricTile: View {
    let icon: String
    let title: String
    let value: String
    let subtitle: String
    let tint: Color
    let progress: Double?

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Image(systemName: icon)
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(tint)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 10, weight: .black))
                    .foregroundColor(Color.perklyTextPrimary.opacity(0.18))
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(value)
                    .font(.system(size: 23, weight: .heavy))
                    .foregroundColor(.perklyTextPrimary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.72)
                Text(L10n.tr(title))
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(Color.perklyTextPrimary.opacity(0.52))
                Text(subtitle)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(tint.opacity(0.88))
                    .lineLimit(1)
                    .minimumScaleFactor(0.75)
            }

            if let progress {
                GeometryReader { proxy in
                    ZStack(alignment: .leading) {
                        Capsule().fill(Color.perklyOverlay.opacity(0.08))
                        Capsule()
                            .fill(tint)
                            .frame(width: proxy.size.width * max(0, min(progress, 1)))
                    }
                }
                .frame(height: 4)
            }
        }
        .frame(width: 146, height: 138, alignment: .topLeading)
        .padding(14)
        .ngGlass(cornerRadius: 22)
    }
}

private struct NGModuleFrame<Content: View>: View {
    let title: String
    let content: Content

    init(
        title: String,
        @ViewBuilder content: () -> Content
    ) {
        self.title = title
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 10) {
                Text(L10n.tr(title))
                    .font(.system(size: 13, weight: .black))
                    .foregroundColor(Color.perklyTextPrimary.opacity(0.46))
                    .textCase(.uppercase)

                Spacer()

            }

            content
        }
        .padding(16)
        .ngGlass(cornerRadius: 24)
    }
}

private struct NGTodayItem: Identifiable {
    let id = UUID()
    let icon: String
    let title: String
    let subtitle: String
    let tint: Color
    let destination: NGTodayDestination
}

private enum NGTodayDestination {
    case purchases
    case wheel
    case recommendations
    case security
}

private struct NGTodayModule: View {
    let transactions: [Transaction]
    let wheelStatus: WheelStatusResponse?
    let hasLocation: Bool
    let onEnableLocation: () -> Void

    private var items: [NGTodayItem] {
        var result: [NGTodayItem] = []
        let escrowCount = transactions.filter { $0.statusEnum == .escrow }.count
        if escrowCount > 0 {
            result.append(
                NGTodayItem(
                    icon: "lock.shield.fill",
                    title: "\(escrowCount) сделка ждёт",
                    subtitle: "Подтвердите получение или откройте чат",
                    tint: .perklyGold,
                    destination: .purchases
                )
            )
        }

        if wheelStatus?.canSpin == true {
            result.append(
                NGTodayItem(
                    icon: "sparkles",
                    title: "Ежедневный бонус",
                    subtitle: wheelStatus.map { "Доступно \($0.spinsRemaining) из \($0.dailyLimit) попыток" } ?? "Доступны ежедневные попытки",
                    tint: .perklyOrange,
                    destination: .wheel
                )
            )
        }

        if !hasLocation {
            result.append(
                NGTodayItem(
                    icon: "location.fill",
                    title: "Офферы рядом",
                    subtitle: "Включите гео для быстрых находок",
                    tint: .perklyCyan,
                    destination: .recommendations
                )
            )
        }

        if result.isEmpty {
            result.append(
                NGTodayItem(
                    icon: "checkmark.seal.fill",
                    title: "Профиль в порядке",
                    subtitle: "Мы покажем действия, когда появится повод",
                    tint: .perklyGreen,
                    destination: .security
                )
            )
        }

        return result
    }

    var body: some View {
        VStack(spacing: 10) {
            ForEach(items.prefix(3)) { item in
                switch item.destination {
                case .purchases:
                    NavigationLink(destination: ActivePurchasesView()) {
                        NGTodayRow(item: item)
                    }
                    .buttonStyle(.plain)
                case .wheel:
                    NavigationLink(destination: FortuneWheelView()) {
                        NGTodayRow(item: item)
                    }
                    .buttonStyle(.plain)
                case .recommendations:
                    Button {
                        HapticManager.shared.lightImpact()
                        onEnableLocation()
                    } label: {
                        NGTodayRow(item: item)
                    }
                    .buttonStyle(.plain)
                case .security:
                    NGTodayRow(item: item)
                }
            }
        }
    }
}

private struct NGTodayRow: View {
    let item: NGTodayItem

    var body: some View {
        HStack(spacing: 13) {
            Image(systemName: item.icon)
                .font(.system(size: 16, weight: .bold))
                .foregroundColor(item.tint)
                .frame(width: PerklyDesign.Size.minimumTouchTarget, height: PerklyDesign.Size.minimumTouchTarget)
                .background(item.tint.opacity(0.13))
                .clipShape(RoundedRectangle(cornerRadius: 15))

            VStack(alignment: .leading, spacing: 3) {
                Text(item.title)
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(.perklyTextPrimary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.85)
                Text(item.subtitle)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(Color.perklyTextPrimary.opacity(0.45))
                    .lineLimit(2)
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.system(size: 11, weight: .black))
                .foregroundColor(Color.perklyTextPrimary.opacity(0.2))
        }
        .padding(12)
        .background(Color.perklyOverlay.opacity(0.045))
        .clipShape(RoundedRectangle(cornerRadius: 18))
    }
}

private struct NGPerklyPathModule: View {
    let user: User
    let stats: UserStats?

    private var nextTierText: String {
        switch user.tierEnum {
        case .silver: return "Gold"
        case .gold: return "Platinum"
        case .platinum: return "Max"
        }
    }

    private var target: Double {
        switch user.tierEnum {
        case .silver: return 100
        case .gold: return 300
        case .platinum: return max(stats?.totalSpent ?? 1, 1)
        }
    }

    private var progress: Double {
        if user.tierEnum == .platinum { return 1 }
        return min((stats?.totalSpent ?? 0) / target, 1)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(user.tierEnum == .platinum ? "Максимальный статус" : "До \(nextTierText)")
                        .font(.system(size: 20, weight: .heavy))
                        .foregroundColor(.perklyTextPrimary)

                    Text(user.tierEnum == .platinum ? "Ваш профиль уже на верхнем уровне" : "Покупки, отзывы и активность двигают прогресс")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(Color.perklyTextPrimary.opacity(0.48))
                }

                Spacer()

                Text("\(Int(progress * 100))%")
                    .font(.system(size: 24, weight: .heavy))
                    .foregroundColor(.perklyTextPrimary)
            }

            GeometryReader { proxy in
                ZStack(alignment: .leading) {
                    Capsule().fill(Color.perklyOverlay.opacity(0.08))
                    Capsule()
                        .fill(LinearGradient(colors: [.perklyGreen, .perklyCyan, .perklyGold], startPoint: .leading, endPoint: .trailing))
                        .frame(width: proxy.size.width * progress)
                }
            }
            .frame(height: 8)

            HStack(spacing: 10) {
                NGPathMilestone(title: "Покупки", value: "\(stats?.totalPurchases ?? 0)", tint: .perklyGreen)
                NGPathMilestone(title: "Отзывы", value: "\(stats?.reviewsCount ?? 0)", tint: .perklyGold)
                NGPathMilestone(title: "Объём", value: "\(uzs(stats?.totalSpent ?? 0))", tint: .perklyCyan)
            }
        }
    }
}

private struct NGPathMilestone: View {
    let title: String
    let value: String
    let tint: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(value)
                .font(.system(size: 16, weight: .heavy))
                .foregroundColor(.perklyTextPrimary)
                .lineLimit(1)
                .minimumScaleFactor(0.78)
            Text(L10n.tr(title))
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(tint.opacity(0.9))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(tint.opacity(0.09))
        .clipShape(RoundedRectangle(cornerRadius: 15))
    }
}

private struct NGActivePurchasesModule: View {
    let transactions: [Transaction]

    private var active: [Transaction] {
        transactions
            .filter { tx in
                tx.statusEnum == .escrow ||
                tx.statusEnum == .paid ||
                tx.statusEnum == .activated ||
                tx.statusEnum == .completed ||
                tx.isTimeActive
            }
            .prefix(3)
            .map { $0 }
    }

    var body: some View {
        VStack(spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(active.isEmpty ? "Пока пусто" : "\(active.count) активных")
                        .font(.system(size: 20, weight: .heavy))
                        .foregroundColor(.perklyTextPrimary)
                    Text("Купоны, защищённые сделки и активные предложения")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(Color.perklyTextPrimary.opacity(0.45))
                }

                Spacer()

                NavigationLink(destination: ActivePurchasesView()) {
                    Image(systemName: "arrow.up.right")
                        .font(.system(size: 13, weight: .black))
                        .foregroundColor(.black)
                        .frame(width: 34, height: 34)
                        .background(Color.white)
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
            }

            if active.isEmpty {
                Text("Когда появятся купоны или сделки, профиль сам поднимет их наверх.")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(Color.perklyTextPrimary.opacity(0.42))
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(14)
                    .background(Color.perklyOverlay.opacity(0.045))
                    .clipShape(RoundedRectangle(cornerRadius: 16))
            } else {
                ForEach(active) { transaction in
                    HStack(spacing: 12) {
                        Image(systemName: transaction.statusEnum.icon)
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(transaction.statusEnum == .escrow ? .perklyGold : .perklyGreen)
                            .frame(width: 34, height: 34)
                            .background(Color.perklyOverlay.opacity(0.06))
                            .clipShape(Circle())

                        VStack(alignment: .leading, spacing: 2) {
                            Text(transaction.offer?.safeTitle ?? "Покупка")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(.perklyTextPrimary)
                                .lineLimit(1)
                            Text(transaction.statusEnum.displayName)
                                .font(.system(size: 11, weight: .medium))
                                .foregroundColor(Color.perklyTextPrimary.opacity(0.42))
                        }

                        Spacer()

                        Text("\(uzs(transaction.price))")
                            .font(.system(size: 13, weight: .heavy))
                            .foregroundColor(.perklyTextPrimary)
                    }
                    .padding(11)
                    .background(Color.perklyOverlay.opacity(0.04))
                    .clipShape(RoundedRectangle(cornerRadius: 15))
                }
            }
        }
    }
}

private struct NGRecommendationsModule: View {
    let personalized: [RecommendedOffer]
    let nearby: [RecommendedOffer]
    let tierOffers: [RecommendedOffer]
    let hasLocation: Bool
    let tier: UserTier
    let onEnableLocation: () -> Void

    private var headlineOffers: [RecommendedOffer] {
        Array((nearby + personalized + tierOffers).prefix(6))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(hasLocation ? "Рядом и по вкусу" : "Персональная витрина")
                        .font(.system(size: 20, weight: .heavy))
                        .foregroundColor(.perklyTextPrimary)
                    Text("Подборка меняется по покупкам, местоположению и статусу \(tier.displayName)")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(Color.perklyTextPrimary.opacity(0.45))
                }

                Spacer()

                if !hasLocation {
                    Button {
                        HapticManager.shared.lightImpact()
                        onEnableLocation()
                    } label: {
                        Image(systemName: "location.fill")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(.black)
                            .frame(width: 34, height: 34)
                            .background(Color.white)
                            .clipShape(Circle())
                    }
                    .buttonStyle(.plain)
                }
            }

            if headlineOffers.isEmpty {
                Text("Как только появится больше истории, этот блок станет точнее.")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(Color.perklyTextPrimary.opacity(0.42))
                    .padding(14)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.perklyOverlay.opacity(0.045))
                    .clipShape(RoundedRectangle(cornerRadius: 16))
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        ForEach(headlineOffers) { recommended in
                            NavigationLink(destination: OfferDetailView(offerId: recommended.offer.id)) {
                                NGOfferMiniCard(recommendedOffer: recommended)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
        }
    }
}

private struct NGOfferMiniCard: View {
    let recommendedOffer: RecommendedOffer

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(recommendedOffer.offer.safeCategory)
                    .font(.system(size: 10, weight: .black))
                    .foregroundColor(.perklyCyan)
                    .lineLimit(1)
                Spacer()
                if let discount = recommendedOffer.offer.discountPercent, discount > 0 {
                    Text("-\(discount)%")
                        .font(.system(size: 11, weight: .black))
                        .foregroundColor(.black)
                        .padding(.horizontal, 7)
                        .padding(.vertical, 4)
                        .background(Color.perklyGold)
                        .clipShape(Capsule())
                }
            }

            Text(recommendedOffer.offer.safeTitle)
                .font(.system(size: 14, weight: .heavy))
                .foregroundColor(.perklyTextPrimary)
                .lineLimit(2)
                .frame(height: 36, alignment: .topLeading)

            HStack {
                Text("\(uzs(recommendedOffer.offer.safePrice))")
                    .font(.system(size: 14, weight: .heavy))
                    .foregroundColor(.perklyTextPrimary)
                Spacer()
                Image(systemName: "arrow.up.right")
                    .font(.system(size: 10, weight: .black))
                    .foregroundColor(Color.perklyTextPrimary.opacity(0.42))
            }
        }
        .frame(width: 154, height: 128, alignment: .topLeading)
        .padding(12)
        .background(Color.perklyOverlay.opacity(0.045))
        .clipShape(RoundedRectangle(cornerRadius: 18))
        .overlay(
            RoundedRectangle(cornerRadius: 18)
                .stroke(Color.perklyOverlay.opacity(0.06), lineWidth: 1)
        )
    }
}

private struct NGSellerModeModule: View {
    let capabilities: PartnerCapabilities
    let onUpgrade: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(capabilities.planName)
                        .font(.system(size: 21, weight: .heavy))
                        .foregroundColor(.perklyTextPrimary)
                    Text(capabilities.timerSubtitle)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(Color.perklyTextPrimary.opacity(0.45))
                        .lineLimit(2)
                }

                Spacer()

                NavigationLink(destination: SellerDashboardView()) {
                    Image(systemName: "chart.bar.xaxis")
                        .font(.system(size: 14, weight: .black))
                        .foregroundColor(.black)
                        .frame(width: 36, height: 36)
                        .background(Color.white)
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
            }

            HStack(spacing: 10) {
                NGCapabilityCell(title: "Офферы", value: usageText(capabilities.usage.activeOffers, limit: capabilities.limits.offersLimit), tint: .perklyGreen)
                NGCapabilityCell(title: "Topka", value: usageText(capabilities.usage.topkaPublishedThisMonth, limit: capabilities.limits.topkaMonthlyLimit), tint: .perklyPurple)
                NGCapabilityCell(title: "Featured", value: "\(capabilities.limits.featuredOffersPerMonth)", tint: .perklyGold)
            }

            if let upgrade = capabilities.upgrade {
                Button {
                    HapticManager.shared.lightImpact()
                    onUpgrade()
                } label: {
                    HStack {
                        Text(upgrade.ctaTitle)
                            .font(.system(size: 13, weight: .bold))
                        Spacer()
                        Image(systemName: "arrow.up.right")
                    }
                    .foregroundColor(.perklyTextPrimary)
                    .padding(12)
                    .background(Color.perklyOverlay.opacity(0.07))
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func usageText(_ used: Int, limit: Int) -> String {
        limit < 0 ? "\(used)/∞" : "\(used)/\(limit)"
    }
}

private struct NGCapabilityCell: View {
    let title: String
    let value: String
    let tint: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(value)
                .font(.system(size: 16, weight: .heavy))
                .foregroundColor(.perklyTextPrimary)
                .lineLimit(1)
                .minimumScaleFactor(0.76)
            Text(L10n.tr(title))
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(tint.opacity(0.9))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(tint.opacity(0.09))
        .clipShape(RoundedRectangle(cornerRadius: 15))
    }
}

private struct NGSecurityModule: View {
    let user: User

    var body: some View {
        VStack(spacing: 10) {
            NGSecurityRow(icon: "paperplane.fill", title: "Telegram", subtitle: user.telegramId == nil ? "Не подключён" : "Подключён", isActive: user.telegramId != nil, tint: .perklyCyan)
            NGSecurityRow(icon: "phone.fill", title: "Телефон", subtitle: user.phone?.isEmpty == false ? "Подтверждён" : "Не указан", isActive: user.phone?.isEmpty == false, tint: .perklyGold)
        }
    }
}

private struct NGSecurityRow: View {
    let icon: String
    let title: String
    let subtitle: String
    let isActive: Bool
    let tint: Color

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 15, weight: .bold))
                .foregroundColor(isActive ? tint : .white.opacity(0.3))
                .frame(width: 38, height: 38)
                .background((isActive ? tint : Color.white).opacity(isActive ? 0.12 : 0.045))
                .clipShape(RoundedRectangle(cornerRadius: 14))

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.perklyTextPrimary)
                Text(subtitle)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(Color.perklyTextPrimary.opacity(0.42))
            }

            Spacer()

            Image(systemName: isActive ? "checkmark.circle.fill" : "circle.dashed")
                .font(.system(size: 16, weight: .bold))
                .foregroundColor(isActive ? .perklyGreen : .white.opacity(0.35))
        }
        .padding(11)
        .background(Color.perklyOverlay.opacity(0.04))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

private struct NGSettingsModule: View {
    let user: User
    let capabilities: PartnerCapabilities?
    @Binding var showToday: Bool
    @Binding var showPath: Bool
    @Binding var showPurchases: Bool
    @Binding var showRecommendations: Bool
    @Binding var showSeller: Bool
    @Binding var showSecurity: Bool
    let onEditProfile: () -> Void
    let onLogout: () -> Void

    var body: some View {
        NavigationLink {
            NGProfileSettingsView(
                user: user,
                capabilities: capabilities,
                showToday: $showToday,
                showPath: $showPath,
                showPurchases: $showPurchases,
                showRecommendations: $showRecommendations,
                showSeller: $showSeller,
                showSecurity: $showSecurity,
                onEditProfile: onEditProfile,
                onLogout: onLogout
            )
        } label: {
            NGListActionRow(
                icon: "gearshape.fill",
                title: "Настройки",
                subtitle: "Аккаунт, сервисы, безопасность и выход",
                color: .perklyCyan
            )
        }
        .buttonStyle(.plain)
    }
}

private struct NGProfileSettingsView: View {
    @EnvironmentObject private var authVM: AuthViewModel
    @EnvironmentObject private var appearance: AppAppearance
    @StateObject private var biometricLock = BiometricLockManager.shared
    let user: User
    let capabilities: PartnerCapabilities?
    @Binding var showToday: Bool
    @Binding var showPath: Bool
    @Binding var showPurchases: Bool
    @Binding var showRecommendations: Bool
    @Binding var showSeller: Bool
    @Binding var showSecurity: Bool
    let onEditProfile: () -> Void
    let onLogout: () -> Void
    @State private var showLogoutConfirmation = false
    @State private var cacheWasCleared = false
    @State private var analyticsConsent = AnalyticsService.shared.isAnalyticsConsentGranted

    var body: some View {
        ZStack {
            NGProfileBackground()

            ScrollView(.vertical, showsIndicators: false) {
                VStack(alignment: .leading, spacing: 30) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Настройки")
                            .font(.system(size: 38, weight: .black))
                            .foregroundStyle(Color.perklyTextPrimary)
                            .accessibilityAddTraits(.isHeader)

                        Text("Только важное — без технического шума.")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(Color.perklyTextPrimary.opacity(0.45))
                    }

                    Button(action: onEditProfile) {
                        NGSettingsIdentityCard(user: user)
                    }
                    .buttonStyle(PerklyPressStyle())

                    NGSettingsPlainSection(title: "Интерфейс") {
                        NavigationLink(destination: AppearanceSettingsView()) {
                            NGReferenceMenuRow(
                                icon: "circle.lefthalf.filled",
                                title: "Оформление и язык",
                                subtitle: "\(appearance.theme.title) · \(appearance.language.title)"
                            )
                        }
                    }

                    NGSettingsPlainSection(title: "Аккаунт") {
                        NavigationLink(
                            destination: UserReviewsView(
                                authorId: user.id,
                                displayName: user.displayName ?? "Пользователь"
                            )
                        ) {
                            NGReferenceMenuRow(
                                icon: "star.bubble",
                                title: "Мои отзывы",
                                subtitle: nil
                            )
                        }

                        NGReferenceDivider()

                        NavigationLink(
                            destination: SubscriptionCenterView(
                                capabilities: capabilities
                                    ?? PartnerCapabilities.fallback(for: user),
                                onUpgrade: {}
                            )
                        ) {
                            NGReferenceMenuRow(
                                icon: "crown",
                                title: "Подписка",
                                subtitle: L10n.format(
                                    "profile.identity.subscription_level",
                                    user.tierEnum.displayName
                                )
                            )
                        }
                    }

                    NGSettingsPlainSection(title: "Связь с аккаунтом") {
                        if authVM.user?.telegramId == nil {
                            Button {
                                Task {
                                    await authVM.linkTelegramAccount()
                                }
                            } label: {
                                NGSettingsStatusMenuRow(
                                    icon: "paperplane",
                                    title: "Telegram",
                                    status: authVM.isLinkingTelegram
                                        ? "Ожидаем подтверждение"
                                        : "Подключить",
                                    active: false,
                                    showsProgress: authVM.isLinkingTelegram
                                )
                            }
                            .buttonStyle(PerklyPressStyle())
                            .disabled(authVM.isLinkingTelegram)
                        } else {
                            NGSettingsStatusMenuRow(
                                icon: "paperplane",
                                title: "Telegram",
                                status: "Подключён",
                                active: true
                            )
                        }

                        NGReferenceDivider()

                        Button {
                            Task {
                                await authVM.linkTelegramAccount()
                            }
                        } label: {
                            NGSettingsStatusMenuRow(
                                icon: "phone",
                                title: "Телефон",
                                status: authVM.isLinkingTelegram
                                    ? "Ожидаем подтверждение"
                                    : authVM.user?.phone?.isEmpty == false
                                        ? "Подтверждён · Изменить"
                                        : "Добавить через Telegram",
                                active: authVM.user?.phone?.isEmpty == false,
                                showsProgress: authVM.isLinkingTelegram
                            )
                        }
                        .buttonStyle(PerklyPressStyle())
                        .disabled(authVM.isLinkingTelegram)
                    }

                    NGSettingsPlainSection(title: "Данные приложения") {
                        NGSettingsToggleRow(
                            icon: "chart.bar.xaxis",
                            title: "Аналитика использования",
                            subtitle: "Отправлять Perkly сведения о действиях в приложении для улучшения продукта. Выключено по умолчанию.",
                            isOn: analyticsConsentBinding
                        )

                        NGReferenceDivider()

                        Button {
                            Task {
                                await DiskResponseCache.shared.clear()
                                HapticManager.shared.playSuccess()
                                cacheWasCleared = true
                                try? await Task.sleep(for: .seconds(3))
                                guard !Task.isCancelled else { return }
                                cacheWasCleared = false
                            }
                        } label: {
                            NGSettingsStatusMenuRow(
                                icon: "trash",
                                title: "Очистить сохранённые данные",
                                status: cacheWasCleared ? "Готово" : "Освободить место",
                                active: cacheWasCleared
                            )
                        }
                        .buttonStyle(PerklyPressStyle())
                    }

                    NGSettingsPlainSection(title: "Документы") {
                        if let privacyURL = URL(string: "https://perkly.uz/privacy") {
                            Link(destination: privacyURL) {
                            NGReferenceMenuRow(
                                icon: "hand.raised",
                                title: "Конфиденциальность",
                                subtitle: nil,
                                external: true
                            )
                            }
                        }

                        NGReferenceDivider()

                        if let termsURL = URL(string: "https://perkly.uz/terms") {
                            Link(destination: termsURL) {
                            NGReferenceMenuRow(
                                icon: "doc.text",
                                title: "Условия использования",
                                subtitle: nil,
                                external: true
                            )
                            }
                        }
                    }

                    NGSettingsPlainSection(title: "Сеанс") {
                        Button(role: .destructive) {
                            showLogoutConfirmation = true
                        } label: {
                            NGSettingsDangerRow(
                                icon: "rectangle.portrait.and.arrow.right",
                                title: "Выйти из профиля"
                            )
                        }

                        NGReferenceDivider()

                        NavigationLink(destination: DeleteAccountView()) {
                            NGSettingsDangerRow(
                                icon: "person.crop.circle.badge.minus",
                                title: "Удалить аккаунт"
                            )
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 18)
                .padding(.bottom, 44)
            }
        }
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
        .tint(.white)
        .confirmationDialog(
            "Выйти из профиля?",
            isPresented: $showLogoutConfirmation,
            titleVisibility: .visible
        ) {
            Button("Выйти", role: .destructive, action: onLogout)
            Button("Отмена", role: .cancel) {}
        } message: {
            Text("Для следующего входа понадобятся данные аккаунта.")
        }
        .alert("Не удалось подключить Telegram", isPresented: .init(
            get: { authVM.error != nil },
            set: { if !$0 { authVM.error = nil } }
        )) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(authVM.error ?? "Попробуйте снова")
        }
        .alert("Аккаунт подключён", isPresented: $authVM.telegramLinkSucceeded) {
            Button("Готово", role: .cancel) {}
        } message: {
            Text("Telegram и подтверждённый номер телефона добавлены в профиль.")
        }
    }

    private var biometricBinding: Binding<Bool> {
        Binding(
            get: { biometricLock.isEnabled },
            set: { enabled in
                if enabled {
                    Task { _ = await biometricLock.enable() }
                } else {
                    biometricLock.disable()
                }
            }
        )
    }

    private var analyticsConsentBinding: Binding<Bool> {
        Binding(
            get: { analyticsConsent },
            set: { granted in
                AnalyticsService.shared.setAnalyticsConsent(granted)
                analyticsConsent = granted
            }
        )
    }
}

private struct NGSettingsIdentityCard: View {
    let user: User

    var body: some View {
        HStack(spacing: 14) {
            NGReferenceAvatar(user: user)
                .scaleEffect(0.72)
                .frame(width: 60, height: 60)

            VStack(alignment: .leading, spacing: 4) {
                Text(user.displayName ?? "Пользователь")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(Color.perklyTextPrimary)
                    .lineLimit(1)

                Text(user.phone?.isEmpty == false
                     ? user.phone ?? ""
                     : user.email ?? "Профиль Perkly")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Color.perklyTextPrimary.opacity(0.42))
                    .lineLimit(1)
            }

            Spacer()

            Image(systemName: "pencil")
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(Color.perklyTextPrimary.opacity(0.7))
                .accessibilityHidden(true)
        }
        .padding(16)
        .perklySurface(
            cornerRadius: PerklyDesign.Radius.feature,
            fill: Color.perklyOverlay.opacity(0.045)
        )
        .accessibilityElement(children: .combine)
        .accessibilityHint("Открывает редактирование профиля")
    }
}

private struct NGSettingsPlainSection<Content: View>: View {
    let title: String
    let content: Content

    init(
        title: String,
        @ViewBuilder content: () -> Content
    ) {
        self.title = title
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            NGReferenceSectionTitle(title)

            VStack(spacing: 0) {
                content
            }
            .buttonStyle(PerklyPressStyle())
        }
    }
}

private struct NGSettingsToggleRow: View {
    let icon: String
    let title: String
    var subtitle: String? = nil
    @Binding var isOn: Bool

    var body: some View {
        Toggle(isOn: $isOn) {
            HStack(spacing: 16) {
                Image(systemName: icon)
                    .font(.system(size: 20, weight: .medium))
                    .foregroundStyle(Color.perklyTextPrimary.opacity(0.9))
                    .frame(width: 30)
                    .accessibilityHidden(true)

                VStack(alignment: .leading, spacing: 3) {
                    Text(title)
                        .font(.system(size: 17, weight: .bold))
                        .foregroundStyle(Color.perklyTextPrimary)

                    if let subtitle {
                        Text(subtitle)
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(Color.perklyTextPrimary.opacity(0.46))
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
        }
        .tint(.perklyElectricCyan)
        .padding(.vertical, subtitle == nil ? 0 : 12)
        .frame(minHeight: 68)
    }
}

private struct NGSettingsStatusMenuRow: View {
    let icon: String
    let title: String
    let status: String
    let active: Bool
    var showsProgress = false

    var body: some View {
        HStack(spacing: 16) {
            Image(systemName: icon)
                .font(.system(size: 20, weight: .medium))
                .foregroundStyle(Color.perklyTextPrimary.opacity(0.9))
                .frame(width: 30)
                .accessibilityHidden(true)

            Text(title)
                .font(.headline.weight(.bold))
                .foregroundStyle(Color.perklyTextPrimary)

            Spacer()

            if showsProgress {
                ProgressView()
                    .tint(.white)
                    .accessibilityLabel(L10n.tr(status))
            } else {
                Text(L10n.tr(status))
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(active ? Color.perklyGreen : .white.opacity(0.38))
                    .multilineTextAlignment(.trailing)
            }
        }
        .frame(maxWidth: .infinity, minHeight: 68)
        .contentShape(Rectangle())
        .accessibilityElement(children: .combine)
    }
}

private struct NGSettingsDangerRow: View {
    let icon: String
    let title: String

    var body: some View {
        HStack(spacing: 16) {
            Image(systemName: icon)
                .font(.system(size: 20, weight: .medium))
                .frame(width: 30)
                .accessibilityHidden(true)

            Text(L10n.tr(title))
                .font(.headline.weight(.bold))

            Spacer()

            Image(systemName: "chevron.right")
                .font(.system(size: 13, weight: .bold))
                .accessibilityHidden(true)
        }
        .foregroundStyle(Color.perklyRed)
        .frame(maxWidth: .infinity, minHeight: 68)
        .contentShape(Rectangle())
        .accessibilityElement(children: .combine)
    }
}

private struct NGSecurityCenterView: View {
    let user: User

    @StateObject private var biometricLock = BiometricLockManager.shared

    var body: some View {
        ZStack {
            NGProfileBackground()

            ScrollView(.vertical, showsIndicators: false) {
                VStack(alignment: .leading, spacing: 30) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Безопасность")
                            .font(.system(size: 38, weight: .black))
                            .foregroundStyle(Color.perklyTextPrimary)
                            .accessibilityAddTraits(.isHeader)

                        Text("Контроль входа и активных устройств.")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(Color.perklyTextPrimary.opacity(0.45))
                    }

                    NGSettingsPlainSection(title: "Защита входа") {
                        NGSettingsToggleRow(
                            icon: "faceid",
                            title: biometricLock.isAvailable
                                ? biometricLock.biometricName
                                : "Биометрия недоступна",
                            isOn: biometricBinding
                        )
                        .disabled(!biometricLock.isAvailable)
                    }

                    NGSettingsPlainSection(title: "Аккаунт") {
                        NavigationLink(destination: ChangePasswordView()) {
                            NGReferenceMenuRow(
                                icon: "key",
                                title: "Пароль",
                                subtitle: "Изменить пароль аккаунта"
                            )
                        }

                        NGReferenceDivider()

                        NavigationLink(destination: ActiveSessionsView()) {
                            NGReferenceMenuRow(
                                icon: "laptopcomputer.and.iphone",
                                title: "Активные устройства",
                                subtitle: "Проверить и завершить сеансы"
                            )
                        }
                    }

                    NGSettingsPlainSection(title: "Подтверждение") {
                        NGSettingsStatusMenuRow(
                            icon: "paperplane",
                            title: "Telegram",
                            status: user.telegramId == nil ? "Не подключён" : "Подключён",
                            active: user.telegramId != nil
                        )

                        NGReferenceDivider()

                        NGSettingsStatusMenuRow(
                            icon: "phone",
                            title: "Телефон",
                            status: user.phone?.isEmpty == false
                                ? "Подтверждён"
                                : "Не добавлен",
                            active: user.phone?.isEmpty == false
                        )
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 18)
                .padding(.bottom, 44)
            }
        }
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
        .tint(.white)
    }

    private var biometricBinding: Binding<Bool> {
        Binding(
            get: { biometricLock.isEnabled },
            set: { enabled in
                if enabled {
                    Task { _ = await biometricLock.enable() }
                } else {
                    biometricLock.disable()
                }
            }
        )
    }
}

private struct DeleteAccountView: View {
    @EnvironmentObject private var authVM: AuthViewModel
    @State private var hasPassword: Bool?
    @State private var currentPassword = ""
    @State private var confirmation = ""
    @State private var isDeleting = false
    @State private var errorText: String?
    @State private var showFinalConfirmation = false

    var body: some View {
        Form {
            Section {
                Label("Это действие необратимо", systemImage: "exclamationmark.triangle.fill")
                    .font(.headline)
                    .foregroundColor(.red)
                Text("Профиль и персональные данные будут удалены. Финансовая история сохранится в анонимном виде. Все устройства потеряют доступ к аккаунту.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            Section("Перед удалением") {
                Label("Завершите активные покупки и продажи", systemImage: "checkmark.circle")
                Label("Закройте открытые споры", systemImage: "checkmark.circle")
                Label("Сохраните нужные коды и чеки", systemImage: "checkmark.circle")
            }

            Section {
                if hasPassword == nil {
                    HStack(spacing: 10) {
                        ProgressView().tint(.red)
                        Text("Проверяем аккаунт")
                    }
                } else {
                    if hasPassword == true {
                        SecureField("Текущий пароль", text: $currentPassword)
                            .textContentType(.password)
                    }
                    TextField("Введите УДАЛИТЬ", text: $confirmation)
                        .textInputAutocapitalization(.characters)
                        .autocorrectionDisabled()
                }
            } header: {
                Text("Подтверждение")
            } footer: {
                Text("Введите слово УДАЛИТЬ заглавными буквами.")
            }

            if let errorText {
                Section {
                    Label(errorText, systemImage: "exclamationmark.circle.fill")
                        .font(.footnote)
                        .foregroundColor(.perklyOrange)
                }
            }

            Section {
                Button("Удалить аккаунт", role: .destructive) {
                    showFinalConfirmation = true
                }
                .disabled(!canDelete || isDeleting)
            }
        }
        .scrollContentBackground(.hidden)
        .background(Color.perklyDark.ignoresSafeArea())
        .navigationTitle("Удаление аккаунта")
        .navigationBarTitleDisplayMode(.inline)
        .task { await loadPasswordStatus() }
        .confirmationDialog(
            "Удалить аккаунт навсегда?",
            isPresented: $showFinalConfirmation,
            titleVisibility: .visible
        ) {
            Button("Удалить навсегда", role: .destructive) {
                Task { await deleteAccount() }
            }
            Button("Отмена", role: .cancel) {}
        } message: {
            Text("Отменить это действие после удаления будет невозможно.")
        }
        .overlay {
            if isDeleting {
                ZStack {
                    Color.black.opacity(0.45).ignoresSafeArea()
                    ProgressView("Удаляем аккаунт…")
                        .tint(.white)
                        .foregroundColor(.perklyTextPrimary)
                        .padding(22)
                        .perklySurface(cornerRadius: 18, fill: Color.perklyDark.opacity(0.96))
                }
            }
        }
    }

    private var canDelete: Bool {
        hasPassword != nil && confirmation == "УДАЛИТЬ" &&
        (hasPassword == false || !currentPassword.isEmpty)
    }

    private func loadPasswordStatus() async {
        do {
            let status = try await UsersService.shared.getPasswordStatus()
            hasPassword = status.hasPassword
        } catch is CancellationError {
            return
        } catch {
            errorText = error.localizedDescription
        }
    }

    private func deleteAccount() async {
        guard canDelete else { return }
        isDeleting = true
        errorText = nil
        do {
            try await UsersService.shared.deleteAccount(
                currentPassword: hasPassword == true ? currentPassword : nil,
                confirmation: confirmation
            )
            HapticManager.shared.playSuccess()
            authVM.logout()
        } catch {
            isDeleting = false
            HapticManager.shared.playError()
            errorText = error.localizedDescription
        }
    }
}

struct ActiveSessionsView: View {
    @State private var sessions: [AuthSession] = []
    @State private var isLoading = true
    @State private var errorText: String?
    @State private var revokingId: String?
    @State private var showRevokeOthers = false

    var body: some View {
        List {
            if isLoading && sessions.isEmpty {
                Section {
                    HStack(spacing: 10) {
                        ProgressView().tint(.perklyCyan)
                        Text("Загружаем активные устройства")
                    }
                }
            } else if let errorText, sessions.isEmpty {
                Section {
                    PerklyContentStateView(
                        kind: .error,
                        icon: "exclamationmark.shield.fill",
                        title: "Не удалось загрузить сессии",
                        message: errorText,
                        actionTitle: "Повторить"
                    ) {
                        Task { await loadSessions() }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 20)
                }
            } else {
                Section("Устройства") {
                    ForEach(sessions) { session in
                        sessionRow(session)
                    }
                }

                if sessions.contains(where: { !$0.isCurrent }) {
                    Section {
                        Button("Завершить все другие сессии", role: .destructive) {
                            showRevokeOthers = true
                        }
                    } footer: {
                        Text("На этом iPhone вы останетесь в аккаунте.")
                    }
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(Color.perklyDark.ignoresSafeArea())
        .navigationTitle("Активные сессии")
        .navigationBarTitleDisplayMode(.inline)
        .task { await loadSessions() }
        .refreshable { await loadSessions() }
        .confirmationDialog(
            "Завершить все другие сессии?",
            isPresented: $showRevokeOthers,
            titleVisibility: .visible
        ) {
            Button("Завершить", role: .destructive) {
                Task { await revokeOtherSessions() }
            }
            Button("Отмена", role: .cancel) {}
        } message: {
            Text("На других устройствах потребуется войти заново.")
        }
    }

    private func sessionRow(_ session: AuthSession) -> some View {
        HStack(spacing: 12) {
            Image(systemName: session.isCurrent ? "iphone.gen3" : "laptopcomputer.and.iphone")
                .font(.system(size: 19, weight: .semibold))
                .foregroundColor(session.isCurrent ? .perklyGreen : .perklyCyan)
                .frame(width: 34)

            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 7) {
                    Text(session.deviceName ?? "Неизвестное устройство")
                        .font(.system(size: 14, weight: .semibold))
                    if session.isCurrent {
                        Text("ЭТО УСТРОЙСТВО")
                            .font(.system(size: 8, weight: .black))
                            .foregroundColor(.black)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 3)
                            .background(Color.perklyGreen)
                            .clipShape(Capsule())
                    }
                }
                Text("Активность: \(formattedDate(session.lastUsedAt))")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            if !session.isCurrent {
                Button(role: .destructive) {
                    Task { await revoke(session) }
                } label: {
                    if revokingId == session.id {
                        ProgressView().tint(.perklyRed)
                    } else {
                        Image(systemName: "xmark.circle.fill")
                    }
                }
                .disabled(revokingId != nil)
                .accessibilityLabel("Завершить сессию на устройстве \(session.deviceName ?? "неизвестное")")
            }
        }
        .padding(.vertical, 5)
    }

    private func loadSessions() async {
        isLoading = true
        errorText = nil
        defer { isLoading = false }
        do {
            sessions = try await AuthService.shared.listSessions()
        } catch is CancellationError {
            return
        } catch {
            errorText = error.localizedDescription
        }
    }

    private func revoke(_ session: AuthSession) async {
        revokingId = session.id
        defer { revokingId = nil }
        do {
            try await AuthService.shared.revokeSession(id: session.id)
            sessions.removeAll { $0.id == session.id }
            HapticManager.shared.playSuccess()
        } catch {
            errorText = error.localizedDescription
            HapticManager.shared.playError()
        }
    }

    private func revokeOtherSessions() async {
        do {
            try await AuthService.shared.revokeOtherSessions()
            sessions.removeAll { !$0.isCurrent }
            HapticManager.shared.playSuccess()
        } catch {
            errorText = error.localizedDescription
            HapticManager.shared.playError()
        }
    }

    private func formattedDate(_ raw: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: raw) else { return "недавно" }
        return date.formatted(date: .abbreviated, time: .shortened)
    }
}

private struct ChangePasswordView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var hasPassword: Bool?
    @State private var currentPassword = ""
    @State private var newPassword = ""
    @State private var confirmation = ""
    @State private var isSaving = false
    @State private var errorText: String?
    @State private var showSuccess = false

    var body: some View {
        Form {
            Section {
                if hasPassword == nil {
                    HStack(spacing: 10) {
                        ProgressView().tint(.perklyPurple)
                        Text("Проверяем настройки безопасности")
                    }
                } else {
                    if hasPassword == true {
                        SecureField("Текущий пароль", text: $currentPassword)
                            .textContentType(.password)
                    }
                    SecureField("Новый пароль", text: $newPassword)
                        .textContentType(.newPassword)
                    SecureField("Повторите новый пароль", text: $confirmation)
                        .textContentType(.newPassword)
                }
            } header: {
                Text(hasPassword == false ? "Установить пароль" : "Сменить пароль")
            } footer: {
                Text("Минимум 8 символов. Не используйте пароль от почты или Telegram.")
            }

            if let validationMessage {
                Section {
                    Label(validationMessage, systemImage: "exclamationmark.circle.fill")
                        .font(.footnote)
                        .foregroundColor(.perklyOrange)
                }
            }

            Section {
                Button {
                    Task { await savePassword() }
                } label: {
                    HStack {
                        Text(hasPassword == false ? "Установить пароль" : "Сохранить новый пароль")
                        Spacer()
                        if isSaving { ProgressView() }
                    }
                }
                .disabled(!canSubmit || isSaving)
            }
        }
        .scrollContentBackground(.hidden)
        .background(Color.perklyDark.ignoresSafeArea())
        .navigationTitle("Пароль")
        .navigationBarTitleDisplayMode(.inline)
        .tint(.perklyPurple)
        .task { await loadStatus() }
        .alert("Пароль обновлён", isPresented: $showSuccess) {
            Button("Готово") { dismiss() }
        } message: {
            Text("Используйте новый пароль при следующем входе.")
        }
    }

    private var validationMessage: String? {
        if let errorText { return errorText }
        guard !newPassword.isEmpty || !confirmation.isEmpty else { return nil }
        if newPassword.count < 8 { return "Пароль должен содержать минимум 8 символов." }
        if newPassword != confirmation { return "Пароли не совпадают." }
        if hasPassword == true, currentPassword.isEmpty { return "Введите текущий пароль." }
        return nil
    }

    private var canSubmit: Bool {
        hasPassword != nil && validationMessage == nil && !newPassword.isEmpty
    }

    private func loadStatus() async {
        do {
            let status = try await UsersService.shared.getPasswordStatus()
            hasPassword = status.hasPassword
            errorText = nil
        } catch is CancellationError {
            return
        } catch {
            errorText = error.localizedDescription
        }
    }

    private func savePassword() async {
        guard canSubmit else { return }
        isSaving = true
        errorText = nil
        defer { isSaving = false }
        do {
            try await UsersService.shared.changePassword(
                currentPassword: hasPassword == true ? currentPassword : nil,
                newPassword: newPassword
            )
            HapticManager.shared.playSuccess()
            showSuccess = true
        } catch is CancellationError {
            return
        } catch {
            HapticManager.shared.playError()
            errorText = error.localizedDescription
        }
    }
}

private struct NearbyAlertsSettingsView: View {
    @Environment(\.scenePhase) private var scenePhase
    @StateObject private var locationManager = LocationManager.shared
    @State private var notificationStatus: UNAuthorizationStatus = .notDetermined
    @State private var preferences = NotificationsService.shared.cachedPreferences
    @State private var preferencesError: String?
    @State private var saveTask: Task<Void, Never>?

    var body: some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 10) {
                    Image(systemName: "location.fill.viewfinder")
                        .font(.system(size: 32, weight: .bold))
                        .foregroundColor(.perklyCyan)
                    Text("Только полезные уведомления")
                        .font(.title3.bold())
                        .foregroundColor(.perklyTextPrimary)
                    Text("Выберите важные события. Настройки синхронизируются с аккаунтом и действуют на всех каналах Perkly.")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .padding(.vertical, 8)
            }

            Section {
                Toggle(isOn: preferenceBinding(\.purchases)) {
                    Label("Покупки и сделки", systemImage: "bag.fill")
                }
                Toggle(isOn: preferenceBinding(\.messages)) {
                    Label("Новые сообщения", systemImage: "message.fill")
                }
                Toggle(isOn: preferenceBinding(\.nearby)) {
                    Label("Скидки рядом", systemImage: "location.circle.fill")
                }
            } header: {
                Text("Категории")
            } footer: {
                if let preferencesError {
                    Text(preferencesError).foregroundColor(.perklyOrange)
                } else {
                    Text("Сервисные сообщения о безопасности аккаунта нельзя отключить.")
                }
            }

            Section("Для работы нужны два разрешения") {
                permissionRow(
                    icon: "location.fill",
                    title: "Геопозиция",
                    status: locationStatusText,
                    isReady: locationManager.authorizationStatus == .authorizedAlways
                )
                permissionRow(
                    icon: "bell.fill",
                    title: "Уведомления",
                    status: notificationStatusText,
                    isReady: notificationStatus == .authorized || notificationStatus == .provisional
                )
            }

            Section {
                Button(action: performPrimaryAction) {
                    HStack {
                        Text(primaryActionTitle)
                        Spacer()
                        Image(systemName: primaryActionIcon)
                    }
                    .fontWeight(.semibold)
                }
                .disabled(isFullyEnabled)
            } footer: {
                Text(isFullyEnabled
                     ? "Готово. Уведомления появятся только для актуальных предложений поблизости."
                     : "Разрешения можно изменить в любой момент в настройках iPhone.")
            }
        }
        .scrollContentBackground(.hidden)
        .background(Color.perklyDark.ignoresSafeArea())
        .navigationTitle("Уведомления")
        .navigationBarTitleDisplayMode(.inline)
        .tint(.perklyCyan)
        .task {
            await refreshNotificationStatus()
            await loadPreferences()
        }
        .onChange(of: scenePhase) { _, phase in
            guard phase == .active else { return }
            Task { await refreshNotificationStatus() }
        }
    }

    private var isFullyEnabled: Bool {
        locationManager.authorizationStatus == .authorizedAlways &&
        (notificationStatus == .authorized || notificationStatus == .provisional)
    }

    private var locationStatusText: String {
        switch locationManager.authorizationStatus {
        case .authorizedAlways: return "Всегда — включено"
        case .authorizedWhenInUse: return "Только при использовании"
        case .denied, .restricted: return "Нет доступа"
        case .notDetermined: return "Не настроено"
        @unknown default: return "Не настроено"
        }
    }

    private var notificationStatusText: String {
        switch notificationStatus {
        case .authorized, .provisional: return "Включены"
        case .denied: return "Выключены"
        case .notDetermined: return "Не настроены"
        case .ephemeral: return "Временно включены"
        @unknown default: return "Не настроены"
        }
    }

    private var primaryActionTitle: String {
        if isFullyEnabled { return "Всё включено" }
        switch locationManager.authorizationStatus {
        case .notDetermined: return "Разрешить геопозицию"
        case .authorizedWhenInUse: return "Разрешить в фоне"
        case .denied, .restricted: return "Открыть настройки iPhone"
        case .authorizedAlways:
            return notificationStatus == .notDetermined ? "Разрешить уведомления" : "Открыть настройки iPhone"
        @unknown default: return "Открыть настройки iPhone"
        }
    }

    private var primaryActionIcon: String {
        isFullyEnabled ? "checkmark.circle.fill" : "arrow.up.right"
    }

    @ViewBuilder
    private func permissionRow(icon: String, title: String, status: String, isReady: Bool) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .foregroundColor(isReady ? .perklyGreen : .perklyGold)
                .frame(width: 24)
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                Text(status)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            Spacer()
            Image(systemName: isReady ? "checkmark.circle.fill" : "circle.dashed")
                .foregroundColor(isReady ? .perklyGreen : .secondary)
        }
    }

    private func performPrimaryAction() {
        switch locationManager.authorizationStatus {
        case .notDetermined:
            locationManager.requestPermissions()
        case .authorizedWhenInUse:
            locationManager.requestBackgroundPermission()
        case .authorizedAlways:
            if notificationStatus == .notDetermined {
                Task {
                    _ = try? await UNUserNotificationCenter.current()
                        .requestAuthorization(options: [.alert, .sound, .badge])
                    await refreshNotificationStatus()
                }
            } else {
                openSystemSettings()
            }
        case .denied, .restricted:
            openSystemSettings()
        @unknown default:
            openSystemSettings()
        }
    }

    private func preferenceBinding(_ keyPath: WritableKeyPath<NotificationPreferences, Bool>) -> Binding<Bool> {
        Binding(
            get: { preferences[keyPath: keyPath] },
            set: { value in
                preferences[keyPath: keyPath] = value
                NotificationsService.shared.cache(preferences)
                schedulePreferencesSave()
            }
        )
    }

    private func schedulePreferencesSave() {
        saveTask?.cancel()
        let snapshot = preferences
        saveTask = Task {
            try? await Task.sleep(for: .milliseconds(400))
            guard !Task.isCancelled else { return }
            do {
                let updated = try await NotificationsService.shared.updatePreferences(snapshot)
                guard !Task.isCancelled else { return }
                preferences = updated
                preferencesError = nil
            } catch {
                guard !Task.isCancelled else { return }
                preferencesError = "Не удалось синхронизировать. Настройка сохранена на этом устройстве."
            }
        }
    }

    private func loadPreferences() async {
        do {
            preferences = try await NotificationsService.shared.loadPreferences()
            preferencesError = nil
        } catch {
            preferences = NotificationsService.shared.cachedPreferences
        }
    }

    private func refreshNotificationStatus() async {
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        notificationStatus = settings.authorizationStatus
    }

    private func openSystemSettings() {
        guard let url = URL(string: UIApplication.openSettingsURLString) else { return }
        UIApplication.shared.open(url)
    }
}

private struct NGSettingsRow: View {
    let icon: String
    let title: String
    let tint: Color

    var body: some View {
        Label {
            Text(title).foregroundColor(.perklyTextPrimary)
        } icon: {
            Image(systemName: icon).foregroundColor(tint)
        }
    }
}

private struct NGSettingsStatusRow: View {
    let icon: String
    let title: String
    let status: String
    let active: Bool

    var body: some View {
        HStack {
            Label(title, systemImage: icon)
            Spacer()
            Text(status)
                .font(.caption)
                .foregroundColor(active ? .perklyGreen : .secondary)
        }
    }
}

private struct NGListActionRow: View {
    let icon: String
    let title: String
    let subtitle: String
    let color: Color

    var body: some View {
        HStack(spacing: 13) {
            Image(systemName: icon)
                .font(.system(size: 17, weight: .bold))
                .foregroundColor(color)
                .frame(width: PerklyDesign.Size.minimumTouchTarget, height: PerklyDesign.Size.minimumTouchTarget)
                .background(color.opacity(0.13))
                .clipShape(RoundedRectangle(cornerRadius: 15))

            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(.perklyTextPrimary)
                Text(subtitle)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(Color.perklyTextPrimary.opacity(0.42))
                    .lineLimit(2)
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.system(size: 11, weight: .black))
                .foregroundColor(Color.perklyTextPrimary.opacity(0.2))
        }
        .padding(15)
        .ngGlass(cornerRadius: 20)
    }
}

private extension View {
    func ngGlass(cornerRadius: CGFloat) -> some View {
        perklySurface(cornerRadius: cornerRadius)
    }
}
