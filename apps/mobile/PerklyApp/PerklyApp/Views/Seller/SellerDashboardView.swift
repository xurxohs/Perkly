import SwiftUI

struct SellerDashboardView: View {
    @EnvironmentObject var authVM: AuthViewModel
    @StateObject private var vm = SellerViewModel()
    @State private var showCreateOffer = false
    @State private var editingOffer: Offer?
    @State private var editingPromocode: Promocode?
    @State private var showCreateEvent = false
    @State private var showCreatePromocode = false
    @State private var showSubscriptionSheet = false
    @State private var showCompanyApply = false
    
    var body: some View {
        Group {
            if vm.isLoading && vm.stats == nil {
                PerklyContentStateView(
                    kind: .loading,
                    icon: "",
                    title: "Загружаем кабинет"
                )
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if shouldShowCompanyGate {
                companyGateContent
            } else if let error = vm.error, vm.stats == nil {
                PerklyContentStateView(
                    kind: .error,
                    icon: "exclamationmark.triangle.fill",
                    title: "Не удалось открыть кабинет",
                    message: error,
                    actionTitle: "Повторить"
                ) {
                    Task { await vm.loadData(currentUser: authVM.user) }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                dashboardContent
            }
        }
        .background(Color.perklyDark)
        .navigationTitle("Кабинет заведения")
        .navigationBarTitleDisplayMode(.large)
        .task {
            await vm.loadData(currentUser: authVM.user)
        }
        .sheet(isPresented: $showCompanyApply) {
            CompanyApplySheet(isApplying: vm.isApplyingCompany) { legalName, brandName, inn, phone in
                await vm.applyCompany(
                    legalName: legalName,
                    brandName: brandName,
                    inn: inn,
                    phone: phone
                )
            }
            .presentationDetents([.large])
            .presentationDragIndicator(.visible)
        }
    }
    
    // MARK: - Dashboard Content
    
    private var dashboardContent: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: 20) {
                // Stats cards
                if let stats = vm.stats {
                    LazyVGrid(columns: [
                        GridItem(.flexible(), spacing: 12),
                        GridItem(.flexible(), spacing: 12)
                    ], spacing: 12) {
                        SellerStatCard(
                            title: "Выручка",
                            value: "\(uzs(stats.totalEarnings))",
                            icon: "banknote.fill",
                            gradient: .perklyGreen
                        )
                        
                        SellerStatCard(
                            title: "Продажи",
                            value: "\(stats.totalSales)",
                            icon: "chart.bar.fill",
                            gradient: .perklyPrimary
                        )
                        
                        SellerStatCard(
                            title: "Публикации",
                            value: "\(stats.activeOffers + stats.activeEvents)",
                            icon: "megaphone.fill",
                            gradient: .perklyGold
                        )
                        
                        SellerStatCard(
                            title: "Topka",
                            value: "\(stats.eventViews)",
                            icon: "flame.fill",
                            gradient: .perklyFire
                        )
                    }
                    .padding(.horizontal, 20)
                }

                VStack(alignment: .leading, spacing: 14) {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Topka")
                                .font(.system(size: 17, weight: .semibold))
                                .foregroundColor(.white)
                            Text(topkaSubtitle)
                                .font(.system(size: 12))
                                .foregroundColor(.white.opacity(0.45))
                        }

                        Spacer()

                        Text(vm.capabilities?.statusText ?? "Basic")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(planColor)
                            .lineLimit(1)
                            .padding(.horizontal, 9)
                            .padding(.vertical, 6)
                            .background(planColor.opacity(0.12))
                            .clipShape(Capsule())

                        Button {
                            if canPublishToTopka {
                                showCreateEvent = true
                            } else {
                                showSubscriptionSheet = true
                            }
                        } label: {
                            HStack(spacing: 6) {
                                Image(systemName: canPublishToTopka ? "plus.circle.fill" : "diamond.fill")
                                Text(canPublishToTopka ? "Событие" : "Platinum")
                            }
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(canPublishToTopka ? .perklyGreen : .white)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 7)
                            .background(canPublishToTopka ? Color.perklyGreen.opacity(0.12) : Color.perklyPurple.opacity(0.35))
                            .clipShape(Capsule())
                        }
                        .buttonStyle(.plain)
                    }

                    if let stats = vm.stats {
                        HStack(spacing: 10) {
                            MiniMetric(title: "События", value: "\(stats.activeEvents)", color: .perklyPurple)
                            MiniMetric(title: "Просмотры", value: "\(stats.eventViews)", color: .perklyOrange)
                            MiniMetric(title: "Лимит", value: topkaLimitText, color: .perklyGreen)
                        }
                    }

