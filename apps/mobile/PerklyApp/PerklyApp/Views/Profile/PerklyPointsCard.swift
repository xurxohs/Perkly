import CoreMotion
import SwiftUI

// A loyalty card, not a payment card. The front stays intentionally minimal:
// brand and artwork only; balance and account data live behind the tap.
struct PerklyPointsCard: View {
    let isUnlocked: Bool
    var showsAccessPrompt = true

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.scenePhase) private var scenePhase
    @StateObject private var motion = PerklyCardMotionDriver()

    var body: some View {
        VStack(spacing: 10) {
            cardFace

            if !isUnlocked, showsAccessPrompt {
                HStack(spacing: 11) {
                    Image(systemName: "lock.fill")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(Color.perklyLavender)
                        .frame(width: 32, height: 32)
                        .background(Color.perklyPurple.opacity(0.13), in: Circle())

                    VStack(alignment: .leading, spacing: 2) {
                        Text("Карта баллов Perkly")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundStyle(.white)
                        Text("Открыть доступ с Platinum")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(.white.opacity(0.43))
                    }

                    Spacer()

                    Image(systemName: "chevron.right")
                        .font(.system(size: 11, weight: .black))
                        .foregroundStyle(.white.opacity(0.32))
                }
                .padding(.horizontal, 14)
                .frame(height: 56)
                .perklySurface(cornerRadius: 18)
            }
        }
        .onAppear(perform: updateMotionState)
        .onDisappear { motion.stop() }
        .onChange(of: scenePhase) { _, _ in updateMotionState() }
        .onChange(of: reduceMotion) { _, _ in updateMotionState() }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(
            isUnlocked
                ? "Карта баллов Perkly"
                : "Карта баллов Perkly. Доступна с подпиской Platinum"
        )
        .accessibilityHint(isUnlocked ? "Открывает сведения о баллах" : "Открывает настройку карты")
    }

    private var cardFace: some View {
        GeometryReader { _ in
            let shape = RoundedRectangle(cornerRadius: 25, style: .continuous)

            ZStack {
                LinearGradient(
                    colors: [
                        Color(red: 0.075, green: 0.078, blue: 0.092),
                        Color(red: 0.018, green: 0.019, blue: 0.026),
                        .black
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )

                TimelineView(
                    .animation(
                        minimumInterval: 1.0 / 60.0,
                        paused: reduceMotion || scenePhase != .active
                    )
                ) { timeline in
                    let phase = reduceMotion
                        ? 0.15
                        : (timeline.date.timeIntervalSinceReferenceDate / 8.5)
                            .truncatingRemainder(dividingBy: 1)

                    PerklyOrbitPattern(
                        phase: phase,
                        tiltX: reduceMotion ? 0 : motion.tilt.x,
                        tiltY: reduceMotion ? 0 : motion.tilt.y
                    )
                }

                Text("perkly")
                    .font(.system(size: 25, weight: .bold, design: .rounded))
                    .tracking(-1.25)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                    .padding(20)
            }
            .clipShape(shape)
            .overlay {
                shape.stroke(
                    LinearGradient(
                        colors: [
                            Color.white.opacity(0.17),
                            Color.white.opacity(0.035),
                            Color.perklyPurple.opacity(0.16)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 1
                )
            }
            .shadow(
                color: Color.black.opacity(0.34),
                radius: 18,
                y: 9
            )
        }
        .aspectRatio(1.59, contentMode: .fit)
    }

    private func updateMotionState() {
        guard scenePhase == .active, !reduceMotion else {
            motion.stop()
            return
        }
        motion.start()
    }
}

// A fixed annular dome like a holographic Wallet pattern. Device motion changes
// only the color field across the dots; positions never move.
private struct PerklyOrbitPattern: View {
    let phase: Double
    let tiltX: Double
    let tiltY: Double

    var body: some View {
        Canvas(opaque: false, rendersAsynchronously: false) { context, size in
            let center = CGPoint(
                x: size.width * 0.5,
                y: size.height * 1.09
            )

            for ring in 0..<14 {
                let radialProgress = Double(ring) / 13
                let radius = size.width * (0.245 + CGFloat(ring) * 0.0195)
                let count = 22 + ring * 2

                for index in 0..<count {
                    let progress = Double(index) / Double(max(1, count - 1))
                    let angle = .pi * (1.03 + progress * 0.94)
                    let x = center.x + cos(angle) * radius
                    let y = center.y + sin(angle) * radius
                    guard x > -8, x < size.width + 8,
                          y > size.height * 0.29, y < size.height + 8 else { continue }

                    let apex = sin(progress * .pi)
                    let bandWeight = sin(radialProgress * .pi)
                    let dotRadius = CGFloat(
                        1.15 + bandWeight * (0.65 + apex * 0.35) * 3.45
                    )

                    // Every dot stays inside the brand spectrum. Time moves a
                    // seamless color phase through the complete fixed dome;
                    // motion only bends that phase slightly.
                    let field = progress * 0.74 + radialProgress * 0.26
                    let motionOffset = tiltX * 0.075 - tiltY * 0.055
                    let bend =
                        (progress - 0.5) * tiltY * 0.035 +
                        (radialProgress - 0.5) * tiltX * 0.035
                    let colorAngle = 2 * Double.pi * (field - phase + motionOffset + bend)
                    let brandWave = 0.5 + 0.5 * sin(colorAngle)
                    let brandMix = brandWave * brandWave * (3 - 2 * brandWave)
                    let lightWave = 0.5 + 0.5 * cos(colorAngle - Double.pi * 0.28)
                    let lavenderGlint = pow(
                        0.5 + 0.5 * cos(colorAngle * 2 + Double.pi * 0.18),
                        7
                    )
                    let dotColor = PerklyCardPalette.color(
                        brandMix: brandMix,
                        light: 0.74 + lightWave * 0.26,
                        lavenderGlint: lavenderGlint
                    )

                    context.fill(
                        Path(ellipseIn: CGRect(
                            x: x - dotRadius,
                            y: y - dotRadius,
                            width: dotRadius * 2,
                            height: dotRadius * 2
                        )),
                        with: .color(dotColor)
                    )

                    if dotRadius > 3.35 {
                        let diamondRadius = dotRadius * 0.42
                        var diamond = Path()
                        diamond.move(to: CGPoint(x: x, y: y - diamondRadius))
                        diamond.addLine(to: CGPoint(x: x + diamondRadius, y: y))
                        diamond.addLine(to: CGPoint(x: x, y: y + diamondRadius))
                        diamond.addLine(to: CGPoint(x: x - diamondRadius, y: y))
                        diamond.closeSubpath()
                        context.fill(
                            diamond,
                            with: .color(Color.black.opacity(0.68))
                        )
                    }
                }
            }
        }
        .accessibilityHidden(true)
    }
}

private enum PerklyCardPalette {
    private struct RGB {
        let red: Double
        let green: Double
        let blue: Double

        func mixed(with other: RGB, amount: Double) -> RGB {
            RGB(
                red: red + (other.red - red) * amount,
                green: green + (other.green - green) * amount,
                blue: blue + (other.blue - blue) * amount
            )
        }
    }

    private static let purple = RGB(red: 0.50, green: 0.16, blue: 1.00)
    private static let pink = RGB(red: 1.00, green: 0.15, blue: 0.56)
    private static let lavender = RGB(red: 0.67, green: 0.47, blue: 1.00)

    static func color(brandMix: Double, light: Double, lavenderGlint: Double) -> Color {
        let branded = purple.mixed(with: pink, amount: brandMix)
        let accented = branded.mixed(with: lavender, amount: lavenderGlint * 0.13)
        let whiteLift = lavenderGlint * 0.075

        return Color(
            red: min(1, accented.red * light + whiteLift),
            green: min(1, accented.green * light + whiteLift),
            blue: min(1, accented.blue * light + whiteLift),
            opacity: 0.82 + light * 0.16
        )
    }
}

@MainActor
private final class PerklyCardMotionDriver: ObservableObject {
    @Published private(set) var tilt = SIMD2<Double>(0, 0)

    private let manager = CMMotionManager()
    private var isRunning = false
    private var baselineRoll: Double?
    private var baselinePitch: Double?
    private var lastTimestamp: TimeInterval?

    func start() {
        guard !isRunning, manager.isDeviceMotionAvailable else { return }
        isRunning = true
        baselineRoll = nil
        baselinePitch = nil
        lastTimestamp = nil
        manager.deviceMotionUpdateInterval = 1.0 / 60.0
        manager.startDeviceMotionUpdates(to: .main) { [weak self] data, _ in
            guard let self, let sample = data else { return }
            let attitude = sample.attitude
            if baselineRoll == nil {
                baselineRoll = attitude.roll
                baselinePitch = attitude.pitch
                lastTimestamp = sample.timestamp
                return
            }

            let rollDelta = Self.shortestAngle(
                attitude.roll - (baselineRoll ?? attitude.roll)
            )
            let pitchDelta = Self.shortestAngle(
                attitude.pitch - (baselinePitch ?? attitude.pitch)
            )
            let target = SIMD2<Double>(
                max(-0.8, min(0.8, rollDelta / 0.55)),
                max(-0.8, min(0.8, pitchDelta / 0.55))
            )
            let elapsed = sample.timestamp - (lastTimestamp ?? sample.timestamp)
            let deltaTime = max(1.0 / 120.0, min(1.0 / 15.0, elapsed))
            let smoothing = 1 - exp(-deltaTime / 0.42)
            tilt += (target - tilt) * smoothing
            lastTimestamp = sample.timestamp
        }
    }

    func stop() {
        guard isRunning else { return }
        manager.stopDeviceMotionUpdates()
        isRunning = false
        baselineRoll = nil
        baselinePitch = nil
        lastTimestamp = nil
        tilt = SIMD2<Double>(0, 0)
    }

    private static func shortestAngle(_ angle: Double) -> Double {
        atan2(sin(angle), cos(angle))
    }
}

struct PerklyPointsCardSetupView: View {
    let onUpgrade: () -> Void

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 24) {
                    closeHeader

                    PerklyPointsCard(
                        isUnlocked: false,
                        showsAccessPrompt: false
                    )

                    VStack(alignment: .leading, spacing: 18) {
                        HStack(alignment: .top, spacing: 13) {
                            Image(systemName: "diamond.fill")
                                .font(.system(size: 17, weight: .bold))
                                .foregroundStyle(Color.perklyLavender)
                                .frame(width: 44, height: 44)
                                .background(Color.perklyPurple.opacity(0.14), in: RoundedRectangle(cornerRadius: 13))

                            VStack(alignment: .leading, spacing: 4) {
                                Text("Карта баллов Perkly")
                                    .font(.system(size: 20, weight: .bold))
                                    .foregroundStyle(.white)
                                Text("Баланс, история начислений и привилегии — в одном месте.")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundStyle(.white.opacity(0.48))
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                        }

                        Button {
                            HapticManager.shared.playSelection()
                            onUpgrade()
                        } label: {
                            Text("Открыть с Platinum")
                                .font(.system(size: 16, weight: .bold))
                                .foregroundStyle(.black)
                                .frame(maxWidth: .infinity)
                                .frame(height: 54)
                                .background(.white, in: Capsule())
                        }
                        .buttonStyle(PerklyPressStyle())
                    }
                    .padding(20)
                    .perklySurface(cornerRadius: 25)

                    VStack(alignment: .leading, spacing: 12) {
                        setupBenefit("Баланс открывается после касания карты", icon: "hand.tap.fill")
                        setupBenefit("Покупки пополняют баланс автоматически", icon: "sparkles")
                        setupBenefit("Баллы можно применить перед оплатой", icon: "cart.fill.badge.minus")
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 4)

                    Text("Perkly Card — карта программы лояльности, а не банковская или платёжная карта.")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(.white.opacity(0.3))
                        .fixedSize(horizontal: false, vertical: true)
                }
                .padding(.horizontal, 20)
                .padding(.top, 12)
                .padding(.bottom, 38)
            }
        }
    }

    private var closeHeader: some View {
        HStack {
            Button { dismiss() } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 17, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 46, height: 46)
                    .perklyGlass(cornerRadius: 17)
            }
            .buttonStyle(PerklyPressStyle())
            .accessibilityLabel("Закрыть")

            Spacer()
        }
    }

    private func setupBenefit(_ title: String, icon: String) -> some View {
        Label(title, systemImage: icon)
            .font(.system(size: 13, weight: .semibold))
            .foregroundStyle(.white.opacity(0.62))
    }
}

