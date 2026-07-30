import SwiftUI
import MapKit
import CoreLocation

private enum BlinkPalette {
    static let signal = Color(red: 210/255, green: 1, blue: 93/255)
    static let ember = Color(red: 1, green: 120/255, blue: 48/255)
    static let ink = Color(red: 8/255, green: 8/255, blue: 10/255)
    static let surface = Color.black.opacity(0.78)
    static let border = Color.white.opacity(0.08)
}

struct DemoMapOffer: Identifiable, Equatable {
    let id: String
    let brand: String
    let title: String
    let venue: String
    let category: String
    let price: Double
    let discountPercent: Int
    let latitude: Double
    let longitude: Double
    let imageURL: String
    let isFlashDrop: Bool
    let isExclusive: Bool
    let description: String
}

// MARK: - Discovery Item
enum DiscoveryItem: Identifiable {
    case offer(Offer)
    case event(Event)
    case demoOffer(DemoMapOffer)

    var id: String {
        switch self {
        case .offer(let offer): return offer.id
        case .event(let event): return event.id
        case .demoOffer(let offer): return offer.id
        }
    }

    var coordinate: CLLocationCoordinate2D {
        switch self {
        case .offer(let offer):
            return CLLocationCoordinate2D(latitude: offer.latitude ?? 0, longitude: offer.longitude ?? 0)
        case .event(let event):
            return CLLocationCoordinate2D(latitude: event.latitude ?? 0, longitude: event.longitude ?? 0)
        case .demoOffer(let offer):
            return CLLocationCoordinate2D(latitude: offer.latitude, longitude: offer.longitude)
        }
    }

    var isOffer: Bool {
        if case .offer = self { return true }
        if case .demoOffer = self { return true }
        return false
    }

    var isDemoOffer: Bool {
        if case .demoOffer = self { return true }
        return false
    }

    var titleText: String {
        switch self {
        case .offer(let offer): return L10n.tr(offer.safeTitle)
        case .event(let event): return L10n.tr(event.title)
        case .demoOffer(let offer): return L10n.tr(offer.title)
        }
    }

    var categoryText: String {
        switch self {
        case .offer(let offer): return L10n.tr(offer.safeCategory)
        case .event(let event): return L10n.tr(event.category)
        case .demoOffer(let offer): return L10n.tr(offer.category)
        }
    }

    var imageURL: String {
        switch self {
        case .offer(let offer): return offer.safeProductThumbnail
        case .event(let event): return event.imageUrl
        case .demoOffer(let offer): return offer.imageURL
        }
    }

    var accentColor: Color {
        switch self {
        case .offer(let offer):
            if offer.safeIsFlashDrop { return .perklyOrange }
            if offer.safeIsExclusive { return .perklyGold }
            return BlinkPalette.signal
        case .event:
            return .perklyCyan
        case .demoOffer(let offer):
            if offer.isFlashDrop { return .perklyOrange }
            if offer.isExclusive { return .perklyGold }
            return BlinkPalette.signal
        }
    }

    var accentGradient: LinearGradient {
        switch self {
        case .offer(let offer):
            if offer.safeIsFlashDrop { return .perklyFire }
            if offer.safeIsExclusive { return .perklyGold }
            return LinearGradient(
                colors: [BlinkPalette.signal, Color.perklyGreen],
                startPoint: .leading,
                endPoint: .trailing
            )
        case .event:
            return LinearGradient(
                colors: [.perklyCyan, .perklyPurple],
                startPoint: .leading,
                endPoint: .trailing
            )
        case .demoOffer(let offer):
            if offer.isFlashDrop { return .perklyFire }
            if offer.isExclusive { return .perklyGold }
            return LinearGradient(
                colors: [BlinkPalette.signal, .perklyGreen],
                startPoint: .leading,
                endPoint: .trailing
            )
        }
    }

    var eyebrowText: String {
        switch self {
        case .offer(let offer):
            if offer.safeIsFlashDrop { return L10n.tr("СРОЧНОЕ ПРЕДЛОЖЕНИЕ") }
            if offer.safeIsExclusive { return L10n.tr("ЭКСКЛЮЗИВНО") }
            return L10n.tr("ПРЕДЛОЖЕНИЕ РЯДОМ")
        case .event:
            return L10n.tr("СОБЫТИЕ РЯДОМ")
        case .demoOffer(let offer):
            if offer.isFlashDrop { return "DEMO DROP" }
            if offer.isExclusive { return "DEMO VIP" }
            return "DEMO DEAL"
        }
    }

    var highlightText: String {
        switch self {
        case .offer(let offer):
            return "\(uzs(offer.safePrice))"
        case .event(let event):
            return L10n.format("map.event.participants", event.participantsCount)
        case .demoOffer(let offer):
            return "\(uzs(offer.price))"
        }
    }

    var metadataLine: String {
        switch self {
        case .offer(let offer):
            let discount = offer.discountPercent ?? 0
            if discount > 0 {
                return L10n.format("map.discount_category", discount, L10n.tr(offer.safeCategory))
            }
            return L10n.tr(offer.safeCategory)
        case .event(let event):
            return "\(event.startTime) • \(L10n.tr(event.location))"
        case .demoOffer(let offer):
            return L10n.format("map.discount_venue", offer.discountPercent, L10n.tr(offer.venue))
        }
    }

    var statusBadge: String? {
        switch self {
        case .offer(let offer):
            if offer.safeIsExclusive { return "VIP" }
            if offer.safeIsFlashDrop { return "HOT" }
            return nil
        case .event:
            return "NOW"
        case .demoOffer(let offer):
            if offer.isExclusive { return "VIP" }
            if offer.isFlashDrop { return "HOT" }
            return "DEMO"
        }
    }

    var ctaTitle: String {
        switch self {
        case .offer:
            return L10n.tr("Открыть предложение")
        case .event:
            return L10n.tr("Открыть в ленте")
        case .demoOffer:
            return L10n.tr("Смотреть демо")
        }
    }

    var compactStatText: String {
        switch self {
        case .offer(let offer):
            if let hours = offer.hoursLeft, hours > 0, hours < 24 {
                return L10n.format("recommendation.time.hours", Int(hours.rounded(.up)))
            }
            return "\(uzs(offer.safePrice))"
        case .event(let event):
            return "\(event.participantsCount)"
        case .demoOffer(let offer):
            if offer.isFlashDrop {
                return "\(offer.discountPercent)%"
            }
            return "\(uzs(offer.price))"
        }
    }
}

enum DiscoveryFilter: String, CaseIterable, Identifiable {
    case all
    case offers
    case events
    case flash
    case vip

    var id: String { rawValue }

    var title: String {
        switch self {
        case .all: return L10n.tr("Все")
        case .offers: return L10n.tr("Предложения")
        case .events: return L10n.tr("События")
        case .flash: return "Flash"
        case .vip: return "VIP"
        }
    }

    var icon: String {
        switch self {
        case .all: return "square.grid.2x2.fill"
        case .offers: return "tag.fill"
        case .events: return "music.note.list"
        case .flash: return "bolt.fill"
        case .vip: return "star.fill"
        }
    }

    func matches(_ annotation: DiscoveryAnnotation) -> Bool {
        switch self {
        case .all:
            return true
        case .offers:
            return annotation.item.isOffer
        case .events:
            return !annotation.item.isOffer
        case .flash:
            if case .offer(let offer) = annotation.item {
                return offer.safeIsFlashDrop
            }
            if case .demoOffer(let offer) = annotation.item {
                return offer.isFlashDrop
            }
            return false
        case .vip:
            if case .offer(let offer) = annotation.item {
                return offer.safeIsExclusive
            }
            if case .demoOffer(let offer) = annotation.item {
                return offer.isExclusive
            }
            return false
        }
    }
}

