import SwiftUI

struct RegisterView: View {
    @EnvironmentObject var authVM: AuthViewModel
    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    private let profileSetupOnly: Bool

    @State private var step: RegisterOnboardingStep = .intro
    @State private var birthYear = ""
    @State private var selectedInterests: Set<String> = []
    @State private var localError: String?
    @State private var isWaitingForTelegram = false

    private let interests = InterestOption.defaultOptions

    init(profileSetupOnly: Bool = false) {
        self.profileSetupOnly = profileSetupOnly
        _step = State(initialValue: profileSetupOnly ? .birth : .intro)
    }

    private var vibe: PerklyVibe {
        PerklyVibe.from(yearText: birthYear)
    }

    private var passName: String {
        let formName = authVM.registerName.trimmingCharacters(in: .whitespacesAndNewlines)
        if !formName.isEmpty { return formName }

        if let displayName = authVM.user?.displayName, !displayName.isEmpty {
            return displayName
        }

        return "Новый участник"
    }

    private var passHandle: String {
        if let email = authVM.user?.email, !email.isEmpty {
            return email
        }

        let email = authVM.registerEmail.trimmingCharacters(in: .whitespacesAndNewlines)
        return email.isEmpty ? "@perkly.pass" : email
    }

    var body: some View {
        ZStack {
            Color.perklyDark.ignoresSafeArea()

            LinearGradient(
                colors: [
                    Color.perklyPurple.opacity(0.24),
                    Color.perklyPink.opacity(0.12),
                    Color.perklyDark.opacity(0.2)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 18) {
                    RegisterHeader(step: step)

                    PerklyPassPreview(
                        name: passName,
                        handle: passHandle,
                        vibe: vibe,
                        selectedCount: selectedInterests.count
                    )

                    stepContent
                        .padding(18)
                        .perklySurface(cornerRadius: 24)
                }
                .padding(.horizontal, 18)
                .padding(.top, 18)
                .padding(.bottom, 32)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbarColorScheme(.dark, for: .navigationBar)
    }

    @ViewBuilder
    private var stepContent: some View {
        switch step {
        case .intro:
            introStep
        case .method:
            methodStep
        case .email:
            emailStep
        case .birth:
            birthStep
        case .interests:
            interestsStep
        case .success:
            successStep
        }
    }

    private var introStep: some View {
        VStack(alignment: .leading, spacing: 18) {
            StepTitle(
                eyebrow: "PERKLY PASS",
                title: "Настроим Perkly под вас",
                subtitle: "Создайте аккаунт, выберите интересы и сразу получите персональную подборку."
            )

            VStack(spacing: 10) {
                BenefitRow(icon: "ticket.fill", title: "Купоны", subtitle: "Акции и скидки без лишнего шума", tint: .perklyPink)
                BenefitRow(icon: "flame.fill", title: "Топка", subtitle: "Срочные акции и события", tint: .perklyOrange)
                BenefitRow(icon: "sparkles", title: "Подборка", subtitle: "Предложения по вашим интересам", tint: .perklyCyan)
            }

            PrimaryOnboardingButton(
                title: "Продолжить через Telegram",
                icon: "paperplane.fill",
                isLoading: isWaitingForTelegram
            ) {
                continueWithTelegram()
            }

            SecondaryOnboardingButton(
                title: "Зарегистрироваться по Email",
                icon: "envelope.fill"
            ) {
                move(to: .email)
            }
        }
    }

    private var methodStep: some View {
        VStack(alignment: .leading, spacing: 16) {
            StepTitle(
                eyebrow: "ШАГ 1",
                title: "Как создадим аккаунт?",
                subtitle: "Telegram быстрее. Email подойдет, если хочешь классическую регистрацию."
            )

            MethodButton(
                title: "Продолжить через Telegram",
                subtitle: isWaitingForTelegram ? "Подтверди вход в Telegram, мы ждем ответ" : "Откроем Telegram и вернем тебя в Perkly",
                icon: "paperplane.fill",
                tint: .perklyCyan,
                isLoading: isWaitingForTelegram
            ) {
                continueWithTelegram()
            }

            if isWaitingForTelegram {
                TelegramWaitingCard()
            }

            MethodButton(
                title: "Зарегистрироваться по Email",
                subtitle: "Имя, email и пароль",
                icon: "envelope.fill",
                tint: .perklyPurple,
                isLoading: false
            ) {
                move(to: .email)
            }

            errorView

            SecondaryOnboardingButton(title: "Назад", icon: "chevron.left") {
                move(to: .intro)
            }
        }
    }

    private var emailStep: some View {
        VStack(alignment: .leading, spacing: 14) {
            StepTitle(
                eyebrow: "EMAIL",
                title: "Минимум полей, максимум пользы",
                subtitle: "После регистрации выберем интересы для первого экрана."
            )

            AuthTextField(
                label: "Имя",
                icon: "person.fill",
                placeholder: "Как тебя показывать",
                text: $authVM.registerName,
                contentType: .name
            )

            AuthTextField(
                label: "Email",
                icon: "envelope.fill",
                placeholder: "your@email.com",
                text: $authVM.registerEmail,
                keyboardType: .emailAddress,
                contentType: .emailAddress
            )

            AuthSecureField(
                label: "Пароль",
                icon: "lock.fill",
                placeholder: "Минимум 6 символов",
                text: $authVM.registerPassword
            )

            errorView

            PrimaryOnboardingButton(title: "Создать аккаунт", icon: "arrow.right", isLoading: authVM.isLoading) {
                continueWithEmail()
            }
            .disabled(authVM.isLoading)

            SecondaryOnboardingButton(title: "Выбрать другой способ", icon: "chevron.left") {
                move(to: .method)
            }
        }
    }

    private var birthStep: some View {
        VStack(alignment: .leading, spacing: 16) {
            StepTitle(
                eyebrow: "ШАГ 2",
                title: "Укажите год рождения",
                subtitle: "Необязательно. Он помогает скрывать неподходящие по возрасту события и точнее настраивать рекомендации."
            )

            VStack(alignment: .leading, spacing: 10) {
                Text("Год рождения · необязательно")
                    .font(.footnote.weight(.semibold))
                    .foregroundColor(.white.opacity(0.5))
                    .accessibilityHidden(true)

                HStack(spacing: 12) {
                    Image(systemName: "calendar")
                        .foregroundColor(.perklyPurple)
                        .font(.system(size: 20, weight: .semibold))
                        .accessibilityHidden(true)

                    TextField("2001", text: $birthYear)
                        .keyboardType(.numberPad)
                        .font(.title.bold())
                        .foregroundColor(.white)
                        .textContentType(.birthdate)
                        .accessibilityLabel("Год рождения, необязательно")
                        .accessibilityHint("Введите четыре цифры или пропустите этот шаг")
                        .onChange(of: birthYear) { _, value in
                            birthYear = String(value.filter(\.isNumber).prefix(4))
                            localError = nil
                        }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 14)
                .background(Color.white.opacity(0.055))
                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .stroke(Color.white.opacity(0.1), lineWidth: 1)
                )
            }

            if !birthYear.isEmpty {
                VibeCard(vibe: vibe, isReady: isBirthYearValid)
            }

            if let localError {
                InlineErrorView(message: localError)
            }

            PrimaryOnboardingButton(title: "Продолжить", icon: "arrow.right", isLoading: false) {
                guard birthYear.isEmpty || isBirthYearValid else {
                    localError = "Введите реальный год рождения. Perkly доступен с 13 лет."
                    return
                }
                move(to: .interests)
            }

            if birthYear.isEmpty {
                SecondaryOnboardingButton(title: "Пропустить", icon: "forward.fill") {
                    move(to: .interests)
                }
            }

            if !profileSetupOnly {
                SecondaryOnboardingButton(title: "Назад", icon: "chevron.left") {
                    move(to: authVM.isAuthenticated ? .method : .email)
                }
            }
        }
    }

    private var interestsStep: some View {
        VStack(alignment: .leading, spacing: 16) {
            StepTitle(
                eyebrow: "ФИНАЛ",
                title: "Что тебе показывать первым?",
                subtitle: "Выбери несколько тем. Это локально сохранится в приложении и поможет персонализировать первый экран."
            )

            LazyVGrid(columns: interestColumns, spacing: 10) {
                ForEach(interests) { option in
                    InterestChip(
                        option: option,
                        isSelected: selectedInterests.contains(option.id)
                    ) {
                        toggleInterest(option.id)
                    }
                }
            }

            PrimaryOnboardingButton(title: "Готово", icon: "checkmark", isLoading: false) {
                finishOnboarding()
            }

            SecondaryOnboardingButton(title: "Пропустить", icon: "forward.fill") {
                finishOnboarding()
            }
        }
    }

    private var successStep: some View {
        VStack(spacing: 18) {
            ZStack {
                Circle()
                    .fill(Color.greenGradient)
                    .frame(width: 74, height: 74)
                    .shadow(color: .perklyGreen.opacity(0.35), radius: 22, y: 8)

                Image(systemName: "checkmark")
                    .font(.system(size: 30, weight: .black))
                    .foregroundColor(.white)
            }
            .accessibilityHidden(true)

            VStack(spacing: 8) {
                Text("Perkly Pass готов")
                    .font(.title.bold())
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)
                    .accessibilityAddTraits(.isHeader)

                Text("Профиль настроен. Теперь можно смотреть предложения, купоны и события.")
                    .font(.body.weight(.medium))
                    .foregroundColor(.white.opacity(0.58))
                    .multilineTextAlignment(.center)
                    .lineSpacing(3)
            }

            PrimaryOnboardingButton(title: "Смотреть предложения", icon: "sparkles", isLoading: false) {
                dismiss()
            }
        }
        .frame(maxWidth: .infinity)
    }

