import SwiftUI

// MARK: - Screen 2

struct PhotoDetailScreen: View {
    let event: Event
    let heroOrigin: TopkaHeroOrigin
    let experience: TopkaExperienceState
    let isSaved: Bool
    let isSaving: Bool
    let onToggleSaved: () -> Void
    let onHeroReady: () -> Void
    let onClose: () -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var dragSession: TopkaDragSession?
    @State private var expandedScrollOffset: CGFloat = 0
    @GestureState private var transitionGestureIsActive = false

    private var heroProgress: CGFloat {
        experience.heroProgress
    }

    private var revealProgress: CGFloat {
        experience.revealProgress
    }

    var body: some View {
        GeometryReader { geometry in
            let track = TopkaTransitionTrack(
                heroDistance: min(max(geometry.size.height * 0.52, 360), 520),
                revealDistance: min(max(geometry.size.height * 0.28, 190), 250)
            )
            let navigationProgress = stagedProgress(
                heroProgress,
                from: 0.34,
                to: 0.7
            )
            let headerProgress = stagedProgress(
                heroProgress,
                from: 0.45,
                to: 0.8
            )
            let bottomInformationProgress = stagedProgress(
                heroProgress,
                from: 0.58,
                to: 0.92
            )
            let cornerProgress = stagedProgress(
                heroProgress,
                from: 0.08,
                to: 0.92
            )
            let backdropProgress = stagedProgress(
                heroProgress,
                from: 0.12,
                to: 0.78
            )
            let vignetteProgress = stagedProgress(
                heroProgress,
                from: 0.18,
                to: 0.88
            )
            let primaryOpacity = max(0, 1 - revealProgress * 1.28)
            let sourceFrame = localSourceFrame(in: geometry)
            let destinationFrame = localDestinationFrame(in: geometry)
            let interpolatedFrame = sourceFrame.interpolated(
                to: destinationFrame,
                progress: heroProgress,
                anchor: heroOrigin.anchor
            )
            let heroFrame = reduceMotion ? destinationFrame : interpolatedFrame
            let heroCornerRadius = reduceMotion
                ? revealProgress * 18
                : heroOrigin.cornerRadius * (1 - cornerProgress)
                    + revealProgress * 18 * cornerProgress
            let heroImageOpacity = reduceMotion
                ? heroProgress
                : 1

            ZStack {
                Color.black
                    .opacity(backdropProgress * 0.72)
                    .frame(
                        width: destinationFrame.width,
                        height: destinationFrame.height
                    )
                    .position(
                        x: destinationFrame.midX,
                        y: destinationFrame.midY
                    )
                    .allowsHitTesting(false)

                ZStack {
                    TopkaEventArtwork(event: event, alignment: .center)
                        .opacity(heroImageOpacity)

                    detailVignette
                        .opacity(vignetteProgress)

                    TopkaProgressiveBlur(
                        progress: revealProgress
                    )
                    .allowsHitTesting(false)

                    Color.black
                        .opacity(revealProgress * 0.42)
                        .allowsHitTesting(false)
                }
                    .frame(
                        width: heroFrame.width,
                        height: heroFrame.height
                    )
                    .clipShape(
                        RoundedRectangle(
                            cornerRadius: heroCornerRadius,
                            style: .continuous
                        )
                    )
                    .scaleEffect(
                        1 + revealProgress * 0.045,
                        anchor: heroOrigin.anchor
                    )
                    .position(x: heroFrame.midX, y: heroFrame.midY)

                primaryInformation(
                    in: geometry,
                    headerProgress: headerProgress,
                    bottomProgress: bottomInformationProgress
                )
                .opacity(primaryOpacity)
                .offset(y: revealProgress * 24)
                .allowsHitTesting(heroProgress > 0.96 && revealProgress < 0.12)

                ExpandedDetails(
                    event: event,
                    progress: revealProgress,
                    actionState: experience.squadActionState,
                    safeAreaInsets: geometry.safeAreaInsets,
                    onScrollOffsetChange: { offset in
                        expandedScrollOffset = offset
                    }
                )
                .allowsHitTesting(
                    revealProgress > 0.92
                        && experience.motionPhase == .resting(.expanded)
                )

                PhotoDetailNavigation(
                    event: event,
                    isSaved: isSaved,
                    isSaving: isSaving,
                    onToggleSaved: onToggleSaved,
                    onClose: requestClose
                )
                .padding(.horizontal, 12)
                .padding(.top, geometry.safeAreaInsets.top + 7)
                .frame(maxHeight: .infinity, alignment: .top)
                .opacity(
                    max(0.32, 1 - revealProgress * 0.55)
                        * navigationProgress
                )
                .offset(y: -8 * (1 - navigationProgress))
                .allowsHitTesting(navigationProgress > 0.55)
            }
            .offset(experience.interactiveOffset)
            .frame(width: geometry.size.width, height: geometry.size.height)
            .contentShape(Rectangle())
            .simultaneousGesture(
                transitionGesture(
                    track: track,
                    sourceFrame: sourceFrame,
                    destinationFrame: destinationFrame,
                    viewportSize: geometry.size,
                    safeAreaInsets: geometry.safeAreaInsets
                ),
                including: .all
            )
            .onAppear {
                experience.configure(track: track)
            }
            .onChange(of: track) { _, newTrack in
                experience.configure(track: newTrack)
            }
            .accessibilityAction(named: "Показать подробности") {
                settle(at: .expanded)
            }
            .accessibilityAction(named: "Скрыть подробности") {
                settle(at: .detail)
            }
        }
        .task {
            await Task.yield()
            guard !Task.isCancelled else { return }
            onHeroReady()
        }
        .onChange(of: transitionGestureIsActive) { _, isActive in
            if !isActive, dragSession != nil {
                cancelInteraction()
            }
        }
        .accessibilityValue(experience.accessibilityMotionValue)
        .accessibilityIdentifier("topka.photoDetail")
    }

