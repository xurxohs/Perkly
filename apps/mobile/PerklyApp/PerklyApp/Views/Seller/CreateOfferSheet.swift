import SwiftUI
import PhotosUI

struct CreateOfferSheet: View {
    let onSuccess: () -> Void
    @Environment(\.dismiss) var dismiss
    
    // Form fields
    @State private var title: String = ""
    @State private var description: String = ""
    @State private var hiddenData: String = ""
    @State private var usageInstructions: String = ""
    @State private var priceString: String = ""
    @State private var periodDaysString: String = ""
    @State private var selectedCategory: String = Constants.Category.marketplaces.rawValue
    @State private var fulfillmentType: OfferFulfillmentType = .instructions
    @State private var vendorLogoURL: String = ""
    
    // Image selection state
    @State private var selectedItem: PhotosPickerItem? = nil
    @State private var selectedImageData: Data? = nil
    @State private var isUploadingImage = false
    
    @State private var isLoading = false
    @State private var errorText: String?
    
    private let categories = Constants.Category.allCases
    
    var body: some View {
        NavigationStack {
            ZStack {
                Color.perklyDark.ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 24) {
                        // Header
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Создать товар")
                                .font(.system(size: 28, weight: .bold))
                                .foregroundColor(.white)
                            Text("Заполните информацию о вашем новом предложении")
                                .font(.system(size: 15))
                                .foregroundColor(.white.opacity(0.6))
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.top, 10)
                        
                        if let err = errorText {
                            HStack {
                                Image(systemName: "exclamationmark.triangle.fill")
                                Text(err)
                            }

                            VStack(alignment: .leading, spacing: 8) {
                                Text("Как выдать покупку")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(.white.opacity(0.7))

                                Menu {
                                    ForEach(OfferFulfillmentType.allCases) { type in
                                        Button(type.displayName) { fulfillmentType = type }
                                    }
                                } label: {
                                    HStack {
                                        Text(fulfillmentType.displayName)
                                            .foregroundColor(.white)
                                        Spacer()
                                        Image(systemName: "chevron.up.chevron.down")
                                            .foregroundColor(.white.opacity(0.5))
                                    }
                                    .padding(16)
                                    .background(Color.white.opacity(0.05))
                                    .clipShape(RoundedRectangle(cornerRadius: 12))
                                    .overlay {
                                        RoundedRectangle(cornerRadius: 12)
                                            .stroke(Color.white.opacity(0.1), lineWidth: 1)
                                    }
                                }
                            }
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(.perklyRed)
                            .padding()
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.perklyRed.opacity(0.15))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                        
                        // Form
                        VStack(spacing: 16) {
                            inputRow(title: "Название", text: $title)

                            multilineInputRow(
                                title: "Описание",
                                text: $description,
                                height: 100
                            )
                            
                            HStack(spacing: 16) {
                                inputRow(title: "Цена (UZS)", text: $priceString, keyboardType: .numberPad)
                                inputRow(title: "Срок (дней)", text: $periodDaysString, keyboardType: .numberPad)
                            }
                            
                            // Category Picker
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Категория")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(.white.opacity(0.7))
                                
                                Menu {
                                    ForEach(categories, id: \.rawValue) { cat in
                                        Button(cat.displayName) { selectedCategory = cat.rawValue }
                                    }
                                } label: {
                                    HStack {
                                        Text(categories.first(where: { $0.rawValue == selectedCategory })?.displayName ?? "Выберите")
                                            .foregroundColor(.white)
                                        Spacer()
                                        Image(systemName: "chevron.up.chevron.down")
                                            .foregroundColor(.white.opacity(0.5))
                                            .font(.system(size: 14))
                                    }
                                    .padding(16)
                                    .background(Color.white.opacity(0.05))
                                    .clipShape(RoundedRectangle(cornerRadius: 12))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12)
                                            .stroke(Color.white.opacity(0.1), lineWidth: 1)
                                    )
                                }
                            }
                            
                            multilineInputRow(
                                title: fulfillmentType == .instructions ? "Данные заказа" : "Данные после покупки",
                                text: $hiddenData,
                                height: 88,
                                prompt: fulfillmentPrompt
                            )

                            multilineInputRow(
                                title: "Инструкция по использованию",
                                text: $usageInstructions,
                                height: 88,
                                prompt: "Опционально"
                            )
                            
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Логотип (Картинка)")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(.white.opacity(0.7))
                                
                                HStack(spacing: 12) {
                                    if let selectedImageData, let uiImage = UIImage(data: selectedImageData) {
                                        Image(uiImage: uiImage)
                                            .resizable()
                                            .scaledToFill()
                                            .frame(width: 50, height: 50)
                                            .clipShape(RoundedRectangle(cornerRadius: 10))
                                    } else if !vendorLogoURL.isEmpty, vendorLogoURL.starts(with: "http") {
                                        AsyncImage(url: URL(string: vendorLogoURL)) { image in
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
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundColor(.white)
                                        .padding(.horizontal, 14)
                                        .padding(.vertical, 10)
                                        .background(Color.white.opacity(0.1))
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
                                .background(Color.white.opacity(0.05))
                                .cornerRadius(12)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(Color.white.opacity(0.1), lineWidth: 1)
                                )
                            }
                        }
                        