                    if vm.events.isEmpty {
                        Text("Пока нет событий в Topka")
                            .font(.system(size: 14))
                            .foregroundColor(.white.opacity(0.4))
                            .padding(.vertical, 8)
                    } else {
                        ForEach(vm.events.prefix(4)) { event in
                            SellerEventRow(event: event)
                        }
                    }
                }
                .padding(20)
                .perklySurface(cornerRadius: 20)
                .padding(.horizontal, 20)

                // Promocodes
                VStack(alignment: .leading, spacing: 14) {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Промокоды")
                                .font(.system(size: 17, weight: .semibold))
                                .foregroundColor(.white)
                            Text("STATIC/DYNAMIC коды, лимиты и конверсия")
                                .font(.system(size: 12))
                                .foregroundColor(.white.opacity(0.45))
                        }

                        Spacer()

                        Button {
                            showCreatePromocode = true
                        } label: {
                            Image(systemName: "plus.circle.fill")
                                .font(.system(size: 21))
                                .foregroundColor(.perklyGreen)
                        }
                        .buttonStyle(.plain)
                    }

                    if let analytics = vm.promocodeAnalytics {
                        HStack(spacing: 10) {
                            MiniMetric(title: "Всего", value: "\(analytics.summary.totalPromocodes)", color: .perklyPurple)
                            MiniMetric(title: "Активные", value: "\(analytics.summary.activePromocodes)", color: .perklyGreen)
                            MiniMetric(title: "Use", value: "\(Int(analytics.summary.useRate))%", color: .perklyGold)
                        }
                    }

                    if vm.promocodes.isEmpty {
                        Text("Промокодов пока нет")
                            .font(.system(size: 14))
                            .foregroundColor(.white.opacity(0.4))
                            .padding(.vertical, 10)
                    } else {
                        ForEach(vm.promocodes.prefix(6)) { promocode in
                            SellerPromocodeRow(
                                promocode: promocode,
                                analytics: vm.promocodeAnalytics?.promocodes.first { $0.id == promocode.id },
                                onEdit: {
                                    editingPromocode = promocode
                                },
                                onStatus: { status in
                                    Task { await vm.updatePromocodeStatus(promocode, status: status) }
                                }
                            )
                        }
                    }
                }
                .padding(20)
                .perklySurface(cornerRadius: 20)
                .padding(.horizontal, 20)
                
                // My offers
                VStack(alignment: .leading, spacing: 14) {
                    HStack {
                        Text("Акции и офферы")
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundColor(.white)
                        
                        Button {
                            showCreateOffer = true
                        } label: {
                            Image(systemName: "plus.circle.fill")
                                .font(.system(size: 20))
                                .foregroundColor(.perklyGreen)
                        }
                        .buttonStyle(.plain)
                        
                        Spacer()
                        
                        Text("\(vm.offers.count)")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.white.opacity(0.4))
                    }
                    
                    if vm.offers.isEmpty {
                        Text("Нет активных офферов")
                            .font(.system(size: 14))
                            .foregroundColor(.white.opacity(0.4))
                            .padding(.vertical, 10)
                    } else {
                        ForEach(vm.offers) { offer in
                            SellerOfferRow(
                                offer: offer,
                                onFeature: { days in
                                    Task { await vm.featureOffer(offer, days: days) }
                                },
                                onEdit: {
                                    editingOffer = offer
                                },
                                onDelete: {
                                    Task {
                                        _ = try? await OffersService.shared.deleteOffer(id: offer.id)
                                        await vm.loadData(currentUser: authVM.user)
                                    }
                                }
                            )
                        }
                    }
                }
                .padding(20)
                .perklySurface(cornerRadius: 20)
                .padding(.horizontal, 20)
                
                // Recent transactions
                VStack(alignment: .leading, spacing: 14) {
                    HStack {
                        Text("Заказы")
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundColor(.white)

                        Spacer()

                        Text("\(vm.transactions.count)")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.white.opacity(0.4))
                    }

                    if let error = vm.error {
                        Text(error)
                            .font(.system(size: 12))
                            .foregroundColor(.perklyRed)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    
                    if vm.transactions.isEmpty {
                        Text("Продаж пока нет")
                            .font(.system(size: 14))
                            .foregroundColor(.white.opacity(0.4))
                            .padding(.vertical, 10)
                    } else {
                        ForEach(vm.transactions) { tx in
                            SellerTransactionRow(transaction: tx) {
                                Task {
                                    await vm.cancelTransaction(tx)
                                }
                            }
                        }
                    }
                }
                .padding(20)
                .perklySurface(cornerRadius: 20)
                .padding(.horizontal, 20)
                .padding(.bottom, 30)
            }
            .padding(.top, 8)
        }
        .refreshable {
            await vm.loadData(currentUser: authVM.user)
        }
        .sheet(isPresented: $showCreateOffer) {
            CreateOfferSheet(onSuccess: {
                Task { await vm.loadData() }
            })
            .presentationDetents([.large])
            .presentationDragIndicator(.visible)
        }
        .sheet(item: $editingOffer) { offer in
            SellerOfferEditSheet(offer: offer, onSave: {
                Task { await vm.loadData(currentUser: authVM.user) }
            })
            .presentationDetents([.large])
            .presentationDragIndicator(.visible)
        }
        .sheet(isPresented: $showCreateEvent) {
            CreateEventSheet(capabilities: vm.capabilities, onSuccess: {
                Task {
                    await authVM.refreshUser()
                    await vm.loadData(currentUser: authVM.user)
                }
            })
            .presentationDetents([.large])
            .presentationDragIndicator(.visible)
        }
        .sheet(isPresented: $showCreatePromocode) {
            CreatePromocodeSheet(offers: vm.offers, isSaving: vm.isSavingPromocode) { input in
                await vm.createPromocode(input)
            }
            .presentationDetents([.large])
            .presentationDragIndicator(.visible)
        }
        .sheet(item: $editingPromocode) { promocode in
            CreatePromocodeSheet(
                offers: vm.offers,
                isSaving: vm.isSavingPromocode,
                editingPromocode: promocode
            ) { input in
                await vm.updatePromocode(promocode, input: input)
            }
            .presentationDetents([.large])
            .presentationDragIndicator(.visible)
        }
        .sheet(isPresented: $showSubscriptionSheet) {
            SubscriptionSheet(currentTier: authVM.user?.tierEnum ?? .silver, onSuccess: {
                Task {
                    await authVM.refreshUser()
                    await vm.loadData(currentUser: authVM.user)
                }
            })
            .presentationDetents([.large])
            .presentationDragIndicator(.visible)
        }
    }

    private var shouldShowCompanyGate: Bool {
        guard authVM.user?.roleEnum != .admin else { return false }
        return vm.company?.status != .active
    }

    private var companyGateContent: some View {
        VStack(spacing: 18) {
            Spacer(minLength: 24)

            Image(systemName: companyGateIcon)
                .font(.system(size: 48, weight: .semibold))
                .foregroundColor(companyGateColor)
                .frame(width: 86, height: 86)
                .background(companyGateColor.opacity(0.13))
                .clipShape(Circle())

            VStack(spacing: 8) {
                Text(companyGateTitle)
                    .font(.system(size: 24, weight: .heavy))
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)

                Text(companyGateSubtitle)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.white.opacity(0.52))
                    .multilineTextAlignment(.center)
                    .lineSpacing(3)
            }
            .padding(.horizontal, 26)

            if let company = vm.company {
                VStack(alignment: .leading, spacing: 12) {
                    CompanyInfoRow(title: "Бренд", value: company.brandName)
                    CompanyInfoRow(title: "Юр. название", value: company.legalName)
                    CompanyInfoRow(title: "ИНН", value: company.inn)
                    CompanyInfoRow(title: "Статус", value: company.status.title)
                }
                .padding(18)
                .perklySurface(cornerRadius: 20)
                .padding(.horizontal, 20)
            }

            if vm.company == nil {
                Button {
                    showCompanyApply = true
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "doc.badge.plus")
                        Text("Подать заявку")
                    }
                    .font(.system(size: 15, weight: .heavy))
                    .foregroundColor(.black)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 15)
                    .background(Color.perklyGreen)
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                }
                .buttonStyle(.plain)
                .padding(.horizontal, 28)
            } else if vm.company?.status == .pendingModeration {
                Button {
                    Task { await vm.loadData(currentUser: authVM.user) }
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "arrow.clockwise")
                        Text("Обновить статус")
                    }
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 15)
                    .background(Color.white.opacity(0.08))
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                }
                .buttonStyle(.plain)
                .padding(.horizontal, 28)
            }

            if let error = vm.error {
                Text(error)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.perklyRed)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 28)
            }

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.perklyDark)
    }

    private var companyGateIcon: String {
        switch vm.company?.status {
        case .pendingModeration: return "hourglass"
        case .suspended: return "lock.trianglebadge.exclamationmark"
        case .active: return "checkmark.seal.fill"
        case nil: return "building.2.fill"
        }
    }

    private var companyGateColor: Color {
        switch vm.company?.status {
        case .pendingModeration: return .perklyGold
        case .suspended: return .perklyRed
        case .active: return .perklyGreen
        case nil: return .perklyGreen
        }
    }

    private var companyGateTitle: String {
        switch vm.company?.status {
        case .pendingModeration: return "Заявка на модерации"
        case .suspended: return "Компания заблокирована"
        case .active: return "Компания активна"
        case nil: return "Подключите компанию"
        }
    }

    private var companyGateSubtitle: String {
        switch vm.company?.status {
        case .pendingModeration:
            return "Мы проверяем данные компании. После подтверждения откроются офферы, промокоды и заказы."
        case .suspended:
            return "Seller-инструменты временно недоступны. Обратитесь в поддержку или администратору."
        case .active:
            return "Seller-инструменты доступны."
        case nil:
            return "Чтобы продавать офферы и выпускать промокоды, сначала подайте заявку компании."
        }
    }

    private var canPublishToTopka: Bool {
        vm.capabilities?.canPublishTopka ?? localCanPublishToTopka
    }

    private var localCanPublishToTopka: Bool {
        authVM.user?.tierEnum == .platinum || authVM.user?.roleEnum == .admin
    }

    private var topkaSubtitle: String {
        if canPublishToTopka {
            return "События публикуются в городскую ленту"
        }
        return vm.capabilities?.upgrade?.reason ?? "Для публикации нужна Platinum-подписка"
    }

    private var topkaLimitText: String {
        guard let capabilities = vm.capabilities else { return "0/0" }
        let limit = capabilities.limits.topkaMonthlyLimit
        if limit < 0 { return "∞" }
        return "\(capabilities.usage.topkaPublishedThisMonth)/\(limit)"
    }

    private var planColor: Color {
        switch vm.capabilities?.tierEnum ?? authVM.user?.tierEnum ?? .silver {
        case .silver: return .white.opacity(0.55)
        case .gold: return .perklyGold
        case .platinum: return .perklyPlatinum
        }
    }
}

