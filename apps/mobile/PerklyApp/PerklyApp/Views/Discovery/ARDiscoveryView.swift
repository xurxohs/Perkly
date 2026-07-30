import SwiftUI
import ARKit
import AVFoundation
import SceneKit
import CoreLocation
import UIKit

struct ARDiscoveryView: View {
    @StateObject private var locationManager = LocationManager.shared
    @State private var nearbyOffers: [Offer] = []
    @State private var isLoading = true
    @State private var arState: ARState = .checking
    @State private var selectedOffer: Offer?
    @Environment(\.dismiss) var dismiss

    private var directionalOffers: [ARDirectionalOffer] {
        guard let userLocation = locationManager.lastLocation else { return [] }

        return nearbyOffers.compactMap { offer in
            guard let latitude = offer.latitude, let longitude = offer.longitude else { return nil }
            let offerLocation = CLLocation(latitude: latitude, longitude: longitude)
            let distance = userLocation.distance(from: offerLocation)
            let bearing = bearingBetween(userLocation.coordinate, and: offerLocation.coordinate)
            let heading = locationManager.heading ?? 0
            let relativeAngle = normalizedAngle(bearing - heading)
            return ARDirectionalOffer(offer: offer, distance: distance, relativeAngle: relativeAngle)
        }
        .sorted { lhs, rhs in
            if abs(lhs.relativeAngle - rhs.relativeAngle) < 12 {
                return lhs.distance < rhs.distance
            }
            return lhs.distance < rhs.distance
        }
        .prefix(5)
        .map { $0 }
    }
    
    var body: some View {
        ZStack {
            switch arState {
            case .ready:
                ARViewContainer(offers: nearbyOffers, userLocation: locationManager.lastLocation) { offer in
                    self.selectedOffer = offer
                }
                .ignoresSafeArea()
            case .checking:
                ARStatusView(
                    title: "Запускаем AR",
                    message: "Подготавливаем камеру и геолокацию.",
                    systemImage: "camera.viewfinder",
                    showsProgress: true
                )
            case .cameraDenied:
                ARStatusView(
                    title: "Нужен доступ к камере",
                    message: "Разрешите камеру в настройках iOS, чтобы открыть AR-поиск.",
                    systemImage: "camera.fill"
                )
            case .unsupported:
                ARStatusView(
                    title: "AR недоступен",
                    message: "AR-поиск работает только на устройстве с поддержкой ARKit. В симуляторе он не запускается.",
                    systemImage: "arkit"
                )
            }
            
            // UI Overlay
            VStack {
                HStack {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 32))
                            .foregroundColor(.white)
                            .padding(8)
                            .background(Color.black.opacity(0.35))
                            .clipShape(Circle())
                    }
                    Spacer()
                    
                    VStack(alignment: .trailing, spacing: 6) {
                        HStack(spacing: 8) {
                            Image(systemName: "dot.radiowaves.left.and.right")
                                .font(.system(size: 11, weight: .bold))
                                .foregroundColor(.perklyGreen)

                            Text("AR Discovery")
                                .font(.system(size: 18, weight: .bold))
                                .foregroundColor(.white)
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Color.black.opacity(0.38))
                        .clipShape(Capsule())

                        if let heading = locationManager.heading {
                            Text("Heading \(Int(heading.rounded()))°")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(.white.opacity(0.65))
                        } else if let loc = locationManager.lastLocation {
                            Text("\(String(format: "%.4f", loc.coordinate.latitude)), \(String(format: "%.4f", loc.coordinate.longitude))")
                                .font(.system(size: 10))
                                .foregroundColor(.white.opacity(0.6))
                        }
                    }
                }
                .padding(20)

                Spacer()

                if arState == .ready && selectedOffer == nil {
                    ARCenterReticle(hasTargets: !directionalOffers.isEmpty)
                        .padding(.bottom, 28)
                }

                Spacer()

