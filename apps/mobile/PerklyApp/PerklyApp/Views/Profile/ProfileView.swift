import SwiftUI
import UIKit
import PassKit
import PhotosUI

struct ProfileView: View {
    @EnvironmentObject var authVM: AuthViewModel
    @Environment(\.scenePhase) private var scenePhase
    @StateObject private var vm = ProfileViewModel()
    @StateObject private var locationManager = LocationManager.shared
    @State private var showTopUp = false
    @State private var showSubscriptionSheet = false
    @State private var showEditProfile = false
    @State private var showPersonalization = false
    @State private var activeChatRoom: ChatRoom?
    @State private var chatError: String?
    
    var body: some View {
        // Using ZStack instead of Group to avoid TableColumnBuilder compiler bug in swiftc
        ZStack {
            if !authVM.isAuthenticated {
                // Not logged in view remains same
                VStack(spacing: 24) {
                    Image(systemName: "person.crop.circle")
                        .font(.system(size: 70))
                        .foregroundColor(.white.opacity(0.15))
                    
                    Text("Войдите в аккаунт")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(.white)
                    
                    Text("Чтобы видеть баланс, покупки и управлять профилем")
                        .font(.system(size: 15))
                        .foregroundColor(.white.opacity(0.4))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 40)
                    
                    NavigationLink(destination: LoginView()) {
                        Text("Войти или зарегистрироваться")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.black)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(Color.white)
                            .clipShape(Capsule())
                    }
                    .padding(.horizontal, 40)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let user = authVM.user {
                ScrollView(.vertical, showsIndicators: false) {
                    VStack(spacing: 24) {
                        // Profile header
                        VStack(spacing: 16) {
                            // Avatar with Edit Button
                            ZStack(alignment: .bottomTrailing) {
                                ZStack {
                                    Circle()
                                        .fill(Color.primaryGradient)
                                        .frame(width: 90, height: 90)
                                        .shadow(color: .perklyPurple.opacity(0.35), radius: 15)
                                    
                                    if let avatarUrl = user.avatarUrl, let url = RemoteImageURL.url(from: avatarUrl) {
                                        AsyncImage(url: url) { image in
                                            image.resizable().aspectRatio(contentMode: .fill)
                                        } placeholder: {
                                            Text(String((user.displayName ?? "U").prefix(1)))
                                                .font(.system(size: 32, weight: .bold))
                                                .foregroundColor(.white)
                                        }
                                        .frame(width: 90, height: 90)
                                        .clipShape(Circle())
                                    } else {
                                        Text(String((user.displayName ?? "U").prefix(1)))
                                            .font(.system(size: 32, weight: .bold))
                                            .foregroundColor(.white)
                                    }
                                }
                                
                                Button {
                                    showEditProfile = true
                                } label: {
                                    Image(systemName: "pencil.circle.fill")
                                        .font(.system(size: 28))
                                        .foregroundColor(.white)
                                        .background(Color.perklyDark)
                                        .clipShape(Circle())
                                        .shadow(radius: 4)
                                }
                            }
                            
                            VStack(spacing: 4) {
                                HStack(spacing: 8) {
                                    Text(user.displayName ?? "Пользователь")
                                        .font(.system(size: 24, weight: .bold))
                                        .foregroundColor(.white)
                                    
                                    TierBadge(tier: user.tierEnum, compact: true)
                                }
                                
                                Text(user.email ?? "")
                                    .font(.system(size: 14))
                                    .foregroundColor(.white.opacity(0.4))
                            }
                        }
                        .padding(.top, 10)
                        
                        // 1. Achievements (Gamification)
                        AchievementsRow(stats: vm.stats)
                        
                        // Interaction Section (Groups multiple links to avoid VStack 10-child limit)
                        VStack(spacing: 24) {
                            // 2. Squad Entry (Social)
                            NavigationLink(destination: SquadView()) {
                                HStack(spacing: 16) {
                                    ZStack {
                                        Circle()
                                            .fill(Color.perklyPurple.opacity(0.15))
                                            .frame(width: 54, height: 54)
                                        
                                        Image(systemName: "person.3.fill")
                                            .font(.system(size: 22))
                                            .foregroundStyle(Color.primaryGradient)
                                    }
                                    
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("Мой Сквад")
                                            .font(.system(size: 17, weight: .bold))
                                            .foregroundColor(.white)
                                        Text("Объединяйтесь и получайте 15% кешбэк")
                                            .font(.system(size: 13))
                                            .foregroundColor(.white.opacity(0.4))
                                    }
                                    
                                    Spacer()
                                    
                                    Image(systemName: "chevron.right")
                                        .font(.system(size: 14))
                                        .foregroundColor(.white.opacity(0.2))
                                }
                                .padding(16)
                                .perklySurface(cornerRadius: 20)
                                .padding(.horizontal, 20)
                            }
                            .buttonStyle(.plain)
                            
                            NavigationLink(destination: ActivePurchasesView()) {
                                HStack(spacing: 16) {
                                    ZStack {
                                        Circle()
                                            .fill(Color.perklyCyan.opacity(0.15))
                                            .frame(width: 54, height: 54)
                                        
                                        Image(systemName: "checkmark.seal.fill")
                                            .font(.system(size: 20))
                                            .foregroundStyle(Color.perklyCyan)
                                    }
                                    
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("Активные покупки")
                                            .font(.system(size: 17, weight: .bold))
                                            .foregroundColor(.white)
                                        Text("Подписки, купоны и сроки действия")
                                            .font(.system(size: 13))
                                            .foregroundColor(.white.opacity(0.4))
                                    }
                                    
                                    Spacer()
                                    
                                    Image(systemName: "chevron.right")
                                        .font(.system(size: 14))
                                        .foregroundColor(.white.opacity(0.2))
                                }
                                .padding(16)
                                .perklySurface(cornerRadius: 20)
                                .padding(.horizontal, 20)
                            }
                            .buttonStyle(.plain)
                            
                            // 2.5 Gift System Entry
                            NavigationLink(destination: GiftCodesView()) {
                                HStack(spacing: 16) {
                                    ZStack {
                                        Circle()
                                            .fill(Color.perklyGreen.opacity(0.15))
                                            .frame(width: 54, height: 54)
                                        
                                        Image(systemName: "gift.fill")
                                            .font(.system(size: 20))
                                            .foregroundStyle(Color.greenGradient)
                                    }
                                    
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("Мои Подарки")
                                            .font(.system(size: 17, weight: .bold))
                                            .foregroundColor(.white)
                                        Text("Активация и купленные гифткоды")
                                            .font(.system(size: 13))
                                            .foregroundColor(.white.opacity(0.4))
                                    }
                                    
                                    Spacer()
                                    
                                    Image(systemName: "chevron.right")
                                        .font(.system(size: 14))
                                        .foregroundColor(.white.opacity(0.2))
                                }
                                .padding(16)
                                .perklySurface(cornerRadius: 20)
                                .padding(.horizontal, 20)
                            }
                            .buttonStyle(.plain)
                            
                            // 3. Messages Entry (Communication)
                            NavigationLink(destination: ChatListView()) {
                                HStack(spacing: 16) {
                                    ZStack {
                                        Circle()
                                            .fill(Color.perklyGreen.opacity(0.15))
                                            .frame(width: 54, height: 54)
                                        
                                        Image(systemName: "message.fill")
                                            .font(.system(size: 20))
                                            .foregroundStyle(Color.greenGradient)
                                    }
                                    
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("Сообщения")
                                            .font(.system(size: 17, weight: .bold))
                                            .foregroundColor(.white)
                                        Text("Общение с продавцами и история")
                                            .font(.system(size: 13))
                                            .foregroundColor(.white.opacity(0.4))
                                    }
                                    
                                    Spacer()
                                    
                                    Image(systemName: "chevron.right")
                                        .font(.system(size: 14))
                                        .foregroundColor(.white.opacity(0.2))
                                }
                                .padding(16)
                                .perklySurface(cornerRadius: 20)
                                .padding(.horizontal, 20)
                            }
                            .buttonStyle(.plain)
                            
                            // 4. Disputes Entry (Arbitration)
                            NavigationLink(destination: DisputeListView()) {
                                HStack(spacing: 16) {
                                    ZStack {
                                        Circle()
                                            .fill(Color.perklyOrange.opacity(0.15))
                                            .frame(width: 54, height: 54)
                                        
                                        Image(systemName: "exclamationmark.shield.fill")
                                            .font(.system(size: 20))
                                            .foregroundStyle(Color.perklyOrange)
                                    }
                                    
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("Мои Споры")
                                            .font(.system(size: 17, weight: .bold))
                                            .foregroundColor(.white)
                                        Text("Арбитраж и жалобы на заказы")
                                            .font(.system(size: 13))
                                            .foregroundColor(.white.opacity(0.4))
                                    }
                                    
                                    Spacer()
                                    
                                    Image(systemName: "chevron.right")
                                        .font(.system(size: 14))
                                        .foregroundColor(.white.opacity(0.2))
                                }
                                .padding(16)
                                .perklySurface(cornerRadius: 20)
                                .padding(.horizontal, 20)
                            }
                            .buttonStyle(.plain)

                            // 5. My Reviews Entry
                            NavigationLink(destination: UserReviewsView(authorId: user.id, displayName: user.displayName ?? "Пользователь")) {
                                HStack(spacing: 16) {
                                    ZStack {
                                        Circle()
                                            .fill(Color.perklyGold.opacity(0.15))
                                            .frame(width: 54, height: 54)
                                        
                                        Image(systemName: "star.bubble.fill")
                                            .font(.system(size: 20))
                                            .foregroundStyle(Color.perklyGold)
                                    }
                                    
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("Мои Отзывы")
                                            .font(.system(size: 17, weight: .bold))
                                            .foregroundColor(.white)
                                        Text("Оценки и комментарии")
                                            .font(.system(size: 13))
                                            .foregroundColor(.white.opacity(0.4))
                                    }
                                    
                                    Spacer()
                                    
                                    Image(systemName: "chevron.right")
                                        .font(.system(size: 14))
                                        .foregroundColor(.white.opacity(0.2))
                                }
                                .padding(16)
                                .perklySurface(cornerRadius: 20)
                                .padding(.horizontal, 20)
                            }
                            .buttonStyle(.plain)
                        }
                        
                        // Balance Card
                        VStack(spacing: 16) {
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Ваш Баланс")
                                        .font(.system(size: 13, weight: .medium))
                                        .foregroundColor(.white.opacity(0.5))
                                    Text("\(uzs(user.balance ?? 0))")
                                        .font(.system(size: 32, weight: .heavy))
                                        .gradientForeground(.perklyGreen)
                                }
                                
                                Spacer()
                                
                                Image(systemName: "wallet.pass.fill")
                                    .font(.system(size: 32))
                                    .foregroundColor(.white.opacity(0.1))
                            }
                            
                            Button {
                                showTopUp = true
                            } label: {
                                HStack(spacing: 8) {
                                    Image(systemName: "plus.circle.fill")
                                    Text("Пополнить")
                                }
                                .font(.system(size: 15, weight: .bold))
                                .foregroundColor(.black)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                                .background(Color.white)
                                .clipShape(RoundedRectangle(cornerRadius: 14))
                            }
                            .buttonStyle(.plain)
                        }
                        .padding(20)
                        .perklySurface(cornerRadius: 24)
                        .padding(.horizontal, 20)

                        ProfileSavedOffersSection(
                            savedOffers: vm.savedOffers,
                            onRemove: { offer in
                                Task { await vm.removeSavedOffer(offer.offerId) }
                            }
                        )
                        .padding(.horizontal, 20)

                        ProfilePromocodesSection(
                            activations: vm.promocodeActivations,
                            onCopy: { activation in
                                if let code = activation.codeSnapshot {
                                    UIPasteboard.general.string = code
                                }
                                Task { await vm.copyPromocode(activation) }
                            },
                            onUse: { activation in
                                Task { await vm.markPromocodeUsed(activation) }
                            }
                        )
                        .padding(.horizontal, 20)
                        
                        // Grouping for SwiftUI 10-child limit
                        VStack(spacing: 24) {
                            // Seller Dashboard Entry (Activated)
                            NavigationLink(destination: SellerDashboardView()) {
                                HStack(spacing: 16) {
                                    ZStack {
                                        Circle()
                                            .fill(Color.perklyGreen.opacity(0.15))
                                            .frame(width: 40, height: 40)
                                        Image(systemName: "chart.bar.xaxis")
                                            .foregroundColor(.perklyGreen)
                                            .font(.system(size: 18))
                                    }
                                    
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text("Панель продавца")
                                            .font(.system(size: 16, weight: .bold))
                                            .foregroundColor(.white)
                                        Text("Управляйте своими товарами и доходом")
                                            .font(.system(size: 12))
                                            .foregroundColor(.white.opacity(0.4))
                                    }
                                    
                                    Spacer()
                                    
                                    Image(systemName: "chevron.right")
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundColor(.white.opacity(0.2))
                                }
                                .padding(16)
                                .background(Color.white.opacity(0.05))
                                .clipShape(RoundedRectangle(cornerRadius: 16))
                            }
                            .padding(.horizontal, 20)
                            
                            Button {
                                showPersonalization = true
                            } label: {
                                HStack(spacing: 14) {
                                    Image(systemName: "person.crop.circle.badge.checkmark")
                                        .font(.system(size: 18, weight: .semibold))
                                        .foregroundColor(.perklyPurple)
                                        .frame(width: 40, height: 40)
                                        .background(Color.perklyPurple.opacity(0.12))
                                        .clipShape(RoundedRectangle(cornerRadius: 13))
                                    VStack(alignment: .leading, spacing: 3) {
                                        Text("Персонализация")
                                            .font(.system(size: 15, weight: .bold))
                                            .foregroundColor(.white)
                                        Text("Интересы и рекомендации")
                                            .font(.system(size: 12, weight: .medium))
                                            .foregroundColor(.white.opacity(0.42))
                                    }
                                    Spacer()
                                    Image(systemName: "chevron.right")
                                        .foregroundColor(.white.opacity(0.2))
                                }
                                .padding(15)
                                .perklySurface(cornerRadius: 18)
                            }
                            .buttonStyle(.plain)
                            .padding(.horizontal, 20)
                            
                            // 3. Referral Banner
                            ReferralBanner(userId: user.id)

                            if user.roleEnum == .admin {
                                NavigationLink(destination: AdminControlCenterView()) {
                                    HStack(spacing: 16) {
                                        ZStack {
                                            Circle()
                                                .fill(Color.perklyRed.opacity(0.15))
                                                .frame(width: 40, height: 40)
                                            Image(systemName: "shield.lefthalf.filled")
                                                .foregroundColor(.perklyRed)
                                                .font(.system(size: 18))
                                        }

                                        VStack(alignment: .leading, spacing: 2) {
                                            Text("Админ-панель")
                                                .font(.system(size: 16, weight: .bold))
                                                .foregroundColor(.white)
                                            Text("Операции, витрина, арбитраж и мониторинг")
                                                .font(.system(size: 12))
                                                .foregroundColor(.white.opacity(0.4))
                                        }

                                        Spacer()

                                        Image(systemName: "chevron.right")
                                            .font(.system(size: 14, weight: .semibold))
                                            .foregroundColor(.white.opacity(0.2))
                                    }
                                    .padding(16)
                                    .background(Color.white.opacity(0.05))
                                    .clipShape(RoundedRectangle(cornerRadius: 16))
                                }
                                .buttonStyle(.plain)
                                .padding(.horizontal, 20)
                            }

                            // Stats & Tier
                            VStack(spacing: 12) {
                                if let stats = vm.stats {
                                    HStack(spacing: 12) {
                                        StatCard(title: "Потрачено", value: "\(uzs(stats.totalSpent))", icon: "creditcard.fill", color: .perklyPurple)
                                        StatCard(title: "Покупки", value: "\(stats.totalPurchases)", icon: "bag.fill", color: .perklyGreen)
                                    }
                                }
                                
                                TierInfoCard(tier: user.tierEnum, capabilities: vm.partnerCapabilities)
                                
                                // VIP Perks (Weekly Coupons)
                                if user.tierEnum != .silver {
                                    VIPPerksView(user: user)
                                }
                                
                                if user.tierEnum != .platinum {
                                    Button {
                                        showSubscriptionSheet = true
                                    } label: {
                                        Text("Апгрейд до \(user.tierEnum == .silver ? "Gold" : "Platinum")")
                                            .font(.system(size: 15, weight: .bold))
                                            .foregroundColor(.white)
                                            .frame(maxWidth: .infinity)
                                            .padding(.vertical, 14)
                                            .background(Color.white.opacity(0.08))
                                            .clipShape(RoundedRectangle(cornerRadius: 16))
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                            .padding(.horizontal, 20)

                            VStack(spacing: 18) {
                                OfferRecommendationSection(
                                    title: vm.transactions.isEmpty ? "Тебе может зайти" : "Для вас",
                                    subtitle: vm.transactions.isEmpty
                                        ? "Стартовая подборка свежих офферов, пока вы ещё не набрали историю."
                                        : "Собрали офферы по вашим покупкам, категориям и среднему чеку.",
                                    icon: "sparkles",
                                    accent: .perklyPurple,
                                    offers: vm.historyOffers,
                                    trackingScreen: "profile",
                                    trackingSection: "history",
                                    emptyState: "Как только появится больше покупок, блок станет точнее."
                                )

                                OfferRecommendationSection(
                                    title: "Рядом с вами",
                                    subtitle: locationManager.lastLocation == nil
                                        ? "Включите геолокацию, и профиль покажет ближайшие офферы."
                                        : "Быстрые варианты поблизости, которые удобно забрать по пути.",
                                    icon: "location.fill",
                                    accent: .perklyCyan,
                                    offers: vm.nearbyOffers,
                                    trackingScreen: "profile",
                                    trackingSection: "nearby",
                                    emptyState: locationManager.lastLocation == nil
                                        ? "Сейчас геолокация выключена. Без неё nearby-подборка не соберётся."
                                        : "Пока поблизости ничего подходящего не нашли. Попробуйте обновить позже.",
                                    actionTitle: locationManager.lastLocation == nil ? "Включить гео" : nil,
                                    action: locationManager.lastLocation == nil ? {
                                        LocationManager.shared.requestPermissions()
                                        LocationManager.shared.startUpdating()
                                    } : nil
                                )

                                OfferRecommendationSection(
                                    title: "Для вашего \(user.tierEnum.displayName)",
                                    subtitle: "Подборка под текущий статус: цена, скидки и тип офферов под ваш tier.",
                                    icon: "crown.fill",
                                    accent: user.tierEnum == .platinum ? .perklyPurple : (user.tierEnum == .gold ? .perklyGold : .perklyGreen),
                                    offers: vm.tierOffers,
                                    trackingScreen: "profile",
                                    trackingSection: "tier",
                                    emptyState: "Подходящие офферы скоро подтянутся сюда автоматически."
                                )
                            }
                            .padding(.horizontal, 20)
                            
                            // Support Grid
                            SupportGrid()
                        }
                        
                        // Recent Transactions
                        VStack(alignment: .leading, spacing: 14) {
                            Text("История операций")
                                .font(.system(size: 18, weight: .bold))
                                .foregroundColor(.white)
                            
                            if vm.transactions.isEmpty {
                                Text("Здесь пока пусто")
                                    .font(.system(size: 14))
                                    .foregroundColor(.white.opacity(0.4))
                                    .frame(maxWidth: .infinity, alignment: .center)
                                    .padding(.vertical, 20)
                            } else {
                                ForEach(vm.transactions) { tx in
                                    TransactionRow(transaction: tx) {
                                        Task {
                                            await vm.confirmTransaction(tx)
                                            await authVM.refreshUser()
                                        }
                                    } onOpenChat: {
                                        Task {
                                            await openSellerChat(for: tx)
                                        }
                                    }
                                }
                            }
                        }
                        .padding(20)
                        .perklySurface(cornerRadius: 24)
                        .padding(.horizontal, 20)
                        
                        // Seller onboarding or dashboard
                        NavigationLink(destination: SellerDashboardView()) {
                            HStack(spacing: 14) {
                                Image(systemName: "briefcase.fill")
                                    .font(.system(size: 20))
                                    .foregroundStyle(Color.primaryGradient)
                                
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(authVM.user?.roleEnum == .vendor || authVM.user?.roleEnum == .admin ? "Кабинет продавца" : "Стать продавцом")
                                        .font(.system(size: 16, weight: .bold))
                                        .foregroundColor(.white)
                                    Text(authVM.user?.roleEnum == .vendor || authVM.user?.roleEnum == .admin ? "Управление товарами и событиями" : "Подать заявку и открыть витрину")
                                        .font(.system(size: 12))
                                        .foregroundColor(.white.opacity(0.4))
                                }
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.system(size: 14))
                                    .foregroundColor(.white.opacity(0.3))
                            }
                            .padding(20)
                            .perklySurface(cornerRadius: 20)
                        }
                        .buttonStyle(.plain)
                        .padding(.horizontal, 20)
                        
                        // Payment processing
                        if let urlString = vm.paymentUrl, let url = URL(string: urlString) {
                            VStack(spacing: 12) {
                                HStack {
                                    Image(systemName: "link.circle.fill")
                                        .foregroundColor(Color.perklyGreen)
                                    Text("Ссылка для оплаты готова")
                                        .font(.system(size: 14, weight: .bold))
                                        .foregroundColor(Color.perklyGreen)
                                    Spacer()
                                }
                                
                                Button {
                                    UIApplication.shared.open(url)
                                } label: {
                                    Text("Оплатить")
                                        .font(.system(size: 13, weight: .bold))
                                        .foregroundColor(.white)
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 10)
                                        .background(Color.perklyGreen)
                                        .clipShape(RoundedRectangle(cornerRadius: 10))
                                }
                            }
                            .padding(16)
                            .background(Color.perklyGreen.opacity(0.1))
                            .clipShape(RoundedRectangle(cornerRadius: 16))
                            .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.perklyGreen.opacity(0.3), lineWidth: 1))
                            .padding(.horizontal, 20)
                        }

                        if vm.lastDepositId != nil, let status = vm.topUpStatusText {
                            HStack(spacing: 12) {
                                if vm.isWaitingForTopUp {
                                    ProgressView().tint(.perklyPurple)
                                } else {
                                    Image(systemName: "clock.badge.checkmark")
                                        .foregroundStyle(Color.perklyPurple)
                                }
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(status)
                                        .font(.system(size: 14, weight: .bold))
                                        .foregroundStyle(.white)
                                    Text("Можно закрыть экран — статус сохранён и обновится автоматически.")
                                        .font(.system(size: 11, weight: .medium))
                                        .foregroundStyle(.white.opacity(0.42))
                                }
                                Spacer()
                            }
                            .padding(16)
                            .background(Color.perklyPurple.opacity(0.1))
                            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                            .padding(.horizontal, 20)
                        }
                        
                        // Danger Zone
                        Button {
                            authVM.logout()
                        } label: {
                            HStack {
                                Image(systemName: "power")
                                Text("Выйти из системы")
                            }
                            .font(.system(size: 15, weight: .bold))
                            .foregroundColor(.perklyRed)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(Color.perklyRed.opacity(0.1))
                            .clipShape(RoundedRectangle(cornerRadius: 20))
                            .overlay(
                                RoundedRectangle(cornerRadius: 20)
                                    .stroke(Color.perklyRed.opacity(0.2), lineWidth: 1)
                            )
                        }
                        .buttonStyle(.plain)
                        .padding(.horizontal, 20)
                        .padding(.bottom, 40)
                    }
                }
                .refreshable {
                    await authVM.refreshUser()
                    await vm.loadData(for: authVM.user)
                }
            }
        }
        .background(Color.perklyDark.ignoresSafeArea())
        .navigationTitle("")
        .navigationBarHidden(true)
        .sheet(isPresented: $showEditProfile) {
            if let user = authVM.user {
                EditProfileSheet(vm: vm, currentName: user.displayName ?? "", currentAvatar: user.avatarUrl ?? "", onSuccess: {
                    Task {
                        await authVM.refreshUser()
                        await vm.loadData(for: authVM.user)
                    }
                })
            }
        }
        .sheet(isPresented: $showTopUp) {
            TopUpSheet(vm: vm, onSuccess: {
                Task {
                    await authVM.refreshUser()
                    await vm.loadData(for: authVM.user)
                }
            })
            .presentationDetents([.large])
            .presentationDragIndicator(.visible)
        }
        .sheet(isPresented: $showPersonalization) {
            PersonalizationProfileSheet(vm: vm)
                .presentationDetents([.large])
                .presentationDragIndicator(.visible)
        }
        .sheet(isPresented: $showSubscriptionSheet) {
            if let user = authVM.user {
                SubscriptionSheet(currentTier: user.tierEnum, initialCapabilities: vm.partnerCapabilities, onSuccess: {
                    Task {
                        await authVM.refreshUser()
                        await vm.loadData(for: authVM.user)
                    }
                })
                .presentationDetents([.large])
                .presentationDragIndicator(.visible)
            }
        }
        .fullScreenCover(item: $activeChatRoom) { room in
            NavigationStack {
                ChatRoomView(room: room)
                    .environmentObject(authVM)
            }
        }
        .alert("Не удалось открыть чат", isPresented: .init(get: { chatError != nil }, set: { if !$0 { chatError = nil } })) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(chatError ?? "Попробуйте позже")
        }
        .onChange(of: locationManager.lastLocation) { _, location in
            guard authVM.isAuthenticated, location != nil else { return }
            Task {
                await vm.reloadRecommendations(for: authVM.user)
            }
        }
        .task(id: profileLoadKey) {
            guard authVM.isAuthenticated else { return }
            await vm.loadData(for: authVM.user)
        }
        .onChange(of: scenePhase) { _, phase in
            guard phase == .active, vm.lastDepositId != nil else { return }
            Task {
                if await vm.waitForPendingTopUp() {
                    await authVM.refreshUser()
                    await vm.loadData(for: authVM.user)
                }
            }
        }
        .alert("Баланс пополнен", isPresented: $vm.topUpSuccess) {
            Button("Готово", role: .cancel) {}
        } message: {
            Text("Средства уже доступны на балансе Perkly.")
        }
    }

    private var profileLoadKey: String {
        [
            authVM.isAuthenticated ? "auth" : "guest",
            authVM.user?.id ?? "",
            authVM.user?.tier ?? "",
            authVM.user?.updatedAt ?? ""
        ].joined(separator: "|")
    }

    private func openSellerChat(for transaction: Transaction) async {
        guard let sellerId = transaction.offer?.sellerId else {
            chatError = "Продавец для этой покупки не найден."
            return
        }

        do {
            activeChatRoom = try await ChatService.shared.createOrGetDirectRoom(targetUserId: sellerId)
        } catch {
            chatError = error.localizedDescription
        }
    }
}

