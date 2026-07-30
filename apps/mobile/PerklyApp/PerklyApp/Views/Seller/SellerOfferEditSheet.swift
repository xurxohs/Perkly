import SwiftUI
import PhotosUI

struct SellerOfferEditSheet: View {
    let offer: Offer
    var onSave: () -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var title: String
    @State private var description: String
    @State private var priceText: String
    @State private var category: String
    @State private var hiddenData: String
    @State private var fulfillmentType: OfferFulfillmentType
    @State private var vendorLogo: String
    @State private var isActive: Bool
    
    // Image selection state
    @State private var selectedItem: PhotosPickerItem? = nil
    @State private var selectedImageData: Data? = nil
    @State private var isUploadingImage = false
    
    @State private var isLoading = false
    @State private var errorText: String?
    @State private var saved = false

    private let categories = ["RESTAURANTS", "MARKETPLACES", "SUBSCRIPTIONS", "GAMES", "COURSES", "TOURISM", "FITNESS", "COUPONS", "OTHER"]

    init(offer: Offer, onSave: @escaping () -> Void) {
        self.offer = offer
        self.onSave = onSave
        _title = State(initialValue: offer.safeTitle)
        _description = State(initialValue: offer.safeDescription)
        _priceText = State(initialValue: "\(Int(offer.safePrice.rounded()))")
        _category = State(initialValue: offer.safeCategory)
        _hiddenData = State(initialValue: offer.hiddenData ?? "")
        _fulfillmentType = State(initialValue: offer.fulfillment)
        _vendorLogo = State(initialValue: offer.safeProductImage)
        _isActive = State(initialValue: offer.safeIsActive)
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.perklyDark.ignoresSafeArea()

                if saved {
                    VStack(spacing: 16) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 52))
                            .foregroundColor(.perklyGreen)
                        Text("Сохранено")
                            .font(.system(size: 22, weight: .bold))
                            .foregroundColor(.white)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ScrollView {
                        VStack(spacing: 18) {
                            HStack(spacing: 10) {
                                Circle()
                                    .fill(Color.perklyGold.opacity(0.15))
                                    .frame(width: 36, height: 36)
                                    .overlay(
                                        Image(systemName: "tag.fill")
                                            .font(.system(size: 15))
                                            .foregroundColor(.perklyGold)
                                    )
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Оффер: \(offer.id.prefix(8))…")
                                        .font(.system(size: 13, weight: .semibold))
                                        .foregroundColor(.white.opacity(0.7))
                                }
                                Spacer()
                                Toggle("", isOn: $isActive)
                                    .labelsHidden()
                                    .tint(.perklyGreen)
                            }
                            .padding(14)
                            .background(Color.white.opacity(0.04))
                            .clipShape(RoundedRectangle(cornerRadius: 14))

                            if let err = errorText {
                                HStack(spacing: 8) {
                                    Image(systemName: "exclamationmark.triangle.fill")
                                    Text(err)
                                }
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(.perklyRed)
                                .padding(12)
                                .background(Color.perklyRed.opacity(0.1))
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                            }

                            sellerField(label: "Название", prompt: "Название товара/услуги") {
                                TextField("", text: $title)
                            }

                            sellerField(label: "Описание", prompt: nil) {
                                TextEditor(text: $description)
                                    .frame(minHeight: 80)
                                    .scrollContentBackground(.hidden)
                            }

                            sellerField(label: "Цена (UZS)", prompt: "0") {
                                TextField("", text: $priceText)
                                    .keyboardType(.numberPad)
                            }

                            VStack(alignment: .leading, spacing: 8) {
                                Text("Как выдать покупку")
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundColor(.white.opacity(0.55))
                                Menu {
                                    ForEach(OfferFulfillmentType.allCases) { type in
                                        Button(type.displayName) { fulfillmentType = type }
                                    }
                                } label: {
                                    HStack {
                                        Text(fulfillmentType.displayName)
                                        Spacer()
                                        Image(systemName: "chevron.up.chevron.down")
                                    }
                                    .foregroundColor(.white)
                                    .padding(14)
                                    .background(Color.white.opacity(0.06))
                                    .clipShape(RoundedRectangle(cornerRadius: 12))
                                }
                            }

                            sellerField(label: fulfillmentType == .instructions ? "Данные заказа" : "Скрытые данные", prompt: nil) {
                                TextField("", text: $hiddenData)
                            }

                            VStack(alignment: .leading, spacing: 8) {
                                Text("Категория")
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundColor(.white.opacity(0.55))
                                ScrollView(.horizontal, showsIndicators: false) {
                                    HStack(spacing: 8) {
                                        ForEach(categories, id: \.self) { cat in
                                            Button {
                                                category = cat
                                            } label: {
                                                Text(cat)
                                                    .font(.system(size: 12, weight: .bold))
                                                    .foregroundColor(category == cat ? .black : .white.opacity(0.6))
                                                    .padding(.horizontal, 12)
                                                    .padding(.vertical, 7)
                                                    .background(category == cat ? Color.perklyGold : Color.white.opacity(0.07))
                                                    .clipShape(Capsule())
                                            }
                                            .buttonStyle(.plain)
                                        }
                                    }
                                }
                            }

                            VStack(alignment: .leading, spacing: 8) {
                                Text("Логотип (Картинка)")
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundColor(.white.opacity(0.55))
                                
                                HStack(spacing: 12) {
                                    if let selectedImageData, let uiImage = UIImage(data: selectedImageData) {
                                        Image(uiImage: uiImage)
                                            .resizable()
                                            .scaledToFill()
                                            .frame(width: 50, height: 50)
                                            .clipShape(RoundedRectangle(cornerRadius: 10))
                                    } else if !vendorLogo.isEmpty, vendorLogo.starts(with: "http") {
                                        AsyncImage(url: URL(string: vendorLogo)) { image in
                                            image
                                                .resizable()
                                                .scaledToFill()
                                        } placeholder: {
                                            Color.white.opacity(0.1)
                                        }
                                        .frame(width: 50, height: 50)
                                        .clipShape(RoundedRectangle(cornerRadius: 10))
                                    } else {
                                        RoundedRectangle(cornerRadius: 10)
                                            .fill(Color.white.opacity(0.1))
                                            .frame(width: 50, height: 50)
                                            .overlay(
                                                Image(systemName: "photo")
                                                    .foregroundColor(.white.opacity(0.4))
                                            )
                                    }
                                    
                                    PhotosPicker(selection: $selectedItem, matching: .images) {
                                        HStack {
                                            Image(systemName: "square.and.arrow.up")
                                            Text(selectedImageData != nil ? "Изменить фото" : "Выбрать фото")
                                        }
                                        .font(.system(size: 13, weight: .bold))
                                        .foregroundColor(.white)
                                        .padding(.horizontal, 14)
                                        .padding(.vertical, 10)
                                        .background(Color.white.opacity(0.08))
                                        .cornerRadius(10)
                                    }
                                    .onChange(of: selectedItem) { oldValue, newValue in
                                        Task {
                                            if let data = try? await newValue?.loadTransferable(type: Data.self) {
                                                selectedImageData = data
                                            }
                                        }
                                    }
                                }
                                .padding(12)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(Color.white.opacity(0.06))
                                .cornerRadius(12)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(Color.white.opacity(0.1), lineWidth: 1)
                                )
                            }