    private func localSourceFrame(in geometry: GeometryProxy) -> CGRect {
        guard heroOrigin.frame.width > 1, heroOrigin.frame.height > 1 else {
            let inset = TopkaLayout.horizontalInset(for: geometry.size.width)
            let width = max(0, geometry.size.width - inset * 2)
            let height = min(
                width / TopkaLayout.artworkAspectRatio,
                geometry.size.height * 0.58
            )
            return CGRect(
                x: inset,
                y: max(geometry.size.height - height - 12, 0),
                width: width,
                height: height
            )
        }

        let containerOrigin = geometry.frame(in: .global).origin
        return heroOrigin.frame.offsetBy(
            dx: -containerOrigin.x,
            dy: -containerOrigin.y
        )
    }

    private func localDestinationFrame(in geometry: GeometryProxy) -> CGRect {
        let containerOrigin = geometry.frame(in: .global).origin
        return UIScreen.main.bounds.offsetBy(
            dx: -containerOrigin.x,
            dy: -containerOrigin.y
        )
    }

    private var detailVignette: some View {
        LinearGradient(
            stops: [
                .init(color: .black.opacity(0.46), location: 0),
                .init(color: .black.opacity(0.08), location: 0.27),
                .init(color: .black.opacity(0.12), location: 0.48),
                .init(color: TopkaPalette.detailTint.opacity(0.55), location: 0.76),
                .init(color: .black.opacity(0.91), location: 1)
            ],
            startPoint: .top,
            endPoint: .bottom
        )
    }

    private func primaryInformation(
        in geometry: GeometryProxy,
        headerProgress: CGFloat,
        bottomProgress: CGFloat
    ) -> some View {
        ZStack {
            VStack(spacing: 0) {
                PhotoHeader(
                    title: TopkaEditorialCopy.detailHeadline(for: event),
                    author: "by TOPKA",
                    availableWidth: geometry.size.width
                )
                .padding(.top, geometry.safeAreaInsets.top + 67)
                .opacity(headerProgress)
                .offset(y: 14 * (1 - headerProgress))

                Spacer(minLength: 0)
            }

            VStack(alignment: .leading, spacing: 18) {
                Spacer(minLength: 0)

                StatusInfo(event: event)

                Text(L10n.tr(event.description))
                    .font(TopkaTypography.body(size: 13))
                    .foregroundStyle(.white.opacity(0.76))
                    .lineSpacing(3)
                    .lineLimit(3)
                    .frame(maxWidth: 350, alignment: .leading)

                HStack {
                    Spacer()
                    SwipeIndicator(progress: revealProgress)
                }
            }
            .padding(.horizontal, 22)
            .padding(.bottom, geometry.safeAreaInsets.bottom + 16)
            .opacity(bottomProgress)
            .offset(y: 16 * (1 - bottomProgress))
        }
    }

