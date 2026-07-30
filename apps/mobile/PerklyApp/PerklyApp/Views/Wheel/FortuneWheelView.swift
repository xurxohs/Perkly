import SwiftUI

struct FortuneWheelView: View {
    @StateObject private var vm = WheelViewModel()
    @EnvironmentObject var authVM: AuthViewModel
    @State private var showLoginPrompt = false
    @State private var isPressingSpin = false
    @State private var ambientPulse = false

    var body: some View {
        ZStack {
            FortuneWheelBackground(isSpinning: vm.isSpinning, hasResult: vm.showResult)

            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 20) {
                    header
                        .padding(.horizontal, 22)
                        .padding(.top, 18)

                    PremiumWheelStage(
                        segments: vm.segments,
                        rotation: vm.rotation,
                        isSpinning: vm.isSpinning,
                        resultIndex: vm.showResult ? vm.lastWinIndex : nil,
                        ambientPulse: ambientPulse
                    )
                    .frame(height: 362)
                    .padding(.horizontal, 16)
                    .padding(.top, 4)

                    spinControl
                        .padding(.horizontal, 22)

                    statusStrip
                        .padding(.horizontal, 22)

                    if vm.showResult, let result = vm.result {
                        WheelResultCard(
                            result: result,
                            points: vm.claimedPoints,
                            message: vm.claimError ?? vm.claimMessage,
                            isError: vm.claimError != nil
                        )
                        .padding(.horizontal, 22)
                        .transition(.asymmetric(
                            insertion: .scale(scale: 0.92).combined(with: .opacity).combined(with: .move(edge: .bottom)),
                            removal: .opacity
                        ))
                    }

                    Spacer(minLength: 26)
                }
            }
        }
        .navigationTitle("Фортуна")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .onAppear {
            withAnimation(.easeInOut(duration: 2.4).repeatForever(autoreverses: true)) {
                ambientPulse = true
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .perklyWheelRewardClaimed)) { _ in
            Task { await authVM.refreshUser() }
        }
        .sheet(isPresented: $showLoginPrompt) {
            NavigationStack {
                LoginView()
                    .environmentObject(authVM)
                    .navigationBarItems(leading: Button("Закрыть") {
                        showLoginPrompt = false
                    })
            }
        }
        .task(id: wheelLoadKey) {
            if authVM.isAuthenticated {
                await vm.loadStatus()
            } else {
                vm.resetStatusForGuest()
            }
        }
        .animation(.spring(response: 0.42, dampingFraction: 0.86), value: vm.showResult)
        .animation(.easeOut(duration: 0.22), value: vm.isSpinning)
    }

    private var header: some View {
        VStack(spacing: 12) {
            HStack(spacing: 8) {
                Image(systemName: "sparkles")
                    .font(.system(size: 12, weight: .black))
                Text("Ежедневный шанс")
                    .font(.system(size: 12, weight: .black))
            }
            .foregroundColor(.perklyGold)
            .padding(.horizontal, 12)
            .padding(.vertical, 7)
            .background(Color.perklyGold.opacity(0.12))
            .clipShape(Capsule())

            VStack(spacing: 6) {
                Text("Колесо Фортуны")
                    .font(.system(size: 32, weight: .heavy))
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)

                Text(headlineSubtitle)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.white.opacity(0.48))
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    private var spinControl: some View {
        Button {
            handleSpinTap()
        } label: {
            HStack(spacing: 10) {
                Image(systemName: vm.isSpinning ? "sparkles" : primaryButtonIcon)
                    .font(.system(size: 17, weight: .black))

                Text(buttonTitle)
                    .font(.system(size: 17, weight: .heavy))
                    .lineLimit(1)
                    .minimumScaleFactor(0.82)

                if vm.isSpinning {
                    ProgressView()
                        .tint(.white)
                        .scaleEffect(0.7)
                }
            }
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 18)
            .background(primaryButtonFill)
            .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .stroke(Color.white.opacity(canTapPrimary ? 0.14 : 0.06), lineWidth: 1)
            )
            .shadow(color: .perklyPurple.opacity(canTapPrimary ? 0.34 : 0.0), radius: 18, y: 10)
            .scaleEffect(isPressingSpin ? 0.98 : 1)
            .animation(.spring(response: 0.24, dampingFraction: 0.78), value: isPressingSpin)
        }
        .buttonStyle(.plain)
        .disabled(authVM.isAuthenticated && (!vm.canSpin || vm.isSpinning))
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in
                    guard canTapPrimary else { return }
                    isPressingSpin = true
                }
                .onEnded { _ in
                    isPressingSpin = false
                }
        )
        .accessibilityLabel(buttonTitle)
    }

    private var statusStrip: some View {
        HStack(spacing: 10) {
            WheelStatusPill(
                icon: authVM.isAuthenticated ? "clock.fill" : "person.crop.circle.badge.exclamationmark",
                title: spinsStatusTitle,
                tint: vm.canSpin ? .perklyGreen : .white.opacity(0.55)
            )

            WheelStatusPill(
                icon: "shield.lefthalf.filled",
                title: "Награда с сервера",
                tint: .perklyCyan
            )
        }
    }

    private var primaryButtonFill: AnyShapeStyle {
        guard canTapPrimary else {
            return AnyShapeStyle(Color.white.opacity(0.08))
        }
        return AnyShapeStyle(Color.primaryGradient)
    }

    private var canTapPrimary: Bool {
        if !authVM.isAuthenticated { return true }
        return vm.canSpin && !vm.isSpinning
    }

    private var primaryButtonIcon: String {
        if !authVM.isAuthenticated { return "person.fill" }
        if vm.canSpin { return "play.fill" }
        return "lock.fill"
    }

    private var buttonTitle: String {
        if vm.isSpinning { return "Колесо вращается" }
        if !authVM.isAuthenticated { return "Войти и крутить" }
        if vm.canSpin { return "Запустить рулетку" }
        return "Попытки закончились"
    }

    private var headlineSubtitle: String {
        if vm.isSpinning { return "Награда уже выбрана. Колесо плавно останавливается." }
        if !authVM.isAuthenticated { return "Войдите, чтобы получить ежедневный spin и Perkly Points." }
        if vm.canSpin { return "Три чистых запуска в день. Без лишнего шума." }
        return "Новые попытки появятся после ежедневного обновления."
    }

    private var spinsStatusTitle: String {
        guard authVM.isAuthenticated else { return "Нужен аккаунт" }
        return "Сегодня \(vm.spinsRemaining) / \(vm.dailyLimit)"
    }

    private var wheelLoadKey: String {
        authVM.isAuthenticated ? (authVM.user?.id ?? "auth") : "guest"
    }

    private func handleSpinTap() {
        if authVM.isAuthenticated {
            guard vm.canSpin, !vm.isSpinning else { return }
            Task { await vm.spin() }
        } else {
            HapticManager.shared.playSelection()
            showLoginPrompt = true
        }
    }
}

