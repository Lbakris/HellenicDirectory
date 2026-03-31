import SwiftUI

struct MainTabView: View {
    @EnvironmentObject private var auth: AuthViewModel
    @StateObject private var parishVM = ParishViewModel()
    @StateObject private var businessVM = BusinessViewModel()
    @StateObject private var directoryVM = DirectoryViewModel()

    var body: some View {
        TabView {
            NavigationStack {
                ParishListView()
            }
            .tabItem {
                Label("Parishes", systemImage: "building.columns")
            }

            // Directory tab — only visible if user has directory memberships
            if directoryVM.hasAnyMembership || auth.isAdmin {
                NavigationStack {
                    DirectoryHomeView()
                }
                .tabItem {
                    Label("Directory", systemImage: "person.3")
                }
            }

            NavigationStack {
                BusinessListView()
            }
            .tabItem {
                Label("Businesses", systemImage: "briefcase")
            }

            NavigationStack {
                ProfileView()
            }
            .tabItem {
                Label("Profile", systemImage: "person.circle")
            }

            if auth.isAdmin {
                NavigationStack {
                    AdminDashboardView()
                }
                .tabItem {
                    Label("Admin", systemImage: "gearshape.2")
                }
            }
        }
        .tint(Color.hdGold)
        .environmentObject(parishVM)
        .environmentObject(businessVM)
        .environmentObject(directoryVM)
        .task { await directoryVM.fetchMemberships() }
    }
}
