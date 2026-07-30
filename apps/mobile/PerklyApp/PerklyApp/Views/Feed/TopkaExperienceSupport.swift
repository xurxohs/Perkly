import SwiftUI
import UIKit
import Observation

// MARK: - Experience state

enum TopkaTransitionDetent: CGFloat, Equatable {
    case feed = 0
    case detail = 1
    case expanded = 2
}

struct TopkaTransitionTrack: Equatable {
    let heroDistance: CGFloat
    let revealDistance: CGFloat

    static let fallback = TopkaTransitionTrack(
        heroDistance: 440,
        revealDistance: 220
    )

    var detailPosition: CGFloat {
        heroDistance
    }

    var expandedPosition: CGFloat {
        heroDistance + revealDistance
    }

    func position(for detent: TopkaTransitionDetent) -> CGFloat {
        switch detent {
        case .feed:
            return 0
        case .detail:
            return detailPosition
        case .expanded:
            return expandedPosition
        }
    }

    func position(for progress: CGFloat) -> CGFloat {
        if progress <= 1 {
            return progress * heroDistance
        }
        return heroDistance + (progress - 1) * revealDistance
    }

    func progress(for position: CGFloat) -> CGFloat {
        if position <= detailPosition {
            return position / max(heroDistance, 1)
        }
        return 1 + (position - detailPosition) / max(revealDistance, 1)
    }

    func segmentDistance(at position: CGFloat, velocity: CGFloat = 0) -> CGFloat {
        if position < detailPosition
            || (abs(position - detailPosition) < 0.5 && velocity < 0) {
            return max(heroDistance, 1)
        }
        return max(revealDistance, 1)
    }

    func rubberBanded(_ rawPosition: CGFloat) -> CGFloat {
        if rawPosition < 0 {
            return -rubberBand(
                distance: -rawPosition,
                dimension: max(heroDistance, 1)
            )
        }
        if rawPosition > expandedPosition {
            return expandedPosition + rubberBand(
                distance: rawPosition - expandedPosition,
                dimension: max(revealDistance, 1)
            )
        }
        return rawPosition
    }

    private func rubberBand(distance: CGFloat, dimension: CGFloat) -> CGFloat {
        let coefficient: CGFloat = 0.55
        return (distance * dimension * coefficient)
            / (dimension + coefficient * distance)
    }
}

enum TopkaMotionPhase: Equatable {
    case resting(TopkaTransitionDetent)
    case moving(to: TopkaTransitionDetent)
    case interactive
}

struct TopkaInteractionSnapshot {
    let position: CGFloat
    let velocity: CGFloat
    let offset: CGSize
    let offsetVelocity: CGSize
    let resumeDetent: TopkaTransitionDetent
}

enum TopkaActionState: Equatable {
    case ready
    case loading
    case disabled
}

struct TopkaHeroOrigin: Equatable {
    let anchor: UnitPoint
    let frame: CGRect
    let cornerRadius: CGFloat
}

@Observable
final class TopkaExperienceState {
    enum Presentation {
        case feed
        case detail(
            eventID: String,
            origin: TopkaHeroOrigin
        )
    }

    var presentation: Presentation = .feed
    private(set) var transitionPosition: CGFloat = 0
    @ObservationIgnored
    private(set) var transitionVelocity: CGFloat = 0
    private(set) var interactiveOffset: CGSize = .zero
    @ObservationIgnored
    private(set) var interactiveOffsetVelocity: CGSize = .zero
    private(set) var motionPhase: TopkaMotionPhase = .resting(.feed)
    private(set) var prefersDarkAppearance = false
    var squadActionState: TopkaActionState = .ready

    @ObservationIgnored
    private var transitionMotion: TopkaSpringMotion?
    @ObservationIgnored
    private var transitionTrack = TopkaTransitionTrack.fallback

    var selectedEventID: String? {
        guard case let .detail(eventID, _) = presentation else { return nil }
        return eventID
    }

    var heroOrigin: TopkaHeroOrigin? {
        guard case let .detail(_, origin) = presentation else { return nil }
        return origin
    }

