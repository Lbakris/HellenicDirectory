package com.hellenicdir.core.di

import com.hellenicdir.BuildConfig
import com.hellenicdir.core.network.ApiService
import com.hellenicdir.core.network.AuthInterceptor
import com.hellenicdir.core.network.TokenAuthenticator
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

/**
 * Hilt module providing the network layer singletons.
 *
 * Security notes:
 *  - HTTP logging is restricted to HEADERS in debug builds. BODY-level logging
 *    would write access and refresh tokens to logcat, which is accessible to
 *    other apps on rooted devices and exposed via adb.
 *  - Network security is enforced by `res/xml/network_security_config.xml`:
 *    cleartext HTTP is blocked in production; only HTTPS with system CAs is trusted.
 */
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideMoshi(): Moshi = Moshi.Builder()
        .addLast(KotlinJsonAdapterFactory())
        .build()

    @Provides
    @Singleton
    fun provideOkHttpClient(
        authInterceptor: AuthInterceptor,
        tokenAuthenticator: TokenAuthenticator,
    ): OkHttpClient = OkHttpClient.Builder()
        .addInterceptor(authInterceptor)
        .authenticator(tokenAuthenticator)
        .addInterceptor(
            HttpLoggingInterceptor().apply {
                // HEADERS only in debug — never BODY, which would log tokens.
                level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.HEADERS
                else HttpLoggingInterceptor.Level.NONE
            }
        )
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    @Provides
    @Singleton
    fun provideRetrofit(client: OkHttpClient, moshi: Moshi): Retrofit = Retrofit.Builder()
        // Trailing slash required by Retrofit — base URL must end with '/'.
        .baseUrl("${BuildConfig.API_BASE_URL}/")
        .client(client)
        .addConverterFactory(MoshiConverterFactory.create(moshi))
        .build()

    @Provides
    @Singleton
    fun provideApiService(retrofit: Retrofit): ApiService = retrofit.create(ApiService::class.java)
}
