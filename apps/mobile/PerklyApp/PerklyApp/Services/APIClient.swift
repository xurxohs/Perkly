// Единый HTTP-клиент iOS-приложения.
// Добавляет авторизацию и данные устройства, отправляет запросы и преобразует ответы backend в Swift-модели.
import Foundation
import CryptoKit
import Network
import SwiftUI

enum APIError: LocalizedError {
    case invalidURL
    case invalidRequestBody
    case noData
    case decodingError(Error)
    case serverError(Int, String)
    case networkError(Error)
    case timeout
    case unauthorized
    
    var errorDescription: String? {
        switch self {
        case .invalidURL: return L10n.tr("api.error.invalid_url")
        case .invalidRequestBody: return L10n.tr("api.error.invalid_request_body")
        case .noData: return L10n.tr("api.error.no_data")
        case .decodingError(let err):
            return L10n.format("api.error.decoding", err.localizedDescription)
        case .serverError(let code, let msg):
            if code == 429 { return L10n.tr("api.error.rate_limited")
            }
            if code >= 500 { return L10n.tr("api.error.service_unavailable")
            }
            return msg
        case .networkError(let err):
            if let urlError = err as? URLError {
                switch urlError.code {
                case .notConnectedToInternet, .networkConnectionLost:
                    return L10n.tr("api.error.offline")
                case .cannotFindHost, .cannotConnectToHost, .dnsLookupFailed:
                    return L10n.tr("api.error.cannot_connect")
                default:
                    break
                }
            }
            return L10n.tr("api.error.request_failed")
        case .timeout: return L10n.tr("api.error.timeout")
        case .unauthorized: return L10n.tr("api.error.unauthorized")
        }
    }

    var isRetryable: Bool {
        switch self {
        case .networkError, .timeout, .serverError(429, _): return true
        case .serverError(let code, _): return code >= 500
        default: return false
        }
    }
}

final class APIClient {
    // Shared используется сервисами предметных областей: AuthService, EventsService, OffersService и другими.
    static let shared = APIClient()
    
    private let session: URLSession
    private let decoder: JSONDecoder
    
    private init() {
        let config = URLSessionConfiguration.default
        config.waitsForConnectivity = false
        config.timeoutIntervalForRequest = 12
        config.timeoutIntervalForResource = 25
        config.requestCachePolicy = .reloadIgnoringLocalCacheData
        self.session = URLSession(configuration: config)
        
        self.decoder = JSONDecoder()
    }
    
    private var token: String? {
        KeychainHelper.shared.read(forKey: Constants.keychainTokenKey)
    }
    
    // MARK: - Generic Request
    
    func request<T: Decodable>(
        endpoint: String,
        method: String = "GET",
        body: [String: Any]? = nil,
        queryItems: [URLQueryItem]? = nil,
        headers: [String: String]? = nil
    ) async throws -> T {
        guard var components = URLComponents(string: Constants.apiBaseURL + endpoint) else {
            throw APIError.invalidURL
        }
        
        if let queryItems, !queryItems.isEmpty {
            components.queryItems = queryItems
        }
        
        guard let url = components.url else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue(deviceId, forHTTPHeaderField: "X-Device-ID")
        request.setValue(deviceName, forHTTPHeaderField: "X-Device-Name")
        request.setValue("ios", forHTTPHeaderField: "X-Client-Platform")
        
        if let token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        if let customHeaders = headers {
            for (key, value) in customHeaders {
                request.setValue(value, forHTTPHeaderField: key)
            }
        }
        
        if let body {
            guard JSONSerialization.isValidJSONObject(body) else {
                throw APIError.invalidRequestBody
            }
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        }
        
        request.timeoutInterval = 12
        let (data, _) = try await send(
            request,
            allowsRetry: method == "GET" || method == "HEAD"
        )

        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            #if DEBUG
            Self.logDecodingFailure(error, endpoint: endpoint)
            #endif
            throw APIError.decodingError(error)
        }
    }
    
    // MARK: - Convenience Methods
    
    func get<T: Decodable>(_ endpoint: String, queryItems: [URLQueryItem]? = nil) async throws -> T {
        try await request(endpoint: endpoint, queryItems: queryItems)
    }
    
    func post<T: Decodable>(_ endpoint: String, body: [String: Any] = [:]) async throws -> T {
        try await request(endpoint: endpoint, method: "POST", body: body)
    }
    
    func patch<T: Decodable>(_ endpoint: String, body: [String: Any] = [:]) async throws -> T {
        try await request(endpoint: endpoint, method: "PATCH", body: body)
    }

    func put<T: Decodable>(_ endpoint: String, body: [String: Any] = [:]) async throws -> T {
        try await request(endpoint: endpoint, method: "PUT", body: body)
    }
    
    func delete<T: Decodable>(_ endpoint: String) async throws -> T {
        try await request(endpoint: endpoint, method: "DELETE")
    }

    func data(_ endpoint: String, queryItems: [URLQueryItem]? = nil) async throws -> Data {
        guard var components = URLComponents(string: Constants.apiBaseURL + endpoint) else {
            throw APIError.invalidURL
        }

        if let queryItems, !queryItems.isEmpty {
            components.queryItems = queryItems
        }

        guard let url = components.url else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.timeoutInterval = 20
        request.setValue(deviceId, forHTTPHeaderField: "X-Device-ID")
        request.setValue(deviceName, forHTTPHeaderField: "X-Device-Name")

        if let token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        return try await send(request, allowsRetry: true).0
    }

    private func send(
        _ request: URLRequest,
        allowsRetry: Bool,
        maximumAttempts: Int = 3
    ) async throws -> (Data, HTTPURLResponse) {
        var attempt = 0

        while true {
            do {
                let (data, response) = try await session.data(for: request)
                guard let httpResponse = response as? HTTPURLResponse else {
                    throw APIError.noData
                }
                if httpResponse.statusCode == 401 {
                    throw APIError.unauthorized
                }
                guard (200...299).contains(httpResponse.statusCode) else {
                    let message = (try? JSONSerialization.jsonObject(with: data) as? [String: Any])?["message"] as? String
                        ?? L10n.tr("api.error.request_failed_short")
                    throw APIError.serverError(httpResponse.statusCode, message)
                }
                return (data, httpResponse)
            } catch is CancellationError {
                throw CancellationError()
            } catch let urlError as URLError where urlError.code == .cancelled {
                throw CancellationError()
            } catch {
                let apiError: APIError
                if let known = error as? APIError {
                    apiError = known
                } else if let urlError = error as? URLError, urlError.code == .timedOut {
                    apiError = .timeout
                } else {
                    apiError = .networkError(error)
                }

                attempt += 1
                guard allowsRetry, apiError.isRetryable, attempt < maximumAttempts else {
                    throw apiError
                }

                let baseDelay = 250_000_000 * UInt64(1 << (attempt - 1))
                let jitter = UInt64.random(in: 0...120_000_000)
                try await Task.sleep(nanoseconds: baseDelay + jitter)
            }
        }
    }

    private var deviceId: String {
        if let existing = KeychainHelper.shared.read(forKey: Constants.keychainDeviceIdKey) {
            return existing
        }
        let value = UUID().uuidString
        KeychainHelper.shared.save(value, forKey: Constants.keychainDeviceIdKey)
        return value
    }

    private var deviceName: String {
        #if os(iOS)
        return "iPhone · iOS \(UIDevice.current.systemVersion)"
        #else
        return "Apple device"
        #endif
    }

    #if DEBUG
    private static func logDecodingFailure(_ error: Error, endpoint: String) {
        let path: [CodingKey]
        switch error {
        case DecodingError.typeMismatch(_, let context),
             DecodingError.valueNotFound(_, let context),
             DecodingError.keyNotFound(_, let context),
             DecodingError.dataCorrupted(let context):
            path = context.codingPath
        default:
            path = []
        }
        let codingPath = path.map(\.stringValue).joined(separator: ".")
        print("Decoding failed for \(endpoint) at \(codingPath.isEmpty ? "<root>" : codingPath): \(error.localizedDescription)")
    }
    #endif
}

