import SwiftUI
import MapKit

struct ParishDetailView: View {
    let parishId: String
    @EnvironmentObject private var vm: ParishViewModel
    @State private var parish: Parish?
    @State private var isLoading = true

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

                        // Map
                        if let lat = p.latitude, let lng = p.longitude {
                            Map(coordinateRegion: .constant(MKCoordinateRegion(
                                center: CLLocationCoordinate2D(latitude: lat, longitude: lng),
                                span: MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
                            )), annotationItems: [p]) { _ in
                                MapMarker(coordinate: CLLocationCoordinate2D(latitude: lat, longitude: lng), tint: .yellow)
                            }
                            .frame(height: 180)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }

                        // Contact info
                        HDCard {
                            VStack(alignment: .leading, spacing: 12) {
                                Text("Contact").font(.hdTitle3).foregroundColor(Color.hdNavy).padding(.bottom, 4)
                                if let addr = p.address { ContactRow(icon: "mappin", text: addr) }
                                if let loc = p.city { ContactRow(icon: "location", text: "\(loc)\(p.state != nil ? ", \(p.state!)" : "")\(p.zip != nil ? " \(p.zip!)" : "")") }
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
                                    Text("Clergy").font(.hdTitle3).foregroundColor(Color.hdNavy).padding(.bottom, 4)
                                    ForEach(clergy) { c in
                                        HStack(spacing: 12) {
                                            HDAvatar(initials: String(c.fullName.prefix(1)), size: 36)
                                            VStack(alignment: .leading, spacing: 2) {
                                                Text(c.displayName).font(.hdSubhead).foregroundColor(Color.hdNavy)
                                                if let em = c.email {
                                                    Text(em).font(.hdCaption).foregroundColor(Color.hdGold)
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
                Text("Parish not found.").foregroundColor(Color.hdMuted)
            }
        }
        .task {
            await vm.loadParish(id: parishId)
            parish = vm.selectedParish
            isLoading = false
        }
    }

    private func openPhone(_ phone: String) {
        let clean = phone.components(separatedBy: .decimalDigits.inverted).joined()
        if let url = URL(string: "tel:\(clean)") { UIApplication.shared.open(url) }
    }

    private func openEmail(_ email: String) {
        if let url = URL(string: "mailto:\(email)") { UIApplication.shared.open(url) }
    }
}

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