// MARK: - New Premium Components

struct AchievementsRow: View {
    let stats: UserStats?
    
    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 16) {
                BadgeItem(icon: "bolt.fill", title: "Новичок", active: true, color: .blue)
                BadgeItem(icon: "star.fill", title: "Активный", active: (stats?.totalPurchases ?? 0) >= 3, color: .orange)
                BadgeItem(icon: "crown.fill", title: "VIP", active: (stats?.totalSpent ?? 0) >= 100, color: .perklyGold)
                BadgeItem(icon: "heart.fill", title: "Советник", active: (stats?.reviewsCount ?? 0) >= 1, color: .perklyRed)
            }
            .padding(.horizontal, 20)
        }
    }
}

private struct ProfileSavedOffersSection: View {
    let savedOffers: [SavedOffer]
    let onRemove: (SavedOffer) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Label("Сохранённые", systemImage: "heart.fill")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(.white)
                Spacer()
                if !savedOffers.isEmpty {
                    Text("\(savedOffers.count)")
                        .font(.system(size: 12, weight: .heavy))
                        .foregroundColor(.black)
                        .padding(.horizontal, 9)
                        .padding(.vertical, 5)
                        .background(Color.perklyPink)
                        .clipShape(Capsule())
                }
            }

            if savedOffers.isEmpty {
                Text("Сохраняйте офферы в каталоге, и они появятся здесь на всех устройствах.")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(.white.opacity(0.46))
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.vertical, 4)
            } else {
                VStack(spacing: 10) {
                    ForEach(savedOffers.prefix(3)) { saved in
                        HStack(spacing: 12) {
                            NavigationLink(destination: OfferDetailView(offerId: saved.offer.id)) {
                                HStack(spacing: 12) {
                                    AsyncImage(url: RemoteImageURL.url(from: saved.offer.safeProductThumbnail)) { image in
                                        image.resizable().aspectRatio(contentMode: .fill)
                                    } placeholder: {
                                        Color.white.opacity(0.08)
                                    }
                                    .frame(width: 44, height: 44)
                                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

                                    VStack(alignment: .leading, spacing: 3) {
                                        Text(saved.offer.safeTitle)
                                            .font(.system(size: 14, weight: .bold))
                                            .foregroundColor(.white)
                                            .lineLimit(1)

                                        Text("\(uzs(saved.offer.safePrice))")
                                            .font(.system(size: 12, weight: .semibold))
                                            .foregroundColor(.white.opacity(0.52))
                                    }

                                    Spacer()
                                }
                            }
                            .buttonStyle(.plain)

                            Button {
                                onRemove(saved)
                            } label: {
                                Image(systemName: "xmark")
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundColor(.white.opacity(0.62))
                                    .frame(width: 30, height: 30)
                                    .background(Color.white.opacity(0.07))
                                    .clipShape(Circle())
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
        }
        .padding(18)
        .perklySurface(cornerRadius: 22)
    }
}

private struct ProfilePromocodesSection: View {
    let activations: [PromocodeActivation]
    let onCopy: (PromocodeActivation) -> Void
    let onUse: (PromocodeActivation) -> Void

    private var activeActivations: [PromocodeActivation] {
        activations.filter(\.isUsable)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Label("Промокоды", systemImage: "ticket.fill")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(.white)
                Spacer()
                if !activeActivations.isEmpty {
                    Text("\(activeActivations.count)")
                        .font(.system(size: 12, weight: .heavy))
                        .foregroundColor(.black)
                        .padding(.horizontal, 9)
                        .padding(.vertical, 5)
                        .background(Color.perklyGreen)
                        .clipShape(Capsule())
                }
            }

            if activeActivations.isEmpty {
                Text("Активированные промокоды появятся здесь. Их можно будет копировать или применить в покупке.")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(.white.opacity(0.46))
            } else {
                VStack(spacing: 10) {
                    ForEach(activeActivations.prefix(3)) { activation in
                        HStack(spacing: 12) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(activation.promocode?.title ?? "Промокод")
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundColor(.white)
                                    .lineLimit(1)

                                Text(activation.codeSnapshot ?? "Код будет выдан при копировании")
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundColor(.perklyGreen)
                                    .lineLimit(1)
                            }

                            Spacer()

                            Button {
                                onCopy(activation)
                            } label: {
                                Image(systemName: "doc.on.doc.fill")
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundColor(.black)
                                    .frame(width: 34, height: 34)
                                    .background(Color.perklyGreen)
                                    .clipShape(Circle())
                            }
                            .buttonStyle(.plain)

                            Button {
                                onUse(activation)
                            } label: {
                                Image(systemName: "checkmark")
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundColor(.white)
                                    .frame(width: 34, height: 34)
                                    .background(Color.white.opacity(0.1))
                                    .clipShape(Circle())
                            }
                            .buttonStyle(.plain)
                        }
                        .padding(12)
                        .background(Color.white.opacity(0.05))
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    }
                }
            }
        }
        .padding(18)
        .perklySurface(cornerRadius: 22)
    }
}

struct BadgeItem: View {
    let icon: String
    let title: String
    let active: Bool
    let color: Color
    
    var body: some View {
        VStack(spacing: 8) {
            ZStack {
                Circle()
                    .fill(active ? color.opacity(0.15) : Color.white.opacity(0.05))
                    .frame(width: 60, height: 60)
                
                Image(systemName: icon)
                    .font(.system(size: 24))
                    .foregroundColor(active ? color : .white.opacity(0.1))
            }
            .overlay(
                Circle()
                    .stroke(active ? color.opacity(0.3) : Color.clear, lineWidth: 2)
            )
            
            Text(title)
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(active ? .white : .white.opacity(0.2))
        }
    }
}

struct PersonalizationProfileSheet: View {
    @ObservedObject var vm: ProfileViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var birthYear = ""
    @State private var gender = ""
    @State private var city = ""
    @State private var selectedInterests: Set<String> = []
    @State private var error: String?

    private let genders = ["", "male", "female", "other"]
    private let interestOptions = [
        "food", "coffee", "shopping", "beauty", "fitness", "games",
        "telegram", "subscriptions", "travel", "events", "education", "tech"
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Персонализация")
                            .font(.system(size: 24, weight: .heavy))
                            .foregroundColor(.white)
                        Text("Эти данные помогают точнее собирать рекомендации и офферы.")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.white.opacity(0.52))
                            .lineSpacing(3)
                    }

                    profileField("Город", text: $city, placeholder: "Tashkent")

                    profileField("Год рождения", text: $birthYear, placeholder: "2000")
                        .keyboardType(.numberPad)
                        .onChange(of: birthYear) { oldValue, newValue in
                            birthYear = String(newValue.filter(\.isNumber).prefix(4))
                        }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Пол")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(.white.opacity(0.58))

                        Picker("Пол", selection: $gender) {
                            Text("Не указывать").tag("")
                            Text("Мужской").tag("male")
                            Text("Женский").tag("female")
                            Text("Другое").tag("other")
                        }
                        .pickerStyle(.segmented)
                    }

                    VStack(alignment: .leading, spacing: 10) {
                        Text("Интересы")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(.white.opacity(0.58))

                        LazyVGrid(columns: [
                            GridItem(.flexible(), spacing: 8),
                            GridItem(.flexible(), spacing: 8)
                        ], spacing: 8) {
                            ForEach(interestOptions, id: \.self) { interest in
                                Button {
                                    toggleInterest(interest)
                                } label: {
                                    Text(interest)
                                        .font(.system(size: 13, weight: .bold))
                                        .foregroundColor(selectedInterests.contains(interest) ? .black : .white.opacity(0.68))
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 10)
                                        .background(selectedInterests.contains(interest) ? Color.perklyGreen : Color.white.opacity(0.06))
                                        .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }

                    if let error {
                        Text(error)
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(.perklyRed)
                    } else if let vmError = vm.error {
                        Text(vmError)
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(.perklyRed)
                    }

                    Button {
                        Task { await save() }
                    } label: {
                        HStack(spacing: 8) {
                            if vm.isLoading {
                                ProgressView().tint(.black)
                            } else {
                                Image(systemName: "checkmark.circle.fill")
                                Text("Сохранить")
                            }
                        }
                        .font(.system(size: 15, weight: .heavy))
                        .foregroundColor(.black)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 15)
                        .background(Color.perklyGreen)
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    }
                    .buttonStyle(.plain)
                    .disabled(vm.isLoading)
                }
                .padding(20)
            }
            .background(Color.perklyDark.ignoresSafeArea())
            .navigationTitle("Профиль")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Закрыть") { dismiss() }
                        .foregroundColor(.white)
                }
            }
            .onAppear(perform: loadInitialValues)
        }
    }

    private func profileField(_ title: String, text: Binding<String>, placeholder: String) -> some View {
        VStack(alignment: .leading, spacing: 7) {
            Text(title)
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(.white.opacity(0.58))

            TextField(placeholder, text: text)
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(.white)
                .padding(14)
                .background(Color.white.opacity(0.06))
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
    }

    private func loadInitialValues() {
        birthYear = vm.b2cProfile?.birthYear.map(String.init) ?? ""
        gender = vm.b2cProfile?.gender ?? ""
        city = vm.b2cProfile?.city ?? ""
        selectedInterests = Set(vm.userInterests.map(\.category))
    }

    private func toggleInterest(_ interest: String) {
        if selectedInterests.contains(interest) {
            selectedInterests.remove(interest)
        } else {
            selectedInterests.insert(interest)
        }
    }

    private func save() async {
        let cleanCity = city.trimmingCharacters(in: .whitespacesAndNewlines)
        let cleanGender = gender.trimmingCharacters(in: .whitespacesAndNewlines)
        let year = birthYear.isEmpty ? nil : Int(birthYear)

        if !birthYear.isEmpty && year == nil {
            error = "Введите корректный год рождения"
            return
        }

        let didSave = await vm.updateB2CProfile(
            birthYear: year,
            gender: cleanGender.isEmpty ? nil : cleanGender,
            city: cleanCity.isEmpty ? nil : cleanCity,
            interests: Array(selectedInterests).sorted()
        )

        if didSave {
            dismiss()
        }
    }
}

struct ReferralBanner: View {
    let userId: String
    @State private var codeCopied = false
    
    // Generate a deterministic, human-readable referral code from the user ID
    private var referralCode: String {
        let suffix = userId.uppercased().filter { $0.isLetter || $0.isNumber }.prefix(6)
        return "PRKLY-\(suffix)"
    }

    private var referralLink: String {
        "https://t.me/PerklyPlatformBot?start=ref_\(userId)"
    }
    
    private var shareText: String {
        """
        Привет! Я пользуюсь Perkly для скидок, купонов и подарков.

        Перейди по моей ссылке, и мы оба получим 500 Perkly Points:
        \(referralLink)
        """
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Top section
            HStack(spacing: 16) {
                ZStack {
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: [Color.perklyPurple.opacity(0.4), Color.perklyPurple.opacity(0.1)],
                                startPoint: .topLeading, endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 52, height: 52)
                    Image(systemName: "person.2.fill")
                        .font(.system(size: 20))
                        .foregroundStyle(Color.primaryGradient)
                }
                
                VStack(alignment: .leading, spacing: 4) {
                    Text("Зарабатывай с Perkly")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.white)
                    Text("Пригласи друга — получите по 500 баллов")
                        .font(.system(size: 12))
                        .foregroundColor(.white.opacity(0.5))
                }
                
                Spacer()
                
                // Share button
                ShareLink(
                    item: shareText,
                    subject: Text("Приглашение в Perkly"),
                    message: Text(shareText)
                ) {
                    HStack(spacing: 4) {
                        Image(systemName: "square.and.arrow.up")
                            .font(.system(size: 12, weight: .semibold))
                        Text("Позвать")
                            .font(.system(size: 13, weight: .bold))
                    }
                    .foregroundColor(.white)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 9)
                    .background(Color.primaryGradient)
                    .clipShape(Capsule())
                }
            }
            .padding(16)
            
            // Code strip
            HStack {
                Image(systemName: "ticket.fill")
                    .font(.system(size: 13))
                    .foregroundColor(.perklyPurple.opacity(0.7))
                
                Text("TELEGRAM INVITE")
                    .font(.system(size: 15, weight: .black, design: .monospaced))
                    .foregroundColor(.white)
                    .tracking(1)
                
                Spacer()
                
                Button {
                    UIPasteboard.general.string = referralLink
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                        codeCopied = true
                    }
                    HapticManager.shared.lightImpact()
                    DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                        withAnimation { codeCopied = false }
                    }
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: codeCopied ? "checkmark" : "doc.on.doc.fill")
                            .font(.system(size: 11))
                        Text(codeCopied ? "Скопировано!" : "Копировать")
                            .font(.system(size: 11, weight: .semibold))
                    }
                    .foregroundColor(codeCopied ? .perklyGreen : .perklyPurple)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background((codeCopied ? Color.perklyGreen : Color.perklyPurple).opacity(0.12))
                    .clipShape(Capsule())
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(Color.perklyPurple.opacity(0.07))
        }
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(Color.perklyPurple.opacity(0.08))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .stroke(
                    LinearGradient(
                        colors: [Color.perklyPurple.opacity(0.4), Color.perklyPurple.opacity(0.1)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 1
                )
        )
        .clipShape(RoundedRectangle(cornerRadius: 20))
        .padding(.horizontal, 20)
    }
}

struct SupportGrid: View {
    var body: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            SupportItem(icon: "questionmark.circle", title: "FAQ") {
                openLink("https://perkly.app/faq")
            }
            SupportItem(icon: "paperplane.fill", title: "Чат поддержки") {
                openLink("https://t.me/perkly_support")
            }
            SupportItem(icon: "doc.text.fill", title: "Условия") {
                openLink("https://perkly.uz/terms")
            }
            SupportItem(icon: "info.circle.fill", title: "О нас") {
                openLink("https://perkly.app/about")
            }
        }
        .padding(.horizontal, 20)
    }
    
    private func openLink(_ urlString: String) {
        if let url = URL(string: urlString) {
            HapticManager.shared.lightImpact()
            UIApplication.shared.open(url)
        }
    }
}

struct SupportItem: View {
    let icon: String
    let title: String
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 10) {
                Image(systemName: icon)
                    .font(.system(size: 14))
                    .foregroundColor(.white.opacity(0.4))
                Text(title)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(.white.opacity(0.8))
                Spacer()
            }
            .padding(.vertical, 14)
            .padding(.horizontal, 16)
            .perklySurface(cornerRadius: 14)
        }
        .buttonStyle(.plain)
    }
}


// MARK: - Stat Card
struct StatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color
    
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Image(systemName: icon)
                .font(.system(size: 18))
                .foregroundColor(color)
            
            Text(value)
                .font(.system(size: 22, weight: .bold))
                .foregroundColor(.white)
            
            Text(title)
                .font(.system(size: 12))
                .foregroundColor(.white.opacity(0.4))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(18)
        .perklySurface(cornerRadius: 16)
    }
}

// MARK: - Tier Info Card
struct TierInfoCard: View {
    let tier: UserTier
    let capabilities: PartnerCapabilities?
    @State private var showCenter = false

    var body: some View {
        Button {
            if capabilities != nil { showCenter = true }
        } label: {
            HStack(spacing: 14) {
                Image(systemName: tier.icon)
                    .font(.system(size: 28))
                    .foregroundStyle(gradient)

                VStack(alignment: .leading, spacing: 4) {
                    Text("Ваш статус: \(tier.displayName)")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.white)

                    Text(description)
                        .font(.system(size: 12))
                        .foregroundColor(.white.opacity(0.4))

                    if let capabilities {
                        HStack(spacing: 6) {
                            Image(systemName: timerIcon)
                                .font(.system(size: 11, weight: .bold))
                            Text(capabilities.timerTitle)
                                .font(.system(size: 12, weight: .semibold))
                                .lineLimit(1)
                        }
                        .foregroundColor(timerColor)
                        .padding(.top, 3)
                    }
                }

                Spacer()

                if capabilities != nil {
                    VStack(spacing: 2) {
                        Image(systemName: "chevron.right")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(.white.opacity(0.25))
                        Text("Кабинет")
                            .font(.system(size: 9, weight: .medium))
                            .foregroundColor(.white.opacity(0.2))
                    }
                }
            }
            .padding(18)
            .perklySurface(cornerRadius: 16)
        }
        .buttonStyle(.plain)
        .sheet(isPresented: $showCenter) {
            if let cap = capabilities {
                SubscriptionCenterView(capabilities: cap, onUpgrade: { showCenter = false })
                    .presentationDetents([.large])
                    .presentationDragIndicator(.visible)
            }
        }
    }

    private var gradient: LinearGradient {
        switch tier {
        case .silver: return LinearGradient(colors: [.gray, .gray.opacity(0.6)], startPoint: .top, endPoint: .bottom)
        case .gold: return .perklyGold
        case .platinum: return .perklyPlatinum
        }
    }

    private var description: String {
        if let capabilities, capabilities.status == "EXPIRED" {
            return capabilities.timerSubtitle
        }
        switch tier {
        case .silver: return "Базовый уровень. Обновите до Gold для больше привилегий!"
        case .gold: return "Повышенный кэшбек и доступ к эксклюзивным акциям"
        case .platinum: return "Максимальные привилегии и приоритетная поддержка"
        }
    }

    private var timerIcon: String {
        capabilities?.status == "EXPIRED" ? "clock.badge.exclamationmark.fill" : "timer"
    }

    private var timerColor: Color {
        switch capabilities?.status {
        case "ACTIVE": return .perklyGreen
        case "EXPIRED": return .perklyRed
        case "CANCELED": return .perklyOrange
        default: return .white.opacity(0.45)
        }
    }
}

// MARK: - Transaction Row
struct TransactionRow: View {
    let transaction: Transaction
    var onConfirm: (() -> Void)?
    var onOpenChat: (() -> Void)?
    @State private var showDisputeSheet = false
    @State private var showReviewSheet = false
    @State private var showConfirmAlert = false
    
