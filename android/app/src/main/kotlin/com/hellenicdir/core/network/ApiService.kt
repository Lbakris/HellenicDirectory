package com.hellenicdir.core.network

import com.hellenicdir.data.remote.dto.*
import retrofit2.http.*
import retrofit2.http.DELETE

interface ApiService {
    // Auth
    @POST("auth/login")
    suspend fun login(@Body body: LoginRequest): LoginResponse

    @POST("auth/register")
    suspend fun register(@Body body: RegisterRequest): UserResponse

    @POST("auth/refresh")
    suspend fun refreshToken(@Body body: RefreshRequest): TokenResponse

    @POST("auth/logout")
    suspend fun logout(@Body body: LogoutRequest)

    @GET("auth/me")
    suspend fun getMe(): UserResponse

    /** GDPR/CCPA right to erasure — soft-deletes the account and revokes all tokens. */
    @DELETE("auth/account")
    suspend fun deleteAccount()

    // Parishes
    @GET("parishes")
    suspend fun getParishes(
        @Query("search") search: String? = null,
        @Query("state") state: String? = null,
        @Query("city") city: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): PaginatedParishesDto

    @GET("parishes/{id}")
    suspend fun getParish(@Path("id") id: String): ParishDto

    // Directories
    @GET("directories/{id}/members")
    suspend fun getDirectoryMembers(
        @Path("id") directoryId: String,
        @Query("search") search: String? = null,
        @Query("organization") organization: String? = null,
        @Query("industry") industry: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 50
    ): PaginatedMembersDto

    @POST("directories/{id}/invite")
    suspend fun inviteMember(@Path("id") directoryId: String, @Body body: InviteRequest): InviteResponse

    // Messaging
    @GET("directories/{id}/messages")
    suspend fun getThreads(@Path("id") directoryId: String): ThreadsResponse

    @GET("directories/{id}/messages/{threadId}")
    suspend fun getThread(@Path("id") directoryId: String, @Path("threadId") threadId: String): ThreadDetailResponse

    @POST("directories/{id}/messages")
    suspend fun sendMessage(@Path("id") directoryId: String, @Body body: SendMessageRequest): SendMessageResponse

    // Businesses
    @GET("businesses")
    suspend fun getBusinesses(
        @Query("search") search: String? = null,
        @Query("city") city: String? = null,
        @Query("keyword") keyword: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): PaginatedBusinessesDto

    @GET("businesses/{id}")
    suspend fun getBusiness(@Path("id") id: String): BusinessDetailResponse

    // Admin
    @GET("admin/stats")
    suspend fun getAdminStats(): AdminStatsResponse

    @GET("admin/directories")
    suspend fun getAdminDirectories(): DirectoriesResponse

    @GET("admin/users")
    suspend fun getAdminUsers(
        @Query("search") search: String? = null,
        @Query("page") page: Int = 1
    ): PaginatedUsersDto
}
