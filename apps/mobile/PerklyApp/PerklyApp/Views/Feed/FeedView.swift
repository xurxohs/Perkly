import SwiftUI
import PhotosUI
import UIKit

let feedDetailAnimation = Animation.spring(response: 0.56, dampingFraction: 0.86)

// MARK: - Feed View (App Store "Today" Style)
struct LegacyFeedView: View {
    @StateObject private var vm = FeedViewModel()
    @EnvironmentObject var authVM: AuthViewModel
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.scenePhase) private var scenePhase
    @State private var showCreateEvent = false
    @State private var selectedEvent: Event?
    @State private var isDetailPresented = false
    @State private var dismissWorkItem: DispatchWorkItem?
    @State private var selectedFilter: FeedFilter = .all
    @State private var savedEventIDs: Set<String> = []
    @State private var savingEventIDs: Set<String> = []
    @Namespace private var animation

    private var filteredEvents: [Event] {
        vm.events.filter { selectedFilter.matches($0) }
    }

    private var todayHighlights: [Event] {
        Array(vm.events.filter(\.isToday).prefix(3))
    }

    private var feedListEvents: [Event] {
        guard selectedFilter == .all else { return filteredEvents }
        let highlightedIDs = Set(todayHighlights.map(\.id))
        let remaining = filteredEvents.filter { !highlightedIDs.contains($0.id) }
        return remaining.isEmpty ? filteredEvents : remaining
    }
    
    var body: some View {
        ZStack {
            feedContent
                .scaleEffect(isDetailPresented ? 0.94 : 1, anchor: .top)
                .offset(y: isDetailPresented ? -12 : 0)
                .allowsHitTesting(!isDetailPresented)
                .animation(reduceMotion ? nil : feedDetailAnimation, value: isDetailPresented)

            if let event = selectedEvent {
                EventDetailHeroView(
                    event: event,
                    animation: animation,
                    isPresented: isDetailPresented,
                    isSaved: savedEventIDs.contains(event.id),
                    isSaving: savingEventIDs.contains(event.id),
                    onToggleSaved: {
                        toggleSaved(event)
                    },
                    onClose: dismissDetail
                )
                .zIndex(2)
            }
        }
        .background(Color(red: 0x11/255, green: 0x11/255, blue: 0x11/255).ignoresSafeArea())
        .navigationBarHidden(true)
        .refreshable {
            await vm.loadEvents()
        }
        .task(id: authVM.user?.id) {
            restoreSavedEvents()
            await synchronizeSavedEvents()
            await vm.loadEvents()
        }
        .task {
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(20))
                guard !Task.isCancelled else { return }
                await vm.loadEvents()
            }
        }
        .onChange(of: scenePhase) { _, phase in
            guard phase == .active else { return }
            Task { await vm.loadEvents() }
        }
        .sheet(isPresented: $showCreateEvent) {
            CreateEventSheet(onSuccess: {
                Task { await vm.loadEvents() }
            })
            .presentationDetents([.large])
            .presentationDragIndicator(.visible)
        }
    }

    @ViewBuilder
    private var feedContent: some View {
        if vm.isLoading && vm.events.isEmpty {
            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 0) {
                    header

                    FeedLoadingSkeleton()
                        .padding(.horizontal, 16)
                        .padding(.bottom, 150)
                }
            }
            .coordinateSpace(name: "feedScroll")
            .scrollDisabled(isDetailPresented)
        } else if let error = vm.error, vm.events.isEmpty {
            VStack(spacing: 0) {
                header

                FeedStateView(
                    icon: "wifi.exclamationmark",
                    title: "Не удалось загрузить ленту",
                    message: error,
                    buttonTitle: "Повторить",
                    action: {
                        Task { await vm.loadEvents() }
                    }
                )
                .padding(.horizontal, 24)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if vm.events.isEmpty {
            VStack(spacing: 0) {
                header

                FeedStateView(
                    icon: "flame.fill",
                    title: "Пока нет событий",
                    message: "Новые городские события появятся здесь после публикации.",
                    buttonTitle: "Добавить событие",
                    action: {
                        showCreateEvent = true
                    }
                )
                .padding(.horizontal, 24)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else {
            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 0) {
                    header

                    if selectedFilter == .all, !todayHighlights.isEmpty {
                        FeedTodayBlock(events: todayHighlights) { event in
                            present(event)
                        }
                        .padding(.horizontal, 16)
                        .padding(.bottom, 16)
                    }

                    FeedFilterBar(selectedFilter: $selectedFilter)
                        .padding(.bottom, 16)

                    if let error = vm.error {
                        FeedNoticeBanner(message: error) {
                            Task { await vm.loadEvents() }
                        }
                        .padding(.horizontal, 16)
                        .padding(.bottom, 12)
                    }

                    if feedListEvents.isEmpty {
                        FeedStateView(
                            icon: selectedFilter.icon,
                            title: "По фильтру пусто",
                            message: "Попробуйте другой фильтр или обновите ленту.",
                            buttonTitle: "Показать все",
                            action: {
                                withAnimation(reduceMotion ? nil : .spring(response: 0.3, dampingFraction: 0.86)) {
                                    selectedFilter = .all
                                }
                            }
                        )
                        .padding(.horizontal, 24)
                        .padding(.top, 40)
                        .padding(.bottom, 150)
                    } else {
                        HStack {
                            VStack(alignment: .leading, spacing: 3) {
                                Text(selectedFilter == .all ? "Скоро" : selectedFilter.title)
                                    .font(.system(size: 24, weight: .heavy, design: .rounded))
                                    .foregroundColor(.perklyTextPrimary)
                                Text("События, которые стоит сохранить в планах")
                                    .font(.system(size: 13, weight: .medium))
                                    .foregroundColor(Color.perklyTextPrimary.opacity(0.44))
                            }
                            Spacer()
                        }
                        .padding(.horizontal, 16)
                        .padding(.bottom, 12)

                        LazyVStack(spacing: 16) {
                            ForEach(Array(feedListEvents.enumerated()), id: \.element.id) { index, event in
                                FeedNewsCard(
                                    event: event,
                                    index: index,
                                    animation: animation,
                                    isExpanded: selectedEvent?.id == event.id,
                                    isSaved: savedEventIDs.contains(event.id),
                                    onToggleSaved: {
                                        toggleSaved(event)
                                    }
                                )
                                .opacity(selectedEvent?.id == event.id ? 0 : 1)
                                .onTapGesture {
                                    present(event)
                                }
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.bottom, 150)
                    }
                }
            }
            .coordinateSpace(name: "feedScroll")
            .scrollDisabled(isDetailPresented)
        }
    }
    
    private var header: some View {
        HStack {
            Spacer()
            
            VStack(spacing: 2) {
                Text("Топка")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(.perklyTextPrimary)
                Text("События Ташкента")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(Color.perklyTextPrimary.opacity(0.42))
            }
            
            Spacer()
        }
        .overlay(alignment: .trailing) {
            Button {
                showCreateEvent = true
            } label: {
                Image(systemName: "plus")
                    .font(.system(size: 20, weight: .heavy))
                    .foregroundColor(.perklyTextPrimary)
                    .frame(width: 44, height: 44)
                    .background(Color.fireGradient)
                    .clipShape(Circle())
                    .overlay(
                        Circle()
                            .stroke(Color.perklyOverlay.opacity(0.18), lineWidth: 1)
                    )
                    .shadow(color: .perklyOrange.opacity(0.35), radius: 16, y: 8)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Добавить событие")
        }
        .padding(.horizontal, 16)
        .padding(.top, 16)
        .padding(.bottom, 16)
    }
    
    private func present(_ event: Event) {
        dismissWorkItem?.cancel()
        selectedEvent = event
        withAnimation(reduceMotion ? nil : feedDetailAnimation) {
            isDetailPresented = true
        }
    }

    private func dismissDetail() {
        dismissWorkItem?.cancel()
        withAnimation(reduceMotion ? nil : feedDetailAnimation) {
            isDetailPresented = false
        }
        let workItem = DispatchWorkItem {
            selectedEvent = nil
        }
        dismissWorkItem = workItem
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.42, execute: workItem)
    }

    private func toggleSaved(_ event: Event) {
        guard savingEventIDs.insert(event.id).inserted else { return }
        let wasSaved = savedEventIDs.contains(event.id)
        if wasSaved {
            savedEventIDs.remove(event.id)
        } else {
            savedEventIDs.insert(event.id)
        }
        persistSavedEvents()
        HapticManager.shared.lightImpact()

        guard authVM.isAuthenticated else {
            savingEventIDs.remove(event.id)
            return
        }

        Task {
            do {
                if wasSaved {
                    _ = try await EventsService.shared.unsave(event.id)
                } else {
                    _ = try await EventsService.shared.save(event.id)
                }
            } catch {
                if wasSaved { savedEventIDs.insert(event.id) }
                else { savedEventIDs.remove(event.id) }
                persistSavedEvents()
            }
            savingEventIDs.remove(event.id)
        }
    }

    private func restoreSavedEvents() {
        guard let data = UserDefaults.standard.data(forKey: savedEventsStorageKey),
              let ids = try? JSONDecoder().decode([String].self, from: data) else {
            savedEventIDs = []
            return
        }
        savedEventIDs = Set(ids)
    }

    private func persistSavedEvents() {
        guard let data = try? JSONEncoder().encode(Array(savedEventIDs)) else { return }
        UserDefaults.standard.set(data, forKey: savedEventsStorageKey)
    }

    private func synchronizeSavedEvents() async {
        guard authVM.isAuthenticated else { return }
        do {
            for id in savedEventIDs {
                _ = try await EventsService.shared.save(id)
            }
            savedEventIDs = Set(try await EventsService.shared.saved().map(\.eventId))
            persistSavedEvents()
        } catch {
            #if DEBUG
            print("Saved events synchronization failed: \(error.localizedDescription)")
            #endif
        }
    }

    private var savedEventsStorageKey: String {
        guard let userId = authVM.user?.id else { return "perkly_saved_event_ids.guest" }
        return "perkly_saved_event_ids.user.\(userId)"
    }
}

enum FeedFilter: String, CaseIterable, Identifiable {
    case all
    case today
    case weekend
    case food
    case music
    case free

    var id: String { rawValue }

    var title: String {
        switch self {
        case .all: return L10n.tr("Все")
        case .today: return L10n.tr("Сегодня")
        case .weekend: return L10n.tr("Выходные")
        case .food: return L10n.tr("Еда")
        case .music: return L10n.tr("Музыка")
        case .free: return L10n.tr("Бесплатно")
        }
    }

    var icon: String {
        switch self {
        case .all: return "sparkles"
        case .today: return "calendar"
        case .weekend: return "sun.max.fill"
        case .food: return "fork.knife"
        case .music: return "music.note"
        case .free: return "ticket.fill"
        }
    }

    func matches(_ event: Event) -> Bool {
        switch self {
        case .all: return true
        case .today: return event.isToday
        case .weekend: return event.isWeekend
        case .food: return event.isFoodRelated
        case .music: return event.isMusicRelated
        case .free: return event.isFreeEntry
        }
    }
}

private extension Event {
    var normalizedSearchText: String {
        "\(title) \(description) \(category) \(location) \(tags?.joined(separator: " ") ?? "") \(badges?.joined(separator: " ") ?? "") \(priceText ?? "")".lowercased()
    }

    var isToday: Bool {
        guard let eventDate else { return false }
        return Calendar.current.isDateInToday(eventDate)
    }

    var isWeekend: Bool {
        guard let eventDate else { return false }
        let weekday = Calendar.current.component(.weekday, from: eventDate)
        return weekday == 1 || weekday == 7
    }

    var isFoodRelated: Bool {
        let text = normalizedSearchText
        return text.contains("food")
            || text.contains("restaurant")
            || text.contains("cafe")
            || text.contains("bar")
            || text.contains("еда")
            || text.contains("кафе")
            || text.contains("ресторан")
            || text.contains("бар")
            || text.contains("фуд")
    }

    var isMusicRelated: Bool {
        let text = normalizedSearchText
        return text.contains("concert")
            || text.contains("party")
            || text.contains("music")
            || text.contains("концерт")
            || text.contains("музык")
            || text.contains("вечерин")
            || text.contains("dj")
    }

    var isFreeEntry: Bool {
        if explicitBadges.contains(where: { $0.localizedCaseInsensitiveContains("бесплат") || $0.localizedCaseInsensitiveContains("free") }) {
            return true
        }
        let text = normalizedSearchText
        return text.contains("бесплат")
            || text.contains("вход свобод")
            || text.contains("free")
            || text.contains("0 сум")
    }

    var isHotEvent: Bool {
        explicitBadges.contains(where: { $0.localizedCaseInsensitiveContains("hot") })
            || viewersCount >= 250
            || participantsCount >= 1000
    }
}

struct FeedTodayBlock: View {
    let events: [Event]
    let onSelect: (Event) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .firstTextBaseline) {
                VStack(alignment: .leading, spacing: 3) {
                    Text("Сегодня в Ташкенте")
                        .font(.system(size: 22, weight: .heavy, design: .rounded))
                        .foregroundColor(.perklyTextPrimary)

                    Text("Быстрые рекомендации")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(Color.perklyTextPrimary.opacity(0.44))
                }

                Spacer()

                Image(systemName: "flame.fill")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(Color.fireGradient)
            }

            HStack(spacing: 10) {
                ForEach(events) { event in
                    Button {
                        onSelect(event)
                    } label: {
                        FeedQuickRecommendation(event: event)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding(18)
        .background(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: [
                            Color.perklyOverlay.opacity(0.075),
                            Color.perklyOrange.opacity(0.07),
                            Color.perklyOverlay.opacity(0.035)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
        )
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .stroke(Color.perklyOverlay.opacity(0.08), lineWidth: 1)
        )
    }
}

struct FeedQuickRecommendation: View {
    let event: Event

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 5) {
                Image(systemName: event.isFreeEntry ? "ticket.fill" : "clock.fill")
                    .font(.system(size: 10, weight: .bold))
                Text(event.isFreeEntry ? "Бесплатно" : event.startTime)
                    .font(.system(size: 11, weight: .bold))
                    .lineLimit(1)
            }
            .foregroundColor(event.isFreeEntry ? .perklyGreen : .perklyOrange)

            Text(L10n.tr(event.title))
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(.perklyTextPrimary)
                .lineLimit(2)
                .multilineTextAlignment(.leading)
                .frame(maxWidth: .infinity, alignment: .leading)

            HStack(spacing: 4) {
                Image(systemName: "mappin.circle.fill")
                    .font(.system(size: 10, weight: .semibold))
                Text(L10n.tr(event.location))
                    .font(.system(size: 11, weight: .medium))
                    .lineLimit(1)
            }
            .foregroundColor(Color.perklyTextPrimary.opacity(0.42))
        }
        .frame(maxWidth: .infinity, minHeight: 104, alignment: .topLeading)
        .padding(12)
        .background(Color.black.opacity(0.20))
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(Color.perklyOverlay.opacity(0.08), lineWidth: 1)
        )
    }
}

