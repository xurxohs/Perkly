import SwiftUI

struct ChatRoomView: View {
    let room: ChatRoom
    @StateObject private var vm = ChatViewModel()
    @EnvironmentObject var authVM: AuthViewModel
    @Environment(\.dismiss) private var dismiss
    @FocusState private var isInputFocused: Bool
    @State private var moderationAction: ChatModerationAction?
    @State private var moderationMessage: String?
    @State private var isModerating = false

    var body: some View {
        ZStack {
            ChatSurfaceBackground()

            ScrollViewReader { proxy in
                ScrollView(.vertical, showsIndicators: false) {
                    LazyVStack(spacing: 6) {
                        if vm.isLoadingMessages && vm.messages.isEmpty {
                            ChatLoadingMessagesView()
                                .padding(.top, 40)
                        }

                        if let error = vm.error, vm.messages.isEmpty {
                            ChatInlineError(text: error) {
                                Task { await vm.loadMessages(roomId: room.id) }
                            }
                            .padding(.top, 24)
                        }

                        if !vm.isLoadingMessages && vm.messages.isEmpty && vm.error == nil {
                            ChatRoomEmptyState()
                                .padding(.top, 52)
                        }

                        if let transactionSummary = room.transactionSummary {
                            ChatDealContextCard(
                                summary: transactionSummary,
                                roomStatus: room.roomStatus ?? room.type
                            )
                            .padding(.bottom, 8)
                        }

                        ForEach(Array(vm.messages.enumerated()), id: \.element.id) { index, message in
                            if shouldShowDayHeader(at: index) {
                                ChatDayDivider(text: message.dayLabel)
                                    .padding(.vertical, 8)
                            }

                            MessageBubble(
                                message: message,
                                isOwnMessage: message.senderId == authVM.user?.id,
                                showTail: shouldShowTail(at: index),
                                isGrouped: isGroupedWithPrevious(at: index)
                            )
                            .id(message.id)
                            .transition(.move(edge: message.senderId == authVM.user?.id ? .trailing : .leading).combined(with: .opacity))
                        }

                        if vm.isSending {
                            ChatSendingIndicator()
                                .id("sending-indicator")
                                .padding(.top, 4)
                        }

                        if vm.isOtherTyping {
                            HStack {
                                Text("\(otherName) печатает…")
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundColor(.white.opacity(0.5))
                                Spacer()
                            }
                            .id("typing-indicator")
                            .transition(.opacity)
                        }
                    }
                    .padding(.horizontal, 14)
                    .padding(.top, 12)
                    .padding(.bottom, 92)
                }
                .onTapGesture {
                    isInputFocused = false
                }
                .onChange(of: vm.messages.count) { _, _ in
                    scrollToBottom(proxy)
                }
                .onChange(of: vm.isSending) { _, _ in
                    scrollToBottom(proxy)
                }
            }
        }
        .safeAreaInset(edge: .bottom, spacing: 0) {
            inputBar
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button { dismiss() } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 13, weight: .bold))
                        .frame(width: 34, height: 34)
                        .contentShape(Circle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Закрыть чат")
            }
            ToolbarItem(placement: .principal) {
                ChatConversationTitle(
                    user: otherUser,
                    name: otherName,
                    subtitle: room.isDispute ? "Арбитраж сделки" : "Диалог по сделке",
                    isActive: isOtherActive
                )
            }
            if !room.isDispute, !room.isSupport, otherUser != nil {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Button {
                            moderationAction = .report
                        } label: {
                            Label("Пожаловаться", systemImage: "exclamationmark.bubble")
                        }

                        Button(role: .destructive) {
                            moderationAction = .block
                        } label: {
                            Label("Заблокировать", systemImage: "hand.raised.fill")
                        }
                    } label: {
                        Image(systemName: "ellipsis")
                            .frame(width: 44, height: 44)
                            .contentShape(Rectangle())
                    }
                    .accessibilityLabel("Действия с пользователем")
                }
            }
        }
        .confirmationDialog(
            moderationAction?.title ?? "",
            isPresented: Binding(
                get: { moderationAction != nil },
                set: { if !$0 { moderationAction = nil } }
            ),
            titleVisibility: .visible
        ) {
            if let action = moderationAction {
                Button(action.confirmationTitle, role: action == .block ? .destructive : nil) {
                    Task { await performModeration(action) }
                }
            }
            Button("Отмена", role: .cancel) {}
        } message: {
            Text(moderationAction?.message ?? "")
        }
        .alert(
            "Безопасность",
            isPresented: Binding(
                get: { moderationMessage != nil },
                set: { if !$0 { moderationMessage = nil } }
            )
        ) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(moderationMessage ?? "")
        }
        .task {
            await vm.loadMessages(roomId: room.id)
            vm.startPolling(roomId: room.id)
            vm.startRealtime(roomId: room.id, currentUserId: authVM.user?.id)
        }
        .onDisappear {
            vm.stopPolling()
        }
    }

    private var inputBar: some View {
        VStack(spacing: 8) {
            if vm.isSending {
                HStack(spacing: 6) {
                    ProgressView()
                        .tint(.white.opacity(0.75))
                        .scaleEffect(0.65)
                    Text("Отправляем")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(.white.opacity(0.48))
                    Spacer()
                }
                .padding(.horizontal, 18)
                .transition(.opacity.combined(with: .move(edge: .bottom)))
            }

            HStack(alignment: .bottom, spacing: 10) {
                TextField("Сообщение", text: $vm.messageText, axis: .vertical)
                    .focused($isInputFocused)
                    .font(.system(size: 15))
                    .foregroundColor(.white)
                    .lineLimit(1...5)
                    .padding(.horizontal, 15)
                    .padding(.vertical, 12)
                    .tint(.perklyPurple)
                    .onChange(of: vm.messageText) { _, _ in
                        vm.messageChanged(roomId: room.id)
                    }

                Button {
                    Task {
                        await vm.sendMessage(roomId: room.id)
                        HapticManager.shared.lightImpact()
                    }
                } label: {
                    ZStack {
                        Circle()
                            .fill(canSend ? AnyShapeStyle(Color.primaryGradient) : AnyShapeStyle(Color.white.opacity(0.09)))
                            .frame(width: 42, height: 42)

                        if vm.isSending {
                            ProgressView()
                                .tint(.white)
                                .scaleEffect(0.72)
                        } else {
                            Image(systemName: "arrow.up")
                                .font(.system(size: 16, weight: .black))
                                .foregroundColor(canSend ? .white : .white.opacity(0.3))
                        }
                    }
                    .scaleEffect(canSend ? 1 : 0.94)
                    .animation(.spring(response: 0.24, dampingFraction: 0.76), value: canSend)
                }
                .buttonStyle(.plain)
                .disabled(!canSend || vm.isSending)
                .accessibilityLabel("Отправить сообщение")
            }
            .padding(.horizontal, 14)
        }
        .padding(.top, 10)
        .padding(.bottom, 10)
        .perklyGlass(cornerRadius: 28, isInteractive: false)
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
    }

    private var canSend: Bool {
        !vm.messageText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    private var otherUser: User? {
        room.participants?.first(where: { $0.id != authVM.user?.id })
    }

    private var otherName: String {
        otherUser?.displayName ?? otherUser?.email ?? "Чат"
    }

    private var isOtherActive: Bool {
        guard let date = vm.messages.last(where: { $0.senderId != authVM.user?.id })?.createdDate else {
            return false
        }
        return Date().timeIntervalSince(date) < 3600
    }

    private func shouldShowDayHeader(at index: Int) -> Bool {
        guard vm.messages.indices.contains(index) else { return false }
        if index == 0 { return true }
        return vm.messages[index].dayKey != vm.messages[index - 1].dayKey
    }

    private func isGroupedWithPrevious(at index: Int) -> Bool {
        guard index > 0, vm.messages.indices.contains(index) else { return false }
        let current = vm.messages[index]
        let previous = vm.messages[index - 1]
        guard current.senderId == previous.senderId, current.dayKey == previous.dayKey else { return false }
        guard let currentDate = current.createdDate, let previousDate = previous.createdDate else { return false }
        return currentDate.timeIntervalSince(previousDate) < 180
    }

    private func shouldShowTail(at index: Int) -> Bool {
        guard vm.messages.indices.contains(index) else { return true }
        if index == vm.messages.count - 1 { return true }
        let current = vm.messages[index]
        let next = vm.messages[index + 1]
        guard current.senderId == next.senderId, current.dayKey == next.dayKey else { return true }
        guard let currentDate = current.createdDate, let nextDate = next.createdDate else { return true }
        return nextDate.timeIntervalSince(currentDate) >= 180
    }

    private func scrollToBottom(_ proxy: ScrollViewProxy) {
        let target = vm.isSending ? "sending-indicator" : vm.messages.last?.id
        guard let target else { return }
        withAnimation(.easeOut(duration: 0.24)) {
            proxy.scrollTo(target, anchor: .bottom)
        }
    }

    @MainActor
    private func performModeration(_ action: ChatModerationAction) async {
        guard let user = otherUser, !isModerating else { return }
        isModerating = true
        defer {
            isModerating = false
            moderationAction = nil
        }
        do {
            switch action {
            case .report:
                _ = try await SafetyService.shared.report(
                    targetType: "USER",
                    targetId: user.id,
                    category: "HARASSMENT",
                    description: "Жалоба на пользователя из личного чата Perkly."
                )
                moderationMessage = "Жалоба отправлена команде модерации."
            case .block:
                _ = try await SafetyService.shared.blockUser(user.id)
                dismiss()
            }
        } catch {
            moderationMessage = error.localizedDescription
        }
    }
}