// MARK: - Map Annotation
struct DiscoveryAnnotation: Identifiable, Equatable {
    let id: String
    let item: DiscoveryItem
    let coordinate: CLLocationCoordinate2D

    static func == (lhs: DiscoveryAnnotation, rhs: DiscoveryAnnotation) -> Bool {
        lhs.id == rhs.id
    }

    func distanceText(from location: CLLocation?) -> String? {
        guard let location else { return nil }
        let point = CLLocation(latitude: coordinate.latitude, longitude: coordinate.longitude)
        let distance = location.distance(from: point)

        if distance < 1000 {
            return L10n.format("recommendation.distance.meters", Int(distance.rounded()))
        }

        return L10n.format("recommendation.distance.kilometers", distance / 1000)
    }
}

private struct TashkentDistrict: Identifiable {
    let id: String
    let name: String
    let coordinate: CLLocationCoordinate2D

    var headlineLines: [String] {
        switch id {
        case "shaykhontohur":
            return [L10n.tr("ШАЙХОН"), L10n.tr("ТОХУР")]
        case "mirzo-ulugbek":
            return [L10n.tr("МИРЗО"), L10n.tr("УЛУГБЕК")]
        default:
            return [L10n.tr(name)]
        }
    }
}

// MARK: - Map Discovery View
struct MapDiscoveryView: View {
    private static let tashkentCenter = CLLocationCoordinate2D(latitude: 41.2995, longitude: 69.2401)
    private static let defaultSpan = MKCoordinateSpan(latitudeDelta: 0.05, longitudeDelta: 0.05)
    private static let allowedLatitudeRange = 41.20...41.39
    private static let allowedLongitudeRange = 69.12...69.39
    private static let minimumLatitudeDelta: CLLocationDegrees = 0.016
    private static let minimumLongitudeDelta: CLLocationDegrees = 0.016
    private static let maximumLatitudeDelta: CLLocationDegrees = 0.18
    private static let maximumLongitudeDelta: CLLocationDegrees = 0.22

    @StateObject private var locationManager = LocationManager.shared
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var annotations: [DiscoveryAnnotation] = []
    @State private var isLoading = false
    @State private var selectedAnnotation: DiscoveryAnnotation?
    @State private var activeFilter: DiscoveryFilter = .all
    @State private var showLocationPrimer = false
    @State private var showSearchAreaButton = false
    @State private var cameraTrackingReady = false
    @State private var suppressNextAreaPrompt = false
    @State private var searchRadiusKm: Double = 10
    @State private var latestDiscoveryRequestID = UUID()
    @State private var currentMapCenter = Self.tashkentCenter
    @State private var currentMapSpan = Self.defaultSpan
    @State private var cameraPosition: MapCameraPosition = .region(
        MKCoordinateRegion(
            center: Self.tashkentCenter,
            span: Self.defaultSpan
        )
    )

    private var filteredAnnotations: [DiscoveryAnnotation] {
        annotations.filter { activeFilter.matches($0) }
    }

    private var offerCount: Int {
        annotations.filter(\.item.isOffer).count
    }

    private var eventCount: Int {
        annotations.count - offerCount
    }

    private var flashCount: Int {
        annotations.filter {
            if case .offer(let offer) = $0.item {
                return offer.safeIsFlashDrop
            }
            if case .demoOffer(let offer) = $0.item {
                return offer.isFlashDrop
            }
            return false
        }.count
    }

    private static let districts: [TashkentDistrict] = [
        TashkentDistrict(id: "shaykhontohur", name: "ШАЙХОНТОХУР", coordinate: CLLocationCoordinate2D(latitude: 41.3248, longitude: 69.2283)),
        TashkentDistrict(id: "yunusobod", name: "ЮНУСАБАД", coordinate: CLLocationCoordinate2D(latitude: 41.3656, longitude: 69.2888)),
        TashkentDistrict(id: "olmazor", name: "ОЛМАЗОР", coordinate: CLLocationCoordinate2D(latitude: 41.3442, longitude: 69.2059)),
        TashkentDistrict(id: "uchtepa", name: "УЧТЕПА", coordinate: CLLocationCoordinate2D(latitude: 41.2868, longitude: 69.1705)),
        TashkentDistrict(id: "chilonzor", name: "ЧИЛОНЗОР", coordinate: CLLocationCoordinate2D(latitude: 41.2756, longitude: 69.2040)),
        TashkentDistrict(id: "yakkasaroy", name: "ЯККАСАРОЙ", coordinate: CLLocationCoordinate2D(latitude: 41.2864, longitude: 69.2529)),
        TashkentDistrict(id: "mirobod", name: "МИРАБАД", coordinate: CLLocationCoordinate2D(latitude: 41.2986, longitude: 69.2862)),
        TashkentDistrict(id: "yashnobod", name: "ЯШНАБАД", coordinate: CLLocationCoordinate2D(latitude: 41.2949, longitude: 69.3386)),
        TashkentDistrict(id: "mirzo-ulugbek", name: "МИРЗО-УЛУГБЕК", coordinate: CLLocationCoordinate2D(latitude: 41.3222, longitude: 69.3476)),
        TashkentDistrict(id: "sergeli", name: "СЕРГЕЛИ", coordinate: CLLocationCoordinate2D(latitude: 41.2274, longitude: 69.2287))
    ]

    private static let demoOffers: [DemoMapOffer] = [
        DemoMapOffer(
            id: "demo-safia-1",
            brand: "Safia",
            title: "Сет десерт + кофе в Safia",
            venue: "Safia — ЦУМ",
            category: "Кофейни",
            price: 69_000,
            discountPercent: 22,
            latitude: 41.3116,
            longitude: 69.2795,
            imageURL: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=900&q=80",
            isFlashDrop: true,
            isExclusive: false,
            description: "Демо-оффер для Blink map: капучино + фирменный десерт по сниженной цене."
        ),
        DemoMapOffer(
            id: "demo-kafelito-1",
            brand: "Kafelito",
            title: "Утренний комбо в Kafelito",
            venue: "Kafelito — Амира Темура",
            category: "Кафе",
            price: 54_000,
            discountPercent: 18,
            latitude: 41.3278,
            longitude: 69.2812,
            imageURL: "https://images.unsplash.com/photo-1511920170033-f8396924c348?w=900&q=80",
            isFlashDrop: false,
            isExclusive: false,
            description: "Круассан, американо и маленький десерт. Хорошо работает как соседний nearby offer."
        ),
        DemoMapOffer(
            id: "demo-bon-1",
            brand: "Bon!",
            title: "Премиум box из Bon!",
            venue: "Bon! — Tashkent City",
            category: "Пекарни",
            price: 85_000,
            discountPercent: 15,
            latitude: 41.3169,
            longitude: 69.2485,
            imageURL: "https://images.unsplash.com/photo-1555507036-ab794f4afe5b?w=900&q=80",
            isFlashDrop: false,
            isExclusive: true,
            description: "Демо-VIP оффер с набором из выпечки и авторского напитка."
        ),
        DemoMapOffer(
            id: "demo-ecorn-1",
            brand: "Ecorn",
            title: "Бранч на двоих в Ecorn",
            venue: "Ecorn — Паркент",
            category: "Рестораны",
            price: 149_000,
            discountPercent: 20,
            latitude: 41.3007,
            longitude: 69.3321,
            imageURL: "https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=900&q=80",
            isFlashDrop: true,
            isExclusive: false,
            description: "Демо-связка для карты: яркий brunch-offer с сильной витриной на фото."
        ),
        DemoMapOffer(
            id: "demo-blackstar-1",
            brand: "Black Star Burger",
            title: "Burger hit + fries combo",
            venue: "Black Star Burger — Magic City",
            category: "Фастфуд",
            price: 92_000,
            discountPercent: 17,
            latitude: 41.2856,
            longitude: 69.2430,
            imageURL: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900&q=80",
            isFlashDrop: false,
            isExclusive: false,
            description: "Демо-точка для плотности карты и более коммерческого микса рядом с событиями."
        )
    ]

