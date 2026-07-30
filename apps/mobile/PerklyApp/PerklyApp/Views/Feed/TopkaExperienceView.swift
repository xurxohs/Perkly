import SwiftUI
import UIKit

// MARK: - Topka editorial experience

struct FeedView: View {
    private let onClose: (() -> Void)?

    @StateObject private var viewModel = FeedViewModel()
    @EnvironmentObject private var authVM: AuthViewModel
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dismiss) private var dismiss

    @State private var experience = TopkaExperienceState()
    @State private var focusedEventID: String?
    @State private var savedEventIDs: Set<String> = []
    @State private var savingEventIDs: Set<String> = []
    @State private var hasCompletedInitialLoad = false

    init(onClose: (() -> Void)? = nil) {
        self.onClose = onClose
    }

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                TopkaPalette.canvas
                    .ignoresSafeArea()

                feedContent(in: geometry)
                    .allowsHitTesting(experience.selectedEventID == nil)

                if let selectedEvent, let heroOrigin = experience.heroOrigin {
                    PhotoDetailScreen(
                        event: selectedEvent,
                        heroOrigin: heroOrigin,
                        experience: experience,
                        isSaved: savedEventIDs.contains(selectedEvent.id),
                        isSaving: savingEventIDs.contains(selectedEvent.id),
                        onToggleSaved: {
                            toggleSaved(selectedEvent)
                        },
                        onHeroReady: {
                            beginHero(for: selectedEvent.id)
                        },
                        onClose: dismissDetail
                    )
                    .zIndex(10)
                }
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .toolbar(.hidden, for: .tabBar)
        .preferredColorScheme(experience.prefersDarkAppearance ? .dark : .light)
        .background(TopkaPalette.canvas)
        .task(id: authVM.user?.id) {
            restoreSavedEvents()
            await loadEventsForCurrentContext()
        }
        .onChange(of: focusedEventID) { oldValue, newValue in
            guard oldValue != nil, oldValue != newValue else { return }
            HapticManager.shared.playSelection()
        }
        .accessibilityAction(.escape) {
            if experience.selectedEventID != nil {
                dismissDetail()
            } else {
                closeTopka()
            }
        }
    }

    @ViewBuilder
    private func feedContent(in geometry: GeometryProxy) -> some View {
        if (!hasCompletedInitialLoad || viewModel.isLoading)
            && viewModel.events.isEmpty {
            TopkaLoadingView()
                .frame(width: geometry.size.width, height: geometry.size.height)
        } else if viewModel.events.isEmpty {
            TopkaEmptyView(
                message: viewModel.error ?? "Новые события скоро появятся здесь.",
                retry: {
                    Task {
                        await loadEventsForCurrentContext()
                    }
                }
            )
            .frame(width: geometry.size.width, height: geometry.size.height)
        } else {
            let pageHeight = geometry.size.height
                + geometry.safeAreaInsets.top
                + geometry.safeAreaInsets.bottom

            ScrollView(.vertical) {
                LazyVStack(spacing: 0) {
                    ForEach(viewModel.events) { event in
                        PhotoEditorialPage(
                            event: event,
                            safeAreaInsets: geometry.safeAreaInsets,
                            onOpen: { origin in
                                present(event, from: origin)
                            }
                        )
                        .frame(
                            width: geometry.size.width,
                            height: pageHeight,
                            alignment: .top
                        )
                        .id(event.id)
                    }
                }
                .scrollTargetLayout()
            }
            .scrollIndicators(.hidden)
            .scrollTargetBehavior(.paging)
            .scrollPosition(id: $focusedEventID, anchor: .top)
            .scrollDisabled(experience.selectedEventID != nil)
            .contentMargins(.vertical, 0, for: .scrollContent)
            .ignoresSafeArea()
        }
    }

    private var selectedEvent: Event? {
        guard let selectedEventID = experience.selectedEventID else { return nil }
        return viewModel.events.first(where: { $0.id == selectedEventID })
    }

    private func loadEventsForCurrentContext() async {
        hasCompletedInitialLoad = false

        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("-topka-ui-test") {
            viewModel.loadDemoEvents()
        } else {
            await viewModel.loadEvents()
        }
        #else
        await viewModel.loadEvents()
        #endif

        hasCompletedInitialLoad = true
        if focusedEventID == nil {
            focusedEventID = viewModel.events.first?.id
        }
    }

    private func present(_ event: Event, from origin: TopkaHeroOrigin) {
        guard experience.selectedEventID == nil else { return }

        var transaction = SwiftUI.Transaction()
        transaction.disablesAnimations = true
        withTransaction(transaction) {
            experience.mountDetail(eventID: event.id, origin: origin)
        }

        HapticManager.shared.lightImpact()
    }

    private func beginHero(for eventID: String) {
        guard experience.selectedEventID == eventID,
              experience.heroProgress < 0.01,
              experience.motionPhase == .resting(.feed) else {
            return
        }

        experience.settle(
            to: .detail,
            initialVelocity: 0,
            reduceMotion: reduceMotion
        )
    }

    private func dismissDetail() {
        guard experience.selectedEventID != nil else { return }
        experience.settle(
            to: .feed,
            initialVelocity: reduceMotion ? 0 : experience.transitionVelocity,
            reduceMotion: reduceMotion
        )
    }

    private func closeTopka() {
        HapticManager.shared.lightImpact()
        if let onClose {
            onClose()
        } else {
            dismiss()
        }
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

        guard !event.id.hasPrefix("demo-"), authVM.isAuthenticated else {
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
                if wasSaved {
                    savedEventIDs.insert(event.id)
                } else {
                    savedEventIDs.remove(event.id)
                }
                persistSavedEvents()
                HapticManager.shared.playError()
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

    private var savedEventsStorageKey: String {
        guard let userID = authVM.user?.id else {
            return "perkly_saved_event_ids.guest"
        }
        return "perkly_saved_event_ids.user.\(userID)"
    }
}
