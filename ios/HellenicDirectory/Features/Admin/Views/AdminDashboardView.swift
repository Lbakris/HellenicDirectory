import SwiftUI

struct AdminStats: Decodable {
    let users: Int
    let parishes: Int
    let directories: Int
    let businesses: Int
    let messages: Int
}
struct AdminStatsResponse: Decodable { let stats: AdminStats }

@MainActor
class AdminViewModel: ObservableObject {
    @Published var stats: AdminStats?
    @Published var isLoading = false

    func fetchStats() async {
        isLoading = true
        do {
            let r: AdminStatsResponse = try await APIClient.shared.get("/admin/stats")
            stats = r.stats
        } catch {}
        isLoading = false
    }
}

struct AdminDashboardView: View {
    @StateObject private var vm = AdminViewModel()

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                Text("Admin Dashboard").font(.hdTitle).foregroundColor(Color.hdNavy).frame(maxWidth: .infinity, alignment: .leading)
                HDMeanderDivider()

                if let s = vm.stats {
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                        StatCard(label: "Users", value: s.users, icon: "person.2")
                        StatCard(label: "Parishes", value: s.parishes, icon: "building.columns")
                        StatCard(label: "Directories", value: s.directories, icon: "person.3")
                        StatCard(label: "Businesses", value: s.businesses, icon: "briefcase")
                        StatCard(label: "Messages", value: s.messages, icon: "envelope")
                    }
                } else if vm.isLoading {
                    ProgressView().tint(Color.hdGold)
                }

                VStack(spacing: 12) {
                    AdminActionRow(title: "Manage Users", icon: "person.badge.gearshape", destination: AnyView(AdminUsersPlaceholderView()))
                    AdminActionRow(title: "Create Directory", icon: "plus.rectangle.on.folder", destination: AnyView(CreateDirectoryView()))
                    AdminActionRow(title: "Add Business Listing", icon: "plus.circle", destination: AnyView(AddBusinessView()))
                    AdminActionRow(title: "Run Parish Scraper", icon: "arrow.clockwise.icloud", destination: AnyView(ScraperControlView()))
                }
            }
            .padding()
        }
        .background(Color.hdBackground)
        .navigationTitle("Admin")
        .task { await vm.fetchStats() }
    }
}

struct StatCard: View {
    let label: String
    let value: Int
    let icon: String

    var body: some View {
        HDCard {
            VStack(spacing: 8) {
                Image(systemName: icon).font(.title2).foregroundColor(Color.hdGold)
                Text("\(value)").font(.hdTitle2).foregroundColor(Color.hdNavy)
                Text(label).font(.hdCaption).foregroundColor(Color.hdMuted)
            }
            .frame(maxWidth: .infinity)
            .padding()
        }
    }
}

struct AdminActionRow: View {
    let title: String
    let icon: String
    let destination: AnyView

    var body: some View {
        NavigationLink(destination: destination) {
            HStack(spacing: 14) {
                Image(systemName: icon).font(.system(size: 20)).foregroundColor(Color.hdGold).frame(width: 28)
                Text(title).font(.hdSubhead).foregroundColor(Color.hdNavy)
                Spacer()
                Image(systemName: "chevron.right").font(.system(size: 12)).foregroundColor(Color.hdMuted)
            }
            .padding()
            .background(Color.hdCard)
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }
}

struct AdminUsersPlaceholderView: View {
    var body: some View { Text("User management coming soon.").font(.hdSubhead).foregroundColor(Color.hdMuted) }
}
struct CreateDirectoryView: View {
    var body: some View { Text("Create directory coming soon.").font(.hdSubhead).foregroundColor(Color.hdMuted) }
}
struct AddBusinessView: View {
    var body: some View { Text("Add business listing coming soon.").font(.hdSubhead).foregroundColor(Color.hdMuted) }
}
struct ScraperControlView: View {
    var body: some View { Text("Scraper control coming soon.").font(.hdSubhead).foregroundColor(Color.hdMuted) }
}
