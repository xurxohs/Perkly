import SwiftUI

struct SquadView: View {
    @StateObject private var vm = SquadViewModel()
    @EnvironmentObject var authVM: AuthViewModel
    
    var body: some View {
        Group {
            if !authVM.isAuthenticated {
                notLoggedInView
            } else if vm.isLoading && vm.progress == nil {
                loadingView
            } else if let progress = vm.progress {
                squadContentView(progress)
            } else {
                noSquadView
            }
        }
        .background(Color.perklyDark)
        .navigationTitle("Сквад")
        .navigationBarTitleDisplayMode(.large)
        .task {
            if authVM.isAuthenticated {
                await vm.loadSquad()
            }
        }
        .sheet(isPresented: $vm.showCreateSheet) {
            CreateSquadSheet(vm: vm)
                .presentationDetents([.medium])
                .presentationDragIndicator(.visible)
        }
        .sheet(isPresented: $vm.showJoinSheet) {
            JoinSquadSheet(vm: vm)
                .presentationDetents([.medium])
                .presentationDragIndicator(.visible)
        }
    }
    
    // MARK: - Not Logged In
    
    private var notLoggedInView: some View {
        VStack(spacing: 24) {
            Image(systemName: "person.3.fill")
                .font(.system(size: 60))
                .foregroundColor(.white.opacity(0.15))
            
            Text("Войдите, чтобы создать сквад")
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(.white)
            
            Text("Объединяйтесь с друзьями и зарабатывайте бонусы вместе")
                .font(.system(size: 14))
                .foregroundColor(.white.opacity(0.4))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    // MARK: - Loading
    
    private var loadingView: some View {
        VStack {
            Spacer()
            ProgressView()
                .tint(.perklyPurple)
                .scaleEffect(1.2)
            Spacer()
        }
        .frame(maxWidth: .infinity)
    }
    
    // MARK: - No Squad
    
    private var noSquadView: some View {
        VStack(spacing: 30) {
            Spacer()
            
            // Icon
            ZStack {
                Circle()
                    .fill(Color.perklyPurple.opacity(0.1))
                    .frame(width: 120, height: 120)
                
                Circle()
                    .fill(Color.perklyPurple.opacity(0.05))
                    .frame(width: 160, height: 160)
                
                Image(systemName: "person.3.fill")
                    .font(.system(size: 44))
                    .foregroundStyle(Color.primaryGradient)
            }
            
            VStack(spacing: 10) {
                Text("Присоединяйтесь к скваду!")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(.white)
                
                Text("Создайте команду или вступите по коду.\nВместе тратьте 1,000,000 сум в месяц\nи получайте 15% кешбэк!")
                    .font(.system(size: 14))
                    .foregroundColor(.white.opacity(0.5))
                    .multilineTextAlignment(.center)
                    .lineSpacing(3)
            }
            
            VStack(spacing: 12) {
                Button {
                    vm.showCreateSheet = true
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "plus.circle.fill")
                        Text("Создать сквад")
                    }
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(Color.primaryGradient)
                    .clipShape(Capsule())
                }
                .buttonStyle(.plain)
                
                Button {
                    vm.showJoinSheet = true
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "ticket.fill")
                        Text("Вступить по коду")
                    }
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .perklySurface(cornerRadius: 99)
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 40)
            
            Spacer()
        }
    }
    
    // MARK: - Squad Content
    
    private func squadContentView(_ progress: SquadProgress) -> some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: 20) {
                // Squad Header
                VStack(spacing: 14) {
                    ZStack {
                        Circle()
                            .fill(Color.primaryGradient)
                            .frame(width: 72, height: 72)
                            .shadow(color: .perklyPurple.opacity(0.4), radius: 15)
                        
                        Image(systemName: "person.3.fill")
                            .font(.system(size: 28))
                            .foregroundColor(.white)
                    }
                    
                    Text(progress.name)
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(.white)
                    
                    // Invite code
                    HStack(spacing: 8) {
                        Text("Код: \(progress.inviteCode)")
                            .font(.system(size: 13, weight: .medium, design: .monospaced))
                            .foregroundColor(.white.opacity(0.5))
                        
                        Button {
                            UIPasteboard.general.string = progress.inviteCode
                            HapticManager.shared.playPurchaseSuccess()
                        } label: {
                            Image(systemName: "doc.on.doc.fill")
                                .font(.system(size: 12))
                                .foregroundColor(.perklyPurple)
                        }
                    }
                }
                .padding(.top, 10)
                
                // Progress Card
                VStack(spacing: 16) {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Прогресс месяца")
                                .font(.system(size: 13))
                                .foregroundColor(.white.opacity(0.5))
                            Text("\(formattedAmount(progress.currentSpending)) / \(formattedAmount(progress.monthlyGoal))")
                                .font(.system(size: 18, weight: .bold))
                                .foregroundColor(.white)
                        }
                        
                        Spacer()
                        
                        Text("\(Int(progress.progressPercent * 100))%")
                            .font(.system(size: 28, weight: .heavy))
                            .gradientForeground(progress.isGoalReached ? .perklyGreen : .perklyPrimary)
                    }
                    
                    // Progress Bar
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            RoundedRectangle(cornerRadius: 6)
                                .fill(Color.white.opacity(0.06))
                                .frame(height: 12)
                            
                            RoundedRectangle(cornerRadius: 6)
                                .fill(progress.isGoalReached ? Color.greenGradient : Color.primaryGradient)
                                .frame(width: geo.size.width * progress.progressPercent, height: 12)
                                .animation(.spring(response: 0.8, dampingFraction: 0.7), value: progress.progressPercent)
                        }
                    }
                    .frame(height: 12)
                    
                    if progress.isGoalReached {
                        HStack(spacing: 8) {
                            Image(systemName: "checkmark.seal.fill")
                                .foregroundColor(.perklyGreen)
                            Text("Цель достигнута! Кешбэк 15% активен 🎉")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(.perklyGreen)
                        }
                        .padding(12)
                        .frame(maxWidth: .infinity)
                        .background(Color.perklyGreen.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                }
                .padding(20)
                .perklySurface(cornerRadius: 20)
                .padding(.horizontal, 20)
                
                // Members
                VStack(alignment: .leading, spacing: 14) {
                    HStack {
                        Text("Участники")
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundColor(.white)
                        
                        Spacer()
                        
                        Text("\(progress.members.count)/5")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.white.opacity(0.4))
                    }
                    
                    ForEach(progress.members) { member in
                        HStack(spacing: 12) {
                            // Avatar
                            ZStack {
                                Circle()
                                    .fill(Color.primaryGradient)
                                    .frame(width: 40, height: 40)
                                
                                if let avatarUrl = member.avatarUrl, let url = RemoteImageURL.url(from: avatarUrl) {
                                    AsyncImage(url: url) { image in
                                        image.resizable().aspectRatio(contentMode: .fill)
                                    } placeholder: {
                                        Text(String((member.displayName ?? "?").prefix(1)))
                                            .font(.system(size: 16, weight: .bold))
                                            .foregroundColor(.white)
                                    }
                                    .frame(width: 40, height: 40)
                                    .clipShape(Circle())
                                } else {
                                    Text(String((member.displayName ?? "?").prefix(1)))
                                        .font(.system(size: 16, weight: .bold))
                                        .foregroundColor(.white)
                                }
                            }
                            
                            Text(member.displayName ?? "Участник")
                                .font(.system(size: 15, weight: .medium))
                                .foregroundColor(.white)
                            
                            Spacer()
                        }
                        .padding(.vertical, 4)
                    }
                    
                    // Share invite
                    if progress.members.count < 5 {
                        ShareLink(item: "Присоединяйся к моему скваду в Perkly! Код: \(progress.inviteCode)") {
                            HStack(spacing: 8) {
                                Image(systemName: "square.and.arrow.up.fill")
                                Text("Пригласить друзей")
                            }
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.perklyPurple)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(Color.perklyPurple.opacity(0.1))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(20)
                .perklySurface(cornerRadius: 20)
                .padding(.horizontal, 20)
                .padding(.bottom, 30)
            }
        }
        .refreshable {
            await vm.loadSquad()
        }
    }
    
    // MARK: - Helpers
    
    private func formattedAmount(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.maximumFractionDigits = 0
        formatter.groupingSeparator = ","
        return formatter.string(from: NSNumber(value: amount)) ?? "\(Int(amount))"
    }
}

