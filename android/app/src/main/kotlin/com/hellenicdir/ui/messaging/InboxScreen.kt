package com.hellenicdir.ui.messaging

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hellenicdir.core.network.ApiService
import com.hellenicdir.data.remote.dto.*
import com.hellenicdir.ui.designsystem.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class InboxUiState(
    val threads: List<ThreadDto> = emptyList(),
    val activeThread: ThreadDetailDto? = null,
    val currentUserId: String = "",
    val isLoading: Boolean = true,
    val isSending: Boolean = false
)

/**
 * ViewModel for the directory inbox/messaging screen.
 *
 * [directoryId] is read from [SavedStateHandle] (key "directoryId"), which is
 * populated automatically by Navigation Compose when the destination declares it
 * as a nav argument. Using SavedStateHandle — rather than a mutable `var` field
 * set via an `init()` call — ensures the value survives process death and
 * eliminates the Hilt anti-pattern of calling initialisation logic after
 * ViewModel creation from the UI layer.
 */
@HiltViewModel
class InboxViewModel @Inject constructor(
    private val api: ApiService,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {

    private val directoryId: String = checkNotNull(savedStateHandle["directoryId"]) {
        "InboxViewModel requires a 'directoryId' navigation argument"
    }

    private val _state = MutableStateFlow(InboxUiState())
    val state = _state.asStateFlow()

    init {
        viewModelScope.launch {
            // Fetch current user ID and threads concurrently
            launch {
                try {
                    val me = api.getMe()
                    _state.update { it.copy(currentUserId = me.user.id) }
                } catch (_: Exception) {}
            }
            loadThreads()
        }
    }

    private suspend fun loadThreads() {
        try {
            val result = api.getThreads(directoryId)
            _state.update { it.copy(threads = result.data, isLoading = false) }
        } catch (e: Exception) {
            _state.update { it.copy(isLoading = false) }
        }
    }

    fun openThread(threadId: String) {
        viewModelScope.launch {
            try {
                val result = api.getThread(directoryId, threadId)
                _state.update { it.copy(activeThread = result.thread) }
            } catch (_: Exception) {}
        }
    }

    fun sendMessage(body: String) {
        val threadId = _state.value.activeThread?.id ?: return
        viewModelScope.launch {
            _state.update { it.copy(isSending = true) }
            try {
                api.sendMessage(directoryId, SendMessageRequest(threadId = threadId, body = body))
                openThread(threadId)
                loadThreads()
            } catch (_: Exception) {}
            _state.update { it.copy(isSending = false) }
        }
    }
}

@Composable
fun InboxScreen(viewModel: InboxViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    var draft by remember { mutableStateOf("") }

    if (state.isLoading) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = HDGold) }
        return
    }

    Row(modifier = Modifier.fillMaxSize()) {
        // Thread list (compact on phone, side-by-side on tablet)
        LazyColumn(modifier = Modifier.width(220.dp).fillMaxHeight(), contentPadding = PaddingValues(vertical = 4.dp)) {
            item {
                Text("Inbox", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp))
            }
            if (state.threads.isEmpty()) {
                item { Text("No messages yet.", style = MaterialTheme.typography.bodyMedium, color = HDMuted, modifier = Modifier.padding(16.dp)) }
            }
            items(state.threads, key = { it.id }) { thread ->
                val isActive = state.activeThread?.id == thread.id
                Surface(
                    modifier = Modifier.fillMaxWidth().clickable { viewModel.openThread(thread.id) },
                    color = if (isActive) HDGold.copy(alpha = 0.1f) else MaterialTheme.colorScheme.surface
                ) {
                    Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp)) {
                        Text(thread.subject ?: "No subject", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface, maxLines = 1)
                        thread.messages.firstOrNull()?.let {
                            Text(it.body, style = MaterialTheme.typography.labelSmall, color = HDMuted, maxLines = 1)
                        }
                    }
                }
                Divider(color = HDMuted.copy(alpha = 0.15f))
            }
        }

        Divider(modifier = Modifier.fillMaxHeight().width(1.dp), color = HDMuted.copy(alpha = 0.2f))

        // Message view
        Column(modifier = Modifier.weight(1f).fillMaxHeight()) {
            val thread = state.activeThread
            if (thread == null) {
                Box(Modifier.weight(1f), contentAlignment = Alignment.Center) {
                    Text("Select a conversation", color = HDMuted)
                }
            } else {
                LazyColumn(
                    modifier = Modifier.weight(1f),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    reverseLayout = false
                ) {
                    items(thread.messages, key = { it.id }) { msg ->
                        val isMe = msg.senderId == state.currentUserId
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = if (isMe) Arrangement.End else Arrangement.Start
                        ) {
                            if (!isMe) {
                                HDAvatar(initials = msg.sender.fullName.take(1), size = 28.dp)
                                Spacer(Modifier.width(8.dp))
                            }
                            Column(horizontalAlignment = if (isMe) Alignment.End else Alignment.Start) {
                                if (!isMe) Text(msg.sender.fullName, style = MaterialTheme.typography.labelSmall, color = HDMuted)
                                Surface(
                                    shape = MaterialTheme.shapes.medium,
                                    color = if (isMe) HDNavy else MaterialTheme.colorScheme.surfaceVariant
                                ) {
                                    Text(msg.body, modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp), style = MaterialTheme.typography.bodyMedium, color = if (isMe) HDCream else MaterialTheme.colorScheme.onSurface)
                                }
                            }
                        }
                    }
                }

                Divider(color = HDMuted.copy(alpha = 0.2f))
                Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = draft,
                        onValueChange = { draft = it },
                        modifier = Modifier.weight(1f),
                        placeholder = { Text("Message...") },
                        maxLines = 4,
                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = HDGold, unfocusedBorderColor = HDMuted.copy(alpha = 0.3f))
                    )
                    IconButton(
                        onClick = {
                            val body = draft.trim()
                            if (body.isNotEmpty()) {
                                viewModel.sendMessage(body)
                                draft = ""
                            }
                        },
                        enabled = draft.isNotBlank() && !state.isSending
                    ) {
                        Icon(Icons.Default.Send, contentDescription = "Send", tint = if (draft.isNotBlank()) HDGold else HDMuted)
                    }
                }
            }
        }
    }
}