    var body: some View {
        ZStack {
            Map(position: $cameraPosition, interactionModes: .all, selection: .constant(nil)) {
                UserAnnotation()

                ForEach(filteredAnnotations) { annotation in
                    Annotation("", coordinate: annotation.coordinate) {
                        Button {
                            focus(on: annotation, zoomDelta: 0.022)
                            HapticManager.shared.playMapMarkerSelection()
                        } label: {
                            BlinkDiscoveryPin(
                                annotation: annotation,
                                isSelected: selectedAnnotation?.id == annotation.id
                            )
                        }
                        .buttonStyle(.plain)
                        .accessibilityElement(children: .ignore)
                        .accessibilityLabel(markerAccessibilityLabel(for: annotation))
                        .accessibilityValue(markerAccessibilityValue(for: annotation))
                        .accessibilityHint("Показывает подробную карточку точки")
                    }
                }
            }
            .mapStyle(.standard(elevation: .flat, pointsOfInterest: .excludingAll))
            .overlay {
                LinearGradient(
                    colors: [
                        BlinkPalette.ink.opacity(0.18),
                        Color.clear,
                        BlinkPalette.ink.opacity(bottomMapShadeOpacity)
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .ignoresSafeArea()
                .allowsHitTesting(false)
            }
            .ignoresSafeArea()

            VStack(spacing: 0) {
                topOverlay

                if showSearchAreaButton, selectedAnnotation == nil {
                    Button {
                        showSearchAreaButton = false
                        Task { await loadDiscoveryData(around: currentMapCenter) }
                    } label: {
                        Label("Искать в этой области", systemImage: "magnifyingglass")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 15)
                            .frame(height: PerklyDesign.Size.minimumTouchTarget)
                            .perklyGlass(cornerRadius: 22, tint: .perklyPurple.opacity(0.25))
                    }
                    .buttonStyle(.plain)
                    .transition(.move(edge: .top).combined(with: .opacity))
                }

                Spacer(minLength: 0)

                if let selectedAnnotation {
                    BlinkDiscoveryDetailCard(
                        annotation: selectedAnnotation,
                        userLocation: locationManager.lastLocation
                    ) {
                        withAnimation(reduceMotion ? nil : .spring(response: 0.32, dampingFraction: 0.82)) {
                            self.selectedAnnotation = nil
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, detailBottomInset)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                } else if !isLoading, filteredAnnotations.isEmpty {
                    HStack(spacing: 12) {
                        Image(systemName: "mappin.slash.circle.fill")
                            .font(.system(size: 22, weight: .bold))
                            .foregroundColor(.perklyOrange)
                            .accessibilityHidden(true)

                        VStack(alignment: .leading, spacing: 3) {
                            Text("В этой области пока пусто")
                                .font(.headline)
                                .foregroundColor(.white)
                                .accessibilityAddTraits(.isHeader)
                            Text(activeFilter == .all ? "Переместите карту и повторите поиск." : "Попробуйте показать все типы точек.")
                                .font(.subheadline.weight(.medium))
                                .foregroundColor(.white.opacity(0.52))
                        }

                        Spacer(minLength: 4)

                        if activeFilter != .all {
                            Button("Все") { activeFilter = .all }
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(.black)
                                .padding(.horizontal, 12)
                                .frame(height: PerklyDesign.Size.minimumTouchTarget)
                                .background(Color.white)
                                .clipShape(Capsule())
                                .buttonStyle(.plain)
                        }
                    }
                    .padding(14)
                    .background(BlinkPalette.ink.opacity(0.94))
                    .clipShape(RoundedRectangle(cornerRadius: PerklyDesign.Radius.card))
                    .padding(.horizontal, PerklyDesign.Spacing.md)
                    .padding(.bottom, 104)
                }
            }
            .ignoresSafeArea(edges: .bottom)

            VStack {
                Spacer()
                HStack {
                    Spacer()

                    PerklyGlassGroup(spacing: 12) {
                        VStack(spacing: 12) {
                            mapActionButton(icon: isLoading ? "hourglass" : "location.fill", isProminent: true) {
                                recenterOnUser()
                            } onLongPress: {
                                Task { await loadDiscoveryData() }
                            }
                            .disabled(isLoading)
                        }
                    }
                    .padding(.trailing, 16)
                    .padding(.bottom, actionButtonsBottomInset)
                }
            }

            if locationManager.authorizationStatus == .denied ||
                locationManager.authorizationStatus == .restricted {
                VStack {
                    Spacer()
                    LocationPermissionBanner()
                        .padding(.horizontal, 16)
                        .padding(.bottom, selectedAnnotation == nil ? 150 : 260)
                }
            }

            if showLocationPrimer {
                Color.black.opacity(0.34)
                    .ignoresSafeArea()
                    .onTapGesture { showLocationPrimer = false }
                    .accessibilityHidden(true)

                VStack {
                    Spacer()
                    MapLocationPrimer(
                        onAllow: {
                            showLocationPrimer = false
                            locationManager.requestPermissions()
                        },
                        onLater: {
                            showLocationPrimer = false
                        }
                    )
                    .padding(.horizontal, PerklyDesign.Spacing.md)
                    .padding(.bottom, 104)
                }
                .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .task {
            if locationManager.authorizationStatus == .notDetermined {
                showLocationPrimer = true
            }
            locationManager.startUpdating()
            await loadDiscoveryData()
            cameraTrackingReady = true
        }
        .onMapCameraChange(frequency: .continuous) { context in
            let clampedRegion = clampedRegion(for: context.region)
            currentMapCenter = clampedRegion.center
            currentMapSpan = clampedRegion.span

            if requiresMapCorrection(from: context.region, to: clampedRegion) {
                cameraPosition = .region(clampedRegion)
            }
        }
        .onMapCameraChange(frequency: .onEnd) { _ in
            guard cameraTrackingReady else { return }
            if suppressNextAreaPrompt {
                suppressNextAreaPrompt = false
            } else if selectedAnnotation == nil {
                withAnimation(reduceMotion ? nil : .easeOut(duration: 0.2)) {
                    showSearchAreaButton = true
                }
            }
        }
        .onChange(of: locationManager.lastLocation) { _, location in
            guard let location else { return }
            guard selectedAnnotation == nil else { return }

            let center = coordinateIfInsideTashkent(location.coordinate) ?? Self.tashkentCenter
            setCamera(center: center, span: Self.defaultSpan, animation: .easeInOut(duration: 0.8))
        }
        .onChange(of: activeFilter) { _, _ in
            if let selectedAnnotation, !filteredAnnotations.contains(selectedAnnotation) {
                self.selectedAnnotation = nil
            }
        }
        .onDisappear {
            locationManager.stopUpdating()
        }
    }

    private var topOverlay: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top, spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(L10n.tr(primaryDistrict.name).capitalized)
                        .font(.title2.bold())
                        .foregroundColor(.white)
                        .lineLimit(2)
                        .fixedSize(horizontal: false, vertical: true)
                        .accessibilityAddTraits(.isHeader)

                    Text(mapSummaryText)
                        .font(.footnote.weight(.bold))
                        .foregroundColor(.white.opacity(0.58))
                        .lineLimit(1)
                }

                Spacer(minLength: 8)

                Menu {
                    ForEach([2.0, 5.0, 10.0], id: \.self) { radius in
                        Button {
                            searchRadiusKm = radius
                            showSearchAreaButton = false
                            Task { await loadDiscoveryData(around: currentMapCenter) }
                        } label: {
                            if searchRadiusKm == radius {
                                Label("\(Int(radius)) км", systemImage: "checkmark")
                            } else {
                                Text("\(Int(radius)) км")
                            }
                        }
                    }
                } label: {
                    Label("\(Int(searchRadiusKm)) км", systemImage: "scope")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 11)
                        .frame(height: PerklyDesign.Size.minimumTouchTarget)
                        .perklyGlass(cornerRadius: 22)
                }
                .accessibilityLabel("Радиус поиска")
                .accessibilityValue("\(Int(searchRadiusKm)) километров")
                .accessibilityHint("Открывает выбор радиуса")
            }

            ScrollView(.horizontal, showsIndicators: false) {
                PerklyGlassGroup(spacing: 10) {
                    HStack(spacing: 10) {
                        ForEach([DiscoveryFilter.all, .offers, .events]) { filter in
                            BlinkFilterChip(
                                filter: filter,
                                isSelected: activeFilter == filter
                            ) {
                                withAnimation(reduceMotion ? nil : .spring(response: 0.28, dampingFraction: 0.82)) {
                                    activeFilter = filter
                                }
                            }
                        }
                    }
                    .padding(.horizontal, 2)
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 8)
        .padding(.bottom, 8)
        .background(
            LinearGradient(
                colors: [BlinkPalette.ink.opacity(0.78), BlinkPalette.ink.opacity(0.18), Color.clear],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea(edges: .top)
        )
    }

    private var currentRegion: MKCoordinateRegion {
        MKCoordinateRegion(center: currentMapCenter, span: currentMapSpan)
    }

    private var sortedDistrictsByDistance: [TashkentDistrict] {
        let centerLocation = CLLocation(latitude: currentMapCenter.latitude, longitude: currentMapCenter.longitude)
        return Self.districts.sorted { lhs, rhs in
            let lhsDistance = CLLocation(latitude: lhs.coordinate.latitude, longitude: lhs.coordinate.longitude)
                .distance(from: centerLocation)
            let rhsDistance = CLLocation(latitude: rhs.coordinate.latitude, longitude: rhs.coordinate.longitude)
                .distance(from: centerLocation)
            return lhsDistance < rhsDistance
        }
    }

    private var visibleDistricts: [TashkentDistrict] {
        let maxVisible = currentMapSpan.latitudeDelta < 0.030 ? 4 : (currentMapSpan.latitudeDelta < 0.060 ? 6 : 8)

        return Array(
            sortedDistrictsByDistance
                .filter { coordinateIsVisible($0.coordinate, in: currentRegion, paddingFactor: 0.16) }
                .prefix(maxVisible)
        )
    }

    private var districtHighlightIDs: Set<String> {
        Set(sortedDistrictsByDistance.prefix(3).map(\.id))
    }

    private var primaryDistrict: TashkentDistrict {
        sortedDistrictsByDistance.first ?? Self.districts[0]
    }

    private var nearbyDistrictNames: [String] {
        return sortedDistrictsByDistance
            .prefix(2)
            .map(\.name)
    }

    private var subtitleText: String {
        if isLoading {
            return L10n.tr("Пересобираем карту точек вокруг района.")
        }

        switch activeFilter {
        case .all:
            return L10n.format("map.points_near_district", L10n.tr(primaryDistrict.name).lowercased())
        case .offers:
            return L10n.tr("Предложения внутри и вокруг района.")
        case .events:
            return L10n.tr("События рядом и в соседних районах.")
        case .flash:
            return L10n.tr("Срочные скидки рядом.")
        case .vip:
            return L10n.tr("Эксклюзивные точки по району.")
        }
    }

    private var detailBottomInset: CGFloat {
        92
    }

    private var actionButtonsBottomInset: CGFloat {
        if selectedAnnotation != nil { return 250 }
        return 128
    }

    private var bottomMapShadeOpacity: Double {
        selectedAnnotation != nil ? 0.24 : 0.08
    }

    private var mapSummaryText: String {
        if isLoading { return L10n.tr("Обновляем предложения…") }
        let count = filteredAnnotations.count
        return count == 1
            ? L10n.tr("1 точка рядом")
            : L10n.format("map.points_nearby", count)
    }

    private func mapActionButton(
        icon: String,
        isProminent: Bool = false,
        action: @escaping () -> Void,
        onLongPress: (() -> Void)? = nil
    ) -> some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 15, weight: .black))
                .foregroundColor(.white)
                .frame(width: PerklyDesign.Size.minimumTouchTarget, height: PerklyDesign.Size.minimumTouchTarget)
                .perklyGlass(
                    cornerRadius: 16,
                    tint: isProminent ? BlinkPalette.signal.opacity(0.18) : nil
                )
        }
        .buttonStyle(.plain)
        .accessibilityLabel(isProminent ? "Моё местоположение" : "Действие карты")
        .accessibilityHint(isProminent ? "Возвращает карту к вашему местоположению. Долгое нажатие обновляет точки." : "")
        .simultaneousGesture(
            LongPressGesture(minimumDuration: 0.7)
                .onEnded { _ in
                    onLongPress?()
                }
        )
    }

    private func recenterOnUser() {
        if locationManager.authorizationStatus == .notDetermined {
            withAnimation(reduceMotion ? nil : .spring(response: 0.32, dampingFraction: 0.84)) {
                showLocationPrimer = true
            }
            return
        }

        guard let location = locationManager.lastLocation,
              let coordinate = coordinateIfInsideTashkent(location.coordinate) else {
            locationManager.requestPermissions()
            locationManager.startUpdating()
            setCamera(center: Self.tashkentCenter, span: Self.defaultSpan)
            return
        }

        setCamera(
            center: coordinate,
            span: MKCoordinateSpan(latitudeDelta: 0.035, longitudeDelta: 0.035)
        )
    }

    private func focus(on annotation: DiscoveryAnnotation, zoomDelta: CLLocationDegrees) {
        selectedAnnotation = annotation
        setCamera(
            center: annotation.coordinate,
            span: MKCoordinateSpan(latitudeDelta: zoomDelta, longitudeDelta: zoomDelta)
        )
    }

    private func markerAccessibilityLabel(
        for annotation: DiscoveryAnnotation
    ) -> String {
        [
            annotation.item.titleText,
            annotation.item.categoryText,
            annotation.item.highlightText
        ]
        .filter { !$0.isEmpty }
        .joined(separator: ", ")
    }

    private func markerAccessibilityValue(
        for annotation: DiscoveryAnnotation
    ) -> String {
        var values: [String] = []

        if selectedAnnotation?.id == annotation.id {
            values.append(L10n.tr("Выбрано"))
        }

        if let distance = annotation.distanceText(
            from: locationManager.lastLocation
        ) {
            values.append(distance)
        }

        return values.joined(separator: ", ")
    }

    private func loadDiscoveryData(around coordinate: CLLocationCoordinate2D? = nil) async {
        let requestID = UUID()
        latestDiscoveryRequestID = requestID
        isLoading = true
        do {
            let location = coordinate.map { CLLocation(latitude: $0.latitude, longitude: $0.longitude) }
                ?? locationManager.lastLocation
            let filters = OfferFilters(
                take: 50,
                lat: location?.coordinate.latitude,
                lng: location?.coordinate.longitude,
                radiusKm: location != nil ? searchRadiusKm : nil
            )

            async let offersResponse = OffersService.shared.list(filters: filters)
            async let eventsResponse = EventsService.shared.list(take: 50)

            let (offers, events) = try await (offersResponse, eventsResponse)
            guard latestDiscoveryRequestID == requestID else { return }
            guard !Task.isCancelled else {
                isLoading = false
                return
            }

            let mappedOffers = offers.data.compactMap { offer -> DiscoveryAnnotation? in
                guard let latitude = offer.latitude, let longitude = offer.longitude else { return nil }
                return DiscoveryAnnotation(
                    id: offer.id,
                    item: .offer(offer),
                    coordinate: CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
                )
            }

            let mappedEvents = events.data.compactMap { event -> DiscoveryAnnotation? in
                guard let latitude = event.latitude, let longitude = event.longitude else { return nil }
                if let location {
                    let eventLocation = CLLocation(latitude: latitude, longitude: longitude)
                    guard eventLocation.distance(from: location) <= searchRadiusKm * 1_000 else { return nil }
                }
                return DiscoveryAnnotation(
                    id: event.id,
                    item: .event(event),
                    coordinate: CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
                )
            }

            #if DEBUG
            let mappedDemoOffers = Self.demoOffers.map { offer in
                DiscoveryAnnotation(
                    id: offer.id,
                    item: .demoOffer(offer),
                    coordinate: CLLocationCoordinate2D(latitude: offer.latitude, longitude: offer.longitude)
                )
            }
            #else
            let mappedDemoOffers: [DiscoveryAnnotation] = []
            #endif

            await MainActor.run {
                guard latestDiscoveryRequestID == requestID else { return }
                annotations = sortAnnotationsByDistance(
                    mappedOffers + mappedEvents + mappedDemoOffers,
                    from: location
                )
                if let selectedAnnotation, !annotations.contains(selectedAnnotation) {
                    self.selectedAnnotation = nil
                }
                locationManager.setupGeofences(for: offers.data)
            }
        } catch {
            guard latestDiscoveryRequestID == requestID else { return }
            #if DEBUG
            print("Failed to load map offers")
            #endif
            HapticManager.shared.playError()
        }

        if latestDiscoveryRequestID == requestID {
            isLoading = false
        }
    }

    private func sortAnnotationsByDistance(
        _ items: [DiscoveryAnnotation],
        from origin: CLLocation? = nil
    ) -> [DiscoveryAnnotation] {
        guard let location = origin ?? locationManager.lastLocation else { return items }

        return items.sorted { lhs, rhs in
            let lhsLocation = CLLocation(latitude: lhs.coordinate.latitude, longitude: lhs.coordinate.longitude)
            let rhsLocation = CLLocation(latitude: rhs.coordinate.latitude, longitude: rhs.coordinate.longitude)
            return lhsLocation.distance(from: location) < rhsLocation.distance(from: location)
        }
    }

    private func labelChip(icon: String, title: String) -> some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
            Text(title)
        }
        .font(.system(size: 11, weight: .black))
        .foregroundColor(.white)
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .background(BlinkPalette.surface)
        .clipShape(Capsule())
        .overlay(
            Capsule()
                .stroke(BlinkPalette.border, lineWidth: 1)
        )
    }

    private func setCamera(
        center: CLLocationCoordinate2D,
        span: MKCoordinateSpan,
        animation: Animation = .spring(response: 0.35, dampingFraction: 0.82)
    ) {
        suppressNextAreaPrompt = true
        let region = clampedRegion(
            for: MKCoordinateRegion(center: center, span: span)
        )

        withAnimation(animation) {
            cameraPosition = .region(region)
        }
    }

    private func clampedRegion(for region: MKCoordinateRegion) -> MKCoordinateRegion {
        MKCoordinateRegion(
            center: clampedCoordinate(region.center),
            span: MKCoordinateSpan(
                latitudeDelta: min(max(region.span.latitudeDelta, Self.minimumLatitudeDelta), Self.maximumLatitudeDelta),
                longitudeDelta: min(max(region.span.longitudeDelta, Self.minimumLongitudeDelta), Self.maximumLongitudeDelta)
            )
        )
    }

    private func clampedCoordinate(_ coordinate: CLLocationCoordinate2D) -> CLLocationCoordinate2D {
        CLLocationCoordinate2D(
            latitude: min(max(coordinate.latitude, Self.allowedLatitudeRange.lowerBound), Self.allowedLatitudeRange.upperBound),
            longitude: min(max(coordinate.longitude, Self.allowedLongitudeRange.lowerBound), Self.allowedLongitudeRange.upperBound)
        )
    }

    private func coordinateIfInsideTashkent(_ coordinate: CLLocationCoordinate2D) -> CLLocationCoordinate2D? {
        guard Self.allowedLatitudeRange.contains(coordinate.latitude),
              Self.allowedLongitudeRange.contains(coordinate.longitude) else {
            return nil
        }

        return coordinate
    }

    private func coordinateIsVisible(
        _ coordinate: CLLocationCoordinate2D,
        in region: MKCoordinateRegion,
        paddingFactor: CLLocationDegrees
    ) -> Bool {
        let latitudePadding = region.span.latitudeDelta * paddingFactor
        let longitudePadding = region.span.longitudeDelta * paddingFactor

        let latitudeRange = (region.center.latitude - region.span.latitudeDelta / 2 - latitudePadding)...(region.center.latitude + region.span.latitudeDelta / 2 + latitudePadding)
        let longitudeRange = (region.center.longitude - region.span.longitudeDelta / 2 - longitudePadding)...(region.center.longitude + region.span.longitudeDelta / 2 + longitudePadding)

        return latitudeRange.contains(coordinate.latitude) && longitudeRange.contains(coordinate.longitude)
    }

    private func requiresMapCorrection(from source: MKCoordinateRegion, to target: MKCoordinateRegion) -> Bool {
        abs(source.center.latitude - target.center.latitude) > 0.0005 ||
        abs(source.center.longitude - target.center.longitude) > 0.0005 ||
        abs(source.span.latitudeDelta - target.span.latitudeDelta) > 0.0005 ||
        abs(source.span.longitudeDelta - target.span.longitudeDelta) > 0.0005
    }
}

