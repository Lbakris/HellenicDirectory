package com.hellenicdir.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hellenicdir.core.auth.EncryptedTokenStorage
import com.hellenicdir.core.network.ApiService
import com.hellenicdir.data.remote.dto.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/** Current version of the Privacy Policy — must match what is displayed in the UI. */
private const val PRIVACY_POLICY_VERSION = "2025-01-01"

data class AuthUiState(
    val user: UserDto? = null,
    val isLoading: Boolean = true,
    val error: String? = null,
)

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val api: ApiService,
    private val tokenDataStore: EncryptedTokenStorage,
) : ViewModel() {

    private val _uiState = MutableStateFlow(AuthUiState())
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch { restoreSession() }
    }

    // MARK: Session restoration

    private suspend fun restoreSession() {
        val token = tokenDataStore.getAccessToken()
        if (token == null) {
            _uiState.update { it.copy(isLoading = false) }
            return
        }
        try {
            val response = api.getMe()
            _uiState.update { it.copy(user = response.user, isLoading = false) }
        } catch (e: Exception) {
            tokenDataStore.clearTokens()
            _uiState.update { it.copy(isLoading = false) }
        }
    }

    // MARK: Login

    fun login(email: String, password: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                val response = api.login(LoginRequest(email.trim().lowercase(), password))
                tokenDataStore.saveTokens(response.accessToken, response.refreshToken)
                _uiState.update { it.copy(user = response.user, isLoading = false) }
                onSuccess()
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = e.message ?: "Login failed") }
            }
        }
    }

    // MARK: Registration

    /**
     * Registers a new account.
     * Consent parameters must be `true` — the UI enforces checkbox ticking before
     * calling this function. The consent version and timestamps are recorded
     * server-side for CCPA/PIPEDA compliance audit trails.
     */
    fun register(
        fullName: String,
        email: String,
        password: String,
        phone: String?,
        onSuccess: () -> Unit,
    ) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                api.register(
                    RegisterRequest(
                        email = email.trim().lowercase(),
                        password = password,
                        fullName = fullName.trim(),
                        phone = phone?.ifBlank { null },
                        privacyPolicyVersion = PRIVACY_POLICY_VERSION,
                        consentPrivacyPolicy = true,
                        consentTerms = true,
                        consentSensitiveData = true,
                    )
                )
                _uiState.update { it.copy(isLoading = false) }
                onSuccess()
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isLoading = false, error = e.message ?: "Registration failed")
                }
            }
        }
    }

    // MARK: Logout

    fun logout(onComplete: () -> Unit) {
        viewModelScope.launch {
            val refreshToken = tokenDataStore.getRefreshToken()
            try { api.logout(LogoutRequest(refreshToken)) } catch (_: Exception) {}
            tokenDataStore.clearTokens()
            _uiState.update { it.copy(user = null) }
            onComplete()
        }
    }

    // MARK: Account deletion (GDPR/CCPA right to erasure)

    /**
     * Requests account deletion. The backend soft-deletes the account and revokes
     * all tokens; hard-deletion is scheduled after the 30-day regulatory grace period.
     *
     * On success, clears local tokens and resets UI state. On failure, surfaces the
     * error message so the UI can prompt the user to contact support.
     */
    fun deleteAccount(onComplete: () -> Unit, onError: (String) -> Unit) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                api.deleteAccount()
                tokenDataStore.clearTokens()
                _uiState.update { it.copy(user = null, isLoading = false) }
                onComplete()
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false) }
                onError(e.message ?: "Account deletion failed. Please contact support.")
            }
        }
    }
}
