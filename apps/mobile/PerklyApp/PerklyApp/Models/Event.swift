import Foundation

struct Event: Codable, Identifiable {
    let id: String
    let title: String
    let category: String
    let description: String
    let fullDescription: String?
    let date: String
    let startTime: String
    let ageLimit: String
    let location: String
    let address: String
    let latitude: Double?
    let longitude: Double?
    let imageUrl: String
    let viewersCount: Int
    let participantsCount: Int
    let organizerId: String
    let moderationStatus: String?
    let moderationNote: String?
    let moderationAt: String?
    let moderationBy: String?
    let publishedAt: String?
    let createdAt: String?
    let updatedAt: String?
    let postType: String?
    let subtitle: String?
    let tags: [String]?
    let badges: [String]?
    let endTime: String?
    let priceText: String?
    let ctaText: String?
    let ctaUrl: String?
    let priority: Int?
    let isFeatured: Bool?
    let media: EventMedia?

    init(
        id: String,
        title: String,
        category: String,
        description: String,
        fullDescription: String?,
        date: String,
        startTime: String,
        ageLimit: String,
        location: String,
        address: String,
        latitude: Double?,
        longitude: Double?,
        imageUrl: String,
        viewersCount: Int,
        participantsCount: Int,
        organizerId: String,
        moderationStatus: String? = nil,
        moderationNote: String? = nil,
        moderationAt: String? = nil,
        moderationBy: String? = nil,
        publishedAt: String? = nil,
        createdAt: String?,
        updatedAt: String?,
        postType: String? = nil,
        subtitle: String? = nil,
        tags: [String]? = nil,
        badges: [String]? = nil,
        endTime: String? = nil,
        priceText: String? = nil,
        ctaText: String? = nil,
        ctaUrl: String? = nil,
        priority: Int? = nil,
        isFeatured: Bool? = nil,
        media: EventMedia? = nil
    ) {
        self.id = id
        self.title = title
        self.category = category
        self.description = description
        self.fullDescription = fullDescription
        self.date = date
        self.startTime = startTime
        self.ageLimit = ageLimit
        self.location = location
        self.address = address
        self.latitude = latitude
        self.longitude = longitude
        self.imageUrl = imageUrl
        self.viewersCount = viewersCount
        self.participantsCount = participantsCount
        self.organizerId = organizerId
        self.moderationStatus = moderationStatus
        self.moderationNote = moderationNote
        self.moderationAt = moderationAt
        self.moderationBy = moderationBy
        self.publishedAt = publishedAt
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.postType = postType
        self.subtitle = subtitle
        self.tags = tags
        self.badges = badges
        self.endTime = endTime
        self.priceText = priceText
        self.ctaText = ctaText
        self.ctaUrl = ctaUrl
        self.priority = priority
        self.isFeatured = isFeatured
        self.media = media
    }
}

struct EventMedia: Codable {
    let originalUrl: String?
    let poster3x4Url: String?
    let story9x16Url: String?
    let square1x1Url: String?
    let preview16x9Url: String?
}

struct EventListResponse: Codable {
    let data: [Event]
    let total: Int
}

extension Event {
    var eventDate: Date? {
        let isoWithFractional = ISO8601DateFormatter()
        isoWithFractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime]

        if let date = isoWithFractional.date(from: date) ?? iso.date(from: date) {
            return date
        }

        let dateOnly = DateFormatter()
        dateOnly.locale = Locale(identifier: "en_US_POSIX")
        dateOnly.dateFormat = "yyyy-MM-dd"
        return dateOnly.date(from: date)
    }

    var shortDisplayDate: String {
        formattedDate("d MMM")
    }

    var longDisplayDate: String {
        formattedDate("d MMMM yyyy")
    }

    var posterImageUrl: String {
        media?.poster3x4Url ?? imageUrl
    }

    var explicitBadges: [String] {
        badges?.filter { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty } ?? []
    }

    private func formattedDate(_ format: String) -> String {
        guard let eventDate else { return date }
        let formatter = DateFormatter()
        formatter.locale = L10n.locale
        formatter.dateFormat = format
        return formatter.string(from: eventDate)
    }
}