// MARK: - Create Squad Sheet

struct CreateSquadSheet: View {
    @ObservedObject var vm: SquadViewModel
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        VStack(spacing: 24) {
            Text("Создать сквад")
                .font(.system(size: 22, weight: .bold))
                .foregroundColor(.white)
            
            Text("Придумайте имя для вашей команды. Вы получите код приглашения для друзей.")
                .font(.system(size: 14))
                .foregroundColor(.white.opacity(0.5))
                .multilineTextAlignment(.center)
            
            TextField("Название сквада", text: $vm.newSquadName)
                .font(.system(size: 16))
                .foregroundColor(.white)
                .padding(16)
                .background(Color.white.opacity(0.04))
                .clipShape(RoundedRectangle(cornerRadius: 14))
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .stroke(Color.white.opacity(0.08), lineWidth: 1)
                )
            
            if let error = vm.error {
                Text(error)
                    .font(.system(size: 13))
                    .foregroundColor(.perklyRed)
            }
            
            Button {
                Task { await vm.createSquad() }
            } label: {
                HStack {
                    if vm.isCreating {
                        ProgressView().tint(.white)
                    } else {
                        Image(systemName: "plus.circle.fill")
                        Text("Создать")
                            .fontWeight(.bold)
                    }
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(Color.primaryGradient)
                .clipShape(RoundedRectangle(cornerRadius: 14))
            }
            .buttonStyle(.plain)
            .disabled(vm.isCreating)
        }
        .padding(24)
        .background(Color.perklyDark.ignoresSafeArea())
    }
}

