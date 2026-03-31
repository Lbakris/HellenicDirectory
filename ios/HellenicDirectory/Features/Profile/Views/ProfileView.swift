import SwiftUI

struct ProfileView: View {
    @EnvironmentObject private var auth: AuthViewModel
    @State private var showLogoutConfirm = false

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
                    Text(auth.currentUser?.fullName ?? "").font(.hdTitle2).foregroundColor(Color.hdNavy)
                    Text(auth.currentUser?.email ?? "").font(.hdSubhead).foregroundColor(Color.hdMuted)
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
                }
                .padding(.horizontal)

                Spacer(minLength: 40)
            }
        }
        .background(Color.hdBackground)
        .navigationTitle("Profile")
        .confirmationDialog("Sign out of Hellenic Directory?", isPresented: $showLogoutConfirm, titleVisibility: .visible) {
            Button("Sign Out", role: .destructive) { Task { await auth.logout() } }
            Button("Cancel", role: .cancel) {}
        }
    }
}

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
