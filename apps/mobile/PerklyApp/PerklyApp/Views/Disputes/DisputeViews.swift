import SwiftUI

struct DisputeListView: View {
    @State private var disputes: [Dispute] = []
    @State private var isLoading = false
    @State private var errorText: String?
    
    private let service = DisputesService.shared
    
    var body: some View {
        ZStack {
            Color.perklyDark.ignoresSafeArea()
            
            if isLoading && disputes.isEmpty {
                PerklyContentStateView(
                    kind: .loading,
                    icon: "",
                    title: "Загружаем споры"
                )
            } else if let errorText {
                PerklyContentStateView(
                    kind: .error,
                    icon: "exclamationmark.triangle.fill",
                    title: "Не удалось загрузить споры",
                    message: errorText,
                    actionTitle: "Повторить"
                ) {
                    Task { await loadData() }
                }
            } else if disputes.isEmpty {
                PerklyContentStateView(
                    kind: .empty,
                    icon: "checkmark.shield.fill",
                    title: "Споров нет",
                    message: "Если по покупке потребуется помощь, обращение появится здесь."
                )
            } else {
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(disputes) { dispute in
                            NavigationLink(destination: DisputeDetailView(dispute: dispute)) {
                                DisputeRow(dispute: dispute)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 20)
                }
                .refreshable {
                    await loadData()
                }
            }
        }
        .navigationTitle("Мои споры")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await loadData()
        }
    }
    
    private func loadData() async {
        isLoading = true
        errorText = nil
        do {
            self.disputes = try await service.list()
        } catch {
            self.errorText = error.localizedDescription
        }
        isLoading = false
    }
}

struct DisputeRow: View {
    let dispute: Dispute
    
    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(statusColor.opacity(0.15))
                    .frame(width: 48, height: 48)
                
                Image(systemName: dispute.statusEnum.icon)
                    .font(.system(size: 20))
                    .foregroundColor(statusColor)
            }
            
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text("Спор по заказу")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.white)
                    Spacer()
                    Text(dispute.statusEnum.displayName)
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(statusColor)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(statusColor.opacity(0.15))
                        .clipShape(Capsule())
                }
                
                Text(dispute.reason)
                    .font(.system(size: 13))
                    .foregroundColor(.white.opacity(0.6))
                    .lineLimit(2)
            }
        }
        .padding(16)
        .background(Color.white.opacity(0.04))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.white.opacity(0.08), lineWidth: 1)
        )
    }
    
    private var statusColor: Color {
        switch dispute.statusEnum {
        case .open: return .perklyOrange
        case .resolved: return .perklyGreen
        case .closed: return .gray
        }
    }
}

struct DisputeDetailView: View {
    @State var dispute: Dispute
    @State private var errorText: String?
    
    private let service = DisputesService.shared
    
    var body: some View {
        ZStack {
            Color.perklyDark.ignoresSafeArea()
            
            ScrollView {
                VStack(spacing: 20) {
                    // Header Status
                    VStack(spacing: 12) {
                        Image(systemName: dispute.statusEnum.icon)
                            .font(.system(size: 40))
                            .foregroundColor(statusColor)
                        
                        Text(dispute.statusEnum.displayName)
                            .font(.system(size: 22, weight: .bold))
                            .foregroundColor(.white)
                        
                        Text("ID: \(dispute.id)")
                            .font(.system(size: 12, design: .monospaced))
                            .foregroundColor(.white.opacity(0.4))
                    }
                    .padding(.vertical, 20)
                    .frame(maxWidth: .infinity)
                    .background(Color.white.opacity(0.04))
                    .clipShape(RoundedRectangle(cornerRadius: 20))
                    
                    // Reason
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Причина")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.white.opacity(0.5))
                        
                        Text(dispute.reason)
                            .font(.system(size: 16))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .padding(16)
                    .background(Color.white.opacity(0.04))
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    
                    // Evidence List
                    if let evidences = dispute.evidenceUrls, !evidences.isEmpty {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Прикрепленные файлы (\(evidences.count))")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(.white.opacity(0.5))
                            
                            ForEach(evidences, id: \.self) { url in
                                HStack {
                                    Image(systemName: "photo.fill")
                                        .foregroundColor(.perklyPurple)
                                    Text(url)
                                        .font(.system(size: 13))
                                        .foregroundColor(.white)
                                        .lineLimit(1)
                                    Spacer()
                                }
                                .padding(12)
                                .background(Color.white.opacity(0.05))
                                .clipShape(RoundedRectangle(cornerRadius: 10))
                            }
                        }
                    }
                    
                    // Add Evidence (if open)
                    if dispute.statusEnum == .open {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Общение и доказательства")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(.white.opacity(0.5))
                            
                            Text("Все обсуждения и отправка доказательств по этому спору происходят в специальном чате.")
                                .font(.system(size: 13))
                                .foregroundColor(.white.opacity(0.7))
                            
                            NavigationLink(destination: ChatListView()) {
                                HStack(spacing: 8) {
                                    Image(systemName: "message.fill")
                                    Text("Перейти к сообщениям")
                                        .font(.system(size: 15, weight: .bold))
                                }
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                                .background(Color.primaryGradient)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                            }
                        }
                        .padding(16)
                        .background(Color.white.opacity(0.04))
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                    }
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 20)
            }
        }
        .navigationTitle("Детали спора")
        .navigationBarTitleDisplayMode(.inline)
    }
    
    private var statusColor: Color {
        switch dispute.statusEnum {
        case .open: return .perklyOrange
        case .resolved: return .perklyGreen
        case .closed: return .gray
        }
    }
}