// MARK: - Seller Transaction Row

private extension PromocodeStatus {
    var sellerTitle: String {
        switch self {
        case .active: return "Активен"
        case .paused: return "Пауза"
        case .archived: return "Архив"
        }
    }

    var sellerColor: Color {
        switch self {
        case .active: return .perklyGreen
        case .paused: return .perklyOrange
        case .archived: return .white.opacity(0.45)
        }
    }
}

private extension PromocodeCodeType {
    var sellerTitle: String {
        switch self {
        case .staticCode: return "STATIC"
        case .dynamic: return "DYNAMIC"
        }
    }
}

struct SellerPromocodeRow: View {
    let promocode: Promocode
    let analytics: PromocodeAnalyticsItem?
    let onEdit: () -> Void
    let onStatus: (PromocodeStatus) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 10) {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 7) {
                        Text(promocode.title)
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.white)
                            .lineLimit(1)

                        Text(promocode.codeType.sellerTitle)
                            .font(.system(size: 9, weight: .heavy))
                            .foregroundColor(.black)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 3)
                            .background(Color.perklyGreen)
                            .clipShape(Capsule())
                    }

                    Text(promocode.offer?.title ?? "Для всей компании")
                        .font(.system(size: 12))
                        .foregroundColor(.white.opacity(0.45))
                        .lineLimit(1)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 4) {
                    Text("-\(Int(promocode.discountValue))%")
                        .font(.system(size: 16, weight: .heavy))
                        .foregroundColor(.perklyGreen)

                    Text(promocode.status.sellerTitle)
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(promocode.status.sellerColor)
                }
            }

            HStack(spacing: 8) {
                SellerPromocodeMetric(title: "Активации", value: "\(analytics?.activations ?? 0)")
                SellerPromocodeMetric(title: "Copy", value: "\(Int(analytics?.copyRate ?? 0))%")
                SellerPromocodeMetric(title: "Use", value: "\(Int(analytics?.useRate ?? 0))%")
            }

            HStack(spacing: 8) {
                statusButton("Изменить", color: .perklyPurple, action: onEdit)

                if promocode.status != .active {
                    statusButton("Активировать", color: .perklyGreen) {
                        onStatus(.active)
                    }
                }
                if promocode.status == .active {
                    statusButton("Пауза", color: .perklyOrange) {
                        onStatus(.paused)
                    }
                }
                if promocode.status != .archived {
                    statusButton("Архив", color: .white.opacity(0.45)) {
                        onStatus(.archived)
                    }
                }
            }
        }
        .padding(13)
        .background(Color.white.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private func statusButton(_ title: String, color: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(color)
                .padding(.horizontal, 10)
                .padding(.vertical, 7)
                .background(color.opacity(0.12))
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }
}

