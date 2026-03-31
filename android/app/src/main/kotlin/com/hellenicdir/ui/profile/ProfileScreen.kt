package com.hellenicdir.ui.profile

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
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
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.errorContainer, contentColor = MaterialTheme.colorScheme.onErrorContainer)
        ) {
            Icon(Icons.Default.ExitToApp, contentDescription = null)
            Spacer(Modifier.width(8.dp))
            Text("Sign Out")
        }
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
