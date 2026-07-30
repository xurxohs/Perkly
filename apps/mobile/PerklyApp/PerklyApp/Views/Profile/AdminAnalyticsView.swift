import SwiftUI

@MainActor
final class AdminAnalyticsViewModel: ObservableObject {
    enum Mode: String, CaseIterable { case analytics = "События"; case diagnostics = "Ошибки" }
    @Published var events: [AnalyticsEvent] = []
    @Published var total: Int = 0
    @Published var isLoading = false
    @Published var error: String?
    @Published var selectedEventType: String = ""
    @Published var mode: Mode = .analytics
    @Published var issues: [DiagnosticIssue] = []
    @Published var totalOccurrences = 0

    let eventTypes = ["", "app_open", "offer_view", "offer_click", "purchase", "search"]

    private let service = AdminService.shared

    func load() async {
        isLoading = true
        error = nil

        do {
            if mode == .analytics {
                let response = try await service.getAnalyticsEvents(eventType: selectedEventType)
                events = response.items
                total = response.total ?? response.items.count
            } else {
                let response = try await service.getDiagnosticsSummary()
                issues = response.issues
                totalOccurrences = response.totalOccurrences
            }
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }
}

struct AdminAnalyticsView: View {
    @StateObject private var vm = AdminAnalyticsViewModel()

    var body: some View {
        ZStack {
            Color.perklyDark.ignoresSafeArea()

            VStack(spacing: 0) {
                Picker("Раздел", selection: $vm.mode) {
                    ForEach(AdminAnalyticsViewModel.Mode.allCases, id: \.self) { mode in
                        Text(mode.rawValue).tag(mode)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, 20)
                .padding(.top, 12)
                .onChange(of: vm.mode) { _, _ in Task { await vm.load() } }

                // Filters
                if vm.mode == .analytics { ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(vm.eventTypes, id: \.self) { type in
                            Button {
                                vm.selectedEventType = type
                                Task { await vm.load() }
                            } label: {
                                Text(type.isEmpty ? "Все события" : type)
                                    .font(.system(size: 13, weight: .bold))
                                    .foregroundColor(vm.selectedEventType == type ? .black : .white.opacity(0.6))
                                    .padding(.horizontal, 14)
                                    .padding(.vertical, 8)
                                    .background(vm.selectedEventType == type ? Color.perklyCyan : Color.white.opacity(0.08))
                                    .clipShape(Capsule())
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.vertical, 14)
                }
                .background(Color.white.opacity(0.02))
                }

                if vm.isLoading && (vm.mode == .analytics ? vm.events.isEmpty : vm.issues.isEmpty) {
                    Spacer()
                    ProgressView().tint(.perklyCyan)
                    Spacer()
                } else if let error = vm.error {
                    Spacer()
                    AdminInlineError(text: error)
                        .padding()
                    Spacer()
                } else if vm.mode == .analytics && vm.events.isEmpty {
                    Spacer()
                    VStack(spacing: 12) {
                        Image(systemName: "chart.bar.xaxis")
                            .font(.system(size: 40))
                            .foregroundColor(.white.opacity(0.2))
                        Text("Нет событий")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.white.opacity(0.7))
                    }
                    Spacer()
                } else if vm.mode == .analytics {
                    ScrollView(.vertical, showsIndicators: false) {
                        LazyVStack(spacing: 12) {
                            HStack {
                                Text(vm.total > 0 ? "Всего: \(vm.total)" : "События")
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundColor(.white.opacity(0.5))
                                Spacer()
                            }
                            .padding(.bottom, 4)

                            ForEach(vm.events) { event in
                                AdminAnalyticsRow(event: event)
                            }
                        }
                        .padding(20)
                    }
                    .refreshable {
                        await vm.load()
                    }
                } else if vm.issues.isEmpty {
                    Spacer()
                    VStack(spacing: 12) {
                        Image(systemName: "checkmark.shield.fill")
                            .font(.system(size: 42))
                            .foregroundColor(.perklyGreen)
                        Text("Сбоев пока нет")
                            .font(.system(size: 17, weight: .bold))
                            .foregroundColor(.white)
                    }
                    Spacer()
                } else {
                    ScrollView(.vertical, showsIndicators: false) {
                        LazyVStack(spacing: 12) {
                            HStack {
                                Text("Всего повторов: \(vm.totalOccurrences)")
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundColor(.white.opacity(0.5))
                                Spacer()
                            }
                            ForEach(vm.issues) { issue in DiagnosticIssueCard(issue: issue) }
                        }
                        .padding(20)
                    }
                    .refreshable { await vm.load() }
                }
            }
        }
        .navigationTitle("Мониторинг")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await vm.load()
        }
    }
}

