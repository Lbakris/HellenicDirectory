import Foundation
import Combine

@MainActor
class ParishViewModel: ObservableObject {
    @Published var parishes: [Parish] = []
    @Published var isLoading = false
    @Published var error: String?
    @Published var searchText = ""
    @Published var stateFilter = ""
    @Published var currentPage = 1
    @Published var totalPages = 1
    @Published var selectedParish: Parish?

    private var searchTask: Task<Void, Never>?

    func search() async {
        searchTask?.cancel()
        searchTask = Task {
            isLoading = true
            error = nil
            do {
                var components = URLComponents()
                components.queryItems = [
                    searchText.isEmpty ? nil : URLQueryItem(name: "search", value: searchText),
                    stateFilter.isEmpty ? nil : URLQueryItem(name: "state", value: stateFilter),
                    URLQueryItem(name: "page", value: "\(currentPage)"),
                ].compactMap { $0 }
                let query = components.query.map { "?\($0)" } ?? ""
                let result: PaginatedParishes = try await APIClient.shared.get("/parishes\(query)")
                if !Task.isCancelled {
                    parishes = result.data
                    totalPages = result.meta.pages
                }
            } catch {
                if !Task.isCancelled {
                    self.error = error.localizedDescription
                }
            }
            if !Task.isCancelled { isLoading = false }
        }
        await searchTask?.value
    }

    func loadParish(id: String) async {
        do {
            let parish: Parish = try await APIClient.shared.get("/parishes/\(id)")
            selectedParish = parish
        } catch {
            self.error = error.localizedDescription
        }
    }

    func nextPage() async {
        guard currentPage < totalPages else { return }
        currentPage += 1
        await search()
    }

    func previousPage() async {
        guard currentPage > 1 else { return }
        currentPage -= 1
        await search()
    }
}
