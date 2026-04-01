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

    private var searchTask: Task<Void, Never>?

    // MARK: - List search

    /// Searches parishes with the current filter state, cancelling any in-flight search.
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

    // MARK: - Detail fetch

    /// Fetches a single parish by ID and returns it directly.
    ///
    /// Returning the parish as a value (rather than storing it in a shared
    /// `selectedParish` property) eliminates the data race that occurs when
    /// multiple `ParishDetailView` instances share the same ViewModel and
    /// write to the same published property concurrently.
    ///
    /// - Parameter id: The parish's UUID string.
    /// - Returns: The fetched `Parish`, or `nil` on failure.
    func loadParish(id: String) async -> Parish? {
        do {
            return try await APIClient.shared.get("/parishes/\(id)")
        } catch {
            self.error = error.localizedDescription
            return nil
        }
    }

    // MARK: - Pagination helpers

    /// Advances to the next page and re-runs the search.
    func nextPage() async {
        guard currentPage < totalPages else { return }
        currentPage += 1
        await search()
    }

    /// Retreats to the previous page and re-runs the search.
    func previousPage() async {
        guard currentPage > 1 else { return }
        currentPage -= 1
        await search()
    }
}
