import SwiftUI

private enum AdminModerationKind: String {
    case report
    case appeal
}

private struct AdminModerationDecision: Identifiable {
    let id = UUID()
    let kind: AdminModerationKind
    let targetId: String
    let title: String
}

@MainActor
private final class AdminModerationViewModel: ObservableObject {
    @Published var reports: [AdminModerationReport] = []
    @Published var appeals: [AdminModerationAppeal] = []
    @Published var status = ""
    @Published var isLoading = false
    @Published var updatingId: String?
    @Published var error: String?

    private let service = AdminService.shared

    func load() async {
        isLoading = true
        error = nil

        do {
            async let reportsRequest = service.getModerationReports(status: status)
            async let appealsRequest = service.getModerationAppeals(status: status)
            let (loadedReports, loadedAppeals) = try await (reportsRequest, appealsRequest)
            reports = loadedReports
            appeals = loadedAppeals
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    @discardableResult
    func resolve(_ decision: AdminModerationDecision, status: String, resolution: String) async -> Bool {
        updatingId = decision.targetId
        error = nil

        do {
            switch decision.kind {
            case .report:
                _ = try await service.resolveModerationReport(
                    id: decision.targetId,
                    status: status,
                    resolution: resolution
                )
            case .appeal:
                _ = try await service.resolveModerationAppeal(
                    id: decision.targetId,
                    status: status,
                    resolution: resolution
                )
            }
            await load()
            updatingId = nil
            return true
        } catch {
            self.error = error.localizedDescription
            updatingId = nil
            return false
        }
    }
}

struct AdminModerationView: View {
    @StateObject private var vm = AdminModerationViewModel()
    @State private var decision: AdminModerationDecision?

    private let statuses = [
        ("", "Все"),
        ("OPEN", "Открытые"),
        ("REVIEWING", "На проверке"),
        ("RESOLVED", "Решённые"),
        ("REJECTED", "Отклонённые")
    ]

    var body: some View {
        ZStack {
            Color.perklyDark.ignoresSafeArea()

            ScrollView(.vertical, showsIndicators: false) {
                LazyVStack(spacing: 16) {
                    statusPicker

                    if let error = vm.error {
                        inlineError(error)
                    }

                    if vm.isLoading && vm.reports.isEmpty && vm.appeals.isEmpty {
                        ProgressView()
                            .tint(.perklyPurple)
                            .padding(.top, 80)
                    } else if vm.reports.isEmpty && vm.appeals.isEmpty {
                        emptyState
                    } else {
                        if !vm.reports.isEmpty {
                            sectionHeader("Жалобы", count: vm.reports.count)
                            ForEach(vm.reports) { report in
                                moderationCard(
                                    label: "ЖАЛОБА",
                                    title: "\(report.targetType) · \(report.category)",
                                    target: report.targetId,
                                    text: report.description,
                                    user: report.reporter,
                                    status: report.status,
                                    resolution: report.resolution,
                                    createdAt: report.createdAt,
                                    busy: vm.updatingId == report.id
                                ) {
                                    decision = AdminModerationDecision(
                                        kind: .report,
                                        targetId: report.id,
                                        title: "\(report.targetType) · \(report.category)"
                                    )
                                }
                            }
                        }

                        if !vm.appeals.isEmpty {
                            sectionHeader("Апелляции", count: vm.appeals.count)
                            ForEach(vm.appeals) { appeal in
                                moderationCard(
                                    label: "АПЕЛЛЯЦИЯ",
                                    title: appeal.subjectType,
                                    target: appeal.subjectId,
                                    text: appeal.reason,
                                    user: appeal.user,
                                    status: appeal.status,
                                    resolution: appeal.resolution,
                                    createdAt: appeal.createdAt,
                                    busy: vm.updatingId == appeal.id
                                ) {
                                    decision = AdminModerationDecision(
                                        kind: .appeal,
                                        targetId: appeal.id,
                                        title: appeal.subjectType
                                    )
                                }
                            }
                        }
                    }
                }
                .padding(20)
                .padding(.bottom, 30)
            }
            .refreshable { await vm.load() }
        }
        .navigationTitle("Модерация")
        .navigationBarTitleDisplayMode(.inline)
        .task { await vm.load() }
        .sheet(item: $decision) { item in
            AdminModerationDecisionSheet(title: item.title) { status, resolution in
                decision = nil
                Task {
                    _ = await vm.resolve(item, status: status, resolution: resolution)
                }
            }
            .presentationDetents([.medium])
            .presentationDragIndicator(.visible)
        }
    }

    private var statusPicker: some View {
        HStack(spacing: 12) {
            Image(systemName: "line.3.horizontal.decrease.circle.fill")
                .foregroundColor(.perklyOrange)

            Picker("Статус", selection: $vm.status) {
                ForEach(statuses, id: \.0) { status in
                    Text(status.1).tag(status.0)
                }
            }
            .tint(.white)

            Spacer()

            Button {
                Task { await vm.load() }
            } label: {
                Image(systemName: vm.isLoading ? "arrow.triangle.2.circlepath" : "arrow.clockwise")
                    .foregroundColor(.white.opacity(0.7))
            }
            .buttonStyle(.plain)
            .disabled(vm.isLoading)
        }
        .padding(14)
        .perklySurface(cornerRadius: 16)
        .onChange(of: vm.status) {
            Task { await vm.load() }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "checkmark.shield.fill")
                .font(.system(size: 42))
                .foregroundColor(.perklyGreen)
            Text("Очередь пуста")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(.white)
            Text("По выбранному статусу нет жалоб и апелляций")
                .font(.system(size: 13))
                .foregroundColor(.white.opacity(0.45))
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 70)
    }

    private func sectionHeader(_ title: String, count: Int) -> some View {
        HStack {
            Text(title)
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(.white)
            Text("\(count)")
                .font(.system(size: 11, weight: .black))
                .foregroundColor(.perklyPurple)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color.perklyPurple.opacity(0.14))
                .clipShape(Capsule())
            Spacer()
        }
        .padding(.top, 4)
    }

