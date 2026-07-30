import SwiftUI

@MainActor
final class AdminCompaniesViewModel: ObservableObject {
    @Published var companies: [Company] = []
    @Published var filter: CompanyStatus?
    @Published var isLoading = false
    @Published var updatingIDs: Set<String> = []
    @Published var error: String?
    private let service = AdminService.shared

    func load() async {
        isLoading = true; error = nil
        defer { isLoading = false }
        do { companies = try await service.getCompanies(status: filter) }
        catch { self.error = error.localizedDescription }
    }

    func update(_ company: Company, to status: CompanyStatus) async {
        guard updatingIDs.insert(company.id).inserted else { return }
        defer { updatingIDs.remove(company.id) }
        do {
            let updated = try await service.updateCompanyStatus(id: company.id, status: status)
            if filter == nil || filter == updated.status {
                if let index = companies.firstIndex(where: { $0.id == updated.id }) { companies[index] = updated }
            } else { companies.removeAll { $0.id == company.id } }
            HapticManager.shared.playSuccess()
        } catch { self.error = error.localizedDescription; HapticManager.shared.playError() }
    }
}

struct AdminCompaniesView: View {
    @StateObject private var vm = AdminCompaniesViewModel()

    var body: some View {
        ZStack {
            Color.perklyDark.ignoresSafeArea()
            VStack(spacing: 0) {
                filters
                if vm.isLoading && vm.companies.isEmpty { Spacer(); ProgressView().tint(.perklyGreen); Spacer() }
                else if let error = vm.error, vm.companies.isEmpty { Spacer(); AdminInlineError(text: error).padding(); Spacer() }
                else if vm.companies.isEmpty { Spacer(); emptyState; Spacer() }
                else {
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            ForEach(vm.companies) { company in
                                CompanyModerationCard(company: company, isUpdating: vm.updatingIDs.contains(company.id)) { status in
                                    Task { await vm.update(company, to: status) }
                                }
                            }
                        }.padding(16)
                    }.refreshable { await vm.load() }
                }
            }
        }
        .navigationTitle("Компании")
        .navigationBarTitleDisplayMode(.inline)
        .task { await vm.load() }
    }

    private var filters: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                filterButton("Все", nil)
                filterButton("На проверке", .pendingModeration)
                filterButton("Активные", .active)
                filterButton("Заблокированные", .suspended)
            }.padding(.horizontal, 16).padding(.vertical, 12)
        }
    }

    private func filterButton(_ title: String, _ status: CompanyStatus?) -> some View {
        Button(title) { vm.filter = status; Task { await vm.load() } }
            .font(.system(size: 12, weight: .bold))
            .foregroundColor(vm.filter == status ? .black : .white.opacity(0.65))
            .padding(.horizontal, 13).padding(.vertical, 8)
            .background(vm.filter == status ? Color.perklyGreen : Color.white.opacity(0.07)).clipShape(Capsule())
            .buttonStyle(.plain)
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "building.2.crop.circle").font(.system(size: 44)).foregroundColor(.white.opacity(0.2))
            Text("Заявок нет").font(.system(size: 17, weight: .bold)).foregroundColor(.white.opacity(0.7))
        }
    }
}

private struct CompanyModerationCard: View {
    let company: Company
    let isUpdating: Bool
    let update: (CompanyStatus) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 13) {
            HStack {
                VStack(alignment: .leading, spacing: 3) {
                    Text(company.brandName).font(.system(size: 17, weight: .bold)).foregroundColor(.white)
                    Text(company.legalName).font(.system(size: 12)).foregroundColor(.white.opacity(0.48))
                }
                Spacer(); statusBadge
            }
            Divider().overlay(Color.white.opacity(0.07))
            field("ИНН", company.inn)
            field("Телефон", company.phone ?? company.owner?.phone ?? "—")
            field("Владелец", company.owner?.displayName ?? company.owner?.email ?? company.ownerUserId)
            field("Публикации", "\(company._count?.offers ?? 0) товаров · \(company._count?.promocodes ?? 0) промокодов")

            HStack(spacing: 9) {
                if company.status != .active { action("Одобрить", .active, .perklyGreen) }
                if company.status != .suspended { action("Заблокировать", .suspended, .perklyRed) }
                if company.status != .pendingModeration { action("На проверку", .pendingModeration, .perklyGold) }
            }
            .disabled(isUpdating).opacity(isUpdating ? 0.5 : 1)
        }
        .padding(15).perklySurface(cornerRadius: 18)
    }

    private var statusBadge: some View {
        Text(company.status.title).font(.system(size: 10, weight: .black)).foregroundColor(statusColor)
            .padding(.horizontal, 9).padding(.vertical, 5).background(statusColor.opacity(0.14)).clipShape(Capsule())
    }
    private var statusColor: Color { company.status == .active ? .perklyGreen : company.status == .suspended ? .perklyRed : .perklyGold }
    private func field(_ label: String, _ value: String) -> some View {
        HStack(alignment: .top) { Text(label).foregroundColor(.white.opacity(0.4)); Spacer(); Text(value).foregroundColor(.white.opacity(0.72)).multilineTextAlignment(.trailing) }
            .font(.system(size: 12, weight: .medium))
    }
    private func action(_ title: String, _ status: CompanyStatus, _ color: Color) -> some View {
        Button(title) { update(status) }.font(.system(size: 11, weight: .bold)).foregroundColor(color)
            .frame(maxWidth: .infinity).padding(.vertical, 9).background(color.opacity(0.12)).clipShape(RoundedRectangle(cornerRadius: 10))
            .buttonStyle(.plain)
    }
}
