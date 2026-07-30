import PhotosUI
import SwiftUI
import UIKit

struct NextGenEditProfileView: View {
    let user: User
    let isInitialSetup: Bool
    let onSaved: (User) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var displayName: String
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var previewImage: UIImage?
    @State private var avatarJPEG: Data?
    @State private var removesAvatar = false
    @State private var isImportingPhoto = false
    @State private var isSaving = false
    @State private var errorText: String?

    init(
        user: User,
        isInitialSetup: Bool = false,
        onSaved: @escaping (User) -> Void
    ) {
        self.user = user
        self.isInitialSetup = isInitialSetup
        self.onSaved = onSaved
        _displayName = State(initialValue: user.displayName ?? "")
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.perklyDark.ignoresSafeArea()

                ScrollView(.vertical, showsIndicators: false) {
                    VStack(spacing: 26) {
                        avatarEditor

                        VStack(alignment: .leading, spacing: 10) {
                            Text("Имя в Perkly")
                                .font(.system(size: 13, weight: .bold))
                                .foregroundStyle(Color.perklyTextPrimary.opacity(0.52))

                            TextField("Как вас называть?", text: $displayName)
                                .textInputAutocapitalization(.words)
                                .autocorrectionDisabled(false)
                                .font(.system(size: 18, weight: .semibold))
                                .foregroundStyle(Color.perklyTextPrimary)
                                .padding(.horizontal, 17)
                                .frame(height: 56)
                                .background(Color.perklyOverlay.opacity(0.065))
                                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                                .overlay {
                                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                                        .stroke(Color.perklyOverlay.opacity(0.09), lineWidth: 1)
                                }

                            Text(
                                isInitialSetup
                                    ? "Добавьте имя и, если хотите, фото. Остальное настроите позже."
                                    : "От 2 до 60 символов. Это имя увидят продавцы и участники чатов."
                            )
                                .font(.system(size: 12, weight: .medium))
                                .foregroundStyle(Color.perklyTextPrimary.opacity(0.34))
                        }

                        if let errorText {
                            Label(errorText, systemImage: "exclamationmark.circle.fill")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(Color.perklyOrange)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(15)
                                .background(Color.perklyOrange.opacity(0.1))
                                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                        }

                        Button {
                            Task { await save() }
                        } label: {
                            HStack(spacing: 10) {
                                if isSaving {
                                    ProgressView().tint(.black)
                                }
                                Text(isSaving ? "Сохраняем" : "Сохранить")
                                    .font(.system(size: 16, weight: .bold))
                            }
                            .foregroundStyle(.black)
                            .frame(maxWidth: .infinity)
                            .frame(height: 54)
                            .background(.white, in: Capsule())
                        }
                        .buttonStyle(PerklyPressStyle())
                        .disabled(!canSave || isSaving || isImportingPhoto)
                        .opacity(canSave ? 1 : 0.42)
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 18)
                    .padding(.bottom, 38)
                }
            }
            .navigationTitle(isInitialSetup ? "Ваш профиль" : "Изменить профиль")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                if !isInitialSetup {
                    ToolbarItem(placement: .topBarLeading) {
                        Button("Отмена") { dismiss() }
                            .foregroundStyle(Color.perklyTextPrimary.opacity(0.72))
                    }
                }
            }
            .interactiveDismissDisabled(isInitialSetup || isSaving)
            .onChange(of: selectedPhoto) { _, item in
                guard let item else { return }
                Task { await importPhoto(item) }
            }
        }
    }

    private var avatarEditor: some View {
        VStack(spacing: 17) {
            ZStack {
                Circle()
                    .fill(Color.perklyOverlay.opacity(0.075))

                if let previewImage {
                    Image(uiImage: previewImage)
                        .resizable()
                        .scaledToFill()
                } else if !removesAvatar,
                          let avatarUrl = user.avatarUrl,
                          let url = RemoteImageURL.url(from: avatarUrl) {
                    AsyncImage(url: url) { phase in
                        if case .success(let image) = phase {
                            image.resizable().scaledToFill()
                        } else {
                            initials
                        }
                    }
                } else {
                    initials
                }

                if isImportingPhoto {
                    Circle().fill(.black.opacity(0.52))
                    ProgressView().tint(.white)
                }
            }
            .frame(width: 126, height: 126)
            .clipShape(Circle())
            .overlay {
                Circle().stroke(Color.perklyOverlay.opacity(0.12), lineWidth: 1)
            }

            HStack(spacing: 10) {
                PhotosPicker(selection: $selectedPhoto, matching: .images) {
                    Label("Выбрать фото", systemImage: "photo.on.rectangle.angled")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(Color.perklyTextPrimary)
                        .padding(.horizontal, 16)
                        .frame(height: 44)
                        .perklyGlass(cornerRadius: 15, isInteractive: true)
                }
                .disabled(isSaving || isImportingPhoto)

                if hasAvatar {
                    Button {
                        HapticManager.shared.playSelection()
                        selectedPhoto = nil
                        previewImage = nil
                        avatarJPEG = nil
                        removesAvatar = true
                    } label: {
                        Image(systemName: "trash")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundStyle(Color.perklyRed)
                            .frame(width: 44, height: 44)
                            .background(Color.perklyRed.opacity(0.11))
                            .clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
                    }
                    .buttonStyle(PerklyPressStyle())
                    .accessibilityLabel("Удалить фотографию")
                }
            }

            Text("Фото будет обрезано по центру и оптимизировано для профиля.")
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(Color.perklyTextPrimary.opacity(0.34))
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 24)
        .perklySurface(cornerRadius: 28)
    }

    private var initials: some View {
        Text(initialsText)
            .font(.system(size: 38, weight: .bold))
            .foregroundStyle(Color.perklyTextPrimary.opacity(0.62))
    }

    private var initialsText: String {
        let normalized = displayName.trimmingCharacters(in: .whitespacesAndNewlines)
        let source = normalized.isEmpty ? (user.email ?? "P") : normalized
        let value = source
            .split(separator: " ")
            .prefix(2)
            .compactMap(\.first)
            .map(String.init)
            .joined()
            .uppercased()
        return value.isEmpty ? "P" : value
    }

    private var normalizedName: String {
        displayName
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .split(whereSeparator: \.isWhitespace)
            .joined(separator: " ")
    }

    private var hasAvatar: Bool {
        previewImage != nil || (!removesAvatar && user.avatarUrl?.isEmpty == false)
    }

    private var canSave: Bool {
        (2...60).contains(normalizedName.count) && (isInitialSetup ||
            normalizedName != (user.displayName ?? "") ||
            avatarJPEG != nil ||
            removesAvatar
        )
    }

    private func importPhoto(_ item: PhotosPickerItem) async {
        isImportingPhoto = true
        errorText = nil
        defer { isImportingPhoto = false }

        do {
            guard let data = try await item.loadTransferable(type: Data.self),
                  let image = UIImage(data: data),
                  let normalized = Self.squareJPEG(from: image) else {
                throw APIError.invalidRequestBody
            }
            previewImage = UIImage(data: normalized)
            avatarJPEG = normalized
            removesAvatar = false
            HapticManager.shared.playSelection()
        } catch is CancellationError {
            return
        } catch {
            errorText = "Не удалось обработать фотографию. Выберите другое изображение."
        }
    }

    private func save() async {
        guard canSave else { return }
        isSaving = true
        errorText = nil
        defer { isSaving = false }

        do {
            if let avatarJPEG {
                _ = try await UsersService.shared.uploadAvatar(jpegData: avatarJPEG)
            } else if removesAvatar {
                _ = try await UsersService.shared.removeAvatar()
            }

            let updated = try await UsersService.shared.updateProfile(
                displayName: normalizedName
            )
            onSaved(updated)
            HapticManager.shared.playSuccess()
            dismiss()
        } catch is CancellationError {
            return
        } catch {
            errorText = error.localizedDescription
            HapticManager.shared.playError()
        }
    }

    private static func squareJPEG(from image: UIImage) -> Data? {
        let target = CGSize(width: 1024, height: 1024)
        let scale = max(target.width / image.size.width, target.height / image.size.height)
        let drawnSize = CGSize(
            width: image.size.width * scale,
            height: image.size.height * scale
        )
        let origin = CGPoint(
            x: (target.width - drawnSize.width) / 2,
            y: (target.height - drawnSize.height) / 2
        )
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        format.opaque = true
        let rendered = UIGraphicsImageRenderer(size: target, format: format).image { context in
            UIColor.black.setFill()
            context.fill(CGRect(origin: .zero, size: target))
            image.draw(in: CGRect(origin: origin, size: drawnSize))
        }
        return rendered.jpegData(compressionQuality: 0.84)
    }
}
