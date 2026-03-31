import Foundation
import Combine

struct UserResponse: Decodable {
    let user: AppUser
}

struct AppUser: Decodable, Identifiable {
    let id: String
    let email: String
    let fullName: String
    let phone: String?
    let avatarUrl: String?
    let appRole: String
}

struct LoginRequest: Encodable {
    let email: String
    let password: String
    let deviceId: String?
}

struct LoginResponse: Decodable {
    let user: AppUser
    let accessToken: String
    let refreshToken: String
}

struct RegisterRequest: Encodable {
    let email: String
    let password: String
    let fullName: String
    let phone: String?
}

@MainActor
class AuthViewModel: ObservableObject {
    @Published var currentUser: AppUser?
    @Published var isLoading = true
    @Published var error: String?

    var isAdmin: Bool { currentUser?.appRole == "OWNER" || currentUser?.appRole == "ADMIN" }
    var isOwner: Bool { currentUser?.appRole == "OWNER" }

    init() {
        Task { await restoreSession() }
    }

    func restoreSession() async {
        guard KeychainManager.shared.accessToken != nil else {
            isLoading = false
            return
        }
        do {
            let response: UserResponse = try await APIClient.shared.get("/auth/me")
            currentUser = response.user
        } catch {
            KeychainManager.shared.clearAll()
        }
        isLoading = false
    }

    func login(email: String, password: String) async throws {
        let response: LoginResponse = try await APIClient.shared.post(
            "/auth/login",
            body: LoginRequest(email: email, password: password, deviceId: UIDeviceID.current)
        )
        KeychainManager.shared.accessToken = response.accessToken
        KeychainManager.shared.refreshToken = response.refreshToken
        currentUser = response.user
    }

    func register(fullName: String, email: String, password: String, phone: String?) async throws {
        let _: UserResponse = try await APIClient.shared.post(
            "/auth/register",
            body: RegisterRequest(email: email, password: password, fullName: fullName, phone: phone)
        )
    }

    func logout() async {
        let refreshToken = KeychainManager.shared.refreshToken
        struct LogoutBody: Encodable { let refreshToken: String? }
        try? await APIClient.shared.post("/auth/logout", body: LogoutBody(refreshToken: refreshToken)) as EmptyResponse
        KeychainManager.shared.clearAll()
        currentUser = nil
    }
}

enum UIDeviceID {
    static var current: String {
        UIDevice.current.identifierForVendor?.uuidString ?? UUID().uuidString
    }
}