struct FeedFilterBar: View {
    @Binding var selectedFilter: FeedFilter
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach([FeedFilter.all, .today, .weekend, .free]) { filter in
                    Button {
                        withAnimation(reduceMotion ? nil : .spring(response: 0.3, dampingFraction: 0.86)) {
                            selectedFilter = filter
                        }
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: filter.icon)
                                .font(.system(size: 12, weight: .bold))
                            Text(filter.title)
                                .font(.system(size: 13, weight: .bold))
                        }
                        .foregroundColor(selectedFilter == filter ? .white : .white.opacity(0.58))
                        .padding(.horizontal, 13)
                        .frame(height: PerklyDesign.Size.minimumTouchTarget)
                        .background(
                            selectedFilter == filter
                                ? AnyShapeStyle(Color.fireGradient)
                                : AnyShapeStyle(Color.perklyOverlay.opacity(0.06))
                        )
                        .clipShape(Capsule())
                        .overlay(
                            Capsule()
                                .stroke(Color.perklyOverlay.opacity(selectedFilter == filter ? 0.14 : 0.07), lineWidth: 1)
                        )
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 16)
        }
    }
}

struct FeedLoadingSkeleton: View {
    @State private var pulse = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        LazyVStack(spacing: 16) {
            ForEach(0..<3, id: \.self) { index in
                Rectangle()
                    .fill(
                        LinearGradient(
                            colors: [
                                Color.perklyOverlay.opacity(pulse ? 0.10 : 0.05),
                                Color.perklyOverlay.opacity(pulse ? 0.04 : 0.02)
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .aspectRatio(cardAspectRatio(for: index), contentMode: .fit)
                    .overlay(alignment: .bottomLeading) {
                        VStack(alignment: .leading, spacing: 10) {
                            RoundedRectangle(cornerRadius: 7, style: .continuous)
                                .fill(Color.perklyOverlay.opacity(0.13))
                                .frame(width: index == 0 ? 210 : 170, height: 14)
                            RoundedRectangle(cornerRadius: 6, style: .continuous)
                                .fill(Color.perklyOverlay.opacity(0.08))
                                .frame(width: index == 0 ? 150 : 130, height: 10)
                        }
                        .padding(22)
                    }
                    .clipShape(SquircleShape(cornerRadius: index == 0 ? 46 : 38, n: 4))
            }
        }
        .onAppear {
            guard !reduceMotion else { return }
            withAnimation(.easeInOut(duration: 1.1).repeatForever(autoreverses: true)) {
                pulse = true
            }
        }
    }

    private func cardAspectRatio(for index: Int) -> CGFloat {
        index == 0 ? 3.0 / 4.0 : 0.84
    }
}

struct FeedStateView: View {
    let icon: String
    let title: String
    let message: String
    let buttonTitle: String?
    let action: (() -> Void)?

    var body: some View {
        VStack(spacing: 18) {
            Image(systemName: icon)
                .font(.system(size: 42, weight: .bold))
                .foregroundStyle(Color.fireGradient)
                .frame(width: 78, height: 78)
                .background(Color.perklyOverlay.opacity(0.05))
                .clipShape(Circle())
                .overlay(Circle().stroke(Color.perklyOverlay.opacity(0.08), lineWidth: 1))

            VStack(spacing: 8) {
                Text(L10n.tr(title))
                    .font(.system(size: 22, weight: .bold))
                    .foregroundColor(.perklyTextPrimary)
                    .multilineTextAlignment(.center)

                Text(L10n.tr(message))
                    .font(.system(size: 14))
                    .foregroundColor(Color.perklyTextPrimary.opacity(0.48))
                    .multilineTextAlignment(.center)
                    .lineSpacing(3)
            }

            if let buttonTitle, let action {
                Button(action: action) {
                    Text(L10n.tr(buttonTitle))
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.perklyTextPrimary)
                        .padding(.horizontal, 22)
                        .frame(height: 46)
                        .background(Color.fireGradient)
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                }
                .buttonStyle(.plain)
                .padding(.top, 4)
            }
        }
        .padding(.bottom, 80)
    }
}

struct FeedNoticeBanner: View {
    let message: String
    let retry: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(.perklyOrange)