    var body: some View {
        HStack(spacing: 12) {
            Circle()
                .fill(statusColor.opacity(0.15))
                .frame(width: 40, height: 40)
                .overlay(
                    Image(systemName: transaction.statusEnum.icon)
                        .font(.system(size: 16))
                        .foregroundColor(statusColor)
                )
            
            VStack(alignment: .leading, spacing: 3) {
                Text(transaction.offer?.title ?? "Покупка")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.white)
                    .lineLimit(1)
                
                Text(transaction.statusEnum.displayName)
                    .font(.system(size: 12))
                    .foregroundColor(statusColor)
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 4) {
                Text("-\(uzs(transaction.price))")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(.white)
                
                if transaction.statusEnum == .escrow {
                    HStack(spacing: 6) {
                        if transaction.offer?.sellerId != nil {
                            Button {
                                onOpenChat?()
                            } label: {
                                Text("Чат")
                                    .font(.system(size: 10, weight: .semibold))
                                    .foregroundColor(.perklyPurple)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 3)
                                    .background(Color.perklyPurple.opacity(0.12))
                                    .clipShape(Capsule())
                            }
                            .buttonStyle(.plain)
                        }

                        WalletPassButton(transaction: transaction, compact: true)

                        Button {
                            showConfirmAlert = true
                        } label: {
                            Text("Получено")
                                .font(.system(size: 10, weight: .semibold))
                                .foregroundColor(.perklyGreen)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(Color.perklyGreen.opacity(0.12))
                                .clipShape(Capsule())
                        }
                        .buttonStyle(.plain)
                    }
                } else if transaction.statusEnum == .completed {
                    HStack(spacing: 6) {
                        if transaction.offer?.sellerId != nil {
                            Button {
                                onOpenChat?()
                            } label: {
                                Text("Чат")
                                    .font(.system(size: 10, weight: .semibold))
                                    .foregroundColor(.perklyPurple)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 3)
                                    .background(Color.perklyPurple.opacity(0.12))
                                    .clipShape(Capsule())
                            }
                            .buttonStyle(.plain)
                        }

                        WalletPassButton(transaction: transaction, compact: true)

                        Button {
                            showReviewSheet = true
                        } label: {
                            Text("Оценить")
                                .font(.system(size: 10, weight: .semibold))
                                .foregroundColor(.perklyGold)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(Color.perklyGold.opacity(0.12))
                                .clipShape(Capsule())
                        }
                        .buttonStyle(.plain)
                        
                        Button {
                            showDisputeSheet = true
                        } label: {
                            Text("Спор")
                                .font(.system(size: 10, weight: .semibold))
                                .foregroundColor(.perklyOrange)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(Color.perklyOrange.opacity(0.12))
                                .clipShape(Capsule())
                        }
                        .buttonStyle(.plain)
                    }
                } else if transaction.canAddToAppleWallet {
                    WalletPassButton(transaction: transaction, compact: true)
                }
            }
        }
        .padding(.vertical, 6)
        .alert("Подтвердить получение?", isPresented: $showConfirmAlert) {
            Button("Отмена", role: .cancel) {}
            Button("Подтвердить") {
                onConfirm?()
            }
        } message: {
            Text("После подтверждения средства будут переведены продавцу, а сделка перейдет в завершенные.")
        }
        .sheet(isPresented: $showDisputeSheet) {
            OpenDisputeSheet(transactionId: transaction.id)
                .presentationDetents([.medium])
                .presentationDragIndicator(.visible)
        }
        .sheet(isPresented: $showReviewSheet) {
            LeaveReviewSheet(transaction: transaction)
                .presentationDetents([.large])
                .presentationDragIndicator(.visible)
        }
    }
    
    private var statusColor: Color {
        switch transaction.statusEnum {
        case .success, .completed, .activated: return .perklyGreen
        case .pending, .escrow, .paid: return .perklyGold
        case .failed, .cancelled: return .perklyRed
        case .refunded: return .perklyCyan
        case .disputed: return .perklyOrange
        }
    }
}

@MainActor
final class ActivePurchasesViewModel: ObservableObject {
    @Published var purchases: [Transaction] = []
    @Published var isLoading = false
    @Published var isLoadingMore = false
    @Published var error: String?

    private let service = TransactionsService.shared
    private let pageSize = 30
    private var total = 0

    var canLoadMore: Bool {
        purchases.count < total
    }

    func load(reset: Bool = true) async {
        if reset {
            purchases = []
            total = 0
        }
        isLoading = true
        error = nil

        do {
            let response = try await service.list(skip: 0, take: pageSize)
            purchases = response.data.sorted {
                ($0.createdAt ?? "") > ($1.createdAt ?? "")
            }
            total = response.total
        } catch is CancellationError {
            // Navigation cancellation should not replace the screen with an error.
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    func loadMore() async {
        guard !isLoading, !isLoadingMore, purchases.count < total else { return }
        isLoadingMore = true
        defer { isLoadingMore = false }

        do {
            let response = try await service.list(skip: purchases.count, take: pageSize)
            let existingIDs = Set(purchases.map(\.id))
            purchases.append(contentsOf: response.data.filter { !existingIDs.contains($0.id) })
            total = response.total
        } catch is CancellationError {
            return
        } catch {
            self.error = error.localizedDescription
        }
    }

    func confirm(_ transaction: Transaction) async {
        do {
            _ = try await service.confirm(transaction.id)
            await load(reset: true)
        } catch {
            self.error = error.localizedDescription
        }
    }
}

private enum PurchaseSection: String, CaseIterable, Identifiable {
    case active
    case attention
    case disputed
    case history

    var id: String { rawValue }

    var title: String {
        switch self {
        case .active: return "Активные"
        case .attention: return "Ждут действия"
        case .disputed: return "Споры"
        case .history: return "Завершённые"
        }
    }

    func contains(_ transaction: Transaction) -> Bool {
        switch self {
        case .active:
            return transaction.statusEnum == .success ||
                transaction.statusEnum == .activated ||
                (transaction.statusEnum == .paid && transaction.isTimeActive)
        case .attention:
            return transaction.statusEnum == .pending ||
                transaction.statusEnum == .paid ||
                transaction.statusEnum == .escrow
        case .disputed:
            return transaction.statusEnum == .disputed
        case .history:
            return transaction.statusEnum == .completed ||
                transaction.statusEnum == .cancelled ||
                transaction.statusEnum == .refunded ||
                transaction.statusEnum == .failed
        }
    }
}

struct ActivePurchasesView: View {
    @StateObject private var vm = ActivePurchasesViewModel()
    @EnvironmentObject private var authVM: AuthViewModel
    @State private var selectedSection: PurchaseSection = .active
    @State private var activeChatRoom: ChatRoom?
    @State private var chatError: String?

    private var visiblePurchases: [Transaction] {
        vm.purchases.filter(selectedSection.contains)
    }

    var body: some View {
        ZStack {
            Color.perklyDark.ignoresSafeArea()

            if vm.isLoading && vm.purchases.isEmpty {
                PerklyContentStateView(
                    kind: .loading,
                    icon: "",
                    title: "Загружаем покупки"
                )
            } else if let error = vm.error, vm.purchases.isEmpty {
                PerklyContentStateView(
                    kind: .error,
                    icon: "exclamationmark.triangle.fill",
                    title: "Не удалось загрузить покупки",
                    message: error,
                    actionTitle: "Повторить"
                ) {
                    Task { await vm.load(reset: true) }
                }
            } else {
                ScrollView(.vertical, showsIndicators: false) {
                    VStack(spacing: 16) {
                        header

                        purchaseSections

                        if let error = vm.error {
                            Text(error)
                                .font(.system(size: 13))
                                .foregroundColor(.perklyRed)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(14)
                                .background(Color.perklyRed.opacity(0.1))
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                        }

                        if visiblePurchases.isEmpty {
                            emptyState
                        } else {
                            ForEach(visiblePurchases) { purchase in
                                ActivePurchaseRow(
                                    transaction: purchase,
                                    onConfirm: { Task { await vm.confirm(purchase) } },
                                    onOpenChat: { Task { await openChat(for: purchase) } }
                                )
                                .onAppear {
                                    if purchase.id == visiblePurchases.last?.id {
                                        Task { await vm.loadMore() }
                                    }
                                }
                            }

                            if vm.isLoadingMore {
                                ProgressView()
                                    .tint(.perklyPurple)
                                    .padding(.vertical, 12)
                            }
                        }
                    }
                    .padding(20)
                }
                .refreshable {
                    await vm.load(reset: true)
                }
            }
        }
        .navigationTitle("Покупки")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await vm.load(reset: true)
        }
        .fullScreenCover(item: $activeChatRoom) { room in
            NavigationStack {
                ChatRoomView(room: room)
                    .environmentObject(authVM)
            }
        }
        .alert("Не удалось открыть чат", isPresented: .init(
            get: { chatError != nil },
            set: { if !$0 { chatError = nil } }
        )) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(chatError ?? "Попробуйте позже")
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Все покупки в одном месте")
                .font(.system(size: 22, weight: .bold))
                .foregroundColor(.white)

            Text("Статус, срок действия и следующий шаг по каждой операции.")
                .font(.system(size: 14))
                .foregroundColor(.white.opacity(0.5))
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var purchaseSections: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(PurchaseSection.allCases) { section in
                    Button {
                        withAnimation(.spring(response: 0.28, dampingFraction: 0.84)) {
                            selectedSection = section
                        }
                    } label: {
                        HStack(spacing: 7) {
                            Text(section.title)
                            let count = vm.purchases.filter(section.contains).count
                            if count > 0 {
                                Text("\(count)")
                                    .font(.system(size: 10, weight: .black))
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 3)
                                    .background(Color.white.opacity(0.14))
                                    .clipShape(Capsule())
                            }
                        }
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(selectedSection == section ? .black : .white.opacity(0.66))
                        .padding(.horizontal, 13)
                        .frame(height: PerklyDesign.Size.minimumTouchTarget)
                        .background(selectedSection == section ? Color.white : Color.white.opacity(0.06))
                        .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 14) {
            Image(systemName: "checkmark.seal")
                .font(.system(size: 42))
                .foregroundColor(.white.opacity(0.2))

            Text("В разделе пока пусто")
                .font(.system(size: 17, weight: .bold))
                .foregroundColor(.white)

            Text(emptyMessage)
                .font(.system(size: 14))
                .foregroundColor(.white.opacity(0.45))
                .multilineTextAlignment(.center)

            if vm.canLoadMore {
                Button {
                    Task { await vm.loadMore() }
                } label: {
                    Text("Проверить следующие операции")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.black)
                        .padding(.horizontal, 16)
                        .frame(height: PerklyDesign.Size.minimumTouchTarget)
                        .background(Color.white)
                        .clipShape(Capsule())
                }
                .buttonStyle(.plain)
                .disabled(vm.isLoadingMore)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 44)
        .perklySurface(cornerRadius: 20)
    }

    private var emptyMessage: String {
        switch selectedSection {
        case .active: return "Действующие купоны, подписки и доступы появятся здесь."
        case .attention: return "Сейчас нет операций, которые требуют вашего действия."
        case .disputed: return "У вас нет покупок с открытым спором."
        case .history: return "Завершённые и отменённые операции появятся здесь."
        }
    }

    private func openChat(for transaction: Transaction) async {
        guard let sellerId = transaction.offer?.sellerId else {
            chatError = "Продавец для этой покупки не найден."
            return
        }
        do {
            activeChatRoom = try await ChatService.shared.createOrGetDirectRoom(targetUserId: sellerId)
        } catch {
            chatError = error.localizedDescription
        }
    }
}

struct ActivePurchaseRow: View {
    let transaction: Transaction
    let onConfirm: () -> Void
    let onOpenChat: () -> Void
    @State private var showConfirmAlert = false
    @State private var showDisputeSheet = false

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 8) {
                Label(statusText, systemImage: transaction.statusEnum.icon)
                    .font(.system(size: 11, weight: .black))
                    .foregroundStyle(statusColor)
                    .padding(.horizontal, 10)
                    .frame(height: 28)
                    .background(statusColor.opacity(0.13))
                    .clipShape(Capsule())

                Spacer()

                Text(createdDateCompact)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.34))
            }

            HStack(spacing: 12) {
                AsyncImage(url: URL(string: transaction.offer?.safeProductThumbnail ?? "")) { phase in
                    if case .success(let image) = phase {
                        image.resizable().scaledToFill()
                    } else {
                        Color.white.opacity(0.05)
                            .overlay(Image(systemName: "bag.fill").foregroundStyle(.white.opacity(0.3)))
                    }
                }
                .frame(width: 58, height: 58)
                .clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))

                VStack(alignment: .leading, spacing: 4) {
                    Text("ВЫ КУПИЛИ")
                        .font(.system(size: 9, weight: .black))
                        .tracking(0.9)
                        .foregroundStyle(.white.opacity(0.34))
                    Text(transaction.offer?.title ?? "Покупка")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.white)
                        .lineLimit(2)
                }

                Spacer()

                Text("\(uzs(transaction.price))")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(.white)
            }

            HStack(alignment: .top, spacing: 11) {
                Image(systemName: nextActionIcon)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(statusColor)
                    .frame(width: 30, height: 30)
                    .background(statusColor.opacity(0.12))
                    .clipShape(Circle())
                VStack(alignment: .leading, spacing: 3) {
                    Text("Следующий шаг")
                        .font(.system(size: 10, weight: .black))
                        .foregroundStyle(.white.opacity(0.36))
                    Text(nextActionText)
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.white.opacity(0.82))
                }
                Spacer()
            }
            .padding(12)
            .background(Color.white.opacity(0.045))
            .clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))

            if transaction.expirationDate != nil {
                HStack(spacing: 10) {
                    ActivePurchaseMeta(title: "Осталось", value: timeLeftText)
                    ActivePurchaseMeta(title: "Действует до", value: expirationText)
                }
            }

            if transaction.canAddToAppleWallet {
                WalletPassButton(transaction: transaction)
            }

            if transaction.statusEnum == .escrow {
                HStack(spacing: 10) {
                    Button("Чат", action: onOpenChat)
                        .purchaseActionStyle(tint: .perklyPurple)

                    Button("Открыть спор") {
                        showDisputeSheet = true
                    }
                    .purchaseActionStyle(tint: .perklyOrange)

                    Button("Подтвердить") {
                        showConfirmAlert = true
                    }
                    .purchaseActionStyle(tint: .perklyGreen)
                }
            }

            HStack(spacing: 10) {
                NavigationLink(destination: OfferDetailView(offerId: transaction.offerId)) {
                    Label("Товар", systemImage: "bag")
                        .frame(maxWidth: .infinity)
                        .frame(height: PerklyDesign.Size.minimumTouchTarget)
                        .background(Color.white.opacity(0.05))
                        .clipShape(RoundedRectangle(cornerRadius: PerklyDesign.Radius.control))
                }
                .buttonStyle(.plain)

                NavigationLink(destination: PurchaseDetailView(transaction: transaction)) {
                    Label("Детали", systemImage: "list.bullet.rectangle")
                        .frame(maxWidth: .infinity)
                        .frame(height: PerklyDesign.Size.minimumTouchTarget)
                        .background(Color.white.opacity(0.05))
                        .clipShape(RoundedRectangle(cornerRadius: PerklyDesign.Radius.control))
                }
                .buttonStyle(.plain)
            }
            .font(.system(size: 13, weight: .bold))
            .foregroundColor(.white.opacity(0.72))

            if transaction.canRevealAccessData, transaction.offer != nil {
                NavigationLink {
                    if let offer = transaction.offer {
                        PurchasedPromocodeView(
                            offer: offer,
                            transaction: transaction,
                            giftCode: transaction.giftCode
                        )
                    }
                } label: {
                    HStack(spacing: 12) {
                        Image(
                            systemName: transaction.isGift == true || transaction.offer?.fulfillment.usesQRCode == true
                                ? "qrcode.viewfinder"
                                : "bag.fill"
                        )
                            .font(.system(size: 20, weight: .bold))
                            .foregroundStyle(Color.perklyGreen)

                        VStack(alignment: .leading, spacing: 3) {
                            Text(
                                transaction.isGift == true
                                    ? "Открыть подарок"
                                    : (transaction.offer?.fulfillment.usesQRCode == true ? "Открыть промокод" : "Открыть покупку")
                            )
                                .font(.system(size: 14, weight: .bold))
                                .foregroundStyle(.white)
                            Text(
                                transaction.isGift == true || transaction.offer?.fulfillment.usesQRCode == true
                                    ? "QR-код и инструкция"
                                    : "Данные и инструкция"
                            )
                                .font(.system(size: 11, weight: .medium))
                                .foregroundStyle(.white.opacity(0.46))
                        }

                        Spacer()

                        Image(systemName: "chevron.right")
                            .font(.system(size: 11, weight: .black))
                            .foregroundStyle(.white.opacity(0.4))
                    }
                    .padding(13)
                    .perklyGlass(
                        cornerRadius: 16,
                        tint: Color.perklyGreen.opacity(0.1),
                        isInteractive: true
                    )
                }
                .buttonStyle(PerklyPressStyle())
            } else if transaction.statusEnum == .escrow {
                Text("Код появится здесь после подтверждения покупки сервером.")
                    .font(.system(size: 12))
                    .foregroundColor(.white.opacity(0.45))
            }
        }
        .padding(16)
        .perklySurface(cornerRadius: 18)
        .alert("Подтвердить получение?", isPresented: $showConfirmAlert) {
            Button("Отмена", role: .cancel) {}
            Button("Подтвердить", action: onConfirm)
        } message: {
            Text("После подтверждения средства будут переведены продавцу.")
        }
        .sheet(isPresented: $showDisputeSheet) {
            OpenDisputeSheet(transactionId: transaction.id)
                .presentationDetents([.medium])
                .presentationDragIndicator(.visible)
        }
    }

    private var statusText: String {
        transaction.statusEnum.displayName
    }

    private var nextActionText: String {
        switch transaction.statusEnum {
        case .pending: return "Дождитесь подтверждения оплаты"
        case .paid: return "Предложение готово к использованию"
        case .escrow: return "Подтвердите получение после проверки"
        case .disputed: return "Следите за ответом в разделе споров"
        case .success, .activated: return "Данные покупки доступны ниже"
        case .completed: return "Откройте покупку — данные и инструкция сохранены"
        case .cancelled: return "Операция отменена"
        case .refunded: return "Средства возвращены"
        case .failed: return "Оплата не прошла"
        }
    }

    private var nextActionIcon: String {
        switch transaction.statusEnum {
        case .pending, .escrow: return "clock.fill"
        case .disputed: return "exclamationmark.shield.fill"
        case .failed, .cancelled: return "xmark.circle.fill"
        case .refunded: return "arrow.uturn.backward.circle.fill"
        default: return "checkmark.circle.fill"
        }
    }

    private var timeLeftText: String {
        guard let expirationDate = transaction.expirationDate else { return "Без срока" }
        let seconds = expirationDate.timeIntervalSince(Date())
        if seconds <= 0 { return "Истекло" }
        if seconds < 3600 { return "Меньше часа" }
        if seconds < 86_400 { return "\(Int(ceil(seconds / 3600))) ч" }
        return "\(Int(ceil(seconds / 86_400))) дн."
    }

    private var expirationText: String {
        guard let expirationDate = transaction.expirationDate else { return "Не указано" }
        let formatter = DateFormatter()
        formatter.locale = L10n.locale
        formatter.dateFormat = "dd MMM yyyy"
        return formatter.string(from: expirationDate)
    }

    private var createdDateCompact: String {
        guard let raw = transaction.createdAt else { return "" }
        let input = ISO8601DateFormatter()
        input.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let date = input.date(from: raw) ?? ISO8601DateFormatter().date(from: raw)
        guard let date else { return "" }
        let formatter = DateFormatter()
        formatter.locale = L10n.locale
        formatter.dateFormat = "d MMM"
        return formatter.string(from: date)
    }

    private var statusColor: Color {
        switch transaction.statusEnum {
        case .success, .completed, .activated: return .perklyGreen
        case .pending, .escrow, .paid: return .perklyGold
        case .failed, .cancelled: return .perklyRed
        case .refunded: return .perklyCyan
        case .disputed: return .perklyOrange
        }
    }
}

private struct PurchaseDetailView: View {
    let transaction: Transaction
    @EnvironmentObject private var authVM: AuthViewModel
    @State private var activeChatRoom: ChatRoom?
    @State private var chatError: String?

    private var accessData: String? {
        guard transaction.canRevealAccessData,
              let value = transaction.offer?.hiddenData,
              !value.isEmpty else { return nil }
        return value
    }

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(alignment: .leading, spacing: PerklyDesign.Spacing.lg) {
                VStack(alignment: .leading, spacing: 10) {
                    Label(transaction.statusEnum.displayName, systemImage: transaction.statusEnum.icon)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(statusColor)

                    Text(transaction.offer?.safeTitle ?? "Покупка")
                        .font(.system(size: 25, weight: .black))
                        .foregroundColor(.white)

                    Text("\(uzs(transaction.price))")
                        .font(.system(size: 28, weight: .heavy))
                        .foregroundColor(.perklyGreen)
                }

                PurchaseStatusTimeline(status: transaction.statusEnum)

                VStack(alignment: .leading, spacing: 9) {
                    Text("ЧТО ДЕЛАТЬ ДАЛЬШЕ")
                        .font(.system(size: 10, weight: .black))
                        .tracking(1)
                        .foregroundStyle(.white.opacity(0.38))
                    Text(detailNextStep)
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(.white)
                    if let instructions = transaction.offer?.usageInstructions,
                       !instructions.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                        Text(instructions)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(.white.opacity(0.52))
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(16)
                .background(statusColor.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: PerklyDesign.Radius.card, style: .continuous))

                VStack(spacing: 0) {
                    detailRow("Номер операции", value: shortTransactionID)
                    Divider().overlay(Color.white.opacity(0.07))
                    detailRow("Дата", value: createdDateText)
                    Divider().overlay(Color.white.opacity(0.07))
                    detailRow("Продавец", value: transaction.offer?.seller?.displayName ?? "Продавец Perkly")
                    if let expirationText {
                        Divider().overlay(Color.white.opacity(0.07))
                        detailRow("Действует до", value: expirationText)
                    }
                }
                .padding(.horizontal, 16)
                .background(Color.white.opacity(0.05))
                .clipShape(RoundedRectangle(cornerRadius: PerklyDesign.Radius.card))

                if let accessData {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("ДАННЫЕ ДОСТУПА")
                            .font(.system(size: 11, weight: .black))
                            .tracking(1.1)
                            .foregroundColor(.white.opacity(0.4))
                        Text(accessData)
                            .font(.system(size: 16, weight: .bold, design: .monospaced))
                            .foregroundColor(.white)
                            .textSelection(.enabled)
                        Button {
                            UIPasteboard.general.string = accessData
                            HapticManager.shared.lightImpact()
                        } label: {
                            Label("Скопировать", systemImage: "doc.on.doc")
                                .font(.system(size: 13, weight: .bold))
                                .frame(maxWidth: .infinity)
                                .frame(height: PerklyDesign.Size.minimumTouchTarget)
                        }
                        .buttonStyle(.bordered)
                        .tint(.perklyPurple)
                    }
                    .padding(16)
                    .background(Color.white.opacity(0.05))
                    .clipShape(RoundedRectangle(cornerRadius: PerklyDesign.Radius.card))
                }