struct SellerPromocodeMetric: View {
    let title: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(value)
                .font(.system(size: 13, weight: .heavy))
                .foregroundColor(.white)
            Text(title)
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(.white.opacity(0.42))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .background(Color.white.opacity(0.045))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

struct CreatePromocodeSheet: View {
    let offers: [Offer]
    let isSaving: Bool
    var editingPromocode: Promocode?
    let onSubmit: (PromocodeInput) async -> Bool

    @Environment(\.dismiss) private var dismiss
    @State private var title = ""
    @State private var description = ""
    @State private var codeType: PromocodeCodeType = .staticCode
    @State private var code = ""
    @State private var discountValue = "10"
    @State private var maxActivations = ""
    @State private var perUserLimit = "1"
    @State private var selectedOfferId = ""
    @State private var hasValidFrom = false
    @State private var validFrom = Date()
    @State private var hasValidTo = false
    @State private var validTo = Calendar.current.date(byAdding: .day, value: 30, to: Date()) ?? Date()
    @State private var error: String?

    init(
        offers: [Offer],
        isSaving: Bool,
        editingPromocode: Promocode? = nil,
        onSubmit: @escaping (PromocodeInput) async -> Bool
    ) {
        self.offers = offers
        self.isSaving = isSaving
        self.editingPromocode = editingPromocode
        self.onSubmit = onSubmit
        _title = State(initialValue: editingPromocode?.title ?? "")
        _description = State(initialValue: editingPromocode?.description ?? "")
        _codeType = State(initialValue: editingPromocode?.codeType ?? .staticCode)
        _code = State(initialValue: editingPromocode?.code ?? "")
        _discountValue = State(initialValue: editingPromocode.map { String(Int($0.discountValue)) } ?? "10")
        _maxActivations = State(initialValue: editingPromocode?.maxActivations.map(String.init) ?? "")
        _perUserLimit = State(initialValue: editingPromocode.map { String($0.perUserLimit) } ?? "1")
        _selectedOfferId = State(initialValue: editingPromocode?.offerId ?? "")
        let parsedValidFrom = Self.parseDate(editingPromocode?.validFrom)
        let parsedValidTo = Self.parseDate(editingPromocode?.validTo)
        _hasValidFrom = State(initialValue: parsedValidFrom != nil)
        _validFrom = State(initialValue: parsedValidFrom ?? Date())
        _hasValidTo = State(initialValue: parsedValidTo != nil)
        _validTo = State(initialValue: parsedValidTo ?? (Calendar.current.date(byAdding: .day, value: 30, to: Date()) ?? Date()))
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    field("Название", text: $title, placeholder: "Weekend 15%")
                    field("Описание", text: $description, placeholder: "Коротко для клиента")

                    Picker("Тип кода", selection: $codeType) {
                        Text("STATIC").tag(PromocodeCodeType.staticCode)
                        Text("DYNAMIC").tag(PromocodeCodeType.dynamic)
                    }
                    .pickerStyle(.segmented)

                    if codeType == .staticCode {
                        field("Код", text: $code, placeholder: "PERKLY15")
                            .textInputAutocapitalization(.characters)
                    }

                    field("Скидка, %", text: $discountValue, placeholder: "10")
                        .keyboardType(.decimalPad)

                    field("Общий лимит", text: $maxActivations, placeholder: "100")
                        .keyboardType(.numberPad)

                    field("Лимит на пользователя", text: $perUserLimit, placeholder: "1")
                        .keyboardType(.numberPad)

                    Picker("Оффер", selection: $selectedOfferId) {
                        Text("Для всей компании").tag("")
                        ForEach(offers) { offer in
                            Text(offer.safeTitle).tag(offer.id)
                        }
                    }
                    .pickerStyle(.menu)
                    .padding(14)
                    .background(Color.white.opacity(0.06))
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

                    VStack(alignment: .leading, spacing: 10) {
                        Toggle("Дата старта", isOn: $hasValidFrom)
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(.white)
                            .tint(.perklyGreen)

                        if hasValidFrom {
                            DatePicker("", selection: $validFrom, displayedComponents: [.date, .hourAndMinute])
                                .datePickerStyle(.compact)
                                .labelsHidden()
                                .colorScheme(.dark)
                        }
                    }
                    .padding(14)
                    .background(Color.white.opacity(0.06))
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

                    VStack(alignment: .leading, spacing: 10) {
                        Toggle("Дата окончания", isOn: $hasValidTo)
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(.white)
                            .tint(.perklyGreen)

                        if hasValidTo {
                            DatePicker("", selection: $validTo, displayedComponents: [.date, .hourAndMinute])
                                .datePickerStyle(.compact)
                                .labelsHidden()
                                .colorScheme(.dark)
                        }
                    }
                    .padding(14)
                    .background(Color.white.opacity(0.06))
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

                    if let error {
                        Text(error)
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(.perklyRed)
                    }

                    Button {
                        Task { await submit() }
                    } label: {
                        HStack {
                            if isSaving {
                                ProgressView().tint(.black)
                            } else {
                                Image(systemName: "ticket.fill")
                                Text(editingPromocode == nil ? "Создать промокод" : "Сохранить")
                            }
                        }
                        .font(.system(size: 15, weight: .heavy))
                        .foregroundColor(.black)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 15)
                        .background(Color.perklyGreen)
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    }
                    .buttonStyle(.plain)
                    .disabled(isSaving)
                }
                .padding(20)
            }
            .background(Color.perklyDark.ignoresSafeArea())
            .navigationTitle(editingPromocode == nil ? "Новый промокод" : "Промокод")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Закрыть") { dismiss() }
                        .foregroundColor(.white)
                }
            }
        }
    }

    private func field(_ label: String, text: Binding<String>, placeholder: String) -> some View {
        VStack(alignment: .leading, spacing: 7) {
            Text(label)
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(.white.opacity(0.58))

            TextField(placeholder, text: text)
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(.white)
                .padding(14)
                .background(Color.white.opacity(0.06))
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
    }

    private func submit() async {
        let cleanTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanTitle.isEmpty else {
            error = "Введите название"
            return
        }

        guard let discount = Double(discountValue.replacingOccurrences(of: ",", with: ".")), discount > 0, discount <= 100 else {
            error = "Скидка должна быть от 1 до 100"
            return
        }

        guard let perUser = Int(perUserLimit), perUser > 0 else {
            error = "Лимит на пользователя должен быть больше 0"
            return
        }

        let maxLimit = Int(maxActivations)
        let cleanCode = code.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        if codeType == .staticCode && cleanCode.isEmpty {
            error = "Для STATIC нужен код"
            return
        }

        if hasValidFrom && hasValidTo && validTo <= validFrom {
            error = "Дата окончания должна быть позже даты старта"
            return
        }

        let input = PromocodeInput(
            offerId: selectedOfferId.isEmpty ? nil : selectedOfferId,
            title: cleanTitle,
            description: description.trimmingCharacters(in: .whitespacesAndNewlines),
            codeType: codeType,
            code: codeType == .staticCode ? cleanCode : nil,
            discountValue: discount,
            maxActivations: maxLimit,
            perUserLimit: perUser,
            validFrom: hasValidFrom ? Self.isoString(from: validFrom) : nil,
            validTo: hasValidTo ? Self.isoString(from: validTo) : nil,
            status: editingPromocode?.status ?? .active
        )

        if await onSubmit(input) {
            dismiss()
        }
    }

    private static func parseDate(_ value: String?) -> Date? {
        guard let value else { return nil }
        let fractional = ISO8601DateFormatter()
        fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = fractional.date(from: value) {
            return date
        }
        return ISO8601DateFormatter().date(from: value)
    }

    private static func isoString(from date: Date) -> String {
        ISO8601DateFormatter().string(from: date)
    }
}

