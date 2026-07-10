import Foundation

/// Coordinates concurrent token-refresh requests so that only one refresh HTTP call
/// is in flight at a time. Any task that calls `refresh()` while a refresh is
/// already in progress is suspended until the in-flight refresh completes, then
/// receives the same result.
actor TokenRefreshCoordinator {
    static let shared = TokenRefreshCoordinator()
    private var isRefreshing = false
    private var waiters: [CheckedContinuation<Bool, Never>] = []

    /// Requests a token rotation. Returns `true` if new tokens were stored, `false` on failure.
    func refresh() async -> Bool {
        if isRefreshing {
            // Suspend caller and enqueue it to receive the pending refresh result.
            return await withCheckedContinuation { continuation in
                waiters.append(continuation)
            }
        }

        isRefreshing = true
        let result = await performRefresh()
        isRefreshing = false

        // Notify all waiters with the same result.
        let pending = waiters
        waiters.removeAll()
        for waiter in pending { waiter.resume(returning: result) }

        return result
    }

    // MARK: - Private

    private func performRefresh() async -> Bool {
        // KeychainManager is an actor — await is required.
        guard let refreshToken = await KeychainManager.shared.refreshToken else { return false }

        struct RefreshBody: Encodable { let refreshToken: String }
        struct TokenResponse: Decodable { let accessToken: String; let refreshToken: String }

        do {
            // retry: false is essential — the refresh call must NOT go through the
            // 401-retry path, or a failed refresh would re-enter this coordinator and
            // deadlock (the in-flight refresh would await a call that awaits itself).
            let response: TokenResponse = try await APIClient.shared.request(
                "/auth/refresh",
                method: .post,
                body: RefreshBody(refreshToken: refreshToken),
                retry: false
            )
            await KeychainManager.shared.setAccessToken(response.accessToken)
            await KeychainManager.shared.setRefreshToken(response.refreshToken)
            return true
        } catch {
            await KeychainManager.shared.clearAll()
            return false
        }
    }
}
