package com.hellenicdir.ui.directories

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hellenicdir.core.network.ApiService
import com.hellenicdir.data.remote.dto.InviteRequest
import com.hellenicdir.data.remote.dto.MemberDto
import com.hellenicdir.ui.designsystem.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class MemberListUiState(
    val members: List<MemberDto> = emptyList(),
    val isLoading: Boolean = true,
    val error: String? = null
)

@HiltViewModel
class DirectoryViewModel @Inject constructor(private val api: ApiService) : ViewModel() {
    private val _state = MutableStateFlow(MemberListUiState())
    val state = _state.asStateFlow()

    var searchQuery = mutableStateOf("")

    fun loadMembers(directoryId: String) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                val result = api.getDirectoryMembers(directoryId, search = searchQuery.value.ifBlank { null })
                _state.update { it.copy(members = result.data, isLoading = false) }
            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }

    fun sendInvite(directoryId: String, email: String, onSuccess: () -> Unit, onError: (String) -> Unit) {
        viewModelScope.launch {
            try {
                api.inviteMember(directoryId, InviteRequest(email.trim().lowercase()))
                onSuccess()
            } catch (e: Exception) {
                onError(e.message ?: "Failed to send invitation")
            }
        }
    }
}

@Composable
fun DirectoryMemberListScreen(
    directoryId: String,
    onOpenInbox: (String) -> Unit,
    viewModel: DirectoryViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()
    var showInviteDialog by remember { mutableStateOf(false) }

    LaunchedEffect(directoryId) { viewModel.loadMembers(directoryId) }

    Column(modifier = Modifier.fillMaxSize()) {
        Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                HDSectionHeader("Members", Modifier.weight(1f))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    IconButton(onClick = { onOpenInbox(directoryId) }) {
                        Icon(Icons.Default.Email, contentDescription = "Inbox", tint = HDGold)
                    }
                    IconButton(onClick = { showInviteDialog = true }) {
                        Icon(Icons.Default.PersonAdd, contentDescription = "Invite", tint = HDGold)
                    }
                }
            }
            HDSearchBar(
                query = viewModel.searchQuery.value,
                onQueryChange = { viewModel.searchQuery.value = it },
                onSearch = { viewModel.loadMembers(directoryId) }
            )
        }

        if (state.isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = HDGold) }
        } else {
            LazyColumn(contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(state.members, key = { it.id }) { member ->
                    HDCard(modifier = Modifier.fillMaxWidth()) {
                        Row(modifier = Modifier.padding(12.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            HDAvatar(imageUrl = member.photoUrl, initials = member.user.fullName.take(1), size = 44.dp)
                            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                                Text(member.user.fullName, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary)
                                member.city?.let { Text(it, style = MaterialTheme.typography.labelSmall, color = HDMuted) }
                                val workInfo = listOfNotNull(member.industry, member.employer).joinToString(" · ")
                                if (workInfo.isNotEmpty()) Text(workInfo, style = MaterialTheme.typography.labelSmall, color = HDMuted)
                                val verifiedOrgs = member.organizations.filter { it.verifiedAt != null }
                                if (verifiedOrgs.isNotEmpty()) {
                                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                        verifiedOrgs.take(3).forEach { mo -> HDBadge(mo.organization.name) }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (showInviteDialog) {
        InviteDialog(
            directoryId = directoryId,
            viewModel = viewModel,
            onDismiss = { showInviteDialog = false }
        )
    }
}

@Composable
fun InviteDialog(directoryId: String, viewModel: DirectoryViewModel, onDismiss: () -> Unit) {
    var email by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var sent by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Invite Member", style = MaterialTheme.typography.titleMedium) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it; error = null },
                    label = { Text("Email Address") },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = HDGold, unfocusedBorderColor = HDMuted.copy(alpha = 0.3f))
                )
                error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.labelSmall) }
                if (sent) Text("Invitation sent!", color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.labelMedium)
            }
        },
        confirmButton = {
            TextButton(onClick = {
                viewModel.sendInvite(directoryId, email, onSuccess = { sent = true }, onError = { error = it })
            }) {
                Text("Send", color = HDGold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        }
    )
}