    @ViewBuilder
    private var errorView: some View {
        if let localError {
            InlineErrorView(message: localError)
        } else if let error = authVM.error {
            InlineErrorView(message: error)
        }
    }

    private var isBirthYearValid: Bool {
        guard let year = Int(birthYear), birthYear.count == 4 else { return false }
        let currentYear = Calendar.current.component(.year, from: Date())
        return (1940...(currentYear - 13)).contains(year)
    }

    private var interestColumns: [GridItem] {
        if dynamicTypeSize.isAccessibilitySize {
            return [GridItem(.flexible())]
        }
        return [GridItem(.flexible()), GridItem(.flexible())]
    }

    private func move(to nextStep: RegisterOnboardingStep) {
        authVM.error = nil
        localError = nil

        withAnimation(reduceMotion ? nil : .spring(response: 0.42, dampingFraction: 0.86)) {
            step = nextStep
        }
    }

    private func continueWithEmail() {
        let name = authVM.registerName.trimmingCharacters(in: .whitespacesAndNewlines)
        let email = authVM.registerEmail.trimmingCharacters(in: .whitespacesAndNewlines)

        guard !name.isEmpty else {
            localError = "Введите имя, которое будет отображаться в профиле."
            return
        }
        guard email.contains("@"), email.contains(".") else {
            localError = "Проверьте адрес электронной почты."
            return
        }
        guard authVM.registerPassword.count >= 6 else {
            localError = "Пароль должен содержать минимум 6 символов."
            return
        }

        localError = nil
        Task {
            await authVM.register()
            if authVM.isAuthenticated {
                move(to: .birth)
            }
        }
    }

