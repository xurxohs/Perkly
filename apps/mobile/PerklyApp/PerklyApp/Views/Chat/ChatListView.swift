import SwiftUI

struct ChatListView: View {
    @StateObject private var vm = ChatViewModel()
    @EnvironmentObject var authVM: AuthViewModel
    @State private var selectedScope: ChatRoomScope = .all
    @State private var searchText = ""
    @State private var pinnedRoomIds = Set<String>()
    @State private var hiddenRoomIds = Set<String>()

    private var visibleRooms: [ChatRoom] {
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let filteredRooms = vm.rooms
            .filter { !hiddenRoomIds.contains($0.id) }
            .filter { selectedScope.includes($0) }
            .filter { room in
                guard !query.isEmpty else { return true }
                return searchableText(for: room).lowercased().contains(query)
            }

        return filteredRooms.sorted { left, right in
            let leftPinned = pinnedRoomIds.contains(left.id)
            let rightPinned = pinnedRoomIds.contains(right.id)
            if leftPinned != rightPinned { return leftPinned }
            return (left.lastActivityDate ?? .distantPast) > (right.lastActivityDate ?? .distantPast)
        }
    }

    var body: some View {
        ZStack {
            ChatSurfaceBackground()

            if !authVM.isAuthenticated {
                notLoggedInView
            } else {
                VStack(spacing: 0) {
                    ChatInboxHeader(
                        totalCount: vm.rooms.count,
                        unreadCount: vm.totalUnread,
                        selectedScope: $selectedScope,
                        searchText: $searchText,
                        onRefresh: {
                            Task { await vm.loadRooms() }
                        }
                    )
                    .padding(.horizontal, 20)
                    .padding(.top, 12)
                    .padding(.bottom, 14)

                    content
                }
            }
        }
        .navigationTitle("Сообщения")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .task {
            if authVM.isAuthenticated {
                await vm.loadRooms()
            }
        }
    }

    @ViewBuilder
    private var content: some View {
        if vm.isLoadingRooms && vm.rooms.isEmpty {
            loadingView
        } else if let error = vm.error, vm.rooms.isEmpty {
            errorView(error)
        } else if visibleRooms.isEmpty {
            emptyView
        } else {
            roomsList
        }
    }