// MARK: - Join Squad Sheet

struct JoinSquadSheet: View {
    @ObservedObject var vm: SquadViewModel
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        VStack(spacing: 24) {
            Text("Вступить в сквад")
                .font(.system(size: 22, weight: .bold))
                .foregroundColor(.white)
            
            Text("Введите 6-значный код приглашения, который вам прислал друг.")
                .font(.system(size: 14))
                .foregroundColor(.white.opacity(0.5))
                .multilineTextAlignment(.center)
            
            TextField("Код приглашения", text: $vm.joinCode)
                .font(.system(size: 20, weight: .bold, design: .monospaced))
                .foregroundColor(.white)
                .multilineTextAlignment(.center)
                .textInputAutocapitalization(.characters)
                .padding(16)
                .background(Color.white.opacity(0.04))
                .clipShape(RoundedRectangle(cornerRadius: 14))
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .stroke(Color.white.opacity(0.08), lineWidth: 1)
                )
            
            if let error = vm.error {
                Text(error)
                    .font(.system(size: 13))
                    .foregroundColor(.perklyRed)
            }
            
            Button {
                Task { await vm.joinSquad() }
            } label: {
                HStack {
                    if vm.isJoining {
                        ProgressView().tint(.white)
                    } else {
                        Image(systemName: "ticket.fill")
                        Text("Вступить")
                            .fontWeight(.bold)
                    }
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(Color.primaryGradient)
                .clipShape(RoundedRectangle(cornerRadius: 14))
            }
            .buttonStyle(.plain)
            .disabled(vm.isJoining)
        }
        .padding(24)
        .background(Color.perklyDark.ignoresSafeArea())
    }
}