    private func continueWithTelegram() {
        Task {
            isWaitingForTelegram = true
            await authVM.loginWithTelegram()
            isWaitingForTelegram = false
            if authVM.isAuthenticated {
                move(to: .birth)
            }
        }
    }

    private func toggleInterest(_ id: String) {
        withAnimation(reduceMotion ? nil : .spring(response: 0.28, dampingFraction: 0.82)) {
            if selectedInterests.contains(id) {
                selectedInterests.remove(id)
            } else {
                selectedInterests.insert(id)
            }
        }
    }

    private func finishOnboarding() {
        let year = Int(birthYear)

        let profile = PerklyOnboardingProfile(
            userId: authVM.user?.id,
            birthYear: year,
            vibeCode: vibe.code,
            vibeTitle: vibe.title,
            interests: Array(selectedInterests).sorted(),
            completedAt: ISO8601DateFormatter().string(from: Date())
        )

        PerklyOnboardingProfileStore.save(profile, for: authVM.user)
        Task {
            if let year {
                _ = try? await UsersService.shared.updateB2CProfile(birthYear: year)
            }
            _ = try? await UsersService.shared.updateInterests(profile.interests)
        }
        NotificationCenter.default.post(name: .perklyOnboardingCompleted, object: nil)
        move(to: .success)
    }
}