struct CompanyInfoRow: View {
    let title: String
    let value: String

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Text(title)
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(.white.opacity(0.45))
            Spacer(minLength: 16)
            Text(value)
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(.white)
                .multilineTextAlignment(.trailing)
        }
    }
}

struct CompanyApplySheet: View {
    let isApplying: Bool
    let onSubmit: (String, String, String, String?) async -> Bool

    @Environment(\.dismiss) private var dismiss
    @State private var legalName = ""
    @State private var brandName = ""
    @State private var inn = ""
    @State private var phone = ""
    @State private var error: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Заявка компании")
                            .font(.system(size: 24, weight: .heavy))
                            .foregroundColor(.white)
                        Text("После модерации откроются seller tools: офферы, промокоды, заказы и аналитика.")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.white.opacity(0.52))
                            .lineSpacing(3)
                    }
                    .padding(.bottom, 4)

                    field("Юридическое название", text: $legalName, placeholder: "OOO Perkly Market")
                    field("Название бренда", text: $brandName, placeholder: "Perkly")
                    field("ИНН", text: $inn, placeholder: "123456789")
                        .keyboardType(.numberPad)
                        .onChange(of: inn) { oldValue, newValue in
                            inn = String(newValue.filter(\.isNumber).prefix(9))
                        }
                    field("Телефон", text: $phone, placeholder: "+998...")
                        .keyboardType(.phonePad)

                    if let error {
                        Text(error)
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(.perklyRed)
                    }

                    Button {
                        Task { await submit() }
                    } label: {
                        HStack(spacing: 8) {
                            if isApplying {
                                ProgressView().tint(.black)
                            } else {
                                Image(systemName: "paperplane.fill")
                                Text("Отправить на модерацию")
                            }
                        }
                        .font(.system(size: 15, weight: .heavy))
                        .foregroundColor(.black)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 15)
                        .background(Color.perklyGreen)
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    }
                    .buttonStyle(.plain)
                    .disabled(isApplying)
                }
                .padding(20)
            }
            .background(Color.perklyDark.ignoresSafeArea())
            .navigationTitle("Компания")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Закрыть") { dismiss() }
                        .foregroundColor(.white)
                }
            }
        }
    }

    private func field(_ title: String, text: Binding<String>, placeholder: String) -> some View {
        VStack(alignment: .leading, spacing: 7) {
            Text(title)
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(.white.opacity(0.58))

            TextField(placeholder, text: text)
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(.white)
                .textInputAutocapitalization(.never)
                .padding(14)
                .background(Color.white.opacity(0.06))
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
    }

    private func submit() async {
        let cleanLegalName = legalName.trimmingCharacters(in: .whitespacesAndNewlines)
        let cleanBrandName = brandName.trimmingCharacters(in: .whitespacesAndNewlines)
        let cleanInn = inn.trimmingCharacters(in: .whitespacesAndNewlines)
        let cleanPhone = phone.trimmingCharacters(in: .whitespacesAndNewlines)

        guard !cleanLegalName.isEmpty else {
            error = "Введите юридическое название"
            return
        }
        guard !cleanBrandName.isEmpty else {
            error = "Введите название бренда"
            return
        }
        guard cleanInn.count == 9 else {
            error = "ИНН должен содержать 9 цифр"
            return
        }

        let didSubmit = await onSubmit(
            cleanLegalName,
            cleanBrandName,
            cleanInn,
            cleanPhone.isEmpty ? nil : cleanPhone
        )

        if didSubmit {
            dismiss()
        }
    }
}

