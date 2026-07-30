import WidgetKit
import SwiftUI

struct Provider: TimelineProvider {
    typealias Entry = SimpleEntry
    
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), points: 1250, streak: 3, claimedToday: false)
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        let entry = loadCurrentEntry()
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SimpleEntry>) -> ()) {
        let entry = loadCurrentEntry()
        // Refresh every 15 minutes, or on demand via reloadAllTimelines
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date()
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
    
    private func loadCurrentEntry() -> SimpleEntry {
        let suite = UserDefaults(suiteName: "group.com.perkly.app")
        let points = suite?.integer(forKey: "perkly_points") ?? 0
        let streak = suite?.integer(forKey: "perkly_streak") ?? 0
        let claimedToday = suite?.bool(forKey: "perkly_claimed_today") ?? false
        return SimpleEntry(date: Date(), points: points, streak: streak, claimedToday: claimedToday)
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
    let points: Int
    let streak: Int
    let claimedToday: Bool
}

struct PerklyWidgetsEntryView : View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        ZStack {
            // Premium Dark Gradient Background
            LinearGradient(
                colors: [Color(red: 0.05, green: 0.05, blue: 0.08), Color(red: 0.02, green: 0.02, blue: 0.03)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            
            // Subtle neon ambient glow
            Circle()
                .fill(Color.purple.opacity(0.12))
                .frame(width: 140, height: 140)
                .blur(radius: 25)
                .offset(x: 50, y: -50)
            
            WidgetContent()
        }
        .containerBackground(for: .widget) {
            Color.black
        }
    }
    
    @ViewBuilder
    private func WidgetContent() -> some View {
        switch family {
        case .systemSmall:
            SmallWidgetView(entry: entry)
        case .systemMedium:
            MediumWidgetView(entry: entry)
        default:
            SmallWidgetView(entry: entry)
        }
    }
}

// MARK: - Small Widget View (2x2)
struct SmallWidgetView: View {
    let entry: SimpleEntry
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Header
            HStack {
                Text("PERKLY")
                    .font(.system(size: 10, weight: .black))
                    .foregroundColor(.purple.opacity(0.8))
                    .tracking(2)
                Spacer()
                Image(systemName: entry.claimedToday ? "gift.fill" : "gift")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(entry.claimedToday ? .green : .orange)
            }
            
            Spacer()
            
            // Points counter
            VStack(alignment: .leading, spacing: 2) {
                Text("\(entry.points)")
                    .font(.system(size: 26, weight: .black))
                    .foregroundColor(.white)
                    .minimumScaleFactor(0.7)
                Text("Points Balance")
                    .font(.system(size: 9, weight: .bold))
                    .foregroundColor(.white.opacity(0.4))
                    .textCase(.uppercase)
                    .tracking(0.5)
            }
            
            Spacer()
            
            // Streak
            HStack(spacing: 4) {
                Image(systemName: "flame.fill")
                    .font(.system(size: 12))
                    .foregroundColor(.orange)
                Text("\(entry.streak) дн.")
                    .font(.system(size: 10, weight: .heavy))
                    .foregroundColor(.white.opacity(0.9))
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(Color.white.opacity(0.04))
            .cornerRadius(8)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(Color.white.opacity(0.08), lineWidth: 0.5)
            )
        }
        .padding(14)
    }
}

// MARK: - Medium Widget View (4x2)
struct MediumWidgetView: View {
    let entry: SimpleEntry
    
