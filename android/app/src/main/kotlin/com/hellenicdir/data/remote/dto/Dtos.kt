package com.hellenicdir.data.remote.dto

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

// ── Auth ─────────────────────────────────────────────────────────────────────

@JsonClass(generateAdapter = true)
data class LoginRequest(
    @Json(name = "email") val email: String,
    @Json(name = "password") val password: String,
    @Json(name = "deviceId") val deviceId: String? = null
)

@JsonClass(generateAdapter = true)
data class RegisterRequest(
    @Json(name = "email") val email: String,
    @Json(name = "password") val password: String,
    @Json(name = "fullName") val fullName: String,
    @Json(name = "phone") val phone: String? = null
)

@JsonClass(generateAdapter = true)
data class LogoutRequest(@Json(name = "refreshToken") val refreshToken: String?)

@JsonClass(generateAdapter = true)
data class LoginResponse(
    @Json(name = "user") val user: UserDto,
    @Json(name = "accessToken") val accessToken: String,
    @Json(name = "refreshToken") val refreshToken: String
)

@JsonClass(generateAdapter = true)
data class UserResponse(@Json(name = "user") val user: UserDto)

@JsonClass(generateAdapter = true)
data class UserDto(
    @Json(name = "id") val id: String,
    @Json(name = "email") val email: String,
    @Json(name = "fullName") val fullName: String,
    @Json(name = "phone") val phone: String?,
    @Json(name = "avatarUrl") val avatarUrl: String?,
    @Json(name = "appRole") val appRole: String
)

// ── Parish ────────────────────────────────────────────────────────────────────

@JsonClass(generateAdapter = true)
data class PaginatedParishesDto(
    @Json(name = "data") val data: List<ParishDto>,
    @Json(name = "meta") val meta: PaginationMetaDto
)

@JsonClass(generateAdapter = true)
data class ParishDto(
    @Json(name = "id") val id: String,
    @Json(name = "name") val name: String,
    @Json(name = "address") val address: String?,
    @Json(name = "city") val city: String?,
    @Json(name = "state") val state: String?,
    @Json(name = "zip") val zip: String?,
    @Json(name = "country") val country: String,
    @Json(name = "phone") val phone: String?,
    @Json(name = "email") val email: String?,
    @Json(name = "website") val website: String?,
    @Json(name = "latitude") val latitude: Double?,
    @Json(name = "longitude") val longitude: Double?,
    @Json(name = "metropolis") val metropolis: MetropolisDto?,
    @Json(name = "clergy") val clergy: List<ClergyDto>?
)

@JsonClass(generateAdapter = true)
data class MetropolisDto(@Json(name = "id") val id: String, @Json(name = "name") val name: String)

@JsonClass(generateAdapter = true)
data class ClergyDto(
    @Json(name = "id") val id: String,
    @Json(name = "title") val title: String?,
    @Json(name = "fullName") val fullName: String,
    @Json(name = "email") val email: String?,
    @Json(name = "phone") val phone: String?
)

// ── Directory ─────────────────────────────────────────────────────────────────

@JsonClass(generateAdapter = true)
data class PaginatedMembersDto(
    @Json(name = "data") val data: List<MemberDto>,
    @Json(name = "meta") val meta: PaginationMetaDto
)

@JsonClass(generateAdapter = true)
data class MemberDto(
    @Json(name = "id") val id: String,
    @Json(name = "directoryId") val directoryId: String,
    @Json(name = "photoUrl") val photoUrl: String?,
    @Json(name = "city") val city: String?,
    @Json(name = "industry") val industry: String?,
    @Json(name = "employer") val employer: String?,
    @Json(name = "user") val user: MemberUserDto,
    @Json(name = "organizations") val organizations: List<MemberOrgDto>
)

@JsonClass(generateAdapter = true)
data class MemberUserDto(
    @Json(name = "id") val id: String,
    @Json(name = "fullName") val fullName: String,
    @Json(name = "email") val email: String,
    @Json(name = "phone") val phone: String?
)

@JsonClass(generateAdapter = true)
data class MemberOrgDto(
    @Json(name = "id") val id: String,
    @Json(name = "organization") val organization: OrgDto,
    @Json(name = "verifiedAt") val verifiedAt: String?
)

@JsonClass(generateAdapter = true)
data class OrgDto(@Json(name = "id") val id: String, @Json(name = "name") val name: String)

@JsonClass(generateAdapter = true)
data class InviteRequest(@Json(name = "email") val email: String)

@JsonClass(generateAdapter = true)
data class InviteResponse(@Json(name = "invitation") val invitation: InviteResultDto)

@JsonClass(generateAdapter = true)
data class InviteResultDto(@Json(name = "id") val id: String, @Json(name = "status") val status: String)