struct SellerTransactionRow: View {
    let transaction: Transaction
    var onCancel: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            Circle()
                .fill(statusColor.opacity(0.15))
                .frame(width: 36, height: 36)
                .overlay(
                    Image(systemName: transaction.statusEnum.icon)
                        .font(.system(size: 14))
                        .foregroundColor(statusColor)
                )

            VStack(alignment: .leading, spacing: 3) {
                Text(transaction.offer?.title ?? "Продажа")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.white)
                    .lineLimit(1)

                Text(statusText)
                    .font(.system(size: 12))
                    .foregroundColor(statusColor)

                Text(transaction.buyer?.displayName ?? "Покупатель")
                    .font(.system(size: 12))
                    .foregroundColor(.white.opacity(0.4))
                    .lineLimit(1)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 6) {
                Text("\(uzs(transaction.price))")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(statusColor)

                if transaction.statusEnum == .escrow {
                    Button {
                        onCancel()
                    } label: {
                        Text("Отменить")
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundColor(.perklyRed)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(Color.perklyRed.opacity(0.12))
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding(.vertical, 6)
    }

    private var statusText: String {
        switch transaction.statusEnum {
        case .escrow:
            return "Ждет подтверждения покупателя"
        default:
            return transaction.statusEnum.displayName
        }
    }

    private var statusColor: Color {
        switch transaction.statusEnum {
        case .success, .completed, .activated: return .perklyGreen
        case .pending, .escrow, .paid: return .perklyGold
        case .failed, .cancelled: return .perklyRed
        case .refunded: return .perklyCyan
        case .disputed: return .perklyOrange
        }
    }
}

// MARK: - Seller Stat Card

struct SellerStatCard: View {
    let title: String
    let value: String
    let icon: String
    let gradient: LinearGradient
    
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Image(systemName: icon)
                .font(.system(size: 20))
                .foregroundStyle(gradient)
            
            Text(value)
                .font(.system(size: 24, weight: .bold))
                .foregroundColor(.white)
            
            Text(title)
                .font(.system(size: 12))
                .foregroundColor(.white.opacity(0.4))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(18)
        .perklySurface(cornerRadius: 16)
    }
}