    private func transitionGesture(
        track: TopkaTransitionTrack,
        sourceFrame: CGRect,
        destinationFrame: CGRect,
        viewportSize: CGSize,
        safeAreaInsets: EdgeInsets
    ) -> some Gesture {
        DragGesture(minimumDistance: 0, coordinateSpace: .local)
            .updating($transitionGestureIsActive) { _, isActive, _ in
                isActive = true
            }
            .onChanged { value in
                if dragSession == nil {
                    if isTransitionMoving,
                       canCaptureTransition(
                            at: value.startLocation,
                            viewportSize: viewportSize,
                            safeAreaInsets: safeAreaInsets
                       ) {
                        let snapshot = experience.beginInteraction()
                        let progress = track.progress(for: snapshot.position)
                        let baseFrame = heroFrame(
                            source: sourceFrame,
                            destination: destinationFrame,
                            progress: progress
                        )
                        dragSession = TopkaDragSession(
                            snapshot: snapshot,
                            touchLocation: value.location,
                            visualFrame: baseFrame.offsetBy(
                                dx: snapshot.offset.width,
                                dy: snapshot.offset.height
                            ),
                            progress: progress
                        )
                    } else {
                        guard gestureMagnitude(value.translation) >= 9,
                              let axis = resolvedAxis(
                                for: value,
                                viewportSize: viewportSize,
                                safeAreaInsets: safeAreaInsets
                              ) else {
                            return
                        }

                        let snapshot = experience.beginInteraction()
                        let progress = track.progress(for: snapshot.position)
                        let baseFrame = heroFrame(
                            source: sourceFrame,
                            destination: destinationFrame,
                            progress: progress
                        )
                        let session = TopkaDragSession(
                            snapshot: snapshot,
                            touchLocation: value.location,
                            visualFrame: baseFrame.offsetBy(
                                dx: snapshot.offset.width,
                                dy: snapshot.offset.height
                            ),
                            progress: progress
                        )
                        session.lock(
                            axis: axis,
                            value: value,
                            position: snapshot.position,
                            currentOffset: snapshot.offset,
                            visualFrame: baseFrame.offsetBy(
                                dx: snapshot.offset.width,
                                dy: snapshot.offset.height
                            ),
                            progress: progress
                        )
                        dragSession = session
                    }
                }

                guard let session = dragSession else { return }
                if session.axis == nil {
                    guard gestureMagnitude(value.translation) >= 9,
                          let axis = resolvedAxis(
                            for: value,
                            viewportSize: viewportSize,
                            safeAreaInsets: safeAreaInsets
                          ) else {
                        return
                    }

                    let progress = experience.transitionProgress
                    let baseFrame = heroFrame(
                        source: sourceFrame,
                        destination: destinationFrame,
                        progress: progress
                    )
                    session.lock(
                        axis: axis,
                        value: value,
                        position: experience.transitionPosition,
                        currentOffset: experience.interactiveOffset,
                        visualFrame: baseFrame.offsetBy(
                            dx: experience.interactiveOffset.width,
                            dy: experience.interactiveOffset.height
                        ),
                        progress: progress
                    )
                }

                guard session.axis != nil else { return }
                let rawPosition = session.position(for: value.translation)
                let position = track.rubberBanded(rawPosition)
                let progress = track.progress(for: position)
                let baseFrame = heroFrame(
                    source: sourceFrame,
                    destination: destinationFrame,
                    progress: progress
                )
                let offset = session.surfaceOffset(
                    for: value.translation,
                    baseFrame: baseFrame
                )
                let offsetVelocity = session.sampleOffsetVelocity(
                    offset,
                    at: value.time
                )

                if session.shouldPlayDetailHaptic(
                    from: session.lastProgress,
                    to: progress
                ) {
                    HapticManager.shared.playSelection()
                }

                let velocity = cappedTrackVelocity(
                    session.trackVelocity(for: value.velocity)
                )
                experience.updateInteraction(
                    position: position,
                    velocity: velocity,
                    offset: offset,
                    offsetVelocity: offsetVelocity
                )
                session.lastProgress = progress
            }
            .onEnded { value in
                guard let session = dragSession else { return }
                dragSession = nil

                guard session.axis != nil else {
                    experience.settle(
                        to: session.resumeDetent,
                        initialVelocity: 0,
                        reduceMotion: reduceMotion
                    )
                    return
                }

                let projectedPosition = session.position(
                    for: value.predictedEndTranslation
                )
                let trackVelocity = cappedTrackVelocity(
                    session.trackVelocity(for: value.velocity)
                )
                let target = targetDetent(
                    currentPosition: experience.transitionPosition,
                    projectedPosition: projectedPosition,
                    trackVelocity: trackVelocity,
                    track: track
                )

                let startDetent = nearestDetent(
                    to: session.startPosition,
                    track: track
                )
                experience.settle(
                    to: target,
                    initialVelocity: trackVelocity,
                    reduceMotion: reduceMotion
                )
                if startDetent != target {
                    HapticManager.shared.playSelection()
                }
            }
    }

