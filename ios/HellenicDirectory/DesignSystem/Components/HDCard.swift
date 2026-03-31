import SwiftUI

struct HDCard<Content: View>: View {
    let content: () -> Content

    init(@ViewBuilder content: @escaping () -> Content) {
        self.content = content
    }

    var body: some View {
        content()
            .background(Color.hdCard)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.hdGold.opacity(0.15), lineWidth: 1))
            .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
}

struct HDSearchBar: View {
    @Binding var text: String
    var placeholder: String = "Search..."
    var onSubmit: () -> Void = {}

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.hdMuted)
                .font(.system(size: 16))
            TextField(placeholder, text: $text)
                .font(.hdBody)
                .submitLabel(.search)
                .onSubmit(onSubmit)
            if !text.isEmpty {
                Button(action: { text = "" }) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.hdMuted)
                }
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(Color.hdCard)
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.hdGold.opacity(0.2), lineWidth: 1))
    }
}

struct HDPrimaryButton: View {
    let title: String
    var isLoading: Bool = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Group {
                if isLoading {
                    ProgressView().tint(Color.hdNavy)
                } else {
                    Text(title)
                        .font(.hdHeadline)
                        .foregroundColor(Color.hdNavy)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
        }
        .background(Color.hdGold)
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .disabled(isLoading)
    }
}

struct HDBadge: View {
    let text: String

    var body: some View {
        Text(text)
            .font(.hdCaption)
            .foregroundColor(Color.hdGold)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(Color.hdGold.opacity(0.12))
            .clipShape(Capsule())
            .overlay(Capsule().stroke(Color.hdGold.opacity(0.25), lineWidth: 1))
    }
}

struct HDAvatar: View {
    var imageURL: URL?
    var initials: String
    var size: CGFloat = 44

    var body: some View {
        Group {
            if let url = imageURL {
                AsyncImage(url: url) { img in
                    img.resizable().scaledToFill()
                } placeholder: {
                    initialsView
                }
            } else {
                initialsView
            }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
    }

    private var initialsView: some View {
        ZStack {
            Circle().fill(Color.hdNavy.opacity(0.1))
            Text(initials.prefix(2).uppercased())
                .font(.system(size: size * 0.35, weight: .bold))
                .foregroundColor(Color.hdNavy)
        }
    }
}

struct HDMeanderDivider: View {
    var body: some View {
        GeometryReader { geo in
            Path { path in
                let w = geo.size.width
                let h: CGFloat = 10
                let step: CGFloat = 20
                var x: CGFloat = 0
                var goingUp = true

                path.move(to: CGPoint(x: 0, y: h / 2))
                while x < w {
                    let nextX = min(x + step, w)
                    if goingUp {
                        path.addLine(to: CGPoint(x: x + step / 2, y: 0))
                        path.addLine(to: CGPoint(x: nextX, y: h / 2))
                    } else {
                        path.addLine(to: CGPoint(x: x + step / 2, y: h))
                        path.addLine(to: CGPoint(x: nextX, y: h / 2))
                    }
                    x = nextX
                    goingUp.toggle()
                }
            }
            .stroke(Color.hdGold, lineWidth: 1.5)
        }
        .frame(height: 10)
    }
}
