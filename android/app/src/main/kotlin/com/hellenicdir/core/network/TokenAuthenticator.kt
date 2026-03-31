package com.hellenicdir.core.network

import com.hellenicdir.core.auth.TokenDataStore
import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass
import kotlinx.coroutines.runBlocking
import okhttp3.Authenticator
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route
import retrofit2.Retrofit
import javax.inject.Inject
import javax.inject.Singleton

@JsonClass(generateAdapter = true)
data class RefreshRequest(@Json(name = "refreshToken") val refreshToken: String)

@JsonClass(generateAdapter = true)
data class TokenResponse(
    @Json(name = "accessToken") val accessToken: String,
    @Json(name = "refreshToken") val refreshToken: String
)

@Singleton
class TokenAuthenticator @Inject constructor(
    private val tokenDataStore: TokenDataStore,
    private val apiService: Lazy<ApiService>
) : Authenticator {

    override fun authenticate(route: Route?, response: Response): Request? {
        // Avoid refresh loop
        if (response.request.header("X-Retry-After-Refresh") != null) return null

        val refreshToken = runBlocking { tokenDataStore.getRefreshToken() } ?: return null

        return runBlocking {
            try {
                val tokens = apiService.value.refreshToken(RefreshRequest(refreshToken))
                tokenDataStore.saveTokens(tokens.accessToken, tokens.refreshToken)
                response.request.newBuilder()
                    .header("Authorization", "Bearer ${tokens.accessToken}")
                    .header("X-Retry-After-Refresh", "true")
                    .build()
            } catch (e: Exception) {
                tokenDataStore.clearTokens()
                null
            }
        }
    }
}
