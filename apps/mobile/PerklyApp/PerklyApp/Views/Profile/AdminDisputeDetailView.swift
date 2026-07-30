import SwiftUI

// MARK: - Admin Dispute Detail & Resolve Flow
// Full resolve flow for PATCH /admin/disputes/:id/resolve

struct AdminDisputeDetailView: View {
    let dispute: Dispute
    var onResolved: () -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var adminNote = ""
    @State private var selectedResolution: AdminDisputeResolution?
    @State private var isLoading = false
    @State private var errorText: String?
    @State private var resolvedSuccess = false

    private let service = AdminService.shared

    var body: some View {
        NavigationStack {
            ZStack {
                Color.perklyDark.ignoresSafeArea()

                if resolvedSuccess {
                    successView
                } else {
                    ScrollView(.vertical, showsIndicators: false) {
                        VStack(spacing: 16) {
                            statusHeader
                            partiesCard
                            evidenceCard
                            if dispute.statusEnum == .open {
                                resolveSection
                            }
                        }
                        .padding(20)
                        .padding(.bottom, 40)
                    }
                }
            }
            .navigationTitle("Спор #\(String(dispute.id.prefix(8)))")
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

    // MARK: Sub-views

    private var successView: some View {
        VStack(spacing: 20) {
            Spacer()
            Image(systemName: "checkmark.seal.fill")
                .font(.system(size: 60))
                .foregroundColor(.perklyGreen)
            Text("Спор закрыт")
                .font(.system(size: 24, weight: .bold))
                .foregroundColor(.white)
            if let res = selectedResolution {
                Text(res.title)
                    .font(.system(size: 15))
                    .foregroundColor(.white.opacity(0.5))
            }
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var statusHeader: some View {
        HStack(spacing: 14) {
            ZStack {
                Circle()
                    .fill(statusColor.opacity(0.15))
                    .frame(width: 52, height: 52)
                Image(systemName: dispute.statusEnum.icon)
                    .font(.system(size: 22, weight: .bold))
                    .foregroundColor(statusColor)
            }
            VStack(alignment: .leading, spacing: 5) {
                Text(dispute.transaction?.offer?.safeTitle ?? "Спор по сделке")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.white)
                    .lineLimit(2)
                Text(dispute.reason)
                    .font(.system(size: 13))
                    .foregroundColor(.white.opacity(0.5))
                    .lineLimit(3)
            }
            Spacer()
            Text(dispute.statusEnum.displayName)
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(statusColor)
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(statusColor.opacity(0.15))
                .clipShape(Capsule())
        }
        .padding(16)
        .background(Color.white.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: 18))
    }

    private var partiesCard: some View {
        VStack(spacing: 0) {
            detailRow(
                icon: "person.fill",
                label: "Покупатель",
                value: dispute.transaction?.buyer?.displayName
                    ?? dispute.transaction?.buyer?.email
                    ?? dispute.transaction?.buyerId
                    ?? "—",
                color: .perklyCyan
            )
            Divider().background(Color.white.opacity(0.06))
            detailRow(
                icon: "storefront.fill",
                label: "Продавец",
                value: dispute.transaction?.offer?.seller?.displayName
                    ?? dispute.transaction?.offer?.seller?.email
                    ?? "—",
                color: .perklyPurple
            )
            Divider().background(Color.white.opacity(0.06))
            detailRow(
                icon: "banknote.fill",
                label: "Сумма сделки",
                value: "\(uzs(dispute.transaction?.price ?? 0))",
                color: .perklyGreen
            )
            if let createdAt = dispute.createdAt {
                Divider().background(Color.white.opacity(0.06))
                detailRow(icon: "calendar", label: "Открыт", value: formatDate(createdAt), color: .white.opacity(0.4))
            }
        }
        .background(Color.white.opacity(0.04))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    @ViewBuilder
    private var evidenceCard: some View {
        if let urls = dispute.evidenceUrls, !urls.isEmpty {
            VStack(alignment: .leading, spacing: 12) {
                Label("Доказательства (\(urls.count))", systemImage: "photo.stack.fill")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.white.opacity(0.6))

                ForEach(Array(urls.enumerated()), id: \.offset) { idx, url in
                    HStack(spacing: 10) {
                        Image(systemName: "link")
                            .font(.system(size: 12))
                            .foregroundColor(.perklyCyan)
                        Text(url)
                            .font(.system(size: 12))
                            .foregroundColor(.perklyCyan)
                            .lineLimit(1)
                            .truncationMode(.middle)
                        Spacer()
                        Button {
                            if let u = URL(string: url) { UIApplication.shared.open(u) }
                        } label: {
                            Image(systemName: "arrow.up.right.square")
                                .font(.system(size: 14))
                                .foregroundColor(.perklyCyan.opacity(0.7))
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(10)
                    .background(Color.perklyCyan.opacity(0.06))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }
            }
            .padding(16)
            .background(Color.white.opacity(0.04))
            .clipShape(RoundedRectangle(cornerRadius: 16))
        }
    }

    private var resolveSection: some View {
        VStack(spacing: 14) {
            HStack {
                Image(systemName: "hammer.fill")
                    .foregroundColor(.perklyOrange)
                Text("Вынести решение")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(.white)
                Spacer()
            }

            if let err = errorText {
                HStack(spacing: 8) {
                    Image(systemName: "exclamationmark.triangle.fill")
                    Text(err)
                }
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(.perklyRed)
                .padding(10)
                .background(Color.perklyRed.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }

            // Note field
            VStack(alignment: .leading, spacing: 8) {
                Text("Примечание администратора (необязательно)")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.white.opacity(0.45))
                TextField("Причина решения...", text: $adminNote, axis: .vertical)
                    .lineLimit(3...5)
                    .foregroundColor(.white)
                    .padding(12)
                    .background(Color.white.opacity(0.06))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }

            // Resolution buttons
            HStack(spacing: 12) {
                resolveButton(
                    title: "В пользу покупателя",
                    subtitle: "Деньги возвращаются покупателю",
                    icon: "person.fill.checkmark",
                    color: .perklyGreen,
                    resolution: .buyer
                )
                resolveButton(
                    title: "В пользу продавца",
                    subtitle: "Продавец получает оплату",
                    icon: "storefront.fill",
                    color: .perklyPurple,
                    resolution: .seller
                )
            }
        }
        .padding(16)
        .background(Color.perklyOrange.opacity(0.06))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(Color.perklyOrange.opacity(0.2), lineWidth: 1))
        .clipShape(RoundedRectangle(cornerRadius: 18))
    }

    private func resolveButton(title: String, subtitle: String, icon: String, color: Color, resolution: AdminDisputeResolution) -> some View {
        Button {
            Task { await resolve(resolution) }
        } label: {
            VStack(spacing: 8) {
                if isLoading && selectedResolution == resolution {
                    ProgressView().tint(color)
                } else {
                    Image(systemName: icon)
                        .font(.system(size: 20, weight: .bold))
                        .foregroundColor(color)
                    Text(title)
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.white)
                        .multilineTextAlignment(.center)
                    Text(subtitle)
                        .font(.system(size: 10))
                        .foregroundColor(.white.opacity(0.4))
                        .multilineTextAlignment(.center)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(color.opacity(0.12))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(color.opacity(0.3), lineWidth: 1))
            .clipShape(RoundedRectangle(cornerRadius: 14))
        }
        .buttonStyle(.plain)
        .disabled(isLoading)
    }

    // MARK: Helpers

    private func detailRow(icon: String, label: String, value: String, color: Color) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundColor(color)
                .frame(width: 20)
            Text(label)
                .font(.system(size: 13))
                .foregroundColor(.white.opacity(0.45))
            Spacer()
            Text(value)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(.white)
                .lineLimit(1)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
    }

    private var statusColor: Color {
        switch dispute.statusEnum {
        case .open: return .perklyOrange
        case .resolved: return .perklyGreen
        case .closed: return .white.opacity(0.4)
        }
    }

    private func formatDate(_ iso: String) -> String {
        let fmtFrac = ISO8601DateFormatter()
        fmtFrac.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let fmt = ISO8601DateFormatter()
        guard let date = fmtFrac.date(from: iso) ?? fmt.date(from: iso) else { return iso }
        let out = DateFormatter()
        out.locale = L10n.locale
        out.dateFormat = "d MMM yyyy, HH:mm"
        return out.string(from: date)
    }

    private func resolve(_ resolution: AdminDisputeResolution) async {
        isLoading = true
        selectedResolution = resolution
        errorText = nil

        do {
            let note = adminNote.trimmingCharacters(in: .whitespacesAndNewlines)
            _ = try await service.resolveDispute(
                dispute,
                resolution: resolution,
                adminNote: note.isEmpty ? nil : note
            )
            resolvedSuccess = true
            HapticManager.shared.playPurchaseSuccess()
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.4) {
                onResolved()
                dismiss()
            }
        } catch {
            errorText = error.localizedDescription
        }

        isLoading = false
    }
}
