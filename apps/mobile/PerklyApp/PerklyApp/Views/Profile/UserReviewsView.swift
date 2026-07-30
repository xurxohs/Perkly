import SwiftUI

struct UserReviewsView: View {
    let authorId: String
    let displayName: String
    
    @State private var reviews: [Review] = []
    @State private var isLoading = true
    @State private var errorText: String?

    var body: some View {
        ZStack {
            Color.perklyDark.ignoresSafeArea()
            
            if isLoading {
                PerklyContentStateView(
                    kind: .loading,
                    icon: "",
                    title: "Загружаем отзывы"
                )
            } else if let errorText {
                PerklyContentStateView(
                    kind: .error,
                    icon: "exclamationmark.triangle.fill",
                    title: "Не удалось загрузить отзывы",
                    message: errorText,
                    actionTitle: "Повторить"
                ) {
                    Task { await loadReviews() }
                }
            } else if reviews.isEmpty {
                PerklyContentStateView(
                    kind: .empty,
                    icon: "star.bubble.fill",
                    title: "Отзывов пока нет",
                    message: "После завершённых покупок отзывы появятся здесь."
                )
            } else {
                ScrollView {
                    VStack(spacing: 16) {
                        ForEach(reviews) { review in
                            UserReviewRow(review: review)
                        }
                    }
                    .padding(20)
                }
            }
        }
        .navigationTitle("Отзывы пользователя")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .task {
            await loadReviews()
        }
    }
    
    private func loadReviews() async {
        isLoading = true
        errorText = nil
        do {
            reviews = try await ReviewsService.shared.findByAuthorId(authorId)
        } catch {
            errorText = error.localizedDescription
        }
        isLoading = false
    }
}

struct UserReviewRow: View {
    let review: Review
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 12) {
                if let author = review.author {
                    AsyncImage(url: RemoteImageURL.url(from: author.avatarUrl)) { phase in
                        switch phase {
                        case .success(let image):
                            image.resizable().aspectRatio(contentMode: .fill)
                        default:
                            Color.white.opacity(0.1)
                        }
                    }
                    .frame(width: 36, height: 36)
                    .clipShape(Circle())
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text(author.displayName ?? "Пользователь")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.white)
                        
                        Text(formatDate(review.createdAt))
                            .font(.system(size: 12))
                            .foregroundColor(.white.opacity(0.4))
                    }
                } else {
                    Circle()
                        .fill(Color.white.opacity(0.1))
                        .frame(width: 36, height: 36)
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Пользователь")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.white)
                        Text(formatDate(review.createdAt))
                            .font(.system(size: 12))
                            .foregroundColor(.white.opacity(0.4))
                    }
                }
                
                Spacer()
                
                HStack(spacing: 2) {
                    Image(systemName: "star.fill")
                        .font(.system(size: 12))
                        .foregroundColor(.perklyGold)
                    Text("\(review.rating)")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color.perklyGold.opacity(0.15))
                .clipShape(Capsule())
            }
            
            if let comment = review.comment, !comment.isEmpty {
                Text(comment)
                    .font(.system(size: 15))
                    .foregroundColor(.white.opacity(0.8))
                    .lineSpacing(4)
            }
            
            HStack(spacing: 8) {
                Image(systemName: "tag.fill")
                    .font(.system(size: 12))
                    .foregroundColor(.perklyCyan)
                Text("Оффер ID: \(review.offerId)")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(.perklyCyan)
                    .lineLimit(1)
            }
            .padding(.top, 4)
        }
        .padding(16)
        .background(Color.white.opacity(0.04))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.white.opacity(0.06), lineWidth: 1)
        )
    }
    
    private func formatDate(_ dateString: String?) -> String {
        guard let dateString = dateString else { return "" }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: dateString) {
            let out = DateFormatter()
            out.dateStyle = .medium
            return out.string(from: date)
        }
        return String(dateString.prefix(10))
    }
}