                if transaction.canRevealAccessData, let offer = transaction.offer {
                    NavigationLink {
                        PurchasedPromocodeView(
                            offer: offer,
                            transaction: transaction,
                            giftCode: transaction.giftCode
                        )
                    } label: {
                        HStack(spacing: 12) {
                            Image(systemName: offer.fulfillment.usesQRCode ? "qrcode.viewfinder" : "shippingbox.fill")
                                .font(.system(size: 19, weight: .bold))
                                .foregroundStyle(Color.perklyGreen)
                            VStack(alignment: .leading, spacing: 3) {
                                Text(offer.fulfillment.usesQRCode ? "Открыть код покупки" : "Открыть покупку")
                                    .font(.system(size: 15, weight: .bold))
                                Text("Доступ, инструкция и дальнейшие действия")
                                    .font(.system(size: 11, weight: .medium))
                                    .foregroundStyle(.white.opacity(0.44))
                            }
                            Spacer()
                            Image(systemName: "chevron.right")
                        }
                        .foregroundStyle(.white)
                        .padding(16)
                        .background(Color.perklyGreen.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }

                if transaction.offer?.sellerId != nil {
                    Button {
                        Task { await openSellerChat() }
                    } label: {
                        Label("Написать продавцу", systemImage: "message.fill")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 52)
                            .background(Color.white.opacity(0.07))
                            .clipShape(RoundedRectangle(cornerRadius: 17, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }

                if transaction.canAddToAppleWallet {
                    WalletPassButton(transaction: transaction)
                }

                NavigationLink(destination: OfferDetailView(offerId: transaction.offerId)) {
                    Label("Открыть карточку товара", systemImage: "bag")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 52)
                        .background(Color.white.opacity(0.07))
                        .clipShape(RoundedRectangle(cornerRadius: 17, style: .continuous))
                }
                .buttonStyle(.plain)
            }
            .padding(PerklyDesign.Spacing.lg)
        }
        .background(Color.perklyDark.ignoresSafeArea())
        .navigationTitle("Детали покупки")
        .navigationBarTitleDisplayMode(.inline)
        .fullScreenCover(item: $activeChatRoom) { room in
            NavigationStack {
                ChatRoomView(room: room)
                    .environmentObject(authVM)
            }
        }
        .alert("Не удалось открыть чат", isPresented: .init(
            get: { chatError != nil },
            set: { if !$0 { chatError = nil } }
        )) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(chatError ?? "Попробуйте позже")
        }
    }

    private func detailRow(_ title: String, value: String) -> some View {
        HStack(alignment: .top) {
            Text(title).foregroundColor(.white.opacity(0.48))
            Spacer(minLength: 20)
            Text(value)
                .foregroundColor(.white)
                .multilineTextAlignment(.trailing)
        }
        .font(.system(size: 13, weight: .medium))
        .padding(.vertical, 13)
    }

    private var detailNextStep: String {
        switch transaction.statusEnum {
        case .pending: return "Дождитесь подтверждения оплаты — обновлять экран вручную не нужно."
        case .paid, .success, .activated: return "Откройте покупку и выполните инструкцию продавца."
        case .escrow: return "Проверьте товар, затем подтвердите получение или откройте спор."
        case .disputed: return "Следите за решением и сообщениями поддержки."
        case .completed: return "Покупка завершена. Данные и инструкция остаются доступными здесь."
        case .cancelled: return "Заказ отменён. При необходимости оформите его заново из карточки товара."
        case .refunded: return "Возврат оформлен; проверьте баланс Perkly."
        case .failed: return "Оплата не прошла. Откройте товар и повторите покупку."
        }
    }

    private func openSellerChat() async {
        guard let sellerId = transaction.offer?.sellerId else { return }
        do {
            activeChatRoom = try await ChatService.shared.createOrGetDirectRoom(targetUserId: sellerId)
        } catch {
            chatError = error.localizedDescription
        }
    }

    private var shortTransactionID: String {
        String(transaction.id.prefix(12)).uppercased()
    }

    private var createdDateText: String {
        guard let raw = transaction.createdAt else { return "Не указана" }
        let fractional = ISO8601DateFormatter()
        fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let date = fractional.date(from: raw) ?? ISO8601DateFormatter().date(from: raw)
        guard let date else { return raw }
        return date.formatted(date: .abbreviated, time: .shortened)
    }

    private var expirationText: String? {
        transaction.expirationDate?.formatted(date: .abbreviated, time: .omitted)
    }

    private var statusColor: Color {
        switch transaction.statusEnum {
        case .success, .completed, .activated: return .perklyGreen
        case .pending, .paid, .escrow: return .perklyGold
        case .failed, .cancelled: return .perklyRed
        case .refunded: return .perklyCyan
        case .disputed: return .perklyOrange
        }
    }
}

struct PurchaseCenterView: View {
    let transactionId: String
    @State private var transaction: Transaction?
    @State private var errorText: String?

    var body: some View {
        Group {
            if let transaction {
                PurchaseDetailView(transaction: transaction)
            } else if let errorText {
                PerklyContentStateView(
                    kind: .error,
                    icon: "exclamationmark.triangle.fill",
                    title: "Не удалось открыть покупку",
                    message: errorText,
                    actionTitle: "Повторить"
                ) {
                    Task { await load() }
                }
            } else {
                PerklyContentStateView(
                    kind: .loading,
                    icon: "",
                    title: "Открываем покупку"
                )
            }
        }
        .background(Color.perklyDark.ignoresSafeArea())
        .task(id: transactionId) { await load() }
    }

    @MainActor
    private func load() async {
        errorText = nil
        do {
            transaction = try await TransactionsService.shared.getById(transactionId)
        } catch {
            errorText = error.localizedDescription
        }
    }
}

private struct PurchaseStatusTimeline: View {
    let status: TransactionStatus

    private var currentStep: Int {
        switch status {
        case .pending: return 0
        case .paid, .escrow, .disputed: return 1
        case .success, .completed, .activated, .refunded: return 2
        case .failed, .cancelled: return 0
        }
    }

    var body: some View {
        HStack(spacing: 6) {
            timelineStep("Создана", index: 0)
            connector(completed: currentStep >= 1)
            timelineStep("Оплачена", index: 1)
            connector(completed: currentStep >= 2)
            timelineStep("Готова", index: 2)
        }
        .padding(16)
        .background(Color.white.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: PerklyDesign.Radius.card))
    }

    private func timelineStep(_ title: String, index: Int) -> some View {
        VStack(spacing: 6) {
            Image(systemName: index <= currentStep ? "checkmark.circle.fill" : "circle")
                .foregroundColor(index <= currentStep ? .perklyGreen : .white.opacity(0.2))
            Text(title)
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(.white.opacity(index <= currentStep ? 0.76 : 0.32))
        }
    }

    private func connector(completed: Bool) -> some View {
        Capsule()
            .fill(completed ? Color.perklyGreen : Color.white.opacity(0.1))
            .frame(maxWidth: .infinity)
            .frame(height: 3)
            .offset(y: -9)
    }
}

private extension View {
    func purchaseActionStyle(tint: Color) -> some View {
        self
            .font(.system(size: 11, weight: .bold))
            .foregroundColor(tint)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 9)
            .background(tint.opacity(0.12))
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .buttonStyle(.plain)
    }
}

struct WalletPassButton: View {
    let transaction: Transaction
    var compact = false

    @State private var isLoading = false
    @State private var walletPass: PKPass?
    @State private var showWalletSheet = false
    @State private var errorMessage: String?

    var body: some View {
        Button {
            Task { await addToWallet() }
        } label: {
            if compact {
                HStack(spacing: 4) {
                    if isLoading {
                        ProgressView()
                            .tint(.white)
                            .scaleEffect(0.55)
                    } else {
                        Image(systemName: "wallet.pass")
                            .font(.system(size: 10, weight: .semibold))
                    }
                    Text("Wallet")
                        .font(.system(size: 10, weight: .semibold))
                }
                .foregroundColor(.white)
                .padding(.horizontal, 8)
                .padding(.vertical, 3)
                .background(Color.white.opacity(0.12))
                .clipShape(Capsule())
            } else {
                HStack(spacing: 8) {
                    if isLoading {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Image(systemName: "wallet.pass")
                            .font(.system(size: 15, weight: .semibold))
                    }
                    Text("Добавить в Apple Wallet")
                        .font(.system(size: 14, weight: .bold))
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(Color.black.opacity(0.28))
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .stroke(Color.white.opacity(0.12), lineWidth: 1)
                )
                .clipShape(RoundedRectangle(cornerRadius: 14))
            }
        }
        .buttonStyle(.plain)
        .disabled(isLoading || !transaction.canAddToAppleWallet)
        .sheet(isPresented: $showWalletSheet) {
            if let walletPass {
                WalletAddPassView(pass: walletPass)
                    .ignoresSafeArea()
            }
        }
        .alert("Apple Wallet", isPresented: Binding(
            get: { errorMessage != nil },
            set: { if !$0 { errorMessage = nil } }
        )) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(errorMessage ?? "")
        }
    }

    @MainActor
    private func addToWallet() async {
        guard PKAddPassesViewController.canAddPasses() else {
            errorMessage = "Apple Wallet недоступен на этом устройстве."
            return
        }

        isLoading = true
        defer { isLoading = false }

        do {
            let data = try await WalletService.shared.downloadTransactionPass(transactionId: transaction.id)
            let pass = try PKPass(data: data)

            if PKPassLibrary().containsPass(pass) {
                errorMessage = "Этот pass уже добавлен в Apple Wallet."
                return
            }

            walletPass = pass
            showWalletSheet = true
        } catch {
            errorMessage = walletErrorMessage(error)
        }
    }

    private func walletErrorMessage(_ error: Error) -> String {
        if let apiError = error as? APIError {
            switch apiError {
            case .serverError(404, _):
                return "Apple Wallet пока недоступен: сервер еще не обновлен."
            case .serverError(503, _):
                return "Apple Wallet временно недоступен: сертификаты pass не настроены на сервере."
            case .unauthorized:
                return "Войдите в аккаунт, чтобы добавить pass в Apple Wallet."
            default:
                return apiError.localizedDescription
            }
        }

        return "Не удалось открыть pass. Проверьте подключение и попробуйте еще раз."
    }
}

struct WalletAddPassView: UIViewControllerRepresentable {
    let pass: PKPass

    func makeUIViewController(context: Context) -> UIViewController {
        PKAddPassesViewController(pass: pass) ?? UIViewController()
    }

    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {}
}

struct ActivePurchaseMeta: View {
    let title: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(title)
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(.white.opacity(0.45))

            Text(value)
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(Color.white.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}

// MARK: - Top Up Sheet
struct TopUpSheet: View {
    @ObservedObject var vm: ProfileViewModel
    var onSuccess: () -> Void
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject private var authVM: AuthViewModel
    
    let quickAmounts = [50_000, 100_000, 250_000, 500_000, 1_000_000]
    
    var body: some View {
        NavigationStack {
            ZStack {
                Color.perklyDark.ignoresSafeArea()

                ScrollView(.vertical, showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 22) {
                        VStack(alignment: .leading, spacing: 7) {
                            Text("Текущий баланс")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(.white.opacity(0.46))
                            Text(uzs(authVM.user?.balance ?? 0))
                                .font(.system(size: 30, weight: .black, design: .rounded))
                                .foregroundStyle(.white)
                        }

                        VStack(alignment: .leading, spacing: 10) {
                            Text("Сумма пополнения")
                                .font(.system(size: 13, weight: .bold))
                                .foregroundStyle(.white.opacity(0.56))

                            HStack(alignment: .firstTextBaseline, spacing: 8) {
                                TextField("0", text: $vm.topUpAmount)
                                    .keyboardType(.numberPad)
                                    .font(.system(size: 36, weight: .black, design: .rounded))
                                    .foregroundStyle(.white)
                                Text("so‘m")
                                    .font(.system(size: 17, weight: .bold))
                                    .foregroundStyle(.white.opacity(0.38))
                            }
                            .padding(.horizontal, 18)
                            .frame(height: 76)
                            .background(Color.white.opacity(0.055))
                            .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                        }

                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 9) {
                                ForEach(quickAmounts, id: \.self) { amount in
                                    Button {
                                        vm.topUpAmount = "\(amount)"
                                        HapticManager.shared.playSelection()
                                    } label: {
                                        Text(shortAmount(amount))
                                            .font(.system(size: 13, weight: .bold))
                                            .foregroundStyle(vm.topUpAmount == "\(amount)" ? .black : .white.opacity(0.72))
                                            .padding(.horizontal, 15)
                                            .frame(height: 42)
                                            .background(vm.topUpAmount == "\(amount)" ? Color.white : Color.white.opacity(0.06))
                                            .clipShape(Capsule())
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }

                        VStack(spacing: 0) {
                            HStack(spacing: 13) {
                                Image(systemName: "creditcard.fill")
                                    .font(.system(size: 17, weight: .bold))
                                    .foregroundStyle(.white)
                                    .frame(width: 40, height: 40)
                                    .background(Color.white.opacity(0.08))
                                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

                                VStack(alignment: .leading, spacing: 3) {
                                    Text("Оплата через Click")
                                        .font(.system(size: 15, weight: .bold))
                                        .foregroundStyle(.white)
                                    Text("Откроем защищённую страницу оплаты")
                                        .font(.system(size: 12, weight: .medium))
                                        .foregroundStyle(.white.opacity(0.44))
                                }
                                Spacer()
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundStyle(Color.perklyGreen)
                            }
                            .padding(16)
                        }
                        .background(Color.white.opacity(0.045))
                        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))

                        if let error = vm.error {
                            Label(error, systemImage: "exclamationmark.circle.fill")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(.perklyRed)
                        }

                        Button {
                            Task {
                                await vm.topUp()
                                if let urlString = vm.paymentUrl, let url = URL(string: urlString) {
                                    await UIApplication.shared.open(url)
                                    dismiss()
                                }
                            }
                        } label: {
                            HStack(spacing: 10) {
                                if vm.isTopUpLoading {
                                    ProgressView().tint(.black)
                                }
                                Text(vm.isTopUpLoading ? "Создаём платёж" : "Перейти к оплате")
                                    .font(.system(size: 16, weight: .black))
                            }
                            .foregroundColor(.black)
                            .frame(maxWidth: .infinity)
                            .frame(height: 56)
                            .background(Color.white)
                            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                        }
                        .buttonStyle(.plain)
                        .disabled(vm.isTopUpLoading || normalizedAmount < 1_000)
                        .opacity(normalizedAmount < 1_000 ? 0.42 : 1)

                        Label("Минимальная сумма — 1 000 so‘m. Зачисление обычно происходит сразу после подтверждения Click.", systemImage: "lock.shield.fill")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(.white.opacity(0.35))
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .padding(20)
                }
            }
            .navigationTitle("Пополнить баланс")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Закрыть") { dismiss() }
                }
            }
        }
    }

    private var normalizedAmount: Int {
        Int(vm.topUpAmount.filter(\.isNumber)) ?? 0
    }

    private func shortAmount(_ amount: Int) -> String {
        amount >= 1_000_000 ? "1 млн" : "+\(amount / 1_000) тыс."
    }
}

// MARK: - Color Extensions

extension Color {
    static var perklyPlatinum: Color {
        Color(red: 0.9, green: 0.9, blue: 0.94)
    }
}

// MARK: - Profile & Support Sheets Consolidated

struct EditProfileSheet: View {
    @ObservedObject var vm: ProfileViewModel
    let currentName: String
    let currentAvatar: String
    let onSuccess: () -> Void
    
    @Environment(\.dismiss) var dismiss
    @State private var displayName: String = ""
    @State private var avatarUrl: String = ""
    @State private var selectedAvatarItem: PhotosPickerItem?
    @State private var selectedAvatarData: Data?
    @State private var isLoading = false
    @State private var errorText: String?
    
    var body: some View {
        NavigationStack {
            ZStack {
                Color.perklyDark.ignoresSafeArea()
                
                VStack(spacing: 24) {
                    // Preview
                    VStack(spacing: 16) {
                        ZStack {
                            Circle()
                                .fill(Color.primaryGradient)
                                .frame(width: 100, height: 100)
                            
                            if let selectedAvatarData, let image = UIImage(data: selectedAvatarData) {
                                Image(uiImage: image)
                                    .resizable().aspectRatio(contentMode: .fill)
                                    .frame(width: 100, height: 100)
                                    .clipShape(Circle())
                            } else if !avatarUrl.isEmpty, let url = RemoteImageURL.url(from: avatarUrl) {
                                AsyncImage(url: url) { image in
                                    image.resizable().aspectRatio(contentMode: .fill)
                                } placeholder: {
                                    ProgressView().tint(.white)
                                }
                                .frame(width: 100, height: 100)
                                .clipShape(Circle())
                            } else {
                                Image(systemName: "person.fill")
                                    .font(.system(size: 40))
                                    .foregroundColor(.white.opacity(0.3))
                            }
                        }
                        .overlay(
                            Circle()
                                .stroke(Color.white.opacity(0.1), lineWidth: 4)
                        )
                        
                        Text("Предпросмотр")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(.white.opacity(0.4))
                    }
                    .padding(.top, 20)
                    
                    VStack(spacing: 16) {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Имя")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(.white.opacity(0.7))
                            TextField("Как вас называть?", text: $displayName)
                                .padding()
                                .background(Color.white.opacity(0.05))
                                .cornerRadius(12)
                                .foregroundColor(.white)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(Color.white.opacity(0.1), lineWidth: 1)
                                )
                        }
                        
                        PhotosPicker(selection: $selectedAvatarItem, matching: .images) {
                            HStack {
                                Image(systemName: "photo.on.rectangle.angled")
                                Text(selectedAvatarData == nil ? "Выбрать фотографию" : "Фотография выбрана")
                                Spacer()
                                Image(systemName: "chevron.right")
                            }
                            .foregroundColor(.white)
                            .padding()
                            .background(Color.white.opacity(0.05))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                    }
                    .padding(.horizontal, 24)
                    
                    if let error = errorText {
                        Text(error)
                            .font(.system(size: 14))
                            .foregroundColor(.perklyRed)
                            .padding(.horizontal, 24)
                    }
                    
                    Spacer()
                    
                    Button {
                        Task { await save() }
                    } label: {
                        HStack {
                            if isLoading {
                                ProgressView().tint(.black)
                            } else {
                                Text("Сохранить изменения")
                                    .font(.system(size: 16, weight: .bold))
                            }
                        }
                        .foregroundColor(.black)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(Color.white)
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                    }
                    .padding(.horizontal, 24)
                    .padding(.bottom, 20)
                    .disabled(isLoading || displayName.isEmpty)
                }
            }
            .navigationTitle("Профиль")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Отмена") { dismiss() }
                        .foregroundColor(.white.opacity(0.5))
                }
            }
            .onAppear {
                displayName = currentName
                avatarUrl = currentAvatar
            }
            .onChange(of: selectedAvatarItem) { _, item in
                Task { await loadAvatar(from: item) }
            }
        }
    }

    @MainActor
    private func loadAvatar(from item: PhotosPickerItem?) async {
        guard let item else { return }
        do {
            guard let data = try await item.loadTransferable(type: Data.self),
                  let image = UIImage(data: data),
                  let jpeg = image.jpegData(compressionQuality: 0.84),
                  jpeg.count <= 6 * 1024 * 1024 else {
                errorText = "Выберите JPG, PNG или WebP до 6 МБ"
                return
            }
            selectedAvatarData = jpeg
            errorText = nil
        } catch {
            errorText = "Не удалось прочитать фотографию"
        }
    }
    
    private func save() async {
        isLoading = true
        errorText = nil
        
        do {
            if let selectedAvatarData {
                let updated = try await UsersService.shared.uploadAvatar(jpegData: selectedAvatarData)
                avatarUrl = updated.avatarUrl ?? ""
            }
            try await vm.updateProfile(displayName: displayName, avatarUrl: avatarUrl)
            onSuccess()
            dismiss()
        } catch {
            errorText = error.localizedDescription
        }
        
        isLoading = false
    }
}

struct SubscriptionSheet: View {
    let currentTier: UserTier
    let initialCapabilities: PartnerCapabilities?
    let onSuccess: () -> Void
    @Environment(\.dismiss) var dismiss
    
    @State private var isLoading = false
    @State private var errorText: String?
    @State private var capabilities: PartnerCapabilities?
    @State private var selectedMonths = 1
    private let durationOptions = [1, 3, 12]

    init(
        currentTier: UserTier,
        initialCapabilities: PartnerCapabilities? = nil,
        onSuccess: @escaping () -> Void
    ) {
        self.currentTier = currentTier
        self.initialCapabilities = initialCapabilities
        self.onSuccess = onSuccess
    }
    
    var body: some View {
        NavigationStack {
            ZStack {
                Color.perklyDark.ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 24) {
                        // Header
                        VStack(spacing: 8) {
                            Text("Тарифы Perkly")
                                .font(.system(size: 28, weight: .bold))
                                .foregroundColor(.white)
                            
                            Text("Gold усиливает продажи и аналитику, Platinum открывает промо-публикации в Topka")
                                .font(.system(size: 15))
                                .foregroundColor(.white.opacity(0.6))
                                .multilineTextAlignment(.center)
                                .padding(.horizontal, 20)
                        }
                        .padding(.top, 20)

                        if let subscriptionStatus = capabilities ?? initialCapabilities {
                            SubscriptionTimerCard(capabilities: subscriptionStatus)
                                .padding(.horizontal, 20)
                        }
                        
                        if let err = errorText {
                            HStack {
                                Image(systemName: "exclamationmark.triangle.fill")
                                Text(err)
                            }
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(.perklyRed)
                            .padding()
                            .background(Color.perklyRed.opacity(0.15))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }

                        VStack(alignment: .leading, spacing: 10) {
                            Text("Срок")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(.white.opacity(0.6))

                            Picker("Срок", selection: $selectedMonths) {
                                ForEach(durationOptions, id: \.self) { months in
                                    Text("\(months) мес").tag(months)
                                }
                            }
                            .pickerStyle(.segmented)
                        }
                        .padding(.horizontal, 20)
                        
                        // Options
                        VStack(spacing: 16) {
                            // Gold
                            if currentTier == .silver {
                                SubscriptionCard(
                                    tierName: "GOLD",
                                    priceInfo: priceText(monthly: 59_880),
                                    badgeText: "Рекомендуем",
                                    color: .perklyGold,
                                    benefits: [
                                        "До 20 активных офферов",
                                        "Продвижение офферов",
                                        "Расширенная статистика",
                                        "Приоритетная поддержка"
                                    ],
                                    isLoading: isLoading
                                ) {
                                    Task { await subscribe(tier: "GOLD") }
                                }
                            }
                            
                            // Platinum
                            if currentTier == .silver || currentTier == .gold {
                                SubscriptionCard(
                                    tierName: "PLATINUM",
                                    priceInfo: priceText(monthly: 119_880),
                                    badgeText: "Topka",
                                    color: .perklyPlatinum,
                                    benefits: [
                                        "Публикация промо в Topka",
                                        "До 30 публикаций в месяц",
                                        "Максимальная аналитика",
                                        "Приоритет в городских подборках"
                                    ],
                                    isLoading: isLoading
                                ) {
                                    Task { await subscribe(tier: "PLATINUM") }
                                }
                            }
                            
                            if currentTier == .platinum {
                                Text("У вас уже максимальный уровень!")
                                    .font(.system(size: 16, weight: .semibold))
                                    .foregroundColor(.white.opacity(0.5))
                                    .padding(.top, 40)
                            }
                        }
                        .padding(.horizontal, 20)
                        
                        Spacer()
                    }
                    .padding(.bottom, 30)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .task {
                await loadCapabilities()
            }
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { dismiss() }) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.white.opacity(0.5))
                            .font(.system(size: 24))
                    }
                }
            }
        }
    }
    
    private func subscribe(tier: String) async {
        isLoading = true
        errorText = nil
        
        do {
            _ = try await UsersService.shared.subscribe(tier: tier, months: selectedMonths)
            
            DispatchQueue.main.async {
                HapticManager.shared.playPurchaseSuccess()
                onSuccess()
                dismiss()
            }
        } catch {
            errorText = error.localizedDescription
            HapticManager.shared.lightImpact()
        }
        
        isLoading = false
    }

    private func priceText(monthly: Double) -> String {
        let total = monthly * Double(selectedMonths)
        if selectedMonths == 1 {
            return "\(uzs(monthly)) / мес"
        }
        return "\(uzs(total)) / \(selectedMonths) мес"
    }

    @MainActor
    private func loadCapabilities() async {
        capabilities = (try? await SellerService.shared.getCapabilities()) ?? initialCapabilities
    }
}