// MARK: - Pin
struct BlinkDiscoveryPin: View {
    let annotation: DiscoveryAnnotation
    let isSelected: Bool

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 6) {
                if annotation.item.isOffer {
                    Text(annotation.item.compactStatText)
                        .font(.system(size: isSelected ? 11 : 10, weight: .black, design: .rounded))
                } else {
                    Image(systemName: eventIcon)
                        .font(.system(size: isSelected ? 12 : 10, weight: .black))
                }

                if isSelected {
                    Text(annotation.item.categoryText.uppercased())
                        .font(.system(size: 8, weight: .bold))
                        .lineLimit(1)
                }
            }
            .foregroundColor(.black)
            .padding(.horizontal, isSelected ? 11 : 8)
            .padding(.vertical, isSelected ? 9 : 7)
            .background(annotation.item.accentGradient)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(Color.black.opacity(0.22), lineWidth: 1)
            )
            .shadow(color: annotation.item.accentColor.opacity(isSelected ? 0.34 : 0.18), radius: isSelected ? 12 : 7, y: 5)
            .scaleEffect(isSelected ? 1.06 : 1.0)

            MapPinTriangle()
                .fill(annotation.item.accentColor)
                .frame(width: 10, height: 6)
                .offset(y: -1)
        }
        .animation(.spring(response: 0.28, dampingFraction: 0.76), value: isSelected)
    }

    private var eventIcon: String {
        switch annotation.item.categoryText.lowercased() {
        case "фестиваль": return "music.note.house.fill"
        case "вечеринка": return "sparkles"
        case "выставка": return "paintpalette.fill"
        case "фуд-фест": return "fork.knife"
        case "стендап": return "mic.fill"
        default: return "calendar"
        }
    }
}