                VStack(spacing: 12) {
                    if isLoading {
                        ProgressView()
                            .tint(.perklyPurple)
                            .scaleEffect(1.5)
                            .padding()
                            .background(Color.black.opacity(0.35))
                            .clipShape(RoundedRectangle(cornerRadius: 20))
                    }

                    if arState == .ready && selectedOffer == nil {
                        ARDirectionalHUD(
                            items: directionalOffers,
                            headingAvailable: locationManager.heading != nil
                        )
                    }

                    if !nearbyOffers.isEmpty && selectedOffer == nil {
                        Text("Найдено \(nearbyOffers.count) предложений рядом")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.white)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(Color.black.opacity(0.35))
                            .clipShape(RoundedRectangle(cornerRadius: 20))
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, selectedOffer == nil ? 20 : 128)
            }
            
            // Selected Offer Sheet
            if let offer = selectedOffer {
                VStack {
                    Spacer()
                    OfferARPreviewCard(offer: offer) {
                        self.selectedOffer = nil
                    }
                    .padding(20)
                    .transition(.move(edge: .bottom))
                }
            }
        }
        .task {
            AppDiagnosticsService.shared.addBreadcrumb("ar_screen_task_started")
            await prepareAR()
            await loadNearbyOffers()
        }
        .onAppear {
            AppDiagnosticsService.shared.addBreadcrumb("ar_screen_appeared")
            locationManager.startUpdating()
        }
    }

    private func prepareAR() async {
        guard ARWorldTrackingConfiguration.isSupported else {
            AppDiagnosticsService.shared.addBreadcrumb("ar_unsupported")
            await MainActor.run { arState = .unsupported }
            return
        }

        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            AppDiagnosticsService.shared.addBreadcrumb("ar_camera_authorized")
            await MainActor.run { arState = .ready }
        case .notDetermined:
            let granted = await requestCameraAccess()
            AppDiagnosticsService.shared.addBreadcrumb("ar_camera_requested_granted_\(granted)")
            await MainActor.run { arState = granted ? .ready : .cameraDenied }
        case .denied, .restricted:
            AppDiagnosticsService.shared.addBreadcrumb("ar_camera_denied")
            await MainActor.run { arState = .cameraDenied }
        @unknown default:
            AppDiagnosticsService.shared.addBreadcrumb("ar_camera_unknown_status")
            await MainActor.run { arState = .cameraDenied }
        }
    }

    private func requestCameraAccess() async -> Bool {
        await withCheckedContinuation { continuation in
            AVCaptureDevice.requestAccess(for: .video) { granted in
                continuation.resume(returning: granted)
            }
        }
    }
    
    private func loadNearbyOffers() async {
        guard let location = locationManager.lastLocation else {
            AppDiagnosticsService.shared.addBreadcrumb("ar_location_waiting")
            // Retry once if location isn't ready
            try? await Task.sleep(nanoseconds: 1 * 1_000_000_000)
            if locationManager.lastLocation == nil {
                AppDiagnosticsService.shared.addBreadcrumb("ar_location_unavailable")
                await MainActor.run { isLoading = false }
                return
            }
            await loadNearbyOffers()
            return
        }
        
        do {
            AppDiagnosticsService.shared.addBreadcrumb("ar_offers_request_started")
            let filters = OfferFilters(take: 20, lat: location.coordinate.latitude, lng: location.coordinate.longitude, radiusKm: 1.0)
            let response = try await OffersService.shared.list(filters: filters)
            await MainActor.run {
                AppDiagnosticsService.shared.addBreadcrumb("ar_offers_loaded_\(response.data.count)")
                self.nearbyOffers = response.data
                self.isLoading = false
            }
        } catch {
            AppDiagnosticsService.shared.addBreadcrumb("ar_offers_failed_\(error.localizedDescription)")
            #if DEBUG
            print("Failed to load nearby AR offers")
            #endif
            await MainActor.run {
                isLoading = false
            }
        }
    }

    private enum ARState {
        case checking
        case ready
        case cameraDenied
        case unsupported
    }

    private func bearingBetween(_ start: CLLocationCoordinate2D, and end: CLLocationCoordinate2D) -> CLLocationDirection {
        let lat1 = start.latitude * .pi / 180
        let lon1 = start.longitude * .pi / 180
        let lat2 = end.latitude * .pi / 180
        let lon2 = end.longitude * .pi / 180

        let dLon = lon2 - lon1
        let y = sin(dLon) * cos(lat2)
        let x = cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(dLon)
        let bearing = atan2(y, x) * 180 / .pi
        return (bearing + 360).truncatingRemainder(dividingBy: 360)
    }

    private func normalizedAngle(_ angle: CLLocationDirection) -> Double {
        var normalized = angle.truncatingRemainder(dividingBy: 360)
        if normalized > 180 { normalized -= 360 }
        if normalized < -180 { normalized += 360 }
        return normalized
    }

}

