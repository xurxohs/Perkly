import SwiftUI
import UIKit

struct OfferDetailView: View {
    let offerId: String
    @StateObject private var vm = OfferDetailViewModel()
    @EnvironmentObject var authVM: AuthViewModel
    @State private var showPurchaseSheet = false
    @State private var showLoginPrompt = false
    @State private var showWriteReview = false
    @State private var purchaseResultDetent: PresentationDetent = .medium
    
    var body: some View {
        ZStack(alignment: .bottom) {
            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 0) {
                    if vm.isLoading {
                        OfferDetailSkeleton()
                    } else if let offer = vm.offer {
                        VStack(spacing: 0) {
                            // Image Header
                            TabView {
                                ForEach(offer.productImages, id: \.self) { imageURL in
                                    ZStack {
                                        if let url = RemoteImageURL.url(from: imageURL) {
                                            AsyncImage(url: url) { image in
                                                image
                                                    .resizable()
                                                    .aspectRatio(contentMode: offer.usesBrandLogoArtwork ? .fit : .fill)
                                                    .padding(offer.usesBrandLogoArtwork ? 40 : 0)
                                            } placeholder: {
                                                PerklySkeletonBlock(height: 240, cornerRadius: 0)
                                            }
                                        } else {
                                            Image(systemName: "bag.fill")
                                                .font(.system(size: 50))
                                                .foregroundColor(Color.perklyTextPrimary.opacity(0.15))
                                        }
                                    }
                                }
                            }
                            .tabViewStyle(.page(indexDisplayMode: offer.productImages.count > 1 ? .automatic : .never))
                            .accessibilityHidden(true)
                            .frame(maxWidth: .infinity)
                            .frame(height: 240)
                            .background(
                                LinearGradient(
                                    colors: [Color.perklyOverlay.opacity(0.06), Color.perklyOverlay.opacity(0.02)],
                                    startPoint: .top, endPoint: .bottom
                                )
                            )
                            
                            // Content
                            VStack(alignment: .leading, spacing: 20) {
                                // Category & Exclusive badge
                                HStack(spacing: 8) {
                                    Text(offer.safeCategory)
                                        .font(.caption.weight(.semibold))
                                        .textCase(.uppercase)
                                        .tracking(0.5)
                                        .foregroundColor(Color.perklyTextPrimary.opacity(0.7))
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 5)
                                        .background(Color.perklyOverlay.opacity(0.08))
                                        .clipShape(Capsule())
                                    
                                    if offer.safeIsExclusive {
                                        HStack(spacing: 4) {
                                            Image(systemName: "star.fill")
                                                .font(.system(size: 9))
                                                .accessibilityHidden(true)
                                            Text("Эксклюзив")
                                                .font(.caption.weight(.semibold))
                                        }
                                        .foregroundColor(.perklyGold)
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 5)
                                        .background(Color.perklyGold.opacity(0.15))
                                        .clipShape(Capsule())
                                    }
                                    
                                    if offer.safeIsFlashDrop {
                                        HStack(spacing: 4) {
                                            Image(systemName: "flame.fill")
                                                .font(.system(size: 9))
                                                .accessibilityHidden(true)
                                            Text("Ограничено")
                                                .font(.caption.weight(.semibold))
                                        }
                                        .foregroundColor(.perklyOrange)
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 5)
                                        .background(Color.perklyOrange.opacity(0.15))
                                        .clipShape(Capsule())
                                    }
                                }
                                
                                // Title
                                Text(offer.safeTitle)
                                    .font(.title.bold())
                                    .foregroundColor(.perklyTextPrimary)
                                    .fixedSize(horizontal: false, vertical: true)
                                    .accessibilityAddTraits(.isHeader)
                                
                                // Price
                                HStack(alignment: .firstTextBaseline, spacing: 10) {
                                    Text("\(uzs(offer.safePrice))")
                                        .font(.largeTitle.bold())
                                        .gradientForeground(.perklyGreen)
                                    
                                    if let original = offer.originalPrice {
                                        Text("\(uzs(original))")
                                            .font(.system(size: 18))
                                            .foregroundColor(Color.perklyTextPrimary.opacity(0.25))
                                            .strikethrough()
                                    }
                                    
                                    if let discount = offer.discountPercent, discount > 0 {
                                        Text("-\(discount)%")
                                            .font(.system(size: 14, weight: .bold))
                                            .foregroundColor(.perklyGreen)
                                            .padding(.horizontal, 8)
                                            .padding(.vertical, 4)
                                            .background(Color.perklyGreen.opacity(0.15))
                                            .clipShape(Capsule())
                                    }
                                }
                                .accessibilityElement(children: .combine)
                                .accessibilityLabel("Цена \(uzs(offer.safePrice))")
                                
                                // Countdown for flash drops
                                if let hours = offer.hoursLeft, hours > 0 {
                                    CountdownTimer(hours: hours)
                                }

                                OfferTrustStrip(offer: offer)

                                if !vm.availablePromocodes.isEmpty {
                                    VStack(alignment: .leading, spacing: 12) {
                                        HStack(spacing: 8) {
                                            Image(systemName: "ticket.fill")
                                                .foregroundColor(.perklyGreen)
                                                .accessibilityHidden(true)
                                            Text("Доступные промокоды")
                                                .font(.headline)
                                                .foregroundColor(.perklyTextPrimary)
                                                .accessibilityAddTraits(.isHeader)
                                        }

                                        ForEach(vm.availablePromocodes.prefix(3)) { promocode in
                                            OfferPromocodeCard(
                                                promocode: promocode,
                                                isActivated: vm.activatedPromocodeIds.contains(promocode.id),
                                                isLoading: vm.activatingPromocodeId == promocode.id,
                                                onActivate: {
                                                    if authVM.isAuthenticated {
                                                        Task {
                                                            await vm.activatePromocode(
                                                                promocode,
                                                                isAuthenticated: authVM.isAuthenticated
                                                            )
                                                        }
                                                    } else {
                                                        showLoginPrompt = true
                                                    }
                                                }
                                            )
                                        }
                                    }
                                    .padding(18)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .perklySurface(cornerRadius: 16)
                                }
                                
                                // Description
                                VStack(alignment: .leading, spacing: 8) {
                                    Text("Описание")
                                        .font(.headline)
                                        .foregroundColor(.perklyTextPrimary)
                                        .accessibilityAddTraits(.isHeader)
                                    
                                    RichLinkText(
                                        source: offer.safeDescription,
                                        font: .body,
                                        color: Color.perklyTextPrimary.opacity(0.58),
                                        spacing: 4
                                    )
                                }
                                .padding(18)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .perklySurface(cornerRadius: 16)
                                
                                // Usage Instructions
                                if let instructions = offer.usageInstructions, !instructions.isEmpty {
                                    VStack(alignment: .leading, spacing: 8) {
                                        HStack(spacing: 6) {
                                            Image(systemName: "doc.text.fill")
                                                .foregroundColor(.perklyPurple)
                                                .accessibilityHidden(true)
                                            Text("Инструкция по использованию")
                                                .font(.headline)
                                                .foregroundColor(.perklyTextPrimary)
                                                .accessibilityAddTraits(.isHeader)
                                        }
                                        
                                        RichLinkText(
                                            source: instructions,
                                            font: .body,
                                            color: Color.perklyTextPrimary.opacity(0.58),
                                            spacing: 4
                                        )
                                    }
                                    .padding(18)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .perklySurface(cornerRadius: 16)
                                }
                                
                                // Reviews
                                if let stats = vm.reviewStats {
                                    VStack(alignment: .leading, spacing: 12) {
                                        HStack {
                                            Text("Отзывы")
                                                .font(.headline)
                                                .foregroundColor(.perklyTextPrimary)
                                                .accessibilityAddTraits(.isHeader)
                                            
                                            Spacer()
                                            
                                            HStack(spacing: 4) {
                                                Image(systemName: "star.fill")
                                                    .foregroundColor(.perklyGold)
                                                    .font(.system(size: 13))
                                                Text(String(format: "%.1f", stats.averageRating))
                                                    .font(.system(size: 14, weight: .bold))
                                                    .foregroundColor(.perklyTextPrimary)
                                                Text("(\(stats.totalReviews))")
                                                    .font(.system(size: 13))
                                                    .foregroundColor(Color.perklyTextPrimary.opacity(0.4))
                                            }
                                        }
                                        
                                        // Write a Review button — shows only after purchase
                                        if let tx = vm.userTransaction, authVM.isAuthenticated {
                                            Button {
                                                showWriteReview = true
                                            } label: {
                                                HStack(spacing: 8) {
                                                    Image(systemName: "square.and.pencil")
                                                        .font(.system(size: 14))
                                                    Text("Написать отзыв")
                                                        .font(.system(size: 14, weight: .semibold))
                                                }
                                                .foregroundColor(.perklyGold)
                                                .frame(maxWidth: .infinity)
                                                .padding(.vertical, 12)
                                                .frame(minHeight: PerklyDesign.Size.minimumTouchTarget)
                                                .background(Color.perklyGold.opacity(0.12))
                                                .clipShape(RoundedRectangle(cornerRadius: 12))
                                                .overlay(
                                                    RoundedRectangle(cornerRadius: 12)
                                                        .stroke(Color.perklyGold.opacity(0.3), lineWidth: 1)
                                                )
                                            }
                                            .buttonStyle(.plain)
                                            .accessibilityHint("Открывает форму отзыва о покупке")
                                            .sheet(isPresented: $showWriteReview) {
                                                LeaveReviewSheet(transaction: tx)
                                                    .environmentObject(authVM)
                                                    .presentationDetents([.medium, .large])
                                                    .presentationDragIndicator(.visible)
                                                    .onDisappear {
                                                        // Reload reviews after submission
                                                        Task { await vm.loadOffer(offerId, user: authVM.user) }
                                                    }
                                            }
                                        }
                                        
                                        if vm.reviews.isEmpty {
                                            Text("Отзывов пока нет. Будьте первым!")
                                                .font(.system(size: 14))
                                                .foregroundColor(Color.perklyTextPrimary.opacity(0.4))
                                                .padding(.vertical, 10)
                                        } else {
                                            ForEach(vm.reviews.prefix(3)) { review in
                                                ReviewRow(review: review)
                                            }
                                        }
                                    }
                                    .padding(18)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .perklySurface(cornerRadius: 16)
                                }

                            }
                            .padding(20)
                        }
                    } else if let error = vm.error {
                        VStack(spacing: 12) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .font(.system(size: 40))
                                .foregroundColor(.perklyOrange)
                                .accessibilityHidden(true)
                            Text(error)
                                .foregroundColor(Color.perklyTextPrimary.opacity(0.6))
                                .multilineTextAlignment(.center)
                        }
                        .padding(40)
                    } else {
                        PerklyContentStateView(
                            kind: .error,
                            icon: "exclamationmark.triangle",
                            title: "Предложение не загрузилось",
                            message: "Попробуйте открыть его ещё раз.",
                            actionTitle: "Повторить",
                            action: {
                                Task {
                                    await vm.loadOffer(
                                        offerId,
                                        user: authVM.user
                                    )
                                    await vm.loadSupplementalContent(
                                        offerId,
                                        user: authVM.user
                                    )
                                }
                            }
                        )
                        .frame(maxWidth: .infinity)
                        .padding(.top, 100)
                    }
                    
                    // Add padding at the bottom so content is not hidden by the sticky bar
                    Color.clear.frame(height: 100)
                        .accessibilityHidden(true)
                }
            }
            .background(Color.perklyDark)
            .navigationBarTitleDisplayMode(.inline)
            
            // Bottom action bar
            if let offer = vm.offer {
                PerklyGlassGroup(spacing: 10) {
                    HStack(spacing: 10) {
                    Button {
                        if authVM.isAuthenticated {
                            Task { await vm.toggleSaved(isAuthenticated: authVM.isAuthenticated) }
                        } else {
                            showLoginPrompt = true
                        }
                    } label: {
                        Image(systemName: vm.isSaved ? "heart.fill" : "heart")
                            .font(.system(size: 20))
                            .foregroundColor(vm.isSaved ? .perklyPink : .white)
                            .frame(width: 52, height: 52)
                            .perklyGlass(
                                cornerRadius: 18,
                                tint: vm.isSaved ? .perklyPink.opacity(0.22) : nil
                            )
                    }
                    .buttonStyle(.plain)
                    .disabled(vm.isSavingSavedState)
                    .accessibilityLabel(L10n.tr(vm.isSaved ? "Удалить из избранного" : "Добавить в избранное"))
                    .accessibilityValue(vm.isSavingSavedState ? "Сохранение" : (vm.isSaved ? "Сохранено" : "Не сохранено"))
                    .accessibilityHint("Изменяет состояние избранного")

                    if vm.userTransaction != nil {
                        NavigationLink(destination: ActivePurchasesView()) {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 20, weight: .bold))
                                .foregroundColor(.perklyGreen)
                                .frame(width: 52, height: 52)
                                .perklyGlass(cornerRadius: 18, tint: .perklyGreen.opacity(0.2))
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("Открыть предыдущую покупку")
                        .accessibilityHint("Показывает ваши активные покупки")
                    }

                    Button {
                        if authVM.isAuthenticated {
                            showPurchaseSheet = true
                        } else {
                            showLoginPrompt = true
                        }
                    } label: {
                        HStack(spacing: 8) {
                            if vm.isPurchasing {
                                ProgressView().tint(.white)
                            } else {
                                Text(purchaseButtonTitle(for: offer))
                                    .font(.headline)
                            }
                        }
                        .foregroundColor(.perklyTextPrimary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .frame(minHeight: 52)
                        .perklyGlass(
                            cornerRadius: 18,
                            tint: Color.perklyPurple.opacity(0.2),
                            isInteractive: true
                        )
                    }
                    .buttonStyle(.plain)
                    .disabled(vm.isPurchasing)
                    .accessibilityElement(children: .ignore)
                    .accessibilityLabel(purchaseButtonTitle(for: offer))
                    .accessibilityValue(vm.isPurchasing ? "Покупка выполняется" : "")
                    .accessibilityHint("Открывает подтверждение покупки")
                    }
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
            }
        } // End of ZStack
        .sheet(isPresented: $showPurchaseSheet) {
            if let offer = vm.offer {
                PurchaseConfirmationSheet(
                    offer: offer,
                    balance: authVM.user?.balance ?? 0,
                    isPurchasing: vm.isPurchasing,
                    onPurchase: { isGift in
                        showPurchaseSheet = false
                        purchaseResultDetent = .medium
                        Task {
                            await vm.purchase(isGift: isGift)
                            await authVM.refreshUser()
                        }
                    }
                )
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
            }
        }
        .sheet(isPresented: $vm.purchaseSuccess) {
            if let offer = vm.offer, let transaction = vm.userTransaction {
                PurchaseResultSheet(
                    offer: offer,
                    transaction: transaction,
                    giftCode: vm.lastGiftCode,
                    onQRCodeRevealed: {
                        withAnimation(.spring(response: 0.34, dampingFraction: 0.9)) {
                            purchaseResultDetent = .large
                        }
                    }
                )
                .environmentObject(authVM)
                .presentationDetents(
                    [.medium, .large],
                    selection: $purchaseResultDetent
                )
                .presentationDragIndicator(.visible)
            }
        }
        .alert("Ошибка", isPresented: .init(get: { vm.error != nil }, set: { if !$0 { vm.error = nil } })) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(vm.error ?? L10n.tr("Неизвестная ошибка"))
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
        .fullScreenCover(item: $vm.activeChatRoom) { room in
            NavigationStack {
                ChatRoomView(room: room)
                    .environmentObject(authVM)
            }
        }
        .task(id: detailLoadKey) {
            await vm.loadOffer(offerId, user: authVM.user)
            guard vm.offer != nil else { return }

            if authVM.isAuthenticated {
                await vm.checkIfPurchased()
            }
            await vm.loadSupplementalContent(
                offerId,
                user: authVM.user
            )
        }
    }

    private var detailLoadKey: String {
        [
            offerId,
            authVM.user?.id ?? "",
            authVM.user?.tier ?? "",
            authVM.user?.updatedAt ?? ""
        ].joined(separator: "|")
    }

    private func purchaseButtonTitle(for offer: Offer) -> String {
        if offer.safePrice <= 0 {
            return vm.userTransaction == nil ? "Получить бесплатно" : "Получить ещё"
        }

        let price = uzs(offer.safePrice)
        return vm.userTransaction == nil ? "Купить за \(price)" : "Купить ещё за \(price)"
    }

}