struct PerklyOnboardingProfile: Codable, Equatable {
    let userId: String?
    let birthYear: Int?
    let vibeCode: String
    let vibeTitle: String
    let interests: [String]
    let completedAt: String
}

enum PerklyOnboardingProfileStore {
    private static let baseKey = "perkly_onboarding_profile"

    static func isComplete(for user: User?) -> Bool {
        guard let user else { return false }
        if UserDefaults.standard.data(forKey: key(for: user)) != nil { return true }

        // Backward compatibility with the first app-only version of onboarding.
        return UserDefaults.standard.object(forKey: baseKey) != nil
    }

    static func save(_ profile: PerklyOnboardingProfile, for user: User?) {
        guard let data = try? JSONEncoder().encode(profile) else { return }
        UserDefaults.standard.set(data, forKey: key(for: user))
    }

    static func markComplete(for user: User?) {
        save(
            PerklyOnboardingProfile(
                userId: user?.id,
                birthYear: nil,
                vibeCode: "default",
                vibeTitle: "Perkly",
                interests: [],
                completedAt: ISO8601DateFormatter().string(from: Date())
            ),
            for: user
        )
    }

    static func load(for user: User?) -> PerklyOnboardingProfile? {
        guard let data = UserDefaults.standard.data(forKey: key(for: user)) else { return nil }
        return try? JSONDecoder().decode(PerklyOnboardingProfile.self, from: data)
    }

    private static func key(for user: User?) -> String {
        guard let id = user?.id, !id.isEmpty else { return baseKey }
        return "\(baseKey).\(id)"
    }
}

extension Notification.Name {
    static let perklyOnboardingCompleted = Notification.Name("PerklyOnboardingCompleted")
}

private enum RegisterOnboardingStep: Int, CaseIterable {
    case intro
    case method
    case email
    case birth
    case interests
    case success

    var progress: Double {
        Double(rawValue + 1) / Double(Self.allCases.count)
    }

    var label: String {
        switch self {
        case .intro: return "Старт"
        case .method: return "Вход"
        case .email: return "Email"
        case .birth: return "Профиль"
        case .interests: return "Интересы"
        case .success: return "Готово"
        }
    }
}

private struct PerklyVibe {
    let code: String
    let title: String
    let subtitle: String
    let signal: String
    let icon: String
    let colors: [Color]

    static func from(yearText: String) -> PerklyVibe {
        guard let year = Int(yearText), yearText.count == 4 else {
            return PerklyVibe(
                code: "preview",
                title: "Стиль Perkly",
                subtitle: "Укажите год, чтобы точнее настроить рекомендации.",
                signal: "Perkly учтёт возрастные ограничения и поднимет подходящие предложения выше.",
                icon: "sparkles",
                colors: [.perklyPurple, .perklyPink]
            )
        }

        switch year {
        case ...1989:
            return PerklyVibe(
                code: "value-master",
                title: "Практичная выгода",
                subtitle: "Точные предложения без лишнего шума",
                signal: "Perkly будет показывать понятные скидки и предложения с реальной пользой.",
                icon: "crown.fill",
                colors: [.perklyGold, .perklyOrange]
            )
        case 1990...1996:
            return PerklyVibe(
                code: "smart-hunter",
                title: "Умный выбор",
                subtitle: "Выгодные предложения в нужный момент",
                signal: "Perkly поднимет выше ограниченные акции, бонусы и новые возможности.",
                icon: "target",
                colors: [.perklyPurple, .perklyCyan]
            )
        case 1997...2003:
            return PerklyVibe(
                code: "drop-seeker",
                title: "Новые впечатления",
                subtitle: "Свежие места, бренды и события",
                signal: "Perkly будет показывать новые предложения и интересные места раньше обычной витрины.",
                icon: "bolt.fill",
                colors: [.perklyPink, .perklyPurple]
            )
        default:
            return PerklyVibe(
                code: "trend-rider",
                title: "Быстрые находки",
                subtitle: "Красиво, выгодно и рядом",
                signal: "Perkly соберёт короткие и понятные предложения, которые легко использовать сразу.",
                icon: "waveform.path.ecg",
                colors: [.perklyCyan, .perklyGreen]
            )
        }
    }
}

private struct InterestOption: Identifiable {
    let id: String
    let title: String
    let icon: String

