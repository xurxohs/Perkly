import SwiftUI
import PhotosUI
import UIKit

struct EditEventSheet: View {
    let event: Event
    let onSuccess: () -> Void
    @Environment(\.dismiss) var dismiss
    
    // Form fields
    @State private var title: String
    @State private var description: String
    @State private var selectedCategory: String
    @State private var eventDate: Date
    @State private var location: String
    @State private var imageUrl: String
    @State private var selectedCoverItem: PhotosPickerItem?
    @State private var selectedCoverData: Data?
    
    @State private var isLoading = false
    @State private var errorText: String?

    init(event: Event, onSuccess: @escaping () -> Void) {
        self.event = event
        self.onSuccess = onSuccess
        
        _title = State(initialValue: event.title)
        _description = State(initialValue: event.description)
        _selectedCategory = State(initialValue: event.category.lowercased())
        _eventDate = State(initialValue: event.eventDate ?? Date())
        _location = State(initialValue: event.location)
        _imageUrl = State(initialValue: event.imageUrl)
    }
    
    let categories = [
        ("concert", "Концерт"),
        ("party", "Вечеринка"),
        ("sport", "Спорт"),
        ("education", "Обучение"),
        ("other", "Другое")
    ]
    
    var body: some View {
        NavigationStack {
            ZStack {
                Color.perklyDark.ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 24) {
                        // Header
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Редактировать")
                                .font(.system(size: 28, weight: .bold))
                                .foregroundColor(.white)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.top, 10)
                        
                        if let err = errorText {
                            HStack {
                                Image(systemName: "exclamationmark.triangle.fill")
                                Text(err)
                            }
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(.perklyRed)
                            .padding()
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.perklyRed.opacity(0.15))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                        
                        // Form
                        VStack(spacing: 20) {
                            inputRow(title: "Название события", text: $title)
                            
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Описание")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(.white.opacity(0.7))
                                
                                TextEditor(text: $description)
                                    .font(.system(size: 16))
                                    .foregroundColor(.white)
                                    .frame(height: 100)
                                    .padding(12)
                                    .background(Color.white.opacity(0.05))
                                    .cornerRadius(12)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12)
                                            .stroke(Color.white.opacity(0.1), lineWidth: 1)
                                    )
                                    .scrollContentBackground(.hidden)
                            }
                            
                            HStack(spacing: 16) {
                                categoryPicker
                                datePicker
                            }
                            
                            inputRow(title: "Локация", text: $location, icon: "mappin.circle.fill")
                            coverPicker
                        }
                        
                        Button(action: {
                            Task { await submit() }
                        }) {
                            HStack {
                                if isLoading {
                                    ProgressView().tint(.white)
                                } else {
                                    Text("Сохранить")
                                        .font(.system(size: 16, weight: .bold))
                                }
                            }
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 54)
                            .background(isFormValid ? AnyShapeStyle(Color.primaryGradient) : AnyShapeStyle(Color.white.opacity(0.1)))
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
            .onChange(of: selectedCoverItem) { _, item in
                Task { await loadCover(from: item) }
            }
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
        !title.isEmpty && !description.isEmpty && !location.isEmpty
    }

    private var coverPicker: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Обложка")
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.white.opacity(0.7))
            PhotosPicker(selection: $selectedCoverItem, matching: .images) {
                HStack(spacing: 12) {
                    Image(systemName: "photo.on.rectangle.angled")
                    Text(selectedCoverData == nil ? "Заменить фотографию" : "Фотография выбрана")
                    Spacer()
                    Image(systemName: "chevron.right")
                }
                .foregroundColor(.white)
                .padding(16)
                .background(Color.white.opacity(0.05))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
    }

    @MainActor
    private func loadCover(from item: PhotosPickerItem?) async {
        guard let item else { return }
        do {
            guard let data = try await item.loadTransferable(type: Data.self),
                  let image = UIImage(data: data),
                  let jpeg = image.jpegData(compressionQuality: 0.86),
                  jpeg.count <= 10 * 1024 * 1024 else {
                errorText = "Выберите JPG, PNG или WebP до 10 МБ"
                return
            }
            selectedCoverData = jpeg
            errorText = nil
        } catch {
            errorText = "Не удалось прочитать фотографию"
        }
    }
    
    private var categoryPicker: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Категория")
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.white.opacity(0.7))
            
            Menu {
                ForEach(categories, id: \.0) { cat in
                    Button(cat.1) { selectedCategory = cat.0 }
                }
            } label: {
                HStack {
                    Text(categories.first(where: { $0.0 == selectedCategory })?.1 ?? "Выберите")
                        .font(.system(size: 14))
                        .foregroundColor(.white)
                    Spacer()
                    Image(systemName: "chevron.down")
                        .font(.system(size: 12))
                        .foregroundColor(.white.opacity(0.4))
                }
                .padding(.horizontal, 16)
                .frame(height: 54)
                .background(Color.white.opacity(0.05))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
    }
    
    private var datePicker: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Дата")
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.white.opacity(0.7))
            
            DatePicker("", selection: $eventDate, displayedComponents: [.date])
                .labelsHidden()
                .frame(height: 54)
                .frame(maxWidth: .infinity)
                .padding(.horizontal, 8)
                .background(Color.white.opacity(0.05))
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .colorScheme(.dark)
        }
    }
    
    private func inputRow(title: String, text: Binding<String>, icon: String? = nil) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.white.opacity(0.7))
            
            HStack {
                if let icon {
                    Image(systemName: icon)
                        .foregroundColor(.white.opacity(0.3))
                }
                TextField("", text: text)
                    .foregroundColor(.white)
            }
            .padding(16)
            .background(Color.white.opacity(0.05))
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.white.opacity(0.1), lineWidth: 1)
            )
        }
    }
    
    private func submit() async {
        isLoading = true
        errorText = nil
        
        do {
            if let selectedCoverData {
                imageUrl = try await EventsService.shared.uploadCover(jpegData: selectedCoverData)
            }
            let isoFormatter = ISO8601DateFormatter()
            let dateString = isoFormatter.string(from: eventDate)
            
            _ = try await EventsService.shared.update(
                event.id,
                title: title,
                description: description,
                category: selectedCategory,
                date: dateString,
                location: location,
                imageUrl: imageUrl
            )
            
            HapticManager.shared.playPurchaseSuccess()
            onSuccess()
            dismiss()
        } catch {
            errorText = "Ошибка сохранения: \(error.localizedDescription)"
            HapticManager.shared.lightImpact()
        }
        
        isLoading = false
    }
}
