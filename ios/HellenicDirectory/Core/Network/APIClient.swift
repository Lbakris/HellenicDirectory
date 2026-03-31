import Foundation

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
        case .invalidURL: return "Invalid URL"
        case .httpError(let code, let msg): return "HTTP \(code): \(msg)"
        case .decodingError(let e): return "Decoding error: \(e.localizedDescription)"
        case .noData: return "No data returned"
        case .unauthorized: return "Session expired. Please sign in again."
        }
    }
}

actor APIClient {
    static let shared = APIClient()

    private let baseURL: String
    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    private init() {
        baseURL = Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String
            ?? "http://localhost:4000"
        session = URLSession(configuration: .default)
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

        if let accessToken = KeychainManager.shared.accessToken {
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

        if T.self == EmptyResponse.self { return EmptyResponse() as! T }

        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decodingError(error)
        }
    }

    func get<T: Decodable>(_ path: String) async throws -> T {
        try await request(path, method: .get)
    }

    func post<T: Decodable>(_ path: String, body: some Encodable) async throws -> T {
        try await request(path, method: .post, body: body)
    }

    func patch<T: Decodable>(_ path: String, body: some Encodable) async throws -> T {
        try await request(path, method: .patch, body: body)
    }

    func delete(_ path: String) async throws {
        let _: EmptyResponse = try await request(path, method: .delete)
    }
}

struct ErrorResponse: Decodable { let error: String }
struct EmptyResponse: Decodable {}