    private func settle(at target: TopkaTransitionDetent) {
        experience.settle(to: target, reduceMotion: reduceMotion)
    }

    private func requestClose() {
        onClose()
    }

    private func cancelInteraction() {
        let target = dragSession?.resumeDetent
            ?? nearestDetent(to: experience.transitionProgress)
        dragSession = nil
        experience.settle(
            to: target,
            initialVelocity: 0,
            reduceMotion: reduceMotion
        )
    }

    private var isTransitionMoving: Bool {
        if case .moving = experience.motionPhase {
            return true
        }
        return false
    }

    private func canCaptureTransition(
        at location: CGPoint,
        viewportSize: CGSize,
        safeAreaInsets: EdgeInsets
    ) -> Bool {
        let startsInTopControls =
            location.y < safeAreaInsets.top + 64
            && (
                location.x < 72
                    || location.x > viewportSize.width - 72
            )
        let startsInBottomActions =
            revealProgress > 0.9
            && location.y
                > viewportSize.height - safeAreaInsets.bottom - 100
        return !startsInTopControls
            && !startsInBottomActions
    }

    private func resolvedAxis(
        for value: DragGesture.Value,
        viewportSize: CGSize,
        safeAreaInsets: EdgeInsets
    ) -> TopkaDragAxis? {
        guard canCaptureTransition(
            at: value.startLocation,
            viewportSize: viewportSize,
            safeAreaInsets: safeAreaInsets
        ) else {
            return nil
        }

        let horizontal = abs(value.translation.width)
        let vertical = abs(value.translation.height)
        if horizontal > vertical * 1.2 {
            let edgeWidth = max(safeAreaInsets.leading + 28, 32)
            guard value.startLocation.x <= edgeWidth,
                  value.translation.width > 0 else {
                return nil
            }
            return .horizontalBack
        }
        guard vertical > horizontal * 1.05 else { return nil }
        let startsInExpandedContent =
            revealProgress > 0.96
            && experience.motionPhase == .resting(.expanded)
            && value.startLocation.y > safeAreaInsets.top + 116
        if startsInExpandedContent {
            guard expandedScrollOffset <= 1,
                  value.translation.height > 0 else {
                return nil
            }
        }
        return .vertical
    }

    private func gestureMagnitude(_ translation: CGSize) -> CGFloat {
        hypot(translation.width, translation.height)
    }

    private func heroFrame(
        source: CGRect,
        destination: CGRect,
        progress: CGFloat
    ) -> CGRect {
        if reduceMotion {
            return destination
        }
        return source.interpolated(
            to: destination,
            progress: progress,
            anchor: heroOrigin.anchor
        )
    }

    private func targetDetent(
        currentPosition: CGFloat,
        projectedPosition: CGFloat,
        trackVelocity: CGFloat,
        track: TopkaTransitionTrack
    ) -> TopkaTransitionDetent {
        let detail = track.detailPosition
        let direction = abs(projectedPosition - currentPosition) > 1
            ? projectedPosition - currentPosition
            : trackVelocity
        let lower: TopkaTransitionDetent
        let upper: TopkaTransitionDetent

        if currentPosition < detail - 4 {
            lower = .feed
            upper = .detail
        } else if currentPosition > detail + 4 {
            lower = .detail
            upper = .expanded
        } else if direction >= 0 {
            lower = .detail
            upper = .expanded
        } else {
            lower = .feed
            upper = .detail
        }

        let lowerPosition = track.position(for: lower)
        let upperPosition = track.position(for: upper)
        let distance = max(upperPosition - lowerPosition, 1)
        let currentFraction = min(
            max((currentPosition - lowerPosition) / distance, 0),
            1
        )
        let projectedFraction = (
            projectedPosition - lowerPosition
        ) / distance

        if trackVelocity > 850, currentFraction > 0.08 {
            return upper
        }
        if trackVelocity < -850, currentFraction < 0.92 {
            return lower
        }
        return projectedFraction >= 0.5 ? upper : lower
    }

