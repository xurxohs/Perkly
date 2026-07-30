import Foundation

@MainActor
final class SquadViewModel: ObservableObject {
    @Published var progress: SquadProgress?
    @Published var isLoading = false
    @Published var error: String?
    
    // Create squad
    @Published var newSquadName = ""
    @Published var isCreating = false
    
    // Join squad
    @Published var joinCode = ""
    @Published var isJoining = false
    
    // UI state
    @Published var showCreateSheet = false
    @Published var showJoinSheet = false
    
    private let service = SquadsService.shared
    
    var hasSquad: Bool { progress != nil }
    
    func loadSquad() async {
        isLoading = true
        error = nil
        
        do {
            self.progress = try await service.getMyProgress()
        } catch {
            // null response means no squad — not an error
            self.progress = nil
        }
        
        isLoading = false
    }
    
    func createSquad() async {
        let name = newSquadName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else {
            error = L10n.tr("squad.error.enter_name")
            return
        }
        
        isCreating = true
        error = nil
        
        do {
            _ = try await service.create(name: name)
            newSquadName = ""
            showCreateSheet = false
            // Analytics
            AnalyticsService.shared.trackEvent(eventType: "squad_create", metadata: "name: \(name)")
            await loadSquad()
        } catch {
            self.error = error.localizedDescription
        }
        
        isCreating = false
    }
    
    func joinSquad() async {
        let code = joinCode.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        guard !code.isEmpty else {
            error = L10n.tr("squad.error.enter_invite_code")
            return
        }
        
        isJoining = true
        error = nil
        
        do {
            _ = try await service.join(inviteCode: code)
            joinCode = ""
            showJoinSheet = false
            // Analytics
            AnalyticsService.shared.trackEvent(eventType: "squad_join", metadata: "code: \(code)")
            await loadSquad()
        } catch {
            self.error = error.localizedDescription
        }
        
        isJoining = false
    }
}