    private var notLoggedInView: some View {
        VStack(spacing: 22) {
            Image(systemName: "message.fill")
                .font(.system(size: 58))
                .foregroundStyle(Color.primaryGradient)

            VStack(spacing: 8) {
                Text("Войдите для доступа к чату")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundColor(.perklyTextPrimary)

                Text("Здесь будут диалоги с продавцами, поддержкой и участниками сделок.")
                    .font(.system(size: 14))
                    .foregroundColor(Color.perklyTextPrimary.opacity(0.48))
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(.horizontal, 36)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var loadingView: some View {
        VStack(spacing: 18) {
            ProgressView()
                .tint(.perklyPurple)
                .scaleEffect(1.1)

            Text("Загружаем диалоги")
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(Color.perklyTextPrimary.opacity(0.42))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var emptyView: some View {
        VStack(spacing: 18) {
            Spacer()

            Image(systemName: emptyIcon)
                .font(.system(size: 48))
                .foregroundStyle(Color.primaryGradient)

            VStack(spacing: 6) {
                Text(emptyTitle)
                    .font(.system(size: 21, weight: .bold))
                    .foregroundColor(.perklyTextPrimary)

                Text(emptySubtitle)
                    .font(.system(size: 14))
                    .foregroundColor(Color.perklyTextPrimary.opacity(0.45))
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(.horizontal, 34)

            Spacer()
        }
        .frame(maxWidth: .infinity)
    }

    private var emptyIcon: String {
        if !searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { return "magnifyingglass" }
        return selectedScope == .unread ? "checkmark.bubble.fill" : "bubble.left.and.bubble.right.fill"
    }

    private var emptyTitle: String {
        if !searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { return "Ничего не найдено" }
        if selectedScope == .unread { return "Непрочитанных нет" }
        return "Нет диалогов"
    }

    private var emptySubtitle: String {
        if !searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return "Попробуйте имя, название товара или текст сообщения."
        }
        if selectedScope == .unread { return "Все сообщения уже обработаны." }
        return "Чаты появятся после покупки, спора или обращения к продавцу."
    }

    private func errorView(_ error: String) -> some View {
        VStack(spacing: 14) {
            Image(systemName: "exclamationmark.bubble.fill")
                .font(.system(size: 42))
                .foregroundColor(.perklyOrange)

            Text("Чат временно недоступен")
                .font(.system(size: 19, weight: .bold))
                .foregroundColor(.perklyTextPrimary)

            Text(error)
                .font(.system(size: 13))
                .foregroundColor(Color.perklyTextPrimary.opacity(0.45))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 34)

            Button {
                Task { await vm.loadRooms() }
            } label: {
                Text("Повторить")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.black)
                    .padding(.horizontal, 18)
                    .padding(.vertical, 11)
                    .background(Color.white)
                    .clipShape(Capsule())
            }
            .buttonStyle(.plain)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var roomsList: some View {
        ScrollView(.vertical, showsIndicators: false) {
            LazyVStack(spacing: 8) {
                if vm.error != nil {
                    HStack(spacing: 10) {
                        Image(systemName: "arrow.clockwise.circle.fill")
                            .foregroundColor(.perklyOrange)
                        Text("Не удалось обновить диалоги")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(Color.perklyTextPrimary.opacity(0.7))
                        Spacer()
                        Button("Повторить") {
                            Task { await vm.loadRooms() }
                        }
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.perklyOrange)
                        .frame(minHeight: PerklyDesign.Size.minimumTouchTarget)
                        .buttonStyle(.plain)
                    }
                    .padding(.horizontal, 14)
                    .background(Color.perklyOverlay.opacity(0.05))
                    .clipShape(RoundedRectangle(cornerRadius: PerklyDesign.Radius.control))
                    .accessibilityElement(children: .contain)
                }

                ForEach(visibleRooms) { room in
                    NavigationLink(destination: ChatRoomView(room: room)) {
                        ChatRoomRow(
                            room: room,
                            currentUserId: authVM.user?.id,
                            isPinned: pinnedRoomIds.contains(room.id)
                        )
                    }
                    .buttonStyle(.plain)
                    .contextMenu {
                        Button {
                            togglePinned(room.id)
                        } label: {
                            Label(pinnedRoomIds.contains(room.id) ? "Открепить" : "Закрепить", systemImage: "pin.fill")
                        }

                        if room.unreadCount > 0 {
                            Button {
                                Task {
                                    try? await ChatService.shared.markRoomAsRead(roomId: room.id)
                                    await vm.loadRooms()
                                }
                            } label: {
                                Label("Отметить прочитанным", systemImage: "checkmark.circle")
                            }
                        }

                        Button(role: .destructive) {
                            hiddenRoomIds.insert(room.id)
                        } label: {
                            Label("Скрыть", systemImage: "archivebox")
                        }
                    }
                }
            }
            .padding(.horizontal, 14)
            .padding(.bottom, 18)
        }
        .refreshable {
            await vm.loadRooms()
        }
        .animation(.spring(response: 0.32, dampingFraction: 0.86), value: visibleRooms.count)
    }

    private func togglePinned(_ roomId: String) {
        HapticManager.shared.playSelection()
        if pinnedRoomIds.contains(roomId) {
            pinnedRoomIds.remove(roomId)
        } else {
            pinnedRoomIds.insert(roomId)
        }
    }

    private func searchableText(for room: ChatRoom) -> String {
        let participantText = room.participants?
            .map { [$0.displayName, $0.email].compactMap { $0 }.joined(separator: " ") }
            .joined(separator: " ") ?? ""
        return [
            participantText,
            room.lastMessage?.content,
            room.transactionSummary?.offer?.title,
            room.transactionSummary?.status,
            room.transactionSummary?.roleLabel,
        ]
        .compactMap { $0 }
        .joined(separator: " ")
    }
}

private struct ChatInboxHeader: View {
    let totalCount: Int
    let unreadCount: Int
    @Binding var selectedScope: ChatRoomScope
    @Binding var searchText: String
    let onRefresh: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .bottom) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Чаты")
                        .font(.system(size: 32, weight: .heavy))
                        .foregroundColor(.perklyTextPrimary)

                    Text(totalCount == 0 ? "Диалогов пока нет" : "\(totalCount) диалогов • \(unreadCount) новых")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(Color.perklyTextPrimary.opacity(0.45))
                }

                Spacer()

                Button {
                    HapticManager.shared.lightImpact()
                    onRefresh()
                } label: {
                    Image(systemName: "arrow.clockwise")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(Color.perklyTextPrimary.opacity(0.72))
                        .frame(width: 44, height: 44)
                        .background(Color.perklyOverlay.opacity(0.07))
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                        .overlay(
                            RoundedRectangle(cornerRadius: 16)
                                .stroke(Color.perklyOverlay.opacity(0.08), lineWidth: 1)
                        )
                }
                .buttonStyle(.plain)
            }

            ChatSearchField(text: $searchText)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(ChatRoomScope.allCases) { scope in
                        ChatFilterPill(
                            title: scope.title,
                            count: scope == .unread ? unreadCount : nil,
                            isSelected: selectedScope == scope
                        ) {
                            withAnimation(.spring(response: 0.28, dampingFraction: 0.86)) {
                                selectedScope = scope
                            }
                            HapticManager.shared.playSelection()
                        }
                    }
                }
            }
        }
    }
}

