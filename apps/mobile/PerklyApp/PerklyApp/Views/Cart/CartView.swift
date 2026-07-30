import SwiftUI
import UIKit

struct CartView: View {
    @EnvironmentObject var cartVM: CartViewModel
    @EnvironmentObject var authVM: AuthViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var showCheckoutAlert = false
    @State private var isPurchasing = false
    @State private var showPurchaseResultsAlert = false
    @State private var purchaseResults: [String] = []
    @State private var walletTransactions: [Transaction] = []
    @State private var showWalletTransactionsSheet = false
    @State private var activeChatRoom: ChatRoom?
    
    var body: some View {
        Group {
            if cartVM.items.isEmpty {
                emptyCartView
            } else {
                cartContentView
                .safeAreaInset(edge: .bottom) {
                    checkoutBar
                }
            }
        }
        .background(Color.perklyDark)
        .navigationTitle("Корзина")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            if !cartVM.items.isEmpty {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Очистить") {
                        withAnimation { cartVM.clearCart() }
                    }
                    .font(.system(size: 14))
                    .foregroundColor(.perklyRed)
                }
            }
        }
        .alert("Оформить заказ?", isPresented: $showCheckoutAlert) {
            Button("Отмена", role: .cancel) {}
            Button("Оплатить") {
                Task { await checkout() }
            }
        } message: {
            let pointsDiscount = cartVM.calculatePointsDiscount(userPoints: authVM.user?.rewardPoints ?? 0)
            let activationDiscount = cartVM.items.reduce(0) { $0 + cartVM.discountAmount(for: $1) }
            let finalPrice = max(0, cartVM.total - pointsDiscount - cartVM.promoDiscount - activationDiscount)
            Text("Будет списано \(uzs(finalPrice)) с вашего баланса за \(cartVM.count) товар(ов).")
        }
        .alert("Результат покупки", isPresented: $showPurchaseResultsAlert) {
            Button("OK") {}
        } message: {
            Text(purchaseResults.joined(separator: "\n"))
        }
        .sheet(isPresented: $showWalletTransactionsSheet) {
            PurchaseWalletPassesSheet(transactions: walletTransactions)
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
        }
        .fullScreenCover(item: $activeChatRoom) { room in
            NavigationStack {
                ChatRoomView(room: room)
                    .environmentObject(authVM)
            }
        }
        .task(id: authVM.user?.id) {
            await cartVM.synchronize(userId: authVM.user?.id)
            await cartVM.loadPromocodeActivations(isAuthenticated: authVM.isAuthenticated)
        }
    }

    private var emptyCartView: some View {
        VStack(spacing: 20) {
            Image(systemName: "cart")
                .font(.system(size: 60))
                .foregroundColor(Color.perklyTextPrimary.opacity(0.15))
                .accessibilityHidden(true)

            Text("Корзина пуста")
                .font(.title2.bold())
                .foregroundColor(.perklyTextPrimary)
                .accessibilityAddTraits(.isHeader)

            Text("Добавьте товары из каталога")
                .font(.body)
                .foregroundColor(Color.perklyTextPrimary.opacity(0.4))

            Button {
                dismiss()
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "arrow.left")
                        .accessibilityHidden(true)
                    Text("Вернуться в каталог")
                }
                .font(.headline)
                .foregroundColor(.perklyTextPrimary)
                .padding(.horizontal, 24)
                .padding(.vertical, 14)
                .background(Color.primaryGradient)
                .clipShape(Capsule())
            }
            .buttonStyle(.plain)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var cartContentView: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: 12) {
                ForEach(cartVM.items) { item in
                    CartItemRow(item: item) {
                        withAnimation(.spring(response: 0.3)) {
                            cartVM.removeItem(item.offerId, shouldPlayHaptic: true)
                        }
                    }
                }

                promoCodeSection
                loyaltySection
            }
            .padding(20)
            .padding(.bottom, 100)
        }
    }

    private var promoCodeSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            promoHeader
            promoInputRow
            promoStatusMessage
        }
        .padding(16)
        .background(Color.perklyOverlay.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .padding(.bottom, 4)
    }

    private var promoHeader: some View {
        HStack {
            Image(systemName: "tag.fill")
                .foregroundColor(.perklyOrange)
                .font(.system(size: 14))
                .accessibilityHidden(true)

            Text("Промокод")
                .font(.headline)
                .foregroundColor(.perklyTextPrimary)

            Spacer()

            if cartVM.isPromoApplied {
                Button("Удалить") {
                    withAnimation { cartVM.resetPromo() }
                }
                .font(.footnote)
                .foregroundColor(.perklyRed)
                .frame(minHeight: PerklyDesign.Size.minimumTouchTarget)
                .accessibilityHint("Удаляет применённый промокод")
            }
        }
    }

    private var promoInputRow: some View {
        HStack(spacing: 12) {
            TextField("Введите код", text: $cartVM.promoCode)
                .font(.body)
                .padding(.horizontal, 14)
                .padding(.vertical, 12)
                .background(Color.perklyOverlay.opacity(0.05))
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .overlay {
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(promoFieldBorderColor, lineWidth: 1)
                }
                .disabled(cartVM.isPromoApplied)
                .accessibilityLabel("Промокод")
                .accessibilityHint(cartVM.isPromoApplied ? "Промокод уже применён" : "Введите код скидки")

            promoApplyButton
        }
    }

    private var promoApplyButton: some View {
        Button {
            Task { await cartVM.applyPromoCode() }
        } label: {
            ZStack {
                if cartVM.isValidatingPromo {
                    ProgressView()
                        .tint(.black)
                } else {
                    Text(cartVM.isPromoApplied ? "✅" : L10n.tr("Применить"))
                        .font(.system(size: 14, weight: .bold))
                }
            }
            .foregroundColor(.black)
            .frame(width: cartVM.isPromoApplied ? 44 : 100, height: 44)
            .background {
                promoButtonBackground
            }
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .disabled(cartVM.promoCode.isEmpty || cartVM.isValidatingPromo || cartVM.isPromoApplied)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(L10n.tr(cartVM.isPromoApplied ? "Промокод применён" : "Применить промокод"))
        .accessibilityValue(cartVM.isValidatingPromo ? "Проверка" : "")
    }

    @ViewBuilder
    private var promoButtonBackground: some View {
        if cartVM.isPromoApplied {
            Color.perklyGreen
        } else {
            Color.primaryGradient
        }
    }

    private var promoFieldBorderColor: Color {
        cartVM.isPromoApplied ? Color.perklyGreen.opacity(0.5) : Color.clear
    }

    @ViewBuilder
    private var promoStatusMessage: some View {
        if let error = cartVM.promoError {
            Text(error)
                .font(.footnote)
                .foregroundColor(.perklyRed)
                .padding(.horizontal, 4)
        } else if cartVM.isPromoApplied {
            Text("Промокод применен: -\(cartVM.promoPercent)% / \(uzs(cartVM.promoDiscount))")
                .font(.footnote)
                .foregroundColor(.perklyGreen)
                .padding(.horizontal, 4)
        }
    }

    @ViewBuilder
    private var loyaltySection: some View {
        if let user = authVM.user, (user.rewardPoints ?? 0) > 0 {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Image(systemName: "bitcoinsign.circle.fill")
                        .foregroundColor(.perklyGold)
                        .font(.system(size: 18))
                        .accessibilityHidden(true)

                    Text("Ваши баллы: \(user.rewardPoints ?? 0)")
                        .font(.headline)
                        .foregroundColor(.perklyTextPrimary)

                    Spacer()

                    Toggle("Использовать баллы", isOn: $cartVM.usePoints.animation())
                        .labelsHidden()
                        .tint(.perklyGreen)
                        .accessibilityLabel("Использовать баллы")
                        .accessibilityHint("Уменьшает сумму заказа доступными баллами")
                }

                if cartVM.usePoints {
                    pointsDiscountText(userPoints: user.rewardPoints ?? 0)
                }
            }
            .padding(16)
            .background(Color.perklyOverlay.opacity(0.05))
            .clipShape(RoundedRectangle(cornerRadius: 16))
        }
    }

    private func pointsDiscountText(userPoints: Int) -> some View {
        let discount = cartVM.calculatePointsDiscount(userPoints: userPoints)

        return Text("Будет списано \(Int(discount * 100)) баллов для скидки \(uzs(discount))")
            .font(.footnote)
            .foregroundColor(.perklyGreen)
    }

    private var checkoutBar: some View {
        VStack(spacing: 12) {
            HStack {
                Text("Итого:")
                    .font(.headline)
                    .foregroundColor(Color.perklyTextPrimary.opacity(0.6))

                Spacer()
                checkoutTotalView
            }
            .accessibilityElement(children: .combine)
            .accessibilityLabel("Итого к оплате")
            .accessibilityValue(uzs(checkoutFinalTotal))

            checkoutButton

            if !authVM.isAuthenticated {
                NavigationLink(destination: LoginView()) {
                    Text("Войдите, чтобы оформить заказ")
                        .font(.footnote)
                        .foregroundColor(.perklyPurple)
                }
                .frame(minHeight: PerklyDesign.Size.minimumTouchTarget)
                .accessibilityHint("Открывает экран входа")
            }
        }
        .padding(18)
        .perklyGlass(cornerRadius: 26, isInteractive: false)
        .padding(.horizontal, 12)
        .padding(.top, 8)
        .padding(.bottom, 4)
    }

    private var checkoutTotalView: some View {
        let pointsDiscount = cartVM.calculatePointsDiscount(userPoints: authVM.user?.rewardPoints ?? 0)
        let activationDiscount = cartVM.items.reduce(0) { $0 + cartVM.discountAmount(for: $1) }
        let totalDiscount = pointsDiscount + cartVM.promoDiscount + activationDiscount
        let finalTotal = max(0, cartVM.total - totalDiscount)

        return VStack(alignment: .trailing, spacing: 2) {
            if totalDiscount > 0 {
                Text("\(uzs(cartVM.total))")
                    .font(.system(size: 14))
                    .strikethrough()
                    .foregroundColor(Color.perklyTextPrimary.opacity(0.3))

                Text("\(uzs(finalTotal))")
                    .font(.system(size: 24, weight: .heavy))
                    .gradientForeground(.perklyGreen)
            } else {
                Text("\(uzs(cartVM.total))")
                    .font(.system(size: 24, weight: .heavy))
                    .gradientForeground(.perklyGreen)
            }
        }
    }

    private var checkoutFinalTotal: Double {
        let pointsDiscount = cartVM.calculatePointsDiscount(userPoints: authVM.user?.rewardPoints ?? 0)
        let activationDiscount = cartVM.items.reduce(0) { $0 + cartVM.discountAmount(for: $1) }
        return max(0, cartVM.total - pointsDiscount - cartVM.promoDiscount - activationDiscount)
    }

    private var checkoutButton: some View {
        Button {
            if authVM.isAuthenticated {
                showCheckoutAlert = true
            }
        } label: {
            HStack(spacing: 8) {
                if isPurchasing {
                    ProgressView()
                        .tint(.white)
                } else {
                    Image(systemName: "creditcard.fill")
                    Text("Оформить заказ (\(cartVM.count))")
                        .fontWeight(.bold)
                }
            }
            .foregroundColor(.perklyTextPrimary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .frame(minHeight: 54)
            .background(Color.primaryGradient)
            .clipShape(RoundedRectangle(cornerRadius: 16))
        }
        .buttonStyle(.plain)
        .disabled(isPurchasing || !authVM.isAuthenticated)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Оформить заказ")
        .accessibilityValue(isPurchasing ? "Покупка выполняется" : "\(cartVM.count) товаров")
        .accessibilityHint(authVM.isAuthenticated ? "Показывает подтверждение оплаты" : "Сначала войдите в аккаунт")
    }
    
    private func checkout() async {
        isPurchasing = true
        purchaseResults = []
        let service = TransactionsService.shared
        let chatService = ChatService.shared
        var failedOfferIds = Set<String>()
        var openedRooms: [ChatRoom] = []
        var successfulTransactions: [Transaction] = []
        
        let userPoints = authVM.user?.rewardPoints ?? 0
        var remainingPointsToSpend = cartVM.usePoints ? userPoints : 0
        
        for item in cartVM.items {
            do {
                // Calculate max allowed points for this item (up to 50% of price after promo)
                let promoDiscount = cartVM.isPromoApplied ? (item.price * Double(cartVM.promoPercent) / 100.0) : 0
                let activationDiscount = cartVM.discountAmount(for: item)
                let priceAfterPromo = max(0, item.price - promoDiscount - activationDiscount)
                let maxPointsAllowed = Int(floor((priceAfterPromo * 0.5) / 120.0))
                
                let itemPoints = cartVM.usePoints ? min(remainingPointsToSpend, maxPointsAllowed) : 0
                remainingPointsToSpend -= itemPoints
                
                let transaction = try await service.purchase(
                    offerId: item.offerId,
                    isGift: item.isGift,
                    pointsToRedeem: itemPoints,
                    promoCode: cartVM.isPromoApplied ? cartVM.promoCode : nil,
                    promocodeActivationId: cartVM.selectedActivation(for: item.offerId)?.id
                )
                successfulTransactions.append(transaction)
                purchaseResults.append("✅ \(item.title) \(item.isGift ? "🎁" : "")")

                if !item.isGift,
                   let sellerId = item.sellerId,
                   let room = try? await chatService.createOrGetDirectRoom(targetUserId: sellerId) {
                    openedRooms.append(room)
                }
            } catch {
                failedOfferIds.insert(item.offerId)
                purchaseResults.append("❌ \(item.title): \(error.localizedDescription)")
            }
        }
        
        if failedOfferIds.isEmpty {
            HapticManager.shared.playPurchaseSuccess()
            cartVM.clearCart()
        } else {
            HapticManager.shared.playPurchaseError()
            for item in cartVM.items where !failedOfferIds.contains(item.offerId) {
                cartVM.removeItem(item.offerId)
            }
        }
        
        await authVM.refreshUser()
        isPurchasing = false

        if failedOfferIds.isEmpty, openedRooms.count == 1, purchaseResults.count == 1 {
            activeChatRoom = openedRooms[0]
        } else if failedOfferIds.isEmpty, !successfulTransactions.isEmpty {
            walletTransactions = successfulTransactions
            showWalletTransactionsSheet = true
        } else {
            showPurchaseResultsAlert = !purchaseResults.isEmpty
        }
    }
}