struct SubscriptionTimerCard: View {
    let capabilities: PartnerCapabilities

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(color)
                .frame(width: 34, height: 34)
                .background(color.opacity(0.14))
                .clipShape(Circle())

            VStack(alignment: .leading, spacing: 5) {
                Text(capabilities.timerTitle)
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(.white)

                Text(capabilities.timerSubtitle)
                    .font(.system(size: 13))
                    .foregroundColor(.white.opacity(0.55))
                    .fixedSize(horizontal: false, vertical: true)
            }

            Spacer(minLength: 0)
        }
        .padding(16)
        .background(color.opacity(0.1))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(color.opacity(0.22), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private var icon: String {
        switch capabilities.status {
        case "ACTIVE": return "timer"
        case "EXPIRED": return "clock.badge.exclamationmark.fill"
        case "CANCELED": return "pause.circle.fill"
        default: return "clock"
        }
    }

    private var color: Color {
        switch capabilities.status {
        case "ACTIVE": return .perklyGreen
        case "EXPIRED": return .perklyRed
        case "CANCELED": return .perklyOrange
        default: return .white.opacity(0.45)
        }
    }
}

struct SubscriptionCard: View {
    let tierName: String
    let priceInfo: String
    let badgeText: String?
    let color: Color
    let benefits: [String]
    let isLoading: Bool
    let action: () -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text(tierName)
                    .font(.system(size: 24, weight: .heavy))
                    .foregroundColor(color)

                if let badgeText {
                    Text(badgeText)
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(.black)
                        .padding(.horizontal, 7)
                        .padding(.vertical, 4)
                        .background(color)
                        .clipShape(Capsule())
                }
                
                Spacer()
                
                Text(priceInfo)
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(.white)
            }
            
            VStack(alignment: .leading, spacing: 8) {
                ForEach(benefits, id: \.self) { benefit in
                    HStack(spacing: 8) {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(color)
                            .font(.system(size: 14))
                        Text(benefit)
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.white.opacity(0.8))
                    }
                }
            }
            
            Button(action: action) {
                HStack {
                    if isLoading {
                        ProgressView().tint(.black)
                    } else {
                        Text("Оформить \(tierName)")
                            .font(.system(size: 16, weight: .bold))
                    }
                }
                .foregroundColor(.black)
                .frame(maxWidth: .infinity)
                .frame(height: 50)
                .background(color)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .buttonStyle(.plain)
            .disabled(isLoading)
            .padding(.top, 4)
        }
        .padding(20)
        .background(Color.white.opacity(0.04))
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .stroke(color.opacity(0.3), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 20))
    }
}

struct OpenDisputeSheet: View {
    let transactionId: String
    var onSuccess: (() -> Void)?
    
    @State private var reason = ""
    @State private var isLoading = false
    @State private var error: String?
    @State private var createdDispute: Dispute?
    
    @Environment(\.dismiss) var dismiss
    
    private let service = DisputesService.shared
    
    var body: some View {
        VStack(spacing: 24) {
            if let dispute = createdDispute {
                VStack(spacing: 16) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 48))
                        .foregroundColor(.perklyGreen)
                    
                    Text("Спор открыт")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(.white)
                    
                    Text("Мы рассмотрим вашу жалобу в ближайшее время. ID спора:")
                        .font(.system(size: 14))
                        .foregroundColor(.white.opacity(0.5))
                        .multilineTextAlignment(.center)
                    
                    Text(dispute.id.prefix(8) + "...")
                        .font(.system(size: 13, design: .monospaced))
                        .foregroundColor(.white.opacity(0.4))
                    
                    Button {
                        onSuccess?()
                        dismiss()
                    } label: {
                        Text("Готово")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(Color.primaryGradient)
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                    }
                    .buttonStyle(.plain)
                }
            } else {
                VStack(spacing: 20) {
                    HStack(spacing: 12) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.system(size: 24))
                            .foregroundColor(.perklyOrange)
                        
                        Text("Открыть спор")
                            .font(.system(size: 22, weight: .bold))
                            .foregroundColor(.white)
                    }
                    
                    Text("Опишите проблему с покупкой. Мы свяжемся с продавцом для решения.")
                        .font(.system(size: 14))
                        .foregroundColor(.white.opacity(0.5))
                        .multilineTextAlignment(.center)
                    
                    ZStack(alignment: .topLeading) {
                        if reason.isEmpty {
                            Text("Что пошло не так?")
                                .foregroundColor(.white.opacity(0.2))
                                .padding(.horizontal, 4)
                                .padding(.vertical, 8)
                        }
                        
                        TextEditor(text: $reason)
                            .scrollContentBackground(.hidden)
                            .foregroundColor(.white)
                            .font(.system(size: 15))
                    }
                    .frame(minHeight: 100)
                    .padding(12)
                    .background(Color.white.opacity(0.04))
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                    .overlay(
                        RoundedRectangle(cornerRadius: 14)
                            .stroke(Color.white.opacity(0.08), lineWidth: 1)
                    )
                    
                    if let error {
                        Text(error)
                            .font(.system(size: 13))
                            .foregroundColor(.perklyRed)
                    }
                    
                    Button {
                        Task { await submitDispute() }
                    } label: {
                        HStack {
                            if isLoading {
                                ProgressView().tint(.white)
                            } else {
                                Image(systemName: "paperplane.fill")
                                Text("Отправить")
                                    .fontWeight(.bold)
                            }
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(Color.fireGradient)
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                    }
                    .buttonStyle(.plain)
                    .disabled(isLoading || reason.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
        .padding(24)
        .background(Color.perklyDark.ignoresSafeArea())
    }
    
    private func submitDispute() async {
        let trimmed = reason.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            error = "Опишите причину"
            return
        }
        
        isLoading = true
        error = nil
        
        do {
            createdDispute = try await service.create(
                transactionId: transactionId,
                reason: trimmed
            )
            HapticManager.shared.playPurchaseSuccess()
        } catch {
            self.error = error.localizedDescription
        }
        
        isLoading = false
    }
}

struct LeaveReviewSheet: View {
    let transaction: Transaction
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var authVM: AuthViewModel
    
    @State private var rating: Int = 0
    @State private var comment: String = ""
    @State private var isLoading = false
    @State private var errorText: String?
    
    var body: some View {
        NavigationStack {
            ZStack {
                Color.perklyDark.ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 24) {
                        VStack(spacing: 8) {
                            Text("Оцените покупку")
                                .font(.system(size: 24, weight: .bold))
                                .foregroundColor(.white)
                            
                            Text(transaction.offer?.title ?? "Заказ")
                                .font(.system(size: 15))
                                .foregroundColor(.white.opacity(0.6))
                                .multilineTextAlignment(.center)
                        }
                        .padding(.top, 20)
                        
                        HStack(spacing: 12) {
                            ForEach(1...5, id: \.self) { star in
                                Image(systemName: star <= rating ? "star.fill" : "star")
                                    .font(.system(size: 40))
                                    .foregroundColor(star <= rating ? .perklyGold : .white.opacity(0.2))
                                    .onTapGesture {
                                        withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
                                            rating = star
                                        }
                                        HapticManager.shared.lightImpact()
                                    }
                            }
                        }
                        .padding(.vertical, 10)
                        
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Комментарий (необязательно)")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(.white.opacity(0.7))
                            
                            TextEditor(text: $comment)
                                .font(.system(size: 16))
                                .foregroundColor(.white)
                                .frame(height: 120)
                                .padding(12)
                                .background(Color.white.opacity(0.05))
                                .cornerRadius(12)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(Color.white.opacity(0.1), lineWidth: 1)
                                )
                                .scrollContentBackground(.hidden)
                        }
                        
                        if let err = errorText {
                            Text(err)
                                .font(.system(size: 13))
                                .foregroundColor(.perklyRed)
                                .multilineTextAlignment(.center)
                        }
                        
                        Button {
                            Task { await submitReview() }
                        } label: {
                            HStack {
                                if isLoading {
                                    ProgressView().tint(.white)
                                } else {
                                    Text("Опубликовать отзыв")
                                        .font(.system(size: 16, weight: .bold))
                                }
                            }
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 54)
                            .background(rating > 0 ? AnyShapeStyle(Color.primaryGradient) : AnyShapeStyle(Color.white.opacity(0.1)))
                            .clipShape(RoundedRectangle(cornerRadius: 16))
                        }
                        .buttonStyle(.plain)
                        .disabled(rating == 0 || isLoading)
                        .padding(.top, 10)
                        
                        Spacer()
                    }
                    .padding(24)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { dismiss() }) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.white.opacity(0.5))
                            .font(.system(size: 24))
                    }
                }
            }
        }
    }
    
    private func submitReview() async {
        let offerId = transaction.offerId
        let authorId = transaction.buyerId
        
        isLoading = true
        errorText = nil
        
        do {
            _ = try await ReviewsService.shared.create(
                rating: rating,
                comment: comment.isEmpty ? nil : comment,
                offerId: offerId,
                authorId: authorId
            )
            
            DispatchQueue.main.async {
                HapticManager.shared.playPurchaseSuccess()
                dismiss()
            }
        } catch {
            errorText = "Ошибка при отправке: \(error.localizedDescription)"
            HapticManager.shared.lightImpact() 
        }
        
        isLoading = false
    }
}

struct DisputeStatusView: View {
    let dispute: Dispute
    
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: dispute.statusEnum.icon)
                .font(.system(size: 18))
                .foregroundColor(statusColor)
            
            VStack(alignment: .leading, spacing: 2) {
                Text("Спор: \(dispute.statusEnum.displayName)")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.white)
                
                Text(dispute.reason)
                    .font(.system(size: 12))
                    .foregroundColor(.white.opacity(0.4))
                    .lineLimit(1)
            }
            
            Spacer()
        }
        .padding(14)
        .background(statusColor.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(statusColor.opacity(0.15), lineWidth: 1)
        )
    }
    
    private var statusColor: Color {
        switch dispute.statusEnum {
        case .open: return .perklyOrange
        case .resolved: return .perklyGreen
        case .closed: return .white.opacity(0.4)
        }
    }
}


// MARK: - VIP Perks View
struct VIPPerksView: View {
    let user: User
    @State private var codeCopied = false
    
    // Deterministic coupon logic: changes every week
    private var weeklyCouponCode: String {
        let calendar = Calendar.current
        let week = calendar.component(.weekOfYear, from: Date())
        let year = calendar.component(.year, from: Date())
        let tierPrefix = user.tierEnum == .gold ? "GOLD" : "PLAT"
        return "PRKLY-\(tierPrefix)-\(year)-W\(week)"
    }
    
    private var accentColor: Color {
        user.tierEnum == .platinum ? .perklyPlatinum : .perklyGold
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("VIP ПРИВИЛЕГИИ")
                        .font(.system(size: 11, weight: .black))
                        .foregroundColor(accentColor)
                        .tracking(1.5)
                    
                    Text("Еженедельный купон")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.white)
                }
                Spacer()
                Image(systemName: "ticket.fill")
                    .font(.system(size: 24))
                    .foregroundColor(accentColor.opacity(0.8))
            }
            .padding(.horizontal, 20)
            .padding(.top, 20)
            .padding(.bottom, 16)
            
            // Coupon Area
            VStack(spacing: 12) {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("ВАШ КОД:")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(.white.opacity(0.4))
                        
                        Text(weeklyCouponCode)
                            .font(.system(size: 18, weight: .black, design: .monospaced))
                            .foregroundColor(.white)
                    }
                    
                    Spacer()
                    
                    Button {
                        UIPasteboard.general.string = weeklyCouponCode
                        withAnimation(.spring(response: 0.35, dampingFraction: 0.7)) {
                            codeCopied = true
                        }
                        HapticManager.shared.playPurchaseSuccess()
                        
                        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                            withAnimation { codeCopied = false }
                        }
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: codeCopied ? "checkmark" : "doc.on.doc.fill")
                            Text(codeCopied ? "ГОТОВО" : "КОПИРОВАТЬ")
                        }
                        .font(.system(size: 11, weight: .black))
                        .foregroundColor(codeCopied ? .perklyGreen : .black)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .background(codeCopied ? AnyShapeStyle(Color.perklyGreen.opacity(0.12)) : AnyShapeStyle(accentColor))
                        .clipShape(Capsule())
                    }
                }
                .padding(16)
                .background(Color.black.opacity(0.2))
                .clipShape(RoundedRectangle(cornerRadius: 14))
                
                Text(user.tierEnum == .platinum ? "Дает скидку 100% на любой товар до 120 000 soʻm" : "Дает скидку 50% на любой товар до 60 000 soʻm")
                    .font(.system(size: 11))
                    .foregroundColor(.white.opacity(0.4))
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 4)
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 20)
        }
        .background(
            ZStack {
                Color.white.opacity(0.04)
                accentColor.opacity(0.05)
                
                // Subtle shine effect
                LinearGradient(
                    colors: [.clear, accentColor.opacity(0.1), .clear],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            }
        )
        .overlay(
            RoundedRectangle(cornerRadius: 24)
                .stroke(
                    LinearGradient(
                        colors: [accentColor.opacity(0.5), .clear, accentColor.opacity(0.2)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 1
                )
        )
        .clipShape(RoundedRectangle(cornerRadius: 24))
    }
}

private enum AdminModuleSection: String, CaseIterable, Identifiable {
    case operations
    case commerce
    case product
    case community

    var id: String { rawValue }

    var title: String {
        switch self {
        case .operations: return "Операции"
        case .commerce: return "Коммерция"
        case .product: return "Продукт"
        case .community: return "Комьюнити"
        }
    }

    var subtitle: String {
        switch self {
        case .operations: return "Платежи, споры, сообщения"
        case .commerce: return "Продавцы, офферы, продажи"
        case .product: return "Проверка storefront и карты"
        case .community: return "Подарки, squads и user flows"
        }
    }
}

private enum AdminModuleDestination {
    case topka
    case users
    case transactions
    case disputes
    case offers
    case chats
    case seller
    case catalog
    case map
    case gifts
    case squads
    case analytics
    case companies
    case moderation
    case audit
}

private struct AdminModuleItem: Identifiable {
    let id: String
    let section: AdminModuleSection
    let title: String
    let subtitle: String
    let icon: String
    let color: Color
    let badge: String
    let keywords: [String]
    let destination: AdminModuleDestination
}

@MainActor
final class AdminControlCenterViewModel: ObservableObject {
    @Published var stats: AdminStatsResponse?
    @Published var isLoading = false
    @Published var error: String?
    @Published var lastUpdatedAt: Date?

    private let service = AdminService.shared

    func load() async {
        isLoading = true
        error = nil

        do {
            stats = try await service.getStats()
            lastUpdatedAt = Date()
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }
}

struct AdminControlCenterView: View {
    @EnvironmentObject var authVM: AuthViewModel
    @StateObject private var vm = AdminControlCenterViewModel()
    @State private var searchQuery = ""
    @State private var showCreateOffer = false
    @State private var showAR = false

    private var modules: [AdminModuleItem] {
        [
            AdminModuleItem(
                id: "topka",
                section: .product,
                title: "Topka",
                subtitle: "Промо, товары, подборки и публикация в iOS-ленту",
                icon: "flame.fill",
                color: .perklyOrange,
                badge: "feed",
                keywords: ["topka", "топка", "promo", "промо", "товары", "подборки", "feed"],
                destination: .topka
            ),
            AdminModuleItem(
                id: "users",
                section: .operations,
                title: "Пользователи",
                subtitle: "Все аккаунты, роли и быстрый аудит профилей",
                icon: "person.2.fill",
                color: .perklyPurple,
                badge: "core",
                keywords: ["users", "пользователи", "accounts", "roles", "profiles", "telegram"],
                destination: .users
            ),
            AdminModuleItem(
                id: "transactions",
                section: .operations,
                title: "Сделки",
                subtitle: "Возвраты, контроль статусов и история",
                icon: "creditcard.trianglebadge.exclamationmark",
                color: .perklyRed,
                badge: "ops",
                keywords: ["сделки", "возвраты", "refund", "transactions", "orders", "платежи"],
                destination: .transactions
            ),
            AdminModuleItem(
                id: "disputes",
                section: .operations,
                title: "Арбитраж",
                subtitle: "Споры, evidence и спорные кейсы",
                icon: "exclamationmark.shield.fill",
                color: .perklyOrange,
                badge: "risk",
                keywords: ["споры", "арбитраж", "disputes", "claims", "evidence"],
                destination: .disputes
            ),
            AdminModuleItem(
                id: "moderation",
                section: .operations,
                title: "Модерация",
                subtitle: "Жалобы, апелляции и решения по безопасности",
                icon: "checkmark.shield.fill",
                color: .perklyOrange,
                badge: "safety",
                keywords: ["жалобы", "апелляции", "модерация", "reports", "appeals", "safety"],
                destination: .moderation
            ),
            AdminModuleItem(
                id: "audit",
                section: .operations,
                title: "Журнал действий",
                subtitle: "Кто и когда менял пользователей, сделки и контент",
                icon: "scroll.fill",
                color: .perklyCyan,
                badge: "audit",
                keywords: ["журнал", "аудит", "логи", "logs", "audit", "история"],
                destination: .audit
            ),
            AdminModuleItem(
                id: "chats",
                section: .operations,
                title: "Сообщения",
                subtitle: "Проверка диалогов и inbox-flow",
                icon: "bubble.left.and.bubble.right.fill",
                color: .perklyCyan,
                badge: "live",
                keywords: ["чаты", "messages", "chat", "support", "inbox"],
                destination: .chats
            ),
            AdminModuleItem(
                id: "offers",
                section: .commerce,
                title: "Офферы",
                subtitle: "Модерация, скрытие и удаление публикаций",
                icon: "tag.fill",
                color: .perklyGold,
                badge: "moderate",
                keywords: ["offers", "офферы", "moderation", "delete", "active", "товары"],
                destination: .offers
            ),
            AdminModuleItem(
                id: "companies",
                section: .commerce,
                title: "Компании",
                subtitle: "Заявки, реквизиты и статусы продавцов",
                icon: "building.2.fill",
                color: .perklyGreen,
                badge: "verify",
                keywords: ["компании", "companies", "инн", "продавцы", "модерация"],
                destination: .companies
            ),
            AdminModuleItem(
                id: "seller",
                section: .commerce,
                title: "Seller Console",
                subtitle: "Витрина продавца, продажи и офферы",
                icon: "storefront.fill",
                color: .perklyGreen,
                badge: "sales",
                keywords: ["seller", "продавец", "offers", "sales", "витрина"],
                destination: .seller
            ),
            AdminModuleItem(
                id: "catalog",
                section: .commerce,
                title: "Каталог",
                subtitle: "Проверка каталога как видит пользователь",
                icon: "bag.fill",
                color: .perklyGold,
                badge: "qa",
                keywords: ["каталог", "catalog", "products", "qa", "storefront"],
                destination: .catalog
            ),
            AdminModuleItem(
                id: "map",
                section: .product,
                title: "Карта",
                subtitle: "Районы, сигналы, discovery и гео-flow",
                icon: "map.fill",
                color: .perklyPurple,
                badge: "geo",
                keywords: ["карта", "map", "discovery", "geo", "районы", "signals"],
                destination: .map
            ),
            AdminModuleItem(
                id: "analytics",
                section: .product,
                title: "Аналитика",
                subtitle: "События, просмотры, активность",
                icon: "chart.bar.fill",
                color: .perklyCyan,
                badge: "data",
                keywords: ["аналитика", "analytics", "статистика", "события", "events"],
                destination: .analytics
            ),
            AdminModuleItem(
                id: "gifts",
                section: .community,
                title: "Подарки",
                subtitle: "Коды, активации и gift-поток",
                icon: "gift.fill",
                color: .perklyGreen,
                badge: "perk",
                keywords: ["gifts", "gift", "подарки", "codes", "redeem"],
                destination: .gifts
            ),
            AdminModuleItem(
                id: "squads",
                section: .community,
                title: "Squads",
                subtitle: "Социальная механика и команды",
                icon: "person.3.fill",
                color: .perklyCyan,
                badge: "social",
                keywords: ["squad", "squads", "teams", "соц", "community"],
                destination: .squads
            )
        ]
    }

    private var filteredModules: [AdminModuleItem] {
        let normalized = searchQuery.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !normalized.isEmpty else { return modules }

        return modules.filter { module in
            module.title.lowercased().contains(normalized) ||
            module.subtitle.lowercased().contains(normalized) ||
            module.keywords.contains(where: { $0.lowercased().contains(normalized) })
        }
    }

    private var visibleSections: [AdminModuleSection] {
        AdminModuleSection.allCases.filter { section in
            filteredModules.contains(where: { $0.section == section })
        }
    }

    var body: some View {
        ZStack {
            Color.perklyDark.ignoresSafeArea()

            if vm.isLoading && vm.stats == nil {
                ProgressView()
                    .tint(.perklyPurple)
            } else {
                ScrollView(.vertical, showsIndicators: false) {
                    VStack(spacing: 18) {
                        adminHero

                        if let stats = vm.stats {
                            AdminStatsGrid(stats: stats)
                            adminRevenueGrid(stats: stats)
                        }

                        if let error = vm.error {
                            Text(error)
                                .font(.system(size: 13))
                                .foregroundColor(.perklyRed)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(14)
                                .background(Color.perklyRed.opacity(0.12))
                                .clipShape(RoundedRectangle(cornerRadius: 14))
                        }

                        adminSearchBar
                        adminQuickActions

                        if filteredModules.isEmpty {
                            VStack(spacing: 10) {
                                Image(systemName: "magnifyingglass.circle.fill")
                                    .font(.system(size: 36))
                                    .foregroundColor(.white.opacity(0.2))
                                Text("Ничего не найдено")
                                    .font(.system(size: 17, weight: .bold))
                                    .foregroundColor(.white)
                                Text("Попробуй другой запрос по модулям или доменам")
                                    .font(.system(size: 13))
                                    .foregroundColor(.white.opacity(0.45))
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 32)
                        } else {
                            ForEach(visibleSections) { section in
                                adminSection(section)
                            }
                        }
                    }
                    .padding(20)
                    .padding(.bottom, 24)
                }
                .refreshable {
                    await authVM.refreshUser()
                    await vm.load()
                }
            }
        }
        .navigationTitle("Админ-панель")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await vm.load()
        }
        .sheet(isPresented: $showCreateOffer) {
            CreateOfferSheet(onSuccess: {
                Task { await vm.load() }
            })
            .presentationDetents([.large])
            .presentationDragIndicator(.visible)
        }
        .fullScreenCover(isPresented: $showAR) {
            ARDiscoveryView()
        }
    }

    private var adminHero: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top) {
                ZStack {
                    Circle()
                        .fill(Color.perklyRed.opacity(0.18))
                        .frame(width: 54, height: 54)

                    Image(systemName: "shield.lefthalf.filled")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(.perklyRed)
                }

                VStack(alignment: .leading, spacing: 5) {
                    Text("Admin Control Center")
                        .font(.system(size: 24, weight: .black))
                        .foregroundColor(.white)

                    Text("Единая точка управления операциями, витриной и критичными user-flows.")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(.white.opacity(0.6))
                        .fixedSize(horizontal: false, vertical: true)
                }

                Spacer()
            }

            HStack(spacing: 8) {
                heroPill(title: authVM.user?.roleEnum == .admin ? "ADMIN" : "LIMITED", color: .perklyRed)
                heroPill(title: "\(modules.count) модулей", color: .perklyPurple)

                if let lastUpdatedAt = vm.lastUpdatedAt {
                    heroPill(title: lastUpdatedAt.formatted(date: .omitted, time: .shortened), color: .perklyGreen)
                }
            }
        }
        .padding(18)
        .background(Color.white.opacity(0.05))
        .overlay(
            RoundedRectangle(cornerRadius: 24)
                .stroke(Color.white.opacity(0.08), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 24))
    }

    private func heroPill(title: String, color: Color) -> some View {
        Text(title)
            .font(.system(size: 11, weight: .black))
            .foregroundColor(color)
            .padding(.horizontal, 10)
            .padding(.vertical, 7)
            .background(color.opacity(0.14))
            .clipShape(Capsule())
    }

    private func adminRevenueGrid(stats: AdminStatsResponse) -> some View {
        LazyVGrid(columns: [
            GridItem(.flexible(), spacing: 10),
            GridItem(.flexible(), spacing: 10)
        ], spacing: 10) {
            AdminStatCard(
                title: "GMV",
                value: "\(uzs(stats.totalVolume))",
                icon: "banknote.fill",
                color: .perklyGreen
            )
            AdminStatCard(
                title: "Доход платформы",
                value: "\(uzs(stats.platformIncome))",
                icon: "chart.line.uptrend.xyaxis",
                color: .perklyPurple
            )
        }
    }

    private var adminSearchBar: some View {
        HStack(spacing: 10) {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.white.opacity(0.3))

            TextField("Поиск модулей, доменов и flow...", text: $searchQuery)
                .foregroundColor(.white)
                .autocorrectionDisabled()

            if !searchQuery.isEmpty {
                Button {
                    searchQuery = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.white.opacity(0.3))
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Color.white.opacity(0.04))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(Color.white.opacity(0.08), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    private var adminQuickActions: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                quickActionButton(
                    title: "Обновить",
                    subtitle: "Синхронизация",
                    icon: "arrow.clockwise",
                    tint: .perklyGreen
                ) {
                    Task {
                        await authVM.refreshUser()
                        await vm.load()
                    }
                }

                quickActionButton(
                    title: "Оффер",
                    subtitle: "Создать",
                    icon: "plus.circle.fill",
                    tint: .perklyPurple
                ) {
                    showCreateOffer = true
                }

                quickActionButton(
                    title: "AR QA",
                    subtitle: "Live inspect",
                    icon: "camera.viewfinder",
                    tint: .perklyGold
                ) {
                    showAR = true
                }
            }
        }
    }

    private func quickActionButton(
        title: String,
        subtitle: String,
        icon: String,
        tint: Color,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(tint.opacity(0.16))
                        .frame(width: 38, height: 38)

                    Image(systemName: icon)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(tint)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                    Text(subtitle)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(.white.opacity(0.5))
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .background(Color.white.opacity(0.05))
            .clipShape(RoundedRectangle(cornerRadius: 18))
        }
        .buttonStyle(.plain)
    }

    private func adminSection(_ section: AdminModuleSection) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(section.title)
                    .font(.system(size: 18, weight: .black))
                    .foregroundColor(.white)
                Text(section.subtitle)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.white.opacity(0.45))
            }

            LazyVGrid(columns: [
                GridItem(.flexible(), spacing: 12),
                GridItem(.flexible(), spacing: 12)
            ], spacing: 12) {
                ForEach(filteredModules.filter { $0.section == section }) { module in
                    adminModuleCard(module)
                }
            }
        }
    }

    @ViewBuilder
    private func adminModuleCard(_ module: AdminModuleItem) -> some View {
        switch module.destination {
        case .topka:
            NavigationLink(destination: TopkaAdminPostsView()) {
                adminModuleTile(module)
            }
            .buttonStyle(.plain)
        case .users:
            NavigationLink(destination: AdminUsersView()) {
                adminModuleTile(module)
            }
            .buttonStyle(.plain)
        case .transactions:
            NavigationLink(destination: AdminTransactionsView()) {
                adminModuleTile(module)
            }
            .buttonStyle(.plain)
        case .disputes:
            NavigationLink(destination: AdminDisputesView()) {
                adminModuleTile(module)
            }
            .buttonStyle(.plain)
        case .offers:
            NavigationLink(destination: AdminOffersView()) {
                adminModuleTile(module)
            }
            .buttonStyle(.plain)
        case .chats:
            NavigationLink(destination: ChatListView()) {
                adminModuleTile(module)
            }
            .buttonStyle(.plain)
        case .seller:
            NavigationLink(destination: SellerDashboardView()) {
                adminModuleTile(module)
            }
            .buttonStyle(.plain)
        case .catalog:
            NavigationLink(destination: CatalogView()) {
                adminModuleTile(module)
            }
            .buttonStyle(.plain)
        case .map:
            NavigationLink(destination: MapDiscoveryView()) {
                adminModuleTile(module)
            }
            .buttonStyle(.plain)
        case .gifts:
            NavigationLink(destination: GiftCodesView()) {
                adminModuleTile(module)
            }
            .buttonStyle(.plain)
        case .squads:
            NavigationLink(destination: SquadView()) {
                adminModuleTile(module)
            }
            .buttonStyle(.plain)
        case .analytics:
            NavigationLink(destination: AdminAnalyticsView()) {
                adminModuleTile(module)
            }
            .buttonStyle(.plain)
        case .companies:
            NavigationLink(destination: AdminCompaniesView()) {
                adminModuleTile(module)
            }
            .buttonStyle(.plain)
        case .moderation:
            NavigationLink(destination: AdminModerationView()) {
                adminModuleTile(module)
            }
            .buttonStyle(.plain)
        case .audit:
            NavigationLink(destination: AdminAuditLogView()) {
                adminModuleTile(module)
            }
            .buttonStyle(.plain)
        }
    }

    private func adminModuleTile(_ module: AdminModuleItem) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top) {
                ZStack {
                    Circle()
                        .fill(module.color.opacity(0.16))
                        .frame(width: 40, height: 40)

                    Image(systemName: module.icon)
                        .font(.system(size: 17, weight: .bold))
                        .foregroundColor(module.color)
                }

                Spacer()

                Text(module.badge.uppercased())
                    .font(.system(size: 9, weight: .black))
                    .foregroundColor(module.color)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 5)
                    .background(module.color.opacity(0.14))
                    .clipShape(Capsule())
            }

            VStack(alignment: .leading, spacing: 6) {
                Text(module.title)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.white)
                Text(module.subtitle)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.white.opacity(0.48))
                    .fixedSize(horizontal: false, vertical: true)
            }

            Spacer(minLength: 0)

            HStack {
                Text("Открыть")
                    .font(.system(size: 11, weight: .black))
                    .foregroundColor(.white.opacity(0.62))
                Spacer()
                Image(systemName: "arrow.up.right")
                    .font(.system(size: 12, weight: .black))
                    .foregroundColor(.white.opacity(0.62))
            }
        }
        .frame(maxWidth: .infinity, minHeight: 164, alignment: .topLeading)
        .padding(16)
        .background(Color.white.opacity(0.05))
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .stroke(Color.white.opacity(0.08), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 20))
    }
}