// MARK: - Triangle stem
struct MapPinTriangle: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: rect.midX, y: rect.maxY))
        path.addLine(to: CGPoint(x: rect.minX, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.minY))
        path.closeSubpath()
        return path
    }
}

private struct BlinkDistrictLabel: View {
    let district: TashkentDistrict
    let isPrimary: Bool
    let isNearby: Bool

    var body: some View {
        labelText
            .padding(.horizontal, horizontalPadding)
            .padding(.vertical, verticalPadding)
            .background {
                ZStack {
                    RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                        .fill(Color.black.opacity(plinthOpacity))
                        .blur(radius: isPrimary ? 18 : 12)
                        .offset(y: isPrimary ? 16 : 10)
                        .scaleEffect(x: 0.94, y: 0.72, anchor: .bottom)

                    RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                        .fill(Color.black.opacity(basePlateOpacity))

                    RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                        .fill(
                            LinearGradient(
                                colors: [
                                    Color.white.opacity(topSheenOpacity),
                                    Color.white.opacity(centerGlowOpacity),
                                    Color.black.opacity(bottomInkOpacity)
                                ],
                                startPoint: .top,
                                endPoint: .bottom
                            )
                        )

                    RoundedRectangle(cornerRadius: cornerRadius - 2, style: .continuous)
                        .fill(
                            LinearGradient(
                                colors: [
                                    Color.white.opacity(highlightBandOpacity),
                                    Color.clear
                                ],
                                startPoint: .top,
                                endPoint: .bottom
                            )
                        )
                        .padding(.horizontal, 2)
                        .padding(.top, 2)
                        .padding(.bottom, isPrimary ? 16 : 12)
                }
            }
            .overlay {
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .stroke(
                        LinearGradient(
                            colors: [
                                Color.white.opacity(topBorderOpacity),
                                Color.white.opacity(bottomBorderOpacity)
                            ],
                            startPoint: .top,
                            endPoint: .bottom
                        ),
                        lineWidth: isPrimary ? 1.2 : 1
                    )
            }
            .overlay(alignment: .bottom) {
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .fill(Color.black.opacity(edgeShadowOpacity))
                    .frame(height: isPrimary ? 10 : 8)
                    .blur(radius: 7)
                    .offset(y: isPrimary ? 10 : 8)
                    .padding(.horizontal, isPrimary ? 10 : 8)
            }
            .shadow(color: Color.black.opacity(dropShadowOpacity), radius: isPrimary ? 26 : 18, y: isPrimary ? 12 : 8)
            .shadow(color: Color.white.opacity(topGlowOpacity), radius: isPrimary ? 8 : 5, y: -1)
            .rotation3DEffect(
                .degrees(isPrimary ? 16 : (isNearby ? 13 : 11)),
                axis: (x: 1, y: 0, z: 0),
                anchor: .bottom,
                perspective: 0.9
            )
            .scaleEffect(isPrimary ? 1.06 : (isNearby ? 1.02 : 0.98))
    }