                        Button(action: {
                            Task { await submit() }
                        }) {
                            HStack {
                                if isLoading {
                                    ProgressView().tint(.white)
                                } else {
                                    Text("Опубликовать")
                                        .font(.system(size: 16, weight: .bold))
                                }
                            }
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 54)
                            .background(isFormValid ? AnyShapeStyle(Color.primaryGradient) : AnyShapeStyle(Color.white.opacity(0.2)))
                            .clipShape(RoundedRectangle(cornerRadius: 16))
                        }
                        .buttonStyle(.plain)
                        .disabled(!isFormValid || isLoading)
                        .padding(.top, 10)
                        
                        Spacer()
                    }
                    .padding(24)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { dismiss() }) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.white.opacity(0.5))
                            .font(.system(size: 24))
                    }
                }
            }
        }
    }
    
    private var isFormValid: Bool {
        !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        !description.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        !hiddenData.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        validPrice != nil &&
        (
            periodDaysString.isEmpty ||
            ((Int(periodDaysString) ?? -1) >= 0)
        )
    }

    private var validPrice: Int? {
        let normalized = priceString
            .replacingOccurrences(of: " ", with: "")
            .replacingOccurrences(of: "\u{00a0}", with: "")
        guard let price = Int(normalized), price == 0 || price >= 1_000 else {
            return nil
        }
        return price
    }
    
    private func inputRow(title: String, text: Binding<String>, keyboardType: UIKeyboardType = .default) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.white.opacity(0.7))
            
            TextField("", text: text)
                .keyboardType(keyboardType)
                .font(.system(size: 16))
                .foregroundColor(.white)
                .padding(16)
                .background(Color.white.opacity(0.05))
                .cornerRadius(12)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.white.opacity(0.1), lineWidth: 1)
                )
        }
    }

    private func multilineInputRow(
        title: String,
        text: Binding<String>,
        height: CGFloat,
        prompt: String? = nil
    ) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.white.opacity(0.7))
                .frame(maxWidth: .infinity, alignment: .leading)

            ZStack(alignment: .topLeading) {
                if let prompt, text.wrappedValue.isEmpty {
                    Text(prompt)
                        .font(.system(size: 15))
                        .foregroundColor(.white.opacity(0.25))
                        .padding(.horizontal, 16)
                        .padding(.vertical, 18)
                }

                TextEditor(text: text)
                    .font(.system(size: 16))
                    .foregroundColor(.white)
                    .frame(height: height)
                    .padding(12)
                    .background(Color.white.opacity(0.05))
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.white.opacity(0.1), lineWidth: 1)
                    )
                    .scrollContentBackground(.hidden)
            }
        }
    }
    
    private func submit() async {
        guard let price = validPrice else {
            errorText = "Цена должна быть 0 или не меньше 1 000 сум"
            return
        }

        let trimmedHiddenData = hiddenData.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmedHiddenData.isEmpty {
            errorText = "Укажите данные, которые покупатель получит после покупки"
            return
        }

        let periodDays: Int?
        if periodDaysString.isEmpty {
            periodDays = nil
        } else if let parsedPeriod = Int(periodDaysString), parsedPeriod >= 0 {
            periodDays = parsedPeriod == 0 ? nil : parsedPeriod
        } else {
            errorText = "Срок действия не может быть отрицательным"
            return
        }
        
        isLoading = true
        errorText = nil
        
        var finalLogoURL = vendorLogoURL
        
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
            _ = try await OffersService.shared.createVendorOffer(
                title: title,
                description: description,
                price: price,
                category: selectedCategory,
                imageURL: finalLogoURL,
                hiddenData: trimmedHiddenData,
                fulfillmentType: fulfillmentType,
                usageInstructions: usageInstructions.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                    ? nil
                    : usageInstructions.trimmingCharacters(in: .whitespacesAndNewlines),
                periodDays: periodDays
            )
            
            // Analytics
            AnalyticsService.shared.trackEvent(eventType: "vendor_offer_create_success", metadata: "title: \(title)")
            
            HapticManager.shared.playPurchaseSuccess()
            onSuccess()
            dismiss()
        } catch {
            errorText = "Ошибка: \(error.localizedDescription)"
            HapticManager.shared.lightImpact()
        }
        
        isLoading = false
    }

    private var fulfillmentPrompt: String {
        switch fulfillmentType {
        case .promocode: return "Промокод, который получит покупатель"
        case .digitalCode: return "Лицензионный или цифровой код"
        case .link: return "Ссылка, которая откроется после покупки"
        case .instructions: return "Номер заказа, место получения или другие данные"
        }
    }
}