    private func nearestDetent(
        to position: CGFloat,
        track: TopkaTransitionTrack
    ) -> TopkaTransitionDetent {
        let candidates: [(TopkaTransitionDetent, CGFloat)] = [
            (.feed, abs(position)),
            (.detail, abs(position - track.detailPosition)),
            (.expanded, abs(position - track.expandedPosition))
        ]
        return candidates.min(by: { $0.1 < $1.1 })?.0 ?? .feed
    }

    private func nearestDetent(to progress: CGFloat) -> TopkaTransitionDetent {
        if progress < 0.5 {
            return .feed
        }
        if progress < 1.5 {
            return .detail
        }
        return .expanded
    }

    private func cappedTrackVelocity(_ velocity: CGFloat) -> CGFloat {
        let limit: CGFloat = 2_200
        return limit * tanh(velocity / limit)
    }

    private func stagedProgress(
        _ progress: CGFloat,
        from start: CGFloat,
        to end: CGFloat
    ) -> CGFloat {
        let linear = min(max((progress - start) / max(end - start, 0.001), 0), 1)
        return linear * linear * (3 - 2 * linear)
    }
}

private enum TopkaDragAxis: Equatable {
    case vertical
    case horizontalBack
}

private final class TopkaDragSession {
    let resumeDetent: TopkaTransitionDetent
    private(set) var startPosition: CGFloat
    private(set) var axis: TopkaDragAxis?
    private var baselineTranslation: CGSize = .zero
    private var baselineLocation: CGPoint
    private var grabAnchor: UnitPoint
    private var lastOffset: CGSize
    private var lastOffsetSampleTime: Date?
    private var filteredOffsetVelocity: CGSize = .zero
    private var detailHapticArmed = true
    var lastProgress: CGFloat

    init(
        snapshot: TopkaInteractionSnapshot,
        touchLocation: CGPoint,
        visualFrame: CGRect,
        progress: CGFloat
    ) {
        resumeDetent = snapshot.resumeDetent
        startPosition = snapshot.position
        baselineLocation = touchLocation
        grabAnchor = Self.normalizedAnchor(
            at: touchLocation,
            in: visualFrame
        )
        lastOffset = snapshot.offset
        lastProgress = progress
    }

    func lock(
        axis: TopkaDragAxis,
        value: DragGesture.Value,
        position: CGFloat,
        currentOffset: CGSize,
        visualFrame: CGRect,
        progress: CGFloat
    ) {
        self.axis = axis
        startPosition = position
        baselineTranslation = value.translation
        baselineLocation = value.location
        grabAnchor = Self.normalizedAnchor(
            at: value.location,
            in: visualFrame
        )
        lastOffset = currentOffset
        lastOffsetSampleTime = value.time
        filteredOffsetVelocity = .zero
        lastProgress = progress
    }

    func position(
        for translation: CGSize
    ) -> CGFloat {
        let translation = relativeTranslation(translation)
        switch axis {
        case .vertical:
            return startPosition - translation.height
        case .horizontalBack:
            return startPosition - translation.width
        case nil:
            return startPosition
        }
    }

    func trackVelocity(for velocity: CGSize) -> CGFloat {
        switch axis {
        case .vertical:
            return -velocity.height
        case .horizontalBack:
            return -velocity.width
        case nil:
            return 0
        }
    }

    func surfaceOffset(
        for translation: CGSize,
        baseFrame: CGRect
    ) -> CGSize {
        let translation = relativeTranslation(translation)
        let desiredPoint = CGPoint(
            x: baselineLocation.x + translation.width,
            y: baselineLocation.y + translation.height
        )
        let currentPoint = Self.point(at: grabAnchor, in: baseFrame)
        return CGSize(
            width: desiredPoint.x - currentPoint.x,
            height: desiredPoint.y - currentPoint.y
        )
    }