struct PerklyPointsCardDetail: View {
    let user: User

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 24) {
                    HStack {
                        Button { dismiss() } label: {
                            Image(systemName: "xmark")
                                .font(.system(size: 17, weight: .bold))
                                .foregroundStyle(.white)
                                .frame(width: 46, height: 46)
                                .perklyGlass(cornerRadius: 17)
                        }
                        .buttonStyle(PerklyPressStyle())
                        .accessibilityLabel("Закрыть")

                        Spacer()

                        Text("Карта баллов")
                            .font(.headline)
                            .foregroundStyle(.white)

                        Spacer()

                        Color.clear.frame(width: 46, height: 46)
                    }

                    PerklyPointsCard(
                        isUnlocked: true,
                        showsAccessPrompt: false
                    )

                    VStack(alignment: .leading, spacing: 16) {
                        Text("Доступно")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(.white.opacity(0.42))

                        HStack(alignment: .firstTextBaseline, spacing: 8) {
                            Text((user.rewardPoints ?? 0).formatted(.number.grouping(.automatic)))
                                .font(.system(size: 38, weight: .black, design: .rounded))
                                .foregroundStyle(.white)
                            Text("баллов")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundStyle(.white.opacity(0.4))
                            Spacer()
                        }

                        Divider().overlay(Color.white.opacity(0.08))

                        Label(
                            "Примерная выгода: \(uzs(PerklyMoney.rewardPointsValue(user.rewardPoints ?? 0)))",
                            systemImage: "sparkles"
                        )
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(Color.perklyMint)
                    }
                    .padding(20)
                    .perklySurface(cornerRadius: 24)

                    VStack(alignment: .leading, spacing: 17) {
                        detailRow(
                            "Копите автоматически",
                            subtitle: "Получайте баллы за покупки и активность.",
                            icon: "plus.circle.fill"
                        )
                        detailRow(
                            "Используйте при оплате",
                            subtitle: "Доступное списание появится перед подтверждением покупки.",
                            icon: "cart.fill.badge.minus"
                        )
                    }
                    .padding(20)
                    .perklySurface(cornerRadius: 24)

                    Text("Perkly Card не является банковской или платёжной картой. Баллы используются только внутри Perkly по правилам программы лояльности.")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(.white.opacity(0.3))
                        .fixedSize(horizontal: false, vertical: true)
                }
                .padding(.horizontal, 20)
                .padding(.top, 12)
                .padding(.bottom, 38)
            }
        }
    }

    private func detailRow(_ title: String, subtitle: String, icon: String) -> some View {
        HStack(alignment: .top, spacing: 13) {
            Image(systemName: icon)
                .font(.system(size: 16, weight: .bold))
                .foregroundStyle(Color.perklyLavender)
                .frame(width: 34, height: 34)
                .background(Color.perklyPurple.opacity(0.13), in: RoundedRectangle(cornerRadius: 10))

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(.white)
                Text(subtitle)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(.white.opacity(0.46))
                    .fixedSize(horizontal: false, vertical: true)
            }

            Spacer(minLength: 0)
        }
    }
}
