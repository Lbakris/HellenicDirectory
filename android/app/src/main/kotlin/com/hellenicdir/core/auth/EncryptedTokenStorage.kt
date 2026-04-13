package com.hellenicdir.core.auth

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Encrypted persistent storage for authentication tokens.
 *
 * Uses [EncryptedSharedPreferences] (AES-256-GCM for values, AES-256-SIV for keys)
 * backed by Android Keystore. This ensures tokens are at rest encrypted and protected
 * by the device's secure hardware when available.
 *
 * The previous plain-text DataStore implementation stored access and refresh tokens
 * in cleartext in the app's data directory, which is readable on rooted devices and
 * visible in unencrypted backups (even with `allowBackup="false"`, the plain DataStore
 * file exists on disk). EncryptedSharedPreferences mitigates this risk.
 *
 * Thread-safety: all I/O dispatches to [Dispatchers.IO].
 */
@Singleton
class EncryptedTokenStorage @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val prefs: SharedPreferences by lazy {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()

        EncryptedSharedPreferences.create(
            context,
            /* fileName = */ "hd_secure_tokens",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        )
    }

    /** Flow that emits the current access token (or null if absent). */
    val accessTokenFlow: Flow<String?> = flow {
        emit(prefs.getString(KEY_ACCESS, null))
    }.flowOn(Dispatchers.IO)

    /** Flow that emits the current refresh token (or null if absent). */
    val refreshTokenFlow: Flow<String?> = flow {
        emit(prefs.getString(KEY_REFRESH, null))
    }.flowOn(Dispatchers.IO)

    /** Returns the stored access token synchronously on the IO dispatcher. */
    suspend fun getAccessToken(): String? = withContext(Dispatchers.IO) {
        prefs.getString(KEY_ACCESS, null)
    }

    /** Returns the stored refresh token synchronously on the IO dispatcher. */
    suspend fun getRefreshToken(): String? = withContext(Dispatchers.IO) {
        prefs.getString(KEY_REFRESH, null)
    }

    /** Persists both tokens atomically. */
    suspend fun saveTokens(accessToken: String, refreshToken: String) =
        withContext(Dispatchers.IO) {
            prefs.edit()
                .putString(KEY_ACCESS, accessToken)
                .putString(KEY_REFRESH, refreshToken)
                .apply()
        }

    /** Removes both tokens (e.g. on logout or account deletion). */
    suspend fun clearTokens() = withContext(Dispatchers.IO) {
        prefs.edit()
            .remove(KEY_ACCESS)
            .remove(KEY_REFRESH)
            .apply()
    }

    companion object {
        private const val KEY_ACCESS = "access_token"
        private const val KEY_REFRESH = "refresh_token"
    }
}
