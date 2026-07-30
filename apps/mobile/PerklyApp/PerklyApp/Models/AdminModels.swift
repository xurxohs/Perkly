import Foundation

struct AdminModerationReport: Codable, Identifiable {
    let id: String
    let reporterId: String
    let targetType: String
    let targetId: String
    let category: String
    let description: String
    let status: String
    let resolution: String?
    let resolvedBy: String?
    let createdAt: String
    let updatedAt: String?
    let reporter: User?
}

struct AdminModerationAppeal: Codable, Identifiable {
    let id: String
    let userId: String
    let subjectType: String
    let subjectId: String?
    let reason: String
    let status: String
    let resolution: String?
    let resolvedBy: String?
    let createdAt: String
    let updatedAt: String?
    let user: User?
}

struct AdminLog: Codable, Identifiable {
    let id: String
    let adminId: String
    let action: String
    let targetId: String?
    let details: String?
    let createdAt: String
    let admin: User?
}

struct AdminLogsResponse: Codable {
    let logs: [AdminLog]
    let total: Int
    let page: Int?
    let totalPages: Int?
}
