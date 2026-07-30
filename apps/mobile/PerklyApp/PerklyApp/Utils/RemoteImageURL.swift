import Foundation

enum RemoteImageURL {
    static func url(from value: String?) -> URL? {
        guard let value else { return nil }

        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }

        if trimmed.hasPrefix("//") {
            return URL(string: "https:\(trimmed)")
        }

        if trimmed.hasPrefix("/") {
            return URL(string: publicAssetBaseURL + trimmed)
        }

        guard var components = URLComponents(string: trimmed) else {
            return nil
        }

        if components.scheme == "http",
           let host = components.host,
           localHosts.contains(host) {
            components.scheme = publicAssetScheme
            components.host = publicAssetHost
            components.port = nil
            return components.url
        }

        return components.url
    }

    static func string(from value: String?, fallback: String? = nil) -> String? {
        url(from: value)?.absoluteString ?? fallback
    }

    private static var publicAssetBaseURL: String {
        var value = Constants.apiBaseURL
        if value.hasSuffix("/api") {
            value.removeLast(4)
        }
        return value.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
    }

    private static var publicAssetScheme: String {
        URLComponents(string: publicAssetBaseURL)?.scheme ?? "https"
    }

    private static var publicAssetHost: String {
        URLComponents(string: publicAssetBaseURL)?.host ?? "perkly.uz"
    }

    private static let localHosts = Set(["127.0.0.1", "localhost", "0.0.0.0"])
}