    static let defaultOptions: [InterestOption] = [
        .init(id: "food", title: "Еда", icon: "fork.knife"),
        .init(id: "beauty", title: "Красота", icon: "sparkles"),
        .init(id: "shopping", title: "Шопинг", icon: "bag.fill"),
        .init(id: "coffee", title: "Кофе", icon: "cup.and.saucer.fill"),
        .init(id: "events", title: "События", icon: "music.note"),
        .init(id: "tech", title: "Техника", icon: "iphone")
    ]
}

private struct RegisterHeader: View {
    let step: RegisterOnboardingStep

    var body: some View {
        VStack(spacing: 12) {
            HStack {
                HStack(spacing: 9) {
                    ZStack {
                        Circle()
                            .fill(Color.primaryGradient)
                            .frame(width: 34, height: 34)
                        Text("P")
                            .font(.system(size: 17, weight: .black))
                            .foregroundColor(.white)
                    }
                    .accessibilityHidden(true)

                    VStack(alignment: .leading, spacing: 1) {
                        Text("Perkly")
                            .font(.system(size: 17, weight: .black, design: .rounded))
                            .foregroundColor(.white)
                        Text(step.label)
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(.white.opacity(0.42))
                    }
                }

                Spacer()

                Text("\(Int(step.progress * 100))%")
                    .font(.system(size: 12, weight: .bold, design: .rounded))
                    .foregroundColor(.white.opacity(0.76))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 7)
                    .background(Color.white.opacity(0.08))
                    .clipShape(Capsule())
            }

            GeometryReader { proxy in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(Color.white.opacity(0.08))
                    Capsule()
                        .fill(Color.primaryGradient)
                        .frame(width: proxy.size.width * step.progress)
                }
            }
            .frame(height: 5)
            .accessibilityHidden(true)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Шаг \(step.label)")
        .accessibilityValue("\(Int(step.progress * 100)) процентов")
    }
}

private struct PerklyPassPreview: View {
    let name: String
    let handle: String
    let vibe: PerklyVibe
    let selectedCount: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("PERKLY PASS")
                        .font(.system(size: 11, weight: .black))
                        .foregroundColor(.white.opacity(0.52))
                    Text(name)
                        .font(.system(size: 26, weight: .black, design: .rounded))
                        .foregroundColor(.white)
                        .lineLimit(1)
                        .minimumScaleFactor(0.75)
                    Text(handle)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(.white.opacity(0.58))
                        .lineLimit(1)
                }

                Spacer()

                ZStack {
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: vibe.colors,
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 52, height: 52)

                    Image(systemName: vibe.icon)
                        .font(.system(size: 22, weight: .black))
                        .foregroundColor(.white)
                }
                .accessibilityHidden(true)
            }

            ViewThatFits(in: .horizontal) {
                HStack(spacing: 10) {
                    PassPill(title: vibe.title, icon: "sparkle")
                    PassPill(title: selectedCount == 0 ? "Интересы" : "Выбрано: \(selectedCount)", icon: "slider.horizontal.3")
                }

                VStack(alignment: .leading, spacing: 8) {
                    PassPill(title: vibe.title, icon: "sparkle")
                    PassPill(title: selectedCount == 0 ? "Интересы" : "Выбрано: \(selectedCount)", icon: "slider.horizontal.3")
                }
            }
        }
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 26, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: [
                            Color.white.opacity(0.13),
                            Color.white.opacity(0.055),
                            Color.perklyPurple.opacity(0.12)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
        )
        .overlay(
            RoundedRectangle(cornerRadius: 26, style: .continuous)
                .stroke(Color.white.opacity(0.12), lineWidth: 1)
        )
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Предпросмотр Perkly Pass. \(name), \(handle), стиль \(vibe.title), выбрано интересов: \(selectedCount)")
    }
}

private struct PassPill: View {
    let title: String
    let icon: String

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 11, weight: .bold))
                .accessibilityHidden(true)
            Text(L10n.tr(title))
                .font(.footnote.weight(.bold))
                .lineLimit(1)
        }
        .foregroundColor(.white.opacity(0.82))
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .background(Color.white.opacity(0.08))
        .clipShape(Capsule())
    }
}

private struct StepTitle: View {
    let eyebrow: String
    let title: String
    let subtitle: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(L10n.tr(eyebrow))
                .font(.caption.weight(.black))
                .foregroundColor(.perklyPink)