private struct OfferDetailSkeleton: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            PerklySkeletonBlock(height: 240, cornerRadius: 0)

            VStack(alignment: .leading, spacing: 16) {
                PerklySkeletonBlock(width: 112, height: 26, cornerRadius: 13)
                PerklySkeletonBlock(height: 38, cornerRadius: 12)
                PerklySkeletonBlock(width: 176, height: 42, cornerRadius: 12)

                HStack(spacing: 10) {
                    PerklySkeletonBlock(height: 52, cornerRadius: 18)
                    PerklySkeletonBlock(height: 52, cornerRadius: 18)
                }

                PerklySkeletonBlock(height: 132, cornerRadius: 20)
                PerklySkeletonBlock(height: 180, cornerRadius: 20)
            }
            .padding(.horizontal, 20)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Загрузка предложения")
    }
}

private struct OfferTrustStrip: View {
    let offer: Offer

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                trustItem(
                    icon: "lock.shield.fill",
                    title: "Защищённая оплата",
                    tint: .perklyGreen
                )

                trustItem(
                    icon: "storefront.fill",
                    title: offer.seller?.displayName ?? "Продавец Perkly",
                    tint: .perklyCyan
                )

                if let purchases = offer._count?.transactions, purchases > 0 {
                    trustItem(
                        icon: "checkmark.seal.fill",
                        title: "\(purchases) покупок",
                        tint: .perklyGold
                    )
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .contain)
    }

    private func trustItem(icon: String, title: String, tint: Color) -> some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(tint)
                .accessibilityHidden(true)
            Text(L10n.tr(title))
                .font(.footnote.weight(.semibold))
                .foregroundColor(Color.perklyTextPrimary.opacity(0.68))
                .lineLimit(1)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .background(Color.perklyOverlay.opacity(0.06))
        .clipShape(Capsule())
        .accessibilityElement(children: .combine)
    }
}