private enum ChatRoomScope: String, CaseIterable, Identifiable {
    case all
    case purchases
    case sales
    case disputes
    case unread
    case support

    var id: String { rawValue }

    var title: String {
        switch self {
        case .all: return "Все"
        case .purchases: return "Покупки"
        case .sales: return "Продажи"
        case .disputes: return "Споры"
        case .unread: return "Новые"
        case .support: return "Поддержка"
        }
    }

    func includes(_ room: ChatRoom) -> Bool {
        switch self {
        case .all:
            return true
        case .purchases:
            return room.transactionSummary?.roleForUser == "BUYER"
        case .sales:
            return room.transactionSummary?.roleForUser == "SELLER"
        case .disputes:
            return room.isDispute
        case .unread:
            return room.unreadCount > 0
        case .support:
            return room.isSupport
        }
    }
}

private struct ChatSearchField: View {
    @Binding var text: String

    var body: some View {
        HStack(spacing: 9) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(Color.perklyTextPrimary.opacity(0.44))

            TextField("Поиск по чату, сделке или сообщению", text: $text)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.perklyTextPrimary)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()

            if !text.isEmpty {
                Button {
                    text = ""
                    HapticManager.shared.playSelection()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(Color.perklyTextPrimary.opacity(0.34))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 13)
        .padding(.vertical, 11)
        .background(Color.perklyOverlay.opacity(0.065))
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(Color.perklyOverlay.opacity(0.075), lineWidth: 1)
        )
    }
}

private struct ChatFilterPill: View {
    let title: String
    var count: Int? = nil
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Text(title)
                if let count, count > 0 {
                    Text("\(count)")
                        .font(.system(size: 10, weight: .black))
                        .foregroundColor(isSelected ? .black : .white)
                        .frame(minWidth: 18, minHeight: 18)
                        .background(isSelected ? Color.perklyOverlay.opacity(0.75) : Color.perklyPurple)
                        .clipShape(Circle())
                }
            }
            .font(.system(size: 13, weight: .bold))
            .foregroundColor(isSelected ? .black : .white.opacity(0.62))
            .padding(.horizontal, 13)
            .padding(.vertical, 9)
            .background(isSelected ? AnyShapeStyle(Color.white) : AnyShapeStyle(Color.perklyOverlay.opacity(0.07)))
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }
}

struct ChatRoomRow: View {
    let room: ChatRoom
    let currentUserId: String?
    var isPinned = false

