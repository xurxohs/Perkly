import SwiftUI

// MARK: - Admin Offer Edit Sheet
// Full editor for PATCH /admin/offers/:id

struct AdminOfferEditSheet: View {
    let offer: Offer
    var onSave: () -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var title: String
    @State private var description: String
    @State private var priceText: String
    @State private var discountText: String
    @State private var category: String
    @State private var isActive: Bool
    @State private var isLoading = false
    @State private var errorText: String?
    @State private var saved = false

    private let service = AdminService.shared
    private let categories = ["RESTAURANTS", "MARKETPLACES", "SUBSCRIPTIONS", "GAMES", "COURSES", "FITNESS", "OTHER"]

    init(offer: Offer, onSave: @escaping () -> Void) {
        self.offer = offer
        self.onSave = onSave
        _title = State(initialValue: offer.safeTitle)
        _description = State(initialValue: offer.safeDescription)
        _priceText = State(initialValue: "\(Int(offer.safePrice.rounded()))")
        _discountText = State(initialValue: "\(offer.discountPercent ?? 0)")
        _category = State(initialValue: offer.safeCategory)
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
                            // Seller badge
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
                                    Text("ID: \(offer.id.prefix(12))…")
                                        .font(.system(size: 11, design: .monospaced))
                                        .foregroundColor(.white.opacity(0.4))
                                    Text(offer.seller?.displayName ?? offer.seller?.email ?? "Продавец неизвестен")
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

                            adminField(label: "Название", prompt: "Введите название") {
                                TextField("", text: $title)
                                    .foregroundColor(.white)
                            }

                            adminField(label: "Описание", prompt: nil) {
                                TextEditor(text: $description)
                                    .foregroundColor(.white)
                                    .frame(minHeight: 80)
                                    .scrollContentBackground(.hidden)
                            }

                            HStack(spacing: 12) {
                                adminField(label: "Цена (UZS)", prompt: "0") {
                                    TextField("", text: $priceText)
                                        .keyboardType(.numberPad)
                                        .foregroundColor(.white)
                                }
                                adminField(label: "Скидка (%)", prompt: "0") {
                                    TextField("", text: $discountText)
                                        .keyboardType(.numberPad)
                                        .foregroundColor(.white)
                                }
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

                            Button {
                                Task { await save() }
                            } label: {
                                HStack {
                                    if isLoading {
                                        ProgressView().tint(.black)
                                    } else {
                                        Text("Сохранить изменения")
                                            .font(.system(size: 16, weight: .bold))
                                    }
                                }
                                .foregroundColor(.black)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 16)
                                .background(Color.perklyGold)
                                .clipShape(RoundedRectangle(cornerRadius: 14))
                            }
                            .buttonStyle(.plain)
                            .disabled(isLoading || title.trimmingCharacters(in: .whitespaces).isEmpty)
                            .padding(.top, 4)
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
    private func adminField<F: View>(label: String, prompt: String?, @ViewBuilder field: () -> F) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(.white.opacity(0.55))
            field()
                .padding(14)
                .background(Color.white.opacity(0.06))
                .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }

    private func save() async {
        isLoading = true
        errorText = nil

        let normalizedTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        let normalizedDescription = description.trimmingCharacters(in: .whitespacesAndNewlines)
        let normalizedPrice = priceText
            .replacingOccurrences(of: " ", with: "")
            .replacingOccurrences(of: "\u{00a0}", with: "")
        guard let price = Int(normalizedPrice), price >= 0 else {
            errorText = "Цена должна быть целой суммой в UZS"
            isLoading = false
            return
        }
        guard let discount = Int(discountText), (0...100).contains(discount) else {
            errorText = "Скидка должна быть от 0 до 100%"
            isLoading = false
            return
        }

        do {
            _ = try await service.updateOffer(
                id: offer.id,
                title: normalizedTitle,
                description: normalizedDescription,
                price: price,
                discountPercent: discount,
                category: category,
                isActive: isActive
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