private struct PurchaseWalletPassesSheet: View {
    let transactions: [Transaction]
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ZStack {
                Color.perklyDark.ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        HStack(spacing: 12) {
                            Circle()
                                .fill(Color.perklyGreen.opacity(0.17))
                                .frame(width: 42, height: 42)
                                .overlay {
                                    Image(systemName: "checkmark")
                                        .font(.system(size: 16, weight: .bold))
                                        .foregroundStyle(Color.perklyGreen)
                                }
                                .accessibilityHidden(true)
                            VStack(alignment: .leading, spacing: 3) {
                                Text("Покупка готова")
                                    .font(.headline)
                                    .foregroundStyle(Color.perklyTextPrimary)
                                Text("Купоны можно добавить в Apple Wallet")
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundStyle(Color.perklyTextPrimary.opacity(0.6))
                            }
                            Spacer()
                        }
                        .padding(.horizontal, 14)
                        .padding(.vertical, 11)
                        .perklyGlass(cornerRadius: 22, tint: Color.perklyGreen.opacity(0.12), isInteractive: false)

                        ForEach(transactions) { transaction in
                            VStack(alignment: .leading, spacing: 12) {
                                HStack {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(transaction.offer?.safeTitle ?? L10n.tr("Покупка"))
                                            .font(.headline)
                                            .foregroundColor(.perklyTextPrimary)
                                            .lineLimit(2)
                                        Text(transaction.statusEnum.displayName)
                                            .font(.system(size: 12, weight: .medium))
                                            .foregroundColor(Color.perklyTextPrimary.opacity(0.45))
                                    }

                                    Spacer()

                                    Text("\(uzs(transaction.price))")
                                        .font(.system(size: 15, weight: .heavy))
                                        .foregroundColor(.perklyTextPrimary)
                                }

                                if transaction.canAddToAppleWallet {
                                    WalletPassButton(transaction: transaction)
                                }
                            }
                            .padding(16)
                            .perklySurface(cornerRadius: 18)
                        }
                    }
                    .padding(20)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Готово") {
                        dismiss()
                    }
                    .foregroundColor(Color.perklyTextPrimary.opacity(0.8))
                }
            }
        }
    }
}

