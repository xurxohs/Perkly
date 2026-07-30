import Foundation
import CoreLocation
import UserNotifications

final class LocationManager: NSObject, ObservableObject, CLLocationManagerDelegate, UNUserNotificationCenterDelegate {
    static let shared = LocationManager()
    
    private let manager = CLLocationManager()
    @Published var lastLocation: CLLocation?
    @Published var authorizationStatus: CLAuthorizationStatus = .notDetermined
    @Published var heading: CLLocationDirection?
    private var geofenceOffers: [Offer] = []
    
    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBest
        manager.distanceFilter = 50 // Update every 50 meters
        manager.headingFilter = 5
        self.authorizationStatus = manager.authorizationStatus
        
        // Notification presentation and taps are routed by AppDiagnosticsService.
    }
    
    func requestPermissions() {
        manager.requestWhenInUseAuthorization()
    }

    func requestBackgroundPermission() {
        manager.requestAlwaysAuthorization()
    }
    
    func startUpdating() {
        manager.startUpdatingLocation()
        if CLLocationManager.headingAvailable() {
            manager.startUpdatingHeading()
        }
    }
    
    func stopUpdating() {
        manager.stopUpdatingLocation()
        manager.stopUpdatingHeading()
    }
    
    // MARK: - Geofencing
    
    func setupGeofences(for offers: [Offer]) {
        geofenceOffers = offers

        // Stop monitoring all current regions first (system limit is 20)
        for region in manager.monitoredRegions {
            manager.stopMonitoring(for: region)
        }

        // Background region events require Always authorization. Keep the map
        // usable with When In Use access, but do not register misleading alerts.
        guard manager.authorizationStatus == .authorizedAlways else { return }
        
        // Register new regions for nearby offers (up to 20)
        let topOffers = offers.prefix(20)
        for offer in topOffers {
            guard let lat = offer.latitude, let lng = offer.longitude else { continue }
            
            let center = CLLocationCoordinate2D(latitude: lat, longitude: lng)
            let region = CLCircularRegion(
                center: center,
                radius: 200, // 200 meters
                identifier: offer.id
            )
            region.notifyOnEntry = true
            region.notifyOnExit = false
            
            manager.startMonitoring(for: region)
        }
    }
    
    // MARK: - Delegate Methods
    
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        self.lastLocation = location
    }
    
    func locationManager(_ manager: CLLocationManager, didChangeAuthorization status: CLAuthorizationStatus) {
        self.authorizationStatus = status
        if status == .authorizedAlways || status == .authorizedWhenInUse {
            manager.startUpdatingLocation()
            if CLLocationManager.headingAvailable() {
                manager.startUpdatingHeading()
            }
        }
        if status == .authorizedAlways, !geofenceOffers.isEmpty {
            setupGeofences(for: geofenceOffers)
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateHeading newHeading: CLHeading) {
        let trueHeading = newHeading.trueHeading
        if trueHeading >= 0 {
            heading = trueHeading
        } else if newHeading.magneticHeading >= 0 {
            heading = newHeading.magneticHeading
        }
    }
    
    func locationManager(_ manager: CLLocationManager, didEnterRegion region: CLRegion) {
        if let circularRegion = region as? CLCircularRegion {
            triggerNotification(for: circularRegion.identifier)
        }
    }
    
    private func triggerNotification(for offerId: String) {
        guard NotificationsService.shared.cachedPreferences.nearby else { return }
        // Fetch offer details optionally, or just show a generic "Nearby Offer"
        // We'll use a generic message for now, but linked to the offerId
        
        let content = UNMutableNotificationContent()
        content.title = L10n.tr("notification.nearby_offer.title")
        content.body = L10n.tr("notification.nearby_offer.body")
        content.sound = .default
        content.categoryIdentifier = "PERKLY_NEARBY"
        content.userInfo = ["offerId": offerId]
        
        let request = UNNotificationRequest(
            identifier: "perkly_offer_\(offerId)",
            content: content,
            trigger: nil // Deliver immediately
        )
        
        UNUserNotificationCenter.current().add(request)
    }
    
    // MARK: - UNUserNotificationCenterDelegate
    
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .sound, .list])
    }
    
    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        if let offerId = response.notification.request.content.userInfo["offerId"] as? String {
            // Signal navigation to the offer
            DispatchQueue.main.async {
                NotificationCenter.default.post(name: NSNotification.Name("PerklyDeepLink"), object: offerId)
            }
        }
        completionHandler()
    }
}