private enum ChatModerationAction: Equatable {
    case report
    case block

    var title: String {
        switch self {
        case .report: return "Пожаловаться на пользователя?"
        case .block: return "Заблокировать пользователя?"
        }
    }

    var message: String {
        switch self {
        case .report:
            return "Модераторы получат жалобу и проверят переписку."
        case .block:
            return "Личный чат исчезнет, и пользователь не сможет писать вам."
        }
    }

    var confirmationTitle: String {
        switch self {
        case .report: return "Отправить жалобу"
        case .block: return "Заблокировать"
        }
    }
}

private struct ChatConversationTitle: View {
    let user: User?
    let name: String
    let subtitle: String
    let isActive: Bool

    var body: some View {
        HStack(spacing: 9) {
            ChatAvatar(user: user, size: 32, showsStatus: isActive)

            VStack(alignment: .leading, spacing: 1) {
                Text(name)
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(.white)
                    .lineLimit(1)

                Text(isActive ? "активен сейчас" : subtitle)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(isActive ? .perklyGreen : .white.opacity(0.42))
                    .lineLimit(1)
            }
        }
    }
}

struct MessageBubble: View {
    let message: Message
    let isOwnMessage: Bool
    let showTail: Bool
    let isGrouped: Bool

    var body: some View {
        HStack(alignment: .bottom, spacing: 8) {
            if isOwnMessage { Spacer(minLength: 52) }

            VStack(alignment: isOwnMessage ? .trailing : .leading, spacing: 4) {
                Text(message.content)
                    .font(.system(size: 15.5))
                    .lineSpacing(2)
                    .foregroundColor(.white)
                    .textSelection(.enabled)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(bubbleFill)
                    .clipShape(bubbleShape)
                    .overlay(
                        bubbleShape
                            .stroke(isOwnMessage ? Color.white.opacity(0.06) : Color.white.opacity(0.075), lineWidth: 1)
                    )
                    .shadow(color: isOwnMessage ? Color.perklyPurple.opacity(0.16) : Color.black.opacity(0.18), radius: isOwnMessage ? 10 : 6, y: 4)

                if showTail {
                    HStack(spacing: 4) {
                        Text(message.timeString)
                            .font(.system(size: 10, weight: .medium))
                        if isOwnMessage {
                            Image(systemName: message.isRead ? "checkmark.circle.fill" : "checkmark")
                                .font(.system(size: 9, weight: .bold))
                        }
                    }
                    .foregroundColor(.white.opacity(0.28))
                    .padding(.horizontal, 6)
                }
            }
            .padding(.top, isGrouped ? 1 : 7)

            if !isOwnMessage { Spacer(minLength: 52) }
        }
    }