private struct PurchaseConfirmationSheet: View {
    let offer: Offer
    let balance: Double
    let isPurchasing: Bool
    let onPurchase: (Bool) -> Void

    @Environment(\.dismiss) private var dismiss

    private var hasEnoughBalance: Bool {
        offer.safePrice <= balance
    }

    private var balanceAfterPurchase: Double {
        max(balance - offer.safePrice, 0)
    }

    private var savings: Double {
        max((offer.originalPrice ?? offer.safePrice) - offer.safePrice, 0)
    }

    var body: some View {
        NavigationStack {
            ScrollView(.vertical, showsIndicators: false) {
                VStack(alignment: .leading, spacing: PerklyDesign.Spacing.lg) {
                    HStack(spacing: 14) {
                        AsyncImage(url: RemoteImageURL.url(from: offer.safeProductImage)) { image in
                            image
                                .resizable()
                                .aspectRatio(contentMode: offer.usesBrandLogoArtwork ? .fit : .fill)
                                .padding(offer.usesBrandLogoArtwork ? 10 : 0)
                        } placeholder: {
                            Color.perklyOverlay.opacity(0.06)
                        }
                        .frame(width: 68, height: 68)
                        .clipShape(RoundedRectangle(cornerRadius: PerklyDesign.Radius.control))
                        .accessibilityHidden(true)

                        VStack(alignment: .leading, spacing: 5) {
                            Text(offer.safeTitle)
                                .font(.headline)
                                .foregroundColor(.perklyTextPrimary)
                                .lineLimit(2)
                            Text(offer.seller?.displayName ?? L10n.tr("Продавец Perkly"))
                                .font(.subheadline.weight(.medium))
                                .foregroundColor(Color.perklyTextPrimary.opacity(0.5))
                        }
                    }

                    VStack(spacing: 12) {
                        checkoutRow(title: "Стоимость", value: money(offer.safePrice))
                        if savings > 0 {
                            checkoutRow(title: "Ваша выгода", value: money(savings), tint: .perklyGreen)
                        }
                        Divider().overlay(Color.perklyOverlay.opacity(0.08))
                        checkoutRow(title: "Баланс сейчас", value: money(balance))
                        checkoutRow(
                            title: "После покупки",
                            value: money(balanceAfterPurchase),
                            tint: hasEnoughBalance ? .white : .perklyRed
                        )
                    }
                    .padding(16)
                    .background(Color.perklyOverlay.opacity(0.05))
                    .clipShape(RoundedRectangle(cornerRadius: PerklyDesign.Radius.card))

                    if !hasEnoughBalance {
                        Label("Недостаточно средств. Пополните баланс в профиле.", systemImage: "exclamationmark.circle.fill")
                            .font(.footnote.weight(.semibold))
                            .foregroundColor(.perklyRed)
                            .padding(14)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.perklyRed.opacity(0.1))
                            .clipShape(RoundedRectangle(cornerRadius: PerklyDesign.Radius.control))
                    }

                    VStack(spacing: 10) {
                        Button {
                            onPurchase(false)
                        } label: {
                            HStack(spacing: 8) {
                                if isPurchasing { ProgressView().tint(.white) }
                                Text(
                                    offer.safePrice <= 0
                                        ? L10n.tr("Получить")
                                        : L10n.format("offer.pay_amount", money(offer.safePrice))
                                )
                                    .font(.headline)
                            }
                            .foregroundColor(.perklyTextPrimary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .frame(minHeight: PerklyDesign.Size.controlHeight)
                            .background(hasEnoughBalance ? Color.primaryGradient : LinearGradient(colors: [.gray, .gray], startPoint: .leading, endPoint: .trailing))
                            .clipShape(RoundedRectangle(cornerRadius: PerklyDesign.Radius.control))
                        }
                        .buttonStyle(.plain)
                        .disabled(!hasEnoughBalance || isPurchasing)
                        .accessibilityElement(children: .ignore)
                        .accessibilityLabel(
                            offer.safePrice <= 0
                                ? L10n.tr("Получить")
                                : L10n.format("offer.pay_amount", money(offer.safePrice))
                        )
                        .accessibilityValue(isPurchasing ? "Оплата выполняется" : "")
                        .accessibilityHint(hasEnoughBalance ? "Подтверждает покупку для себя" : "Недостаточно средств")

                        Button("Купить в подарок") {
                            onPurchase(true)
                        }
                        .font(.subheadline.weight(.bold))
                        .foregroundColor(.perklyPurple)
                        .frame(maxWidth: .infinity)
                        .frame(height: PerklyDesign.Size.minimumTouchTarget)
                        .disabled(!hasEnoughBalance || isPurchasing)
                        .accessibilityHint(hasEnoughBalance ? "Подтверждает покупку в подарок" : "Недостаточно средств")
                    }

                    Label("Оплата защищена Perkly. Данные предложения откроются после успешной операции.", systemImage: "lock.shield.fill")
                        .font(.footnote.weight(.medium))
                        .foregroundColor(Color.perklyTextPrimary.opacity(0.45))
                }
                .padding(PerklyDesign.Spacing.lg)
            }
            .background(Color.perklyDark.ignoresSafeArea())
            .navigationTitle("Подтверждение")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Отмена") { dismiss() }
                }
            }
        }
    }

    private func checkoutRow(title: String, value: String, tint: Color = .white) -> some View {
        HStack {
            Text(L10n.tr(title))
                .font(.subheadline.weight(.medium))
                .foregroundColor(Color.perklyTextPrimary.opacity(0.55))
            Spacer()
            Text(value)
                .font(.subheadline.weight(.bold))
            .foregroundColor(tint)
        }
        .accessibilityElement(children: .combine)
    }

    private func money(_ value: Double) -> String {
        "\(uzs(value))"
    }
}

