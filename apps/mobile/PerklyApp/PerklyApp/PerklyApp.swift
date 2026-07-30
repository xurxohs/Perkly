import SwiftUI
import UserNotifications

@main
struct PerklyApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @StateObject private var authVM = AuthViewModel()
    @StateObject private var cartVM = CartViewModel()
    @StateObject private var biometricLock = BiometricLockManager.shared
    @StateObject private var appearance = AppAppearance.shared
    @Environment(\.scenePhase) private var scenePhase

    init() {
        AppDiagnosticsService.shared.start()
    }
    
    var body: some Scene {
        WindowGroup {
            Group {
                if isTopkaUITestMode {
                    NavigationStack {
                        FeedView()
                    }
                } else if authVM.isRestoringSession {
                    SplashScreen()
                } else if authVM.isAuthenticated {
                    MainTabView()
                } else {
                    LoginView()
                }
            }
            .environmentObject(authVM)
            .environmentObject(cartVM)
            .environmentObject(appearance)
            .environment(\.locale, appearance.language.locale)
            .preferredColorScheme(appearance.theme.colorScheme)
            .overlay {
                if !isTopkaUITestMode,
                   authVM.isAuthenticated,
                   biometricLock.isLocked {
                    BiometricLockScreen(manager: biometricLock)
                }
            }
            .task(id: authVM.isAuthenticated) {
                guard authVM.isAuthenticated else { return }
                await appearance.syncLanguageFromAccount()
            }
            .onChange(of: scenePhase) { _, phase in
                AppDiagnosticsService.shared.updateScenePhase(phase)
                if phase == .active {
                    guard authVM.isAuthenticated else { return }
                    Task { await biometricLock.unlock() }
                } else {
                    biometricLock.lock()
                }
            }
        }
    }

    private var isTopkaUITestMode: Bool {
        #if DEBUG
        ProcessInfo.processInfo.arguments.contains("-topka-ui-test")
        #else
        false
        #endif
    }
}

private struct BiometricLockScreen: View {
    @ObservedObject var manager: BiometricLockManager

    var body: some View {
        ZStack {
            Color.perklyDark.ignoresSafeArea()
            VStack(spacing: 20) {
                Image(systemName: "lock.shield.fill")
                    .font(.system(size: 54, weight: .bold))
                    .foregroundStyle(Color.primaryGradient)
                    .accessibilityHidden(true)

                VStack(spacing: 7) {
                    Text("Perkly заблокирован")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(.perklyTextPrimary)
                    Text("Подтвердите вход с помощью \(manager.biometricName)")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.perklyTextSecondary)
                        .multilineTextAlignment(.center)
                }

                Button {
                    Task { await manager.unlock() }
                } label: {
                    Label("Разблокировать", systemImage: "faceid")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.black)
                        .frame(minWidth: 190, minHeight: PerklyDesign.Size.controlHeight)
                        .background(Color.white)
                        .clipShape(Capsule())
                }
                .buttonStyle(.plain)

                if let error = manager.errorMessage {
                    Text(error)
                        .font(.footnote)
                        .foregroundColor(.perklyOrange)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 30)
                }
            }
            .padding(30)
        }
        .accessibilityAddTraits(.isModal)
        .task { await manager.unlock() }
    }
}

// MARK: - Splash Screen
struct SplashScreen: View {
    @State private var scale = 0.8
    @State private var opacity = 0.0
    
    var body: some View {
        ZStack {
            Color.perklyDark.ignoresSafeArea()
            
            VStack(spacing: 16) {
                PerklyBrandMark(size: 92)
                    .shadow(color: .perklyPurple.opacity(0.5), radius: 20)
                    .scaleEffect(scale)
                
                Text("Perkly")
                    .font(.system(size: 36, weight: .bold))
                    .foregroundColor(.perklyTextPrimary)
                
                ProgressView()
                    .tint(.perklyPurple)
            }
            .opacity(opacity)
        }
        .onAppear {
            withAnimation(.spring(response: 0.8, dampingFraction: 0.6)) {
                scale = 1.0
                opacity = 1.0
            }
            
            // Analytics
            AnalyticsService.shared.trackEvent(eventType: "app_open")
        }
    }
}

// MARK: - Development Diagnostics

final class AppDiagnosticsService: NSObject {
    static let shared = AppDiagnosticsService()

    private let defaults = UserDefaults.standard
    private let queue = DispatchQueue(label: "com.perkly.diagnostics.watchdog")
    private let notificationCenter = UNUserNotificationCenter.current()

    private let sessionActiveKey = "diagnostics.session.active"
    private let lastCrashKey = "diagnostics.last.crash"
    private let lastCrashKindKey = "diagnostics.last.crash.kind"
    private let breadcrumbsKey = "diagnostics.breadcrumbs"
    private let hangThreshold: TimeInterval = 6
    private let maxBreadcrumbs = 20

    private var didStart = false
    private var lastMainBeat = Date()
    private var hangReported = false
    private var watchdogTimer: DispatchSourceTimer?

    private override init() {
        super.init()
    }

    func start() {
        guard !didStart else { return }
        didStart = true

        // notificationCenter.delegate = self // Handled by AppDelegate now

        installExceptionHandler()
        reportPreviousUnexpectedExitIfNeeded()
        markSessionActive()
        addBreadcrumb("app_start")
        startMainThreadWatchdog()
    }

    func updateScenePhase(_ phase: ScenePhase) {
        switch phase {
        case .active:
            addBreadcrumb("scene_active")
            markSessionActive()
        case .inactive:
            addBreadcrumb("scene_inactive")
        case .background:
            addBreadcrumb("scene_background")
            markSessionClean()
        @unknown default:
            addBreadcrumb("scene_unknown")
        }
    }