    private var labelText: some View {
        VStack(spacing: isPrimary ? -5 : -3) {
            ForEach(Array(district.headlineLines.enumerated()), id: \.offset) { index, line in
                Text(line)
                    .font(.system(size: fontSize(for: index), weight: .black, design: .rounded))
                    .tracking(isPrimary ? 2.3 : 1.8)
                    .foregroundStyle(
                        LinearGradient(
                            colors: [
                                Color.white.opacity(topTextOpacity),
                                Color.white.opacity(bottomTextOpacity)
                            ],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    .shadow(color: Color.black.opacity(0.88), radius: 2, y: 2)
                    .shadow(color: Color.white.opacity(isPrimary ? 0.24 : 0.14), radius: isPrimary ? 5 : 3, y: -1)
                    .lineLimit(1)
            }
        }
    }

    private var horizontalPadding: CGFloat {
        isPrimary ? 18 : 13
    }

    private var verticalPadding: CGFloat {
        isPrimary ? 12 : 8
    }

    private var cornerRadius: CGFloat {
        isPrimary ? 22 : 16
    }

    private var topTextOpacity: Double {
        if isPrimary { return 0.96 }
        if isNearby { return 0.82 }
        return 0.68
    }

    private var bottomTextOpacity: Double {
        if isPrimary { return 0.74 }
        if isNearby { return 0.60 }
        return 0.44
    }

    private var plinthOpacity: Double {
        if isPrimary { return 0.42 }
        if isNearby { return 0.30 }
        return 0.22
    }

    private var basePlateOpacity: Double {
        if isPrimary { return 0.34 }
        if isNearby { return 0.24 }
        return 0.18
    }

    private var topSheenOpacity: Double {
        if isPrimary { return 0.24 }
        if isNearby { return 0.18 }
        return 0.12
    }

    private var centerGlowOpacity: Double {
        if isPrimary { return 0.10 }
        if isNearby { return 0.08 }
        return 0.05
    }

    private var bottomInkOpacity: Double {
        if isPrimary { return 0.22 }
        if isNearby { return 0.18 }
        return 0.14
    }

    private var highlightBandOpacity: Double {
        if isPrimary { return 0.20 }
        if isNearby { return 0.14 }
        return 0.08
    }

    private var topBorderOpacity: Double {
        if isPrimary { return 0.30 }
        if isNearby { return 0.20 }
        return 0.12
    }

    private var bottomBorderOpacity: Double {
        if isPrimary { return 0.06 }
        if isNearby { return 0.04 }
        return 0.02
    }

    private var edgeShadowOpacity: Double {
        if isPrimary { return 0.34 }
        if isNearby { return 0.24 }
        return 0.18
    }

    private var dropShadowOpacity: Double {
        if isPrimary { return 0.52 }
        if isNearby { return 0.38 }
        return 0.28
    }

    private var topGlowOpacity: Double {
        if isPrimary { return 0.12 }
        if isNearby { return 0.08 }
        return 0.04
    }

    private func fontSize(for index: Int) -> CGFloat {
        if district.headlineLines.count > 1 {
            return isPrimary ? (index == 0 ? 19 : 17) : (isNearby ? 15 : 14)
        }
        return isPrimary ? 22 : (isNearby ? 18 : 16)
    }
}

// MARK: - Rail
struct BlinkDiscoveryRail: View {
    let annotations: [DiscoveryAnnotation]
    let userLocation: CLLocation?
    let onSelect: (DiscoveryAnnotation) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                signalRailHeader
                Spacer()
            }
            .padding(.horizontal, 16)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(annotations) { annotation in
                        Button {
                            onSelect(annotation)
                        } label: {
                            BlinkCompactDiscoveryCard(annotation: annotation, userLocation: userLocation)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 16)
            }
        }
        .padding(.top, 12)
        .padding(.bottom, 8)
        .background(
            LinearGradient(
                colors: [
                    Color.clear,
                    BlinkPalette.ink.opacity(0.36),
                    BlinkPalette.ink.opacity(0.76)
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .allowsHitTesting(false)
        )
    }

    private var signalRailHeader: some View {
        HStack(spacing: 8) {
            Image(systemName: "dot.radiowaves.left.and.right")
                .font(.system(size: 11, weight: .black))
                .foregroundColor(BlinkPalette.signal)
                .accessibilityHidden(true)

            Text("Рядом")
                .font(.system(size: 14, weight: .black, design: .rounded))
                .foregroundColor(.white)

            Text("\(annotations.count)")
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(.white.opacity(0.72))
        }
    }
}

struct BlinkCompactDiscoveryCard: View {
    let annotation: DiscoveryAnnotation
    let userLocation: CLLocation?

