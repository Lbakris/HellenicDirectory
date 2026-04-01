import Foundation

// MARK: - Types

enum HTTPMethod: String {
    case get = "GET"
    case post = "POST"
    case put = "PUT"
    case patch = "PATCH"
    case delete = "DELETE"
}

enum APIError: LocalizedError {
    case invalidURL
    case httpError(Int, String)
    case decodingError(Error)
    case noData
    case unauthorized

    var errorDescription: String? {
        switch self {
        case .invalidURL:                    return "Invalid URL"
        case .httpError(let code, let msg): return "HTTP \(code): \(msg)"
        case .decodingError(let e):         return "Decoding error: \(e.localizedDescription)"
        case .noData:                        return "No data returned"
        case .unauthorized:                  return "Session expired. Please sign in again."
        }
    }
}

/// Sentinel type used as the return type for requests that return no body (204 No Content).
struct EmptyResponse: Decodable {}

private struct ErrorResponse: Decodable { let error: String }

// MARK: - APIClient actor

/// Centralized HTTP client. Actor isolation ensures token reads and request
/// construction are serialized without manual locking.
actor APIClient {
    static let shared = APIClient()

    private let baseURL: String
    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    private init() {
        baseURL = Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String
            ?? "http://localhost:4000/api/v1"

        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        session = URLSession(configuration: config)

        decoder = {
            let d = JSONDecoder()
            d.keyDecodingStrategy = .convertFromSnakeCase
            d.dateDecodingStrategy = .iso8601
            return d
        }()
        encoder = {
            let e = JSONEncoder()
            e.keyEncodingStrategy = .convertToSnakeCase
            return e
        }()
    }

    // MARK: Request

    /// Performs an authenticated HTTP request with automatic token-refresh retry.
    ///
    /// - Parameters:
    ///   - path: Path relative to `baseURL` (e.g. `/auth/me`).
    ///   - method: HTTP method.
    ///   - body: Optional `Encodable` request body.
    ///   - retry: When `true`, a 401 response triggers one token-refresh attempt before propagating.
    /// - Returns: The decoded `T` value.
    /// - Throws: `APIError` on network, HTTP, or decoding failures.
    func request<T: Decodable>(
        _ path: String,
        method: HTTPMethod = .get,
        body: (some Encodable)? = Optional<String>.none,
        retry: Bool = true
    ) async throws -> T {
        guard let url = URL(string: baseURL + path) else { throw APIError.invalidURL }

        var req = URLRequest(url: url)
        req.httpMethod = method.rawValue
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let accessToken = await KeychainManager.shared.accessToken {
            req.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        }

        if let body {
            req.httpBody = try encoder.encode(body)
        }

        let (data, response) = try await session.data(for: req)
        guard let http = response as? HTTPURLResponse else { throw APIError.noData }

        if http.statusCode == 401 && retry {
            let refreshed = await TokenRefreshCoordinator.shared.refresh()
            if refreshed {
                return try await request(path, method: method, body: body, retry: false)
            } else {
                throw APIError.unauthorized
            }
        }

        guard (200..<300).contains(http.statusCode) else {
            let msg = (try? decoder.decode(ErrorResponse.self, from: data))?.error ?? "Unknown error"
            throw APIError.httpError(http.statusCode, msg)
        }

        // For empty-body responses (204 No Content or EmptyResponse type), skip decoding.
        if T.self == EmptyResponse.self || data.isEmpty {
            // Safe conditional cast: T is verified to be EmptyResponse above.
            if let empty = EmptyResponse() as? T { return empty }
            throw APIError.noData
        }

        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decodingError(error)
        }
    }

    // MARK: Convenience methods

    /// Performs a GET request and decodes the response body as `T`.
    func get<T: Decodable>(_ path: String) async throws -> T {
        try await request(path, method: .get)
    }

    /// Performs a POST request with `body` and decodes the response as `T`.
    func post<T: Decodable>(_ path: String, body: some Encodable) async throws -> T {
        try await request(path, method: .post, body: body)
    }

    /// Performs a PATCH request with `body` and decodes the response as `T`.
    func patch<T: Decodable>(_ path: String, body: some Encodable) async throws -> T {
        try await request(path, method: .patch, body: body)
    }

    /// Performs a DELETE request. Returns when the server responds with 2xx.
    func delete(_ path: String) async throws {
        let _: EmptyResponse = try await request(path, method: .delete)
    }
}