            Text(L10n.tr(message))
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(Color.perklyTextPrimary.opacity(0.7))
                .lineLimit(2)

            Spacer(minLength: 8)

            Button("Повторить", action: retry)
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(.perklyTextPrimary)
                .buttonStyle(.plain)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(Color.perklyOverlay.opacity(0.055))
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(Color.perklyOverlay.opacity(0.08), lineWidth: 1)
        )
    }
}

// MARK: - Squircle Shape (Superellipse corners, straight edges)

struct SquircleShape: Shape {
    let cornerRadius: CGFloat
    let n: CGFloat

    init(cornerRadius: CGFloat = 42, n: CGFloat = 4) {
        self.cornerRadius = cornerRadius
        self.n = n
    }

    func path(in rect: CGRect) -> Path {
        let w = rect.width
        let h = rect.height
        let radius = min(cornerRadius, min(w, h) / 2)
        let steps = 64

        var path = Path()

        path.move(to: CGPoint(x: rect.minX + radius, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.maxX - radius, y: rect.minY))
        addCorner(
            to: &path,
            center: CGPoint(x: rect.maxX - radius, y: rect.minY + radius),
            radius: radius,
            startAngle: -.pi / 2,
            endAngle: 0,
            steps: steps
        )

        path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY - radius))
        addCorner(
            to: &path,
            center: CGPoint(x: rect.maxX - radius, y: rect.maxY - radius),
            radius: radius,
            startAngle: 0,
            endAngle: .pi / 2,
            steps: steps
        )

        path.addLine(to: CGPoint(x: rect.minX + radius, y: rect.maxY))
        addCorner(
            to: &path,
            center: CGPoint(x: rect.minX + radius, y: rect.maxY - radius),
            radius: radius,
            startAngle: .pi / 2,
            endAngle: .pi,
            steps: steps
        )

        path.addLine(to: CGPoint(x: rect.minX, y: rect.minY + radius))
        addCorner(
            to: &path,
            center: CGPoint(x: rect.minX + radius, y: rect.minY + radius),
            radius: radius,
            startAngle: .pi,
            endAngle: .pi * 1.5,
            steps: steps
        )

        path.closeSubpath()
        return path
    }

    private func addCorner(
        to path: inout Path,
        center: CGPoint,
        radius: CGFloat,
        startAngle: CGFloat,
        endAngle: CGFloat,
        steps: Int
    ) {
        for i in 1...steps {
            let progress = CGFloat(i) / CGFloat(steps)
            let angle = startAngle + (endAngle - startAngle) * progress
            let cosVal = cos(angle)
            let sinVal = sin(angle)
            let x = center.x + radius * sign(cosVal) * pow(abs(cosVal), 2 / n)
            let y = center.y + radius * sign(sinVal) * pow(abs(sinVal), 2 / n)

            path.addLine(to: CGPoint(x: x, y: y))
        }
    }

    private func sign(_ v: CGFloat) -> CGFloat {
        v >= 0 ? 1 : -1
    }
}

// MARK: - News Card (Straight card, squircle corners)

struct FeedNewsCard: View {
    let event: Event
    let index: Int
    var animation: Namespace.ID
    let isExpanded: Bool
    let isSaved: Bool
    let onToggleSaved: () -> Void

    private var cardAspectRatio: CGFloat {
        if index == 0 { return 3.0 / 4.0 }
        return index.isMultiple(of: 4) ? 0.78 : 0.84
    }

    private var cardCornerRadius: CGFloat {
        index == 0 ? 46 : 38
    }

    private var titleFontSize: CGFloat {
        index == 0 ? 26 : 22
    }

    private var formattedDate: String {
        let formatter = DateFormatter()
        formatter.locale = L10n.locale
        formatter.dateFormat = "d MMMM yyyy"
        if let date = ISO8601DateFormatter().date(from: event.date) {
            return formatter.string(from: date)
        }
        return event.shortDisplayDate
    }

    private var categoryTitle: String {
        switch event.category.lowercased() {
        case "concert": return L10n.tr("Концерт")
        case "party": return L10n.tr("Вечеринка")
        case "sport": return L10n.tr("Спорт")
        case "education": return L10n.tr("Обучение")
        case "food", "restaurant": return L10n.tr("Еда")
        case "culture", "exhibition": return L10n.tr("Культура")
        default:
            return event.category.isEmpty ? "Событие" : event.category.capitalized
        }
    }

    private var categoryColor: Color {
        switch event.category.lowercased() {
        case "concert": return .perklyOrange
        case "party": return .perklyPurple
        case "sport": return .perklyGreen
        case "education": return .perklyCyan
        case "food", "restaurant": return .perklyGold
        default: return .perklyOrange
        }
    }

    private var categoryIcon: String {
        switch event.category.lowercased() {
        case "concert": return "music.mic"
        case "party": return "sparkles"
        case "sport": return "figure.run"
        case "education": return "book.fill"
        case "food", "restaurant": return "fork.knife"
        case "culture", "exhibition": return "paintpalette.fill"
        default: return "flame.fill"
        }
    }