    var body: some View {
        HStack(spacing: 0) {
            // Left Half: Balance & Branding
            VStack(alignment: .leading, spacing: 8) {
                Text("PERKLY")
                    .font(.system(size: 10, weight: .black))
                    .foregroundColor(.purple.opacity(0.8))
                    .tracking(2)
                
                Spacer()
                
                VStack(alignment: .leading, spacing: 2) {
                    Text("\(entry.points)")
                        .font(.system(size: 32, weight: .black))
                        .foregroundColor(.white)
                        .minimumScaleFactor(0.7)
                    Text("Points Balance")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundColor(.white.opacity(0.4))
                        .textCase(.uppercase)
                        .tracking(0.5)
                }
                
                Spacer()
                
                HStack(spacing: 4) {
                    Image(systemName: "flame.fill")
                        .font(.system(size: 12))
                        .foregroundColor(.orange)
                    Text("\(entry.streak) дней подряд")
                        .font(.system(size: 10, weight: .heavy))
                        .foregroundColor(.white.opacity(0.9))
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color.white.opacity(0.04))
                .cornerRadius(8)
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(Color.white.opacity(0.08), lineWidth: 0.5)
                )
            }
            .padding(14)
            
            Divider()
                .background(Color.white.opacity(0.08))
                .padding(.vertical, 16)
            
            // Right Half: Week calendar progress
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("DAILY STREAK")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundColor(.white.opacity(0.4))
                        .tracking(0.5)
                    Spacer()
                    Text(entry.claimedToday ? "ЗАБРАН" : "ДОСТУПЕН")
                        .font(.system(size: 8, weight: .black))
                        .foregroundColor(entry.claimedToday ? .green : .orange)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(entry.claimedToday ? Color.green.opacity(0.12) : Color.orange.opacity(0.12))
                        .cornerRadius(4)
                }
                
                Spacer()
                
                // 7 Days checklist
                HStack(spacing: 4) {
                    ForEach(0..<7) { index in
                        VStack(spacing: 4) {
                            Text(Self.dayLabels[index])
                                .font(.system(size: 7, weight: .bold))
                                .foregroundColor(.white.opacity(0.3))
                            
                            ZStack {
                                Circle()
                                    .fill(Self.circleColor(index: index, streak: entry.streak, claimedToday: entry.claimedToday))
                                    .frame(width: 16, height: 16)
                                
                                if Self.isClaimed(index: index, streak: entry.streak, claimedToday: entry.claimedToday) {
                                    Image(systemName: "checkmark")
                                        .font(.system(size: 8, weight: .black))
                                        .foregroundColor(.green)
                                } else if index == Self.todayIndex && !entry.claimedToday {
                                    Image(systemName: "gift.fill")
                                        .font(.system(size: 8))
                                        .foregroundColor(.orange)
                                } else {
                                    Text("\(Self.pointsReward[index])")
                                        .font(.system(size: 6, weight: .heavy))
                                        .foregroundColor(.white.opacity(0.5))
                                }
                            }
                        }
                        .frame(maxWidth: .infinity)
                    }
                }
                
                Spacer()
            }
            .padding(14)
        }
    }
    
    // Helpers for mockup calendar rendering
    private static let dayLabels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
    private static let pointsReward = [10, 20, 30, 40, 50, 60, 100]
    private static let todayIndex = 6 // assume Sunday is today for calendar visualization
    
    private static func isClaimed(index: Int, streak: Int, claimedToday: Bool) -> Bool {
        if index == todayIndex { return claimedToday }
        if index < todayIndex {
            // If streak is high enough, previous days were claimed
            return (todayIndex - index) < streak
        }
        return false
    }
    
    private static func circleColor(index: Int, streak: Int, claimedToday: Bool) -> Color {
        if isClaimed(index: index, streak: streak, claimedToday: claimedToday) {
            return Color.green.opacity(0.15)
        }
        if index == todayIndex && !claimedToday {
            return Color.orange.opacity(0.2)
        }
        return Color.white.opacity(0.04)
    }
}

// MARK: - Widget Bundle
@main
struct PerklyWidgets: Widget {
    let kind: String = "PerklyWidgets"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            PerklyWidgetsEntryView(entry: entry)
        }
        .configurationDisplayName("Perkly Activity")
        .description("Отслеживайте ваш баланс баллов и ежедневную серию бонусов.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