    func sampleOffsetVelocity(
        _ offset: CGSize,
        at time: Date
    ) -> CGSize {
        defer {
            lastOffset = offset
            lastOffsetSampleTime = time
        }
        guard let previousTime = lastOffsetSampleTime else {
            return .zero
        }

        let deltaTime = min(
            max(time.timeIntervalSince(previousTime), 1 / 240),
            1 / 30
        )
        let raw = CGSize(
            width: (offset.width - lastOffset.width) / deltaTime,
            height: (offset.height - lastOffset.height) / deltaTime
        )
        filteredOffsetVelocity = CGSize(
            width: filteredOffsetVelocity.width * 0.65 + raw.width * 0.35,
            height: filteredOffsetVelocity.height * 0.65 + raw.height * 0.35
        )
        return CGSize(
            width: Self.capped(filteredOffsetVelocity.width),
            height: Self.capped(filteredOffsetVelocity.height)
        )
    }

    func shouldPlayDetailHaptic(from start: CGFloat, to end: CGFloat) -> Bool {
        let crossed = (start < 1 && end >= 1)
            || (start > 1 && end <= 1)
        if detailHapticArmed, crossed {
            detailHapticArmed = false
            return true
        }
        if abs(end - 1) > 0.08 {
            detailHapticArmed = true
        }
        return false
    }

    private func relativeTranslation(_ translation: CGSize) -> CGSize {
        CGSize(
            width: translation.width - baselineTranslation.width,
            height: translation.height - baselineTranslation.height
        )
    }

    private static func normalizedAnchor(
        at location: CGPoint,
        in frame: CGRect
    ) -> UnitPoint {
        guard frame.width > 0, frame.height > 0 else { return .center }
        return UnitPoint(
            x: min(max((location.x - frame.minX) / frame.width, 0), 1),
            y: min(max((location.y - frame.minY) / frame.height, 0), 1)
        )
    }

    private static func point(at anchor: UnitPoint, in frame: CGRect) -> CGPoint {
        CGPoint(
            x: frame.minX + frame.width * anchor.x,
            y: frame.minY + frame.height * anchor.y
        )
    }

    private static func capped(_ velocity: CGFloat) -> CGFloat {
        let limit: CGFloat = 2_200
        return limit * tanh(velocity / limit)
    }
}

// MARK: - Primary information

struct PhotoHeader: View {
    let title: String
    let author: String
    let availableWidth: CGFloat

    var body: some View {
        VStack(spacing: 8) {
            Text(title)
                .font(
                    TopkaTypography.display(
                        size: TopkaLayout.detailHeadlineSize(for: availableWidth)
                    )
                )
                .tracking(-1.2)
                .lineSpacing(-7)
                .multilineTextAlignment(.center)
                .foregroundStyle(.white)
                .minimumScaleFactor(0.7)
                .lineLimit(3)
                .frame(maxWidth: availableWidth * 0.89)
                .accessibilityAddTraits(.isHeader)

            Text(author)
                .font(TopkaTypography.label(size: 12))
                .tracking(1.5)
                .foregroundStyle(.white.opacity(0.7))
        }
    }
}

struct StatusInfo: View {
    let event: Event

    private var status: String {
        event.explicitBadges.first?.uppercased()
            ?? L10n.tr(event.category).uppercased()
    }

    var body: some View {
        HStack(alignment: .top, spacing: 24) {
            StatusMetric(
                eyebrow: status,
                value: TopkaEditorialCopy.guestValue(for: event)
            )

            StatusMetric(
                eyebrow: "ДО СОБЫТИЯ",
                value: TopkaEditorialCopy.daysValue(for: event)
            )
        }
    }
}

private struct StatusMetric: View {
    let eyebrow: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(eyebrow)
                .font(TopkaTypography.label(size: 10))
                .tracking(0.7)
                .foregroundStyle(.white.opacity(0.58))
                .lineLimit(1)

            Text(value)
                .font(TopkaTypography.display(size: 28))
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.62)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct SwipeIndicator: View {
    let progress: CGFloat

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var isFloating = false

    @ViewBuilder
    var body: some View {
        if progress < 0.08 {
            Image(systemName: "chevron.down")
                .font(.system(size: 17, weight: .bold))
                .foregroundStyle(.white.opacity(0.84))
                .frame(width: 32, height: 32)
                .offset(y: reduceMotion ? 0 : (isFloating ? 3 : -1))
                .opacity(max(0, 1 - progress * 12.5))
                .animation(
                    reduceMotion
                        ? nil
                        : .easeInOut(duration: 0.85)
                            .repeatForever(autoreverses: true),
                    value: isFloating
                )
                .onAppear {
                    isFloating = true
                }
                .onDisappear {
                    isFloating = false
                }
                .accessibilityLabel("Проведите вверх, чтобы увидеть подробности")
                .accessibilityIdentifier("topka.detail.swipeIndicator")
        }
    }
}

