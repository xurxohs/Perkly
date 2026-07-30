import Foundation
import SwiftUI

struct RichLinkText: View {
    let source: String
    var font: Font = .body
    var color: Color = .perklyTextSecondary
    var spacing: CGFloat = 4

    @StateObject private var content: RichLinkTextContent

    init(
        source: String,
        font: Font = .body,
        color: Color = .perklyTextSecondary,
        spacing: CGFloat = 4
    ) {
        self.source = source
        self.font = font
        self.color = color
        self.spacing = spacing
        _content = StateObject(
            wrappedValue: RichLinkTextContent(source: source)
        )
    }

    var body: some View {
        Text(content.attributedText)
            .font(font)
            .foregroundStyle(color)
            .tint(.perklyPurple)
            .lineSpacing(spacing)
            .fixedSize(horizontal: false, vertical: true)
            .onChange(of: source) { _, newSource in
                content.update(source: newSource)
            }
    }
}

@MainActor
private final class RichLinkTextContent: ObservableObject {
    @Published private(set) var attributedText: AttributedString
    private var source: String

    init(source: String) {
        self.source = source
        attributedText = Self.makeAttributedText(from: source)
    }

    func update(source: String) {
        guard source != self.source else { return }
        self.source = source
        attributedText = Self.makeAttributedText(from: source)
    }

    private static func makeAttributedText(from source: String) -> AttributedString {
        let normalized = normalizeLinks(in: source)
        guard var value = try? AttributedString(
            markdown: normalized,
            options: .init(interpretedSyntax: .inlineOnlyPreservingWhitespace)
        ) else {
            return AttributedString(source)
        }

        let unsafeRanges = value.runs.compactMap { run -> Range<AttributedString.Index>? in
            guard let link = run.link, !Self.isSafe(link) else { return nil }
            return run.range
        }
        for range in unsafeRanges {
            value[range].link = nil
        }
        return value
    }

    private static func normalizeLinks(in source: String) -> String {
        // Supports both regular Markdown [text](url) and the editor-friendly
        // reversed form requested by the product: (text)[url].
        let range = NSRange(source.startIndex..., in: source)
        return reverseLinkExpression.stringByReplacingMatches(
            in: source,
            range: range,
            withTemplate: "[$1]($2)"
        )
    }

    private static func isSafe(_ url: URL) -> Bool {
        guard let scheme = url.scheme?.lowercased() else { return false }
        return ["https", "http", "mailto", "tel"].contains(scheme)
    }

    private static let reverseLinkExpression = try! NSRegularExpression(
        pattern: #"\(([^)\n]+)\)\[([^\]\n]+)\]"#
    )
}