    var body: some View {
        // Layer 1: Image as base
        Group {
            if let url = RemoteImageURL.url(from: event.posterImageUrl) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    case .failure:
                        fallbackImage
                    default:
                        fallbackImage
                    }
                }
                .matchedGeometryEffect(id: "image\(event.id)", in: animation)
            } else {
                fallbackImage
            }
        }
        .frame(maxWidth: .infinity)
        .aspectRatio(cardAspectRatio, contentMode: .fit)
        .clipped()
        // Layer 2: Gradient overlay
        .overlay {
            LinearGradient(
                stops: [
                    .init(color: .black.opacity(0.14), location: 0.00),
                    .init(color: .clear, location: 0.24),
                    .init(color: .black.opacity(0.45), location: 0.56),
                    .init(color: Color.perklyDark.opacity(0.96), location: 1.0),
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .matchedGeometryEffect(id: "vignette\(event.id)", in: animation)
        }
        .overlay(alignment: .top) {
            HStack(alignment: .top, spacing: 12) {
                VStack(alignment: .leading, spacing: 8) {
                    HStack(spacing: 8) {
                        FeedCardBadge(title: categoryTitle, color: categoryColor)

                        if event.explicitBadges.isEmpty {
                            if event.isToday {
                                FeedCardBadge(title: "Сегодня", color: .perklyCyan)
                            }

                            if event.isFreeEntry {
                                FeedCardBadge(title: "Бесплатно", color: .perklyGreen)
                            }
                        } else {
                            ForEach(Array(event.explicitBadges.prefix(3)), id: \.self) { badge in
                                FeedCardBadge(title: badge, color: badge.localizedCaseInsensitiveContains("hot") ? .perklyRed : .perklyOrange)
                            }
                        }
                    }

                    if event.explicitBadges.isEmpty && (event.isHotEvent || index == 0) {
                        FeedCardBadge(title: event.isHotEvent ? "Популярно" : "Выбор Топки", color: event.isHotEvent ? .perklyRed : .perklyPurple)
                    }
                }

                Spacer(minLength: 8)

                Button(action: onToggleSaved) {
                    Image(systemName: isSaved ? "bookmark.fill" : "bookmark")
                        .font(.system(size: 17, weight: .bold))
                        .foregroundColor(isSaved ? .perklyGold : .white.opacity(0.86))
                        .frame(width: PerklyDesign.Size.minimumTouchTarget, height: PerklyDesign.Size.minimumTouchTarget)
                        .background(Color.black.opacity(0.34))
                        .clipShape(Circle())
                        .overlay(Circle().stroke(Color.perklyOverlay.opacity(0.12), lineWidth: 1))
                }
                .buttonStyle(.plain)
                .accessibilityLabel(isSaved ? "Убрать из сохраненных" : "Сохранить событие")
            }
            .padding(.top, 18)
            .padding(.horizontal, 18)
        }
        // Layer 3: Text content at bottom
        .overlay(alignment: .bottomLeading) {
            VStack(alignment: .leading, spacing: 12) {
                Text(L10n.tr(event.title))
                    .font(.system(size: titleFontSize, weight: .heavy, design: .rounded))
                    .foregroundColor(.perklyTextPrimary)
                    .lineLimit(2)
                    .minimumScaleFactor(0.86)

                Text(L10n.tr(event.description))
                    .font(.system(size: index == 0 ? 14 : 13))
                    .foregroundColor(Color.perklyTextPrimary.opacity(0.68))
                    .lineLimit(index == 0 ? 2 : 1)
                    .lineSpacing(2)

                VStack(alignment: .leading, spacing: 8) {
                    HStack(spacing: 8) {
                        FeedCardMeta(icon: "calendar", text: formattedDate)
                        FeedCardMeta(icon: "clock.fill", text: event.startTime)
                    }

                    HStack(spacing: 8) {
                        FeedCardMeta(icon: "mappin.circle.fill", text: event.location)
                        FeedCardMeta(icon: "eye.fill", text: "\(event.viewersCount)")
                        FeedCardMeta(icon: "person.2.fill", text: "\(event.participantsCount)")
                    }
                }
            }
            .padding(.horizontal, 22)
            .padding(.bottom, 24)
            .padding(.top, 70)
        }
        .matchedGeometryEffect(id: "cardBase\(event.id)", in: animation)
        .clipShape(SquircleShape(cornerRadius: cardCornerRadius, n: 4))
        .contentShape(SquircleShape(cornerRadius: cardCornerRadius, n: 4))
    }

    private var fallbackImage: some View {
        LinearGradient(
            colors: [categoryColor.opacity(0.55), .perklyDark],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .overlay(alignment: .center) {
            VStack(spacing: 12) {
                Image(systemName: categoryIcon)
                    .font(.system(size: 46, weight: .bold))
                    .foregroundColor(Color.perklyTextPrimary.opacity(0.20))

                VStack(spacing: 4) {
                    Text(categoryTitle)
                        .font(.system(size: 12, weight: .heavy))
                        .foregroundColor(Color.perklyTextPrimary.opacity(0.55))
                        .textCase(.uppercase)

                    Text(L10n.tr(event.title))
                        .font(.system(size: 18, weight: .heavy, design: .rounded))
                        .foregroundColor(Color.perklyTextPrimary.opacity(0.74))
                        .lineLimit(2)
                        .multilineTextAlignment(.center)
                }
            }
            .padding(28)
        }
    }
}

struct FeedCardBadge: View {
    let title: String
    let color: Color

    var body: some View {
        Text(L10n.tr(title))
            .font(.system(size: 11, weight: .heavy))
            .foregroundColor(.perklyTextPrimary)
            .lineLimit(1)
            .padding(.horizontal, 11)
            .frame(height: 28)
            .background(color.opacity(0.78))
            .clipShape(Capsule())
            .overlay(
                Capsule()
                    .stroke(Color.perklyOverlay.opacity(0.16), lineWidth: 1)
            )
    }
}

struct FeedCardMeta: View {
    let icon: String
    let text: String

    var body: some View {
        HStack(spacing: 5) {
            Image(systemName: icon)
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(Color.perklyTextPrimary.opacity(0.72))
            Text(text)
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(Color.perklyTextPrimary.opacity(0.72))
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
        .padding(.horizontal, 9)
        .frame(height: 28)
        .background(Color.perklyOverlay.opacity(0.10))
        .clipShape(Capsule())
    }
}

// Keep old FeedPosterCard for backward compatibility with detail view
struct FeedPosterCard: View {
    let event: Event
    let badgeText: String
    var animation: Namespace.ID
    let isExpanded: Bool

    var body: some View {
        FeedNewsCard(
            event: event,
            index: 1,
            animation: animation,
            isExpanded: isExpanded,
            isSaved: false,
            onToggleSaved: {}
        )
    }
}

struct EventDetailHeroView: View {
    let event: Event
    var animation: Namespace.ID
    let isPresented: Bool
    let isSaved: Bool
    let isSaving: Bool
    let onToggleSaved: () -> Void
    let onClose: () -> Void
    
    @State private var showShareSheet = false
    @State private var showEditSheet = false
    @State private var dragOffset: CGSize = .zero
    @State private var activeDismissAxis: DismissAxis?
    @EnvironmentObject var authVM: AuthViewModel
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.openURL) private var openURL
    
    private let feedDetailAnimation = Animation.spring(response: 0.56, dampingFraction: 0.86)
    private var isDragging: Bool { dragOffset.width > 0 || dragOffset.height > 0 }

    private enum DismissAxis {
        case horizontal
        case vertical
    }
    
    var body: some View {
        ZStack(alignment: .topTrailing) {
            Color.black
                .opacity(backgroundOpacity)
                .ignoresSafeArea()
                .onTapGesture(perform: dismiss)
            
            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 0) {
                    // Hero poster image
                    ZStack(alignment: .bottom) {
                        if let url = RemoteImageURL.url(from: event.posterImageUrl) {
                            AsyncImage(url: url) { phase in
                                switch phase {
                                case .success(let image):
                                    image
                                        .resizable()
                                        .aspectRatio(contentMode: .fill)
                                case .failure:
                                    detailFallback
                                default:
                                    detailFallback
                                }
                            }
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                            .clipped()
                            .matchedGeometryEffect(id: "image\(event.id)", in: animation)
                        } else {
                            detailFallback
                        }
                        
                        // Black vignette
                        LinearGradient(
                            stops: [
                                .init(color: .clear, location: 0.0),
                                .init(color: .clear, location: 0.48),
                                .init(color: .black.opacity(0.4), location: 0.72),
                                .init(color: Color(red: 10/255, green: 10/255, blue: 15/255), location: 1.0),
                            ],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                        .matchedGeometryEffect(id: "vignette\(event.id)", in: animation)
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 390)
                    .clipped()
                    .ignoresSafeArea(.container, edges: .top)
                    
                    // Detail content
                    VStack(alignment: .leading, spacing: 24) {
                        VStack(alignment: .leading, spacing: 10) {
                            Text(L10n.tr(event.category).uppercased())
                                .font(.system(size: 12, weight: .bold))
                                .tracking(1)
                                .foregroundColor(.perklyOrange)

                            Text(L10n.tr(event.title))
                                .font(.system(size: 30, weight: .heavy, design: .rounded))
                                .foregroundColor(.perklyTextPrimary)
                                .lineLimit(4)
                                .minimumScaleFactor(0.9)
                                .multilineTextAlignment(.leading)
                                .fixedSize(horizontal: false, vertical: true)

                            RichLinkText(
                                source: L10n.tr(event.description),
                                font: .system(size: 15),
                                color: Color.perklyTextPrimary.opacity(0.7),
                                spacing: 3
                            )
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)

                        // Info pills
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 10) {
                                InfoPill(icon: "calendar", text: event.longDisplayDate)
                                InfoPill(icon: "clock.fill", text: event.startTime)
                                InfoPill(icon: "mappin.circle.fill", text: event.location)
                                InfoPill(icon: "person.crop.rectangle.badge.plus", text: event.ageLimit)
                            }
                        }
                        
                        // Stats bar
                        HStack(spacing: 0) {
                            StatPill(icon: "eye.fill", value: "\(event.viewersCount)", label: "просмотров", color: .perklyPurple)
                            Divider()
                                .frame(height: 30)
                                .background(Color.perklyOverlay.opacity(0.1))
                            StatPill(icon: "person.2.fill", value: "\(event.participantsCount)", label: "участников", color: .perklyGreen)
                        }
                        .padding(14)
                        .background(Color.perklyOverlay.opacity(0.04))
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                        .overlay(
                            RoundedRectangle(cornerRadius: 16)
                                .stroke(Color.perklyOverlay.opacity(0.06), lineWidth: 1)
                        )
                        
                        // Full description
                        VStack(alignment: .leading, spacing: 12) {
                            Text("О событии")
                                .font(.system(size: 20, weight: .bold))
                                .foregroundColor(.perklyTextPrimary)
                            
                            RichLinkText(
                                source: L10n.tr(event.fullDescription ?? event.description),
                                font: .system(size: 15),
                                color: Color.perklyTextPrimary.opacity(0.7),
                                spacing: 6
                            )
                        }
                        
                        // Location
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Место проведения")
                                .font(.system(size: 20, weight: .bold))
                                .foregroundColor(.perklyTextPrimary)
                            
                            Button {
                                if let mapURL {
                                    openURL(mapURL)
                                }
                            } label: {
                                HStack(spacing: 14) {
                                    ZStack {
                                        RoundedRectangle(cornerRadius: 14)
                                            .fill(Color.perklyPurple.opacity(0.15))
                                            .frame(width: 48, height: 48)
                                        Image(systemName: "map.fill")
                                            .font(.system(size: 20))
                                            .foregroundColor(.perklyPurple)
                                    }
                                    
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(L10n.tr(event.location))
                                            .font(.system(size: 16, weight: .semibold))
                                            .foregroundColor(.perklyTextPrimary)
                                        Text(L10n.tr(event.address))
                                            .font(.system(size: 13))
                                            .foregroundColor(Color.perklyTextPrimary.opacity(0.4))
                                    }
                                    
                                }
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel("Открыть \(L10n.tr(event.location)) в Apple Maps")
                            .accessibilityHint("Показывает маршрут и место проведения")
                            .padding(16)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.perklyOverlay.opacity(0.04))
                            .clipShape(RoundedRectangle(cornerRadius: 16))
                            .overlay(
                                RoundedRectangle(cornerRadius: 16)
                                    .stroke(Color.perklyOverlay.opacity(0.06), lineWidth: 1)
                            )
                        }
                        
                        // Action buttons
                        VStack(spacing: 12) {
                            if canManageEvent {
                                HStack(spacing: 12) {
                                    Button {
                                        showEditSheet = true
                                    } label: {
                                        HStack(spacing: 8) {
                                            Image(systemName: "pencil")
                                            Text("Изменить")
                                        }
                                        .font(.system(size: 15, weight: .bold))
                                        .foregroundColor(.perklyGold)
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 14)
                                        .background(Color.perklyGold.opacity(0.12))
                                        .clipShape(RoundedRectangle(cornerRadius: 14))
                                    }
                                    .buttonStyle(.plain)
                                    
                                    Button {
                                        Task {
                                            _ = try? await EventsService.shared.delete(event.id)
                                            dismiss()
                                        }
                                    } label: {
                                        HStack(spacing: 8) {
                                            Image(systemName: "trash")
                                            Text("Удалить")
                                        }
                                        .font(.system(size: 15, weight: .bold))
                                        .foregroundColor(.perklyRed)
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 14)
                                        .background(Color.perklyRed.opacity(0.12))
                                        .clipShape(RoundedRectangle(cornerRadius: 14))
                                    }
                                    .buttonStyle(.plain)
                                }
                            }

                            if let actionURL {
                                Link(destination: actionURL) {
                                    HStack(spacing: 8) {
                                        Text(actionTitle)
                                        Image(systemName: "arrow.up.right")
                                    }
                                    .font(.system(size: 16, weight: .semibold))
                                    .foregroundColor(.perklyPurple)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 16)
                                    .background(Color.perklyPurple.opacity(0.12))
                                    .clipShape(RoundedRectangle(cornerRadius: 16))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 16)
                                            .stroke(Color.perklyPurple.opacity(0.2), lineWidth: 1)
                                    )
                                }
                                .buttonStyle(.plain)
                                .accessibilityHint("Открывает ссылку события")
                            }
                            
                            Button {
                                onToggleSaved()
                            } label: {
                                HStack(spacing: 8) {
                                    if isSaving {
                                        ProgressView()
                                            .tint(.white)
                                    } else {
                                        Image(systemName: isSaved ? "heart.fill" : "heart")
                                            .foregroundColor(isSaved ? .perklyRed : .white)
                                    }
                                    Text(isSaved ? "Сохранено" : "Хочу пойти")
                                }
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundColor(.perklyTextPrimary)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 16)
                                .background(Color.primaryGradient)
                                .clipShape(RoundedRectangle(cornerRadius: 16))
                            }
                            .buttonStyle(.plain)
                            .disabled(isSaving)
                            .accessibilityLabel(isSaved ? "Удалить событие из планов" : "Сохранить событие в планы")
                            .accessibilityValue(isSaving ? "Сохранение" : (isSaved ? "Сохранено" : "Не сохранено"))
                            
                            Button {
                                showShareSheet = true
                            } label: {
                                HStack(spacing: 8) {
                                    Image(systemName: "square.and.arrow.up")
                                    Text("Поделиться")
                                }
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundColor(.perklyTextPrimary)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 16)
                                .background(Color.perklyOverlay.opacity(0.06))
                                .clipShape(RoundedRectangle(cornerRadius: 16))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 16)
                                        .stroke(Color.perklyOverlay.opacity(0.08), lineWidth: 1)
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 24)
                    .padding(.bottom, 60)
                }
            }
            .matchedGeometryEffect(id: "cardBase\(event.id)", in: animation)
            .background(Color.perklyDark)
            .clipShape(RoundedRectangle(cornerRadius: isDragging ? 30 : 0, style: .continuous))
            .scaleEffect(detailScale)
            .offset(x: dragOffset.width, y: dragOffset.height)
            .shadow(color: .black.opacity(0.45), radius: 30, y: 18)
            .simultaneousGesture(dismissGesture)
            .opacity(isPresented ? 1 : 0.999)
            
            // Close button
            Button {
                dismiss()
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(Color.perklyTextPrimary.opacity(0.7))
                    .frame(width: 32, height: 32)
                    .perklyGlass(cornerRadius: 16)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Закрыть событие")
            .safeAreaPadding(.top, 12)
            .padding(.trailing, 20)
            .opacity(isDragging ? 0 : 1)
        }
        .animation(reduceMotion ? nil : feedDetailAnimation, value: isPresented)
        .animation(reduceMotion ? nil : feedDetailAnimation, value: dragOffset)
        .accessibilityAction(.escape, dismiss)
        .onAppear {
            dragOffset = .zero
            activeDismissAxis = nil
        }
        .sheet(isPresented: $showShareSheet) {
            ShareSheet(items: shareItems)
                .presentationDetents([.medium])
        }
        .sheet(isPresented: $showEditSheet) {
            EditEventSheet(event: event) {
                // Here we would ideally reload the event, for now dismiss
                dismiss()
            }
            .presentationDetents([.large])
        }
    }
    
    private var canManageEvent: Bool {
        if let user = authVM.user {
            return user.id == event.organizerId || user.roleEnum == .admin
        }
        return false
    }
    
    private var backgroundOpacity: Double {
        let base = isPresented ? 0.52 : 0
        let verticalProgress = dragOffset.height / 220
        let horizontalProgress = dragOffset.width / max(UIScreen.main.bounds.width, 1)
        let dragProgress = min(max(max(verticalProgress, horizontalProgress), 0), 1)
        return base * (1 - (dragProgress * 0.85))
    }
    
    private var detailScale: CGFloat {
        guard isDragging else { return isPresented ? 1 : 0.98 }
        return max(0.88, 1 - (dragOffset.height / 1000))
    }

    private var dismissGesture: some Gesture {
        DragGesture(minimumDistance: 8, coordinateSpace: .global)
            .onChanged { value in
                if activeDismissAxis == nil {
                    let horizontal = value.startLocation.x <= 32
                        && value.translation.width > 0
                        && abs(value.translation.width) > abs(value.translation.height)
                    let vertical = value.translation.height > 0
                        && abs(value.translation.height) > abs(value.translation.width)

                    if horizontal {
                        activeDismissAxis = .horizontal
                    } else if vertical {
                        activeDismissAxis = .vertical
                    } else {
                        return
                    }
                }

                switch activeDismissAxis {
                case .horizontal:
                    dragOffset = CGSize(
                        width: max(0, value.translation.width),
                        height: 0
                    )
                case .vertical:
                    dragOffset = CGSize(
                        width: 0,
                        height: max(0, value.translation.height)
                    )
                case nil:
                    break
                }
            }
            .onEnded { value in
                let shouldDismiss: Bool
                switch activeDismissAxis {
                case .horizontal:
                    shouldDismiss = value.translation.width > 92
                        || value.predictedEndTranslation.width > 180
                case .vertical:
                    shouldDismiss = value.translation.height > 110
                        || value.predictedEndTranslation.height > 220
                case nil:
                    shouldDismiss = false
                }

                activeDismissAxis = nil
                if shouldDismiss {
                    dismiss()
                } else {
                    withAnimation(reduceMotion ? nil : feedDetailAnimation) {
                        dragOffset = .zero
                    }
                }
            }
    }

    private var actionURL: URL? {
        safeExternalURL(from: event.ctaUrl)
    }

    private var actionTitle: String {
        let title = event.ctaText?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return title.isEmpty ? "Открыть" : title
    }

    private var mapURL: URL? {
        var components = URLComponents(string: "https://maps.apple.com/")
        let title = L10n.tr(event.location).trimmingCharacters(in: .whitespacesAndNewlines)
        if let latitude = event.latitude, let longitude = event.longitude {
            components?.queryItems = [
                URLQueryItem(name: "ll", value: "\(latitude),\(longitude)"),
                URLQueryItem(name: "q", value: title)
            ]
        } else {
            let query = [event.location, event.address]
                .map { L10n.tr($0) }
                .joined(separator: ", ")
                .trimmingCharacters(in: .whitespacesAndNewlines)
            guard !query.isEmpty else { return nil }
            components?.queryItems = [URLQueryItem(name: "q", value: query)]
        }
        return components?.url
    }

    private var shareItems: [Any] {
        var items: [Any] = [L10n.format("feed.share_event", event.title)]
        if let actionURL {
            items.append(actionURL)
        }
        return items
    }

    private func safeExternalURL(from rawValue: String?) -> URL? {
        guard var value = rawValue?.trimmingCharacters(in: .whitespacesAndNewlines),
              !value.isEmpty else {
            return nil
        }
        if value.lowercased().hasPrefix("www.") {
            value = "https://\(value)"
        }
        guard let url = URL(string: value),
              let scheme = url.scheme?.lowercased(),
              ["https", "http", "mailto", "tel"].contains(scheme) else {
            return nil
        }
        return url
    }
    
    private func dismiss() {
        withAnimation(reduceMotion ? nil : feedDetailAnimation) {
            dragOffset = .zero
        }
        onClose()
    }
    
    private var detailFallback: some View {
        LinearGradient(
            colors: [.perklyPurple.opacity(0.4), .perklyDark],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .overlay(
            Image(systemName: "flame.fill")
                .font(.system(size: 70))
                .foregroundColor(Color.perklyTextPrimary.opacity(0.08))
        )
    }
    
}

