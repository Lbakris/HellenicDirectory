import SwiftUI

struct ProfileView: View {
    @EnvironmentObject private var auth: AuthViewModel
    @State private var showLogoutConfirm = false
    @State private var showDeleteConfirm = false
    @State private var deleteError: String?

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Avatar + name
                VStack(spacing: 12) {
                    HDAvatar(
                        imageURL: auth.currentUser?.avatarUrl.flatMap { URL(string: $0) },
                        initials: String(auth.currentUser?.fullName.prefix(1) ?? "?"),
                        size: 80
                    )
                    Text(auth.currentUser?.fullName ?? "")
                        .font(.hdTitle2).foregroundColor(Color.hdNavy)
                    Text(auth.currentUser?.email ?? "")
                        .font(.hdSubhead).foregroundColor(Color.hdMuted)
                    if let role = auth.currentUser?.appRole, role != "REGISTERED" {
                        HDBadge(text: role.capitalized)
                    }
                }
                .padding(.top, 20)

                HDMeanderDivider().padding(.horizontal)

                // Account info
                HDCard {
                    VStack(spacing: 0) {
                        ProfileRow(label: "Email", value: auth.currentUser?.email ?? "")
                        Divider().padding(.horizontal)
                        ProfileRow(label: "Phone", value: auth.currentUser?.phone ?? "—")
                    }
                    .padding()
                }
                .padding(.horizontal)

                // Actions
                VStack(spacing: 12) {
                    Button(action: { showLogoutConfirm = true }) {
                        Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                            .font(.hdSubhead)
                            .foregroundColor(.red)
                            .frame(maxWidth: .infinity)
                            .padding(14)
                            .background(Color.hdCard)
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                    }

                    // Account deletion — required by Apple App Store Guideline 5.1.1(v)
                    // and Google Play policies (both mandated June 2022+).
                    Button(action: { showDeleteConfirm = true }) {
                        Label("Delete Account", systemImage: "trash")
                            .font(.hdSubhead)
                            .foregroundColor(.red.opacity(0.7))
                            .frame(maxWidth: .infinity)
                            .padding(14)
                            .background(Color.hdCard)
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                    }
                }
                .padding(.horizontal)

                if let err = deleteError {
                    Text(err)
                        .font(.hdCaption)
                        .foregroundColor(.red)
                        .padding(.horizontal)
                }

                // Privacy links — direct users to their data rights per CCPA/PIPEDA.
                VStack(spacing: 4) {
                    Text("Your data rights")
                        .font(.hdCaption)
                        .foregroundColor(Color.hdMuted)
                    if let url = URL(string: "https://hellenicdir.com/privacy") {
                        Link("Privacy Policy", destination: url)
                            .font(.hdCaption)
                            .foregroundColor(Color.hdGold)
                    }
                }
                .padding(.bottom, 40)
            }
        }
        .background(Color.hdBackground)
        .navigationTitle("Profile")
        // Sign Out confirmation
        .confirmationDialog(
            "Sign out of Hellenic Directory?",
            isPresented: $showLogoutConfirm,
            titleVisibility: .visible
        ) {
            Button("Sign Out", role: .destructive) { Task { await auth.logout() } }
            Button("Cancel", role: .cancel) {}
        }
        // Delete Account confirmation — requires two-step to prevent accidental deletion.
        .confirmationDialog(
            "Delete your account?",
            isPresented: $showDeleteConfirm,
            titleVisibility: .visible
        ) {
            Button("Delete Account", role: .destructive) {
                Task {
                    do {
                        try await auth.deleteAccount()
                    } catch {
                        deleteError = "Could not delete account. Please try again or contact support."
                    }
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This will permanently delete your account and all personal data after a 30-day grace period. This action cannot be undone.")
        }
    }
}

// MARK: - ProfileRow

struct ProfileRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label).font(.hdSubhead).foregroundColor(Color.hdMuted)
            Spacer()
            Text(value).font(.hdSubhead).foregroundColor(Color.hdNavy)
        }
    }
}