@MainActor
final class AdminUsersViewModel: ObservableObject {
    @Published var users: [User] = []
    @Published var total = 0
    @Published var searchQuery = ""
    @Published var isLoading = false
    @Published var error: String?

    private let service = AdminService.shared

    func load() async {
        isLoading = true
        error = nil

        do {
            let response = try await service.getUsers(search: searchQuery)
            users = response.users
            total = response.total
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    func updateUser(_ user: User, role: UserRole, tier: UserTier, balance: Int) async {
        isLoading = true
        error = nil

        do {
            let updated = try await service.updateUser(user, role: role, tier: tier, balance: balance)
            if let index = users.firstIndex(where: { $0.id == updated.id }) {
                users[index] = updated
            }
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }
}

struct AdminUsersView: View {
    @StateObject private var vm = AdminUsersViewModel()
    @State private var editingUser: User?

    var body: some View {
        ZStack {
            Color.perklyDark.ignoresSafeArea()

            VStack(spacing: 14) {
                searchBar

                HStack {
                    Text(vm.total > 0 ? "\(vm.total) пользователей" : "Пользователи")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(.white.opacity(0.45))
                    Spacer()
                }

                if vm.isLoading && vm.users.isEmpty {
                    Spacer()
                    ProgressView()
                        .tint(.perklyPurple)
                    Spacer()
                } else if let error = vm.error, vm.users.isEmpty {
                    Spacer()
                    Text(error)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.perklyRed)
                        .multilineTextAlignment(.center)
                    Spacer()
                } else if vm.users.isEmpty {
                    Spacer()
                    VStack(spacing: 10) {
                        Image(systemName: "person.crop.circle.badge.questionmark")
                            .font(.system(size: 40))
                            .foregroundColor(.white.opacity(0.2))
                        Text("Пользователи не найдены")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.white)
                    }
                    Spacer()
                } else {
                    ScrollView(.vertical, showsIndicators: false) {
                        LazyVStack(spacing: 10) {
                            ForEach(vm.users) { user in
                                Button {
                                    editingUser = user
                                } label: {
                                    AdminUserRow(user: user)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(.bottom, 20)
                    }
                }
            }
            .padding(20)
        }
        .navigationTitle("Пользователи")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await vm.load()
        }
        .refreshable {
            await vm.load()
        }
        .onSubmit(of: .text) {
            Task { await vm.load() }
        }
        .sheet(item: $editingUser) { user in
            AdminUserEditSheet(user: user) { role, tier, balance in
                Task {
                    await vm.updateUser(user, role: role, tier: tier, balance: balance)
                    editingUser = nil
                }
            }
            .presentationDetents([.medium])
            .presentationDragIndicator(.visible)
        }
    }

    private var searchBar: some View {
        HStack(spacing: 10) {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.white.opacity(0.3))

            TextField("Поиск по имени или email...", text: $vm.searchQuery)
                .foregroundColor(.white)
                .autocorrectionDisabled()

            if !vm.searchQuery.isEmpty {
                Button {
                    vm.searchQuery = ""
                    Task { await vm.load() }
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.white.opacity(0.3))
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Color.white.opacity(0.04))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(Color.white.opacity(0.08), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }
}

struct AdminUserEditSheet: View {
    let user: User
    var onSave: (UserRole, UserTier, Int) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var role: UserRole
    @State private var tier: UserTier
    @State private var balanceText: String

    init(user: User, onSave: @escaping (UserRole, UserTier, Int) -> Void) {
        self.user = user
        self.onSave = onSave
        _role = State(initialValue: user.roleEnum)
        _tier = State(initialValue: user.tierEnum)
        _balanceText = State(initialValue: "\(Int((user.balance ?? 0).rounded()))")
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.perklyDark.ignoresSafeArea()

                VStack(alignment: .leading, spacing: 18) {
                    VStack(alignment: .leading, spacing: 5) {
                        Text(user.displayName ?? "Без имени")
                            .font(.system(size: 22, weight: .bold))
                            .foregroundColor(.white)
                        Text(user.email ?? user.id)
                            .font(.system(size: 13))
                            .foregroundColor(.white.opacity(0.5))
                            .lineLimit(1)
                    }

                    VStack(alignment: .leading, spacing: 10) {
                        Text("Роль")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(.white.opacity(0.55))
                        Picker("Роль", selection: $role) {
                            Text("USER").tag(UserRole.user)
                            Text("VENDOR").tag(UserRole.vendor)
                            Text("ADMIN").tag(UserRole.admin)
                        }
                        .pickerStyle(.segmented)
                    }

                    VStack(alignment: .leading, spacing: 10) {
                        Text("Тариф")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(.white.opacity(0.55))
                        Picker("Тариф", selection: $tier) {
                            Text("Silver").tag(UserTier.silver)
                            Text("Gold").tag(UserTier.gold)
                            Text("Platinum").tag(UserTier.platinum)
                        }
                        .pickerStyle(.segmented)
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Баланс (UZS)")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(.white.opacity(0.55))
                        TextField("0", text: $balanceText)
                            .keyboardType(.numberPad)
                            .foregroundColor(.white)
                            .padding(14)
                            .background(Color.white.opacity(0.06))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }

                    Spacer()

                    Button {
                        let normalized = balanceText
                            .replacingOccurrences(of: " ", with: "")
                            .replacingOccurrences(of: "\u{00a0}", with: "")
                        onSave(role, tier, max(0, Int(normalized) ?? 0))
                    } label: {
                        Text("Сохранить")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 15)
                            .background(Color.primaryGradient)
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                    }
                    .buttonStyle(.plain)
                }
                .padding(22)
            }
            .navigationTitle("Редактировать")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Закрыть") { dismiss() }
                        .foregroundColor(.white.opacity(0.7))
                }
            }
        }
    }
}

struct AdminUserRow: View {
    let user: User

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(roleColor.opacity(0.16))
                        .frame(width: 46, height: 46)

                    Text(String((user.displayName ?? user.email ?? "U").prefix(1)).uppercased())
                        .font(.system(size: 18, weight: .black))
                        .foregroundColor(.white)
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text(user.displayName ?? "Без имени")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.white)
                        .lineLimit(1)

                    Text(user.email ?? "email не указан")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.white.opacity(0.55))
                        .lineLimit(1)
                }

                Spacer()

                Text(user.roleEnum.rawValue)
                    .font(.system(size: 10, weight: .black))
                    .foregroundColor(roleColor)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 6)
                    .background(roleColor.opacity(0.14))
                    .clipShape(Capsule())
            }

            HStack(spacing: 10) {
                metaPill(icon: "star.fill", text: user.tierEnum.displayName, color: .perklyGold)
                metaPill(icon: "wallet.pass.fill", text: balanceText, color: .perklyGreen)

                if let telegramId = user.telegramId, !telegramId.isEmpty {
                    metaPill(icon: "paperplane.fill", text: "TG", color: .perklyCyan)
                }
            }

            if let createdAt = user.createdAt {
                Text("Создан: \(createdAt)")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(.white.opacity(0.38))
            }
        }
        .padding(14)
        .background(Color.white.opacity(0.05))
        .overlay(
            RoundedRectangle(cornerRadius: 18)
                .stroke(Color.white.opacity(0.08), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 18))
    }

    private var roleColor: Color {
        switch user.roleEnum {
        case .admin:
            return .perklyRed
        case .vendor:
            return .perklyPurple
        case .user:
            return .perklyCyan
        }
    }

    private var balanceText: String {
        "\(uzs(user.balance ?? 0))"
    }

    private func metaPill(icon: String, text: String, color: Color) -> some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
            Text(text)
        }
        .font(.system(size: 11, weight: .bold))
        .foregroundColor(color)
        .padding(.horizontal, 9)
        .padding(.vertical, 7)
        .background(color.opacity(0.12))
        .clipShape(Capsule())
    }
}

@MainActor
final class AdminOffersViewModel: ObservableObject {
    @Published var offers: [Offer] = []
    @Published var total = 0
    @Published var isLoading = false
    @Published var error: String?

    private let service = AdminService.shared