            Text(L10n.tr(title))
                .font(.title2.bold())
                .foregroundColor(.white)
                .fixedSize(horizontal: false, vertical: true)
                .accessibilityAddTraits(.isHeader)

            Text(L10n.tr(subtitle))
                .font(.body.weight(.medium))
                .foregroundColor(.white.opacity(0.58))
                .lineSpacing(3)
                .fixedSize(horizontal: false, vertical: true)
        }
    }
}

private struct BenefitRow: View {
    let icon: String
    let title: String
    let subtitle: String
    let tint: Color

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(tint.opacity(0.16))
                    .frame(width: 42, height: 42)

                Image(systemName: icon)
                    .font(.system(size: 17, weight: .bold))
                    .foregroundColor(tint)
            }
            .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 3) {
                Text(L10n.tr(title))
                    .font(.headline)
                    .foregroundColor(.white)
                Text(L10n.tr(subtitle))
                    .font(.subheadline.weight(.medium))
                    .foregroundColor(.white.opacity(0.48))
                    .fixedSize(horizontal: false, vertical: true)
            }

            Spacer(minLength: 0)
        }
        .padding(12)
        .background(Color.white.opacity(0.045))
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .accessibilityElement(children: .combine)
    }
}

private struct MethodButton: View {
    let title: String
    let subtitle: String
    let icon: String
    let tint: Color
    let isLoading: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 13) {
                ZStack {
                    RoundedRectangle(cornerRadius: 15, style: .continuous)
                        .fill(tint.opacity(0.16))
                        .frame(width: 46, height: 46)

                    if isLoading {
                        ProgressView()
                            .tint(tint)
                    } else {
                        Image(systemName: icon)
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(tint)
                    }
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text(L10n.tr(title))
                        .font(.headline)
                        .foregroundColor(.white)
                        .multilineTextAlignment(.leading)
                        .fixedSize(horizontal: false, vertical: true)
                    Text(L10n.tr(subtitle))
                        .font(.subheadline.weight(.medium))
                        .foregroundColor(.white.opacity(0.48))
                        .multilineTextAlignment(.leading)
                        .fixedSize(horizontal: false, vertical: true)
                }

                Spacer(minLength: 0)

                Image(systemName: "chevron.right")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.white.opacity(0.28))
            }
            .padding(14)
            .background(Color.white.opacity(0.05))
            .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .stroke(Color.white.opacity(0.08), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        .disabled(isLoading)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(L10n.tr(title))
        .accessibilityValue(isLoading ? "Загрузка" : "")
        .accessibilityHint(L10n.tr(subtitle))
    }
}

private struct VibeCard: View {
    let vibe: PerklyVibe
    let isReady: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top, spacing: 12) {
                ZStack {
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .fill(
                            LinearGradient(
                                colors: vibe.colors.map { $0.opacity(isReady ? 0.95 : 0.5) },
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 54, height: 54)

                    Image(systemName: vibe.icon)
                        .font(.system(size: 22, weight: .black))
                        .foregroundColor(.white)
                }
                .accessibilityHidden(true)

                VStack(alignment: .leading, spacing: 5) {
                    Text(L10n.tr(vibe.title))
                        .font(.title3.bold())
                        .foregroundColor(.white)
                    Text(L10n.tr(vibe.subtitle))
                        .font(.subheadline.weight(.bold))
                        .foregroundColor(.white.opacity(0.54))
                }
            }

            Text(L10n.tr(vibe.signal))
                .font(.body.weight(.medium))
                .foregroundColor(.white.opacity(0.7))
                .lineSpacing(4)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .fill(Color.white.opacity(0.055))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .stroke(
                    LinearGradient(
                        colors: vibe.colors.map { $0.opacity(isReady ? 0.55 : 0.18) },
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 1
                )
        )
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(L10n.tr(vibe.title)). \(L10n.tr(vibe.subtitle)). \(L10n.tr(vibe.signal))")
    }
}

private struct TelegramWaitingCard: View {
    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(Color.perklyCyan.opacity(0.16))
                    .frame(width: 42, height: 42)

