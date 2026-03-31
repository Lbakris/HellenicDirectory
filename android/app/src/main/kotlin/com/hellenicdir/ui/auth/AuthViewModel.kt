package com.hellenicdir.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hellenicdir.core.auth.TokenDataStore
import com.hellenicdir.core.network.ApiService
import com.hellenicdir.data.remote.dto.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AuthUiState(
    val user: UserDto? = null,
    val isLoading: Boolean = true,
    val error: String? = null
)

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val api: ApiService,
    private val tokenDataStore: TokenDataStore
) : ViewModel() {

    private val _uiState = MutableStateFlow(AuthUiState())
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch { restoreSession() }
    }

    private suspend fun restoreSession() {
        val token = tokenDataStore.getAccessToken()
        if (token == null) { _uiState.update { it.copy(isLoading = false) }; return }
        try {
            val response = api.getMe()
            _uiState.update { it.copy(user = response.user, isLoading = false) }
        } catch (e: Exception) {
            tokenDataStore.clearTokens()
            _uiState.update { it.copy(isLoading = false) }
        }
    }

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

    fun register(fullName: String, email: String, password: String, phone: String?, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                api.register(RegisterRequest(email.trim().lowercase(), password, fullName.trim(), phone?.ifBlank { null }))
                _uiState.update { it.copy(isLoading = false) }
                onSuccess()
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = e.message ?: "Registration failed") }
            }
        }
    }

    fun logout(onComplete: () -> Unit) {
        viewModelScope.launch {
            val refreshToken = tokenDataStore.getRefreshToken()
            try { api.logout(LogoutRequest(refreshToken)) } catch (_: Exception) {}
            tokenDataStore.clearTokens()
            _uiState.update { it.copy(user = null) }
            onComplete()
        }
    }
}