    var heroProgress: CGFloat {
        min(max(transitionProgress, 0), 1)
    }

    var transitionProgress: CGFloat {
        transitionTrack.progress(for: transitionPosition)
    }

    var revealProgress: CGFloat {
        min(max(transitionProgress - 1, 0), 1)
    }

    var isInteracting: Bool {
        motionPhase == .interactive
    }

    var accessibilityMotionValue: String {
        switch motionPhase {
        case .interactive:
            return "interactive"
        case let .moving(detent):
            return "moving.\(detent.accessibilityName)"
        case let .resting(detent):
            return "resting.\(detent.accessibilityName)"
        }
    }

    func mountDetail(eventID: String, origin: TopkaHeroOrigin) {
        transitionMotion?.stop()
        transitionMotion = nil
        transitionPosition = 0
        transitionVelocity = 0
        interactiveOffset = .zero
        interactiveOffsetVelocity = .zero
        motionPhase = .resting(.feed)
        prefersDarkAppearance = false
        squadActionState = .ready
        presentation = .detail(eventID: eventID, origin: origin)
    }

    func configure(track: TopkaTransitionTrack) {
        guard track != transitionTrack, transitionMotion == nil else { return }

        let previousTrack = transitionTrack
        let progress = previousTrack.progress(for: transitionPosition)
        let progressVelocity = transitionVelocity
            / previousTrack.segmentDistance(
                at: transitionPosition,
                velocity: transitionVelocity
            )

        transitionTrack = track
        transitionPosition = track.position(for: progress)
        transitionVelocity = progressVelocity
            * track.segmentDistance(
                at: transitionPosition,
                velocity: progressVelocity
            )
    }

    func beginInteraction() -> TopkaInteractionSnapshot {
        let resumeDetent: TopkaTransitionDetent
        switch motionPhase {
        case let .moving(to: detent), let .resting(detent):
            resumeDetent = detent
        case .interactive:
            resumeDetent = nearestDetent(to: transitionPosition)
        }

        let snapshot = TopkaInteractionSnapshot(
            position: transitionPosition,
            velocity: transitionVelocity,
            offset: interactiveOffset,
            offsetVelocity: interactiveOffsetVelocity,
            resumeDetent: resumeDetent
        )

        transitionMotion?.stop()
        transitionMotion = nil
        transitionVelocity = 0
        interactiveOffsetVelocity = .zero
        motionPhase = .interactive
        return snapshot
    }

    func updateInteraction(
        position: CGFloat,
        velocity: CGFloat,
        offset: CGSize,
        offsetVelocity: CGSize
    ) {
        transitionPosition = position
        transitionVelocity = velocity
        interactiveOffset = offset
        interactiveOffsetVelocity = offsetVelocity
        updateAppearance()
        if motionPhase != .interactive {
            motionPhase = .interactive
        }
    }

    func settle(
        to detent: TopkaTransitionDetent,
        initialVelocity: CGFloat? = nil,
        reduceMotion: Bool = false
    ) {
        guard selectedEventID != nil || detent == .feed else { return }

        transitionMotion?.stop()
        transitionMotion = nil
        motionPhase = .moving(to: detent)

        let target = transitionTrack.position(for: detent)
        let velocity = Self.cappedVelocity(
            initialVelocity ?? transitionVelocity
        )

        if reduceMotion {
            transitionPosition = target
            transitionVelocity = 0
            interactiveOffset = .zero
            interactiveOffsetVelocity = .zero
            updateAppearance()
            finishMotion(at: detent)
            return
        }

        let segmentDistance = transitionTrack.segmentDistance(
            at: transitionPosition,
            velocity: target - transitionPosition
        )
        let relativeDistance = min(
            abs(target - transitionPosition) / segmentDistance,
            1
        )
        let response = 0.32 + 0.12 * sqrt(relativeDistance)
        let dampingRatio = detent == .detail ? 1.0 : 0.9
        let motion = TopkaSpringMotion()
        transitionMotion = motion
        motion.start(
            value: transitionPosition,
            velocity: velocity,
            offset: interactiveOffset,
            offsetVelocity: interactiveOffsetVelocity,
            target: target,
            spring: Spring(
                response: response,
                dampingRatio: dampingRatio
            ),
            onUpdate: { [weak self, weak motion] value, velocity, offset, offsetVelocity in
                guard let self,
                      let motion,
                      self.transitionMotion === motion else {
                    return
                }
                self.transitionPosition = value
                self.transitionVelocity = velocity
                self.interactiveOffset = offset
                self.interactiveOffsetVelocity = offsetVelocity
                self.updateAppearance()
            },
            completion: { [weak self, weak motion] in
                guard let self,
                      let motion,
                      self.transitionMotion === motion else {
                    return
                }
                self.transitionMotion = nil
                self.transitionPosition = target
                self.transitionVelocity = 0
                self.interactiveOffset = .zero
                self.interactiveOffsetVelocity = .zero
                self.updateAppearance()
                self.finishMotion(at: detent)
            }
        )
    }