    private func moderationCard(
        label: String,
        title: String,
        target: String?,
        text: String,
        user: User?,
        status: String,
        resolution: String?,
        createdAt: String,
        busy: Bool,
        onDecide: @escaping () -> Void
    ) -> some View {
        VStack(alignment: .leading, spacing: 13) {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: "shield.lefthalf.filled.badge.checkmark")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(statusColor(status))
                    .frame(width: 42, height: 42)
                    .background(statusColor(status).opacity(0.14))
                    .clipShape(RoundedRectangle(cornerRadius: 13))

                VStack(alignment: .leading, spacing: 4) {
                    Text(label)
                        .font(.system(size: 10, weight: .black))
                        .foregroundColor(.perklyOrange)
                    Text(title)
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.white)
                    if let target, !target.isEmpty {
                        Text("ID: \(target)")
                            .font(.system(size: 10, design: .monospaced))
                            .foregroundColor(.white.opacity(0.3))
                            .lineLimit(1)
                    }
                }

                Spacer()

                Text(statusTitle(status))
                    .font(.system(size: 10, weight: .black))
                    .foregroundColor(statusColor(status))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 5)
                    .background(statusColor(status).opacity(0.13))
                    .clipShape(Capsule())
            }

            Text(text)
                .font(.system(size: 13))
                .foregroundColor(.white.opacity(0.68))
                .fixedSize(horizontal: false, vertical: true)

            HStack {
                Label(user?.displayName ?? user?.email ?? "Пользователь", systemImage: "person.fill")
                Spacer()
                Text(adminDate(createdAt))
            }
            .font(.system(size: 11, weight: .medium))
            .foregroundColor(.white.opacity(0.35))

            if let resolution, !resolution.isEmpty {
                Text("Решение: \(resolution)")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.perklyGreen)
                    .padding(10)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.perklyGreen.opacity(0.09))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
            }

            if status == "OPEN" || status == "REVIEWING" {
                Button(action: onDecide) {
                    HStack {
                        if busy {
                            ProgressView().tint(.white)
                        } else {
                            Image(systemName: "checkmark.seal.fill")
                            Text("Принять решение")
                                .fontWeight(.bold)
                        }
                    }
                    .font(.system(size: 13))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 11)
                    .background(Color.perklyPurple.opacity(0.24))
                    .clipShape(RoundedRectangle(cornerRadius: 11))
                }
                .buttonStyle(.plain)
                .disabled(busy)
            }
        }
        .padding(16)
        .perklySurface(cornerRadius: 18)
    }

    private func inlineError(_ text: String) -> some View {
        Label(text, systemImage: "exclamationmark.triangle.fill")
            .font(.system(size: 13, weight: .medium))
            .foregroundColor(.perklyRed)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(14)
            .background(Color.perklyRed.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    private func statusTitle(_ status: String) -> String {
        switch status {
        case "OPEN": return "ОТКРЫТО"
        case "REVIEWING": return "ПРОВЕРКА"
        case "RESOLVED": return "РЕШЕНО"
        case "REJECTED": return "ОТКЛОНЕНО"
        default: return status
        }
    }

    private func statusColor(_ status: String) -> Color {
        switch status {
        case "OPEN": return .perklyOrange
        case "REVIEWING": return .perklyCyan
        case "RESOLVED": return .perklyGreen
        case "REJECTED": return .perklyRed
        default: return .white.opacity(0.5)
        }
    }
}

private struct AdminModerationDecisionSheet: View {
    let title: String
    let onSave: (String, String) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var status = "RESOLVED"
    @State private var resolution = ""
    @State private var validationError: String?

    var body: some View {
        NavigationStack {
            ZStack {
                Color.perklyDark.ignoresSafeArea()

                VStack(alignment: .leading, spacing: 18) {
                    Text(title)
                        .font(.system(size: 20, weight: .bold))
                        .foregroundColor(.white)

                    Picker("Решение", selection: $status) {
                        Text("На проверку").tag("REVIEWING")
                        Text("Решено").tag("RESOLVED")
                        Text("Отклонено").tag("REJECTED")
                    }
                    .pickerStyle(.segmented)

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Комментарий администратора")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(.white.opacity(0.55))
                        TextEditor(text: $resolution)
                            .foregroundColor(.white)
                            .scrollContentBackground(.hidden)
                            .frame(minHeight: 100)
                            .padding(10)
                            .background(Color.white.opacity(0.06))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }

                    if let validationError {
                        Text(validationError)
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.perklyRed)
                    }

                    Spacer()

                    Button {
                        save()
                    } label: {
                        Text("Сохранить решение")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 15)
                            .background(Color.primaryGradient)
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                    }
                    .buttonStyle(.plain)
                }
                .padding(22)
            }
            .navigationTitle("Решение")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Закрыть") { dismiss() }
                        .foregroundColor(.white.opacity(0.7))
                }
            }
        }
    }

    private func save() {
        let note = resolution.trimmingCharacters(in: .whitespacesAndNewlines)
        if status != "REVIEWING" && note.count < 3 {
            validationError = "Кратко опишите причину решения"
            return
        }
        onSave(status, note.isEmpty ? "Передано на дополнительную проверку" : note)
        dismiss()
    }
}