                ProgressView()
                    .tint(.perklyCyan)
            }

            VStack(alignment: .leading, spacing: 3) {
                Text("Ждем Telegram")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white)
                Text("После подтверждения мы автоматически откроем настройку профиля.")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.white.opacity(0.5))
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(13)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.perklyCyan.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(Color.perklyCyan.opacity(0.18), lineWidth: 1)
        )
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Ожидаем подтверждение в Telegram")
    }
}

private struct InterestChip: View {
    let option: InterestOption
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: option.icon)
                    .font(.system(size: 18, weight: .bold))
                Text(L10n.tr(option.title))
                    .font(.headline)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .foregroundColor(isSelected ? .white : .white.opacity(0.68))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .frame(minHeight: 82)
            .background(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .fill(isSelected ? Color.perklyPurple.opacity(0.38) : Color.white.opacity(0.05))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(isSelected ? Color.perklyPink.opacity(0.72) : Color.white.opacity(0.08), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(L10n.tr(option.title))
        .accessibilityValue(isSelected ? "Выбрано" : "Не выбрано")
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}

private struct PrimaryOnboardingButton: View {
    let title: String
    let icon: String
    let isLoading: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 9) {
                if isLoading {
                    ProgressView()
                        .tint(.white)
                } else {
                    Text(L10n.tr(title))
                        .font(.system(size: 16, weight: .black))

                    Image(systemName: icon)
                        .font(.system(size: 14, weight: .black))
                }
            }
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(Color.primaryGradient)
            .clipShape(RoundedRectangle(cornerRadius: 17, style: .continuous))
            .shadow(color: .perklyPurple.opacity(0.24), radius: 18, y: 8)
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(L10n.tr(title))
        .accessibilityValue(isLoading ? "Загрузка" : "")
    }
}

private struct SecondaryOnboardingButton: View {
    let title: String
    let icon: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 7) {
                Image(systemName: icon)
                    .font(.system(size: 12, weight: .bold))
                Text(L10n.tr(title))
                    .font(.system(size: 14, weight: .bold))
            }
            .foregroundColor(.white.opacity(0.58))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .frame(minHeight: PerklyDesign.Size.minimumTouchTarget)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(L10n.tr(title))
    }
}

private struct InlineErrorView: View {
    let message: String

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "exclamationmark.circle.fill")
                .foregroundColor(.perklyRed)
                .accessibilityHidden(true)
            Text(L10n.tr(message))
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(.perklyRed)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.perklyRed.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Ошибка: \(message)")
    }
}

// MARK: - Reusable Auth Fields

struct AuthTextField: View {
    let label: String
    let icon: String
    let placeholder: String
    @Binding var text: String
    var keyboardType: UIKeyboardType = .default
    var contentType: UITextContentType? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(L10n.tr(label))
                .font(.footnote.weight(.medium))
                .foregroundColor(.white.opacity(0.5))
                .accessibilityHidden(true)

            HStack(spacing: 10) {
                Image(systemName: icon)
                    .foregroundColor(.white.opacity(0.34))
                    .font(.system(size: 15, weight: .semibold))
                    .accessibilityHidden(true)

                TextField(L10n.tr(placeholder), text: $text)
                    .font(.body)
                    .foregroundColor(.white)
                    .keyboardType(keyboardType)
                    .textContentType(contentType)
                    .autocapitalization(.none)
                    .autocorrectionDisabled()
                    .accessibilityLabel(L10n.tr(label))
            }
            .padding(16)
            .background(Color.white.opacity(0.05))
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(Color.white.opacity(0.09), lineWidth: 1)
            )
        }
    }
}

private struct AuthSecureField: View {
    let label: String
    let icon: String
    let placeholder: String
    @Binding var text: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(L10n.tr(label))
                .font(.footnote.weight(.medium))
                .foregroundColor(.white.opacity(0.5))
                .accessibilityHidden(true)

            HStack(spacing: 10) {
                Image(systemName: icon)
                    .foregroundColor(.white.opacity(0.34))
                    .font(.system(size: 15, weight: .semibold))
                    .accessibilityHidden(true)

                SecureField(L10n.tr(placeholder), text: $text)
                    .font(.body)
                    .foregroundColor(.white)
                    .textContentType(.newPassword)
                    .accessibilityLabel(L10n.tr(label))
            }
            .padding(16)
            .background(Color.white.opacity(0.05))
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(Color.white.opacity(0.09), lineWidth: 1)
            )
        }
    }
}