    func reset() {
        transitionMotion?.stop()
        transitionMotion = nil
        presentation = .feed
        transitionPosition = 0
        transitionVelocity = 0
        interactiveOffset = .zero
        interactiveOffsetVelocity = .zero
        motionPhase = .resting(.feed)
        prefersDarkAppearance = false
        squadActionState = .ready
    }

    private func nearestDetent(to position: CGFloat) -> TopkaTransitionDetent {
        let distances: [(TopkaTransitionDetent, CGFloat)] = [
            (.feed, abs(position)),
            (.detail, abs(position - transitionTrack.detailPosition)),
            (.expanded, abs(position - transitionTrack.expandedPosition))
        ]
        return distances.min(by: { $0.1 < $1.1 })?.0 ?? .feed
    }

    private func updateAppearance() {
        let progress = heroProgress
        if prefersDarkAppearance {
            if progress < 0.28 {
                prefersDarkAppearance = false
            }
        } else if progress > 0.42 {
            prefersDarkAppearance = true
        }
    }

    private static func cappedVelocity(_ velocity: CGFloat) -> CGFloat {
        let limit: CGFloat = 2_200
        return limit * tanh(velocity / limit)
    }

    private func finishMotion(at detent: TopkaTransitionDetent) {
        motionPhase = .resting(detent)
        guard detent == .feed else { return }
        presentation = .feed
        squadActionState = .ready
    }

    deinit {
        transitionMotion?.stop()
    }
}

private extension TopkaTransitionDetent {
    var accessibilityName: String {
        switch self {
        case .feed:
            return "feed"
        case .detail:
            return "detail"
        case .expanded:
            return "expanded"
        }
    }
}

// MARK: - Interruptible spring motion

private final class TopkaSpringMotion: NSObject {
    private var displayLink: CADisplayLink?
    private var spring = Spring(response: 0.44, dampingRatio: 0.9)
    private var value: Double = 0
    private var velocity: Double = 0
    private var offsetX: Double = 0
    private var offsetY: Double = 0
    private var offsetVelocityX: Double = 0
    private var offsetVelocityY: Double = 0
    private var target: Double = 0
    private var lastTargetTimestamp: CFTimeInterval?
    private var onUpdate: ((
        CGFloat,
        CGFloat,
        CGSize,
        CGSize
    ) -> Void)?
    private var completion: (() -> Void)?

