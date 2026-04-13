package com.hellenicdir.core.auth

/**
 * Deprecated alias — use [EncryptedTokenStorage] directly.
 *
 * The original class name was misleading: the implementation uses
 * [androidx.security.crypto.EncryptedSharedPreferences], not the Jetpack DataStore API.
 * All new code should reference [EncryptedTokenStorage].
 */
@Deprecated(
    message = "Use EncryptedTokenStorage instead — the name better reflects the implementation.",
    replaceWith = ReplaceWith("EncryptedTokenStorage", "com.hellenicdir.core.auth.EncryptedTokenStorage"),
)
typealias TokenDataStore = EncryptedTokenStorage