// MARK: - AR Status View
struct ARStatusView: View {
    let title: String
    let message: String
    let systemImage: String
    var showsProgress = false

    var body: some View {
        ZStack {
            Color.perklyDark.ignoresSafeArea()

            VStack(spacing: 18) {
                Image(systemName: systemImage)
                    .font(.system(size: 48, weight: .semibold))
                    .foregroundColor(.white)

                VStack(spacing: 8) {
                    Text(title)
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(.white)
                        .multilineTextAlignment(.center)

                    Text(message)
                        .font(.system(size: 15, weight: .medium))
                        .foregroundColor(.white.opacity(0.7))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 28)
                }

                if showsProgress {
                    ProgressView()
                        .tint(.perklyPurple)
                }
            }
            .padding(24)
        }
    }
}

private struct ARCenterReticle: View {
    let hasTargets: Bool

    var body: some View {
        VStack(spacing: 10) {
            ZStack {
                Circle()
                    .stroke(Color.white.opacity(0.15), lineWidth: 1)
                    .frame(width: 70, height: 70)

                Circle()
                    .stroke(hasTargets ? Color.perklyGreen.opacity(0.75) : Color.white.opacity(0.28), lineWidth: 2)
                    .frame(width: 34, height: 34)

                Rectangle()
                    .fill(Color.white.opacity(0.8))
                    .frame(width: 16, height: 2)

                Rectangle()
                    .fill(Color.white.opacity(0.8))
                    .frame(width: 2, height: 16)
            }

            Text(hasTargets ? "Повернись к стрелкам" : "Ищем ближайшие точки")
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(.white.opacity(0.72))
                .padding(.horizontal, 12)
                .padding(.vertical, 7)
                .background(Color.black.opacity(0.32))
                .clipShape(Capsule())
        }
    }
}

private struct ARDirectionalHUD: View {
    let items: [ARDirectionalOffer]
    let headingAvailable: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Навигация")
                    .font(.system(size: 12, weight: .black))
                    .foregroundColor(.white)
                Spacer()
                Text(headingAvailable ? "live" : "ожидаем compass")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(headingAvailable ? .perklyGreen : .white.opacity(0.55))
            }

            if items.isEmpty {
                Text("Нет точек в радиусе AR")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(.white.opacity(0.72))
                    .frame(maxWidth: .infinity, alignment: .leading)
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        ForEach(items) { item in
                            ARDirectionChip(item: item)
                        }
                    }
                }
            }
        }
        .padding(14)
        .background(Color.black.opacity(0.36))
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .stroke(Color.white.opacity(0.08), lineWidth: 1)
        )
    }
}

