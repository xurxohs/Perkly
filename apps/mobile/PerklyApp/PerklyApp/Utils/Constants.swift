import Foundation
import UIKit
import AudioToolbox

enum Constants {
    // Web and iOS share the same production data source. A staging backend must
    // be selected by a dedicated scheme instead of changing every Debug build.
    static let apiBaseURL = "https://perkly.uz/api"
    
    static let keychainTokenKey = "perkly_auth_token"
    static let keychainCachedUserKey = "perkly_cached_user"
    static let keychainDeviceIdKey = "perkly_device_id"
    static let cartStorageKey = "perkly_cart"
    
    enum Category: String, CaseIterable {
        case games = "GAMES"
        case subscriptions = "SUBSCRIPTIONS"
        case restaurants = "RESTAURANTS"
        case marketplaces = "MARKETPLACES"
        case coupons = "COUPONS"
        case courses = "COURSES"
        case tourism = "TOURISM"
        case fitness = "FITNESS"
        case other = "OTHER"
        
        var displayName: String {
            switch self {
            case .games: return L10n.tr("category.games")
            case .subscriptions: return L10n.tr("category.subscriptions")
            case .restaurants: return L10n.tr("category.restaurants")
            case .marketplaces: return L10n.tr("category.marketplaces")
            case .coupons: return L10n.tr("category.promocodes")
            case .courses: return L10n.tr("category.courses")
            case .tourism: return L10n.tr("category.tourism")
            case .fitness: return L10n.tr("category.fitness")
            case .other: return L10n.tr("category.other")
            }
        }
        
        var icon: String {
            switch self {
            case .games: return "gamecontroller.fill"
            case .subscriptions: return "key.fill"
            case .restaurants: return "fork.knife"
            case .marketplaces: return "bag.fill"
            case .coupons: return "ticket.fill"
            case .courses: return "graduationcap.fill"
            case .tourism: return "airplane"
            case .fitness: return "dumbbell.fill"
            case .other: return "square.grid.2x2.fill"
            }
        }
    }
}

enum AppRoute: Hashable {
    case offer(String)
    case catalog(String?)
    case fortuneWheel
    case sell
    case purchases
    case purchase(String)
    case chats
    case sessions
}
