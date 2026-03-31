import SwiftUI

struct DirectoryHomeView: View {
    @EnvironmentObject private var vm: DirectoryViewModel

    var body: some View {
        Group {
            if vm.isLoading {
                ProgressView().tint(Color.hdGold)
            } else if vm.directories.isEmpty {
                VStack(spacing: 16) {
                    Image(systemName: "person.3").font(.largeTitle).foregroundColor(Color.hdGold)
                    Text("No directories available").font(.hdHeadline).foregroundColor(Color.hdNavy)
                    Text("You'll appear here once you've been invited to a directory.")
                        .font(.hdSubhead).foregroundColor(Color.hdMuted).multilineTextAlignment(.center)
                }
                .padding()
            } else {
                List(vm.directories) { dir in
                    NavigationLink(destination: MemberListView(directory: dir)) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(dir.name).font(.hdHeadline).foregroundColor(Color.hdNavy)
                            if let desc = dir.description {
                                Text(desc).font(.hdFootnote).foregroundColor(Color.hdMuted).lineLimit(1)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                    .listRowBackground(Color.hdCard)
                }
                .listStyle(.plain)
            }
        }
        .navigationTitle("Directory")
        .task { await vm.fetchDirectories() }
    }
}

struct MemberListView: View {
    let directory: Directory
    @EnvironmentObject private var vm: DirectoryViewModel
    @State private var showInvite = false
    @State private var inviteEmail = ""
    @State private var inviteLoading = false
    @State private var inviteError: String?
    @State private var inviteSent = false

    var body: some View {
        VStack(spacing: 0) {
            HDSearchBar(text: $vm.searchText) {
                Task { await vm.fetchMembers(directoryId: directory.id) }
            }
            .padding()

            if vm.isLoading {
                ProgressView().tint(Color.hdGold).frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List(vm.members) { member in
                    MemberRow(member: member)
                        .listRowBackground(Color.hdCard)
                }
                .listStyle(.plain)
            }
        }
        .navigationTitle(directory.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                HStack(spacing: 16) {
                    NavigationLink(destination: InboxView(directoryId: directory.id)) {
                        Image(systemName: "envelope").foregroundColor(Color.hdGold)
                    }
                    Button(action: { showInvite = true }) {
                        Image(systemName: "person.badge.plus").foregroundColor(Color.hdGold)
                    }
                }
            }
        }
        .sheet(isPresented: $showInvite) {
            InviteSheet(directoryId: directory.id, isPresented: $showInvite)
        }
        .task { await vm.fetchMembers(directoryId: directory.id) }
    }
}

struct MemberRow: View {
    let member: DirectoryMember

    var body: some View {
        HStack(spacing: 12) {
            HDAvatar(
                imageURL: member.photoUrl.flatMap { URL(string: $0) },
                initials: String(member.user.fullName.prefix(1)),
                size: 44
            )
            VStack(alignment: .leading, spacing: 3) {
                Text(member.user.fullName).font(.hdSubhead).foregroundColor(Color.hdNavy)
                if let city = member.city { Text(city).font(.hdCaption).foregroundColor(Color.hdMuted) }
                if let industry = member.industry {
                    Text(industry + (member.employer != nil ? " · \(member.employer!)" : ""))
                        .font(.hdCaption).foregroundColor(Color.hdMuted)
                }
                let verifiedOrgs = member.organizations.filter { $0.verifiedAt != nil }
                if !verifiedOrgs.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 4) {
                            ForEach(verifiedOrgs.prefix(3)) { mo in HDBadge(text: mo.organization.name) }
                        }
                    }
                }
            }
        }
        .padding(.vertical, 6)
    }
}

struct InviteSheet: View {
    let directoryId: String
    @Binding var isPresented: Bool
    @EnvironmentObject private var vm: DirectoryViewModel

    @State private var email = ""
    @State private var isLoading = false
    @State private var errorMsg: String?
    @State private var sent = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Text("Invite a Member").font(.hdTitle2).foregroundColor(Color.hdNavy).padding(.top)
                HDMeanderDivider().padding(.horizontal)

                VStack(alignment: .leading, spacing: 8) {
                    Text("Email Address").font(.hdSubhead).foregroundColor(Color.hdMuted)
                    TextField("email@example.com", text: $email)
                        .keyboardType(.emailAddress).autocapitalization(.none)
                        .padding(12).background(Color.hdCard).clipShape(RoundedRectangle(cornerRadius: 8))
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.hdGold.opacity(0.3)))
                }
                .padding(.horizontal)

                if let err = errorMsg { Text(err).font(.hdFootnote).foregroundColor(.red).padding(.horizontal) }
                if sent {
                    Text("Invitation sent!").font(.hdSubhead).foregroundColor(.green)
                        .onAppear { DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { isPresented = false } }
                }

                HDPrimaryButton(title: "Send Invitation", isLoading: isLoading) {
                    Task { await sendInvite() }
                }
                .padding(.horizontal)
                Spacer()
            }
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { isPresented = false } } }
        }
    }

    private func sendInvite() async {
        errorMsg = nil
        isLoading = true
        do {
            try await vm.sendInvite(directoryId: directoryId, email: email.lowercased().trimmingCharacters(in: .whitespaces))
            sent = true
        } catch let err as APIError {
            errorMsg = err.errorDescription
        } catch { errorMsg = error.localizedDescription }
        isLoading = false
    }
}
