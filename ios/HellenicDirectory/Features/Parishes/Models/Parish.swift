import Foundation

struct Parish: Decodable, Identifiable {
    let id: String
    let goarchId: String
    let name: String
    let address: String?
    let city: String?
    let state: String?
    let zip: String?
    let country: String
    let phone: String?
    let email: String?
    let website: String?
    let latitude: Double?
    let longitude: Double?
    let metropolis: Metropolis?
    let clergy: [Clergy]?

    var locationString: String {
        [city, state].compactMap { $0 }.joined(separator: ", ")
    }
}

struct Metropolis: Decodable {
    let id: String
    let name: String
    let bishopName: String?
}

struct Clergy: Decodable, Identifiable {
    let id: String
    let title: String?
    let fullName: String
    let email: String?
    let phone: String?

    var displayName: String {
        [title, fullName].compactMap { $0 }.joined(separator: " ")
    }
}

struct PaginatedParishes: Decodable {
    let data: [Parish]
    let meta: PaginationMeta
}

struct PaginationMeta: Decodable {
    let total: Int
    let page: Int
    let limit: Int
    let pages: Int
}
