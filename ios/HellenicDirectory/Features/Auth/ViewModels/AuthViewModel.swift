import Foundation
import UIKit
import Combine
import OSLog

/// Current Privacy Policy version — must match the version displayed in the registration UI.
private let PRIVACY_POLICY_VERSION = "2025-01-01"

private let logger = Logger(subsystem: "com.hellenicdir", category: "AuthViewModel")

// MARK: - Response / request types

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

/// Registration request body.
/// Consent fields are required by the backend per CCPA/PIPEDA sensitive-data rules.
struct RegisterRequest: Encodable {
    let email: String
    let password: String
    let fullName: String
    let phone: String?
    /// Version of the Privacy Policy the user accepted (e.g. "2024-01-01").
    let privacyPolicyVersion: String
    let consentPrivacyPolicy: Bool
    let consentTerms: Bool
    let consentSensitiveData: Bool
}

// MARK: - AuthViewModel

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

    /// Attempts to restore the authenticated session from the stored Keychain tokens.
    func restoreSession() async {
        let hasToken = await KeychainManager.shared.accessToken != nil
        guard hasToken else {
            isLoading = false
            return
        }
        do {
            let response: UserResponse = try await APIClient.shared.get("/auth/me")
            currentUser = response.user
        } catch {
            logger.warning("Session restore failed — clearing tokens: \(error.localizedDescription, privacy: .public)")
            await KeychainManager.shared.clearAll()
        }
        isLoading = false
    }

    /// Authenticates with email and password and persists the issued tokens to Keychain.
    func login(email: String, password: String) async throws {
        // UIDevice.identifierForVendor must be accessed on the main thread.
        // This method is @MainActor so the call is safe here.
        let deviceId = UIDevice.current.identifierForVendor?.uuidString

        let response: LoginResponse = try await APIClient.shared.post(
            "/auth/login",
            body: LoginRequest(email: email, password: password, deviceId: deviceId)
        )
        await KeychainManager.shared.setAccessToken(response.accessToken)
        await KeychainManager.shared.setRefreshToken(response.refreshToken)
        currentUser = response.user
    }

    /// Registers a new account.
    ///
    /// Consent acknowledgements are passed as `true` because the registration UI
    /// requires all three checkboxes to be ticked before this function is callable.
    ///
    /// - Parameters:
    ///   - privacyPolicyVersion: The version string of the Privacy Policy the user accepted.
    func register(
        fullName: String,
        email: String,
        password: String,
        phone: String?
    ) async throws {
        let _: UserResponse = try await APIClient.shared.post(
            "/auth/register",
            body: RegisterRequest(
                email: email,
                password: password,
                fullName: fullName,
                phone: phone,
                privacyPolicyVersion: PRIVACY_POLICY_VERSION,
                consentPrivacyPolicy: true,
                consentTerms: true,
                consentSensitiveData: true
            )
        )
    }

    /// Signs out by revoking the refresh token and clearing Keychain credentials.
    func logout() async {
        let refreshToken = await KeychainManager.shared.refreshToken
        struct LogoutBody: Encodable { let refreshToken: String? }
        try? await APIClient.shared.post("/auth/logout", body: LogoutBody(refreshToken: refreshToken)) as EmptyResponse
        await KeychainManager.shared.clearAll()
        currentUser = nil
    }

    /// Requests account deletion (GDPR/CCPA right to erasure).
    /// Revokes all tokens server-side and clears local credentials.
    func deleteAccount() async throws {
        try await APIClient.shared.delete("/auth/account")
        await KeychainManager.shared.clearAll()
        currentUser = nil
    }
}
