import CoreLocation
import SwiftUI

private enum CatalogMetrics {
    static let horizontalInset = PerklyDesign.Spacing.lg
    static let sectionSpacing = PerklyDesign.Spacing.xl
    static let surfaceRadius = PerklyDesign.Radius.card
    static let compactRadius = PerklyDesign.Radius.control
    static let controlHeight = PerklyDesign.Size.controlHeight
}

struct CatalogView: View {
    @StateObject private var vm = CatalogViewModel()
    @StateObject private var locationManager = LocationManager.shared
    @EnvironmentObject var authVM: AuthViewModel
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @Environment(\.scenePhase) private var scenePhase
    @State private var searchTask: Task<Void, Never>?
    @State private var showCategoryPicker = false
    @State private var categoryWasApplied = false

    var initialCategory: String?

    private var favoriteOffers: [Offer] {
        vm.savedOffers.map(\.offer)
    }

    var body: some View {
        GeometryReader { proxy in
            let contentWidth = proxy.size.width

            ScrollView(.vertical, showsIndicators: false) {
                VStack(alignment: .leading, spacing: CatalogMetrics.sectionSpacing) {
                    header
                        .padding(.horizontal, CatalogMetrics.horizontalInset)
                    segmentRail

                    if vm.isLoading && vm.offers.isEmpty {
                        loadingState
                    } else if vm.error != nil && vm.offers.isEmpty {
                        errorState
                    } else {
                        segmentContent
                    }
                }
                .frame(width: contentWidth, alignment: .leading)
                .padding(.top, 8)
                .padding(.bottom, 34)
            }
        }
        .background(catalogBackground)
        .safeAreaInset(edge: .bottom, spacing: 0) {
            categoryDrawerHandle
                .padding(.bottom, 8)
        }
        .navigationTitle("Каталог")
        .navigationBarTitleDisplayMode(.inline)
        .searchable(
            text: $vm.searchQuery,
            placement: .navigationBarDrawer(displayMode: .always),
            prompt: "Что хотите найти?"
        )
        .refreshable {
            await vm.loadCatalog(location: locationManager.lastLocation, isAuthenticated: authVM.isAuthenticated)
        }
        .task(id: initialCategory ?? "marketplace") {
            if let initialCategory {
                vm.selectedCategory = initialCategory
                vm.selectedFulfillmentType = nil
                vm.selectedCategoryOption = CatalogCategoryOption.matching(category: initialCategory) ?? .all
            }
            locationManager.startUpdating()
            await vm.loadCatalog(location: locationManager.lastLocation, isAuthenticated: authVM.isAuthenticated)
        }
        .task {
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(20))
                guard !Task.isCancelled else { return }
                await vm.loadOffers(reset: true)
            }
        }
        .onChange(of: scenePhase) { _, phase in
            guard phase == .active else { return }
            Task { await vm.loadOffers(reset: true) }
        }
        .onChange(of: authVM.isAuthenticated) { oldValue, newValue in
            Task { await vm.loadSavedOffers(isAuthenticated: newValue) }
        }
        .onReceive(locationManager.$lastLocation.compactMap { $0 }) { location in
            Task { await vm.loadNearby(location: location) }
        }
        .onChange(of: vm.searchQuery) { _, _ in
            scheduleSearch()
        }
        .onDisappear {
            searchTask?.cancel()
        }
        .sheet(isPresented: $showCategoryPicker) {
            CatalogCategoryPickerSheet(
                selected: vm.selectedCategoryOption,
                didApply: categoryWasApplied
            ) { option in
                await vm.selectCategoryOption(
                    option,
                    location: locationManager.lastLocation,
                    isAuthenticated: authVM.isAuthenticated
                )
                categoryWasApplied = true
            }
            .presentationDetents([.medium, .large])
            .presentationDragIndicator(.hidden)
            .presentationBackground(.ultraThinMaterial)
        }
    }

    private var catalogBackground: some View {
        ZStack {
            Color.perklyDark.ignoresSafeArea()

            LinearGradient(
                colors: [
                    Color.perklyPink.opacity(0.18),
                    Color.perklyDark.opacity(0.0),
                    Color.perklyDark
                ],
                startPoint: .topTrailing,
                endPoint: .center
            )
            .ignoresSafeArea()
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text("Найти выгоду")
                .font(.largeTitle.bold())
                .foregroundColor(.perklyTextPrimary)
                .accessibilityAddTraits(.isHeader)

            Text("Цифровые товары, подписки и промокоды в одном поиске")
                .font(.subheadline.weight(.medium))
                .foregroundColor(Color.perklyTextPrimary.opacity(0.55))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var segmentRail: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(CatalogSegment.allCases) { segment in
                    CatalogSegmentChip(
                        segment: segment,
                        isSelected: vm.selectedSegment == segment,
                        count: segmentCount(for: segment)
                    ) {
                        withAnimation(.spring(response: 0.28, dampingFraction: 0.82)) {
                            vm.selectSegment(segment)
                        }
                        if segment == .favorites {
                            Task { await vm.refreshFavoritesIfNeeded(isAuthenticated: authVM.isAuthenticated) }
                        }
                    }
                }
            }
            .padding(.horizontal, CatalogMetrics.horizontalInset)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var categoryDrawerHandle: some View {
        Button {
            openCategoryPicker()
        } label: {
            HStack(spacing: 12) {
                Image(systemName: vm.selectedCategoryOption.icon)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(Color.perklyPurple)
                    .frame(width: 32, height: 32)
                    .background(Color.perklyPurple.opacity(0.12), in: Circle())

                VStack(alignment: .leading, spacing: 2) {
                    Text("Категории")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(Color.perklyTextPrimary)

                    Text(vm.selectedCategoryOption.title)
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(Color.perklyTextSecondary)
                        .lineLimit(1)
                }

                Spacer()

                Text("Свайп вверх")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(Color.perklyTextMuted)

                Image(systemName: "chevron.up")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(Color.perklyTextSecondary)
            }
            .padding(.horizontal, 12)
            .frame(height: 54)
            .perklySurface(cornerRadius: 18, fill: Color.perklyCardBg)
            .contentShape(Rectangle())
        }
        .buttonStyle(PerklyPressStyle())
        .padding(.horizontal, CatalogMetrics.horizontalInset)
        .highPriorityGesture(
            DragGesture(minimumDistance: 12)
                .onEnded { value in
                    guard value.translation.height < -28,
                          abs(value.translation.height) > abs(value.translation.width) else { return }
                    openCategoryPicker()
                }
        )
        .accessibilityLabel(L10n.format("catalog.category.selected", vm.selectedCategoryOption.title))
        .accessibilityHint(L10n.tr("catalog.category.open_hint"))
    }

    private func openCategoryPicker() {
        categoryWasApplied = false
        HapticManager.shared.playSelection()
        showCategoryPicker = true
    }

    @ViewBuilder
    private var segmentContent: some View {
        switch vm.selectedSegment {
        case .today:
            todayContent
        case .hot:
            hotContent
        case .nearby:
            nearbyContent
        case .free:
            freeContent
        case .stores:
            storesContent
        case .favorites:
            favoritesContent
        }
    }

    private var todayContent: some View {
        VStack(alignment: .leading, spacing: CatalogMetrics.sectionSpacing) {
            if normalizedSearchQuery.isEmpty,
               let heroOffer = vm.promotedOffers.first ?? vm.offers.first {
                PerklyOfferNavigationLink(offerId: heroOffer.id) {
                    CatalogHeroCard(
                        offer: heroOffer,
                        distanceText: distanceText(for: heroOffer),
                        isFavorite: vm.savedOfferIds.contains(heroOffer.id)
                    )
                }
                .buttonStyle(.plain)
                .accessibilityLabel(heroOffer.catalogAccessibilityLabel)
                .accessibilityHint("Открывает предложение")
                .padding(.horizontal, CatalogMetrics.horizontalInset)
                .overlay(alignment: .topTrailing) {
                    favoriteButton(for: heroOffer, size: 36)
                        .padding(14)
                        .padding(.trailing, CatalogMetrics.horizontalInset)
                }
            }

            allOffersGrid(
                title: normalizedSearchQuery.isEmpty ? "Рекомендации" : "Результаты поиска",
                offers: normalizedSearchQuery.isEmpty
                    ? vm.offers.filter { $0.id != (vm.promotedOffers.first ?? vm.offers.first)?.id }
                    : vm.offers
            )
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var hotContent: some View {
        VStack(alignment: .leading, spacing: 18) {
            CatalogStatusBanner(
                icon: "megaphone.fill",
                title: "Горячие позиции",
                subtitle: "Рекомендуемые предложения от продавцов",
                accent: .perklyPink
            )
            .padding(.horizontal, CatalogMetrics.horizontalInset)

            allOffersGrid(
                title: "Продвигаемые товары",
                offers: vm.promotedOffers.isEmpty ? vm.offers : vm.promotedOffers,
                showPromotedLabel: true
            )
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var nearbyContent: some View {
        VStack(alignment: .leading, spacing: 18) {
            radiusPicker

            if locationManager.lastLocation == nil {
                CatalogStatusBanner(
                    icon: "location.slash.fill",
                    title: "Геолокация выключена",
                    subtitle: "Разрешите доступ, чтобы сортировать предложения по расстоянию: 500 м, 2 км, рядом с вами.",
                    accent: .perklyCyan,
                    actionTitle: "Включить",
                    action: requestLocation
                )
                .padding(.horizontal, CatalogMetrics.horizontalInset)
            }

            allOffersGrid(
                title: "Предложения поблизости",
                offers: vm.nearbyOffers,
                emptyTitle: locationManager.lastLocation == nil ? "Ждем геолокацию" : "Поблизости пока пусто",
                emptySubtitle: locationManager.lastLocation == nil ? "После разрешения появятся ближайшие продавцы." : "Попробуйте радиус побольше."
            )
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var freeContent: some View {
        VStack(alignment: .leading, spacing: 18) {
            CatalogStatusBanner(
                icon: "qrcode",
                title: "Бесплатные коды",
                subtitle: "Получите промокод или цифровой бонус бесплатно",
                accent: .perklyGreen
            )
            .padding(.horizontal, CatalogMetrics.horizontalInset)

            allOffersGrid(
                title: "Получить бесплатно",
                offers: vm.freeOffers,
                emptyTitle: "Бесплатных кодов пока нет",
                emptySubtitle: "Они появятся здесь после публикации продавцами."
            )
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var storesContent: some View {
        VStack(alignment: .leading, spacing: 16) {
            SectionTitle(title: "Магазины", subtitle: "Страницы продавцов с баннером, рейтингом, подпиской и активными предложениями")
                .padding(.horizontal, CatalogMetrics.horizontalInset)

            if vm.stores.isEmpty {
                emptyState(title: "Магазинов пока нет", subtitle: "Когда продавцы опубликуют предложения, они появятся здесь.")
                    .padding(.horizontal, CatalogMetrics.horizontalInset)
            } else {
                LazyVStack(spacing: 12) {
                    ForEach(vm.stores) { store in
                        NavigationLink(destination: StorefrontView(store: store)) {
                            StoreListCard(store: store)
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("\(store.name), \(store.subtitle), \(store.offersCount) предложений")
                        .accessibilityHint("Открывает страницу магазина")
                    }
                }
                .padding(.horizontal, CatalogMetrics.horizontalInset)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var favoritesContent: some View {
        VStack(alignment: .leading, spacing: 18) {
            CatalogStatusBanner(
                icon: "heart.fill",
                title: "Избранное",
                subtitle: "Сохраняйте товары, коды и магазины, чтобы быстро вернуться к покупке.",
                accent: .perklyPink
            )
            .padding(.horizontal, CatalogMetrics.horizontalInset)

            if vm.isLoadingSavedOffers && vm.savedOffers.isEmpty {
                ProgressView("Загружаем избранное…")
                    .tint(.perklyPink)
                    .foregroundColor(Color.perklyTextPrimary.opacity(0.65))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 48)
            } else {
                allOffersGrid(
                    title: "Сохраненные предложения",
                    offers: favoriteOffers,
                    emptyTitle: "Вы еще ничего не сохранили",
                    emptySubtitle: "Нажмите сердечко на карточке предложения."
                )
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var radiusPicker: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(CatalogRadius.allCases) { radius in
                    Button {
                        Task { await vm.selectRadius(radius, location: locationManager.lastLocation) }
                    } label: {
                        Text(radius.title)
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(vm.selectedRadius == radius ? .black : .white.opacity(0.64))
                            .padding(.horizontal, 14)
                            .frame(minHeight: PerklyDesign.Size.minimumTouchTarget)
                            .background(vm.selectedRadius == radius ? Color.perklyCyan : Color.perklyOverlay.opacity(0.06))
                            .clipShape(RoundedRectangle(cornerRadius: CatalogMetrics.compactRadius, style: .continuous))
                            .overlay {
                                RoundedRectangle(cornerRadius: CatalogMetrics.compactRadius, style: .continuous)
                                    .stroke(Color.perklyOverlay.opacity(vm.selectedRadius == radius ? 0.0 : 0.08), lineWidth: 1)
                            }
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Радиус \(radius.title)")
                    .accessibilityValue(vm.selectedRadius == radius ? "Выбран" : "Не выбран")
                    .accessibilityAddTraits(vm.selectedRadius == radius ? .isSelected : [])
                }
            }
            .padding(.horizontal, CatalogMetrics.horizontalInset)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var loadingState: some View {
        VStack(alignment: .leading, spacing: 18) {
            PerklySkeletonBlock(height: 220, cornerRadius: 26)

            HStack(spacing: 12) {
                PerklySkeletonBlock(height: 238, cornerRadius: 22)
                PerklySkeletonBlock(height: 238, cornerRadius: 22)
            }

            HStack(spacing: 12) {
                PerklySkeletonBlock(height: 238, cornerRadius: 22)
                PerklySkeletonBlock(height: 238, cornerRadius: 22)
            }
        }
        .padding(.horizontal, CatalogMetrics.horizontalInset)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Загружаем каталог")
    }

    private var errorState: some View {
        PerklyContentStateView(
            kind: .error,
            icon: "wifi.exclamationmark",
            title: "Каталог не загрузился",
            message: "Проверьте соединение и попробуйте ещё раз.",
            actionTitle: "Повторить",
            action: {
                Task {
                    await vm.loadCatalog(
                        location: locationManager.lastLocation,
                        isAuthenticated: authVM.isAuthenticated
                    )
                }
            }
        )
        .padding(.horizontal, CatalogMetrics.horizontalInset)
        .padding(.vertical, 48)
    }

    private func allOffersGrid(
        title: String,
        offers: [Offer],
        showPromotedLabel: Bool = false,
        emptyTitle: String = "Ничего не найдено",
        emptySubtitle: String = "Попробуйте изменить поиск или фильтр."
    ) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            SectionTitle(title: title, subtitle: "\(offers.count) активных предложений")
                .padding(.horizontal, CatalogMetrics.horizontalInset)

            if offers.isEmpty {
                emptyState(
                    title: vm.searchQuery.isEmpty ? emptyTitle : "По запросу ничего нет",
                    subtitle: vm.searchQuery.isEmpty ? emptySubtitle : "Попробуйте сократить запрос или посмотреть все предложения.",
                    actionTitle: vm.searchQuery.isEmpty ? nil : "Сбросить поиск",
                    action: vm.searchQuery.isEmpty ? nil : clearSearch
                )
                    .padding(.horizontal, CatalogMetrics.horizontalInset)
            } else {
                LazyVGrid(
                    columns: catalogGridColumns,
                    spacing: 12
                ) {
                    ForEach(offers) { offer in
                        ZStack(alignment: .topTrailing) {
                            CatalogDealCard(
                                offer: offer,
                                distanceText: distanceText(for: offer),
                                isFavorite: vm.savedOfferIds.contains(offer.id),
                                showPromotedLabel: showPromotedLabel || offer.isFeaturedNow
                            )
                            .onAppear {
                                if offer.id == vm.offers.last?.id, vm.selectedSegment == .today {
                                    Task { await vm.loadMore() }
                                }
                            }

                            favoriteButton(for: offer, size: 32)
                                .padding(8)
                        }
                    }
                }
                .padding(.horizontal, CatalogMetrics.horizontalInset)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func emptyState(
        title: String,
        subtitle: String,
        actionTitle: String? = nil,
        action: (() -> Void)? = nil
    ) -> some View {
        PerklyContentStateView(
            kind: .empty,
            icon: "ticket",
            title: L10n.tr(title),
            message: L10n.tr(subtitle),
            actionTitle: actionTitle.map(L10n.tr),
            action: action
        )
        .frame(maxWidth: .infinity)
        .padding(22)
        .perklySurface(cornerRadius: CatalogMetrics.surfaceRadius)
    }

    private func clearSearch() {
        vm.searchQuery = ""
    }

    private var normalizedSearchQuery: String {
        vm.searchQuery.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func scheduleSearch() {
        searchTask?.cancel()
        searchTask = Task {
            try? await Task.sleep(for: .milliseconds(400))
            guard !Task.isCancelled else { return }
            await vm.search(
                location: locationManager.lastLocation,
                isAuthenticated: authVM.isAuthenticated
            )
        }
    }

    private func favoriteButton(for offer: Offer, size: CGFloat) -> some View {
        Button {
            toggleFavorite(offer)
        } label: {
            Image(systemName: vm.savedOfferIds.contains(offer.id) ? "heart.fill" : "heart")
                .font(.system(size: size == 36 ? 15 : 13, weight: .bold))
                .foregroundColor(vm.savedOfferIds.contains(offer.id) ? .perklyPink : .white)
                .frame(width: size, height: size)
                .perklyGlass(
                    cornerRadius: size / 2,
                    tint: vm.savedOfferIds.contains(offer.id) ? .perklyPink.opacity(0.2) : nil
                )
                .frame(width: 44, height: 44)
                .contentShape(Circle())
        }
        .buttonStyle(.plain)
        .disabled(vm.savingOfferIds.contains(offer.id))
        .opacity(vm.savingOfferIds.contains(offer.id) ? 0.55 : 1)
        .zIndex(2)
        .accessibilityLabel(L10n.tr(vm.savedOfferIds.contains(offer.id) ? "Удалить из избранного" : "Добавить в избранное"))
        .accessibilityValue(vm.savingOfferIds.contains(offer.id) ? "Сохранение" : offer.safeTitle)
        .accessibilityHint("Изменяет избранное для предложения \(offer.safeTitle)")
    }

    private func toggleFavorite(_ offer: Offer) {
        Task { await vm.toggleSavedOffer(offer, isAuthenticated: authVM.isAuthenticated) }
    }

    private func requestLocation() {
        locationManager.requestPermissions()
        locationManager.startUpdating()
    }

    private func distanceText(for offer: Offer) -> String? {
        guard let location = locationManager.lastLocation,
              let latitude = offer.latitude,
              let longitude = offer.longitude else { return nil }

        let offerLocation = CLLocation(latitude: latitude, longitude: longitude)
        let distance = location.distance(from: offerLocation)

        if distance < 1000 {
            return L10n.format("recommendation.distance.meters", Int(distance.rounded()))
        }

        return L10n.format("recommendation.distance.kilometers", distance / 1000)
    }

    private func segmentCount(for segment: CatalogSegment) -> Int? {
        switch segment {
        case .today: return vm.total > 0 ? vm.total : nil
        case .hot: return vm.promotedOffers.isEmpty ? nil : vm.promotedOffers.count
        case .nearby: return vm.nearbyOffers.isEmpty ? nil : vm.nearbyOffers.count
        case .free: return vm.freeOffers.isEmpty ? nil : vm.freeOffers.count
        case .stores: return vm.stores.isEmpty ? nil : vm.stores.count
        case .favorites: return vm.savedOfferIds.isEmpty ? nil : vm.savedOfferIds.count
        }
    }

    private var catalogGridColumns: [GridItem] {
        if dynamicTypeSize.isAccessibilitySize {
            return [GridItem(.flexible())]
        }
        return [
            GridItem(.flexible(), spacing: 12),
            GridItem(.flexible(), spacing: 12)
        ]
    }

}

// MARK: - Catalog Building Blocks

private struct CatalogCategoryPickerSheet: View {
    let selected: CatalogCategoryOption
    let didApply: Bool
    let onSelect: (CatalogCategoryOption) async -> Void

    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @State private var applying: CatalogCategoryOption?

    private var columns: [GridItem] {
        if dynamicTypeSize.isAccessibilitySize {
            return [GridItem(.flexible())]
        }
        return [
            GridItem(.flexible(), spacing: 10),
            GridItem(.flexible(), spacing: 10)
        ]
    }

    var body: some View {
        VStack(spacing: 0) {
            Capsule()
                .fill(Color.perklyTextMuted.opacity(0.55))
                .frame(width: 38, height: 5)
                .padding(.top, 10)
                .padding(.bottom, 18)
                .accessibilityHidden(true)

            HStack(alignment: .firstTextBaseline) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Выберите категорию")
                        .font(.system(size: 26, weight: .bold))
                        .foregroundStyle(Color.perklyTextPrimary)

                    Text("Покажем только подходящие предложения")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(Color.perklyTextSecondary)
                }

                Spacer(minLength: 12)

                Image(systemName: "line.3.horizontal.decrease.circle.fill")
                    .font(.system(size: 28, weight: .semibold))
                    .foregroundStyle(Color.perklyPurple)
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 16)

            if didApply {
                HStack(spacing: 9) {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(Color.perklyGreen)

                    Text("Фильтр применён")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(Color.perklyTextPrimary)

                    Spacer()

                    Text("Свайпните вниз, чтобы закрыть")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(Color.perklyTextSecondary)

                    Image(systemName: "chevron.down")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(Color.perklyTextSecondary)
                }
                .padding(.horizontal, 14)
                .frame(height: 46)
                .background(Color.perklyGreen.opacity(0.1), in: RoundedRectangle(cornerRadius: 15, style: .continuous))
                .padding(.horizontal, 20)
                .padding(.bottom, 12)
                .transition(.move(edge: .top).combined(with: .opacity))
                .accessibilityLabel(L10n.tr("catalog.category.applied_hint"))
            }

            ScrollView(.vertical, showsIndicators: false) {
                LazyVGrid(columns: columns, spacing: 10) {
                    ForEach(CatalogCategoryOption.allCases) { option in
                        Button {
                            guard applying == nil else { return }
                            applying = option
                            Task {
                                await onSelect(option)
                                HapticManager.shared.playSuccess()
                                applying = nil
                            }
                        } label: {
                            HStack(spacing: 11) {
                                Image(systemName: option.icon)
                                    .font(.system(size: 16, weight: .bold))
                                    .foregroundStyle(selected == option ? Color.white : Color.perklyPurple)
                                    .frame(width: 34, height: 34)
                                    .background(
                                        selected == option ? Color.perklyPurple : Color.perklyPurple.opacity(0.11),
                                        in: RoundedRectangle(cornerRadius: 11, style: .continuous)
                                    )

                                Text(option.title)
                                    .font(.system(size: 13, weight: .bold))
                                    .foregroundStyle(Color.perklyTextPrimary)
                                    .multilineTextAlignment(.leading)
                                    .lineLimit(2)

                                Spacer(minLength: 2)

                                if applying == option {
                                    ProgressView()
                                        .tint(.perklyPurple)
                                } else if selected == option {
                                    Image(systemName: "checkmark")
                                        .font(.system(size: 12, weight: .black))
                                        .foregroundStyle(Color.perklyPurple)
                                }
                            }
                            .padding(.horizontal, 11)
                            .frame(maxWidth: .infinity, minHeight: 62, alignment: .leading)
                            .background(
                                selected == option
                                    ? Color.perklyPurple.opacity(0.10)
                                    : Color.perklyCardBg,
                                in: RoundedRectangle(cornerRadius: 18, style: .continuous)
                            )
                            .overlay {
                                RoundedRectangle(cornerRadius: 18, style: .continuous)
                                    .stroke(
                                        selected == option
                                            ? Color.perklyPurple.opacity(0.38)
                                            : Color.perklyBorder,
                                        lineWidth: 1
                                    )
                            }
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(PerklyPressStyle())
                        .disabled(applying != nil)
                        .accessibilityAddTraits(selected == option ? .isSelected : [])
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 34)
            }
        }
        .animation(.spring(response: 0.3, dampingFraction: 0.86), value: didApply)
    }
}

private struct CatalogSegmentChip: View {
    let segment: CatalogSegment
    let isSelected: Bool
    let count: Int?
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 7) {
                Image(systemName: segment.icon)
                    .font(.system(size: 12, weight: .bold))

                Text(segment.title)
                    .font(.system(size: 13, weight: .bold))

                if let count {
                    Text("\(count)")
                        .font(.system(size: 10, weight: .black))
                        .foregroundColor(isSelected ? .black.opacity(0.72) : .white.opacity(0.5))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(isSelected ? Color.black.opacity(0.08) : Color.perklyOverlay.opacity(0.08))
                        .clipShape(RoundedRectangle(cornerRadius: CatalogMetrics.compactRadius, style: .continuous))
                }
            }
            .foregroundColor(isSelected ? .black : .white.opacity(0.62))
            .padding(.horizontal, 14)
            .frame(minHeight: PerklyDesign.Size.minimumTouchTarget)
            .background(isSelected ? segmentAccent : Color.perklyOverlay.opacity(0.06))
            .clipShape(RoundedRectangle(cornerRadius: CatalogMetrics.compactRadius, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: CatalogMetrics.compactRadius, style: .continuous)
                    .stroke(Color.perklyOverlay.opacity(isSelected ? 0.0 : 0.08), lineWidth: 1)
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel(segment.title)
        .accessibilityValue(isSelected ? "Выбрано" : "Не выбрано")
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }

    private var segmentAccent: Color {
        switch segment {
        case .hot, .favorites: return .perklyPink
        case .nearby: return .perklyCyan
        case .free: return .perklyGreen
        case .stores: return .perklyGold
        case .today: return .white
        }
    }
}

private struct SectionTitle: View {
    let title: String
    var subtitle: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(L10n.tr(title))
                .font(.title2.bold())
                .foregroundColor(.perklyTextPrimary)
                .accessibilityAddTraits(.isHeader)

            if let subtitle {
                Text(L10n.tr(subtitle))
                    .font(.subheadline.weight(.medium))
                    .foregroundColor(Color.perklyTextPrimary.opacity(0.48))
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct CatalogHeroCard: View {
    let offer: Offer
    let distanceText: String?
    let isFavorite: Bool
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    private var cardHeight: CGFloat {
        dynamicTypeSize.isAccessibilitySize ? 430 : 330
    }

    var body: some View {
        GeometryReader { proxy in
            let cardWidth = proxy.size.width
            let innerWidth = max(cardWidth - 36, 0)

            ZStack(alignment: .bottomLeading) {
                offerImage
                    .frame(width: cardWidth, height: cardHeight)
                    .accessibilityHidden(true)

                LinearGradient(
                    colors: [
                        Color.black.opacity(0.0),
                        Color.black.opacity(0.42),
                        Color.black.opacity(0.92)
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )

                VStack(alignment: .leading, spacing: 14) {
                    HStack(spacing: 8) {
                        badge(text: "Горячий товар", icon: "flame.fill", color: .perklyPink)

                        if offer.hasPromocodes {
                            badge(text: "Промокод", icon: "ticket.fill", color: .perklyGreen)
                        }

                        if let distanceText {
                            badge(text: distanceText, icon: "location.fill", color: .perklyCyan)
                        }
                    }
                    .frame(width: innerWidth, alignment: .leading)
                    .clipped()

                    VStack(alignment: .leading, spacing: 7) {
                        Text(offer.catalogSellerName)
                            .font(.subheadline.weight(.bold))
                            .foregroundColor(Color.perklyTextPrimary.opacity(0.68))
                            .lineLimit(1)
                            .truncationMode(.tail)
                            .frame(width: innerWidth, alignment: .leading)

                        Text(offer.safeTitle)
                            .font(.title2.bold())
                            .foregroundColor(.perklyTextPrimary)
                            .lineLimit(2)
                            .minimumScaleFactor(0.7)
                            .fixedSize(horizontal: false, vertical: true)
                            .frame(width: innerWidth, alignment: .leading)

                        Text(offer.safeDescription)
                            .font(.body.weight(.medium))
                            .foregroundColor(Color.perklyTextPrimary.opacity(0.64))
                            .lineLimit(2)
                            .fixedSize(horizontal: false, vertical: true)
                            .frame(width: innerWidth, alignment: .leading)
                    }
                    .frame(width: innerWidth, alignment: .leading)

                    HStack(alignment: .center, spacing: 10) {
                        Text(offer.catalogPriceText)
                            .font(.headline)
                            .foregroundColor(offer.safePrice <= 0 ? .perklyGreen : .white)
                            .lineLimit(1)

                        if let discountText = offer.catalogDiscountText {
                            Text(discountText)
                                .font(.system(size: 12, weight: .black))
                                .foregroundColor(.black)
                                .lineLimit(1)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 5)
                                .background(Color.perklyGreen)
                                .clipShape(RoundedRectangle(cornerRadius: CatalogMetrics.compactRadius, style: .continuous))
                        }

                        Spacer(minLength: 6)

                        Text(L10n.tr(offer.safePrice <= 0 ? "Получить" : "Купить"))
                            .font(.system(size: 13, weight: .black))
                            .foregroundColor(.black)
                            .lineLimit(1)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 9)
                            .background(Color.white)
                            .clipShape(RoundedRectangle(cornerRadius: CatalogMetrics.compactRadius, style: .continuous))
                    }
                    .frame(width: innerWidth)
                    .clipped()
                }
                .padding(18)
                .frame(width: cardWidth, alignment: .leading)
            }
            .frame(width: cardWidth, height: cardHeight)
        }
        .frame(height: cardHeight)
        .clipShape(RoundedRectangle(cornerRadius: CatalogMetrics.surfaceRadius, style: .continuous))
        .clipped()
        .overlay {
            RoundedRectangle(cornerRadius: CatalogMetrics.surfaceRadius, style: .continuous)
                .stroke(Color.perklyOverlay.opacity(0.08), lineWidth: 1)
        }
        .shadow(color: Color.perklyPink.opacity(0.18), radius: 26, x: 0, y: 18)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(offer.catalogAccessibilityLabel)
    }

    @ViewBuilder
    private var offerImage: some View {
        GeometryReader { geo in
            if let url = RemoteImageURL.url(from: offer.safeProductThumbnail) {
                AsyncImage(url: url) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: offer.usesBrandLogoArtwork ? .fit : .fill)
                        .padding(offer.usesBrandLogoArtwork ? 34 : 0)
                        .frame(width: geo.size.width, height: geo.size.height)
                        .clipped()
                } placeholder: {
                    PerklySkeletonBlock(
                        width: geo.size.width,
                        height: geo.size.height,
                        cornerRadius: 0
                    )
                }
            } else {
                Color.perklyOverlay.opacity(0.05)
                    .overlay {
                            Image(systemName: "bag.fill")
                            .font(.system(size: 58))
                            .foregroundColor(Color.perklyTextPrimary.opacity(0.18))
                    }
                    .frame(width: geo.size.width, height: geo.size.height)
            }
        }
    }

    private func badge(text: String, icon: String, color: Color) -> some View {
        HStack(spacing: 5) {
            Image(systemName: icon)
                .font(.system(size: 10, weight: .bold))
            Text(L10n.tr(text))
                .font(.system(size: 11, weight: .black))
        }
        .foregroundColor(.perklyTextPrimary)
        .padding(.horizontal, 9)
        .padding(.vertical, 6)
        .background(color.opacity(0.82))
        .clipShape(RoundedRectangle(cornerRadius: CatalogMetrics.compactRadius, style: .continuous))
    }
}

private struct CatalogHorizontalSection: View {
    let title: String
    let subtitle: String
    let offers: [Offer]
    let favoriteOfferIds: Set<String>
    let distanceProvider: (Offer) -> String?
    let toggleFavorite: (Offer) -> Void
    var emptyActionTitle: String?
    var emptyAction: (() -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .bottom) {
                SectionTitle(title: title, subtitle: subtitle)
                    .padding(.horizontal, CatalogMetrics.horizontalInset)
                Spacer()
            }

            if offers.isEmpty {
                CatalogStatusBanner(
                    icon: "ticket",
                    title: "Пока пусто",
                    subtitle: subtitle,
                    accent: .white.opacity(0.7),
                    actionTitle: emptyActionTitle,
                    action: emptyAction
                )
                .padding(.horizontal, CatalogMetrics.horizontalInset)
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(alignment: .top, spacing: 14) {
                        ForEach(offers.prefix(12)) { offer in
                            ZStack(alignment: .topTrailing) {
                                CatalogDealCard(
                                    offer: offer,
                                    distanceText: distanceProvider(offer),
                                    isFavorite: favoriteOfferIds.contains(offer.id),
                                    showPromotedLabel: offer.isFeaturedNow,
                                    width: 170
                                )

                                Button {
                                    toggleFavorite(offer)
                                } label: {
                                    Image(systemName: favoriteOfferIds.contains(offer.id) ? "heart.fill" : "heart")
                                        .font(.system(size: 12, weight: .bold))
                                        .foregroundColor(favoriteOfferIds.contains(offer.id) ? .perklyPink : .white)
                                        .frame(width: 30, height: 30)
                                        .perklyGlass(
                                            cornerRadius: 15,
                                            tint: favoriteOfferIds.contains(offer.id) ? .perklyPink.opacity(0.2) : nil
                                        )
                                        .frame(width: 44, height: 44)
                                        .contentShape(Circle())
                                }
                                .buttonStyle(.plain)
                                .padding(1)
                                .zIndex(2)
                                .accessibilityLabel(L10n.tr(favoriteOfferIds.contains(offer.id) ? "Удалить из избранного" : "Добавить в избранное"))
                                .accessibilityValue(offer.safeTitle)
                                .accessibilityHint("Изменяет избранное")
                            }
                        }
                    }
                    .padding(.horizontal, CatalogMetrics.horizontalInset)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct PerklyOfferNavigationLink<Label: View>: View {
    let offerId: String
    let label: Label

    @Namespace private var transitionNamespace

    init(
        offerId: String,
        @ViewBuilder label: () -> Label
    ) {
        self.offerId = offerId
        self.label = label()
    }

    @ViewBuilder
    var body: some View {
        if #available(iOS 18.0, *) {
            NavigationLink {
                OfferDetailView(offerId: offerId)
                    .navigationTransition(
                        .zoom(
                            sourceID: offerId,
                            in: transitionNamespace
                        )
                    )
            } label: {
                label
                    .matchedTransitionSource(
                        id: offerId,
                        in: transitionNamespace
                    )
            }
        } else {
            NavigationLink(destination: OfferDetailView(offerId: offerId)) {
                label
            }
        }
    }
}

private struct CatalogDealCard: View {
    let offer: Offer
    let distanceText: String?
    let isFavorite: Bool
    var showPromotedLabel = false
    var width: CGFloat?

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            PerklyOfferNavigationLink(offerId: offer.id) {
                VStack(alignment: .leading, spacing: 10) {
                    ZStack(alignment: .bottomLeading) {
                        offerImage
                            .accessibilityHidden(true)

                        LinearGradient(
                            colors: [Color.black.opacity(0), Color.black.opacity(0.72)],
                            startPoint: .top,
                            endPoint: .bottom
                        )

                        VStack(alignment: .leading, spacing: 6) {
                            HStack(spacing: 6) {
                                if showPromotedLabel {
                                    chip("Реклама", color: .perklyPink)
                                }

                                if offer.hasPromocodes {
                                    chip("Промокод", color: .perklyGreen)
                                }

                                if let distanceText {
                                    chip(distanceText, color: .perklyCyan)
                                }
                            }

                            if let discountText = offer.catalogDiscountText {
                                Text(discountText)
                                    .font(.system(size: 22, weight: .black))
                                    .foregroundColor(.perklyTextPrimary)
                                    .lineLimit(1)
                                    .minimumScaleFactor(0.72)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                            }
                        }
                        .padding(10)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .clipped()
                    }
                    .frame(height: width == nil ? 132 : 154)
                    .clipShape(RoundedRectangle(cornerRadius: CatalogMetrics.surfaceRadius, style: .continuous))
                    .clipped()

                    VStack(alignment: .leading, spacing: 6) {
                        Text(offer.safeTitle)
                            .font(.headline)
                            .foregroundColor(.perklyTextPrimary)
                            .lineLimit(2)
                            .fixedSize(horizontal: false, vertical: true)
                            .frame(minHeight: 34, alignment: .topLeading)
                            .frame(maxWidth: .infinity, alignment: .leading)

                        Text(offer.catalogSellerName)
                            .font(.subheadline.weight(.medium))
                            .foregroundColor(Color.perklyTextPrimary.opacity(0.46))
                            .lineLimit(1)
                            .truncationMode(.tail)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            .buttonStyle(.plain)
            .accessibilityLabel(offer.catalogAccessibilityLabel)
            .accessibilityHint("Открывает предложение")

            HStack(alignment: .center, spacing: 7) {
                Text(offer.catalogPriceText)
                    .font(.headline)
                    .foregroundColor(offer.safePrice <= 0 ? .perklyGreen : .white)
                    .lineLimit(1)
                    .minimumScaleFactor(0.74)

                Spacer(minLength: 4)

                Image(systemName: "qrcode")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(Color.perklyTextPrimary.opacity(0.56))
                    .accessibilityHidden(true)
            }
            .accessibilityHidden(true)
        }
        .padding(10)
        .frame(width: width)
        .background(Color.perklyOverlay.opacity(0.045))
        .clipShape(RoundedRectangle(cornerRadius: CatalogMetrics.surfaceRadius, style: .continuous))
        .clipped()
        .overlay {
            RoundedRectangle(cornerRadius: CatalogMetrics.surfaceRadius, style: .continuous)
                .stroke(Color.perklyOverlay.opacity(0.07), lineWidth: 1)
        }
        .accessibilityElement(children: .contain)
    }

    @ViewBuilder
    private var offerImage: some View {
        GeometryReader { geo in
            if let url = RemoteImageURL.url(from: offer.safeProductThumbnail) {
                AsyncImage(url: url) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: offer.usesBrandLogoArtwork ? .fit : .fill)
                        .padding(offer.usesBrandLogoArtwork ? 22 : 0)
                        .frame(width: geo.size.width, height: geo.size.height)
                        .clipped()
                } placeholder: {
                    PerklySkeletonBlock(
                        width: geo.size.width,
                        height: geo.size.height,
                        cornerRadius: 0
                    )
                }
            } else {
                Color.perklyOverlay.opacity(0.06)
                    .overlay {
                        Image(systemName: "shippingbox.fill")
                            .font(.system(size: 28, weight: .semibold))
                            .foregroundColor(Color.perklyTextPrimary.opacity(0.18))
                    }
                    .frame(width: geo.size.width, height: geo.size.height)
            }
        }
    }

    private func chip(_ text: String, color: Color) -> some View {
        Text(L10n.tr(text))
            .font(.system(size: 10, weight: .black))
            .foregroundColor(.perklyTextPrimary)
            .lineLimit(1)
            .minimumScaleFactor(0.82)
            .padding(.horizontal, 7)
            .padding(.vertical, 4)
            .background(color.opacity(0.86))
            .clipShape(RoundedRectangle(cornerRadius: CatalogMetrics.compactRadius, style: .continuous))
    }
}

private struct CatalogStoreRail: View {
    let stores: [CatalogStoreSpotlight]

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            SectionTitle(title: "Популярные магазины", subtitle: "Подписка на продавцов и отдельные страницы брендов")
                .padding(.horizontal, CatalogMetrics.horizontalInset)

            if stores.isEmpty {
                CatalogStatusBanner(
                    icon: "storefront",
                    title: "Магазины появятся скоро",
                    subtitle: "Собираем активные магазины из опубликованных предложений.",
                    accent: .perklyGold
                )
                .padding(.horizontal, CatalogMetrics.horizontalInset)
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 14) {
                        ForEach(stores.prefix(8)) { store in
                            NavigationLink(destination: StorefrontView(store: store)) {
                                StoreSpotlightCard(store: store)
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel("\(store.name), \(store.subtitle), \(store.offersCount) предложений")
                            .accessibilityHint("Открывает страницу магазина")
                        }
                    }
                    .padding(.horizontal, CatalogMetrics.horizontalInset)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct StoreSpotlightCard: View {
    let store: CatalogStoreSpotlight

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            ZStack(alignment: .bottomLeading) {
                storeImage
                    .accessibilityHidden(true)

                LinearGradient(
                    colors: [Color.black.opacity(0), Color.black.opacity(0.76)],
                    startPoint: .top,
                    endPoint: .bottom
                )

                Text(store.name)
                    .font(.system(size: 18, weight: .heavy))
                    .foregroundColor(.perklyTextPrimary)
                    .lineLimit(2)
                    .padding(12)
            }
            .frame(width: 190, height: 160)
            .clipShape(RoundedRectangle(cornerRadius: CatalogMetrics.surfaceRadius, style: .continuous))

            HStack(spacing: 8) {
                Image(systemName: "checkmark.seal.fill")
                    .foregroundColor(.perklyCyan)
                    .accessibilityHidden(true)

                Text(store.subtitle)
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(Color.perklyTextPrimary.opacity(0.62))
                    .lineLimit(1)
            }
            .frame(width: 190, alignment: .leading)
        }
        .accessibilityElement(children: .combine)
    }

    @ViewBuilder
    private var storeImage: some View {
        GeometryReader { geo in
            if let url = RemoteImageURL.url(from: store.imageURL) {
                AsyncImage(url: url) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: storeUsesLogoArtwork ? .fit : .fill)
                        .padding(storeUsesLogoArtwork ? 22 : 0)
                        .frame(width: geo.size.width, height: geo.size.height)
                        .clipped()
                } placeholder: {
                    Color.perklyOverlay.opacity(0.06)
                        .frame(width: geo.size.width, height: geo.size.height)
                }
            } else {
                Color.perklyOverlay.opacity(0.06)
                    .frame(width: geo.size.width, height: geo.size.height)
            }
        }
    }

    private var storeUsesLogoArtwork: Bool {
        let value = store.imageURL.lowercased()
        return value.contains("/brands/") || value.hasSuffix(".svg")
    }
}

private struct StoreListCard: View {
    let store: CatalogStoreSpotlight

    var body: some View {
        HStack(spacing: 12) {
            StoreAvatar(imageURL: store.imageURL, size: 64)

            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 6) {
                    Text(store.name)
                        .font(.system(size: 16, weight: .heavy))
                        .foregroundColor(.perklyTextPrimary)
                        .lineLimit(1)

                    if store.promotedCount > 0 {
                        Image(systemName: "flame.fill")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(.perklyPink)
                    }
                }

                Text(store.subtitle)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(Color.perklyTextPrimary.opacity(0.5))
                    .lineLimit(1)

                Text("\(store.offersCount) предложений")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.perklyGreen)
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(Color.perklyTextPrimary.opacity(0.28))
        }
        .padding(14)
        .background(Color.perklyOverlay.opacity(0.045))
        .clipShape(RoundedRectangle(cornerRadius: CatalogMetrics.surfaceRadius, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: CatalogMetrics.surfaceRadius, style: .continuous)
                .stroke(Color.perklyOverlay.opacity(0.07), lineWidth: 1)
        }
        .accessibilityElement(children: .combine)
    }
}

private struct StorefrontView: View {
    let store: CatalogStoreSpotlight
    @State private var isSubscribed = false
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(alignment: .leading, spacing: 20) {
                ZStack(alignment: .bottomLeading) {
                    StoreBackdrop(imageURL: store.imageURL)

                    VStack(alignment: .leading, spacing: 14) {
                        StoreAvatar(imageURL: store.imageURL, size: 76)

                        VStack(alignment: .leading, spacing: 6) {
                            Text(store.name)
                                .font(.system(size: 30, weight: .heavy))
                                .foregroundColor(.perklyTextPrimary)
                                .lineLimit(2)

                            Text(store.subtitle)
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(Color.perklyTextPrimary.opacity(0.64))
                        }

                        HStack(spacing: 10) {
                            Button {
                                isSubscribed.toggle()
                                HapticManager.shared.lightImpact()
                            } label: {
                                HStack(spacing: 7) {
                                    Image(systemName: isSubscribed ? "checkmark" : "plus")
                                        .font(.system(size: 12, weight: .black))
                                    Text(L10n.tr(isSubscribed ? "Вы подписаны" : "Подписаться"))
                                        .font(.system(size: 13, weight: .black))
                                }
                                .foregroundColor(.black)
                                .padding(.horizontal, 14)
                                .frame(minHeight: PerklyDesign.Size.minimumTouchTarget)
                                .background(Color.white)
                                .clipShape(RoundedRectangle(cornerRadius: CatalogMetrics.compactRadius, style: .continuous))
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel(isSubscribed ? "Отписаться от \(store.name)" : "Подписаться на \(store.name)")
                            .accessibilityValue(isSubscribed ? "Вы подписаны" : "Не подписаны")

                            HStack(spacing: 6) {
                                Image(systemName: "star.fill")
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundColor(.perklyGold)
                                Text("Отзывы после покупки")
                                    .font(.system(size: 12, weight: .bold))
                            }
                            .foregroundColor(Color.perklyTextPrimary.opacity(0.74))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 10)
                            .background(Color.perklyOverlay.opacity(0.08))
                            .clipShape(RoundedRectangle(cornerRadius: CatalogMetrics.compactRadius, style: .continuous))
                        }
                    }
                    .padding(20)
                }
                .frame(height: 340)

                VStack(alignment: .leading, spacing: 14) {
                    SectionTitle(title: "Активные предложения", subtitle: "Код, ссылка или инструкция доступны после покупки или получения")

                    LazyVGrid(
                        columns: storefrontGridColumns,
                        spacing: 12
                    ) {
                        ForEach(store.offers) { offer in
                            CatalogDealCard(offer: offer, distanceText: nil, isFavorite: false, showPromotedLabel: offer.isFeaturedNow)
                        }
                    }
                }
                .padding(.horizontal, CatalogMetrics.horizontalInset)
                .padding(.bottom, 34)
            }
        }
        .background(Color.perklyDark)
        .navigationTitle(store.name)
        .navigationBarTitleDisplayMode(.inline)
    }

    private var storefrontGridColumns: [GridItem] {
        if dynamicTypeSize.isAccessibilitySize {
            return [GridItem(.flexible())]
        }
        return [
            GridItem(.flexible(), spacing: 12),
            GridItem(.flexible(), spacing: 12)
        ]
    }
}

private struct StoreBackdrop: View {
    let imageURL: String

    var body: some View {
        GeometryReader { geo in
            ZStack {
                if let url = RemoteImageURL.url(from: imageURL) {
                    AsyncImage(url: url) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: geo.size.width, height: geo.size.height)
                            .clipped()
                    } placeholder: {
                        Color.perklyOverlay.opacity(0.06)
                            .frame(width: geo.size.width, height: geo.size.height)
                    }
                } else {
                    Color.perklyOverlay.opacity(0.06)
                        .frame(width: geo.size.width, height: geo.size.height)
                }

                LinearGradient(
                    colors: [Color.black.opacity(0.1), Color.perklyDark.opacity(0.98)],
                    startPoint: .top,
                    endPoint: .bottom
                )
            }
        }
        .clipped()
        .accessibilityHidden(true)
    }
}

private struct StoreAvatar: View {
    let imageURL: String
    let size: CGFloat

    var body: some View {
        GeometryReader { geo in
            if let url = RemoteImageURL.url(from: imageURL) {
                AsyncImage(url: url) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(width: geo.size.width, height: geo.size.height)
                        .clipped()
                } placeholder: {
                    Color.perklyOverlay.opacity(0.08)
                        .frame(width: geo.size.width, height: geo.size.height)
                }
            } else {
                Color.perklyOverlay.opacity(0.08)
                    .frame(width: geo.size.width, height: geo.size.height)
            }
        }
        .frame(width: size, height: size)
        .clipShape(RoundedRectangle(cornerRadius: size * 0.24, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: size * 0.24, style: .continuous)
                .stroke(Color.perklyOverlay.opacity(0.16), lineWidth: 1)
        }
        .accessibilityHidden(true)
    }
}

private struct CatalogStatusBanner: View {
    let icon: String
    let title: String
    let subtitle: String
    let accent: Color
    var actionTitle: String?
    var action: (() -> Void)?

    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(accent)
                .frame(width: 42, height: 42)
                .background(accent.opacity(0.14))
                .clipShape(RoundedRectangle(cornerRadius: CatalogMetrics.compactRadius, style: .continuous))
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 4) {
                Text(L10n.tr(title))
                    .font(.headline)
                    .foregroundColor(.perklyTextPrimary)
                    .accessibilityAddTraits(.isHeader)

                Text(L10n.tr(subtitle))
                    .font(.subheadline.weight(.medium))
                    .foregroundColor(Color.perklyTextPrimary.opacity(0.52))
                    .lineLimit(3)
            }

            Spacer(minLength: 8)

            if let actionTitle, let action {
                Button(action: action) {
                    Text(L10n.tr(actionTitle))
                        .font(.system(size: 12, weight: .black))
                        .foregroundColor(.black)
                        .padding(.horizontal, 11)
                        .frame(minHeight: PerklyDesign.Size.minimumTouchTarget)
                        .background(accent)
                        .clipShape(RoundedRectangle(cornerRadius: CatalogMetrics.compactRadius, style: .continuous))
                }
                .buttonStyle(.plain)
                .accessibilityHint("Выполняет действие: \(actionTitle)")
            }
        }
        .padding(14)
        .background(Color.perklyOverlay.opacity(0.045))
        .clipShape(RoundedRectangle(cornerRadius: CatalogMetrics.surfaceRadius, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: CatalogMetrics.surfaceRadius, style: .continuous)
                .stroke(Color.perklyOverlay.opacity(0.07), lineWidth: 1)
        }
    }
}

#if DEBUG
struct DemoCouponDetailView: View {
    let offer: Offer
    @State private var isAcquired = false

    var body: some View {
        GeometryReader { proxy in
            let contentWidth = max(proxy.size.width - CatalogMetrics.horizontalInset * 2, 0)

            ScrollView(.vertical, showsIndicators: false) {
                VStack(alignment: .leading, spacing: 22) {
                    detailHero
                        .frame(width: contentWidth, height: 360)
                        .padding(.horizontal, CatalogMetrics.horizontalInset)
                        .padding(.top, 10)

                    VStack(alignment: .leading, spacing: 14) {
                        Text("Описание")
                            .font(.system(size: 20, weight: .heavy))
                            .foregroundColor(.perklyTextPrimary)

                        Text(offer.safeDescription)
                            .font(.system(size: 15, weight: .medium))
                            .foregroundColor(Color.perklyTextPrimary.opacity(0.6))
                            .lineSpacing(4)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .frame(width: contentWidth, alignment: .leading)
                    .padding(.horizontal, CatalogMetrics.horizontalInset)

                    demoCodeBlock
                        .frame(width: contentWidth)
                        .padding(.horizontal, CatalogMetrics.horizontalInset)

                    VStack(spacing: 12) {
                        detailRow(icon: "qrcode", title: "Выдача", value: "Код, ссылка или QR-код")
                        detailRow(icon: "lock.shield.fill", title: "Оплата", value: offer.safePrice <= 0 ? "Без списания с баланса" : "Деньги блокируются в эскроу")
                        detailRow(icon: "percent", title: "Комиссия", value: offer.safePrice <= 0 ? "0% для бесплатного кода" : "8% платформе, 92% продавцу")
                        detailRow(icon: "checkmark.seal.fill", title: "Активация", value: "Следуйте инструкции продавца после покупки")
                    }
                    .frame(width: contentWidth)
                    .padding(.horizontal, CatalogMetrics.horizontalInset)

                    Button {
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.82)) {
                            isAcquired = true
                        }
                        HapticManager.shared.playSuccess()
                    } label: {
                        HStack(spacing: 8) {
                            Image(systemName: isAcquired ? "checkmark.circle.fill" : (offer.safePrice <= 0 ? "gift.fill" : "lock.fill"))
                                .font(.system(size: 16, weight: .bold))
                            Text(L10n.tr(isAcquired ? "Предложение в моих покупках" : (offer.safePrice <= 0 ? "Получить код" : "Купить через эскроу")))
                                .font(.system(size: 16, weight: .heavy))
                                .lineLimit(1)
                                .minimumScaleFactor(0.82)
                        }
                        .foregroundColor(.black)
                        .frame(width: contentWidth)
                        .frame(height: 56)
                        .background(isAcquired ? Color.perklyGreen : Color.white)
                        .clipShape(RoundedRectangle(cornerRadius: CatalogMetrics.surfaceRadius, style: .continuous))
                    }
                    .buttonStyle(.plain)
                    .padding(.horizontal, CatalogMetrics.horizontalInset)
                    .padding(.bottom, 34)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .background(Color.perklyDark)
        .navigationTitle("Предложение")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var detailHero: some View {
        GeometryReader { proxy in
            let cardWidth = proxy.size.width
            let innerWidth = max(cardWidth - 40, 0)

            ZStack(alignment: .bottomLeading) {
                detailImage
                    .frame(width: cardWidth, height: 360)

                LinearGradient(
                    colors: [Color.black.opacity(0), Color.black.opacity(0.86)],
                    startPoint: .top,
                    endPoint: .bottom
                )

                VStack(alignment: .leading, spacing: 10) {
                    HStack(spacing: 8) {
                        badge(text: offer.safePrice <= 0 ? "Бесплатно" : "Эскроу", color: offer.safePrice <= 0 ? .perklyGreen : .perklyPink)

                        if offer.isFeaturedNow {
                            badge(text: "Реклама", color: .perklyPink)
                        }
                    }
                    .frame(width: innerWidth, alignment: .leading)
                    .clipped()

                    Text(offer.catalogSellerName)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(Color.perklyTextPrimary.opacity(0.66))
                        .lineLimit(1)
                        .truncationMode(.tail)
                        .frame(width: innerWidth, alignment: .leading)

                    Text(offer.safeTitle)
                        .font(.system(size: cardWidth < 350 ? 26 : 30, weight: .heavy))
                        .foregroundColor(.perklyTextPrimary)
                        .lineLimit(3)
                        .minimumScaleFactor(0.7)
                        .fixedSize(horizontal: false, vertical: true)
                        .frame(width: innerWidth, alignment: .leading)

                    HStack(spacing: 10) {
                        Text(offer.catalogPriceText)
                            .font(.system(size: 20, weight: .heavy))
                            .foregroundColor(offer.safePrice <= 0 ? .perklyGreen : .white)

                        if let discountText = offer.catalogDiscountText {
                            Text(discountText)
                                .font(.system(size: 13, weight: .black))
                                .foregroundColor(.black)
                                .lineLimit(1)
                                .padding(.horizontal, 9)
                                .padding(.vertical, 5)
                                .background(Color.perklyGreen)
                                .clipShape(RoundedRectangle(cornerRadius: CatalogMetrics.compactRadius, style: .continuous))
                        }
                    }
                    .frame(width: innerWidth, alignment: .leading)
                    .clipped()
                }
                .padding(20)
                .frame(width: cardWidth, alignment: .leading)
            }
            .frame(width: cardWidth, height: 360)
            .clipShape(RoundedRectangle(cornerRadius: CatalogMetrics.surfaceRadius, style: .continuous))
            .clipped()
        }
    }

    @ViewBuilder
    private var detailImage: some View {
        GeometryReader { geo in
            if let url = RemoteImageURL.url(from: offer.safeProductThumbnail) {
                AsyncImage(url: url) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(width: geo.size.width, height: geo.size.height)
                        .clipped()
                } placeholder: {
                    Color.perklyOverlay.opacity(0.06)
                        .frame(width: geo.size.width, height: geo.size.height)
                }
            } else {
                Color.perklyOverlay.opacity(0.06)
                    .frame(width: geo.size.width, height: geo.size.height)
            }
        }
    }

    private var demoCodeBlock: some View {
        HStack(spacing: 16) {
            DemoQRCode(seed: offer.id)
                .frame(width: 116, height: 116)

            VStack(alignment: .leading, spacing: 8) {
                Text("Промокод")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(Color.perklyTextPrimary.opacity(0.48))

                Text(offer.hiddenData ?? "PERKLY")
                    .font(.system(size: 24, weight: .black, design: .monospaced))
                    .foregroundColor(.perklyTextPrimary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)

                Text(L10n.tr(isAcquired ? "Покажите этот экран продавцу." : "В демо код виден сразу. В проде он откроется после покупки."))
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(Color.perklyTextPrimary.opacity(0.52))
                    .lineLimit(3)
            }

            Spacer(minLength: 0)
        }
        .padding(16)
        .background(Color.perklyOverlay.opacity(0.055))
        .clipShape(RoundedRectangle(cornerRadius: CatalogMetrics.surfaceRadius, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: CatalogMetrics.surfaceRadius, style: .continuous)
                .stroke(Color.perklyOverlay.opacity(0.08), lineWidth: 1)
        }
    }

    private func detailRow(icon: String, title: String, value: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 15, weight: .bold))
                .foregroundColor(.perklyPink)
                .frame(width: 38, height: 38)
                .background(Color.perklyPink.opacity(0.13))
                .clipShape(RoundedRectangle(cornerRadius: CatalogMetrics.compactRadius, style: .continuous))

            VStack(alignment: .leading, spacing: 3) {
                Text(L10n.tr(title))
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.perklyTextPrimary)
                Text(value)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(Color.perklyTextPrimary.opacity(0.52))
                    .lineLimit(2)
            }

            Spacer()
        }
        .padding(13)
        .background(Color.perklyOverlay.opacity(0.04))
        .clipShape(RoundedRectangle(cornerRadius: CatalogMetrics.surfaceRadius, style: .continuous))
    }

    private func badge(text: String, color: Color) -> some View {
        Text(L10n.tr(text))
            .font(.system(size: 11, weight: .black))
            .foregroundColor(.perklyTextPrimary)
            .padding(.horizontal, 9)
            .padding(.vertical, 6)
            .background(color.opacity(0.84))
            .clipShape(RoundedRectangle(cornerRadius: CatalogMetrics.compactRadius, style: .continuous))
    }
}