struct MiniMetric: View {
    let title: String
    let value: String
    let color: Color

    var body: some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.system(size: 16, weight: .bold))
                .foregroundColor(.white)
                .lineLimit(1)

            Text(title)
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(.white.opacity(0.45))
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .background(color.opacity(0.12))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct SellerEventRow: View {
    let event: Event

    var body: some View {
        HStack(spacing: 12) {
            RoundedRectangle(cornerRadius: 10)
                .fill(Color.perklyPurple.opacity(0.16))
                .frame(width: 42, height: 42)
                .overlay(
                    Image(systemName: "flame.fill")
                        .font(.system(size: 16))
                        .foregroundStyle(Color.primaryGradient)
                )

            VStack(alignment: .leading, spacing: 3) {
                Text(event.title)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.white)
                    .lineLimit(1)

                Text("\(event.shortDisplayDate) • \(event.location)")
                    .font(.system(size: 12))
                    .foregroundColor(.white.opacity(0.4))
                    .lineLimit(1)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 4) {
                Label("\(event.viewersCount)", systemImage: "eye.fill")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(.perklyPurple)

                Label("\(event.participantsCount)", systemImage: "person.2.fill")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(.perklyGreen)
            }
            .labelStyle(.titleAndIcon)
        }
        .padding(.vertical, 6)
    }
}