    func start(
        value: CGFloat,
        velocity: CGFloat,
        offset: CGSize,
        offsetVelocity: CGSize,
        target: CGFloat,
        spring: Spring,
        onUpdate: @escaping (
            CGFloat,
            CGFloat,
            CGSize,
            CGSize
        ) -> Void,
        completion: @escaping () -> Void
    ) {
        stop()

        self.value = Double(value)
        self.velocity = Double(velocity)
        offsetX = Double(offset.width)
        offsetY = Double(offset.height)
        offsetVelocityX = Double(offsetVelocity.width)
        offsetVelocityY = Double(offsetVelocity.height)
        self.target = Double(target)
        self.spring = spring
        self.onUpdate = onUpdate
        self.completion = completion

        let maximumFPS = Float(UIScreen.main.maximumFramesPerSecond)
        let displayLink = CADisplayLink(target: self, selector: #selector(step))
        displayLink.preferredFrameRateRange = CAFrameRateRange(
            minimum: maximumFPS > 60 ? 60 : 30,
            maximum: maximumFPS,
            preferred: maximumFPS
        )
        displayLink.add(to: .main, forMode: .common)
        self.displayLink = displayLink
    }

    func stop() {
        displayLink?.invalidate()
        displayLink = nil
        lastTargetTimestamp = nil
        onUpdate = nil
        completion = nil
    }

    @objc
    private func step(_ displayLink: CADisplayLink) {
        let elapsedTime: TimeInterval
        if let lastTargetTimestamp {
            elapsedTime = min(
                max(displayLink.targetTimestamp - lastTargetTimestamp, 1 / 240),
                0.08
            )
        } else {
            elapsedTime = min(
                max(displayLink.targetTimestamp - displayLink.timestamp, 1 / 240),
                0.08
            )
        }
        lastTargetTimestamp = displayLink.targetTimestamp

        var remainingTime = elapsedTime
        while remainingTime > 0 {
            let deltaTime = min(remainingTime, 1 / 120)
            spring.update(
                value: &value,
                velocity: &velocity,
                target: target,
                deltaTime: deltaTime
            )
            spring.update(
                value: &offsetX,
                velocity: &offsetVelocityX,
                target: 0,
                deltaTime: deltaTime
            )
            spring.update(
                value: &offsetY,
                velocity: &offsetVelocityY,
                target: 0,
                deltaTime: deltaTime
            )
            remainingTime -= deltaTime
        }

        onUpdate?(
            CGFloat(value),
            CGFloat(velocity),
            CGSize(width: offsetX, height: offsetY),
            CGSize(width: offsetVelocityX, height: offsetVelocityY)
        )

        guard abs(value - target) < 0.15,
              abs(velocity) < 1.5,
              hypot(offsetX, offsetY) < 0.1,
              hypot(offsetVelocityX, offsetVelocityY) < 1.5 else {
            return
        }

        value = target
        velocity = 0
        offsetX = 0
        offsetY = 0
        offsetVelocityX = 0
        offsetVelocityY = 0
        onUpdate?(CGFloat(value), 0, .zero, .zero)

        let completion = completion
        stop()
        completion?()
    }

    deinit {
        displayLink?.invalidate()
    }
}

// MARK: - Layout and typography

enum TopkaLayout {
    static let artworkAspectRatio: CGFloat = 0.69

    static func horizontalInset(for width: CGFloat) -> CGFloat {
        min(max(width * 0.05, 18), 22)
    }

    static func cardCornerRadius(for width: CGFloat) -> CGFloat {
        min(max(width * 0.062, 22), 27)
    }

    static func headlineSize(for width: CGFloat) -> CGFloat {
        min(max(width * 0.14, 48), 58)
    }

    static func detailHeadlineSize(for width: CGFloat) -> CGFloat {
        min(max(width * 0.145, 50), 62)
    }

    static func normalizedAnchor(at location: CGPoint, in size: CGSize) -> UnitPoint {
        guard size.width > 0, size.height > 0 else { return .center }
        return UnitPoint(
            x: min(max(location.x / size.width, 0), 1),
            y: min(max(location.y / size.height, 0), 1)
        )
    }
}

enum TopkaTypography {
    static func display(size: CGFloat) -> Font {
        .custom("DINCondensed-Bold", size: size, relativeTo: .largeTitle)
    }

    static func title(size: CGFloat) -> Font {
        .custom("AvenirNext-DemiBold", size: size, relativeTo: .title2)
    }

    static func body(size: CGFloat) -> Font {
        .custom("AvenirNext-Medium", size: size, relativeTo: .body)
    }

    static func bodyBold(size: CGFloat) -> Font {
        .custom("AvenirNext-DemiBold", size: size, relativeTo: .body)
    }