private struct DemoQRCode: View {
    let seed: String

    var body: some View {
        let bits = Array(seed.utf8)

        VStack(spacing: 3) {
            ForEach(0..<9, id: \.self) { row in
                HStack(spacing: 3) {
                    ForEach(0..<9, id: \.self) { col in
                        RoundedRectangle(cornerRadius: 2, style: .continuous)
                            .fill(isDark(row: row, col: col, bits: bits) ? Color.black : Color.white)
                    }
                }
            }
        }
        .padding(10)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: CatalogMetrics.surfaceRadius, style: .continuous))
    }

    private func isDark(row: Int, col: Int, bits: [UInt8]) -> Bool {
        if row < 3 && col < 3 { return row == 0 || row == 2 || col == 0 || col == 2 }
        if row < 3 && col > 5 { return row == 0 || row == 2 || col == 6 || col == 8 }
        if row > 5 && col < 3 { return row == 6 || row == 8 || col == 0 || col == 2 }
        guard !bits.isEmpty else { return (row + col).isMultiple(of: 2) }

        let value = bits[(row * 9 + col) % bits.count]
        return (Int(value) + row + col).isMultiple(of: 2)
    }
}
#endif

private extension Offer {
    var catalogSellerName: String {
        seller?.displayName ?? seller?.email ?? "Perkly Food"
    }

    var catalogPriceText: String {
        safePrice <= 0 ? "Бесплатно" : "\(uzs(safePrice))"
    }

    var catalogDiscountText: String? {
        guard let discountPercent, discountPercent > 0 else { return nil }
        return "-\(discountPercent)%"
    }

    var hasPromocodes: Bool {
        (_count?.promocodes ?? 0) > 0
    }

    var catalogAccessibilityLabel: String {
        var parts = [safeTitle, catalogSellerName, catalogPriceText]
        if let discount = catalogDiscountText {
            parts.append("скидка \(discount)")
        }
        if hasPromocodes {
            parts.append("доступен промокод")
        }
        return parts.joined(separator: ", ")
    }
}
