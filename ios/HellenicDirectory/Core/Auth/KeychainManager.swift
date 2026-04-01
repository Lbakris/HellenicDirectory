import Foundation
import Security

/// Thread-safe Keychain wrapper for authentication tokens.
///
/// Implemented as an actor so concurrent reads and writes from different tasks
/// are serialized without data races. All Security framework `SecItem*` calls
/// are thread-safe per Apple documentation.
///
/// Access protection level is `kSecAttrAccessibleWhenUnlockedThisDeviceOnly`:
///  - Tokens are only readable while the device is unlocked (stricter than
///    `AfterFirstUnlock`, which would allow background reads on a locked device).
///  - `ThisDeviceOnly` prevents tokens from migrating to iCloud Backup or
///    being restored to a different device.
actor KeychainManager {
    static let shared = KeychainManager()
    private init() {}

    private let service = "com.hellenicdir.app"

    // MARK: - Token accessors

    var accessToken: String? {
        get { load(key: "access_token") }
    }

    var refreshToken: String? {
        get { load(key: "refresh_token") }
    }

    /// Stores the access token, or deletes the stored value if `nil`.
    func setAccessToken(_ value: String?) {
        if let value {
            save(value, key: "access_token")
        } else {
            delete(key: "access_token")
        }
    }

    /// Stores the refresh token, or deletes the stored value if `nil`.
    func setRefreshToken(_ value: String?) {
        if let value {
            save(value, key: "refresh_token")
        } else {
            delete(key: "refresh_token")
        }
    }

    /// Deletes both stored tokens.
    func clearAll() {
        delete(key: "access_token")
        delete(key: "refresh_token")
    }

    // MARK: - Private Keychain helpers

    @discardableResult
    private func save(_ value: String, key: String) -> Bool {
        guard let data = value.data(using: .utf8) else { return false }
        delete(key: key) // Remove any existing item before adding.

        let query: [String: Any] = [
            kSecClass as String:            kSecClassGenericPassword,
            kSecAttrService as String:      service,
            kSecAttrAccount as String:      key,
            kSecValueData as String:        data,
            // kSecAttrAccessibleWhenUnlockedThisDeviceOnly:
            // - More restrictive than AfterFirstUnlockThisDeviceOnly: tokens are
            //   only accessible when the device is actively unlocked.
            // - ThisDeviceOnly: prevents migration to other devices via backup/restore.
            kSecAttrAccessible as String:   kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
        ]
        return SecItemAdd(query as CFDictionary, nil) == errSecSuccess
    }

    private func load(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String:       kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String:  true,
            kSecMatchLimit as String:  kSecMatchLimitOne,
        ]
        var result: AnyObject?
        SecItemCopyMatching(query as CFDictionary, &result)
        guard let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    @discardableResult
    private func delete(key: String) -> Bool {
        let query: [String: Any] = [
            kSecClass as String:       kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]
        return SecItemDelete(query as CFDictionary) == errSecSuccess
    }
}
