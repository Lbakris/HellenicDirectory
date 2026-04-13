package com.hellenicdir.core.network

import com.hellenicdir.core.auth.EncryptedTokenStorage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject
import javax.inject.Singleton

/**
 * OkHttp [Interceptor] that attaches the current access token as a Bearer
 * Authorization header on outgoing requests.
 *
 * Thread-safety note: OkHttp interceptors are always invoked on background threads.
 * `runBlocking(Dispatchers.IO)` explicitly dispatches the DataStore read to the IO
 * thread pool, preventing any accidental main-thread execution and avoiding ANR risk.
 */
@Singleton
class AuthInterceptor @Inject constructor(
    private val tokenDataStore: EncryptedTokenStorage,
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        // Dispatch to IO dispatcher to safely read from EncryptedSharedPreferences
        // without blocking the main thread.
        val token = runBlocking(Dispatchers.IO) { tokenDataStore.getAccessToken() }

        val request = chain.request().newBuilder()
            .apply { if (token != null) header("Authorization", "Bearer $token") }
            .build()

        return chain.proceed(request)
    }
}