    private var bubbleFill: some ShapeStyle {
        if isOwnMessage {
            return AnyShapeStyle(
                LinearGradient(
                    colors: [Color.perklyPurple.opacity(0.98), Color.perklyPink.opacity(0.88)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
        }
        return AnyShapeStyle(Color.white.opacity(0.082))
    }

    private var bubbleShape: some Shape {
        UnevenRoundedRectangle(
            cornerRadii: .init(
                topLeading: 19,
                bottomLeading: isOwnMessage ? 19 : (showTail ? 7 : 19),
                bottomTrailing: isOwnMessage ? (showTail ? 7 : 19) : 19,
                topTrailing: 19
            ),
            style: .continuous
        )
    }
}

private struct ChatDealContextCard: View {
    let summary: ChatTransactionSummary
    let roomStatus: String

    var body: some View {
        VStack(alignment: .leading, spacing: 13) {
            HStack(alignment: .top, spacing: 12) {
                ZStack {
                    RoundedRectangle(cornerRadius: 15, style: .continuous)
                        .fill(Color.primaryGradient.opacity(0.82))

                    Image(systemName: statusIcon)
                        .font(.system(size: 18, weight: .black))
                        .foregroundColor(.white)
                }
                .frame(width: 46, height: 46)

                VStack(alignment: .leading, spacing: 5) {
                    HStack(spacing: 7) {
                        Text(summary.roleLabel)
                            .font(.system(size: 11, weight: .black))
                            .foregroundColor(.black)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.white.opacity(0.88))
                            .clipShape(Capsule())

                        Text(statusTitle)
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(statusColor)
                            .lineLimit(1)
                    }

                    Text(summary.offer?.title ?? "Сделка Perkly")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.white)
                        .lineLimit(2)

                    Text("\(uzs(summary.price))")
                        .font(.system(size: 13, weight: .heavy))
                        .foregroundColor(.white.opacity(0.62))
                }

                Spacer(minLength: 8)
            }

            HStack(spacing: 9) {
                NavigationLink(destination: ActivePurchasesView()) {
                    ChatContextAction(title: "Заказ", icon: "bag.fill")
                }
                .buttonStyle(.plain)

                ChatContextAction(title: roomStatus == "ARBITRATION" ? "Арбитраж" : "Статус", icon: "shield.lefthalf.filled")

                Spacer(minLength: 0)
            }
        }
        .padding(15)
        .perklySurface(cornerRadius: 24)
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .stroke(statusColor.opacity(0.18), lineWidth: 1)
        )
    }

