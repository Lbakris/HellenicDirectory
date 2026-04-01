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
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.withStyle
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

/**
 * Registration screen.
 *
 * Three consent checkboxes are required before the user can submit the form.
 * This satisfies CCPA/CPRA, 16 US state privacy laws, PIPEDA, and Quebec Law 25
 * for capturing explicit, affirmative opt-in consent to process sensitive personal
 * data (Greek Orthodox community affiliation).
 */
@Composable
fun RegisterScreen(onRegistered: () -> Unit, viewModel: AuthViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsState()
    val uriHandler = LocalUriHandler.current

    var fullName by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }

    // Consent state — all three must be checked before submission is allowed
    var consentPrivacyPolicy by remember { mutableStateOf(false) }
    var consentTerms by remember { mutableStateOf(false) }
    var consentSensitiveData by remember { mutableStateOf(false) }

    val allConsented = consentPrivacyPolicy && consentTerms && consentSensitiveData

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

            Spacer(Modifier.height(4.dp))
            Text(
                "Privacy & Terms",
                style = MaterialTheme.typography.labelLarge,
                color = HDCream.copy(alpha = 0.7f)
            )

            // Privacy Policy consent
            ConsentRow(
                checked = consentPrivacyPolicy,
                onCheckedChange = { consentPrivacyPolicy = it },
                label = buildAnnotatedString {
                    append("I have read and agree to the ")
                    withStyle(SpanStyle(color = HDGold, textDecoration = TextDecoration.Underline)) {
                        append("Privacy Policy")
                    }
                },
                onLinkClick = { uriHandler.openUri("https://hellenicdir.com/privacy") }
            )

            // Terms of Service consent
            ConsentRow(
                checked = consentTerms,
                onCheckedChange = { consentTerms = it },
                label = buildAnnotatedString {
                    append("I agree to the ")
                    withStyle(SpanStyle(color = HDGold, textDecoration = TextDecoration.Underline)) {
                        append("Terms of Service")
                    }
                },
                onLinkClick = { uriHandler.openUri("https://hellenicdir.com/terms") }
            )

            // Sensitive data consent (CCPA/PIPEDA — religious affiliation is sensitive personal data)
            ConsentRow(
                checked = consentSensitiveData,
                onCheckedChange = { consentSensitiveData = it },
                label = buildAnnotatedString {
                    append("I consent to processing of sensitive personal data related to Greek Orthodox community affiliation as described in the ")
                    withStyle(SpanStyle(color = HDGold, textDecoration = TextDecoration.Underline)) {
                        append("Privacy Policy")
                    }
                },
                onLinkClick = { uriHandler.openUri("https://hellenicdir.com/privacy#sensitive-data") }
            )

            state.error?.let { Text(it, color = MaterialTheme.colorScheme.error) }

            HDPrimaryButton(
                text = "Create Account",
                onClick = {
                    viewModel.register(fullName, email, password, phone.ifBlank { null }, onRegistered)
                },
                isLoading = state.isLoading,
                enabled = allConsented
            )

            Spacer(Modifier.height(24.dp))
        }
    }
}

/**
 * A single consent row with a checkbox and tappable annotated text label.
 */
@Composable
private fun ConsentRow(
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    label: androidx.compose.ui.text.AnnotatedString,
    onLinkClick: () -> Unit,
) {
    Row(
        verticalAlignment = Alignment.Top,
        modifier = Modifier.fillMaxWidth()
    ) {
        Checkbox(
            checked = checked,
            onCheckedChange = onCheckedChange,
            colors = CheckboxDefaults.colors(
                checkedColor = HDGold,
                uncheckedColor = HDMuted.copy(alpha = 0.5f),
                checkmarkColor = HDNavy
            )
        )
        Spacer(Modifier.width(8.dp))
        TextButton(
            onClick = onLinkClick,
            contentPadding = PaddingValues(0.dp)
        ) {
            Text(label, style = MaterialTheme.typography.bodySmall, color = HDCream.copy(alpha = 0.85f))
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