struct AdminAnalyticsRow: View {
    let event: AnalyticsEvent

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top, spacing: 12) {
                ZStack {
                    Circle()
                        .fill(eventColor.opacity(0.15))
                        .frame(width: 40, height: 40)
                    Image(systemName: eventIcon)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(eventColor)
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text(event.eventType)
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.white)

                    if let time = formattedTime {
                        Text(time)
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(.white.opacity(0.45))
                    }
                }

                Spacer()

                if let user = event.userId {
                    HStack(spacing: 4) {
                        Image(systemName: "person.fill")
                        Text(user.prefix(6))
                    }
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(.white.opacity(0.6))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.white.opacity(0.1))
                    .clipShape(Capsule())
                }
            }

            if event.offerId != nil || event.metadata != nil {
                VStack(alignment: .leading, spacing: 6) {
                    if let offerId = event.offerId {
                        HStack(spacing: 6) {
                            Image(systemName: "tag.fill")
                            Text("Offer: \(offerId)")
                        }
                    }
                    if let meta = event.metadata, !meta.isEmpty, meta != "{}" {
                        HStack(spacing: 6) {
                            Image(systemName: "doc.text.fill")
                            Text(meta)
                                .lineLimit(2)
                        }
                    }
                }
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(.white.opacity(0.5))
                .padding(10)
                .background(Color.white.opacity(0.04))
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .padding(.top, 2)
            }
        }
        .padding(14)
        .perklySurface(cornerRadius: 16)
    }

    private var eventColor: Color {
        switch event.eventType {
        case "app_open": return .perklyGreen
        case "offer_view": return .perklyCyan
        case "purchase": return .perklyPurple
        case "search": return .perklyGold
        default: return .white.opacity(0.6)
        }
    }

    private var eventIcon: String {
        switch event.eventType {
        case "app_open": return "iphone"
        case "offer_view": return "eye.fill"
        case "purchase": return "cart.fill"
        case "search": return "magnifyingglass"
        default: return "bolt.fill"
        }
    }

    private var formattedTime: String? {
        guard let isoString = event.createdAt else { return nil }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: isoString) ?? ISO8601DateFormatter().date(from: isoString) else { return isoString }

        let out = DateFormatter()
        out.locale = L10n.locale
        out.dateFormat = "d MMM, HH:mm:ss"
        return out.string(from: date)
    }
}

private struct DiagnosticIssueCard: View {
    let issue: DiagnosticIssue
    @State private var expanded = false

    var body: some View {
        Button { withAnimation(.easeInOut(duration: 0.2)) { expanded.toggle() } } label: {
            VStack(alignment: .leading, spacing: 11) {
                HStack(spacing: 10) {
                    Image(systemName: icon)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(color)
                        .frame(width: 38, height: 38)
                        .background(color.opacity(0.14))
                        .clipShape(Circle())
                    VStack(alignment: .leading, spacing: 3) {
                        Text(title)
                            .font(.system(size: 15, weight: .bold))
                            .foregroundColor(.white)
                        Text("Последний: \(formatted(issue.lastSeenAt))")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(.white.opacity(0.45))
                    }
                    Spacer()
                    Text("×\(issue.occurrences)")
                        .font(.system(size: 13, weight: .black))
                        .foregroundColor(color)
                        .padding(.horizontal, 9).padding(.vertical, 5)
                        .background(color.opacity(0.13)).clipShape(Capsule())
                }

                Text(issue.message)
                    .font(.system(size: 12, weight: .medium, design: .monospaced))
                    .foregroundColor(.white.opacity(0.68))
                    .lineLimit(expanded ? 20 : 3)
                    .frame(maxWidth: .infinity, alignment: .leading)

                if expanded {
                    Divider().overlay(Color.white.opacity(0.08))
                    detail("Версия", issue.appVersion)
                    detail("ОС", issue.osVersion)
                    detail("Устройство", issue.deviceModel)
                    detail("Первый", formatted(issue.firstSeenAt))
                    if !issue.breadcrumbItems.isEmpty {
                        Text("Последние действия")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.white.opacity(0.45))
                        ForEach(Array(issue.breadcrumbItems.suffix(8).enumerated()), id: \.offset) { _, item in
                            Text(item).font(.system(size: 10, design: .monospaced))
                                .foregroundColor(.white.opacity(0.52))
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                    }
                }
            }
            .padding(14)
            .perklySurface(cornerRadius: 16)
        }
        .buttonStyle(.plain)
    }

    private var title: String {
        switch issue.kind { case "crash": return "Падение"; case "hang": return "Зависание"; default: return "Неожиданный выход" }
    }
    private var icon: String { issue.kind == "hang" ? "hourglass" : "exclamationmark.triangle.fill" }
    private var color: Color { issue.kind == "hang" ? .perklyGold : .perklyRed }

    private func detail(_ name: String, _ value: String?) -> some View {
        HStack { Text(name).foregroundColor(.white.opacity(0.4)); Spacer(); Text(value ?? "—").foregroundColor(.white.opacity(0.7)) }
            .font(.system(size: 11, weight: .medium))
    }

    private func formatted(_ value: String) -> String {
        let fractional = ISO8601DateFormatter(); fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = fractional.date(from: value) ?? ISO8601DateFormatter().date(from: value) else { return value }
        let output = DateFormatter(); output.locale = L10n.locale; output.dateFormat = "d MMM, HH:mm"
        return output.string(from: date)
    }
}
