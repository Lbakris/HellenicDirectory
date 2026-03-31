import Foundation

actor TokenRefreshCoordinator {
    static let shared = TokenRefreshCoordinator()
    private var isRefreshing = false
    private var waiters: [CheckedContinuation<Bool, Never>] = []

    func refresh() async -> Bool {
        if isRefreshing {
            return await withCheckedContinuation { continuation in
                waiters.append(continuation)
            }
        }

        isRefreshing = true
        let result = await performRefresh()
        isRefreshing = false

        // Notify all waiting callers
        for waiter in waiters { waiter.resume(returning: result) }
        waiters.removeAll()

        return result
    }

    private func performRefresh() async -> Bool {
        guard let refreshToken = KeychainManager.shared.refreshToken else { return false }

        struct RefreshBody: Encodable { let refreshToken: String }
        struct TokenResponse: Decodable { let accessToken: String; let refreshToken: String }

        do {
            let response: TokenResponse = try await APIClient.shared.post(
                "/auth/refresh",
                body: RefreshBody(refreshToken: refreshToken)
            )
            KeychainManager.shared.accessToken = response.accessToken
            KeychainManager.shared.refreshToken = response.refreshToken
            return true
        } catch {
            KeychainManager.shared.clearAll()
            return false
        }
    }
}
