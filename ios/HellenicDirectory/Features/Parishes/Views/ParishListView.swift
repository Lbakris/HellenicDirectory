import SwiftUI

struct ParishListView: View {
    @EnvironmentObject private var vm: ParishViewModel
    @State private var showMap = false

    var body: some View {
        VStack(spacing: 0) {
            // Search bar
            VStack(spacing: 8) {
                HDSearchBar(text: $vm.searchText) {
                    Task { vm.currentPage = 1; await vm.search() }
                }
                HStack {
                    TextField("State (e.g. NY)", text: $vm.stateFilter)
                        .font(.hdSubhead)
                        .textCase(.uppercase)
                        .frame(width: 120)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Color.hdCard)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.hdGold.opacity(0.2)))
                    Spacer()
                    Button(showMap ? "List" : "Map") { showMap.toggle() }
                        .font(.hdSubhead)
                        .foregroundColor(Color.hdGold)
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 12)
            .background(Color.hdBackground)

            if vm.isLoading {
                ProgressView().tint(Color.hdGold).frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let err = vm.error {
                ErrorView(message: err) { Task { await vm.search() } }
            } else {
                List(vm.parishes) { parish in
                    NavigationLink(destination: ParishDetailView(parishId: parish.id)) {
                        ParishRow(parish: parish)
                    }
                    .listRowBackground(Color.hdCard)
                }
                .listStyle(.plain)
                .background(Color.hdBackground)

                // Pagination
                if vm.totalPages > 1 {
                    HStack(spacing: 16) {
                        Button("← Previous") { Task { await vm.previousPage() } }
                            .disabled(vm.currentPage == 1)
                        Text("Page \(vm.currentPage) of \(vm.totalPages)")
                            .font(.hdFootnote)
                        Button("Next →") { Task { await vm.nextPage() } }
                            .disabled(vm.currentPage == vm.totalPages)
                    }
                    .font(.hdSubhead)
                    .foregroundColor(Color.hdGold)
                    .padding()
                }
            }
        }
        .navigationTitle("Parish Directory")
        .navigationBarTitleDisplayMode(.large)
        .task { if vm.parishes.isEmpty { await vm.search() } }
    }
}

struct ParishRow: View {
    let parish: Parish

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(parish.name)
                .font(.hdHeadline)
                .foregroundColor(Color.hdNavy)
            if !parish.locationString.isEmpty {
                Text(parish.locationString)
                    .font(.hdFootnote)
                    .foregroundColor(Color.hdMuted)
            }
            if let phone = parish.phone {
                Text(phone)
                    .font(.hdCaption)
                    .foregroundColor(Color.hdMuted)
            }
        }
        .padding(.vertical, 4)
    }
}

struct ErrorView: View {
    let message: String
    let retry: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle")
                .font(.largeTitle)
                .foregroundColor(Color.hdGold)
            Text(message).font(.hdSubhead).multilineTextAlignment(.center)
            Button("Try Again", action: retry)
                .font(.hdSubhead)
                .foregroundColor(Color.hdGold)
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct SplashView: View {
    var body: some View {
        ZStack {
            Color.hdNavy.ignoresSafeArea()
            VStack(spacing: 16) {
                Text("Hellenic Directory")
                    .font(.hdLargeTitle)
                    .foregroundColor(Color.hdGold)
                Text("of America")
                    .font(.hdSubhead)
                    .foregroundColor(Color.hdCream.opacity(0.6))
                HDMeanderDivider().padding(.horizontal, 40)
                ProgressView().tint(Color.hdGold).padding(.top, 8)
            }
        }
    }
}