    static func label(size: CGFloat) -> Font {
        .custom("AvenirNextCondensed-DemiBold", size: size, relativeTo: .caption)
    }

    static func button(size: CGFloat) -> Font {
        .custom("AvenirNextCondensed-Bold", size: size, relativeTo: .callout)
    }
}

// MARK: - Artwork

struct TopkaEventArtwork: View {
    let event: Event
    let alignment: Alignment

    @StateObject private var remoteArtwork: TopkaArtworkLoader

    init(event: Event, alignment: Alignment = .center) {
        self.event = event
        self.alignment = alignment
        _remoteArtwork = StateObject(
            wrappedValue: TopkaArtworkLoader(
                url: RemoteImageURL.url(from: event.posterImageUrl)
            )
        )
    }

    var body: some View {
        ZStack {
            TopkaPalette.fallback(for: event)

            if let assetName = TopkaArtworkCatalog.assetName(for: event) {
                Image(assetName)
                    .resizable()
                    .scaledToFill()
            } else if let image = remoteArtwork.image {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
                    .transaction { transaction in
                        transaction.animation = nil
                    }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: alignment)
        .clipped()
        .task(id: event.posterImageUrl) {
            guard TopkaArtworkCatalog.assetName(for: event) == nil else { return }
            await remoteArtwork.load()
        }
    }
}

@MainActor
private final class TopkaArtworkLoader: ObservableObject {
    @Published private(set) var image: UIImage?

    private static let cache = NSCache<NSURL, UIImage>()
    private static var inFlight: [
        URL: (id: UUID, task: Task<TopkaPreparedImage?, Never>)
    ] = [:]
    private let url: URL?
    private var isLoading = false

    init(url: URL?) {
        self.url = url
        if let url {
            image = Self.cache.object(forKey: url as NSURL)
        }
    }

    func load() async {
        guard image == nil, !isLoading, let url else { return }
        isLoading = true
        defer { isLoading = false }

        let requestID: UUID
        let request: Task<TopkaPreparedImage?, Never>
        if let currentRequest = Self.inFlight[url] {
            requestID = currentRequest.id
            request = currentRequest.task
        } else {
            requestID = UUID()
            request = Task.detached(priority: .userInitiated) {
                do {
                    let (data, response) = try await URLSession.shared.data(from: url)
                    guard let httpResponse = response as? HTTPURLResponse,
                          (200..<300).contains(httpResponse.statusCode),
                          let decodedImage = UIImage(data: data) else {
                        return nil
                    }
                    return TopkaPreparedImage(
                        image: decodedImage.preparingForDisplay() ?? decodedImage
                    )
                } catch {
                    return nil
                }
            }
            Self.inFlight[url] = (requestID, request)
        }

        let preparedImage = await request.value
        if Self.inFlight[url]?.id == requestID {
            Self.inFlight[url] = nil
        }

        guard let preparedImage else {
            // The palette fallback remains visible when artwork is unavailable.
            return
        }

        Self.cache.setObject(preparedImage.image, forKey: url as NSURL)
        image = preparedImage.image
    }
}

private final class TopkaPreparedImage: @unchecked Sendable {
    let image: UIImage

    init(image: UIImage) {
        self.image = image
    }
}

// MARK: - Interactive system blur

struct TopkaProgressiveBlur: UIViewRepresentable {
    let progress: CGFloat

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    func makeUIView(context: Context) -> UIVisualEffectView {
        let view = UIVisualEffectView(effect: nil)
        view.isUserInteractionEnabled = false
        context.coordinator.connect(to: view)
        return view
    }

    func updateUIView(_ uiView: UIVisualEffectView, context: Context) {
        context.coordinator.setProgress(progress)
    }

    static func dismantleUIView(
        _ uiView: UIVisualEffectView,
        coordinator: Coordinator
    ) {
        coordinator.stop()
    }

    @MainActor
    final class Coordinator {
        private var animator: UIViewPropertyAnimator?

