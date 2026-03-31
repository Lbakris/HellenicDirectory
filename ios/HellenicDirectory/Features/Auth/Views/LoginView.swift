import SwiftUI

struct LoginView: View {
    @EnvironmentObject private var auth: AuthViewModel
    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showRegister = false

    var body: some View {
        NavigationStack {
            ZStack {
                Color.hdNavy.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 32) {
                        // Logo
                        VStack(spacing: 8) {
                            Text("Hellenic Directory")
                                .font(.hdLargeTitle)
                                .foregroundColor(Color.hdGold)
                            Text("of America")
                                .font(.hdSubhead)
                                .foregroundColor(Color.hdCream.opacity(0.6))
                        }
                        .padding(.top, 60)

                        HDMeanderDivider()
                            .padding(.horizontal)

                        // Form
                        VStack(spacing: 16) {
                            HDTextField(label: "Email", text: $email, keyboardType: .emailAddress, textContentType: .emailAddress)
                            HDTextField(label: "Password", text: $password, isSecure: true, textContentType: .password)

                            if let err = errorMessage {
                                Text(err).font(.hdFootnote).foregroundColor(.red).frame(maxWidth: .infinity, alignment: .leading)
                            }

                            HDPrimaryButton(title: "Sign In", isLoading: isLoading) {
                                Task { await performLogin() }
                            }
                        }
                        .padding(.horizontal, 32)

                        Button("Don't have an account? Register") {
                            showRegister = true
                        }
                        .font(.hdFootnote)
                        .foregroundColor(Color.hdGold.opacity(0.8))
                    }
                }
            }
            .navigationDestination(isPresented: $showRegister) { RegisterView() }
        }
    }

    private func performLogin() async {
        errorMessage = nil
        isLoading = true
        do {
            try await auth.login(email: email.lowercased().trimmingCharacters(in: .whitespaces), password: password)
        } catch let err as APIError {
            errorMessage = err.errorDescription
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

struct HDTextField: View {
    let label: String
    @Binding var text: String
    var keyboardType: UIKeyboardType = .default
    var textContentType: UITextContentType? = nil
    var isSecure: Bool = false

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.hdCaption)
                .foregroundColor(Color.hdCream.opacity(0.6))
            Group {
                if isSecure {
                    SecureField("", text: $text)
                } else {
                    TextField("", text: $text)
                        .keyboardType(keyboardType)
                        .textContentType(textContentType)
                        .autocapitalization(.none)
                }
            }
            .font(.hdBody)
            .foregroundColor(Color.hdCream)
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(Color.hdNavy.opacity(0.6))
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.hdGold.opacity(0.3), lineWidth: 1))
        }
    }
}
