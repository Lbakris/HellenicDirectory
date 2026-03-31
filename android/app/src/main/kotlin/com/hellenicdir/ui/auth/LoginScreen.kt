package com.hellenicdir.ui.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.hellenicdir.ui.designsystem.*

@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    onNavigateToRegister: () -> Unit,
    viewModel: AuthViewModel = hiltViewModel()
) {
    val state by viewModel.uiState.collectAsState()
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }

    Box(
        modifier = Modifier.fillMaxSize().background(HDNavy),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(32.dp)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            Spacer(Modifier.height(40.dp))

            Text(
                "Hellenic Directory",
                style = MaterialTheme.typography.headlineLarge,
                color = HDGold,
                textAlign = TextAlign.Center
            )
            Text(
                "of America",
                style = MaterialTheme.typography.bodyMedium,
                color = HDCream.copy(alpha = 0.6f)
            )
            HDMeanderDivider(Modifier.padding(vertical = 8.dp))

            HDOutlinedField(value = email, onValueChange = { email = it }, label = "Email", keyboardType = KeyboardType.Email)
            HDOutlinedField(value = password, onValueChange = { password = it }, label = "Password", isPassword = true)

            state.error?.let {
                Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium)
            }

            HDPrimaryButton(
                text = "Sign In",
                onClick = { viewModel.login(email, password, onLoginSuccess) },
                isLoading = state.isLoading
            )

            TextButton(onClick = onNavigateToRegister) {
                Text("Don't have an account? Register", color = HDGold.copy(alpha = 0.8f))
            }
        }
    }
}

@Composable
fun RegisterScreen(onRegistered: () -> Unit, viewModel: AuthViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsState()
    var fullName by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }

    Box(modifier = Modifier.fillMaxSize().background(HDNavy)) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(32.dp).verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Spacer(Modifier.height(40.dp))
            Text("Create Account", style = MaterialTheme.typography.headlineMedium, color = HDGold)
            HDMeanderDivider()

            HDOutlinedField(value = fullName, onValueChange = { fullName = it }, label = "Full Name")
            HDOutlinedField(value = email, onValueChange = { email = it }, label = "Email", keyboardType = KeyboardType.Email)
            HDOutlinedField(value = password, onValueChange = { password = it }, label = "Password", isPassword = true)
            HDOutlinedField(value = phone, onValueChange = { phone = it }, label = "Phone (optional)", keyboardType = KeyboardType.Phone)

            state.error?.let { Text(it, color = MaterialTheme.colorScheme.error) }

            HDPrimaryButton(
                text = "Create Account",
                onClick = {
                    viewModel.register(fullName, email, password, phone.ifBlank { null }, onRegistered)
                },
                isLoading = state.isLoading
            )
        }
    }
}

@Composable
fun HDOutlinedField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    keyboardType: KeyboardType = KeyboardType.Text,
    isPassword: Boolean = false
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label, color = HDCream.copy(alpha = 0.6f)) },
        modifier = Modifier.fillMaxWidth(),
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
        visualTransformation = if (isPassword) PasswordVisualTransformation() else androidx.compose.ui.text.input.VisualTransformation.None,
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = HDGold,
            unfocusedBorderColor = HDMuted.copy(alpha = 0.4f),
            focusedTextColor = HDCream,
            unfocusedTextColor = HDCream,
            cursorColor = HDGold
        )
    )
}