@MainActor
final class ConnectivityMonitor: ObservableObject {
    static let shared = ConnectivityMonitor()

    @Published private(set) var isConnected = true
    @Published private(set) var hasEvaluated = false

    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "com.perkly.connectivity")

    private init() {
        monitor.pathUpdateHandler = { [weak self] path in
            Task { @MainActor [weak self] in
                self?.isConnected = path.status == .satisfied
                self?.hasEvaluated = true
            }
        }
        monitor.start(queue: queue)
    }

    deinit {
        monitor.cancel()
    }
}

struct CachedResponse<Value> {
    let value: Value
    let isStale: Bool
    let cachedAt: Date?
}

actor DiskResponseCache {
    static let shared = DiskResponseCache()

    private struct Entry<Value: Codable>: Codable {
        let savedAt: Date
        let value: Value
    }

    func fetch<Value: Codable>(
        key: String,
        maximumFreshAge: TimeInterval = 5 * 60,
        maximumStaleAge: TimeInterval = 7 * 24 * 60 * 60,
        loader: () async throws -> Value
    ) async throws -> CachedResponse<Value> {
        let url = fileURL(for: key)
        if let data = try? Data(contentsOf: url),
           let entry = try? JSONDecoder().decode(Entry<Value>.self, from: data),
           Date().timeIntervalSince(entry.savedAt) <= maximumFreshAge {
            return CachedResponse(value: entry.value, isStale: false, cachedAt: entry.savedAt)
        }

        do {
            let value = try await loader()
            let entry = Entry(savedAt: Date(), value: value)
            if let data = try? JSONEncoder().encode(entry) {
                try? data.write(to: url, options: .atomic)
            }
            return CachedResponse(value: value, isStale: false, cachedAt: nil)
        } catch {
            if error is CancellationError { throw error }
            if let apiError = error as? APIError, !apiError.isRetryable {
                throw apiError
            }
            guard let data = try? Data(contentsOf: url),
                  let entry = try? JSONDecoder().decode(Entry<Value>.self, from: data),
                  Date().timeIntervalSince(entry.savedAt) <= maximumStaleAge else {
                throw error
            }
            return CachedResponse(value: entry.value, isStale: true, cachedAt: entry.savedAt)
        }
    }

    func clear() {
        let directory = cacheDirectory
        try? FileManager.default.removeItem(at: directory)
        URLCache.shared.removeAllCachedResponses()
    }

    private func fileURL(for key: String) -> URL {
        let encoded = SHA256.hash(data: Data(key.utf8))
            .map { String(format: "%02x", $0) }
            .joined()
        let directory = cacheDirectory
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        return directory.appendingPathComponent(encoded).appendingPathExtension("json")
    }

    private var cacheDirectory: URL {
        FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("PerklyResponses", isDirectory: true)
    }
}