        func connect(to effectView: UIVisualEffectView) {
            let animator = UIViewPropertyAnimator(
                duration: 1,
                curve: .linear
            ) {
                effectView.effect = UIBlurEffect(style: .systemUltraThinMaterialDark)
            }
            animator.pausesOnCompletion = true
            animator.startAnimation()
            animator.pauseAnimation()
            animator.fractionComplete = 0
            self.animator = animator
        }

        func setProgress(_ progress: CGFloat) {
            animator?.fractionComplete = min(max(progress, 0), 1)
        }

        func stop() {
            animator?.stopAnimation(true)
            animator = nil
        }
    }
}

enum TopkaArtworkCatalog {
    static func assetName(for event: Event) -> String? {
        switch event.id {
        case "demo-neon-garden":
            return "TopkaNeonGarden"
        case "demo-form-01":
            return "TopkaForm01"
        case "demo-taste-after-dark":
            return "TopkaTasteAfterDark"
        case "demo-city-run":
            return "TopkaCityRun"
        case "demo-open-air-cinema":
            return "TopkaCinemaUnderStars"
        default:
            return nil
        }
    }
}

// MARK: - Editorial copy

enum TopkaEditorialCopy {
    static func headline(for event: Event) -> String {
        let subtitle = event.subtitle?
            .trimmingCharacters(in: .whitespacesAndNewlines)
        let source = subtitle?.isEmpty == false
            ? subtitle!
            : L10n.tr(event.category)
        let words = L10n.tr(source)
            .uppercased()
            .split(whereSeparator: \.isWhitespace)

        guard words.count > 1 else {
            return words.first.map(String.init) ?? L10n.tr(event.title).uppercased()
        }

        let lineCount = min(words.count, 3)
        let wordsPerLine = Int(ceil(Double(words.count) / Double(lineCount)))
        return stride(from: 0, to: words.count, by: wordsPerLine)
            .map { start in
                words[start..<min(start + wordsPerLine, words.count)]
                    .joined(separator: " ")
            }
            .joined(separator: "\n")
    }

    static func detailHeadline(for event: Event) -> String {
        let words = L10n.tr(event.title)
            .uppercased()
            .split(separator: " ")

        guard words.count > 2 else {
            return words.joined(separator: "\n")
        }

        let midpoint = Int(ceil(Double(words.count) / 2))
        return [
            words[..<midpoint].joined(separator: " "),
            words[midpoint...].joined(separator: " ")
        ]
        .joined(separator: "\n")
    }

    static func daysUntilEvent(_ event: Event, now: Date = Date()) -> Int {
        guard let eventDate = event.eventDate else { return 0 }
        let calendar = Calendar.autoupdatingCurrent
        let start = calendar.startOfDay(for: now)
        let end = calendar.startOfDay(for: eventDate)
        return max(calendar.dateComponents([.day], from: start, to: end).day ?? 0, 0)
    }

    static func daysValue(for event: Event) -> String {
        let count = daysUntilEvent(event)
        let remainder100 = count % 100
        let remainder10 = count % 10
        let noun: String

        if (11...14).contains(remainder100) {
            noun = "ДНЕЙ"
        } else if remainder10 == 1 {
            noun = "ДЕНЬ"
        } else if (2...4).contains(remainder10) {
            noun = "ДНЯ"
        } else {
            noun = "ДНЕЙ"
        }

        return "\(count) \(noun)"
    }

    static func guestValue(for event: Event) -> String {
        "\(event.participantsCount) ГОСТЕЙ"
    }
}

// MARK: - Palette and links

enum TopkaPalette {
    static let canvas = Color(red: 248 / 255, green: 247 / 255, blue: 244 / 255)
    static let ink = Color(red: 22 / 255, green: 22 / 255, blue: 24 / 255)
    static let mutedInk = Color.black.opacity(0.42)
    static let skeleton = Color.black.opacity(0.07)
    static let detailTint = Color(red: 80 / 255, green: 111 / 255, blue: 105 / 255)

    static func accent(for event: Event) -> Color {
        let category = event.category.lowercased()
        if category.contains("еда") || category.contains("фуд") {
            return .perklyOrange
        }
        if category.contains("спорт") {
            return .perklyGreen
        }
        if category.contains("выстав") {
            return .perklyCyan
        }
        if category.contains("вечерин") {
            return .perklyPink
        }
        return .perklyPurple
    }