// MARK: - Expanded information

struct ExpandedDetails: View {
    let event: Event
    let progress: CGFloat
    let actionState: TopkaActionState
    let safeAreaInsets: EdgeInsets
    let onScrollOffsetChange: (CGFloat) -> Void

    private var descriptionProgress: CGFloat {
        staggeredProgress(from: 0.14, to: 0.55)
    }

    private var addressProgress: CGFloat {
        staggeredProgress(from: 0.33, to: 0.72)
    }

    private var buttonsProgress: CGFloat {
        staggeredProgress(from: 0.53, to: 0.94)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Spacer()
                .frame(height: safeAreaInsets.top + 116)

            ScrollView(.vertical) {
                VStack(alignment: .leading, spacing: 0) {
                    GeometryReader { geometry in
                        Color.clear.preference(
                            key: ExpandedScrollOffsetPreferenceKey.self,
                            value: geometry.frame(
                                in: .named("topka.expanded.scroll")
                            ).minY
                        )
                    }
                    .frame(height: 0)

                    VStack(alignment: .leading, spacing: 22) {
                        RichLinkText(
                            source: L10n.tr(event.fullDescription ?? event.description),
                            font: TopkaTypography.body(size: 15),
                            color: .white.opacity(0.9),
                            spacing: 5
                        )
                        .frame(maxWidth: 356, alignment: .leading)
                        .opacity(descriptionProgress)
                        .offset(y: 24 * (1 - descriptionProgress))

                        AddressInfo(event: event)
                            .opacity(addressProgress)
                            .offset(y: 22 * (1 - addressProgress))
                    }
                    .padding(.vertical, 8)
                }
            }
            .scrollIndicators(.hidden)
            .scrollDisabled(progress < 0.99)
            .coordinateSpace(name: "topka.expanded.scroll")
            .onPreferenceChange(
                ExpandedScrollOffsetPreferenceKey.self
            ) { minY in
                onScrollOffsetChange(max(0, -minY))
            }

            ActionButtons(
                event: event,
                actionState: actionState
            )
            .opacity(buttonsProgress)
            .offset(y: 28 * (1 - buttonsProgress))
            .padding(.top, 16)
            .padding(.bottom, safeAreaInsets.bottom + 18)
        }
        .padding(.horizontal, 22)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .accessibilityHidden(progress < 0.9)
        .accessibilityIdentifier("topka.expandedDetails")
    }

    private func staggeredProgress(from start: CGFloat, to end: CGFloat) -> CGFloat {
        let linear = min(max((progress - start) / max(end - start, 0.001), 0), 1)
        return linear * linear * (3 - 2 * linear)
    }
}

private struct ExpandedScrollOffsetPreferenceKey: PreferenceKey {
    static var defaultValue: CGFloat = 0

    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        value = nextValue()
    }
}

struct AddressInfo: View {
    let event: Event

    var body: some View {
        Group {
            if let mapURL = TopkaLinks.mapURL(for: event) {
                Link(destination: mapURL) {
                    addressLabel
                }
            } else {
                addressLabel
            }
        }
        .buttonStyle(PerklyPressStyle())
        .accessibilityHint("Открывает место проведения на карте")
    }

    private var addressLabel: some View {
        HStack(spacing: 12) {
            Image(systemName: "location.fill")
                .font(.system(size: 15, weight: .bold))

            VStack(alignment: .leading, spacing: 3) {
                Text(L10n.tr(event.location))
                    .font(TopkaTypography.bodyBold(size: 14))
                Text(L10n.tr(event.address))
                    .font(TopkaTypography.body(size: 12))
                    .foregroundStyle(.white.opacity(0.62))
            }

            Spacer(minLength: 8)

            Image(systemName: "arrow.up.right")
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(.white.opacity(0.68))
        }
        .foregroundStyle(.white)
        .padding(.horizontal, 15)
        .frame(minHeight: 62)
        .background(.white.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(.white.opacity(0.12), lineWidth: 1)
        }
    }
}

struct ActionButtons: View {
    let event: Event
    let actionState: TopkaActionState

    private var squadIsDisabled: Bool {
        actionState != .ready
    }