@JsonClass(generateAdapter = true)
data class DirectoriesResponse(@Json(name = "data") val data: List<DirectoryDto>)

@JsonClass(generateAdapter = true)
data class DirectoryDto(
    @Json(name = "id") val id: String,
    @Json(name = "name") val name: String,
    @Json(name = "description") val description: String?
)

// ── Messaging ─────────────────────────────────────────────────────────────────

@JsonClass(generateAdapter = true)
data class ThreadsResponse(@Json(name = "data") val data: List<ThreadDto>)

@JsonClass(generateAdapter = true)
data class ThreadDto(
    @Json(name = "id") val id: String,
    @Json(name = "subject") val subject: String?,
    @Json(name = "type") val type: String,
    @Json(name = "messages") val messages: List<MessagePreviewDto>,
    @Json(name = "participants") val participants: List<ParticipantDto>
)

@JsonClass(generateAdapter = true)
data class MessagePreviewDto(
    @Json(name = "body") val body: String,
    @Json(name = "sentAt") val sentAt: String,
    @Json(name = "sender") val sender: SenderDto
)

@JsonClass(generateAdapter = true)
data class ParticipantDto(
    @Json(name = "userId") val userId: String,
    @Json(name = "user") val user: SenderDto
)

@JsonClass(generateAdapter = true)
data class SenderDto(@Json(name = "id") val id: String, @Json(name = "fullName") val fullName: String)

@JsonClass(generateAdapter = true)
data class ThreadDetailResponse(@Json(name = "thread") val thread: ThreadDetailDto)

@JsonClass(generateAdapter = true)
data class ThreadDetailDto(
    @Json(name = "id") val id: String,
    @Json(name = "subject") val subject: String?,
    @Json(name = "messages") val messages: List<FullMessageDto>,
    @Json(name = "participants") val participants: List<ParticipantDto>
)

@JsonClass(generateAdapter = true)
data class FullMessageDto(
    @Json(name = "id") val id: String,
    @Json(name = "threadId") val threadId: String,
    @Json(name = "senderId") val senderId: String,
    @Json(name = "sender") val sender: SenderDto,
    @Json(name = "body") val body: String,
    @Json(name = "sentAt") val sentAt: String
)

@JsonClass(generateAdapter = true)
data class SendMessageRequest(
    @Json(name = "threadId") val threadId: String?,
    @Json(name = "body") val body: String
)

@JsonClass(generateAdapter = true)
data class SendMessageResponse(@Json(name = "message") val message: MessageIdDto)

@JsonClass(generateAdapter = true)
data class MessageIdDto(@Json(name = "id") val id: String)

// ── Business ──────────────────────────────────────────────────────────────────

@JsonClass(generateAdapter = true)
data class PaginatedBusinessesDto(
    @Json(name = "data") val data: List<BusinessDto>,
    @Json(name = "meta") val meta: PaginationMetaDto
)

@JsonClass(generateAdapter = true)
data class BusinessDto(
    @Json(name = "id") val id: String,
    @Json(name = "businessName") val businessName: String,
    @Json(name = "contactName") val contactName: String,
    @Json(name = "phone") val phone: String,
    @Json(name = "email") val email: String,
    @Json(name = "city") val city: String,
    @Json(name = "state") val state: String?,
    @Json(name = "website") val website: String?,
    @Json(name = "description") val description: String?,
    @Json(name = "logoUrl") val logoUrl: String?,
    @Json(name = "keywords") val keywords: List<String>
)

@JsonClass(generateAdapter = true)
data class BusinessDetailResponse(@Json(name = "business") val business: BusinessDto)

// ── Admin ─────────────────────────────────────────────────────────────────────

@JsonClass(generateAdapter = true)
data class AdminStatsResponse(@Json(name = "stats") val stats: AdminStatsDto)

@JsonClass(generateAdapter = true)
data class AdminStatsDto(
    @Json(name = "users") val users: Int,
    @Json(name = "parishes") val parishes: Int,
    @Json(name = "directories") val directories: Int,
    @Json(name = "businesses") val businesses: Int,
    @Json(name = "messages") val messages: Int
)

@JsonClass(generateAdapter = true)
data class PaginatedUsersDto(
    @Json(name = "data") val data: List<UserDto>,
    @Json(name = "meta") val meta: PaginationMetaDto
)

// ── Common ────────────────────────────────────────────────────────────────────

@JsonClass(generateAdapter = true)
data class PaginationMetaDto(
    @Json(name = "total") val total: Int,
    @Json(name = "page") val page: Int,
    @Json(name = "limit") val limit: Int,
    @Json(name = "pages") val pages: Int
)
