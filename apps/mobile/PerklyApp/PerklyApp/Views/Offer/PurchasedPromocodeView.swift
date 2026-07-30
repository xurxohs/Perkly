import CoreImage
import CoreImage.CIFilterBuiltins
import SwiftUI
import UIKit

struct PurchasedPromocodeView: View {
    let offer: Offer
    let transaction: Transaction
    let giftCode: String?
    var onQRCodeRevealed: (() -> Void)? = nil

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dismiss) private var dismiss
    @Environment(\.scenePhase) private var scenePhase

    @State private var revealPhase: RevealPhase = .protected
    @State private var copied = false

    private enum RevealPhase {
        case protected
        case scanning
        case revealed
    }

    private var secret: String? {
        if let giftCode = giftCode?.trimmingCharacters(in: .whitespacesAndNewlines),
           !giftCode.isEmpty {
            return giftCode
        }

        guard transaction.canRevealAccessData else { return nil }
        let value = transaction.offer?.hiddenData ?? offer.hiddenData
        guard let value = value?.trimmingCharacters(in: .whitespacesAndNewlines),
              !value.isEmpty else { return nil }
        return value
    }

    private var isGift: Bool {
        giftCode != nil || transaction.isGift == true
    }

    private var showsQRCode: Bool {
        isGift || offer.fulfillment.usesQRCode
    }

    private var hasInstructionsOnlyAccess: Bool {
        guard transaction.canRevealAccessData, secret == nil else { return false }
        return offer.fulfillment == .instructions ||
            offer.fulfillment == .link ||
            !(offer.usageInstructions?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ?? true)
    }

    private var statusTitle: String {
        switch transaction.statusEnum {
        case .escrow: return "Оплачено · защищённая сделка"
        case .disputed: return "Покупка на проверке"
        case .completed, .success, .activated: return "Готово к использованию"
        case .paid: return "Оплата прошла"
        default: return transaction.statusEnum.displayName
        }
    }

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: 22) {
                purchaseHeader

                if let secret {
                    if showsQRCode {
                        qrCard(secret: secret)
                    } else {
                        standardFulfillmentCard
                    }
                    codeCard(secret: secret)
                    instructionCard
                } else if hasInstructionsOnlyAccess {
                    standardFulfillmentCard
                    instructionCard

                    NavigationLink(destination: OfferDetailView(offerId: offer.id)) {
                        Label("Открыть карточку товара", systemImage: "bag")
                            .font(.system(size: 15, weight: .bold))
                            .frame(maxWidth: .infinity)
                            .frame(height: 52)
                            .foregroundStyle(.white)
                            .background(Color.white.opacity(0.07))
                            .clipShape(RoundedRectangle(cornerRadius: 17, style: .continuous))
                    }
                    .buttonStyle(.plain)
                } else {
                    pendingCard
                }

                if !isGift, transaction.canAddToAppleWallet {
                    WalletPassButton(transaction: transaction)
                }
            }
            .padding(.horizontal, 20)
            .padding(.top, 16)
            .padding(.bottom, 36)
        }
        .background(background)
        .navigationTitle(
            isGift ? "Подарок" : (showsQRCode ? "Промокод" : "Покупка")
        )
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button("Готово") { dismiss() }
            }
        }
        .task(id: secret) {
            await runRevealAnimation()
        }
        .onChange(of: scenePhase) { _, phase in
            if phase != .active {
                revealPhase = .protected
                copied = false
            } else if secret != nil {
                Task { await runRevealAnimation() }
            }
        }
    }

    private var purchaseHeader: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top, spacing: 12) {
                ZStack {
                    Circle()
                        .fill(Color.perklyGreen.opacity(0.18))
                    Image(
                        systemName: isGift
                            ? "gift.fill"
                            : (showsQRCode ? "checkmark.seal.fill" : "bag.fill")
                    )
                        .font(.system(size: 19, weight: .bold))
                        .foregroundStyle(Color.perklyGreen)
                }
                .frame(width: 46, height: 46)

                VStack(alignment: .leading, spacing: 5) {
                    Text(
                        isGift
                            ? "Подарок готов"
                            : (showsQRCode ? "Промокод готов" : "Заказ оформлен")
                    )
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(Color.perklyGreen)

                    Text(offer.safeTitle)
                        .font(.system(size: 23, weight: .black))
                        .foregroundStyle(.white)
                        .fixedSize(horizontal: false, vertical: true)
                }

                Spacer(minLength: 8)
            }

            HStack(spacing: 7) {
                Image(systemName: transaction.statusEnum.icon)
                Text(statusTitle)
            }
            .font(.system(size: 12, weight: .bold))
            .foregroundStyle(.white.opacity(0.62))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(17)
        .perklyGlass(
            cornerRadius: 24,
            tint: Color.perklyGreen.opacity(0.1),
            isInteractive: false
        )
    }

    private func qrCard(secret: String) -> some View {
        VStack(spacing: 17) {
            ZStack {
                RoundedRectangle(cornerRadius: 28, style: .continuous)
                    .fill(.white)

                if let image = QRCodeRenderer.image(for: secret) {
                    Image(uiImage: image)
                        .resizable()
                        .interpolation(.none)
                        .scaledToFit()
                        .padding(22)
                        .blur(radius: revealPhase == .revealed ? 0 : 10)
                        .opacity(revealPhase == .protected ? 0.2 : 1)
                        .scaleEffect(revealPhase == .revealed ? 1 : 0.94)
                }

                if revealPhase != .revealed {
                    VStack(spacing: 9) {
                        Image(systemName: revealPhase == .scanning ? "wave.3.right.circle.fill" : "lock.shield.fill")
                            .font(.system(size: 35, weight: .bold))
                            .symbolEffect(.pulse, isActive: revealPhase == .scanning && !reduceMotion)
                        Text(revealPhase == .scanning ? "Готовим QR-код" : "Защищённый код")
                            .font(.system(size: 13, weight: .black))
                    }
                    .foregroundStyle(.black.opacity(0.78))
                }

                if revealPhase == .scanning && !reduceMotion {
                    GeometryReader { proxy in
                        Capsule()
                            .fill(
                                LinearGradient(
                                    colors: [.clear, Color.perklyGreen, .clear],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .frame(height: 3)
                            .shadow(color: Color.perklyGreen.opacity(0.8), radius: 8)
                            .offset(y: proxy.size.height * 0.72)
                    }
                    .padding(16)
                    .transition(.opacity)
                }
            }
            .frame(maxWidth: 310)
            .aspectRatio(1, contentMode: .fit)
            .shadow(color: Color.perklyPurple.opacity(revealPhase == .revealed ? 0.24 : 0), radius: 28)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(revealPhase == .revealed ? "Рабочий QR-код промокода" : "Промокод защищён")

            Label(
                revealPhase == .revealed ? "QR-код готов к сканированию" : "Открываем покупку…",
                systemImage: revealPhase == .revealed ? "viewfinder.circle.fill" : "hourglass"
            )
            .font(.system(size: 13, weight: .bold))
            .foregroundStyle(revealPhase == .revealed ? Color.perklyGreen : .white.opacity(0.54))
            .contentTransition(.symbolEffect(.replace))
        }
        .padding(18)
        .frame(maxWidth: .infinity)
        .perklySurface(cornerRadius: 30)
        .privacySensitive()
    }

    private func codeCard(secret: String) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(isGift ? "КОД ПОДАРКА" : offer.fulfillment.accessTitle)
                .font(.system(size: 11, weight: .black))
                .tracking(1.2)
                .foregroundStyle(.white.opacity(0.42))

            HStack(spacing: 12) {
                Text(revealPhase == .revealed ? secret : "•••• •••• ••••")
                    .font(.system(size: 18, weight: .black, design: .monospaced))
                    .foregroundStyle(.white)
                    .lineLimit(3)
                    .minimumScaleFactor(0.68)
                    .textSelection(.enabled)

                Spacer(minLength: 8)

                Button {
                    UIPasteboard.general.string = secret
                    copied = true
                    HapticManager.shared.lightImpact()
                } label: {
                    Image(systemName: copied ? "checkmark" : "doc.on.doc")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(copied ? Color.perklyGreen : .white)
                        .frame(width: 46, height: 46)
                        .perklyGlass(
                            cornerRadius: 15,
                            tint: copied ? Color.perklyGreen.opacity(0.12) : nil
                        )
                }
                .buttonStyle(PerklyPressStyle())
                .disabled(revealPhase != .revealed)
                .accessibilityLabel(copied ? "Скопировано" : "Скопировать промокод")
            }

            if revealPhase == .revealed, let url = URL(string: secret),
               let scheme = url.scheme?.lowercased(), ["https", "http"].contains(scheme) {
                Link(destination: url) {
                    Label("Открыть ссылку", systemImage: "arrow.up.right.square")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(Color.perklyCyan)
                }
            }

            if isGift, revealPhase == .revealed {
                ShareLink(item: "Подарок Perkly: \(secret)") {
                    Label("Поделиться подарком", systemImage: "square.and.arrow.up")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(Color.perklyGold)
                }
            }
        }
        .padding(17)
        .perklySurface(cornerRadius: 20)
        .privacySensitive()
    }

    private var instructionCard: some View {
        VStack(alignment: .leading, spacing: 9) {
            Label(
                isGift ? "Как передать подарок" : (showsQRCode ? "Как использовать" : "Что дальше"),
                systemImage: isGift ? "paperplane.fill" : (showsQRCode ? "lightbulb.fill" : "list.bullet.clipboard.fill")
            )
            .font(.system(size: 15, weight: .bold))
            .foregroundStyle(.white)

            Text(
                isGift
                    ? "Отправьте код получателю. Он сможет активировать подарок в Perkly."
                    : (offer.usageInstructions ?? defaultInstructions)
            )
            .font(.system(size: 13, weight: .medium))
            .foregroundStyle(.white.opacity(0.56))
            .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(17)
        .perklySurface(cornerRadius: 20)
    }

    private var pendingCard: some View {
        VStack(spacing: 14) {
            Image(systemName: "clock.badge.checkmark")
                .font(.system(size: 38, weight: .semibold))
                .foregroundStyle(Color.perklyGold)
            Text("Код ещё готовится")
                .font(.system(size: 19, weight: .bold))
                .foregroundStyle(.white)
            Text("Покупка сохранена. Код появится здесь автоматически после подтверждения.")
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(.white.opacity(0.52))
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 32)
        .padding(.horizontal, 20)
        .perklySurface(cornerRadius: 24)
    }

    private var standardFulfillmentCard: some View {
        VStack(spacing: 13) {
            Image(systemName: offer.fulfillment == .link ? "link.circle.fill" : "shippingbox.circle.fill")
                .font(.system(size: 48, weight: .semibold))
                .foregroundStyle(Color.perklyPurple)

            Text(offer.fulfillment == .link ? "Ссылка на товар готова" : "Покупка сохранена")
                .font(.system(size: 19, weight: .bold))
                .foregroundStyle(.white)

            Text("QR-код для этого товара не требуется. Все данные и дальнейшие действия находятся ниже.")
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(.white.opacity(0.52))
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 26)
        .padding(.horizontal, 20)
        .perklySurface(cornerRadius: 24)
    }

    private var defaultInstructions: String {
        switch offer.fulfillment {
        case .promocode, .digitalCode:
            return "Покажите QR-код продавцу или скопируйте код и следуйте инструкции заведения."
        case .link:
            return "Откройте ссылку выше и следуйте инструкции продавца."
        case .instructions:
            return "Покажите данные заказа продавцу или свяжитесь с ним через чат покупки."
        }
    }

    private var background: some View {
        ZStack {
            Color.perklyDark
            RadialGradient(
                colors: [Color.perklyPurple.opacity(0.18), .clear],
                center: .topTrailing,
                startRadius: 0,
                endRadius: 360
            )
        }
        .ignoresSafeArea()
    }

    @MainActor
    private func runRevealAnimation() async {
        guard secret != nil else { return }
        revealPhase = .protected

        if reduceMotion || !showsQRCode {
            revealPhase = .revealed
            if showsQRCode {
                onQRCodeRevealed?()
            }
            return
        }

        try? await Task.sleep(for: .milliseconds(320))
        guard !Task.isCancelled else { return }
        withAnimation(.easeInOut(duration: 0.28)) {
            revealPhase = .scanning
        }

        HapticManager.shared.prepareQRCodeReveal()
        let scanRhythm: [(delay: Int, intensity: CGFloat)] = [
            (0, 0.18),
            (58, 0.22),
            (62, 0.28),
            (68, 0.35),
            (78, 0.44),
            (96, 0.56)
        ]

        for beat in scanRhythm {
            if beat.delay > 0 {
                try? await Task.sleep(for: .milliseconds(beat.delay))
            }
            guard !Task.isCancelled else { return }
            HapticManager.shared.playQRCodeScanTick(intensity: beat.intensity)
        }

        try? await Task.sleep(for: .milliseconds(300))
        guard !Task.isCancelled else { return }
        withAnimation(.spring(response: 0.46, dampingFraction: 0.78)) {
            revealPhase = .revealed
        }
        onQRCodeRevealed?()
        HapticManager.shared.playPurchaseSuccess()
    }
}

private enum QRCodeRenderer {
    private static let context = CIContext()
    private static let cache = NSCache<NSString, UIImage>()

    static func image(for value: String) -> UIImage? {
        let key = value as NSString
        if let cached = cache.object(forKey: key) {
            return cached
        }

        let filter = CIFilter.qrCodeGenerator()
        filter.message = Data(value.utf8)
        filter.correctionLevel = "M"

        guard let output = filter.outputImage?.transformed(by: CGAffineTransform(scaleX: 12, y: 12)),
              let cgImage = context.createCGImage(output, from: output.extent) else {
            return nil
        }

        let image = UIImage(cgImage: cgImage)
        cache.setObject(image, forKey: key)
        return image
    }
}