private struct ARDirectionChip: View {
    let item: ARDirectionalOffer

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                ZStack {
                    Circle()
                        .fill(isAligned ? Color.perklyGreen.opacity(0.22) : Color.white.opacity(0.08))
                        .frame(width: 34, height: 34)

                    Image(systemName: "location.north.fill")
                        .font(.system(size: 15, weight: .black))
                        .foregroundColor(isAligned ? .perklyGreen : .white)
                        .rotationEffect(.degrees(item.relativeAngle))
                }

                Text(directionText)
                    .font(.system(size: 11, weight: .black))
                    .foregroundColor(.white.opacity(0.74))
            }

            Text(item.offer.safeTitle)
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(.white)
                .lineLimit(2)

            Text(distanceText)
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(isAligned ? .perklyGreen : .white.opacity(0.65))
        }
        .frame(width: 142, alignment: .leading)
        .padding(12)
        .background(Color.white.opacity(0.06))
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    private var isAligned: Bool {
        abs(item.relativeAngle) < 18
    }

    private var directionText: String {
        switch item.relativeAngle {
        case ..<(-120): return L10n.tr("назад слева")
        case -120..<(-45): return L10n.tr("слева")
        case -45..<(-12): return L10n.tr("левее")
        case -12...12: return L10n.tr("прямо")
        case 12..<45: return L10n.tr("правее")
        case 45..<120: return L10n.tr("справа")
        default: return L10n.tr("назад справа")
        }
    }

    private var distanceText: String {
        if item.distance < 1000 {
            return L10n.format("recommendation.distance.meters", Int(item.distance.rounded()))
        }
        return L10n.format("recommendation.distance.kilometers", item.distance / 1000)
    }
}

private struct ARDirectionalOffer: Identifiable {
    let offer: Offer
    let distance: CLLocationDistance
    let relativeAngle: Double

    var id: String { offer.id }
}

// MARK: - AR View Container
struct ARViewContainer: UIViewRepresentable {
    let offers: [Offer]
    let userLocation: CLLocation?
    let onSelect: (Offer) -> Void
    