private struct PurchaseResultSheet: View {
    let offer: Offer
    let transaction: Transaction
    let giftCode: String?
    let onQRCodeRevealed: () -> Void

    var body: some View {
        NavigationStack {
            PurchasedPromocodeView(
                offer: offer,
                transaction: transaction,
                giftCode: giftCode,
                onQRCodeRevealed: onQRCodeRevealed
            )
        }
    }
}

// MARK: - Review Row
struct OfferPromocodeCard: View {
    let promocode: Promocode
    let isActivated: Bool
    let isLoading: Bool
    let onActivate: () -> Void

    var body: some View {
        ViewThatFits(in: .horizontal) {
            HStack(spacing: 12) {
                promocodeDetails
                Spacer()
                activationControls
            }

            VStack(alignment: .leading, spacing: 12) {
                promocodeDetails
                activationControls
                    .frame(maxWidth: .infinity, alignment: .trailing)
            }
        }
        .padding(12)
        .background(Color.perklyOverlay.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private var promocodeDetails: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(promocode.title)
                .font(.headline)
                .foregroundColor(.perklyTextPrimary)
                .fixedSize(horizontal: false, vertical: true)

            Text(
                promocode.description
                    ?? L10n.format("offer.promocode_type", promocode.codeType.rawValue)
            )
                .font(.subheadline.weight(.medium))
                .foregroundColor(Color.perklyTextPrimary.opacity(0.48))
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var activationControls: some View {
        VStack(alignment: .trailing, spacing: 8) {
            Text("-\(Int(promocode.discountValue))%")
                .font(.headline)
                .foregroundColor(.perklyGreen)

            Button(action: onActivate) {
                HStack(spacing: 5) {
                    if isLoading {
                        ProgressView()
                            .tint(isActivated ? .white : .black)
                    } else {
                        Image(systemName: isActivated ? "checkmark.circle.fill" : "plus.circle.fill")
                        Text(L10n.tr(isActivated ? "Активирован" : "Активировать"))
                    }
                }
                .font(.footnote.weight(.heavy))
                .foregroundColor(isActivated ? .white.opacity(0.65) : .black)
                .padding(.horizontal, 10)
                .padding(.vertical, 10)
                .frame(minHeight: PerklyDesign.Size.minimumTouchTarget)
                .background(isActivated ? Color.perklyOverlay.opacity(0.08) : Color.perklyGreen)
                .clipShape(Capsule())
            }
            .buttonStyle(.plain)
            .disabled(isActivated || isLoading)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(L10n.tr(isActivated ? "Промокод активирован" : "Активировать промокод"))
            .accessibilityValue(isLoading ? "Активация" : "\(Int(promocode.discountValue)) процентов скидки")
        }
    }
}

struct ReviewRow: View {
    let review: Review
    
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Circle()
                    .fill(Color.primaryGradient)
                    .frame(width: 28, height: 28)
                    .overlay(
                        Text(String((review.author?.displayName ?? "U").prefix(1)))
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(.perklyTextPrimary)
                    )
                    .accessibilityHidden(true)
                
                Text(review.author?.displayName ?? L10n.tr("Пользователь"))
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.perklyTextPrimary)
                
                Spacer()
                
                HStack(spacing: 2) {
                    ForEach(0..<5) { i in
                        Image(systemName: i < review.rating ? "star.fill" : "star")
                            .font(.system(size: 10))
                            .foregroundColor(.perklyGold)
                    }
                }
                .accessibilityElement(children: .ignore)
                .accessibilityLabel("Оценка")
                .accessibilityValue("\(review.rating) из 5")
            }
            
            if let comment = review.comment, !comment.isEmpty {
                Text(comment)
                    .font(.system(size: 13))
                    .foregroundColor(Color.perklyTextPrimary.opacity(0.5))
            }
        }
        .padding(.vertical, 8)
        .accessibilityElement(children: .combine)
    }
}