struct CreateEventSheet: View {
    let onSuccess: () -> Void
    let providedCapabilities: PartnerCapabilities?
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var authVM: AuthViewModel
    
    // Form fields
    @State private var title: String = ""
    @State private var description: String = ""
    @State private var selectedCategory: String = "concert"
    @State private var eventDate = Date()
    @State private var location: String = ""
    @State private var imageUrl: String = ""
    @State private var selectedCoverItem: PhotosPickerItem?
    @State private var selectedCoverData: Data?
    @State private var selectedCoverImage: UIImage?
    @State private var pendingCoverImage: UIImage?
    @State private var isProcessingCover = false
    @State private var showCoverEditor = false
    @State private var publishStage: PublishStage = .idle
    @State private var submittedEvent: Event?
    
    @State private var isLoading = false
    @State private var loadedCapabilities: PartnerCapabilities?
    @State private var errorText: String?

    private enum PublishStage: Equatable {
        case idle, uploading, checking, publishing

        var title: String {
            switch self {
            case .idle: return "Отправить на публикацию"
            case .uploading: return "Загружаем обложку"
            case .checking: return "Проверяем данные"
            case .publishing: return "Публикуем"
            }
        }
    }

    init(capabilities: PartnerCapabilities? = nil, onSuccess: @escaping () -> Void) {
        self.providedCapabilities = capabilities
        self.onSuccess = onSuccess
    }
    