    var body: some View {
        HStack(spacing: 11) {
            ShareLink(
                item: TopkaLinks.shareURL(for: event),
                subject: Text(L10n.tr(event.title)),
                message: Text(L10n.tr(event.description))
            ) {
                Label("ПОДЕЛИТЬСЯ", systemImage: "square.and.arrow.up")
                    .font(TopkaTypography.button(size: 12))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 54)
                    .background(.white.opacity(0.12))
                    .clipShape(Capsule())
                    .overlay {
                        Capsule()
                            .stroke(.white.opacity(0.14), lineWidth: 1)
                    }
            }
            .buttonStyle(PerklyPressStyle())
            .accessibilityIdentifier("topka.detail.share")
            .simultaneousGesture(
                TapGesture().onEnded {
                    HapticManager.shared.lightImpact()
                }
            )

            ShareLink(
                item: TopkaLinks.squadShareText(for: event),
                subject: Text(L10n.tr(event.title))
            ) {
                HStack(spacing: 8) {
                    if actionState == .loading {
                        ProgressView()
                            .tint(.black)
                    } else {
                        Image(systemName: "paperplane.fill")
                        Text("В СКВАД")
                    }
                }
                .font(TopkaTypography.button(size: 13))
                .foregroundStyle(.black)
                .frame(maxWidth: .infinity)
                .frame(height: 54)
                .background(.white)
                .clipShape(Capsule())
            }
            .buttonStyle(PerklyPressStyle())
            .disabled(squadIsDisabled)
            .opacity(actionState == .disabled ? 0.46 : 1)
            .accessibilityIdentifier("topka.detail.sendToSquad")
            .simultaneousGesture(
                TapGesture().onEnded {
                    guard !squadIsDisabled else { return }
                    HapticManager.shared.lightImpact()
                }
            )
        }
        .accessibilityIdentifier("topka.detail.actions")
    }
}

// MARK: - Navigation controls

private struct PhotoDetailNavigation: View {
    let event: Event
    let isSaved: Bool
    let isSaving: Bool
    let onToggleSaved: () -> Void
    let onClose: () -> Void

    private var actionTitle: String {
        let title = event.ctaText?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return title.isEmpty ? "Открыть" : L10n.tr(title)
    }

    var body: some View {
        HStack {
            Button {
                HapticManager.shared.lightImpact()
                onClose()
            } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: 18, weight: .black))
                    .foregroundStyle(.white)
                    .frame(width: 44, height: 44)
                    .contentShape(Rectangle())
            }
            .buttonStyle(PerklyPressStyle())
            .accessibilityLabel("Назад к событиям")
            .accessibilityIdentifier("topka.detail.back")

            Spacer()

            Menu {
                Button(action: onToggleSaved) {
                    Label(
                        isSaved ? "Удалить из планов" : "Сохранить в планы",
                        systemImage: isSaved ? "bookmark.slash" : "bookmark"
                    )
                }
                .disabled(isSaving)

                if let actionURL = TopkaLinks.externalURL(from: event.ctaUrl) {
                    Link(destination: actionURL) {
                        Label(actionTitle, systemImage: "arrow.up.right")
                    }
                }
            } label: {
                Group {
                    if isSaving {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Image(systemName: "line.3.horizontal")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundStyle(.white)
                    }
                }
                .frame(width: 44, height: 44)
                .contentShape(Rectangle())
            }
            .buttonStyle(PerklyPressStyle())
            .accessibilityLabel("Действия с событием")
            .accessibilityIdentifier("topka.detail.menu")
        }
    }
}

private extension CGRect {
    func interpolated(
        to target: CGRect,
        progress: CGFloat,
        anchor: UnitPoint
    ) -> CGRect {
        let progress = min(max(progress, 0), 1)
        let interpolatedWidth = width
            + (target.width - width) * progress
        let interpolatedHeight = height
            + (target.height - height) * progress
        let sourceAnchor = CGPoint(
            x: minX + width * anchor.x,
            y: minY + height * anchor.y
        )
        let targetAnchor = CGPoint(
            x: target.minX + target.width * anchor.x,
            y: target.minY + target.height * anchor.y
        )
        let interpolatedAnchor = CGPoint(
            x: sourceAnchor.x
                + (targetAnchor.x - sourceAnchor.x) * progress,
            y: sourceAnchor.y
                + (targetAnchor.y - sourceAnchor.y) * progress
        )

        return CGRect(
            x: interpolatedAnchor.x - interpolatedWidth * anchor.x,
            y: interpolatedAnchor.y - interpolatedHeight * anchor.y,
            width: interpolatedWidth,
            height: interpolatedHeight
        )
    }
}