    func addBreadcrumb(_ message: String) {
        queue.async {
            var breadcrumbs = self.defaults.stringArray(forKey: self.breadcrumbsKey) ?? []
            let timestamp = Self.timestampFormatter.string(from: Date())
            breadcrumbs.append("\(timestamp) \(message)")
            if breadcrumbs.count > self.maxBreadcrumbs {
                breadcrumbs.removeFirst(breadcrumbs.count - self.maxBreadcrumbs)
            }
            self.defaults.set(breadcrumbs, forKey: self.breadcrumbsKey)
        }
    }

    func reportCrash(_ reason: String) {
        let message = """
        \(reason)
        Last: \(latestBreadcrumbSummary())
        """
        defaults.set(message, forKey: lastCrashKey)
        defaults.set("crash", forKey: lastCrashKindKey)
        #if DEBUG
        scheduleNotification(
            identifier: "perkly_diagnostics_crash",
            title: "Perkly DEV: crash",
            body: message
        )
        #endif
    }

    private func installExceptionHandler() {
        NSSetUncaughtExceptionHandler { exception in
            let reason = exception.reason ?? "No reason"
            let stack = exception.callStackSymbols.prefix(5).joined(separator: "\n")
            AppDiagnosticsService.shared.reportCrash("""
            Uncaught exception: \(exception.name.rawValue)
            Reason: \(reason)
            Stack: \(stack)
            """)
        }
    }

    private func reportPreviousUnexpectedExitIfNeeded() {
        if let crash = defaults.string(forKey: lastCrashKey), !crash.isEmpty {
            upload(kind: defaults.string(forKey: lastCrashKindKey) ?? "crash", message: crash)
            #if DEBUG
            scheduleNotification(
                identifier: "perkly_diagnostics_previous_exception",
                title: "Perkly DEV: previous crash",
                body: crash
            )
            #endif
            return
        }

        guard defaults.bool(forKey: sessionActiveKey) else { return }
        let message = "Previous session ended unexpectedly. Last: \(latestBreadcrumbSummary())"
        defaults.set(message, forKey: lastCrashKey)
        defaults.set("unexpected_exit", forKey: lastCrashKindKey)
        upload(kind: "unexpected_exit", message: message)
        #if DEBUG
        scheduleNotification(
            identifier: "perkly_diagnostics_unexpected_exit",
            title: "Perkly DEV: previous session ended unexpectedly",
            body: message
        )
        #endif
    }

    private func markSessionActive() {
        defaults.set(true, forKey: sessionActiveKey)
    }

    private func markSessionClean() {
        defaults.set(false, forKey: sessionActiveKey)
    }

    private func startMainThreadWatchdog() {
        queue.async { [weak self] in
            guard let self else { return }

            self.lastMainBeat = Date()

            let timer = DispatchSource.makeTimerSource(queue: self.queue)
            timer.schedule(deadline: .now() + 1, repeating: 1)
            timer.setEventHandler { [weak self] in
                guard let self else { return }

                DispatchQueue.main.async {
                    self.queue.async {
                        self.lastMainBeat = Date()
                        self.hangReported = false
                    }
                }

                let lag = Date().timeIntervalSince(self.lastMainBeat)
                if lag >= self.hangThreshold, !self.hangReported {
                    self.hangReported = true
                    let roundedLag = String(format: "%.1f", lag)
                    let message = "Main thread frozen for \(roundedLag)s. Last: \(self.latestBreadcrumbSummary())"
                    self.defaults.set(message, forKey: self.lastCrashKey)
                    self.defaults.set("hang", forKey: self.lastCrashKindKey)
                    self.upload(kind: "hang", message: message)
                    #if DEBUG
                    self.scheduleNotification(
                        identifier: "perkly_diagnostics_hang",
                        title: "Perkly DEV: app hang",
                        body: message
                    )
                    #endif
                    print("Diagnostics hang detected: \(message)")
                }
            }
            self.watchdogTimer = timer
            timer.resume()
        }
    }

    private func scheduleNotification(identifier: String, title: String, body: String) {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = String(body.prefix(240))
        content.sound = .default

        let request = UNNotificationRequest(identifier: identifier, content: content, trigger: nil)
        notificationCenter.add(request) { error in
            if let error {
                print("Diagnostics notification error: \(error.localizedDescription)")
            }
        }
    }

    private func latestBreadcrumbSummary() -> String {
        let breadcrumbs = defaults.stringArray(forKey: breadcrumbsKey) ?? []
        return breadcrumbs.suffix(4).joined(separator: " | ")
    }

    private func upload(kind: String, message: String) {
        let breadcrumbs = defaults.stringArray(forKey: breadcrumbsKey) ?? []
        let info = Bundle.main.infoDictionary
        let version = "\(info?["CFBundleShortVersionString"] as? String ?? "?") (\(info?["CFBundleVersion"] as? String ?? "?"))"
        let payload: [String: Any] = [
            "kind": kind,
            "message": String(message.prefix(8_000)),
            "appVersion": version,
            "osVersion": ProcessInfo.processInfo.operatingSystemVersionString,
            "deviceModel": "Apple mobile device",
            "breadcrumbs": Array(breadcrumbs.suffix(maxBreadcrumbs))
        ]
        Task {
            do {
                let _: DiagnosticsUploadResponse = try await APIClient.shared.post("/diagnostics/events", body: payload)
                defaults.removeObject(forKey: lastCrashKey)
                defaults.removeObject(forKey: lastCrashKindKey)
            } catch {
                // Keep the pending report and retry on the next launch.
            }
        }
    }

    private static let timestampFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm:ss"
        return formatter
    }()

}

private struct DiagnosticsUploadResponse: Codable {
    let id: String
    let fingerprint: String
    let occurrences: Int
}