    private var statusTitle: String {
        switch roomStatus {
        case "ARBITRATION": return "Арбитраж сделки"
        case "DISPUTE": return "Спор открыт"
        case "ESCROW": return "Средства в escrow"
        case "COMPLETED": return "Завершено"
        case "CLOSED": return "Закрыто"
        default: return TransactionStatus(rawValue: summary.status)?.displayName ?? "Активно"
        }
    }

    private var statusIcon: String {
        switch roomStatus {
        case "ARBITRATION", "DISPUTE": return "exclamationmark.triangle.fill"
        case "ESCROW": return "lock.shield.fill"
        case "COMPLETED": return "checkmark.seal.fill"
        case "CLOSED": return "archivebox.fill"
        default: return "sparkles"
        }
    }

    private var statusColor: Color {
        switch roomStatus {
        case "ARBITRATION", "DISPUTE": return .perklyOrange
        case "ESCROW": return .perklyGold
        case "COMPLETED": return .perklyGreen
        case "CLOSED": return .white.opacity(0.42)
        default: return .perklyCyan
        }
    }
}

private struct ChatContextAction: View {
    let title: String
    let icon: String

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 11, weight: .bold))
            Text(title)
                .font(.system(size: 12, weight: .bold))
        }
        .foregroundColor(.white.opacity(0.74))
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .background(Color.white.opacity(0.075))
        .clipShape(Capsule())
    }
}

private struct ChatDayDivider: View {
    let text: String

    var body: some View {
        HStack {
            Rectangle()
                .fill(Color.white.opacity(0.06))
                .frame(height: 1)

            Text(text)
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(.white.opacity(0.45))
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(Color.white.opacity(0.055))
                .clipShape(Capsule())

            Rectangle()
                .fill(Color.white.opacity(0.06))
                .frame(height: 1)
        }
        .padding(.horizontal, 12)
    }
}

private struct ChatSendingIndicator: View {
    var body: some View {
        HStack {
            Spacer(minLength: 52)
            HStack(spacing: 6) {
                ForEach(0..<3, id: \.self) { index in
                    Circle()
                        .fill(Color.white.opacity(0.62))
                        .frame(width: 5, height: 5)
                        .scaleEffect(index == 1 ? 1.2 : 1)
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 11)
            .background(Color.white.opacity(0.07))
            .clipShape(Capsule())
        }
    }
}

private struct ChatLoadingMessagesView: View {
    var body: some View {
        VStack(spacing: 10) {
            ProgressView()
                .tint(.perklyPurple)
            Text("Загружаем переписку")
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(.white.opacity(0.42))
        }
        .frame(maxWidth: .infinity)
    }
}

private struct ChatRoomEmptyState: View {
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "bubble.left")
                .font(.system(size: 38))
                .foregroundColor(.white.opacity(0.22))

            Text("Начните диалог")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(.white)

            Text("Сообщения будут сгруппированы по времени и статусу сделки.")
                .font(.system(size: 13))
                .foregroundColor(.white.opacity(0.42))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 36)
        }
        .frame(maxWidth: .infinity)
    }
}

private struct ChatInlineError: View {
    let text: String
    let retry: () -> Void

    var body: some View {
        VStack(spacing: 10) {
            Text("Не удалось загрузить сообщения")
                .font(.system(size: 15, weight: .bold))
                .foregroundColor(.white)

            Text(text)
                .font(.system(size: 12))
                .foregroundColor(.white.opacity(0.45))
                .multilineTextAlignment(.center)

            Button(action: retry) {
                Text("Повторить")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.black)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                    .background(Color.white)
                    .clipShape(Capsule())
            }
            .buttonStyle(.plain)
        }
        .padding(16)
        .background(Color.white.opacity(0.055))
        .clipShape(RoundedRectangle(cornerRadius: 18))
    }
}
