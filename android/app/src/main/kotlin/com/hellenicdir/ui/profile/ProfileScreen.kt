package com.hellenicdir.ui.profile

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DeleteForever
import androidx.compose.material.icons.filled.ExitToApp
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.hellenicdir.ui.auth.AuthViewModel
import com.hellenicdir.ui.designsystem.*

@Composable
fun ProfileScreen(onLogout: () -> Unit, authViewModel: AuthViewModel = hiltViewModel()) {
    val state by authViewModel.uiState.collectAsState()
    val user = state.user
    var showLogoutDialog by remember { mutableStateOf(false) }
    var showDeleteDialog by remember { mutableStateOf(false) }
    var showDeleteConfirmDialog by remember { mutableStateOf(false) }
    var deleteError by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp)
    ) {
        HDSectionHeader("Profile")

        // Avatar + name
        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
            HDAvatar(
                imageUrl = user?.avatarUrl,
                initials = user?.fullName?.take(1) ?: "?",
                size = 80.dp
            )
            Spacer(Modifier.height(12.dp))
            Text(user?.fullName ?: "", style = MaterialTheme.typography.headlineSmall, color = MaterialTheme.colorScheme.primary)
            Text(user?.email ?: "", style = MaterialTheme.typography.bodyMedium, color = HDMuted)
            if (user?.appRole != null && user.appRole != "REGISTERED") {
                Spacer(Modifier.height(6.dp))
                HDBadge(user.appRole.lowercase().replaceFirstChar { it.uppercase() })
            }
        }

        HDMeanderDivider()

        // Info card
        HDCard(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                ProfileInfoRow("Email", user?.email ?: "—")
                Divider(color = HDMuted.copy(alpha = 0.2f))
                ProfileInfoRow("Phone", user?.phone ?: "—")
            }
        }

        Spacer(Modifier.weight(1f))

        // Logout
        Button(
            onClick = { showLogoutDialog = true },
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(
                containerColor = MaterialTheme.colorScheme.errorContainer,
                contentColor = MaterialTheme.colorScheme.onErrorContainer
            )
        ) {
            Icon(Icons.Default.ExitToApp, contentDescription = null)
            Spacer(Modifier.width(8.dp))
            Text("Sign Out")
        }

        // Delete account — required by Google Play policy (June 2022)
        OutlinedButton(
            onClick = { showDeleteDialog = true },
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error)
        ) {
            Icon(Icons.Default.DeleteForever, contentDescription = null)
            Spacer(Modifier.width(8.dp))
            Text("Delete Account")
        }

        deleteError?.let {
            Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
        }
    }

    // Step 1 — inform about consequences
    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text("Delete Account") },
            text = {
                Text(
                    "Deleting your account will permanently remove all your data, including " +
                    "directory memberships and messages. Your account will be deactivated immediately " +
                    "and permanently deleted after a 30-day grace period.\n\n" +
                    "This action cannot be undone. Do you want to continue?"
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    showDeleteDialog = false
                    showDeleteConfirmDialog = true
                }) {
                    Text("Continue", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = false }) { Text("Cancel") }
            }
        )
    }

    // Step 2 — final confirmation
    if (showDeleteConfirmDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteConfirmDialog = false },
            title = { Text("Confirm Account Deletion") },
            text = { Text("Are you absolutely sure? This is your final confirmation.") },
            confirmButton = {
                TextButton(
                    onClick = {
                        showDeleteConfirmDialog = false
                        authViewModel.deleteAccount(
                            onComplete = onLogout,
                            onError = { msg -> deleteError = msg }
                        )
                    }
                ) {
                    Text("Delete My Account", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteConfirmDialog = false }) { Text("Cancel") }
            }
        )
    }

    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            title = { Text("Sign Out") },
            text = { Text("Are you sure you want to sign out of Hellenic Directory?") },
            confirmButton = {
                TextButton(onClick = { authViewModel.logout(onLogout) }) {
                    Text("Sign Out", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = { TextButton(onClick = { showLogoutDialog = false }) { Text("Cancel") } }
        )
    }
}

@Composable
fun ProfileInfoRow(label: String, value: String) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = HDMuted)
        Text(value, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
    }
}
