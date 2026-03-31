import Foundation

struct DirectoriesResponse: Decodable { let data: [Directory] }
struct DirectoryDetailResponse: Decodable { let directory: Directory }

@MainActor
class DirectoryViewModel: ObservableObject {
    @Published var directories: [Directory] = []
    @Published var members: [DirectoryMember] = []
    @Published var isLoading = false
    @Published var error: String?
    @Published var searchText = ""
    @Published var hasAnyMembership = false

    func fetchMemberships() async {
        // We try loading the user's known directories — if any return, they have memberships
        // In a fuller implementation, a /users/me/directories endpoint would be ideal
        // For now, hasAnyMembership is set when directories are fetched successfully
        await fetchDirectories()
    }

    func fetchDirectories() async {
        isLoading = true
        do {
            let result: DirectoriesResponse = try await APIClient.shared.get("/admin/directories")
            directories = result.data
            hasAnyMembership = !result.data.isEmpty
        } catch {
            // Non-admin users get 403 — that's expected; they access via direct links/invites
            hasAnyMembership = false
        }
        isLoading = false
    }

    func fetchMembers(directoryId: String) async {
        isLoading = true
        error = nil
        do {
            var items: [URLQueryItem] = [URLQueryItem(name: "limit", value: "100")]
            if !searchText.isEmpty { items.append(.init(name: "search", value: searchText)) }
            var comps = URLComponents(); comps.queryItems = items
            let q = comps.query.map { "?\($0)" } ?? ""
            let result: PaginatedMembers = try await APIClient.shared.get("/directories/\(directoryId)/members\(q)")
            members = result.data
        } catch { self.error = error.localizedDescription }
        isLoading = false
    }

    func sendInvite(directoryId: String, email: String) async throws {
        struct InviteBody: Encodable { let email: String }
        struct InviteResponse: Decodable { let invitation: InviteResult }
        struct InviteResult: Decodable { let id: String; let status: String }
        let _: InviteResponse = try await APIClient.shared.post("/directories/\(directoryId)/invite", body: InviteBody(email: email))
    }
}
