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
                    }
                    .padding(.horizontal, 32)
                }
            }
        }
        .navigationTitle("Create Account")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func performRegister() async {
        errorMessage = nil
        isLoading = true
        do {
            try await auth.register(
                fullName: fullName.trimmingCharacters(in: .whitespaces),
                email: email.lowercased().trimmingCharacters(in: .whitespaces),
                password: password,
                phone: phone.isEmpty ? nil : phone
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