    let categories = [
        ("concert", "Концерт"),
        ("party", "Вечеринка"),
        ("sport", "Спорт"),
        ("education", "Обучение"),
        ("other", "Другое")
    ]
    
    var body: some View {
        NavigationStack {
            ZStack {
                Color.perklyDark.ignoresSafeArea()
                
                if let submittedEvent {
                    moderationReceipt(submittedEvent)
                } else {
                    ScrollView {
                        VStack(spacing: 24) {
                        // Header
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Создать событие")
                                .font(.system(size: 28, weight: .bold))
                                .foregroundColor(.perklyTextPrimary)
                            Text(canPublishToTopka ? "После проверки событие появится в городской ленте Topka" : "Публикация в Топку доступна заведениям с Platinum")
                                .font(.system(size: 15))
                                .foregroundColor(Color.perklyTextPrimary.opacity(0.6))
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.top, 10)

                        if !canPublishToTopka {
                            HStack(alignment: .top, spacing: 12) {
                                Image(systemName: "diamond.fill")
                                    .foregroundStyle(Color.perklyPlatinum)
                                    .font(.system(size: 18))

                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Нужен Platinum")
                                        .font(.system(size: 15, weight: .bold))
                                        .foregroundColor(.perklyTextPrimary)
                                    Text(effectiveCapabilities.upgrade?.reason ?? "Оформите Platinum в профиле, чтобы публиковать события в ленте Топка.")
                                        .font(.system(size: 13))
                                        .foregroundColor(Color.perklyTextPrimary.opacity(0.55))
                                        .fixedSize(horizontal: false, vertical: true)
                                }
                            }
                            .padding()
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.perklyPurple.opacity(0.14))
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                        }
                        
                        if let err = errorText {
                            HStack {
                                Image(systemName: "exclamationmark.triangle.fill")
                                Text(err)
                            }
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(.perklyRed)
                            .padding()
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.perklyRed.opacity(0.15))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                        
                        // Form
                        VStack(spacing: 20) {
                            inputRow(title: "Название события", text: $title)
                            
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Описание")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(Color.perklyTextPrimary.opacity(0.7))
                                
                                TextEditor(text: $description)
                                    .font(.system(size: 16))
                                    .foregroundColor(.perklyTextPrimary)
                                    .frame(height: 100)
                                    .padding(12)
                                    .background(Color.perklyOverlay.opacity(0.05))
                                    .cornerRadius(12)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12)
                                            .stroke(Color.perklyOverlay.opacity(0.1), lineWidth: 1)
                                    )
                                    .scrollContentBackground(.hidden)
                            }
                            
                            HStack(spacing: 16) {
                                categoryPicker
                                datePicker
                            }
                            
                            inputRow(title: "Локация", text: $location, icon: "mappin.circle.fill")
                            eventCoverPicker
                        }
                        