// MARK: - Cart Item Row
struct CartItemRow: View {
    let item: CartItem
    let onRemove: () -> Void
    @EnvironmentObject var cartVM: CartViewModel

    private var availableActivations: [PromocodeActivation] {
        cartVM.usableActivations(for: item.offerId)
    }

    private var selectedActivation: PromocodeActivation? {
        cartVM.selectedActivation(for: item.offerId)
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            ViewThatFits(in: .horizontal) {
                HStack(spacing: 14) {
                    itemSummary
                    Spacer()
                    VStack(alignment: .trailing, spacing: 6) {
                        itemPrice
                        itemActionButtons
                    }
                }

                VStack(alignment: .leading, spacing: 10) {
                    itemSummary
                    HStack {
                        itemPrice
                        Spacer()
                        itemActionButtons
                    }
                }
            }

            if !availableActivations.isEmpty {
                Menu {
                    Button("Без промокода") {
                        cartVM.selectPromocodeActivation(nil, for: item.offerId)
                    }

                    ForEach(availableActivations) { activation in
                        Button(activation.promocode?.title ?? activation.codeSnapshot ?? "Промокод") {
                            cartVM.selectPromocodeActivation(activation.id, for: item.offerId)
                        }
                    }
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "ticket.fill")
                        Text(selectedActivation?.promocode?.title ?? L10n.tr("Выбрать активированный промокод"))
                            .lineLimit(1)
                        Spacer()
                        if let selectedActivation {
                            Text("-\(Int(selectedActivation.promocode?.discountValue ?? 0))%")
                                .fontWeight(.heavy)
                        }
                        Image(systemName: "chevron.down")
                            .font(.system(size: 10, weight: .bold))
                    }
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(selectedActivation == nil ? .white.opacity(0.66) : .perklyGreen)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 9)
                    .background(Color.perklyOverlay.opacity(0.06))
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Активированный промокод")
                .accessibilityValue(selectedActivation?.promocode?.title ?? "Не выбран")
                .accessibilityHint("Открывает список доступных промокодов")
            }
        }
        .padding(14)
        .background(item.isGift ? Color.perklyOrange.opacity(0.08) : Color.clear)
        .perklySurface(cornerRadius: 16)
    }

    private var itemSummary: some View {
        HStack(spacing: 14) {
            ZStack {
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.perklyOverlay.opacity(0.05))
                    .frame(width: 56, height: 56)

                if let img = item.image, let url = RemoteImageURL.url(from: img) {
                    AsyncImage(url: url) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .padding(8)
                    } placeholder: {
                        Image(systemName: "bag.fill")
                            .foregroundColor(Color.perklyTextPrimary.opacity(0.2))
                    }
                    .frame(width: 56, height: 56)
                } else {
                    Image(systemName: "bag.fill")
                        .foregroundColor(Color.perklyTextPrimary.opacity(0.2))
                }
            }
            .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 4) {
                Text(item.title)
                    .font(.headline)
                    .foregroundColor(.perklyTextPrimary)
                    .fixedSize(horizontal: false, vertical: true)

                Text(item.category)
                    .font(.subheadline)
                    .foregroundColor(Color.perklyTextPrimary.opacity(0.4))
            }
        }
    }

    private var itemPrice: some View {
        Text("\(uzs(item.price))")
            .font(.headline)
            .foregroundColor(.perklyTextPrimary)
    }

    private var itemActionButtons: some View {
        HStack(spacing: 10) {
            Button {
                withAnimation {
                    cartVM.toggleGift(for: item.offerId)
                }
            } label: {
                Image(systemName: item.isGift ? "gift.fill" : "gift")
                    .font(.system(size: 16))
                    .foregroundColor(item.isGift ? .perklyOrange : .white.opacity(0.3))
                    .frame(width: PerklyDesign.Size.minimumTouchTarget, height: PerklyDesign.Size.minimumTouchTarget)
            }
            .buttonStyle(.plain)
            .accessibilityLabel(L10n.tr(item.isGift ? "Не покупать в подарок" : "Купить в подарок"))
            .accessibilityValue(item.isGift ? "Выбрано" : "Не выбрано")
            .accessibilityHint("Изменяет режим покупки этого товара")

            Button(action: onRemove) {
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: 16))
                    .foregroundColor(Color.perklyTextPrimary.opacity(0.3))
                    .frame(width: PerklyDesign.Size.minimumTouchTarget, height: PerklyDesign.Size.minimumTouchTarget)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Удалить \(item.title) из корзины")
        }
    }
}