    func makeUIView(context: Context) -> ARSCNView {
        let arView = ARSCNView(frame: .zero)
        arView.delegate = context.coordinator
        arView.session.delegate = context.coordinator
        arView.autoenablesDefaultLighting = true
        arView.automaticallyUpdatesLighting = true
        arView.preferredFramesPerSecond = 30
        arView.rendersContinuously = false
        arView.scene = SCNScene()
        
        arView.session.run(context.coordinator.makeConfiguration())
        
        // Add tap gesture
        let tap = UITapGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.handleTap(_:)))
        arView.addGestureRecognizer(tap)
        
        context.coordinator.arView = arView
        return arView
    }
    
    func updateUIView(_ uiView: ARSCNView, context: Context) {
        context.coordinator.updateNodes(offers: offers, userLocation: userLocation)
    }

    static func dismantleUIView(_ uiView: ARSCNView, coordinator: Coordinator) {
        uiView.session.pause()
        uiView.session.delegate = nil
        uiView.delegate = nil
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator(onSelect: onSelect)
    }
    
    class Coordinator: NSObject, ARSCNViewDelegate, ARSessionDelegate {
        private let maxVisibleOffers = 8
        private let maxVisibleDistance: CLLocationDistance = 1000

        var arView: ARSCNView?
        var onSelect: (Offer) -> Void
        var offerNodes: [String: SCNNode] = [:]
        var offersById: [String: Offer] = [:]
        var textureCache: [String: UIImage] = [:]
        var lastNodeReportCount = 0
        private let minimumDisplayDistance: Float = 2.8
        private let maximumDisplayDistance: Float = 14.0
        
        init(onSelect: @escaping (Offer) -> Void) {
            self.onSelect = onSelect
        }

        func makeConfiguration() -> ARWorldTrackingConfiguration {
            let config = ARWorldTrackingConfiguration()
            config.worldAlignment = .gravityAndHeading
            config.planeDetection = []
            config.environmentTexturing = .none
            return config
        }
        
        @objc func handleTap(_ gesture: UITapGestureRecognizer) {
            guard let arView = arView else { return }
            let location = gesture.location(in: arView)
            
            let hitTestResults = arView.hitTest(location, options: nil)
            if let hitNode = hitTestResults.first?.node {
                // Find the offer ID associated with this node or its parent
                var currentNode: SCNNode? = hitNode
                while currentNode != nil {
                    if let offerId = currentNode?.name {
                        if let offer = offersById[offerId] {
                            onSelect(offer)
                        }
                        break
                    }
                    currentNode = currentNode?.parent
                }
            }
        }
        
        func updateNodes(offers: [Offer], userLocation: CLLocation?) {
            guard let userLocation = userLocation, let scene = arView?.scene else { return }

            let visibleOffers = offers.compactMap { offer -> PositionedOffer? in
                guard let offerLat = offer.latitude, let offerLng = offer.longitude else { return nil }
                let offerLocation = CLLocation(latitude: offerLat, longitude: offerLng)
                let distance = userLocation.distance(from: offerLocation)
                guard distance <= maxVisibleDistance else { return nil }
                return PositionedOffer(offer: offer, location: offerLocation, distance: distance)
            }
            .sorted { $0.distance < $1.distance }
            .prefix(maxVisibleOffers)

            let visibleIds = Set(visibleOffers.map(\.offer.id))
            let staleOfferIds = offerNodes.keys.filter { !visibleIds.contains($0) }
            for offerId in staleOfferIds {
                offerNodes[offerId]?.removeFromParentNode()
                offerNodes.removeValue(forKey: offerId)
                offersById.removeValue(forKey: offerId)
                textureCache.removeValue(forKey: offerId)
            }

            offersById = visibleOffers.reduce(into: [:]) { result, item in
                result[item.offer.id] = item.offer
            }

            for item in visibleOffers {
                let offer = item.offer
                let position = makeDisplayPosition(distance: item.distance, bearing: getBearingBetween(userLocation, item.location))

                if let node = offerNodes[offer.id] {
                    SCNTransaction.begin()
                    SCNTransaction.animationDuration = 0.18
                    node.position = position
                    if let cardNode = node.childNode(withName: "card", recursively: false),
                       let plane = cardNode.geometry as? SCNPlane,
                       let material = plane.firstMaterial {
                        material.diffuse.contents = textureCache[offer.id] ?? createOfferTexture(offer: offer, distance: item.distance)
                    }
                    SCNTransaction.commit()
                    continue
                }

                let node = createOfferNode(offer: offer, distance: item.distance)
                node.position = position
                node.name = offer.id

                scene.rootNode.addChildNode(node)
                offerNodes[offer.id] = node
            }

            if offerNodes.count != lastNodeReportCount {
                lastNodeReportCount = offerNodes.count
                AppDiagnosticsService.shared.addBreadcrumb("ar_nodes_visible_\(offerNodes.count)")
            }
        }
        
        private func createOfferNode(offer: Offer, distance: CLLocationDistance) -> SCNNode {
            let rootNode = SCNNode()
            let plane = SCNPlane(width: 0.72, height: 0.92)
            plane.cornerRadius = 0.1
            
            let material = SCNMaterial()
            material.diffuse.contents = textureCache[offer.id] ?? createOfferTexture(offer: offer, distance: distance)
            material.isDoubleSided = true
            material.lightingModel = .constant
            plane.materials = [material]
            
            let cardNode = SCNNode(geometry: plane)
            cardNode.name = "card"
            cardNode.position = SCNVector3(0, 0.62, 0)
            rootNode.addChildNode(cardNode)

            let pointerGeometry = SCNCone(topRadius: 0, bottomRadius: 0.08, height: 0.18)
            let pointerMaterial = SCNMaterial()
            pointerMaterial.diffuse.contents = UIColor(red: 210/255, green: 1, blue: 93/255, alpha: 1)
            pointerMaterial.emission.contents = UIColor(red: 210/255, green: 1, blue: 93/255, alpha: 0.35)
            pointerMaterial.lightingModel = .constant
            pointerGeometry.materials = [pointerMaterial]

            let pointerNode = SCNNode(geometry: pointerGeometry)
            pointerNode.name = "pointer"
            pointerNode.eulerAngles.x = .pi
            pointerNode.position = SCNVector3(0, 0.06, 0)
            rootNode.addChildNode(pointerNode)
            
            // Add constrained billboard so it always faces user
            let billboardConstraint = SCNBillboardConstraint()
            billboardConstraint.freeAxes = .Y
            rootNode.constraints = [billboardConstraint]

            return rootNode
        }

        private func createOfferTexture(offer: Offer, distance: CLLocationDistance) -> UIImage {
            let size = CGSize(width: 512, height: 640)
            let image = UIGraphicsImageRenderer(size: size).image { context in
                let rect = CGRect(origin: .zero, size: size)
                let cardPath = UIBezierPath(roundedRect: rect, cornerRadius: 56)
                UIColor(red: 0.27, green: 0.10, blue: 0.72, alpha: 0.9).setFill()
                cardPath.fill()

                UIColor(white: 1, alpha: 0.12).setStroke()
                cardPath.lineWidth = 6
                cardPath.stroke()

                let title = offer.safeTitle
                let titleAttributes: [NSAttributedString.Key: Any] = [
                    .font: UIFont.systemFont(ofSize: 50, weight: .bold),
                    .foregroundColor: UIColor.white
                ]
                let titleRect = CGRect(x: 42, y: 56, width: 428, height: 240)
                title.draw(with: titleRect, options: [.usesLineFragmentOrigin, .truncatesLastVisibleLine], attributes: titleAttributes, context: nil)

                let price = "\(uzs(offer.safePrice))"
                let priceAttributes: [NSAttributedString.Key: Any] = [
                    .font: UIFont.monospacedDigitSystemFont(ofSize: 58, weight: .heavy),
                    .foregroundColor: UIColor(red: 0.45, green: 1.0, blue: 0.55, alpha: 1)
                ]
                price.draw(at: CGPoint(x: 42, y: 410), withAttributes: priceAttributes)

                let distanceText = formattedDistance(distance)
                let distanceAttributes: [NSAttributedString.Key: Any] = [
                    .font: UIFont.systemFont(ofSize: 28, weight: .bold),
                    .foregroundColor: UIColor.white.withAlphaComponent(0.75)
                ]
                distanceText.draw(at: CGPoint(x: 42, y: 332), withAttributes: distanceAttributes)

                if let discount = offer.discountPercent {
                    let badgeRect = CGRect(x: 42, y: 520, width: 150, height: 64)
                    UIColor(red: 1, green: 0.22, blue: 0.34, alpha: 1).setFill()
                    UIBezierPath(roundedRect: badgeRect, cornerRadius: 28).fill()
                    let discountText = "-\(discount)%"
                    let badgeAttributes: [NSAttributedString.Key: Any] = [
                        .font: UIFont.systemFont(ofSize: 34, weight: .black),
                        .foregroundColor: UIColor.white
                    ]
                    discountText.draw(in: badgeRect.insetBy(dx: 22, dy: 12), withAttributes: badgeAttributes)
                }

                context.cgContext.setFillColor(UIColor.white.withAlphaComponent(0.18).cgColor)
                context.cgContext.fillEllipse(in: CGRect(x: 376, y: 486, width: 82, height: 82))
            }
            textureCache[offer.id] = image
            return image
        }

        private func makeDisplayPosition(distance: CLLocationDistance, bearing: Double) -> SCNVector3 {
            let compressedDistance = Float(sqrt(max(distance, 1))) * 0.72
            let radialDistance = min(max(compressedDistance, minimumDisplayDistance), maximumDisplayDistance)
            let x = radialDistance * Float(sin(bearing))
            let z = -radialDistance * Float(cos(bearing))
            return SCNVector3(x, 0, z)
        }

        private func formattedDistance(_ distance: CLLocationDistance) -> String {
            if distance < 1000 {
                return L10n.format("recommendation.distance.meters", Int(distance.rounded()))
            }

            return L10n.format("recommendation.distance.kilometers", distance / 1000)
        }

        func session(_ session: ARSession, didFailWithError error: Error) {
            AppDiagnosticsService.shared.addBreadcrumb("ar_session_failed_\(error.localizedDescription)")
            print("AR session failed: \(error.localizedDescription)")
            restartSession()
        }

        func sessionWasInterrupted(_ session: ARSession) {
            AppDiagnosticsService.shared.addBreadcrumb("ar_session_interrupted")
            print("AR session interrupted")
        }

        func sessionInterruptionEnded(_ session: ARSession) {
            AppDiagnosticsService.shared.addBreadcrumb("ar_session_interruption_ended")
            restartSession()
        }

        private func restartSession() {
            DispatchQueue.main.async { [weak self] in
                guard let self, let arView else { return }
                arView.scene.rootNode.childNodes.forEach { $0.removeFromParentNode() }
                offerNodes.removeAll()
                arView.session.run(makeConfiguration(), options: [.resetTracking, .removeExistingAnchors])
            }
        }
        
        private func getBearingBetween(_ start: CLLocation, _ end: CLLocation) -> Double {
            let lat1 = start.coordinate.latitude * .pi / 180
            let lon1 = start.coordinate.longitude * .pi / 180
            let lat2 = end.coordinate.latitude * .pi / 180
            let lon2 = end.coordinate.longitude * .pi / 180
            
            let dLon = lon2 - lon1
            let y = sin(dLon) * cos(lat2)
            let x = cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(dLon)
            let bearing = atan2(y, x)
            return bearing
        }

        private struct PositionedOffer {
            let offer: Offer
            let location: CLLocation
            let distance: CLLocationDistance
        }
    }
}