                            Button {
                                Task { await save() }
                            } label: {
                                HStack {
                                    if isLoading {
                                        ProgressView().tint(.white)
                                    } else {
                                        Text("Сохранить изменения")
                                            .font(.system(size: 16, weight: .bold))
                                    }
                                }
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 16)
                                .background(Color.primaryGradient)
                                .clipShape(RoundedRectangle(cornerRadius: 14))
                            }
                            .buttonStyle(.plain)
                            .disabled(isLoading || title.trimmingCharacters(in: .whitespaces).isEmpty)
                            .padding(.top, 10)
                        }
                        .padding(20)
                        .padding(.bottom, 30)
                    }
                }
            }
            .navigationTitle("Редактировать оффер")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button { dismiss() } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.white.opacity(0.4))
                            .font(.system(size: 22))
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func sellerField<F: View>(label: String, prompt: String?, @ViewBuilder field: () -> F) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(.white.opacity(0.55))
            field()
                .foregroundColor(.white)
                .padding(14)
                .background(Color.white.opacity(0.06))
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.white.opacity(0.1), lineWidth: 1)
                )
        }
    }

    private func save() async {
        isLoading = true
        errorText = nil

        let normalizedPrice = priceText
            .replacingOccurrences(of: " ", with: "")
            .replacingOccurrences(of: "\u{00a0}", with: "")
        guard let price = Int(normalizedPrice), price == 0 || price >= 1_000 else {
            errorText = "Цена должна быть 0 или не меньше 1 000 сум"
            isLoading = false
            return
        }

        var finalLogoURL = vendorLogo
        if let selectedImageData {
            let base64String = selectedImageData.base64EncodedString()
            let base64DataUrl = "data:image/jpeg;base64,\(base64String)"
            do {
                finalLogoURL = try await OffersService.shared.uploadVendorImage(base64DataUrl: base64DataUrl)
            } catch {
                errorText = "Ошибка при загрузке картинки: \(error.localizedDescription)"
                isLoading = false
                return
            }
        }

        do {
            _ = try await OffersService.shared.updateOffer(
                id: offer.id,
                title: title.trimmingCharacters(in: .whitespaces),
                description: description.trimmingCharacters(in: .whitespaces),
                price: price,
                category: category,
                imageURL: finalLogoURL,
                hiddenData: hiddenData,
                isActive: isActive,
                fulfillmentType: fulfillmentType
            )
            saved = true
            HapticManager.shared.playPurchaseSuccess()
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.1) {
                onSave()
                dismiss()
            }
        } catch {
            errorText = error.localizedDescription
        }

        isLoading = false
    }
}