    var body: some View {
        HStack(spacing: 13) {
            ChatAvatar(user: otherUser, size: 58, showsStatus: hasRecentActivity)

            VStack(alignment: .leading, spacing: 7) {
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text(otherName)
                        .font(.system(size: 16, weight: room.unreadCount > 0 ? .bold : .semibold))
                        .foregroundColor(.perklyTextPrimary)
                        .lineLimit(1)

                    if let badgeTitle {
                        Text(badgeTitle)
                            .font(.system(size: 10, weight: .black))
                            .foregroundColor(badgeColor)
                            .padding(.horizontal, 7)
                            .padding(.vertical, 3)
                            .background(badgeColor.opacity(0.12))
                            .clipShape(Capsule())
                    }

                    if isPinned {
                        Image(systemName: "pin.fill")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(Color.perklyTextPrimary.opacity(0.38))
                    }

                    Spacer(minLength: 8)

                    if let lastMsg = room.lastMessage {
                        Text(lastMsg.relativeTimeString)
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(Color.perklyTextPrimary.opacity(room.unreadCount > 0 ? 0.7 : 0.32))
                    }
                }

                HStack(alignment: .center, spacing: 10) {
                    Text(previewText)
                        .font(.system(size: 14, weight: room.unreadCount > 0 ? .semibold : .regular))
                        .foregroundColor(room.unreadCount > 0 ? .white.opacity(0.78) : .white.opacity(0.42))
                        .lineLimit(2)

                    Spacer(minLength: 6)

                    if room.unreadCount > 0 {
                        Text("\(room.unreadCount)")
                            .font(.system(size: 11, weight: .black))
                            .foregroundColor(.perklyTextPrimary)
                            .frame(minWidth: 22, minHeight: 22)
                            .background(Color.primaryGradient)
                            .clipShape(Circle())
                            .transition(.scale.combined(with: .opacity))
                    }
                }
            }
        }
        .padding(.horizontal, 13)
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: 22)
                .fill(room.unreadCount > 0 ? Color.perklyOverlay.opacity(0.075) : Color.perklyOverlay.opacity(0.035))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 22)
                .stroke(room.unreadCount > 0 ? Color.perklyPurple.opacity(0.22) : Color.perklyOverlay.opacity(0.055), lineWidth: 1)
        )
        .contentShape(RoundedRectangle(cornerRadius: 22))
    }

    private var otherUser: User? {
        room.participants?.first(where: { $0.id != currentUserId })
    }

    private var otherName: String {
        otherUser?.displayName ?? otherUser?.email ?? "Собеседник"
    }

    private var previewText: String {
        guard let lastMessage = room.lastMessage else {
            if let title = room.transactionSummary?.offer?.title {
                return "\(room.transactionSummary?.roleLabel ?? "Сделка"): \(title)"
            }
            return "Нет сообщений"
        }
        let prefix = lastMessage.senderId == currentUserId ? "Вы: " : ""
        return prefix + lastMessage.content
    }

    private var hasRecentActivity: Bool {
        guard let date = room.lastActivityDate else { return false }
        return Date().timeIntervalSince(date) < 3600
    }

    private var badgeTitle: String? {
        if room.isDispute { return "спор" }
        if room.isSupport { return "support" }
        switch room.transactionSummary?.roleForUser {
        case "BUYER": return "покупка"
        case "SELLER": return "продажа"
        default: return nil
        }
    }

    private var badgeColor: Color {
        if room.isDispute { return .perklyOrange }
        if room.isSupport { return .perklyCyan }
        if room.transactionSummary?.roleForUser == "SELLER" { return .perklyGreen }
        return .perklyPurple
    }
}

struct ChatAvatar: View {
    let user: User?
    var size: CGFloat = 44
    var showsStatus = false

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            ZStack {
                Circle()
                    .fill(Color.primaryGradient)

                if let avatarUrl = user?.avatarUrl, let url = RemoteImageURL.url(from: avatarUrl) {
                    AsyncImage(url: url) { image in
                        image.resizable().aspectRatio(contentMode: .fill)
                    } placeholder: {
                        initialsView
                    }
                    .clipShape(Circle())
                } else {
                    initialsView
                }
            }
            .frame(width: size, height: size)
            .overlay(
                Circle()
                    .stroke(Color.perklyOverlay.opacity(0.12), lineWidth: 1)
            )

            if showsStatus {
                Circle()
                    .fill(Color.perklyGreen)
                    .frame(width: max(11, size * 0.22), height: max(11, size * 0.22))
                    .overlay(Circle().stroke(Color.perklyDark, lineWidth: 2))
            }
        }
    }

    private var initialsView: some View {
        Text(String((user?.displayName ?? user?.email ?? "P").prefix(1)).uppercased())
            .font(.system(size: size * 0.38, weight: .heavy))
            .foregroundColor(.perklyTextPrimary)
    }
}

struct ChatSurfaceBackground: View {
    var body: some View {
        ZStack {
            Color.perklyDark.ignoresSafeArea()
            LinearGradient(
                colors: [
                    Color(red: 8/255, green: 13/255, blue: 20/255),
                    Color.perklyDark,
                    Color.black.opacity(0.96)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack {
                LinearGradient(
                    colors: [Color.perklyPurple.opacity(0.14), Color.perklyCyan.opacity(0.08), Color.clear],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .frame(height: 220)
                .blur(radius: 24)
                Spacer()
            }
            .ignoresSafeArea()
        }
    }
}
