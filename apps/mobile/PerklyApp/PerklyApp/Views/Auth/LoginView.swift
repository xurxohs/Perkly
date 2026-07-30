import SwiftUI

/// A single authentication entry point for Telegram and email.
struct LoginView: View {
    @EnvironmentObject private var authVM: AuthViewModel
    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    @State private var contentVisible = false
    @State private var showsEmailLogin = true
    @State private var showsRegistration = false
    @FocusState private var focusedField: LoginField?

    private enum LoginField {
        case email
        case password
    }

    var body: some View {
        GeometryReader { proxy in
            ZStack {
                PerklyAuthHeroBackground()

                LinearGradient(
                    colors: [
                        Color.black.opacity(0.18),
                        Color.black.opacity(0.08),
                        Color.black.opacity(0.72)
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .ignoresSafeArea()
                .accessibilityHidden(true)

                VStack(spacing: 0) {
                    Spacer(minLength: proxy.safeAreaInsets.top + 44)

                    brand
                        .padding(.horizontal, 24)
                        .opacity(contentVisible ? 1 : 0)
                        .offset(y: contentVisible ? 0 : 12)

                    Spacer()

                    authPanel
                        .padding(.horizontal, 18)
                        .padding(.bottom, max(18, proxy.safeAreaInsets.bottom + 10))
                        .opacity(contentVisible ? 1 : 0)
                        .offset(y: contentVisible ? 0 : 24)
                }
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .onAppear {
            authVM.error = nil
            if reduceMotion {
                contentVisible = true
            } else {
                withAnimation(.easeOut(duration: 0.42)) {
                    contentVisible = true
                }
            }
        }
        .onChange(of: authVM.isAuthenticated) { _, authenticated in
            if authenticated { dismiss() }
        }
        .sheet(isPresented: $showsRegistration) {
            NavigationStack {
                RegisterView()
                    .environmentObject(authVM)
                    .toolbar {
                        ToolbarItem(placement: .topBarLeading) {
                            Button("Закрыть") {
                                showsRegistration = false
                            }
                        }
                    }
            }
        }
    }

    private var brand: some View {
        VStack(spacing: 14) {
            PerklyBrandMark(size: 92)
                .shadow(color: .perklyPurple.opacity(0.34), radius: 28, y: 12)

            Text("Perkly")
                .font(.system(size: 42, weight: .heavy, design: .rounded))
                .foregroundStyle(.white)
                .accessibilityAddTraits(.isHeader)
        }
    }

    private var authPanel: some View {
        VStack(spacing: 22) {
            VStack(spacing: 8) {
                Text(authVM.isLoading ? "Подтвердите вход" : "Войдите в Perkly")
                    .font(.system(size: 29, weight: .bold))
                    .foregroundStyle(.white)
                    .multilineTextAlignment(.center)

                Text(
                    authVM.isLoading
                        ? "Мы открыли Telegram. Нажмите «Подтвердить» в боте — Perkly продолжит автоматически."
                        : "Выберите Telegram или войдите по email."
                )
                .font(.system(size: 15, weight: .medium))
                .foregroundStyle(.white.opacity(0.68))
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
            }

            if let error = authVM.error {
                PerklyAuthErrorView(error: error)
            }

            Button {
                HapticManager.shared.lightImpact()
                Task { await authVM.loginWithTelegram() }
            } label: {
                HStack(spacing: 12) {
                    if authVM.isLoading {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Image("TelegramBrand")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 25, height: 25)
                            .accessibilityHidden(true)
                    }

                    Text(
                        authVM.isLoading
                            ? "Ждём подтверждение · \(authVM.telegramWaitSeconds) сек"
                            : (authVM.error == nil ? "Продолжить через Telegram" : "Попробовать снова")
                    )
                        .font(.system(size: 17, weight: .bold))
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .frame(minHeight: 60)
                .background(
                    LinearGradient(
                        colors: [
                            Color(red: 36 / 255, green: 161 / 255, blue: 222 / 255),
                            Color(red: 28 / 255, green: 139 / 255, blue: 208 / 255)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    in: Capsule()
                )
                .shadow(color: Color(red: 36 / 255, green: 161 / 255, blue: 222 / 255).opacity(0.28), radius: 20, y: 10)
            }
            .buttonStyle(.plain)
            .disabled(authVM.isLoading)
            .accessibilityHint("Открывает официальный Telegram-бот Perkly для подтверждения входа")

            if authVM.isLoading {
                HStack(spacing: 10) {
                    Button {
                        HapticManager.shared.lightImpact()
                        authVM.reopenTelegramLogin()
                    } label: {
                        Label("Открыть Telegram", systemImage: "paperplane.fill")
                            .frame(maxWidth: .infinity)
                    }

                    Button(role: .cancel) {
                        authVM.cancelTelegramLogin()
                    } label: {
                        Text("Отменить")
                            .frame(maxWidth: .infinity)
                    }
                }
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(.white)
                .buttonStyle(PerklyAuthSecondaryButtonStyle())
                .transition(.opacity.combined(with: .move(edge: .bottom)))
            } else {
                emailSection
            }

            Text("Продолжая, вы принимаете Условия использования и Политику конфиденциальности.")
                .font(.caption)
                .foregroundStyle(.white.opacity(0.46))
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 22)
        .frame(maxWidth: 430)
        .authPanelGlass()
    }

    private var emailSection: some View {
        VStack(spacing: 14) {
            HStack(spacing: 12) {
                Rectangle()
                    .fill(.white.opacity(0.18))
                    .frame(height: 1)

                Text("ИЛИ ПО EMAIL")
                    .font(.caption2.weight(.bold))
                    .tracking(1.4)
                    .foregroundStyle(.white.opacity(0.52))
                    .fixedSize()

                Rectangle()
                    .fill(.white.opacity(0.18))
                    .frame(height: 1)
            }

            if showsEmailLogin {
                VStack(spacing: 12) {
                    PerklyAuthTextField(
                        title: "Email",
                        text: $authVM.loginEmail,
                        keyboardType: .emailAddress,
                        textContentType: .username
                    )
                    .focused($focusedField, equals: .email)
                    .onSubmit {
                        focusedField = .password
                    }

                    PerklyAuthSecureField(
                        title: "Пароль",
                        text: $authVM.loginPassword
                    )
                    .focused($focusedField, equals: .password)
                    .onSubmit {
                        submitEmailLogin()
                    }

                    Button {
                        submitEmailLogin()
                    } label: {
                        PerklyAuthButtonLabel(
                            title: "Войти по email",
                            isLoading: authVM.isLoading,
                            loadingTint: .black
                        )
                    }
                    .buttonStyle(PerklyAuthPrimaryButtonStyle())
                    .disabled(authVM.isLoading)

                    HStack(spacing: 5) {
                        Text("Нет аккаунта?")
                            .foregroundStyle(.white.opacity(0.58))

                        Button("Создать") {
                            focusedField = nil
                            showsRegistration = true
                        }
                        .foregroundStyle(.white)
                        .fontWeight(.semibold)
                    }
                    .font(.footnote)
                }
                .transition(.opacity.combined(with: .move(edge: .top)))
            } else {
                Button {
                    withAnimation(.easeInOut(duration: 0.22)) {
                        showsEmailLogin = true
                    }
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
                        focusedField = .email
                    }
                } label: {
                    Label("Войти по email", systemImage: "envelope.fill")
                }
                .buttonStyle(PerklyAuthGlassButtonStyle())
            }
        }
    }

    private func submitEmailLogin() {
        focusedField = nil
        HapticManager.shared.lightImpact()
        Task {
            await authVM.login()
        }
    }
}

private struct PerklyAuthSecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .padding(.horizontal, 12)
            .frame(minHeight: 44)
            .background(.white.opacity(configuration.isPressed ? 0.18 : 0.10), in: Capsule())
            .overlay {
                Capsule()
                    .stroke(.white.opacity(0.12), lineWidth: 0.7)
            }
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
    }
}

#Preview {
    LoginView()
        .environmentObject(AuthViewModel())
}