// MARK: - UI Helpers
struct OfferARPreviewCard: View {
    let offer: Offer
    let onClose: () -> Void
    
    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 16) {
                AsyncImage(url: RemoteImageURL.url(from: offer.safeProductThumbnail)) { img in
                    img.resizable().aspectRatio(contentMode: .fill)
                } placeholder: {
                    Color.white.opacity(0.1)
                }
                .frame(width: 60, height: 60)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(offer.safeTitle)
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(.white)
                    
                    Text(offer.safeDescription)
                        .font(.system(size: 13))
                        .foregroundColor(.white.opacity(0.6))
                        .lineLimit(2)
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 4) {
                    Text("\(uzs(offer.safePrice))")
                        .font(.system(size: 20, weight: .bold))
                        .foregroundColor(.perklyGreen)
                    
                    if let disc = offer.discountPercent {
                        Text("-\(disc)%")
                            .font(.system(size: 12, weight: .bold))
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.perklyRed)
                            .clipShape(Capsule())
                    }
                }
            }
            .padding(16)
            
            Divider().background(Color.white.opacity(0.1))
            
            HStack {
                Button(action: onClose) {
                    Text("Закрыть")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.white.opacity(0.6))
                }
                
                Spacer()
                
                NavigationLink(destination: OfferDetailView(offerId: offer.id)) {
                    Text("Подробнее")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.black)
                        .padding(.horizontal, 20)
                        .padding(.vertical, 10)
                        .background(Color.white)
                        .clipShape(Capsule())
                }
            }
            .padding(16)
        }
        .background(Color.perklyDark.opacity(0.95))
        .clipShape(RoundedRectangle(cornerRadius: 24))
        .overlay(
            RoundedRectangle(cornerRadius: 24)
                .stroke(Color.white.opacity(0.1), lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.4), radius: 20)
    }
}
