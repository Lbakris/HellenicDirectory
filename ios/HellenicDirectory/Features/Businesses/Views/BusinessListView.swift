import SwiftUI

struct BusinessListView: View {
    @EnvironmentObject private var vm: BusinessViewModel

    var body: some View {
        VStack(spacing: 0) {
            VStack(spacing: 8) {
                HDSearchBar(text: $vm.searchText) {
                    Task { vm.currentPage = 1; await vm.search() }
                }
                HStack(spacing: 8) {
                    TextField("City", text: $vm.cityFilter)
                        .font(.hdSubhead).padding(.horizontal, 10).padding(.vertical, 8)
                        .background(Color.hdCard).clipShape(RoundedRectangle(cornerRadius: 8))
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.hdGold.opacity(0.2)))
                    TextField("Category", text: $vm.keywordFilter)
                        .font(.hdSubhead).padding(.horizontal, 10).padding(.vertical, 8)
                        .background(Color.hdCard).clipShape(RoundedRectangle(cornerRadius: 8))
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.hdGold.opacity(0.2)))
                }
            }
            .padding()
            .background(Color.hdBackground)

            if vm.isLoading {
                ProgressView().tint(Color.hdGold).frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List(vm.businesses) { biz in
                    BusinessRow(business: biz)
                        .listRowBackground(Color.hdCard)
                        .listRowSeparator(.hidden)
                        .listRowInsets(.init(top: 6, leading: 16, bottom: 6, trailing: 16))
                }
                .listStyle(.plain)
            }
        }
        .navigationTitle("Greek Businesses")
        .task { if vm.businesses.isEmpty { await vm.search() } }
    }
}

struct BusinessRow: View {
    let business: BusinessListing

    var body: some View {
        HDCard {
            VStack(alignment: .leading, spacing: 10) {
                HStack(spacing: 12) {
                    if let logoUrl = business.logoUrl, let url = URL(string: logoUrl) {
                        AsyncImage(url: url) { img in img.resizable().scaledToFill() }
                        placeholder: { Color.hdNavy.opacity(0.1) }
                        .frame(width: 44, height: 44).clipShape(RoundedRectangle(cornerRadius: 8))
                    } else {
                        ZStack {
                            RoundedRectangle(cornerRadius: 8).fill(Color.hdNavy.opacity(0.1))
                            Text(String(business.businessName.prefix(1)))
                                .font(.hdHeadline).foregroundColor(Color.hdNavy)
                        }
                        .frame(width: 44, height: 44)
                    }
                    VStack(alignment: .leading, spacing: 2) {
                        Text(business.businessName).font(.hdHeadline).foregroundColor(Color.hdNavy)
                        Text(business.contactName).font(.hdCaption).foregroundColor(Color.hdMuted)
                    }
                }

                if let desc = business.description {
                    Text(desc).font(.hdFootnote).foregroundColor(Color.hdCharcoal).lineLimit(2)
                }

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        ForEach(business.keywords.prefix(5), id: \.self) { kw in HDBadge(text: kw) }
                    }
                }

                HStack {
                    Text(business.locationString).font(.hdCaption).foregroundColor(Color.hdMuted)
                    Spacer()
                    HStack(spacing: 12) {
                        Button(action: { openPhone(business.phone) }) {
                            Label("Call", systemImage: "phone").font(.hdCaption).foregroundColor(Color.hdGold)
                        }
                        Button(action: { openEmail(business.email) }) {
                            Label("Email", systemImage: "envelope").font(.hdCaption).foregroundColor(Color.hdGold)
                        }
                        if let web = business.website, let url = URL(string: web) {
                            Link(destination: url) {
                                Label("Web", systemImage: "globe").font(.hdCaption).foregroundColor(Color.hdGold)
                            }
                        }
                    }
                }
            }
            .padding()
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