    func load() async {
        isLoading = true
        error = nil

        do {
            let response = try await service.getOffers()
            offers = response.offers
            total = response.total
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    func setActive(_ offer: Offer, isActive: Bool) async {
        isLoading = true
        error = nil

        do {
            let updated = try await service.updateOffer(offer, isActive: isActive)
            if let index = offers.firstIndex(where: { $0.id == updated.id }) {
                offers[index] = updated
            }
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    func delete(_ offer: Offer) async {
        isLoading = true
        error = nil

        do {
            _ = try await service.deleteOffer(offer)
            offers.removeAll { $0.id == offer.id }
            total = max(0, total - 1)
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }
}

struct AdminOffersView: View {
    @StateObject private var vm = AdminOffersViewModel()
    @State private var offerToDelete: Offer?
    @State private var editingOffer: Offer?

    var body: some View {
        ZStack {
            Color.perklyDark.ignoresSafeArea()

            if vm.isLoading && vm.offers.isEmpty {
                ProgressView().tint(.perklyPurple)
            } else {
                ScrollView(.vertical, showsIndicators: false) {
                    VStack(spacing: 14) {
                        HStack {
                            Text(vm.total > 0 ? "\(vm.total) офферов" : "Офферы")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(.white.opacity(0.45))
                            Spacer()
                        }

                        if let error = vm.error {
                            AdminInlineError(text: error)
                        }

                        if vm.offers.isEmpty {
                            Text("Офферов пока нет")
                                .font(.system(size: 15))
                                .foregroundColor(.white.opacity(0.5))
                                .padding(.top, 40)
                        } else {
                            ForEach(vm.offers) { offer in
                                AdminOfferRow(
                                    offer: offer,
                                    onEdit: { editingOffer = offer },
                                    onToggle: {
                                        Task { await vm.setActive(offer, isActive: !offer.safeIsActive) }
                                    },
                                    onDelete: { offerToDelete = offer }
                                )
                            }
                        }
                    }
                    .padding(20)
                }
                .refreshable { await vm.load() }
            }
        }
        .navigationTitle("Офферы")
        .navigationBarTitleDisplayMode(.inline)
        .task { await vm.load() }
        .sheet(item: $editingOffer) { offer in
            AdminOfferEditSheet(offer: offer) {
                Task { await vm.load() }
            }
            .presentationDetents([.large])
            .presentationDragIndicator(.visible)
        }
        .alert("Архивировать оффер?", isPresented: .init(
            get: { offerToDelete != nil },
            set: { if !$0 { offerToDelete = nil } }
        )) {
            Button("Архивировать", role: .destructive) {
                if let offerToDelete { Task { await vm.delete(offerToDelete) } }
                offerToDelete = nil
            }
            Button("Отмена", role: .cancel) { offerToDelete = nil }
        } message: {
            Text(offerToDelete.map { "«\($0.safeTitle)» исчезнет из каталога, но останется в истории." } ?? "Оффер будет скрыт из каталога.")
        }
    }
}

struct AdminOfferRow: View {
    let offer: Offer
    var onEdit: () -> Void
    var onToggle: () -> Void
    var onDelete: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 13) {
            HStack(spacing: 12) {
                RoundedRectangle(cornerRadius: 11)
                    .fill(statusColor.opacity(0.16))
                    .frame(width: 44, height: 44)
                    .overlay(
                        Image(systemName: offer.safeIsActive ? "tag.fill" : "eye.slash.fill")
                            .font(.system(size: 17, weight: .bold))
                            .foregroundColor(statusColor)
                    )

                VStack(alignment: .leading, spacing: 4) {
                    Text(offer.safeTitle)
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.white)
                        .lineLimit(2)
                    Text(offer.seller?.displayName ?? offer.seller?.email ?? "Продавец не указан")
                        .font(.system(size: 12))
                        .foregroundColor(.white.opacity(0.45))
                        .lineLimit(1)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 4) {
                    Text("\(uzs(offer.safePrice))")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                    Text(offer.safeIsActive ? "Активен" : "Скрыт")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(statusColor)
                }
            }

            HStack(spacing: 8) {
                Button(action: onEdit) {
                    Label("Изменить", systemImage: "pencil")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.perklyGold)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(Color.perklyGold.opacity(0.12))
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                }
                .buttonStyle(.plain)

                Button(action: onToggle) {
                    Label(offer.safeIsActive ? "Скрыть" : "Показать", systemImage: offer.safeIsActive ? "eye.slash.fill" : "eye.fill")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(offer.safeIsActive ? .perklyOrange : .perklyGreen)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background((offer.safeIsActive ? Color.perklyOrange : Color.perklyGreen).opacity(0.12))
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                }
                .buttonStyle(.plain)

                Button(action: onDelete) {
                    Image(systemName: "trash.fill")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.perklyRed)
                        .frame(width: 40)
                        .padding(.vertical, 10)
                        .background(Color.perklyRed.opacity(0.12))
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(16)
        .perklySurface(cornerRadius: 16)
    }

    private var statusColor: Color {
        offer.safeIsActive ? .perklyGreen : .perklyOrange
    }
}

@MainActor
final class AdminDisputesViewModel: ObservableObject {
    @Published var disputes: [Dispute] = []
    @Published var total = 0
    @Published var isLoading = false
    @Published var error: String?

    private let service = AdminService.shared

    func load() async {
        isLoading = true
        error = nil

        do {
            let response = try await service.getDisputes()
            disputes = response.disputes
            total = response.total
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    func resolve(_ dispute: Dispute, resolution: AdminDisputeResolution) async {
        isLoading = true
        error = nil

        do {
            _ = try await service.resolveDispute(dispute, resolution: resolution, adminNote: nil)
            await load()
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }
}

struct AdminDisputesView: View {
    @StateObject private var vm = AdminDisputesViewModel()
    @State private var selectedDispute: Dispute?

    var body: some View {
        ZStack {
            Color.perklyDark.ignoresSafeArea()

            if vm.isLoading && vm.disputes.isEmpty {
                ProgressView().tint(.perklyPurple)
            } else {
                ScrollView(.vertical, showsIndicators: false) {
                    VStack(spacing: 14) {
                        HStack {
                            Text(vm.total > 0 ? "\(vm.total) споров" : "Споры")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(.white.opacity(0.45))
                            Spacer()
                            if vm.total > 0 {
                                Text("\(vm.disputes.filter { $0.statusEnum == .open }.count) открытых")
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundColor(.perklyOrange)
                            }
                        }

                        if let error = vm.error { AdminInlineError(text: error) }

                        if vm.disputes.isEmpty {
                            VStack(spacing: 10) {
                                Image(systemName: "checkmark.shield.fill")
                                    .font(.system(size: 36))
                                    .foregroundColor(.perklyGreen.opacity(0.4))
                                Text("Споров нет")
                                    .font(.system(size: 15))
                                    .foregroundColor(.white.opacity(0.5))
                            }
                            .padding(.top, 40)
                        } else {
                            ForEach(vm.disputes) { dispute in
                                Button { selectedDispute = dispute } label: {
                                    AdminDisputeRow(dispute: dispute)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                    .padding(20)
                }
                .refreshable { await vm.load() }
            }
        }
        .navigationTitle("Арбитраж")
        .navigationBarTitleDisplayMode(.inline)
        .task { await vm.load() }
        .sheet(item: $selectedDispute) { dispute in
            AdminDisputeDetailView(dispute: dispute) {
                Task { await vm.load() }
            }
            .presentationDetents([.large])
            .presentationDragIndicator(.visible)
        }
    }
}

struct AdminDisputeRow: View {
    let dispute: Dispute

    var body: some View {
        HStack(spacing: 12) {
            Circle()
                .fill(statusColor.opacity(0.15))
                .frame(width: 46, height: 46)
                .overlay(
                    Image(systemName: dispute.statusEnum.icon)
                        .font(.system(size: 17, weight: .bold))
                        .foregroundColor(statusColor)
                )

            VStack(alignment: .leading, spacing: 5) {
                Text(dispute.transaction?.offer?.safeTitle ?? "Спор по сделке")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(.white)
                    .lineLimit(1)

                Text(dispute.reason)
                    .font(.system(size: 12))
                    .foregroundColor(.white.opacity(0.48))
                    .lineLimit(1)

                HStack(spacing: 6) {
                    Text("\(uzs(dispute.transaction?.price ?? 0))")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.perklyGreen)
                    if let evidenceUrls = dispute.evidenceUrls, !evidenceUrls.isEmpty {
                        Label("\(evidenceUrls.count) файл", systemImage: "paperclip")
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundColor(.perklyCyan)
                    }
                }
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 6) {
                Text(dispute.statusEnum.displayName)
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(statusColor)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 5)
                    .background(statusColor.opacity(0.12))
                    .clipShape(Capsule())
                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.white.opacity(0.2))
            }
        }
        .padding(14)
        .perklySurface(cornerRadius: 16)
    }

    private var statusColor: Color {
        switch dispute.statusEnum {
        case .open: return .perklyOrange
        case .resolved: return .perklyGreen
        case .closed: return .white.opacity(0.45)
        }
    }
}

struct AdminInlineError: View {
    let text: String

    var body: some View {
        Text(text)
            .font(.system(size: 13))
            .foregroundColor(.perklyRed)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(14)
            .background(Color.perklyRed.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

@MainActor
final class AdminTransactionsViewModel: ObservableObject {
    @Published var stats: AdminStatsResponse?
    @Published var transactions: [Transaction] = []
    @Published var isLoading = false
    @Published var error: String?

    private let service = AdminService.shared

    func load() async {
        isLoading = true
        error = nil

        do {
            async let statsTask = service.getStats()
            async let transactionsTask = service.getTransactions()
            let (fetchedStats, response) = try await (statsTask, transactionsTask)
            stats = fetchedStats
            transactions = response.transactions
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    func refund(_ transaction: Transaction) async {
        isLoading = true
        error = nil

        do {
            _ = try await service.refundTransaction(transaction.id)
            await load()
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }
}

struct AdminTransactionsView: View {
    @StateObject private var vm = AdminTransactionsViewModel()

    var body: some View {
        ZStack {
            Color.perklyDark.ignoresSafeArea()

            if vm.isLoading && vm.transactions.isEmpty {
                ProgressView().tint(.perklyPurple)
            } else {
                ScrollView(.vertical, showsIndicators: false) {
                    VStack(spacing: 14) {
                        if let stats = vm.stats {
                            AdminStatsGrid(stats: stats)
                        }

                        if let error = vm.error {
                            Text(error)
                                .font(.system(size: 13))
                                .foregroundColor(.perklyRed)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(14)
                                .background(Color.perklyRed.opacity(0.1))
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                        }

                        if vm.transactions.isEmpty {
                            Text("Сделок пока нет")
                                .font(.system(size: 15))
                                .foregroundColor(.white.opacity(0.5))
                                .padding(.top, 40)
                        } else {
                            ForEach(vm.transactions) { transaction in
                                AdminTransactionRow(transaction: transaction) {
                                    Task {
                                        await vm.refund(transaction)
                                    }
                                }
                            }
                        }
                    }
                    .padding(20)
                }
                .refreshable {
                    await vm.load()
                }
            }
        }
        .navigationTitle("Сделки")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await vm.load()
        }
    }
}

struct AdminStatsGrid: View {
    let stats: AdminStatsResponse

    var body: some View {
        LazyVGrid(columns: [
            GridItem(.flexible(), spacing: 10),
            GridItem(.flexible(), spacing: 10)
        ], spacing: 10) {
            AdminStatCard(title: "Пользователи", value: "\(stats.usersCount)", icon: "person.2.fill", color: .perklyPurple)
            AdminStatCard(title: "Новые сегодня", value: "\(stats.newUsersToday)", icon: "sparkles", color: .perklyGreen)
            AdminStatCard(title: "Активные товары", value: "\(stats.activeOffersCount)", icon: "tag.fill", color: .perklyGold)
            AdminStatCard(title: "Открытые споры", value: "\(stats.openDisputesCount)", icon: "exclamationmark.shield.fill", color: .perklyOrange)
            if let pending = stats.pendingCompaniesCount {
                AdminStatCard(title: "Заявки компаний", value: "\(pending)", icon: "building.2.crop.circle", color: .perklyGreen)
            }
            if let reports = stats.openReportsCount, let appeals = stats.openAppealsCount {
                AdminStatCard(title: "Модерация", value: "\(reports + appeals)", icon: "checkmark.shield.fill", color: .perklyRed)
            }
            if let diagnostics = stats.diagnosticOccurrences {
                AdminStatCard(title: "Ошибки приложений", value: "\(diagnostics)", icon: "waveform.path.ecg", color: .perklyCyan)
            }
        }
    }
}

struct AdminStatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundColor(color)

            Text(value)
                .font(.system(size: 22, weight: .bold))
                .foregroundColor(.white)

            Text(title)
                .font(.system(size: 11))
                .foregroundColor(.white.opacity(0.45))
                .lineLimit(1)
                .minimumScaleFactor(0.75)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(Color.white.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct AdminTransactionRow: View {
    let transaction: Transaction
    var onRefund: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 12) {
                Circle()
                    .fill(statusColor.opacity(0.15))
                    .frame(width: 40, height: 40)
                    .overlay(
                        Image(systemName: transaction.statusEnum.icon)
                            .font(.system(size: 16))
                            .foregroundColor(statusColor)
                    )

                VStack(alignment: .leading, spacing: 3) {
                    Text(transaction.offer?.title ?? "Сделка")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.white)
                        .lineLimit(1)

                    Text(transaction.buyer?.displayName ?? transaction.buyer?.email ?? "Покупатель")
                        .font(.system(size: 12))
                        .foregroundColor(.white.opacity(0.45))
                        .lineLimit(1)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 3) {
                    Text("\(uzs(transaction.price))")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.white)

                    Text(transaction.statusEnum.displayName)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(statusColor)
                }
            }

            if canRefund {
                Button {
                    onRefund()
                } label: {
                    Text("Вернуть деньги")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(Color.perklyRed.opacity(0.2))
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(16)
        .perklySurface(cornerRadius: 16)
    }

    private var canRefund: Bool {
        [.completed, .paid, .escrow, .disputed].contains(transaction.statusEnum)
    }

    private var statusColor: Color {
        switch transaction.statusEnum {
        case .success, .completed, .activated: return .perklyGreen
        case .pending, .escrow, .paid: return .perklyGold
        case .failed, .cancelled: return .perklyRed
        case .refunded: return .perklyCyan
        case .disputed: return .perklyOrange
        }
    }
}

// MARK: - Topka iOS Admin

private enum TopkaPostType: String, CaseIterable, Identifiable, Codable {
    case event
    case poster
    case promo
    case collection
    case news
    case place

    var id: String { rawValue }
}

private enum TopkaPostStatus: String, CaseIterable, Identifiable, Codable {
    case draft
    case scheduled
    case published
    case archived

    var id: String { rawValue }

    var title: String {
        switch self {
        case .draft: return "Draft"
        case .scheduled: return "Scheduled"
        case .published: return "Published"
        case .archived: return "Archived"
        }
    }

    var color: Color {
        switch self {
        case .draft: return .perklyGold
        case .scheduled: return .perklyCyan
        case .published: return .perklyGreen
        case .archived: return .white.opacity(0.45)
        }
    }
}

private struct TopkaAdminMedia: Codable, Equatable {
    var originalUrl: String?
    var poster3x4Url: String?
    var story9x16Url: String?
    var square1x1Url: String?
    var preview16x9Url: String?
}

private struct TopkaAdminPost: Codable, Identifiable, Equatable {
    let id: String
    let postType: String
    let status: String
    let title: String
    let subtitle: String?
    let description: String
    let fullDescription: String?
    let category: String
    let tags: [String]
    let badges: [String]
    let date: String?
    let startTime: String?
    let endTime: String?
    let location: String?
    let address: String?
    let latitude: Double?
    let longitude: Double?
    let priceText: String?
    let ctaText: String?
    let ctaUrl: String?
    let priority: Int
    let isFeatured: Bool
    let publishAt: String?
    let expiresAt: String?
    let media: TopkaAdminMedia?
    let dominantColor: String?
    let fallbackGradient: String?
    let createdAt: String
    let updatedAt: String

    var statusEnum: TopkaPostStatus {
        TopkaPostStatus(rawValue: status) ?? .draft
    }

    var typeEnum: TopkaPostType {
        TopkaPostType(rawValue: postType) ?? .event
    }

    var posterUrl: String? {
        media?.poster3x4Url ?? media?.originalUrl
    }
}

private struct TopkaAdminListResponse: Codable {
    let data: [TopkaAdminPost]
    let total: Int
}

private struct TopkaMediaUploadResponse: Codable {
    let url: String
    let variant: String
    let mime: String
    let size: Int
}

private struct TopkaPostDraft {
    var postType: TopkaPostType = .promo
    var status: TopkaPostStatus = .draft
    var title = ""
    var subtitle = ""
    var description = ""
    var fullDescription = ""
    var category = "Промо"
    var tags = ""
    var badges = "Сегодня"
    var date = Date()
    var startTime = "19:00"
    var endTime = ""
    var location = ""
    var address = ""
    var priceText = ""
    var ctaText = ""
    var ctaUrl = ""
    var priority = 0
    var isFeatured = false
    var publishAt: Date?
    var expiresAt: Date?
    var media = TopkaAdminMedia()

    init() {}

    init(post: TopkaAdminPost) {
        postType = post.typeEnum
        status = post.statusEnum
        title = post.title
        subtitle = post.subtitle ?? ""
        description = post.description
        fullDescription = post.fullDescription ?? ""
        category = post.category
        tags = post.tags.joined(separator: ", ")
        badges = post.badges.joined(separator: ", ")
        date = TopkaDateParser.date(from: post.date) ?? Date()
        startTime = post.startTime ?? ""
        endTime = post.endTime ?? ""
        location = post.location ?? ""
        address = post.address ?? ""
        priceText = post.priceText ?? ""
        ctaText = post.ctaText ?? ""
        ctaUrl = post.ctaUrl ?? ""
        priority = post.priority
        isFeatured = post.isFeatured
        publishAt = TopkaDateParser.date(from: post.publishAt)
        expiresAt = TopkaDateParser.date(from: post.expiresAt)
        media = post.media ?? TopkaAdminMedia()
    }

    var validationErrors: [String] {
        var errors: [String] = []
        if title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { errors.append("заголовок") }
        if description.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { errors.append("описание") }
        if category.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { errors.append("категория") }
        if media.poster3x4Url == nil && media.originalUrl == nil { errors.append("poster 3:4") }
        return errors
    }

    func body(status overrideStatus: TopkaPostStatus? = nil) -> [String: Any] {
        var body: [String: Any] = [
            "postType": postType.rawValue,
            "status": (overrideStatus ?? status).rawValue,
            "title": title,
            "subtitle": subtitle,
            "description": description,
            "fullDescription": fullDescription,
            "category": category,
            "tags": tokenList(tags),
            "badges": tokenList(badges),
            "date": date.ISO8601Format(),
            "startTime": startTime,
            "endTime": endTime,
            "location": location,
            "address": address,
            "priceText": priceText,
            "ctaText": ctaText,
            "ctaUrl": ctaUrl,
            "priority": priority,
            "isFeatured": isFeatured,
            "media": mediaBody()
        ]

        if let publishAt {
            body["publishAt"] = publishAt.ISO8601Format()
        }
        if let expiresAt {
            body["expiresAt"] = expiresAt.ISO8601Format()
        }
        return body
    }

    private func tokenList(_ value: String) -> [String] {
        value
            .split(separator: ",")
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
    }

    private func mediaBody() -> [String: Any] {
        var media: [String: Any] = [:]
        if let url = self.media.originalUrl { media["originalUrl"] = url }
        if let url = self.media.poster3x4Url { media["poster3x4Url"] = url }
        if let url = self.media.story9x16Url { media["story9x16Url"] = url }
        if let url = self.media.square1x1Url { media["square1x1Url"] = url }
        if let url = self.media.preview16x9Url { media["preview16x9Url"] = url }
        return media
    }
}

@MainActor
private final class TopkaAdminPostsViewModel: ObservableObject {
    @Published var posts: [TopkaAdminPost] = []
    @Published var isLoading = false
    @Published var error: String?
    @Published var statusFilter: TopkaPostStatus?
    @Published var typeFilter: TopkaPostType?
    @Published var search = ""

    private let service = TopkaAdminService.shared

    func load() async {
        isLoading = true
        error = nil
        do {
            posts = try await service.list(status: statusFilter, type: typeFilter, search: search).data
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func archive(_ post: TopkaAdminPost) async {
        do {
            _ = try await service.archive(id: post.id)
            await load()
        } catch {
            self.error = error.localizedDescription
        }
    }
}

private final class TopkaAdminService {
    static let shared = TopkaAdminService()
    private let api = APIClient.shared

    private init() {}

    func list(status: TopkaPostStatus?, type: TopkaPostType?, search: String) async throws -> TopkaAdminListResponse {
        var queryItems: [URLQueryItem] = []
        if let status { queryItems.append(.init(name: "status", value: status.rawValue)) }
        if let type { queryItems.append(.init(name: "postType", value: type.rawValue)) }
        if !search.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            queryItems.append(.init(name: "search", value: search))
        }
        return try await api.get("/admin/topka/posts", queryItems: queryItems)
    }

    func get(id: String) async throws -> TopkaAdminPost {
        try await api.get("/admin/topka/posts/\(id)")
    }

    func create() async throws -> TopkaAdminPost {
        try await api.post("/admin/topka/posts", body: [
            "title": "Новая публикация",
            "description": "",
            "category": "Промо",
            "status": TopkaPostStatus.draft.rawValue,
            "postType": TopkaPostType.promo.rawValue
        ])
    }

    func update(id: String, draft: TopkaPostDraft, status: TopkaPostStatus? = nil) async throws -> TopkaAdminPost {
        try await api.patch("/admin/topka/posts/\(id)", body: draft.body(status: status))
    }

    func archive(id: String) async throws -> TopkaAdminPost {
        try await api.delete("/admin/topka/posts/\(id)")
    }

    func upload(data: Data, fileName: String, variant: String) async throws -> TopkaMediaUploadResponse {
        let base64 = data.base64EncodedString()
        return try await api.post("/admin/topka/media/upload", body: [
            "fileName": fileName,
            "variant": variant,
            "dataUrl": "data:image/jpeg;base64,\(base64)"
        ])
    }

    func crop(data: Data, fileName: String, variant: String) async throws -> TopkaMediaUploadResponse {
        let base64 = data.base64EncodedString()
        return try await api.post("/admin/topka/media/crop", body: [
            "fileName": fileName,
            "variant": variant,
            "dataUrl": "data:image/jpeg;base64,\(base64)"
        ])
    }
}

private struct TopkaAdminPostsView: View {
    @StateObject private var vm = TopkaAdminPostsViewModel()

    var body: some View {
        ZStack {
            Color.perklyDark.ignoresSafeArea()

            ScrollView(showsIndicators: false) {
                VStack(spacing: 16) {
                    hero
                    filters

                    if let error = vm.error {
                        TopkaErrorBanner(text: error)
                    }

                    if vm.isLoading && vm.posts.isEmpty {
                        ProgressView()
                            .tint(.perklyOrange)
                            .padding(.top, 40)
                    } else if vm.posts.isEmpty {
                        emptyState
                    } else {
                        LazyVStack(spacing: 12) {
                            ForEach(vm.posts) { post in
                                NavigationLink(destination: TopkaPostEditorView(postId: post.id)) {
                                    TopkaPostAdminRow(post: post) {
                                        Task { await vm.archive(post) }
                                    }
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }
                .padding(20)
                .padding(.bottom, 24)
            }
            .refreshable {
                await vm.load()
            }
        }
        .navigationTitle("Topka")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                NavigationLink(destination: TopkaPostEditorView(postId: nil)) {
                    Image(systemName: "plus.circle.fill")
                        .foregroundColor(.perklyOrange)
                }
            }
        }
        .task {
            await vm.load()
        }
    }

    private var hero: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Circle()
                    .fill(Color.perklyOrange.opacity(0.18))
                    .frame(width: 50, height: 50)
                    .overlay(
                        Image(systemName: "flame.fill")
                            .font(.system(size: 22, weight: .bold))
                            .foregroundColor(.perklyOrange)
                    )

                VStack(alignment: .leading, spacing: 4) {
                    Text("Topka Admin")
                        .font(.system(size: 24, weight: .black))
                        .foregroundColor(.white)
                    Text("Промо, товары, подборки и публикация в iOS-ленту")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(.white.opacity(0.55))
                }

                Spacer()
            }

            HStack(spacing: 8) {
                TopkaAdminPill(title: "\(vm.posts.count) постов", color: .perklyPurple)
                TopkaAdminPill(title: "3:4 image", color: .perklyOrange)
                TopkaAdminPill(title: "admin-only", color: .perklyRed)
            }
        }
        .padding(18)
        .perklySurface(cornerRadius: 24)
    }

    private var filters: some View {
        VStack(spacing: 12) {
            HStack(spacing: 10) {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(.white.opacity(0.35))
                TextField("Поиск по постам...", text: $vm.search)
                    .foregroundColor(.white)
                    .autocorrectionDisabled()
                    .onSubmit { Task { await vm.load() } }
                Button {
                    Task { await vm.load() }
                } label: {
                    Image(systemName: "arrow.clockwise")
                        .foregroundColor(.perklyOrange)
                }
            }
            .padding(14)
            .background(Color.white.opacity(0.05))
            .clipShape(RoundedRectangle(cornerRadius: 16))

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    FilterChip(title: "Все", isSelected: vm.statusFilter == nil) {
                        vm.statusFilter = nil
                        Task { await vm.load() }
                    }
                    ForEach(TopkaPostStatus.allCases) { status in
                        FilterChip(title: status.title, isSelected: vm.statusFilter == status, color: status.color) {
                            vm.statusFilter = status
                            Task { await vm.load() }
                        }
                    }
                }
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    FilterChip(title: "Все типы", isSelected: vm.typeFilter == nil) {
                        vm.typeFilter = nil
                        Task { await vm.load() }
                    }
                    ForEach(TopkaPostType.allCases) { type in
                        FilterChip(title: type.rawValue, isSelected: vm.typeFilter == type, color: .perklyPurple) {
                            vm.typeFilter = type
                            Task { await vm.load() }
                        }
                    }
                }
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "photo.on.rectangle.angled")
                .font(.system(size: 42))
                .foregroundColor(.white.opacity(0.22))
            Text("Постов пока нет")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(.white)
            Text("Нажми плюс сверху, чтобы создать первую промо-публикацию.")
                .font(.system(size: 13))
                .foregroundColor(.white.opacity(0.45))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 48)
    }
}

private struct TopkaPostEditorView: View {
    let postId: String?

    @Environment(\.dismiss) private var dismiss
    @State private var loadedPostId: String?
    @State private var draft = TopkaPostDraft()
    @State private var selectedTab = 0
    @State private var isLoading = true
    @State private var isSaving = false
    @State private var error: String?
    @State private var lastSavedAt: Date?
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var sourceImage: UIImage?
    @State private var cropPreset: TopkaCropPreset = .poster3x4
    @State private var zoom: Double = 1
    @State private var offsetX: Double = 0
    @State private var offsetY: Double = 0
    @State private var rotation: Int = 0
    @State private var flipHorizontal = false
    @State private var jpegQuality: Double = 0.86

    private let service = TopkaAdminService.shared

    var body: some View {
        ZStack {
            Color.perklyDark.ignoresSafeArea()

            if isLoading {
                ProgressView()
                    .tint(.perklyOrange)
            } else {
                ScrollView(showsIndicators: false) {
                    VStack(spacing: 16) {
                        TopkaEditorPreviewCard(draft: draft)

                        Picker("Раздел", selection: $selectedTab) {
                            Text("Контент").tag(0)
                            Text("Фото").tag(1)
                            Text("Публикация").tag(2)
                            Text("Превью").tag(3)
                        }
                        .pickerStyle(.segmented)

                        if let error {
                            TopkaErrorBanner(text: error)
                        }

                        switch selectedTab {
                        case 0:
                            contentTab
                        case 1:
                            photoTab
                        case 2:
                            publishTab
                        default:
                            previewTab
                        }
                    }
                    .padding(20)
                    .padding(.bottom, 28)
                }
            }
        }
        .navigationTitle(draft.title.isEmpty ? "Topka promo" : draft.title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItemGroup(placement: .navigationBarTrailing) {
                Button {
                    Task { await save() }
                } label: {
                    if isSaving {
                        ProgressView()
                            .tint(.perklyOrange)
                    } else {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.perklyGreen)
                    }
                }
            }
        }
        .task {
            await load()
        }
        .onChange(of: selectedPhoto) { _, item in
            guard let item else { return }
            Task { await importPhoto(item) }
        }
    }

    private var contentTab: some View {
        VStack(spacing: 14) {
            TopkaTextField(label: "Заголовок", text: $draft.title)
            TopkaTextField(label: "Подзаголовок", text: $draft.subtitle)

            VStack(alignment: .leading, spacing: 8) {
                Text("Тип")
                    .topkaFieldLabel()
                Picker("Тип", selection: $draft.postType) {
                    ForEach(TopkaPostType.allCases) { type in
                        Text(type.rawValue).tag(type)
                    }
                }
                .pickerStyle(.segmented)
            }

            TopkaTextField(label: "Категория", text: $draft.category)
            TopkaTextEditor(label: "Описание", text: $draft.description, minHeight: 90)
            TopkaTextEditor(label: "Полное описание", text: $draft.fullDescription, minHeight: 120)
            TopkaTextField(label: "Бейджи через запятую", text: $draft.badges, prompt: "Сегодня, Бесплатно, Hot")
            TopkaTextField(label: "Теги через запятую", text: $draft.tags, prompt: "telegram, premium, sale")
            TopkaTextField(label: "Продавец / бренд", text: $draft.location)
            TopkaTextField(label: "Канал / ссылка / адрес", text: $draft.address)
            TopkaTextField(label: "Цена", text: $draft.priceText, prompt: "Бесплатно / от 29 000 сум")
            TopkaTextField(label: "CTA", text: $draft.ctaText, prompt: "Купить")
            TopkaTextField(label: "CTA URL", text: $draft.ctaUrl)
        }
    }

    private var photoTab: some View {
        VStack(spacing: 16) {
            PhotosPicker(selection: $selectedPhoto, matching: .images) {
                HStack(spacing: 12) {
                    Image(systemName: "photo.badge.plus")
                        .font(.system(size: 22, weight: .bold))
                    VStack(alignment: .leading, spacing: 3) {
                        Text("Выбрать фото")
                            .font(.system(size: 16, weight: .bold))
                        Text("Original сохранится отдельно, crop variants сохраняются прямоугольными")
                            .font(.system(size: 12))
                            .foregroundColor(.white.opacity(0.5))
                    }
                    Spacer()
                }
                .foregroundColor(.white)
                .padding(16)
                .background(Color.white.opacity(0.06))
                .clipShape(RoundedRectangle(cornerRadius: 18))
            }

            VStack(spacing: 12) {
                ZStack {
                    RoundedRectangle(cornerRadius: 36)
                        .fill(Color.black.opacity(0.28))

                    if let sourceImage {
                        Image(uiImage: sourceImage)
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .scaleEffect(zoom)
                            .rotationEffect(.degrees(Double(rotation)))
                            .scaleEffect(x: flipHorizontal ? -1 : 1, y: 1)
                            .offset(x: offsetX / 8, y: offsetY / 8)
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                            .clipped()
                    } else if let urlString = draft.media.poster3x4Url ?? draft.media.originalUrl, let url = RemoteImageURL.url(from: urlString) {
                        AsyncImage(url: url) { phase in
                            switch phase {
                            case .success(let image):
                                image.resizable().aspectRatio(contentMode: .fill)
                            default:
                                TopkaFallbackPoster(title: draft.title, category: draft.category)
                            }
                        }
                    } else {
                        TopkaFallbackPoster(title: draft.title, category: draft.category)
                    }

                    VStack {
                        Rectangle()
                            .fill(Color.perklyCyan.opacity(0.08))
                            .frame(height: 68)
                            .overlay(Rectangle().stroke(Color.perklyCyan.opacity(0.55), style: StrokeStyle(lineWidth: 1, dash: [6, 4])))
                        Spacer()
                        Rectangle()
                            .fill(Color.perklyOrange.opacity(0.10))
                            .frame(height: 116)
                            .overlay(Rectangle().stroke(Color.perklyOrange.opacity(0.55), style: StrokeStyle(lineWidth: 1, dash: [6, 4])))
                    }
                }
                .aspectRatio(3.0 / 4.0, contentMode: .fit)
                .clipShape(SquircleShape(cornerRadius: 42, n: 4))

                Picker("Preset", selection: $cropPreset) {
                    ForEach(TopkaCropPreset.allCases) { preset in
                        Text(preset.title).tag(preset)
                    }
                }
                .pickerStyle(.menu)
                .padding(12)
                .background(Color.white.opacity(0.05))
                .clipShape(RoundedRectangle(cornerRadius: 14))

                TopkaSlider(label: "Zoom", value: $zoom, range: 0.75...2.4, step: 0.01)
                TopkaSlider(label: "Pan X", value: $offsetX, range: -360...360, step: 1)
                TopkaSlider(label: "Pan Y", value: $offsetY, range: -360...360, step: 1)
                TopkaSlider(label: "Quality", value: $jpegQuality, range: 0.55...0.95, step: 0.01)

                HStack(spacing: 10) {
                    TopkaToolButton(icon: "rotate.right.fill", title: "90") {
                        rotation = (rotation + 90) % 360
                    }
                    TopkaToolButton(icon: "arrow.left.and.right.righttriangle.left.righttriangle.right.fill", title: "Flip") {
                        flipHorizontal.toggle()
                    }
                    TopkaToolButton(icon: "scope", title: "Auto fit") {
                        zoom = 1
                        offsetX = 0
                        offsetY = 0
                    }
                }

                Button {
                    Task { await exportSelectedCrop() }
                } label: {
                    HStack {
                        if isSaving {
                            ProgressView().tint(.black)
                        } else {
                            Image(systemName: "square.and.arrow.down.fill")
                            Text("Export \(cropPreset.title)")
                        }
                    }
                    .font(.system(size: 15, weight: .black))
                    .foregroundColor(.black)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 15)
                    .background(Color.perklyOrange)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                }
                .disabled(sourceImage == nil || isSaving)

                Button {
                    Task { await exportAllCrops() }
                } label: {
                    Text("Export all standards")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 13)
                        .background(Color.white.opacity(0.08))
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                }
                .disabled(sourceImage == nil || isSaving)
            }
            .padding(14)
            .perklySurface(cornerRadius: 24)
        }
    }

    private var publishTab: some View {
        VStack(spacing: 14) {
            DatePicker("Дата публикации", selection: $draft.date, displayedComponents: .date)
                .topkaDatePickerStyle()

            TopkaTextField(label: "Start time", text: $draft.startTime, prompt: "19:00")
            TopkaTextField(label: "End time", text: $draft.endTime, prompt: "22:00")

            Stepper(value: $draft.priority, in: 0...100) {
                HStack {
                    Text("Priority")
                        .foregroundColor(.white)
                    Spacer()
                    Text("\(draft.priority)")
                        .foregroundColor(.perklyOrange)
                        .fontWeight(.bold)
                }
            }
            .padding(14)
            .background(Color.white.opacity(0.05))
            .clipShape(RoundedRectangle(cornerRadius: 14))

            Toggle("Hero / featured", isOn: $draft.isFeatured)
                .tint(.perklyOrange)
                .padding(14)
                .background(Color.white.opacity(0.05))
                .clipShape(RoundedRectangle(cornerRadius: 14))

            if !draft.validationErrors.isEmpty {
                TopkaErrorBanner(text: "Для публикации не хватает: \(draft.validationErrors.joined(separator: ", "))")
            }

            VStack(spacing: 10) {
                actionButton(title: "Save draft", color: .white.opacity(0.12), textColor: .white) {
                    await save(status: .draft)
                }
                actionButton(title: "Publish", color: .perklyGreen, textColor: .black) {
                    guard draft.validationErrors.isEmpty else {
                        error = "Для публикации не хватает: \(draft.validationErrors.joined(separator: ", "))"
                        return
                    }
                    await save(status: .published)
                    dismiss()
                }
                actionButton(title: "Schedule", color: .perklyCyan, textColor: .black) {
                    guard draft.validationErrors.isEmpty else {
                        error = "Для расписания не хватает: \(draft.validationErrors.joined(separator: ", "))"
                        return
                    }
                    draft.publishAt = draft.publishAt ?? Date()
                    await save(status: .scheduled)
                    dismiss()
                }
                actionButton(title: "Archive", color: .perklyRed.opacity(0.8), textColor: .white) {
                    await save(status: .archived)
                    dismiss()
                }
            }
        }
    }

    private var previewTab: some View {
        VStack(spacing: 14) {
            TopkaVariantPreview(title: "Poster 3:4", urlString: draft.media.poster3x4Url, ratio: 3.0 / 4.0)
            TopkaVariantPreview(title: "Story 9:16", urlString: draft.media.story9x16Url, ratio: 9.0 / 16.0)
            TopkaVariantPreview(title: "Square 1:1", urlString: draft.media.square1x1Url, ratio: 1)
            TopkaVariantPreview(title: "Preview 16:9", urlString: draft.media.preview16x9Url, ratio: 16.0 / 9.0)
        }
    }

    private func actionButton(title: String, color: Color, textColor: Color, action: @escaping () async -> Void) -> some View {
        Button {
            Task { await action() }
        } label: {
            Text(title)
                .font(.system(size: 15, weight: .black))
                .foregroundColor(textColor)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(color)
                .clipShape(RoundedRectangle(cornerRadius: 15))
        }
        .buttonStyle(.plain)
        .disabled(isSaving)
    }

    private func load() async {
        isLoading = true
        error = nil
        do {
            let post: TopkaAdminPost
            if let postId {
                post = try await service.get(id: postId)
            } else {
                post = try await service.create()
            }
            loadedPostId = post.id
            draft = TopkaPostDraft(post: post)
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    private func save(status: TopkaPostStatus? = nil) async {
        guard let loadedPostId else { return }
        isSaving = true
        error = nil
        do {
            let updated = try await service.update(id: loadedPostId, draft: draft, status: status)
            draft = TopkaPostDraft(post: updated)
            lastSavedAt = Date()
            HapticManager.shared.playPurchaseSuccess()
        } catch {
            self.error = error.localizedDescription
            HapticManager.shared.lightImpact()
        }
        isSaving = false
    }

    private func importPhoto(_ item: PhotosPickerItem) async {
        isSaving = true
        error = nil
        do {
            guard let data = try await item.loadTransferable(type: Data.self),
                  let image = UIImage(data: data) else {
                error = "Не удалось открыть изображение"
                isSaving = false
                return
            }
            let preparedImage = image.preparedForTopka(maxLongSide: 2400)
            sourceImage = preparedImage
            if let jpeg = preparedImage.jpegData(compressionQuality: 0.86) {
                let uploaded = try await service.upload(data: jpeg, fileName: "topka-original.jpg", variant: "original")
                draft.media.originalUrl = uploaded.url
                await save()
            }
        } catch {
            self.error = error.localizedDescription
        }
        isSaving = false
    }

    private func exportSelectedCrop() async {
        guard let sourceImage, let loadedPostId else { return }
        isSaving = true
        error = nil
        do {
            let data = try sourceImage.topkaCropJPEG(
                preset: cropPreset,
                zoom: zoom,
                offset: CGSize(width: offsetX, height: offsetY),
                rotation: rotation,
                flipHorizontal: flipHorizontal,
                quality: jpegQuality
            )
            let uploaded = try await service.crop(data: data, fileName: "\(cropPreset.rawValue).jpg", variant: cropPreset.rawValue)
            draft.apply(url: uploaded.url, for: cropPreset)
            let updated = try await service.update(id: loadedPostId, draft: draft)
            draft = TopkaPostDraft(post: updated)
            lastSavedAt = Date()
            HapticManager.shared.playPurchaseSuccess()
        } catch {
            self.error = error.localizedDescription
            HapticManager.shared.lightImpact()
        }
        isSaving = false
    }

    private func exportAllCrops() async {
        guard let sourceImage else { return }
        for preset in TopkaCropPreset.allCases {
            do {
                let data = try sourceImage.topkaCropJPEG(
                    preset: preset,
                    zoom: zoom,
                    offset: CGSize(width: offsetX, height: offsetY),
                    rotation: rotation,
                    flipHorizontal: flipHorizontal,
                    quality: jpegQuality
                )
                let uploaded = try await service.crop(data: data, fileName: "\(preset.rawValue).jpg", variant: preset.rawValue)
                draft.apply(url: uploaded.url, for: preset)
            } catch {
                self.error = error.localizedDescription
                return
            }
        }
        await save()
    }
}

private enum TopkaCropPreset: String, CaseIterable, Identifiable {
    case poster3x4
    case story9x16
    case square1x1
    case preview16x9

    var id: String { rawValue }

    var title: String {
        switch self {
        case .poster3x4: return "Poster 3:4"
        case .story9x16: return "Story 9:16"
        case .square1x1: return "Square 1:1"
        case .preview16x9: return "Preview 16:9"
        }
    }

    var targetSize: CGSize {
        switch self {
        case .poster3x4: return CGSize(width: 1080, height: 1440)
        case .story9x16: return CGSize(width: 1080, height: 1920)
        case .square1x1: return CGSize(width: 1080, height: 1080)
        case .preview16x9: return CGSize(width: 1280, height: 720)
        }
    }
}

private extension TopkaPostDraft {
    mutating func apply(url: String, for preset: TopkaCropPreset) {
        switch preset {
        case .poster3x4: media.poster3x4Url = url
        case .story9x16: media.story9x16Url = url
        case .square1x1: media.square1x1Url = url
        case .preview16x9: media.preview16x9Url = url
        }
    }
}

private struct TopkaPostAdminRow: View {
    let post: TopkaAdminPost
    let onArchive: () -> Void

    var body: some View {
        HStack(spacing: 14) {
            ZStack {
                RoundedRectangle(cornerRadius: 18)
                    .fill(Color.white.opacity(0.06))
                if let posterUrl = post.posterUrl, let url = RemoteImageURL.url(from: posterUrl) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image.resizable().aspectRatio(contentMode: .fill)
                        default:
                            TopkaFallbackPoster(title: post.title, category: post.category)
                        }
                    }
                } else {
                    TopkaFallbackPoster(title: post.title, category: post.category)
                }
            }
            .frame(width: 74, height: 96)
            .clipShape(RoundedRectangle(cornerRadius: 18))

            VStack(alignment: .leading, spacing: 7) {
                HStack(spacing: 7) {
                    TopkaAdminPill(title: post.statusEnum.title, color: post.statusEnum.color)
                    TopkaAdminPill(title: post.postType, color: .perklyPurple)
                }
                Text(post.title.isEmpty ? "Без названия" : post.title)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.white)
                    .lineLimit(2)
                Text("\(post.category) · priority \(post.priority)")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.white.opacity(0.45))
                    .lineLimit(1)
            }

            Spacer()

            Button {
                onArchive()
            } label: {
                Image(systemName: "archivebox.fill")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.perklyRed)
                    .frame(width: 36, height: 36)
                    .background(Color.perklyRed.opacity(0.12))
                    .clipShape(Circle())
            }
            .buttonStyle(.plain)
        }
        .padding(14)
        .perklySurface(cornerRadius: 22)
    }
}

private struct TopkaEditorPreviewCard: View {
    let draft: TopkaPostDraft

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            Group {
                if let urlString = draft.media.poster3x4Url ?? draft.media.originalUrl,
                   let url = RemoteImageURL.url(from: urlString) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image.resizable().aspectRatio(contentMode: .fill)
                        default:
                            TopkaFallbackPoster(title: draft.title, category: draft.category)
                        }
                    }
                } else {
                    TopkaFallbackPoster(title: draft.title, category: draft.category)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            LinearGradient(
                colors: [.black.opacity(0.08), .clear, .black.opacity(0.92)],
                startPoint: .top,
                endPoint: .bottom
            )

            VStack(alignment: .leading, spacing: 10) {
                HStack(spacing: 7) {
                    ForEach(draft.badges.split(separator: ",").prefix(3), id: \.self) { badge in
                        TopkaAdminPill(title: badge.trimmingCharacters(in: .whitespaces), color: .perklyOrange)
                    }
                }
                Text(draft.title.isEmpty ? "Название поста" : draft.title)
                    .font(.system(size: 27, weight: .black, design: .rounded))
                    .foregroundColor(.white)
                    .lineLimit(2)
                Text(draft.description.isEmpty ? "Короткое описание товара или промо" : draft.description)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(.white.opacity(0.7))
                    .lineLimit(2)
                HStack(spacing: 8) {
                    TopkaAdminPill(title: draft.startTime.isEmpty ? "19:00" : draft.startTime, color: .white.opacity(0.6))
                    TopkaAdminPill(title: draft.location.isEmpty ? "Perkly" : draft.location, color: .white.opacity(0.6))
                }
            }
            .padding(22)
        }
        .aspectRatio(3.0 / 4.0, contentMode: .fit)
        .clipShape(SquircleShape(cornerRadius: 44, n: 4))
        .overlay(
            SquircleShape(cornerRadius: 44, n: 4)
                .stroke(Color.white.opacity(0.08), lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.35), radius: 24, y: 14)
    }
}