// MARK: - Seller Offer Row

struct SellerOfferRow: View {
    let offer: Offer
    var onFeature: (Int) -> Void
    var onEdit: () -> Void
    var onDelete: () -> Void
    
    var body: some View {
        VStack(spacing: 10) {
            HStack(spacing: 12) {
                RoundedRectangle(cornerRadius: 10)
                    .fill(Color.primaryGradient)
                    .frame(width: 42, height: 42)
                    .overlay(
                        Image(systemName: "tag.fill")
                            .font(.system(size: 16))
                            .foregroundColor(.white)
                    )
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(offer.safeTitle)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.white)
                        .lineLimit(1)
                    
                    HStack(spacing: 8) {
                        Text("\(uzs(offer.safePrice))")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.perklyGreen)
                        
                        if offer.isFeaturedNow {
                            Text("Продвигается")
                                .font(.system(size: 10, weight: .semibold))
                                .foregroundColor(.perklyPurple)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.perklyPurple.opacity(0.12))
                                .clipShape(Capsule())
                        } else if offer.safeIsExclusive {
                            Text("Эксклюзив")
                                .font(.system(size: 10, weight: .semibold))
                                .foregroundColor(.perklyGold)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.perklyGold.opacity(0.12))
                                .clipShape(Capsule())
                        }
                    }
                }
                
                
                Spacer()
                
                Menu {
                    Button(action: onEdit) {
                        Label("Редактировать", systemImage: "pencil")
                    }
                    Button(role: .destructive, action: onDelete) {
                        Label("Удалить", systemImage: "trash")
                    }
                } label: {
                    Image(systemName: "ellipsis")
                        .font(.system(size: 18))
                        .foregroundColor(.white.opacity(0.5))
                        .padding(8)
                        .background(Color.white.opacity(0.05))
                        .clipShape(Circle())
                }
            }

            if offer.safeIsActive {
                HStack(spacing: 8) {
                    Text("Поднять в каталоге:")
                        .font(.system(size: 11))
                        .foregroundColor(.white.opacity(0.45))

                    Spacer()

                    Button {
                        onFeature(1)
                    } label: {
                        Text("12 000 soʻm / 1 день")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.perklyPurple)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 5)
                            .background(Color.perklyPurple.opacity(0.12))
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)

                    Button {
                        onFeature(7)
                    } label: {
                        Text("84 000 soʻm / 7 дней")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.perklyGreen)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 5)
                            .background(Color.perklyGreen.opacity(0.12))
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding(.vertical, 6)
    }
}
