import Foundation

struct Directory: Decodable, Identifiable {
    let id: String
    let name: String
    let slug: String
    let description: String?
    let isVisible: Bool
    let createdAt: Date
}

struct DirectoryMember: Decodable, Identifiable {
    let id: String
    let directoryId: String
    let userId: String
    let photoUrl: String?
    let city: String?
    let industry: String?
    let employer: String?
    let preferredContact: String?
    let bio: String?
    let joinedAt: Date
    let user: MemberUser
    let organizations: [MemberOrganization]
}

struct MemberUser: Decodable {
    let id: String
    let fullName: String
    let email: String
    let phone: String?
}

struct MemberOrganization: Decodable, Identifiable {
    let id: String
    let organization: Organization
    let verifiedAt: Date?
}

struct Organization: Decodable, Identifiable {
    let id: String
    let name: String
    let type: String?
}

struct PaginatedMembers: Decodable {
    let data: [DirectoryMember]
    let meta: PaginationMeta
}