@MainActor
private final class AdminAuditLogViewModel: ObservableObject {
    @Published var logs: [AdminLog] = []
    @Published var total = 0
    @Published var action = ""
    @Published var isLoading = false
    @Published var error: String?

    private let service = AdminService.shared

    func load() async {
        isLoading = true
        error = nil
        do {
            let response = try await service.getAdminLogs(action: action.trimmingCharacters(in: .whitespacesAndNewlines))
            logs = response.logs
            total = response.total
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}

struct AdminAuditLogView: View {
    @StateObject private var vm = AdminAuditLogViewModel()

    var body: some View {
        ZStack {
            Color.perklyDark.ignoresSafeArea()

            VStack(spacing: 14) {
                searchBar

                HStack {
                    Text("\(vm.total) записей")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(.white.opacity(0.45))
                    Spacer()
                }

                if let error = vm.error {
                    Label(error, systemImage: "exclamationmark.triangle.fill")
                        .font(.system(size: 13))
                        .foregroundColor(.perklyRed)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                if vm.isLoading && vm.logs.isEmpty {
                    Spacer()
                    ProgressView().tint(.perklyPurple)
                    Spacer()
                } else if vm.logs.isEmpty {
                    Spacer()
                    Text("Записей не найдено")
                        .font(.system(size: 15))
                        .foregroundColor(.white.opacity(0.45))
                    Spacer()
                } else {
                    ScrollView(.vertical, showsIndicators: false) {
                        LazyVStack(spacing: 10) {
                            ForEach(vm.logs) { log in
                                auditCard(log)
                            }
                        }
                        .padding(.bottom, 24)
                    }
                    .refreshable { await vm.load() }
                }
            }
            .padding(20)
        }
        .navigationTitle("Журнал действий")
        .navigationBarTitleDisplayMode(.inline)
        .task { await vm.load() }
        .onSubmit(of: .text) {
            Task { await vm.load() }
        }
    }

    private var searchBar: some View {
        HStack(spacing: 10) {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.white.opacity(0.35))
            TextField("Фильтр по действию...", text: $vm.action)
                .foregroundColor(.white)
                .textInputAutocapitalization(.characters)
                .autocorrectionDisabled()
                .submitLabel(.search)
            if !vm.action.isEmpty {
                Button {
                    vm.action = ""
                    Task { await vm.load() }
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.white.opacity(0.35))
                }
                .buttonStyle(.plain)
            }
            Button {
                Task { await vm.load() }
            } label: {
                Image(systemName: "arrow.clockwise")
                    .foregroundColor(.perklyCyan)
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 15)
        .padding(.vertical, 12)
        .perklySurface(cornerRadius: 14)
    }

    private func auditCard(_ log: AdminLog) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: "scroll.fill")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(.perklyCyan)
                    .frame(width: 38, height: 38)
                    .background(Color.perklyCyan.opacity(0.12))
                    .clipShape(RoundedRectangle(cornerRadius: 11))

                VStack(alignment: .leading, spacing: 4) {
                    Text(log.action)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                    Text(log.admin?.displayName ?? log.admin?.email ?? log.adminId)
                        .font(.system(size: 11))
                        .foregroundColor(.white.opacity(0.4))
                }

                Spacer()

                Text(adminDate(log.createdAt))
                    .font(.system(size: 10))
                    .foregroundColor(.white.opacity(0.3))
            }

            if let targetId = log.targetId, !targetId.isEmpty {
                Text("Target: \(targetId)")
                    .font(.system(size: 10, design: .monospaced))
                    .foregroundColor(.white.opacity(0.35))
                    .lineLimit(1)
            }

            if let details = log.details, !details.isEmpty {
                Text(details)
                    .font(.system(size: 11, design: .monospaced))
                    .foregroundColor(.white.opacity(0.52))
                    .textSelection(.enabled)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(10)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.black.opacity(0.18))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
            }
        }
        .padding(15)
        .perklySurface(cornerRadius: 16)
    }
}

private func adminDate(_ iso: String) -> String {
    let fractional = ISO8601DateFormatter()
    fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    let regular = ISO8601DateFormatter()
    guard let date = fractional.date(from: iso) ?? regular.date(from: iso) else { return iso }
    return date.formatted(
        Date.FormatStyle(date: .numeric, time: .shortened)
            .locale(L10n.locale)
    )
}