    static func fallback(for event: Event) -> LinearGradient {
        LinearGradient(
            colors: [
                accent(for: event).opacity(0.82),
                Color.perklyDark
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
}

enum TopkaLinks {
    static func externalURL(from rawValue: String?) -> URL? {
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

    static func mapURL(for event: Event) -> URL? {
        var components = URLComponents(string: "https://maps.apple.com/")

        if let latitude = event.latitude, let longitude = event.longitude {
            components?.queryItems = [
                URLQueryItem(name: "ll", value: "\(latitude),\(longitude)"),
                URLQueryItem(name: "q", value: L10n.tr(event.location))
            ]
        } else {
            let query = [event.location, event.address]
                .map { L10n.tr($0) }
                .filter { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
                .joined(separator: ", ")

            guard !query.isEmpty else { return nil }
            components?.queryItems = [URLQueryItem(name: "q", value: query)]
        }

        return components?.url
    }

    static func shareURL(for event: Event) -> URL {
        URL(string: "https://perkly.uz/feed#event-\(event.id)")!
    }

    static func squadShareText(for event: Event) -> String {
        "\(L10n.tr(event.title)) — \(shareURL(for: event).absoluteString)"
    }
}

// MARK: - Loading and empty states

struct TopkaLoadingView: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var isPulsing = false

    var body: some View {
        GeometryReader { geometry in
            let inset = TopkaLayout.horizontalInset(for: geometry.size.width)
            let cardWidth = max(0, geometry.size.width - inset * 2)

            VStack(spacing: 0) {
                VStack(spacing: 7) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(TopkaPalette.skeleton)
                        .frame(width: geometry.size.width * 0.72, height: 42)
                    RoundedRectangle(cornerRadius: 4)
                        .fill(TopkaPalette.skeleton)
                        .frame(width: geometry.size.width * 0.82, height: 42)
                    RoundedRectangle(cornerRadius: 4)
                        .fill(TopkaPalette.skeleton)
                        .frame(width: geometry.size.width * 0.54, height: 42)
                }
                .padding(.top, 30)

                RoundedRectangle(
                    cornerRadius: TopkaLayout.cardCornerRadius(for: geometry.size.width),
                    style: .continuous
                )
                .fill(TopkaPalette.skeleton)
                .frame(
                    width: cardWidth,
                    height: cardWidth / TopkaLayout.artworkAspectRatio
                )
                .padding(.top, 28)

                Spacer(minLength: 16)
            }
            .frame(width: geometry.size.width, height: geometry.size.height)
            .opacity(isPulsing ? 0.56 : 0.9)
            .animation(
                reduceMotion
                    ? nil
                    : .easeInOut(duration: 0.9).repeatForever(autoreverses: true),
                value: isPulsing
            )
            .onAppear {
                isPulsing = true
            }
        }
        .background(TopkaPalette.canvas)
        .accessibilityLabel("Загружаем события")
    }
}

struct TopkaEmptyView: View {
    let message: String
    let retry: () -> Void

    var body: some View {
        VStack(spacing: 18) {
            Text("ГОРОД\nГОТОВИТСЯ")
                .font(TopkaTypography.display(size: 48))
                .tracking(-1.4)
                .lineSpacing(-8)
                .multilineTextAlignment(.center)
                .foregroundStyle(TopkaPalette.ink)

            Text(message)
                .font(TopkaTypography.body(size: 14))
                .foregroundStyle(TopkaPalette.mutedInk)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 36)

            Button(action: retry) {
                Text("ОБНОВИТЬ")
                    .font(TopkaTypography.button(size: 12))
                    .tracking(1)
                    .foregroundStyle(TopkaPalette.canvas)
                    .padding(.horizontal, 20)
                    .frame(height: 44)
                    .background(TopkaPalette.ink)
                    .clipShape(Capsule())
            }
            .buttonStyle(PerklyPressStyle())
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(TopkaPalette.canvas)
    }
}