    var body: some View {
        Group {
            if annotation.item.isDemoOffer {
                compactDemoCard
            } else {
                defaultCard
            }
        }
    }

    private var defaultCard: some View {
        VStack(alignment: .leading, spacing: 9) {
            cardImage(height: 82)

            VStack(alignment: .leading, spacing: 5) {
                Text(annotation.item.titleText)
                    .font(.system(size: 14, weight: .black, design: .rounded))
                    .foregroundColor(.white)
                    .lineLimit(2)

                Text(annotation.item.metadataLine)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(.white.opacity(0.62))
                    .lineLimit(1)

                HStack {
                    Text(annotation.item.highlightText)
                        .font(.system(size: 13, weight: .heavy))
                        .foregroundColor(annotation.item.accentColor)

                    Spacer()

                    if let distanceText = annotation.distanceText(from: userLocation) {
                        Text(distanceText)
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.white.opacity(0.8))
                    }
                }
            }
            .padding(.horizontal, 12)
            .padding(.bottom, 12)
        }
        .frame(width: 184)
        .background(BlinkPalette.surface)
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(cardBorder)
        .shadow(color: Color.black.opacity(0.28), radius: 14, y: 8)
    }

    private var compactDemoCard: some View {
        ZStack(alignment: .topLeading) {
            AsyncImage(url: RemoteImageURL.url(from: annotation.item.imageURL)) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } placeholder: {
                Rectangle()
                    .fill(Color.white.opacity(0.06))
            }
            .frame(width: 184, height: 164)
            .clipped()
            .accessibilityHidden(true)

            LinearGradient(
                colors: [
                    Color.black.opacity(0.70),
                    Color.clear,
                    Color.black.opacity(0.84)
                ],
                startPoint: .top,
                endPoint: .bottom
            )

            VStack(alignment: .leading, spacing: 0) {
                badgeHeader

                Spacer(minLength: 0)

                VStack(alignment: .leading, spacing: 6) {
                    Text(annotation.item.titleText)
                        .font(.system(size: 14, weight: .black, design: .rounded))
                        .foregroundColor(.white)
                        .lineLimit(2)

                    Text(annotation.item.metadataLine)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(.white.opacity(0.72))
                        .lineLimit(1)

                    HStack(alignment: .bottom) {
                        Text(annotation.item.highlightText)
                            .font(.system(size: 13, weight: .heavy))
                            .foregroundColor(annotation.item.accentColor)

                        Spacer(minLength: 8)

                        if let distanceText = annotation.distanceText(from: userLocation) {
                            Text(distanceText)
                                .font(.system(size: 11, weight: .bold))
                                .foregroundColor(.white.opacity(0.82))
                        }
                    }
                }
                .padding(.horizontal, 12)
                .padding(.bottom, 12)
            }
        }
        .frame(width: 184, height: 164, alignment: .top)
        .background(BlinkPalette.surface)
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(cardBorder)
        .shadow(color: Color.black.opacity(0.28), radius: 14, y: 8)
    }

    private func cardImage(height: CGFloat) -> some View {
        ZStack(alignment: .topLeading) {
            AsyncImage(url: RemoteImageURL.url(from: annotation.item.imageURL)) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } placeholder: {
                Rectangle()
                    .fill(Color.white.opacity(0.06))
            }
            .frame(width: 184, height: height)
            .clipped()
            .accessibilityHidden(true)

            LinearGradient(
                colors: [Color.black.opacity(0.75), Color.clear],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            badgeHeader
        }
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    private var badgeHeader: some View {
        VStack(alignment: .leading, spacing: 6) {
            if !annotation.item.isDemoOffer {
                Text(annotation.item.eyebrowText)
                    .font(.system(size: 10, weight: .black))
                    .tracking(1.2)
                    .foregroundColor(annotation.item.accentColor)
            }

            if let statusBadge = annotation.item.statusBadge {
                Text(statusBadge)
                    .font(.system(size: 9, weight: .black))
                    .foregroundColor(.black)
                    .padding(.horizontal, 7)
                    .padding(.vertical, 4)
                    .background(annotation.item.accentColor)
                    .clipShape(Capsule())
            }
        }
        .padding(12)
    }

    private var cardBorder: some View {
        RoundedRectangle(cornerRadius: 20, style: .continuous)
            .stroke(BlinkPalette.border, lineWidth: 1)
    }
}

// MARK: - Detail Card
struct BlinkDiscoveryDetailCard: View {
    let annotation: DiscoveryAnnotation
    let userLocation: CLLocation?
    let onClose: () -> Void

    var body: some View {
        VStack(spacing: 14) {
            HStack(spacing: 13) {
                AsyncImage(url: RemoteImageURL.url(from: annotation.item.imageURL)) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Rectangle()
                        .fill(Color.white.opacity(0.06))
                }
                .frame(width: 76, height: 76)
                .clipped()
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                .accessibilityHidden(true)

                VStack(alignment: .leading, spacing: 5) {
                    Text(annotation.item.titleText)
                        .font(.headline)
                        .foregroundColor(.white)
                        .lineLimit(3)
                        .fixedSize(horizontal: false, vertical: true)

                    Text(annotation.item.metadataLine)
                        .font(.subheadline.weight(.medium))
                        .foregroundColor(.white.opacity(0.58))
                        .lineLimit(1)

                    HStack(spacing: 8) {
                        Text(annotation.item.highlightText)
                            .font(.subheadline.weight(.bold))
                            .foregroundColor(annotation.item.accentColor)
                    if let distanceText = annotation.distanceText(from: userLocation) {
                            Text("· \(distanceText)")
                                .font(.footnote.weight(.bold))
                                .foregroundColor(.white.opacity(0.68))
                        }
                    }
                }

                Spacer(minLength: 4)

                Button(action: onClose) {
                    Image(systemName: "xmark")
                        .font(.system(size: 12, weight: .black))
                        .foregroundColor(.white.opacity(0.72))
                        .frame(width: PerklyDesign.Size.minimumTouchTarget, height: PerklyDesign.Size.minimumTouchTarget)
                        .background(Color.white.opacity(0.07))
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Закрыть карточку \(annotation.item.titleText)")
            }

            NavigationLink(destination: destinationView) {
                HStack(spacing: 12) {
                    Text(annotation.item.ctaTitle)
                        .font(.headline)

                    Spacer()

                    Image(systemName: "arrow.up.right")
                        .font(.system(size: 14, weight: .black))
                }
                .foregroundColor(.black)
                .padding(.horizontal, 18)
                .padding(.vertical, 14)
                .frame(minHeight: PerklyDesign.Size.minimumTouchTarget)
                .background(annotation.item.accentGradient)
                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            }
            .buttonStyle(.plain)
            .accessibilityLabel(annotation.item.ctaTitle)
            .accessibilityHint("Открывает подробности")
        }
        .padding(14)
        .background(
            BlinkPalette.ink.opacity(0.96)
                .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .stroke(BlinkPalette.border, lineWidth: 1)
        )
        .shadow(color: Color.black.opacity(0.35), radius: 24, y: 12)
    }