private struct FortuneWheelBackground: View {
    let isSpinning: Bool
    let hasResult: Bool

    var body: some View {
        ZStack {
            Color.perklyDark.ignoresSafeArea()

            LinearGradient(
                colors: [
                    Color(red: 6/255, green: 10/255, blue: 17/255),
                    Color.perklyDark,
                    Color.black.opacity(0.98)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack {
                RadialGradient(
                    colors: [
                        (hasResult ? Color.perklyGold : Color.perklyPurple).opacity(isSpinning ? 0.28 : 0.16),
                        Color.perklyCyan.opacity(0.08),
                        Color.clear
                    ],
                    center: .top,
                    startRadius: 30,
                    endRadius: 360
                )
                .frame(height: 430)
                .blur(radius: 18)

                Spacer()
            }
            .ignoresSafeArea()
        }
    }
}

private struct PremiumWheelStage: View {
    let segments: [(String, Color)]
    let rotation: Double
    let isSpinning: Bool
    let resultIndex: Int?
    let ambientPulse: Bool

    var body: some View {
        GeometryReader { geo in
            let size = min(geo.size.width, geo.size.height)
            let wheelSize = min(size * 0.86, 306)

            ZStack {
                Ellipse()
                    .fill(Color.black.opacity(0.34))
                    .frame(width: wheelSize * 0.88, height: 34)
                    .blur(radius: 12)
                    .offset(y: wheelSize * 0.52)

                Circle()
                    .fill(
                        RadialGradient(
                            colors: [
                                Color.white.opacity(isSpinning ? 0.1 : 0.06),
                                Color.perklyPurple.opacity(ambientPulse ? 0.24 : 0.12),
                                Color.clear
                            ],
                            center: .center,
                            startRadius: 30,
                            endRadius: wheelSize * 0.72
                        )
                    )
                    .frame(width: wheelSize * 1.26, height: wheelSize * 1.26)
                    .scaleEffect(isSpinning ? 1.08 : 1)

                WheelTickRing(total: segments.count * 4)
                    .stroke(Color.white.opacity(0.14), style: StrokeStyle(lineWidth: 2, lineCap: .round, dash: [2, 10]))
                    .frame(width: wheelSize + 24, height: wheelSize + 24)
                    .rotationEffect(.degrees(isSpinning ? rotation * 0.25 : 0))
                    .animation(.linear(duration: 1), value: rotation)

                ZStack {
                    ForEach(0..<segments.count, id: \.self) { index in
                        WheelSegment(
                            index: index,
                            total: segments.count,
                            label: segments[index].0,
                            color: segments[index].1,
                            isWinning: resultIndex == index
                        )
                    }

                    Circle()
                        .stroke(Color.white.opacity(0.1), lineWidth: 1)

                    Circle()
                        .stroke(
                            LinearGradient(
                                colors: [Color.white.opacity(0.32), Color.white.opacity(0.04), Color.white.opacity(0.18)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: 3
                        )
                }
                .frame(width: wheelSize, height: wheelSize)
                .rotationEffect(.degrees(rotation))
                .scaleEffect(isSpinning ? 1.018 : 1)
                .shadow(color: .black.opacity(0.28), radius: 24, y: 16)

                WheelCenterHub(isSpinning: isSpinning, ambientPulse: ambientPulse)
                    .frame(width: wheelSize * 0.31, height: wheelSize * 0.31)

                WheelPointer(isSpinning: isSpinning)
                    .offset(y: -wheelSize * 0.55)
            }
            .frame(width: geo.size.width, height: geo.size.height)
        }
    }
}

struct WheelSegment: View {
    let index: Int
    let total: Int
    let label: String
    let color: Color
    var isWinning = false

    private var segmentAngle: Double {
        360.0 / Double(total)
    }

    private var midAngle: Double {
        Double(index) * segmentAngle + segmentAngle / 2
    }

    var body: some View {
        GeometryReader { geo in
            let size = min(geo.size.width, geo.size.height)
            let radius = size / 2
            let center = CGPoint(x: radius, y: radius)
            let startDeg = Double(index) * segmentAngle - 90
            let endDeg = Double(index + 1) * segmentAngle - 90
            let labelRadius = size * 0.33
            let labelAngle = (midAngle - 90) * .pi / 180
            let labelX = radius + labelRadius * CGFloat(cos(labelAngle))
            let labelY = radius + labelRadius * CGFloat(sin(labelAngle))

            Path { path in
                path.move(to: center)
                path.addArc(center: center, radius: radius, startAngle: .degrees(startDeg), endAngle: .degrees(endDeg), clockwise: false)
                path.closeSubpath()
            }
            .fill(segmentFill)
            .overlay(
                Path { path in
                    path.move(to: center)
                    path.addArc(center: center, radius: radius, startAngle: .degrees(startDeg), endAngle: .degrees(endDeg), clockwise: false)
                    path.closeSubpath()
                }
                .stroke(Color.white.opacity(isWinning ? 0.34 : 0.08), lineWidth: isWinning ? 2 : 1)
            )
            .overlay(
                Text(displayLabel)
                    .font(.system(size: 10, weight: .black))
                    .foregroundColor(.white)
                    .lineLimit(1)
                    .minimumScaleFactor(0.72)
                    .shadow(color: .black.opacity(0.35), radius: 3, y: 1)
                    .rotationEffect(.degrees(midAngle))
                    .position(x: labelX, y: labelY)
            )
        }
    }

    private var segmentFill: some ShapeStyle {
        AnyShapeStyle(
            RadialGradient(
                colors: [
                    color.opacity(isWinning ? 1 : 0.86),
                    color.opacity(index % 2 == 0 ? 0.64 : 0.46),
                    Color.black.opacity(0.2)
                ],
                center: .center,
                startRadius: 8,
                endRadius: 160
            )
        )
    }

    private var displayLabel: String {
        if label == "Попробуйте ещё" { return "Ещё" }
        if label == "Попробуйте завтра" { return "Завтра" }
        return label.replacingOccurrences(of: " Points", with: "P")
    }
}

private struct WheelCenterHub: View {
    let isSpinning: Bool
    let ambientPulse: Bool

    var body: some View {
        ZStack {
            Circle()
                .fill(Color.black.opacity(0.42))
                .blur(radius: 7)
                .offset(y: 8)

            Circle()
                .fill(
                    RadialGradient(
                        colors: [
                            Color.white.opacity(0.2),
                            Color.perklyDark,
                            Color.black.opacity(0.92)
                        ],
                        center: .topLeading,
                        startRadius: 4,
                        endRadius: 78
                    )
                )
                .overlay(
                    Circle()
                        .stroke(Color.white.opacity(0.16), lineWidth: 1)
                )

            Circle()
                .stroke(Color.primaryGradient, lineWidth: 3)
                .padding(6)
                .opacity(ambientPulse ? 0.92 : 0.55)

            VStack(spacing: 1) {
                Text(isSpinning ? "..." : "P")
                    .font(.system(size: 26, weight: .black))
                    .foregroundStyle(Color.primaryGradient)
                Text(isSpinning ? "SPIN" : "PERKLY")
                    .font(.system(size: 8, weight: .black))
                    .foregroundColor(.white.opacity(0.42))
            }
        }
        .scaleEffect(isSpinning ? 1.04 : 1)
        .shadow(color: .perklyPurple.opacity(isSpinning ? 0.38 : 0.2), radius: 14, y: 7)
    }
}

private struct WheelPointer: View {
    let isSpinning: Bool

    var body: some View {
        VStack(spacing: -1) {
            Capsule()
                .fill(Color.white.opacity(0.94))
                .frame(width: 34, height: 8)
                .shadow(color: .white.opacity(0.34), radius: 8)

            Triangle()
                .fill(
                    LinearGradient(
                        colors: [Color.white, Color.white.opacity(0.74)],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
                .frame(width: 24, height: 20)
                .shadow(color: .perklyGold.opacity(isSpinning ? 0.54 : 0.24), radius: 10, y: 3)
        }
        .scaleEffect(isSpinning ? 1.08 : 1)
        .animation(.easeInOut(duration: 0.22), value: isSpinning)
    }
}

private struct WheelTickRing: Shape {
    let total: Int

    func path(in rect: CGRect) -> Path {
        var path = Path()
        let center = CGPoint(x: rect.midX, y: rect.midY)
        let radius = min(rect.width, rect.height) / 2

        for index in 0..<total {
            let angle = (Double(index) / Double(total)) * 2 * .pi
            let outer = CGPoint(
                x: center.x + radius * CGFloat(cos(angle)),
                y: center.y + radius * CGFloat(sin(angle))
            )
            let inner = CGPoint(
                x: center.x + (radius - 8) * CGFloat(cos(angle)),
                y: center.y + (radius - 8) * CGFloat(sin(angle))
            )
            path.move(to: inner)
            path.addLine(to: outer)
        }

        return path
    }
}

private struct WheelStatusPill: View {
    let icon: String
    let title: String
    let tint: Color

    var body: some View {
        HStack(spacing: 7) {
            Image(systemName: icon)
                .font(.system(size: 11, weight: .bold))
            Text(title)
                .font(.system(size: 12, weight: .bold))
                .lineLimit(1)
                .minimumScaleFactor(0.82)
        }
        .foregroundColor(tint)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .background(Color.white.opacity(0.055))
        .clipShape(Capsule())
        .overlay(
            Capsule()
                .stroke(Color.white.opacity(0.065), lineWidth: 1)
        )
    }
}

private struct WheelResultCard: View {
    let result: String
    let points: Int?
    let message: String?
    let isError: Bool

    private var isWin: Bool {
        (points ?? 0) > 0 && !isError
    }

    var body: some View {
        VStack(spacing: 14) {
            HStack(spacing: 12) {
                Image(systemName: isWin ? "checkmark.seal.fill" : (isError ? "exclamationmark.triangle.fill" : "moon.stars.fill"))
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(iconColor)
                    .frame(width: 44, height: 44)
                    .background(iconColor.opacity(0.13))
                    .clipShape(Circle())

                VStack(alignment: .leading, spacing: 3) {
                    Text(resultTitle)
                        .font(.system(size: 19, weight: .heavy))
                        .foregroundColor(.white)
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)

                    Text(result)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(iconColor)
                }

                Spacer()
            }

            Text(message ?? defaultMessage)
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(.white.opacity(0.5))
                .frame(maxWidth: .infinity, alignment: .leading)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(18)
        .perklySurface(
            cornerRadius: 24,
            fill: isWin ? Color.perklyGold.opacity(0.08) : Color.perklyCardBg
        )
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .stroke(iconColor.opacity(0.18), lineWidth: 1)
        )
    }

    private var resultTitle: String {
        if isError { return "Нужно проверить" }
        return isWin ? "Вы забрали награду" : "В этот раз пауза"
    }

    private var defaultMessage: String {
        isWin ? "Points уже добавлены в ваш профиль." : "Если попытки остались, можно крутить ещё."
    }

    private var iconColor: Color {
        if isError { return .perklyRed }
        return isWin ? .perklyGold : .white.opacity(0.62)
    }
}

struct Triangle: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: rect.midX, y: rect.maxY))
        path.addLine(to: CGPoint(x: rect.minX, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.minY))
        path.closeSubpath()
        return path
    }
}
