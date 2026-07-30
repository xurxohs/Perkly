import SwiftUI

struct MainTabView: View {
    @EnvironmentObject private var authVM: AuthViewModel
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency
    @StateObject private var connectivity = ConnectivityMonitor.shared

    @State private var selectedTab = 0
    @State private var previousTab = 0
    @State private var homePath = NavigationPath()
    @State private var catalogPath = NavigationPath()
    @State private var mapPath = NavigationPath()
    @State private var feedPath = NavigationPath()
    @State private var profilePath = NavigationPath()
    @State private var showOnboardingCompletion = false
    
    var body: some View {
        TabView(selection: $selectedTab) {
            NavigationStack(path: $homePath) {
                HomeView()
            }
            .tabItem {
                Label("Главная", systemImage: "house.fill")
            }
            .tag(0)
            
            NavigationStack(path: $catalogPath) {
                CatalogView()
            }
            .tabItem {
                Label("Каталог", systemImage: "bag.fill")
            }
            .tag(1)
            
            NavigationStack(path: $mapPath) {
                MapDiscoveryView()
            }
            .tabItem {
                Label("Карта", systemImage: "map.fill")
            }
            .tag(2)

            NavigationStack(path: $feedPath) {
                FeedView {
                    selectedTab = previousTab == 3 ? 0 : previousTab
                }
            }
            .tabItem {
                Label("Топка", systemImage: "flame.fill")
            }
            .tag(3)

            NavigationStack(path: $profilePath) {
                NextGenProfileView()
            }
            .tabItem {
                Label("Профиль", systemImage: "person.fill")
            }
            .tag(4)
        }
        .tint(.perklyPurple)
        .modifier(AccessibleTabBarModifier(isOpaque: reduceTransparency))
        .safeAreaInset(edge: .top, spacing: 0) {
            if connectivity.hasEvaluated && !connectivity.isConnected {
                HStack(spacing: 10) {
                    Circle()
                        .fill(Color.perklyOrange.opacity(0.16))
                        .frame(width: 34, height: 34)
                        .overlay {
                            Image(systemName: "wifi.slash")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(Color.perklyOrange)
                        }
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Нет подключения")
                            .font(.system(size: 13, weight: .semibold))
                        Text("Показываем сохранённые данные")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(Color.perklyTextPrimary.opacity(0.58))
                    }
                    Spacer(minLength: 4)
                }
                .foregroundColor(.perklyTextPrimary)
                .padding(.horizontal, 12)
                .padding(.vertical, 9)
                .perklyGlass(cornerRadius: 20, tint: Color.perklyOrange.opacity(0.12), isInteractive: false)
                .padding(.horizontal, 12)
                .padding(.top, 6)
                .accessibilityElement(children: .combine)
                .accessibilityLabel("Нет подключения к интернету. Данные могут быть устаревшими")
                .transition(reduceMotion ? .opacity : .move(edge: .top).combined(with: .opacity))
            }
        }
        .animation(reduceMotion ? nil : .easeInOut(duration: 0.22), value: connectivity.isConnected)
        .fullScreenCover(isPresented: $showOnboardingCompletion) {
            if let user = authVM.user {
                NextGenEditProfileView(
                    user: user,
                    isInitialSetup: true
                ) { updated in
                    authVM.user = updated
                    PerklyOnboardingProfileStore.markComplete(for: updated)
                    NotificationCenter.default.post(name: .perklyOnboardingCompleted, object: nil)
                }
            }
        }
        .onAppear {
            refreshOnboardingGate()
        }
        .onChange(of: authVM.isAuthenticated) { _, _ in
            refreshOnboardingGate()
        }
        .onChange(of: authVM.user) { _, _ in
            refreshOnboardingGate()
        }
        .onChange(of: selectedTab) { oldValue, newValue in
            guard oldValue != newValue else { return }
            if newValue == 3 {
                previousTab = oldValue
            }
            HapticManager.shared.playTabSwitch()
        }
        .onReceive(NotificationCenter.default.publisher(for: .perklyOnboardingCompleted)) { _ in
            showOnboardingCompletion = false
        }
        .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("PerklyDeepLink"))) { note in
            if let offerId = note.object as? String {
                selectedTab = 0 // Navigate to Home
                homePath = NavigationPath([AppRoute.offer(offerId)])
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("PerklyChatDeepLink"))) { _ in
            selectedTab = 4
            profilePath = NavigationPath([AppRoute.chats])
        }
        .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("PerklyPurchasesDeepLink"))) { note in
            selectedTab = 4
            if let transactionId = note.object as? String {
                profilePath = NavigationPath([AppRoute.purchase(transactionId)])
            } else {
                profilePath = NavigationPath([AppRoute.purchases])
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("PerklyEventDeepLink"))) { _ in
            selectedTab = 3
            feedPath = NavigationPath()
        }
        .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("PerklyWalletDeepLink"))) { _ in
            selectedTab = 4
            profilePath = NavigationPath()
        }
        .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("PerklySecurityDeepLink"))) { _ in
            selectedTab = 4
            profilePath = NavigationPath([AppRoute.sessions])
        }
    }

    private func refreshOnboardingGate() {
        guard authVM.isAuthenticated, authVM.user != nil else {
            showOnboardingCompletion = false
            return
        }

        showOnboardingCompletion = !PerklyOnboardingProfileStore.isComplete(for: authVM.user)
    }
}

private struct AccessibleTabBarModifier: ViewModifier {
    let isOpaque: Bool
    @ViewBuilder func body(content: Content) -> some View {
        if isOpaque {
            content
                .toolbarBackground(Color.perklyDark, for: .tabBar)
                .toolbarBackground(.visible, for: .tabBar)
        } else {
            content
        }
    }
}
