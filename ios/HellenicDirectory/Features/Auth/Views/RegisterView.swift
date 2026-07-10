import SwiftUI

struct RegisterView: View {
    @EnvironmentObject private var auth: AuthViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var fullName = ""
    @State private var email = ""
    @State private var password = ""
    @State private var phone = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var registered = false

    // Consent — all three must be affirmed before the account can be created.
    @State private var consentPrivacy = false
    @State private var consentTerms = false
    @State private var consentSensitive = false

    private var allConsented: Bool { consentPrivacy && consentTerms && consentSensitive }

    var body: some View {
        ZStack {
            Color.hdNavy.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 24) {
                    VStack(spacing: 8) {
                        Text("Create Account")
                            .font(.hdTitle)
                            .foregroundColor(Color.hdGold)
                        HDMeanderDivider()
                    }
                    .padding(.top, 32)
                    .padding(.horizontal)

                    VStack(spacing: 16) {
                        HDTextField(label: "Full Name", text: $fullName, textContentType: .name)
                        HDTextField(label: "Email", text: $email, keyboardType: .emailAddress, textContentType: .emailAddress)
                        HDTextField(label: "Password", text: $password, isSecure: true, textContentType: .newPassword)
                        HDTextField(label: "Phone (optional)", text: $phone, keyboardType: .phonePad, textContentType: .telephoneNumber)

                        // Consent toggles — required for CCPA/PIPEDA sensitive-data opt-in.
                        VStack(spacing: 12) {
                            Toggle(isOn: $consentPrivacy) {
                                Text("I have read and agree to the Privacy Policy")
                                    .font(.hdFootnote).foregroundColor(Color.hdCream)
                            }
                            Toggle(isOn: $consentTerms) {
                                Text("I agree to the Terms of Service")
                                    .font(.hdFootnote).foregroundColor(Color.hdCream)
                            }
                            Toggle(isOn: $consentSensitive) {
                                Text("I consent to the processing of sensitive personal data relating to Greek Orthodox community affiliation")
                                    .font(.hdFootnote).foregroundColor(Color.hdCream)
                            }
                        }
                        .tint(Color.hdGold)
                        .padding(.top, 4)

                        if let err = errorMessage {
                            Text(err).font(.hdFootnote).foregroundColor(.red).frame(maxWidth: .infinity, alignment: .leading)
                        }

                        if registered {
                            Text("Account created! Please sign in.")
                                .font(.hdSubhead)
                                .foregroundColor(.green)
                        }

                        HDPrimaryButton(title: "Create Account", isLoading: isLoading) {
                            Task { await performRegister() }
                        }
                        .disabled(!allConsented)
                        .opacity(allConsented ? 1 : 0.5)
                    }
                    .padding(.horizontal, 32)
                }
            }
        }
        .navigationTitle("Create Account")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func performRegister() async {
        // Defence in depth: never call register without affirmative consent, even
        // though the button is already disabled until all three toggles are on.
        guard allConsented else {
            errorMessage = "You must accept the Privacy Policy, Terms, and sensitive-data processing to create an account."
            return
        }
        errorMessage = nil
        isLoading = true
        do {
            try await auth.register(
                fullName: fullName.trimmingCharacters(in: .whitespaces),
                email: email.lowercased().trimmingCharacters(in: .whitespaces),
                password: password,
                phone: phone.isEmpty ? nil : phone,
                consentPrivacyPolicy: consentPrivacy,
                consentTerms: consentTerms,
                consentSensitiveData: consentSensitive
            )
            registered = true
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { dismiss() }
        } catch let err as APIError {
            errorMessage = err.errorDescription
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}