                        Button(action: {
                            Task { await submit() }
                        }) {
                            HStack {
                                if isLoading {
                                    ProgressView().tint(.white)
                                } else {
                                    Text(publishStage.title)
                                        .font(.system(size: 16, weight: .bold))
                                }
                            }
                            .foregroundColor(.perklyTextPrimary)
                            .frame(maxWidth: .infinity)
                            .frame(height: 54)
                            .background(isFormValid && canPublishToTopka ? AnyShapeStyle(Color.primaryGradient) : AnyShapeStyle(Color.perklyOverlay.opacity(0.1)))
                            .clipShape(RoundedRectangle(cornerRadius: 16))
                        }
                        .buttonStyle(.plain)
                        .disabled(!isFormValid || isLoading || !canPublishToTopka)
                        .padding(.top, 10)
                        
                        Spacer()
                    }
                        .padding(24)
                    }
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .onChange(of: selectedCoverItem) { _, item in
                Task { await loadEventCover(from: item) }
            }
            .sheet(isPresented: $showCoverEditor) {
                if let pendingCoverImage {
                    EventCoverEditor(image: pendingCoverImage) { image, jpeg in
                        selectedCoverImage = image
                        selectedCoverData = jpeg
                        showCoverEditor = false
                        errorText = nil
                    }
                    .presentationDetents([.large])
                    .presentationDragIndicator(.visible)
                }
            }
            .task {
                await loadCapabilities()
            }
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { dismiss() }) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(Color.perklyTextPrimary.opacity(0.5))
                            .font(.system(size: 24))
                    }
                }
            }
        }
    }
    
    private var isFormValid: Bool {
        !title.isEmpty && !description.isEmpty && !location.isEmpty && selectedCoverData != nil
    }

    private var eventCoverPicker: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Обложка события")
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(Color.perklyTextPrimary.opacity(0.7))

            if let selectedCoverImage {
                ZStack(alignment: .bottom) {
                    Image(uiImage: selectedCoverImage)
                        .resizable()
                        .scaledToFill()
                        .frame(maxWidth: .infinity)
                        .frame(height: 190)
                        .clipped()

                    HStack(spacing: 8) {
                        Label("Готово", systemImage: "checkmark.circle.fill")
                        Spacer()
                        Button("Исправить кадр") {
                            pendingCoverImage = selectedCoverImage
                            showCoverEditor = true
                        }
                    }
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 12)
                    .frame(height: 42)
                    .background(.black.opacity(0.62))
                }
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            }

            PhotosPicker(selection: $selectedCoverItem, matching: .images) {
                HStack(spacing: 12) {
                    if isProcessingCover {
                        ProgressView().tint(.perklyTextPrimary)
                    } else {
                        Image(systemName: "photo.on.rectangle.angled")
                    }
                    VStack(alignment: .leading, spacing: 2) {
                        Text(selectedCoverData == nil ? "Выбрать фотографию" : "Заменить фотографию")
                        Text(isProcessingCover ? "Подготавливаем изображение…" : "После выбора откроется коррекция")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(Color.perklyTextPrimary.opacity(0.42))
                    }
                    Spacer()
                    Image(systemName: "chevron.right")
                }
                .foregroundColor(.perklyTextPrimary)
                .padding(16)
                .background(Color.perklyOverlay.opacity(0.05))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            Text("JPG, PNG или WebP · до 10 МБ · лучше 4:3 или 16:9")
                .font(.system(size: 12))
                .foregroundColor(Color.perklyTextPrimary.opacity(0.42))
        }
    }

    @MainActor
    private func loadEventCover(from item: PhotosPickerItem?) async {
        guard let item else { return }
        isProcessingCover = true
        defer { isProcessingCover = false }
        do {
            guard let data = try await item.loadTransferable(type: Data.self),
                  let image = UIImage(data: data),
                  data.count <= 10 * 1024 * 1024 else {
                errorText = "Выберите JPG, PNG или WebP до 10 МБ"
                return
            }
            pendingCoverImage = image
            showCoverEditor = true
            errorText = nil
        } catch {
            errorText = "Не удалось прочитать фотографию"
        }
    }

    private var effectiveCapabilities: PartnerCapabilities {
        loadedCapabilities ?? providedCapabilities ?? PartnerCapabilities.fallback(for: authVM.user)
    }

    private var canPublishToTopka: Bool {
        effectiveCapabilities.canPublishTopka
    }
    
    private var categoryPicker: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Категория")
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(Color.perklyTextPrimary.opacity(0.7))
            
            Menu {
                ForEach(categories, id: \.0) { cat in
                    Button(cat.1) { selectedCategory = cat.0 }
                }
            } label: {
                HStack {
                    Text(categories.first(where: { $0.0 == selectedCategory })?.1 ?? "Выберите")
                        .font(.system(size: 14))
                        .foregroundColor(.perklyTextPrimary)
                    Spacer()
                    Image(systemName: "chevron.down")
                        .font(.system(size: 12))
                        .foregroundColor(Color.perklyTextPrimary.opacity(0.4))
                }
                .padding(.horizontal, 16)
                .frame(height: 54)
                .background(Color.perklyOverlay.opacity(0.05))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
    }
    
    private var datePicker: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Дата")
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(Color.perklyTextPrimary.opacity(0.7))
            
            DatePicker("", selection: $eventDate, displayedComponents: [.date])
                .labelsHidden()
                .frame(height: 54)
                .frame(maxWidth: .infinity)
                .padding(.horizontal, 8)
                .background(Color.perklyOverlay.opacity(0.05))
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .colorScheme(.dark)
        }
    }
    
    private func inputRow(title: String, text: Binding<String>, icon: String? = nil) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(L10n.tr(title))
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(Color.perklyTextPrimary.opacity(0.7))
            
            HStack {
                if let icon {
                    Image(systemName: icon)
                        .foregroundColor(Color.perklyTextPrimary.opacity(0.3))
                }
                TextField("", text: text)
                    .foregroundColor(.perklyTextPrimary)
            }
            .padding(16)
            .background(Color.perklyOverlay.opacity(0.05))
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.perklyOverlay.opacity(0.1), lineWidth: 1)
            )
        }
    }
    
    private func submit() async {
        guard authVM.user != nil else {
            errorText = "Необходимо войти в аккаунт"
            return
        }

        await loadCapabilities()

        guard canPublishToTopka else {
            errorText = "Публикация в Топку доступна только с Platinum"
            return
        }
        
        isLoading = true
        publishStage = .uploading
        errorText = nil
        
        do {
            guard let selectedCoverData else {
                errorText = "Добавьте обложку события"
                isLoading = false
                publishStage = .idle
                return
            }
            imageUrl = try await EventsService.shared.uploadCover(jpegData: selectedCoverData)
            publishStage = .checking
            let isoFormatter = ISO8601DateFormatter()
            let dateString = isoFormatter.string(from: eventDate)

            publishStage = .publishing
            let created = try await EventsService.shared.create(
                title: title,
                description: description,
                category: selectedCategory,
                date: dateString,
                location: location,
                imageUrl: imageUrl
            )
            
            HapticManager.shared.playPurchaseSuccess()
            submittedEvent = created
        } catch {
            errorText = "Ошибка публикации: \(error.localizedDescription)"
            HapticManager.shared.lightImpact()
        }
        
        isLoading = false
        publishStage = .idle
    }

    @MainActor
    private func loadCapabilities() async {
        do {
            loadedCapabilities = try await SellerService.shared.getCapabilities()
        } catch {
            loadedCapabilities = PartnerCapabilities.fallback(for: authVM.user)
        }
    }

    private func moderationReceipt(_ event: Event) -> some View {
        VStack(spacing: 22) {
            Spacer()

            ZStack {
                Circle()
                    .fill(Color.perklyPurple.opacity(0.14))
                    .frame(width: 88, height: 88)
                Image(systemName: "clock.badge.checkmark.fill")
                    .font(.system(size: 38, weight: .bold))
                    .foregroundStyle(Color.perklyPurple)
            }

            VStack(spacing: 8) {
                Text("Отправлено на модерацию")
                    .font(.system(size: 25, weight: .black))
                    .foregroundStyle(Color.perklyTextPrimary)
                Text("«\(event.title)» проверят перед появлением в Топке. Результат придёт уведомлением.")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(Color.perklyTextPrimary.opacity(0.52))
                    .multilineTextAlignment(.center)
            }

            VStack(spacing: 0) {
                moderationStep("Обложка загружена", icon: "photo.fill", complete: true)
                moderationStep("Автоматическая проверка пройдена", icon: "checkmark.shield.fill", complete: true)
                moderationStep("Проверка модератором", icon: "person.crop.circle.badge.clock", complete: false)
                moderationStep("Публикация в Топке", icon: "flame.fill", complete: false)
            }
            .padding(16)
            .background(Color.perklyOverlay.opacity(0.05))
            .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))

            Button("Готово") {
                onSuccess()
                dismiss()
            }
            .font(.system(size: 16, weight: .black))
            .foregroundStyle(.black)
            .frame(maxWidth: .infinity)
            .frame(height: 54)
            .background(.white)
            .clipShape(RoundedRectangle(cornerRadius: 17, style: .continuous))
            .buttonStyle(.plain)

            Spacer()
        }
        .padding(24)
    }

    private func moderationStep(_ title: String, icon: String, complete: Bool) -> some View {
        HStack(spacing: 12) {
            Image(systemName: complete ? "checkmark.circle.fill" : icon)
                .font(.system(size: 16, weight: .bold))
                .foregroundStyle(complete ? Color.perklyGreen : Color.perklyTextPrimary.opacity(0.34))
                .frame(width: 30, height: 30)
            Text(title)
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(Color.perklyTextPrimary.opacity(complete ? 0.82 : 0.42))
            Spacer()
        }
        .frame(height: 46)
    }
}

