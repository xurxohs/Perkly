import SwiftUI
import Combine

struct CountdownTimer: View {
    let hours: Double
    @State private var remainingSeconds: Double
    @State private var timer: AnyCancellable?
    
    init(hours: Double) {
        self.hours = hours
        self._remainingSeconds = State(initialValue: hours * 3600)
    }
    
    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: "clock.fill")
                .font(.system(size: 11))
            Text(formattedTime)
                .font(.system(size: 12, weight: .bold, design: .monospaced))
        }
        .foregroundColor(.perklyRed)
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
        .background(Color.perklyRed.opacity(0.15))
        .clipShape(Capsule())
        .onAppear {
            timer = Timer.publish(every: 1, on: .main, in: .common)
                .autoconnect()
                .sink { _ in
                    if remainingSeconds > 0 {
                        remainingSeconds -= 1
                    }
                }
        }
        .onDisappear {
            timer?.cancel()
        }
    }
    
    private var formattedTime: String {
        let h = Int(remainingSeconds) / 3600
        let m = (Int(remainingSeconds) % 3600) / 60
        let s = Int(remainingSeconds) % 60
        return String(format: "%02d:%02d:%02d", h, m, s)
    }
}
