package com.hellenicdir.core.network

import com.hellenicdir.BuildConfig
import com.hellenicdir.core.auth.TokenDataStore
import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking
import okhttp3.Authenticator
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import okhttp3.Route
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

/**
 * OkHttp [Authenticator] that handles 401 responses by rotating the refresh token
 * and retrying the original request with a new access token.
 *
 * Circular dependency fix:
 * The previous implementation injected `Lazy<ApiService>`, which created a Hilt
 * circular graph: `OkHttpClient → TokenAuthenticator → ApiService → Retrofit → OkHttpClient`.
 * This is resolved by making the refresh HTTP call directly with a dedicated plain
 * [OkHttpClient] that has no auth interceptor, completely severing the cycle.
 *
 * ANR mitigation:
 * `runBlocking(Dispatchers.IO)` ensures DataStore operations execute on background threads.
 * OkHttp's [Authenticator] is always called from OkHttp's background thread pool, so
 * blocking it here does not affect the main thread.
 */
@Singleton
class TokenAuthenticator @Inject constructor(
    private val tokenDataStore: TokenDataStore,
) : Authenticator {

    /** Dedicated client for token refresh — no auth interceptor to avoid re-entrancy. */
    private val refreshClient: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    private val moshi: Moshi = Moshi.Builder()
        .addLast(KotlinJsonAdapterFactory())
        .build()

    /** Guards against concurrent refresh storms: only one refresh in flight at a time. */
    @Volatile private var isRefreshing = false

    override fun authenticate(route: Route?, response: Response): Request? {
        // If this request already carries the "retry after refresh" header, the token
        // rotation itself failed — do not retry again to avoid an infinite loop.
        if (response.request.header("X-Retry-After-Refresh") != null) return null

        val refreshToken = runBlocking(Dispatchers.IO) {
            tokenDataStore.getRefreshToken()
        } ?: return null

        // Deduplicate concurrent refresh attempts.
        synchronized(this) {
            if (isRefreshing) return null
            isRefreshing = true
        }

        return try {
            // Build the refresh request body. JWT tokens are Base64URL-encoded
            // (no characters that require JSON escaping), so inline interpolation is safe.
            val requestBody = "{\"refreshToken\":\"$refreshToken\"}"
                .toRequestBody("application/json; charset=utf-8".toMediaType())

            val refreshRequest = Request.Builder()
                .url("${BuildConfig.API_BASE_URL}/auth/refresh")
                .post(requestBody)
                .build()

            val refreshResponse = refreshClient.newCall(refreshRequest).execute()
            if (!refreshResponse.isSuccessful) {
                runBlocking(Dispatchers.IO) { tokenDataStore.clearTokens() }
                return null
            }

            val body = refreshResponse.body?.string() ?: return null
            val adapter = moshi.adapter(TokenResponse::class.java)
            val tokens = adapter.fromJson(body) ?: return null

            runBlocking(Dispatchers.IO) {
                tokenDataStore.saveTokens(tokens.accessToken, tokens.refreshToken)
            }

            response.request.newBuilder()
                .header("Authorization", "Bearer ${tokens.accessToken}")
                .header("X-Retry-After-Refresh", "true")
                .build()
        } catch (e: Exception) {
            runBlocking(Dispatchers.IO) { tokenDataStore.clearTokens() }
            null
        } finally {
            isRefreshing = false
        }
    }
}

@JsonClass(generateAdapter = true)
data class RefreshRequest(@Json(name = "refreshToken") val refreshToken: String)

@JsonClass(generateAdapter = true)
data class TokenResponse(
    @Json(name = "accessToken") val accessToken: String,
    @Json(name = "refreshToken") val refreshToken: String,
)