private struct TopkaVariantPreview: View {
    let title: String
    let urlString: String?
    let ratio: CGFloat

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .topkaFieldLabel()
            ZStack {
                RoundedRectangle(cornerRadius: 22)
                    .fill(Color.white.opacity(0.05))
                if let urlString, let url = RemoteImageURL.url(from: urlString) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image.resizable().aspectRatio(contentMode: .fill)
                        default:
                            Text("Нет экспорта")
                                .foregroundColor(.white.opacity(0.35))
                        }
                    }
                } else {
                    Text("Нет экспорта")
                        .foregroundColor(.white.opacity(0.35))
                }
            }
            .aspectRatio(ratio, contentMode: .fit)
            .clipShape(RoundedRectangle(cornerRadius: 22))
        }
    }
}

private struct TopkaTextField: View {
    let label: String
    @Binding var text: String
    var prompt: String = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label)
                .topkaFieldLabel()
            TextField(prompt, text: $text)
                .foregroundColor(.white)
                .padding(14)
                .background(Color.white.opacity(0.06))
                .clipShape(RoundedRectangle(cornerRadius: 14))
                .autocorrectionDisabled()
        }
    }
}

private struct TopkaTextEditor: View {
    let label: String
    @Binding var text: String
    let minHeight: CGFloat

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label)
                .topkaFieldLabel()
            TextEditor(text: $text)
                .foregroundColor(.white)
                .frame(minHeight: minHeight)
                .scrollContentBackground(.hidden)
                .padding(10)
                .background(Color.white.opacity(0.06))
                .clipShape(RoundedRectangle(cornerRadius: 14))
        }
    }
}

private struct TopkaSlider: View {
    let label: String
    @Binding var value: Double
    let range: ClosedRange<Double>
    let step: Double

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(label)
                    .topkaFieldLabel()
                Spacer()
                Text(String(format: "%.2f", value))
                    .font(.system(size: 12, weight: .bold, design: .monospaced))
                    .foregroundColor(.white.opacity(0.45))
            }
            Slider(value: $value, in: range, step: step)
                .tint(.perklyOrange)
        }
    }
}

private struct TopkaToolButton: View {
    let icon: String
    let title: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 7) {
                Image(systemName: icon)
                Text(title)
            }
            .font(.system(size: 12, weight: .black))
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(Color.white.opacity(0.08))
            .clipShape(RoundedRectangle(cornerRadius: 14))
        }
        .buttonStyle(.plain)
    }
}

private struct TopkaAdminPill: View {
    let title: String
    let color: Color

    var body: some View {
        Text(title)
            .font(.system(size: 10, weight: .black))
            .foregroundColor(color == .white.opacity(0.6) ? .white.opacity(0.72) : color)
            .lineLimit(1)
            .padding(.horizontal, 9)
            .padding(.vertical, 6)
            .background(color.opacity(0.14))
            .clipShape(Capsule())
    }
}

private struct FilterChip: View {
    let title: String
    let isSelected: Bool
    var color: Color = .perklyOrange
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(isSelected ? .black : .white.opacity(0.65))
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(isSelected ? color : Color.white.opacity(0.06))
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }
}

private struct TopkaErrorBanner: View {
    let text: String

    var body: some View {
        HStack(alignment: .top, spacing: 9) {
            Image(systemName: "exclamationmark.triangle.fill")
            Text(text)
                .fixedSize(horizontal: false, vertical: true)
            Spacer()
        }
        .font(.system(size: 13, weight: .medium))
        .foregroundColor(.perklyRed)
        .padding(13)
        .background(Color.perklyRed.opacity(0.12))
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }
}

private struct TopkaFallbackPoster: View {
    let title: String
    let category: String

    var body: some View {
        LinearGradient(
            colors: [Color.perklyOrange.opacity(0.62), Color.perklyPurple.opacity(0.32), Color.black],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .overlay {
            VStack(spacing: 10) {
                Image(systemName: "flame.fill")
                    .font(.system(size: 38, weight: .bold))
                    .foregroundColor(.white.opacity(0.20))
                Text(category.isEmpty ? "Topka" : category)
                    .font(.system(size: 11, weight: .black))
                    .foregroundColor(.white.opacity(0.55))
                    .textCase(.uppercase)
                Text(title.isEmpty ? "Topka promo" : title)
                    .font(.system(size: 18, weight: .black, design: .rounded))
                    .foregroundColor(.white.opacity(0.75))
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
            }
            .padding(24)
        }
    }
}

private extension Text {
    func topkaFieldLabel() -> some View {
        self
            .font(.system(size: 12, weight: .bold))
            .foregroundColor(.white.opacity(0.48))
    }
}

private extension View {
    func topkaDatePickerStyle() -> some View {
        self
            .foregroundColor(.white)
            .padding(14)
            .background(Color.white.opacity(0.05))
            .clipShape(RoundedRectangle(cornerRadius: 14))
    }
}

private enum TopkaDateParser {
    static func date(from value: String?) -> Date? {
        guard let value else { return nil }
        if let date = try? Date(value, strategy: .iso8601) {
            return date
        }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: value) {
            return date
        }
        return ISO8601DateFormatter().date(from: value)
    }
}

private extension UIImage {
    func preparedForTopka(maxLongSide: CGFloat) -> UIImage {
        let normalized = normalizedOrientationForTopka()
        let longestSide = max(normalized.size.width, normalized.size.height)
        guard longestSide > maxLongSide else { return normalized }

        let scale = maxLongSide / longestSide
        let targetSize = CGSize(
            width: floor(normalized.size.width * scale),
            height: floor(normalized.size.height * scale)
        )

        let format = UIGraphicsImageRendererFormat.default()
        format.scale = 1
        let renderer = UIGraphicsImageRenderer(size: targetSize, format: format)
        return renderer.image { _ in
            normalized.draw(in: CGRect(origin: .zero, size: targetSize))
        }
    }

    private func normalizedOrientationForTopka() -> UIImage {
        guard imageOrientation != .up else { return self }
        let format = UIGraphicsImageRendererFormat.default()
        format.scale = 1
        let renderer = UIGraphicsImageRenderer(size: size, format: format)
        return renderer.image { _ in
            draw(in: CGRect(origin: .zero, size: size))
        }
    }

    func topkaCropJPEG(
        preset: TopkaCropPreset,
        zoom: Double,
        offset: CGSize,
        rotation: Int,
        flipHorizontal: Bool,
        quality: Double
    ) throws -> Data {
        let target = preset.targetSize
        let renderer = UIGraphicsImageRenderer(size: target)
        let image = renderer.image { context in
            UIColor.black.setFill()
            context.fill(CGRect(origin: .zero, size: target))

            let ctx = context.cgContext
            ctx.translateBy(x: target.width / 2 + offset.width, y: target.height / 2 + offset.height)
            ctx.rotate(by: CGFloat(rotation) * .pi / 180)
            ctx.scaleBy(x: flipHorizontal ? -1 : 1, y: 1)

            let baseScale = max(target.width / size.width, target.height / size.height) * CGFloat(zoom)
            let drawSize = CGSize(width: size.width * baseScale, height: size.height * baseScale)
            draw(in: CGRect(
                x: -drawSize.width / 2,
                y: -drawSize.height / 2,
                width: drawSize.width,
                height: drawSize.height
            ))
        }

        guard let data = image.jpegData(compressionQuality: quality) else {
            throw APIError.invalidRequestBody
        }
        return data
    }
}