private struct EventCoverEditor: View {
    let image: UIImage
    let onApply: (UIImage, Data) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var zoom: CGFloat = 1
    @State private var horizontal: CGFloat = 0
    @State private var vertical: CGFloat = 0

    var body: some View {
        NavigationStack {
            VStack(spacing: 22) {
                Text("Расположите главное в безопасной области — этот кадр увидят в ленте.")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(Color.perklyTextPrimary.opacity(0.55))
                    .frame(maxWidth: .infinity, alignment: .leading)

                GeometryReader { proxy in
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFill()
                        .scaleEffect(zoom)
                        .offset(
                            x: horizontal * proxy.size.width * 0.22,
                            y: vertical * proxy.size.height * 0.22
                        )
                        .frame(width: proxy.size.width, height: proxy.size.height)
                        .clipped()
                        .overlay(alignment: .center) {
                            RoundedRectangle(cornerRadius: 22, style: .continuous)
                                .stroke(.white.opacity(0.32), lineWidth: 1)
                                .padding(16)
                        }
                        .clipShape(RoundedRectangle(cornerRadius: 26, style: .continuous))
                }
                .aspectRatio(16 / 9, contentMode: .fit)

                VStack(spacing: 16) {
                    editorSlider(title: "Масштаб", value: $zoom, range: 1...2.3, icon: "plus.magnifyingglass")
                    editorSlider(title: "По горизонтали", value: $horizontal, range: -1...1, icon: "arrow.left.and.right")
                    editorSlider(title: "По вертикали", value: $vertical, range: -1...1, icon: "arrow.up.and.down")
                }

                Button("Использовать обложку") {
                    guard let rendered = renderCover(),
                          let data = rendered.jpegData(compressionQuality: 0.86) else { return }
                    onApply(rendered, data)
                    HapticManager.shared.lightImpact()
                }
                .font(.system(size: 16, weight: .bold))
                .foregroundStyle(.black)
                .frame(maxWidth: .infinity)
                .frame(height: 54)
                .background(.white)
                .clipShape(RoundedRectangle(cornerRadius: 17, style: .continuous))
                .buttonStyle(.plain)
            }
            .padding(20)
            .background(Color.perklyDark.ignoresSafeArea())
            .navigationTitle("Коррекция обложки")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Отмена") { dismiss() }
                }
            }
        }
    }

    private func editorSlider(
        title: String,
        value: Binding<CGFloat>,
        range: ClosedRange<CGFloat>,
        icon: String
    ) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .frame(width: 22)
                .foregroundStyle(Color.perklyTextPrimary.opacity(0.5))
            Text(title)
                .font(.system(size: 13, weight: .semibold))
                .frame(width: 112, alignment: .leading)
            Slider(value: value, in: range)
                .tint(.perklyPurple)
        }
        .foregroundStyle(Color.perklyTextPrimary)
    }

    @MainActor
    private func renderCover() -> UIImage? {
        let outputSize = CGSize(width: 1600, height: 900)
        let imageSize = image.size
        guard imageSize.width > 0, imageSize.height > 0 else { return nil }

        let fillScale = max(outputSize.width / imageSize.width, outputSize.height / imageSize.height)
        let scale = fillScale * zoom
        let drawSize = CGSize(width: imageSize.width * scale, height: imageSize.height * scale)
        let origin = CGPoint(
            x: (outputSize.width - drawSize.width) / 2 + horizontal * outputSize.width * 0.22,
            y: (outputSize.height - drawSize.height) / 2 + vertical * outputSize.height * 0.22
        )

        let renderer = UIGraphicsImageRenderer(size: outputSize)
        return renderer.image { _ in
            UIColor.black.setFill()
            UIRectFill(CGRect(origin: .zero, size: outputSize))
            image.draw(in: CGRect(origin: origin, size: drawSize))
        }
    }
}

// MARK: - Consolidated Shared Components

struct InfoPill: View {
    let icon: String
    let text: String
    
    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 12))
                .foregroundColor(.perklyPurple)
            Text(text)
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(Color.perklyTextPrimary.opacity(0.7))
                .lineLimit(1)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(Color.perklyOverlay.opacity(0.05))
        .clipShape(Capsule())
        .overlay(
            Capsule()
                .stroke(Color.perklyOverlay.opacity(0.06), lineWidth: 1)
        )
    }
}

struct StatPill: View {
    let icon: String
    let value: String
    let label: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 4) {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 13))
                    .foregroundColor(color)
                Text(value)
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(.perklyTextPrimary)
            }
            Text(label)
                .font(.system(size: 11))
                .foregroundColor(Color.perklyTextPrimary.opacity(0.4))
        }
        .frame(maxWidth: .infinity)
    }
}

struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]
    
    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }
    
    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
// MARK: - LIVE Indicator Component
struct LiveBadge: View {
    let viewers: Int
    @State private var isPulsing = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    
    var body: some View {
        HStack(spacing: 8) {
            // Pulsing dot
            Circle()
                .fill(.red)
                .frame(width: 8, height: 8)
                .scaleEffect(isPulsing ? 1.4 : 1.0)
                .opacity(isPulsing ? 0.3 : 1.0)
            
            Text("СЕЙЧАС")
                .font(.system(size: 11, weight: .black))
                .foregroundColor(.perklyTextPrimary)
            
            Rectangle()
                .fill(Color.perklyOverlay.opacity(0.3))
                .frame(width: 1, height: 10)
            
            Label("\(formattedViewers)", systemImage: "eye.fill")
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(Color.perklyTextPrimary.opacity(0.9))
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(.red.opacity(0.8))
        .clipShape(Capsule())
        .onAppear {
            guard !reduceMotion else { return }
            withAnimation(.easeInOut(duration: 1.0).repeatForever(autoreverses: true)) {
                isPulsing = true
            }
        }
    }
    
    private var formattedViewers: String {
        if viewers >= 1000 {
            return String(format: "%.1fK", Double(viewers) / 1000.0)
        }
        return "\(viewers)"
    }
}
