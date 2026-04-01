import SwiftUI
import MapKit

struct ParishDetailView: View {
    let parishId: String
    @EnvironmentObject private var vm: ParishViewModel

    @State private var parish: Parish?
    @State private var isLoading = true
    /// Mutable region state allows the user to pan and zoom the map freely.
    @State private var mapRegion = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 39.5, longitude: -98.35), // US center
        span: MKCoordinateSpan(latitudeDelta: 20, longitudeDelta: 20)
    )

    var body: some View {
        Group {
            if isLoading {
                ProgressView().tint(Color.hdGold)
            } else if let p = parish {
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        // Header
                        VStack(alignment: .leading, spacing: 4) {
                            Text(p.name)
                                .font(.hdTitle)
                                .foregroundColor(Color.hdNavy)
                            if let metro = p.metropolis {
                                Text(metro.name)
                                    .font(.hdSubhead)
                                    .foregroundColor(Color.hdMuted)
                            }
                        }

                        HDMeanderDivider()

                        // Interactive map — uses @State region so the user can pan/zoom.
                        if let lat = p.latitude, let lng = p.longitude {
                            Map(coordinateRegion: $mapRegion,
                                annotationItems: [p]) { _ in
                                MapMarker(
                                    coordinate: CLLocationCoordinate2D(latitude: lat, longitude: lng),
                                    tint: .yellow
                                )
                            }
                            .frame(height: 180)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                            .onAppear {
                                mapRegion = MKCoordinateRegion(
                                    center: CLLocationCoordinate2D(latitude: lat, longitude: lng),
                                    span: MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
                                )
                            }
                        }

                        // Contact info
                        HDCard {
                            VStack(alignment: .leading, spacing: 12) {
                                Text("Contact")
                                    .font(.hdTitle3)
                                    .foregroundColor(Color.hdNavy)
                                    .padding(.bottom, 4)
                                if let addr = p.address {
                                    ContactRow(icon: "mappin", text: addr)
                                }
                                // Use nil-coalescing to avoid force-unwraps on optional fields.
                                if let city = p.city {
                                    let state = p.state ?? ""
                                    let zip = p.zip ?? ""
                                    let location = [city, state, zip]
                                        .filter { !$0.isEmpty }
                                        .joined(separator: " ")
                                    ContactRow(icon: "location", text: location)
                                }
                                if let ph = p.phone {
                                    Button(action: { openPhone(ph) }) {
                                        ContactRow(icon: "phone", text: ph, isAction: true)
                                    }
                                }
                                if let em = p.email {
                                    Button(action: { openEmail(em) }) {
                                        ContactRow(icon: "envelope", text: em, isAction: true)
                                    }
                                }
                                if let web = p.website, let url = URL(string: web) {
                                    Link(destination: url) {
                                        ContactRow(icon: "globe", text: "Visit Website", isAction: true)
                                    }
                                }
                            }
                            .padding()
                        }

                        // Clergy
                        if let clergy = p.clergy, !clergy.isEmpty {
                            HDCard {
                                VStack(alignment: .leading, spacing: 12) {
                                    Text("Clergy")
                                        .font(.hdTitle3)
                                        .foregroundColor(Color.hdNavy)
                                        .padding(.bottom, 4)
                                    ForEach(clergy) { c in
                                        HStack(spacing: 12) {
                                            HDAvatar(initials: String(c.fullName.prefix(1)), size: 36)
                                            VStack(alignment: .leading, spacing: 2) {
                                                Text(c.displayName)
                                                    .font(.hdSubhead)
                                                    .foregroundColor(Color.hdNavy)
                                                if let em = c.email {
                                                    Text(em)
                                                        .font(.hdCaption)
                                                        .foregroundColor(Color.hdGold)
                                                }
                                            }
                                        }
                                    }
                                }
                                .padding()
                            }
                        }
                    }
                    .padding()
                }
                .background(Color.hdBackground)
                .navigationTitle(p.name)
                .navigationBarTitleDisplayMode(.inline)
            } else {
                Text("Parish not found.")
                    .foregroundColor(Color.hdMuted)
            }
        }
        .task {
            // loadParish returns the parish directly, eliminating the race condition
            // that occurred when reading vm.selectedParish (a shared published property
            // that could be overwritten by concurrent detail-view loads).
            parish = await vm.loadParish(id: parishId)
            isLoading = false
        }
    }

    private func openPhone(_ phone: String) {
        let digits = phone.components(separatedBy: .decimalDigits.inverted).joined()
        if let url = URL(string: "tel:\(digits)") { UIApplication.shared.open(url) }
    }

    private func openEmail(_ email: String) {
        if let url = URL(string: "mailto:\(email)") { UIApplication.shared.open(url) }
    }
}

// MARK: - ContactRow

struct ContactRow: View {
    let icon: String
    let text: String
    var isAction: Bool = false

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundColor(Color.hdGold)
                .frame(width: 20)
            Text(text)
                .font(.hdSubhead)
                .foregroundColor(isAction ? Color.hdGold : Color.hdCharcoal)
            if isAction { Spacer() }
        }
    }
}
