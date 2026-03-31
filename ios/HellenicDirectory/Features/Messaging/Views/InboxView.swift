import SwiftUI

struct MessageThread: Decodable, Identifiable {
    let id: String
    let subject: String?
    let type: String
    let createdAt: Date
    let messages: [MessagePreview]
    let participants: [ThreadParticipant]
}

struct MessagePreview: Decodable {
    let body: String
    let sentAt: Date
    let sender: SenderInfo
}

struct ThreadParticipant: Decodable, Identifiable {
    let userId: String
    let user: SenderInfo
    var id: String { userId }
}

struct SenderInfo: Decodable {
    let id: String
    let fullName: String
    let avatarUrl: String?
}

struct FullMessage: Decodable, Identifiable {
    let id: String
    let threadId: String
    let senderId: String
    let sender: SenderInfo
    let body: String
    let sentAt: Date
}

struct ThreadsResponse: Decodable { let data: [MessageThread] }
struct ThreadResponse: Decodable { let thread: ThreadDetail }
struct ThreadDetail: Decodable {
    let id: String
    let subject: String?
    let messages: [FullMessage]
    let participants: [ThreadParticipant]
}

@MainActor
class InboxViewModel: ObservableObject {
    let directoryId: String
    @Published var threads: [MessageThread] = []
    @Published var activeThread: ThreadDetail?
    @Published var isLoading = false
    @Published var isSending = false

    init(directoryId: String) { self.directoryId = directoryId }

    func fetchThreads() async {
        isLoading = true
        do {
            let r: ThreadsResponse = try await APIClient.shared.get("/directories/\(directoryId)/messages")
            threads = r.data
        } catch {}
        isLoading = false
    }

    func openThread(_ id: String) async {
        do {
            let r: ThreadResponse = try await APIClient.shared.get("/directories/\(directoryId)/messages/\(id)")
            activeThread = r.thread
        } catch {}
    }

    func send(body: String, threadId: String?) async {
        struct SendBody: Encodable { let threadId: String?; let body: String }
        isSending = true
        do {
            let _: EmptyResponse = try await APIClient.shared.post(
                "/directories/\(directoryId)/messages",
                body: SendBody(threadId: threadId, body: body)
            )
            if let tid = threadId { await openThread(tid) }
            await fetchThreads()
        } catch {}
        isSending = false
    }
}

struct InboxView: View {
    let directoryId: String
    @StateObject private var vm: InboxViewModel
    @State private var draft = ""

    init(directoryId: String) {
        _vm = StateObject(wrappedValue: InboxViewModel(directoryId: directoryId))
    }

    var body: some View {
        NavigationSplitView {
            // Thread list
            List(vm.threads) { thread in
                Button(action: { Task { await vm.openThread(thread.id) } }) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(thread.subject ?? "No subject").font(.hdSubhead).foregroundColor(Color.hdNavy)
                        if let msg = thread.messages.first {
                            Text(msg.body).font(.hdCaption).foregroundColor(Color.hdMuted).lineLimit(1)
                        }
                    }
                    .padding(.vertical, 4)
                }
                .listRowBackground(vm.activeThread?.id == thread.id ? Color.hdGold.opacity(0.1) : Color.hdCard)
            }
            .listStyle(.plain)
            .navigationTitle("Inbox")
            .task { await vm.fetchThreads() }
        } detail: {
            if let thread = vm.activeThread {
                VStack {
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: 12) {
                            ForEach(thread.messages) { msg in
                                MessageBubble(message: msg)
                            }
                        }
                        .padding()
                    }

                    Divider()

                    HStack(spacing: 10) {
                        TextField("Message...", text: $draft, axis: .vertical)
                            .font(.hdBody)
                            .lineLimit(1...4)
                            .padding(10)
                            .background(Color.hdCard)
                            .clipShape(RoundedRectangle(cornerRadius: 10))

                        Button(action: {
                            let body = draft.trimmingCharacters(in: .whitespaces)
                            guard !body.isEmpty else { return }
                            draft = ""
                            Task { await vm.send(body: body, threadId: thread.id) }
                        }) {
                            Image(systemName: "arrow.up.circle.fill")
                                .font(.system(size: 32))
                                .foregroundColor(draft.trimmingCharacters(in: .whitespaces).isEmpty ? .gray : Color.hdGold)
                        }
                        .disabled(draft.trimmingCharacters(in: .whitespaces).isEmpty || vm.isSending)
                    }
                    .padding()
                }
                .navigationTitle(thread.subject ?? "Message")
                .navigationBarTitleDisplayMode(.inline)
            } else {
                Text("Select a conversation").foregroundColor(Color.hdMuted)
            }
        }
    }
}

struct MessageBubble: View {
    let message: FullMessage
    @EnvironmentObject private var auth: AuthViewModel

    private var isMe: Bool { message.senderId == auth.currentUser?.id }

    var body: some View {
        HStack(alignment: .bottom, spacing: 8) {
            if isMe { Spacer(minLength: 40) }
            if !isMe {
                HDAvatar(initials: String(message.sender.fullName.prefix(1)), size: 28)
            }
            VStack(alignment: isMe ? .trailing : .leading, spacing: 2) {
                if !isMe {
                    Text(message.sender.fullName).font(.hdCaption).foregroundColor(Color.hdMuted)
                }
                Text(message.body)
                    .font(.hdSubhead)
                    .foregroundColor(isMe ? .white : Color.hdCharcoal)
                    .padding(.horizontal, 12).padding(.vertical, 8)
                    .background(isMe ? Color.hdNavy : Color.hdCard)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
            }
            if !isMe { Spacer(minLength: 40) }
        }
    }
}
