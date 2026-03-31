import Foundation

struct BusinessListing: Decodable, Identifiable {
    let id: String
    let businessName: String
    let contactName: String
    let phone: String
    let email: String
    let city: String
    let state: String?
    let website: String?
    let description: String?
    let logoUrl: String?
    let keywords: [String]

    var locationString: String { [city, state].compactMap { $0 }.joined(separator: ", ") }
}

struct PaginatedBusinesses: Decodable {
    let data: [BusinessListing]
    let meta: PaginationMeta
}

@MainActor
class BusinessViewModel: ObservableObject {
    @Published var businesses: [BusinessListing] = []
    @Published var isLoading = false
    @Published var error: String?
    @Published var searchText = ""
    @Published var cityFilter = ""
    @Published var keywordFilter = ""
    @Published var currentPage = 1
    @Published var totalPages = 1

    func search() async {
        isLoading = true
        error = nil
        do {
            var items: [URLQueryItem] = [URLQueryItem(name: "page", value: "\(currentPage)")]
            if !searchText.isEmpty { items.append(.init(name: "search", value: searchText)) }
            if !cityFilter.isEmpty { items.append(.init(name: "city", value: cityFilter)) }
            if !keywordFilter.isEmpty { items.append(.init(name: "keyword", value: keywordFilter)) }
            var comps = URLComponents(); comps.queryItems = items
            let q = comps.query.map { "?\($0)" } ?? ""
            let result: PaginatedBusinesses = try await APIClient.shared.get("/businesses\(q)")
            businesses = result.data
            totalPages = result.meta.pages
        } catch { self.error = error.localizedDescription }
        isLoading = false
    }
}