    @ViewBuilder
    private var destinationView: some View {
        switch annotation.item {
        case .offer(let offer):
            OfferDetailView(offerId: offer.id)
        case .event:
            FeedView()
        case .demoOffer(let offer):
            DemoMapOfferView(offer: offer, distanceText: annotation.distanceText(from: userLocation))
        }
    }

}

// MARK: - Filter / Summary
struct BlinkFilterChip: View {
    let filter: DiscoveryFilter
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 7) {
                Image(systemName: filter.icon)
                    .font(.system(size: 10, weight: .black))
                Text(filter.title)
                    .font(.system(size: 12, weight: .black, design: .rounded))
            }
            .foregroundColor(isSelected ? .white : .white.opacity(0.78))
            .padding(.horizontal, 12)
            .frame(minHeight: PerklyDesign.Size.minimumTouchTarget)
            .perklyGlass(
                cornerRadius: 22,
                tint: isSelected ? BlinkPalette.signal.opacity(0.18) : nil
            )
        }
        .buttonStyle(.plain)
        .accessibilityLabel(filter.title)
        .accessibilityValue(isSelected ? "Выбрано" : "Не выбрано")
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}

struct SummaryPill: View {
    let title: String
    let value: String
    let accent: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title.uppercased())
                .font(.system(size: 10, weight: .black))
                .tracking(1.1)
                .foregroundColor(.white.opacity(0.45))

            Text(value)
                .font(.system(size: 18, weight: .black, design: .rounded))
                .foregroundColor(accent)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(BlinkPalette.surface)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(BlinkPalette.border, lineWidth: 1)
        )
        .accessibilityElement(children: .combine)
    }
}

struct DemoMapOfferView: View {
    let offer: DemoMapOffer
    let distanceText: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                AsyncImage(url: RemoteImageURL.url(from: offer.imageURL)) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Rectangle()
                        .fill(Color.white.opacity(0.06))
                }
                .frame(height: 260)
                .clipped()
                .clipShape(RoundedRectangle(cornerRadius: 28, style: .continuous))
                .accessibilityHidden(true)
                .overlay(alignment: .topLeading) {
                    HStack(spacing: 8) {
                        Text("DEMO")
                            .font(.system(size: 10, weight: .black))
                            .foregroundColor(.black)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(BlinkPalette.signal)
                            .clipShape(Capsule())

                        if offer.isExclusive {
                            Text("ЭКСКЛЮЗИВ")
                                .font(.system(size: 10, weight: .black))
                                .foregroundColor(.black)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 6)
                                .background(Color.perklyGold)
                                .clipShape(Capsule())
                        }
                    }
                    .padding(16)
                }

                VStack(alignment: .leading, spacing: 12) {
                    Text(L10n.tr(offer.brand).uppercased())
                        .font(.system(size: 12, weight: .black))
                        .tracking(1.8)
                        .foregroundColor(BlinkPalette.signal)

                    Text(L10n.tr(offer.title))
                        .font(.title.bold())
                        .foregroundColor(.white)
                        .fixedSize(horizontal: false, vertical: true)
                        .accessibilityAddTraits(.isHeader)

                    Text(L10n.tr(offer.description))
                        .font(.body.weight(.medium))
                        .foregroundColor(.white.opacity(0.7))
                }

                HStack(spacing: 10) {
                    demoMetric(title: "Цена", value: "\(uzs(offer.price))", accent: .perklyGreen)
                    demoMetric(title: "Скидка", value: "\(offer.discountPercent)%", accent: .perklyOrange)
                    demoMetric(title: "Рядом", value: distanceText ?? "город", accent: .perklyCyan)
                }

                VStack(alignment: .leading, spacing: 10) {
                    Text("Локация")
                        .font(.system(size: 11, weight: .black))
                        .tracking(1.4)
                        .foregroundColor(.white.opacity(0.45))

                    Text(L10n.tr(offer.venue))
                        .font(.system(size: 17, weight: .bold))
                        .foregroundColor(.white)
                }
                .padding(16)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.white.opacity(0.04))
                .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))

                Text("Демонстрационная точка для проверки интерфейса карты.")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(.white.opacity(0.58))
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(20)
        }
        .background(Color.perklyDark.ignoresSafeArea())
        .navigationTitle(L10n.tr(offer.brand))
        .navigationBarTitleDisplayMode(.inline)
    }

    private func demoMetric(title: String, value: String, accent: Color) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.system(size: 10, weight: .black))
                .foregroundColor(.white.opacity(0.42))
            Text(value)
                .font(.system(size: 16, weight: .heavy))
                .foregroundColor(accent)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(Color.white.opacity(0.04))
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
}

// MARK: - Location Permission Banner
struct LocationPermissionBanner: View {
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "location.slash.fill")
                .font(.system(size: 20))
                .foregroundColor(.perklyOrange)
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 2) {
                Text("Геолокация отключена")
                    .font(.headline)
                    .foregroundColor(.white)
                    .accessibilityAddTraits(.isHeader)
                Text("Включите в Настройках, чтобы видеть ближайшие скидки")
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.6))
                    .fixedSize(horizontal: false, vertical: true)
            }

            Spacer()

            Button {
                if let url = URL(string: UIApplication.openSettingsURLString) {
                    UIApplication.shared.open(url)
                }
            } label: {
                Text("Открыть")
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(.black)
                    .padding(.horizontal, 12)
                    .frame(minHeight: PerklyDesign.Size.minimumTouchTarget)
                    .background(Color.white)
                    .clipShape(Capsule())
            }
            .accessibilityLabel("Открыть настройки геолокации")
            .accessibilityHint("Открывает системные настройки Perkly")
        }
        .padding(16)
        .background(
            BlinkPalette.ink.opacity(0.95)
                .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .stroke(Color.perklyOrange.opacity(0.3), lineWidth: 1)
                )
        )
        .shadow(color: .black.opacity(0.4), radius: 20)
    }
}

private struct MapLocationPrimer: View {
    let onAllow: () -> Void
    let onLater: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: PerklyDesign.Spacing.md) {
            Image(systemName: "location.circle.fill")
                .font(.system(size: 34, weight: .bold))
                .foregroundColor(BlinkPalette.signal)
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 7) {
                Text("Показать предложения рядом?")
                    .font(.title2.bold())
                    .foregroundColor(.white)
                    .accessibilityAddTraits(.isHeader)

                Text("Геолокация нужна, чтобы считать расстояние и сначала показывать ближайшие места. Доступ используется только во время работы с приложением.")
                    .font(.body.weight(.medium))
                    .foregroundColor(.white.opacity(0.6))
                    .fixedSize(horizontal: false, vertical: true)
            }

            VStack(spacing: 8) {
                Button(action: onAllow) {
                    Label("Показать рядом", systemImage: "location.fill")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.black)
                        .frame(maxWidth: .infinity)
                        .frame(height: PerklyDesign.Size.controlHeight)
                        .background(BlinkPalette.signal)
                        .clipShape(RoundedRectangle(cornerRadius: PerklyDesign.Radius.control))
                }
                .buttonStyle(.plain)

                Button("Не сейчас", action: onLater)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white.opacity(0.62))
                    .frame(maxWidth: .infinity)
                    .frame(height: PerklyDesign.Size.minimumTouchTarget)
                    .buttonStyle(.plain)
            }
        }
        .padding(PerklyDesign.Spacing.lg)
        .background(BlinkPalette.ink.opacity(0.97))
        .clipShape(RoundedRectangle(cornerRadius: PerklyDesign.Radius.feature, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: PerklyDesign.Radius.feature, style: .continuous)
                .stroke(Color.white.opacity(0.09), lineWidth: 1)
        }
        .shadow(color: .black.opacity(0.36), radius: 28, y: 14)
    }
}
