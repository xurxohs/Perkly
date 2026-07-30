import SwiftUI
import CoreImage.CIFilterBuiltins

struct GiftCodesView: View {
    @State private var gifts: [Transaction] = []
    @State private var isLoading = false
    @State private var errorText: String?
    
    @State private var redeemCode = ""
    @State private var isRedeeming = false
    @State private var redeemSuccess = false
    
    private let service = TransactionsService.shared
    
    var body: some View {
        ZStack {
            Color.perklyDark.ignoresSafeArea()
            
            ScrollView {
                VStack(spacing: 24) {
                    // Redeem Section
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Активировать подарок")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.white)
                        
                        VStack(spacing: 12) {
                            TextField("XXXX-XXXX-XXXX-XXXX", text: $redeemCode)
                                .font(.system(size: 16, design: .monospaced))
                                .foregroundColor(.white)
                                .padding(16)
                                .background(Color.white.opacity(0.05))
                                .clipShape(RoundedRectangle(cornerRadius: 14))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 14)
                                        .stroke(Color.white.opacity(0.1), lineWidth: 1)
                                )
                                .textInputAutocapitalization(.characters)
                            
                            Button {
                                Task { await redeem() }
                            } label: {
                                HStack {
                                    if isRedeeming {
                                        ProgressView().tint(.white)
                                    } else {
                                        Text("Получить подарок")
                                            .font(.system(size: 16, weight: .semibold))
                                    }
                                }
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .frame(height: 52)
                                .background(redeemCode.isEmpty ? AnyShapeStyle(Color.white.opacity(0.1)) : AnyShapeStyle(Color.primaryGradient))
                                .clipShape(RoundedRectangle(cornerRadius: 14))
                            }
                            .buttonStyle(.plain)
                            .disabled(redeemCode.isEmpty || isRedeeming)
                        }
                        
                        if let errorText {
                            Text(errorText)
                                .font(.system(size: 13))
                                .foregroundColor(.perklyRed)
                        } else if redeemSuccess {
                            Text("Подарок успешно активирован!")
                                .font(.system(size: 13))
                                .foregroundColor(.perklyGreen)
                        }
                    }
                    .padding(20)
                    .perklySurface(cornerRadius: 24)
                    
                    // My Gifts List
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Купленные подарки")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.white)
                        
                        if isLoading && gifts.isEmpty {
                            ProgressView().tint(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 40)
                        } else if gifts.isEmpty {
                            VStack(spacing: 12) {
                                Image(systemName: "gift")
                                    .font(.system(size: 40))
                                    .foregroundColor(.white.opacity(0.2))
                                Text("Вы еще не покупали подарки")
                                    .font(.system(size: 14))
                                    .foregroundColor(.white.opacity(0.4))
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 40)
                        } else {
                            ForEach(gifts) { gift in
                                GiftCodeRow(transaction: gift)
                            }
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 20)
            }
            .refreshable {
                await loadData()
            }
        }
        .navigationTitle("Мои Подарки")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await loadData()
        }
    }
    
    private func loadData() async {
        isLoading = true
        do {
            let res = try await service.list(skip: 0, take: 50)
            // Filter locally to find only gifts
            self.gifts = res.data.filter { $0.isGift == true }
        } catch {
            // Error handling
        }
        isLoading = false
    }
    
    private func redeem() async {
        isRedeeming = true
        errorText = nil
        redeemSuccess = false
        
        do {
            _ = try await service.redeem(code: redeemCode)
            redeemSuccess = true
            redeemCode = ""
            HapticManager.shared.playPurchaseSuccess()
        } catch {
            errorText = error.localizedDescription
            HapticManager.shared.lightImpact()
        }
        isRedeeming = false
    }
}

struct GiftCodeRow: View {
    let transaction: Transaction
    
    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 12) {
                ZStack {
                    RoundedRectangle(cornerRadius: 10)
                        .fill(Color.white.opacity(0.05))
                        .frame(width: 44, height: 44)
                    
                    if let offer = transaction.offer, let url = RemoteImageURL.url(from: offer.safeProductThumbnail) {
                        AsyncImage(url: url) { image in
                            image.resizable().aspectRatio(contentMode: .fit).padding(6)
                        } placeholder: {
                            Image(systemName: "gift.fill").foregroundColor(.perklyOrange)
                        }
                    } else {
                        Image(systemName: "gift.fill")
                            .foregroundColor(.perklyOrange)
                    }
                }
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(transaction.offer?.title ?? "Подарок")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.white)
                        .lineLimit(1)
                    
                    Text(transaction.statusEnum.displayName)
                        .font(.system(size: 12))
                        .foregroundColor(transaction.statusEnum.color == "green" ? .perklyGreen : .white.opacity(0.4))
                }
                
                Spacer()
                
                if let isRedeemed = transaction.isRedeemed, isRedeemed {
                    Text("Использован")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.gray)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.white.opacity(0.1))
                        .clipShape(Capsule())
                }
            }
            .padding(16)
            
            Divider()
                .background(Color.white.opacity(0.1))
            
            HStack {
                Text(transaction.giftCode ?? "В обработке...")
                    .font(.system(size: 14, weight: .bold, design: .monospaced))
                    .foregroundColor(transaction.giftCode != nil ? .white : .white.opacity(0.5))
                
                Spacer()
                
                if let code = transaction.giftCode {
                    ShareLink(item: giftShareText(code: code)) {
                        Image(systemName: "square.and.arrow.up")
                            .font(.system(size: 14))
                            .foregroundColor(.perklyGreen)
                    }
                    .buttonStyle(.plain)

                    Button {
                        UIPasteboard.general.string = code
                        HapticManager.shared.lightImpact()
                    } label: {
                        Image(systemName: "doc.on.doc.fill")
                            .font(.system(size: 14))
                            .foregroundColor(.perklyPurple)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(16)
            .background(Color.black.opacity(0.2))
        }
        .background(Color.white.opacity(0.04))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.white.opacity(0.08), lineWidth: 1)
        )
    }

    private func giftShareText(code: String) -> String {
        """
        Я отправил тебе подарок в Perkly.

        Код подарка: \(code)

        Открой Perkly → Профиль → Мои Подарки → Активировать подарок.
        """
    }
}
