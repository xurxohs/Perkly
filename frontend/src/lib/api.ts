import { getSessionId, hasAnalyticsConsent } from '@/hooks/useSessionId';

// Type Definitions
export interface User {
    id: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
    role: 'USER' | 'VENDOR' | 'ADMIN';
    tier: 'SILVER' | 'GOLD' | 'PLATINUM';
    balance: number;
    rewardPoints: number;
    createdAt: string;
    updatedAt: string;
}

export interface Offer {
    id: string;
    title: string;
    description: string;
    price: number;
    discountPercent: number | null;
    vendorLogo: string | null;
    imageUrl: string | null;
    thumbnailUrl: string | null;
    images?: string[] | null;
    category: string;
    fulfillmentType: 'PROMOCODE' | 'DIGITAL_CODE' | 'LINK' | 'INSTRUCTIONS';
    isExclusive: boolean;
    isFlashDrop: boolean;
    expiresAt: string | null;
    latitude: number | null;
    longitude: number | null;
    sellerId: string;
    seller?: User;
    isActive: boolean;
    moderationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
    moderationNote?: string | null;
    moderationAt?: string | null;
    moderationBy?: string | null;
    usageInstructions?: string;
    hiddenData?: string;
    _count?: {
        transactions: number;
    };
}

export interface CatalogBanner {
    id: string;
    imageUrl: string;
    href: string;
    altText: string;
    width: number;
    height: number;
    sortOrder: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface SavedOffer {
    id: string;
    userId: string;
    offerId: string;
    source: string;
    createdAt: string;
    offer: Offer;
}

export interface Squad {
    id: string;
    name: string;
    inviteCode: string;
    monthlyGoal: number;
    currentSpending: number;
    isGoalReached: boolean;
    rewardTriggeredDate: string | null;
    members: {
        id: string;
        displayName: string | null;
        avatarUrl: string | null;
    }[];
}

export interface Transaction {
    id: string;
    offerId: string;
    buyerId: string;
    price: number;
    status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'PAID' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED' | 'DISPUTED' | 'ESCROW' | 'ACTIVATED';
    expiresAt?: string | null;
    isGift?: boolean;
    giftCode?: string | null;
    isRedeemed?: boolean;
    promocodeActivationId?: string | null;
    promocodeDiscount?: number | null;
    promocodeCodeSnapshot?: string | null;
    buyerComment?: string | null;
    createdAt: string;
    offer?: Offer;
    buyer?: User;
}

export type TransactionStatus = Transaction['status'];

export interface ChatMessage {
    id: string;
    content: string;
    roomId: string;
    senderId: string | null;
    isRead: boolean;
    createdAt: string;
    sender?: User;
}

export type ChatRealtimeEvent =
    | {
        type: 'message_created';
        roomId: string;
        participantIds: string[];
        actorId?: string;
        message: ChatMessage;
        createdAt: string;
    }
    | {
        type: 'messages_read';
        roomId: string;
        participantIds: string[];
        actorId?: string;
        readCount?: number;
        createdAt: string;
    }
    | {
        type: 'typing';
        roomId: string;
        participantIds: string[];
        actorId?: string;
        isTyping?: boolean;
        expiresAt?: string;
        createdAt: string;
    }
    | {
        type: 'room_updated';
        roomId: string;
        participantIds: string[];
        actorId?: string;
        room?: ChatRoom;
        createdAt: string;
    };

export interface ChatRoom {
    id: string;
    type: 'DIRECT' | 'SUPPORT' | 'SYSTEM' | 'DISPUTE';
    transactionId?: string | null;
    participants: User[];
    messages?: ChatMessage[];
    unreadCount?: number;
    updatedAt: string;
    transaction?: Transaction;
}

export interface WheelStatus {
    spinsUsed: number;
    dailyLimit: number;
    spinsRemaining: number;
    canSpin: boolean;
    resetAt: string;
}

export interface WheelSpinResponse {
    success: boolean;
    message: string;
    reward: string;
    points: number;
    newRewardPoints: number;
    newBalance: number;
    dailyLimit: number;
    spinsUsed: number;
    spinsRemaining: number;
    resetAt: string;
}

export interface DailyBonusReward {
    day: number;
    points: number;
}

export interface DailyBonusProgressDay {
    day: string;
    label: string;
    claimed: boolean;
    reward: DailyBonusReward;
}

export interface DailyBonusStatus {
    currentStreak: number;
    longestStreak: number;
    canClaimToday: boolean;
    claimedToday: boolean;
    streakAtRisk: boolean;
    todayReward: DailyBonusReward;
    nextReward: DailyBonusReward;
    weekProgress: DailyBonusProgressDay[];
    resetAt: string;
}

export interface PaginationMeta {
    skip: number;
    take: number;
    total: number;
    hasMore: boolean;
    nextSkip: number;
}

export interface ChatRoomsResponse {
    data: ChatRoom[];
    rooms?: ChatRoom[];
    total: number;
    pagination: PaginationMeta;
}

export interface ChatMessagesResponse {
    data: ChatMessage[];
    pagination?: PaginationMeta;
    room?: Pick<ChatRoom, 'id' | 'type'> & {
        roomType?: ChatRoom['type'];
        roomStatus?: string;
        transactionSummary?: unknown;
    };
}

export interface Dispute {
    id: string;
    transactionId: string;
    reason: string;
    status: 'OPEN' | 'RESOLVED' | 'CLOSED';
    createdAt: string;
    transaction?: Transaction;
    resolution?: 'BUYER' | 'SELLER';
    adminNote?: string | null;
    resolvedBy?: string | null;
    resolvedAt?: string | null;
    messages?: ChatMessage[];
}

export interface ModerationReport {
    id: string;
    reporterId: string;
    targetType: 'OFFER' | 'SELLER' | 'EVENT' | 'MESSAGE' | 'USER';
    targetId: string;
    category: 'FRAUD' | 'MISLEADING' | 'INAPPROPRIATE' | 'HARASSMENT' | 'SPAM' | 'SAFETY' | 'OTHER';
    description: string;
    status: 'OPEN' | 'REVIEWING' | 'RESOLVED' | 'REJECTED';
    resolution?: string | null;
    createdAt: string;
    updatedAt: string;
    reporter?: Pick<User, 'id' | 'email' | 'displayName' | 'role'>;
}

export interface ModerationAppeal {
    id: string;
    userId: string;
    subjectType: 'ACCOUNT' | 'REPORT' | 'TRANSACTION' | 'CONTENT';
    subjectId?: string | null;
    reason: string;
    status: 'OPEN' | 'REVIEWING' | 'RESOLVED' | 'REJECTED';
    resolution?: string | null;
    createdAt: string;
    updatedAt: string;
    user?: Pick<User, 'id' | 'email' | 'displayName' | 'role'>;
}

export interface SellerStats {
    totalEarnings: number;
    completedVolume: number;
    totalSales: number;
    activeOffers: number;
    activeEvents: number;
    eventViews: number;
    eventParticipants: number;
    recentTransactions: Transaction[];
}

export interface PartnerCapabilities {
    userId: string;
    role: string;
    tier: 'SILVER' | 'GOLD' | 'PLATINUM';
    planName: string;
    status: 'NONE' | 'ACTIVE' | 'EXPIRED' | 'CANCELED';
    isActive: boolean;
    daysRemaining: number | null;
    capabilities: {
        canCreateOffers: boolean;
        canFeatureOffers: boolean;
        canPublishTopka: boolean;
        canViewBasicAnalytics: boolean;
        canViewAdvancedAnalytics: boolean;
        hasPrioritySupport: boolean;
    };
    limits: { offersLimit: number; topkaMonthlyLimit: number; featuredOffersPerMonth: number };
    usage: { activeOffers: number; activeEvents: number; topkaPublishedThisMonth: number };
    upgrade: { requiredTier: 'SILVER' | 'GOLD' | 'PLATINUM'; reason: string; ctaTitle: string } | null;
}

export type CompanyStatus = 'PENDING_MODERATION' | 'ACTIVE' | 'SUSPENDED';

export interface Company {
    id: string;
    ownerUserId: string;
    legalName: string;
    brandName: string;
    inn: string;
    phone: string | null;
    status: CompanyStatus;
    createdAt: string;
    updatedAt: string;
    owner?: {
        id: string;
        email: string;
        displayName: string | null;
        role: string;
        phone?: string | null;
        telegramId?: string | null;
    };
    _count?: {
        offers: number;
        promocodes: number;
    };
}

export interface CompanyApplicationInput {
    legalName: string;
    brandName: string;
    inn: string;
    phone?: string;
}

export type PromocodeStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
export type PromocodeCodeType = 'STATIC' | 'DYNAMIC';
export type PromocodeActivationStatus = 'ISSUED' | 'COPIED' | 'USED';

export interface Promocode {
    id: string;
    companyId: string;
    offerId: string | null;
    title: string;
    description: string | null;
    codeType: PromocodeCodeType;
    code: string | null;
    discountValue: number;
    maxActivations: number | null;
    perUserLimit: number;
    validFrom: string | null;
    validTo: string | null;
    status: PromocodeStatus;
    createdAt: string;
    updatedAt: string;
    offer?: Pick<Offer, 'id' | 'title' | 'isActive'> | null;
    _count?: {
        activations: number;
    };
}

export interface PromocodeInput {
    companyId?: string;
    offerId?: string | null;
    title?: string;
    description?: string;
    codeType?: PromocodeCodeType;
    code?: string;
    discountValue?: number;
    maxActivations?: number | null;
    perUserLimit?: number;
    validFrom?: string | null;
    validTo?: string | null;
    status?: PromocodeStatus;
}

export interface PromocodeActivation {
    id: string;
    userId: string;
    promocodeId: string;
    offerId: string | null;
    status: PromocodeActivationStatus;
    codeSnapshot: string | null;
    copiedAt: string | null;
    usedAt: string | null;
    expiresAt: string | null;
    createdAt: string;
    updatedAt: string;
    promocode?: Promocode & {
        company?: Pick<Company, 'id' | 'brandName'>;
        offer?: Pick<Offer, 'id' | 'title' | 'vendorLogo' | 'category'> | null;
    };
}

export interface PromocodeAnalytics {
    summary: {
        totalPromocodes: number;
        activePromocodes: number;
        totalActivations: number;
        copiedActivations: number;
        usedActivations: number;
        copyRate: number;
        useRate: number;
    };
    promocodes: {
        id: string;
        title: string;
        status: PromocodeStatus;
        discountValue: number;
        maxActivations: number | null;
        perUserLimit: number;
        offerTitle: string | null;
        activations: number;
        copied: number;
        used: number;
        issued: number;
        copyRate: number;
        useRate: number;
        quotaUsedRate: number | null;
    }[];
}

export interface AnalyticsEvent {
    id: string;
    eventType: string;
    userId: string | null;
    sessionId: string | null;
    offerId: string | null;
    metadata: string | null;
    createdAt: string;
}

export interface AdminStats {
    usersCount: number;
    newUsersToday: number;
    activeOffersCount: number;
    totalVolume: number;
    platformIncome: number;
    openDisputesCount: number;
    pendingCompaniesCount: number;
    openReportsCount: number;
    openAppealsCount: number;
    diagnosticOccurrences: number;
    recentTransactions: Transaction[];
    recentUsers: User[];
}

export interface AdminLog {
    id: string;
    adminId: string;
    action: string;
    targetId?: string | null;
    details?: string | null;
    createdAt: string;
    admin?: Pick<User, 'id' | 'email' | 'displayName'> | null;
}

export interface DiagnosticIssue {
    id: string;
    fingerprint: string;
    kind: string;
    message: string;
    appVersion?: string | null;
    osVersion?: string | null;
    deviceModel?: string | null;
    userId?: string | null;
    breadcrumbs?: string | null;
    occurrences: number;
    firstSeenAt: string;
    lastSeenAt: string;
}

export interface Event {
    id: string;
    title: string;
    category: string;
    description: string;
    fullDescription: string | null;
    date: string;
    startTime: string;
    ageLimit: string;
    location: string;
    address: string;
    latitude: number | null;
    longitude: number | null;
    imageUrl: string;
    viewersCount: number;
    participantsCount: number;
    organizerId: string;
    createdAt: string;
    updatedAt: string;
    postType?: 'event' | 'poster' | 'promo' | 'collection' | 'news' | 'place';
    subtitle?: string | null;
    tags?: string[];
    badges?: string[];
    endTime?: string | null;
    priceText?: string | null;
    ctaText?: string | null;
    ctaUrl?: string | null;
    priority?: number;
    isFeatured?: boolean;
    media?: {
        originalUrl?: string | null;
        poster3x4Url?: string | null;
        story9x16Url?: string | null;
        square1x1Url?: string | null;
        preview16x9Url?: string | null;
    };
}

export interface TopkaPost {
    id: string;
    postType: 'event' | 'poster' | 'promo' | 'collection' | 'news' | 'place';
    status: 'draft' | 'scheduled' | 'published' | 'archived';
    title: string;
    subtitle: string | null;
    description: string;
    fullDescription: string | null;
    category: string;
    tags: string[];
    badges: string[];
    date: string | null;
    startTime: string | null;
    endTime: string | null;
    location: string | null;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    priceText: string | null;
    ctaText: string | null;
    ctaUrl: string | null;
    priority: number;
    isFeatured: boolean;
    publishAt: string | null;
    expiresAt: string | null;
    media: {
        originalUrl?: string | null;
        poster3x4Url?: string | null;
        story9x16Url?: string | null;
        square1x1Url?: string | null;
        preview16x9Url?: string | null;
    };
    dominantColor: string | null;
    fallbackGradient: string | null;
    createdBy: string | null;
    updatedBy: string | null;
    createdAt: string;
    updatedAt: string;
}

export type TopkaPostInput = Partial<Omit<TopkaPost, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>>;


const API_BASE = typeof window !== 'undefined' ? '/api' : (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001');

function getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('perkly_token');
}

function getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    const token = getToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const sessionId = getSessionId();
    if (sessionId) {
        headers['X-Session-Id'] = sessionId;
    }
    return headers;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
        ...getAuthHeaders(),
    };

    const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(error.message || `API Error: ${res.status}`);
    }

    return res.json();
}

// ===== AUTH =====
export const authApi = {
    login: (data: unknown) =>
        request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    register: (data: unknown) =>
        request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    telegramLogin: (data: unknown) =>
        request('/auth/telegram', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    telegramMiniapp: (initData: string) =>
        request('/auth/telegram-miniapp', {
            method: 'POST',
            body: JSON.stringify({ initData }),
        }),
    telegramInit: () =>
        request<{ token: string; url: string }>('/auth/telegram-init'),
    telegramPoll: (token: string) =>
        request<{ status: string; access_token?: string; user?: { message?: string } }>('/auth/telegram-poll?token=' + token),
    me: () =>
        request<User>('/auth/me'),
};

// ===== REVIEWS =====
export const reviewsApi = {
    create: (data: { rating: number; comment?: string; offerId: string; authorId: string }) =>
        request('/reviews', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    findByOfferId: (offerId: string) =>
        request(`/reviews/offer/${offerId}`),
    getOfferStats: (offerId: string) =>
        request(`/reviews/offer/${offerId}/stats`),
};

// ===== OFFERS =====
export interface OfferFilters {
    skip?: number;
    take?: number;
    category?: string;
    fulfillmentType?: Offer['fulfillmentType'];
    search?: string;
    sort?: string;
    isFlashDrop?: boolean;
    minPrice?: number;
    maxPrice?: number;
    lat?: number;
    lng?: number;
    radiusKm?: number;
}

export const offersApi = {
    list: (filters: OfferFilters = {}) => {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, val]) => {
            if (val !== undefined && val !== '') params.set(key, String(val));
        });
        return request<{ data: Offer[]; total: number }>(`/offers?${params.toString()}`, { cache: 'no-store' });
    },

    getById: (id: string) =>
        request<Offer>(`/offers/${id}`),

    create: (data: unknown) =>
        request<Offer>('/offers', { method: 'POST', body: JSON.stringify(data) }),

    createVendor: (data: unknown) =>
        request<Offer>('/offers/vendor', { method: 'POST', body: JSON.stringify(data) }),

    uploadVendorImage: (dataUrl: string) =>
        request<{ url: string }>('/offers/vendor/upload', {
            method: 'POST',
            body: JSON.stringify({ dataUrl }),
        }),

    updateVendorOffer: (id: string, data: unknown) =>
        request<Offer>(`/offers/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),

    deleteVendorOffer: (id: string) =>
        request<Offer>(`/offers/${id}`, {
            method: 'DELETE',
        }),

    featureOffer: (id: string, days: number) =>
        request<{ featuredUntil: string }>(`/offers/${id}/feature`, {
            method: 'POST',
            body: JSON.stringify({ days }),
        }),

    getMyOffers: () =>
        request<Offer[]>('/offers/vendor/me'),

    save: (id: string) =>
        request<SavedOffer>(`/offers/${id}/save`, {
            method: 'POST',
        }),

    unsave: (id: string) =>
        request<{ deleted: boolean }>(`/offers/${id}/save`, {
            method: 'DELETE',
        }),
};

// ===== TRANSACTIONS =====
export const transactionsApi = {
    purchase: (offerId: string, isGift = false, promocodeActivationId?: string, idempotencyKey = crypto.randomUUID(), buyerComment?: string) =>
        request<Transaction>('/transactions', {
            method: 'POST',
            body: JSON.stringify({ offerId, isGift, promocodeActivationId, idempotencyKey, buyerComment }),
        }),

    validatePromocode: (data: { code: string; amount: number; offerId?: string }) =>
        request<{ activationId: string; code: string | null; label: string; percent: number; discountAmount: number; finalAmount: number }>('/transactions/promo/validate', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    list: (skip = 0, take = 20) =>
        request<{ data: Transaction[]; total: number }>(`/transactions?skip=${skip}&take=${take}`),

    getById: (id: string) =>
        request<Transaction>(`/transactions/${id}`),

    confirm: (id: string) =>
        request<Transaction>(`/transactions/${id}/confirm`, {
            method: 'PATCH',
        }),

    redeem: (code: string) =>
        request<Transaction>('/transactions/redeem', {
            method: 'POST',
            body: JSON.stringify({ code }),
        }),

    getSubscriptions: () =>
        request<Transaction[]>('/transactions/subscriptions'),
};

// ===== USERS =====
export const usersApi = {
    getMe: () =>
        request<User>('/users/me'),

    exportPersonalData: () =>
        request<Record<string, unknown>>('/users/me/export'),

    updateProfile: (data: { displayName?: string; avatarUrl?: string }) =>
        request<User>('/users/me', {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),

    uploadAvatar: (dataUrl: string) =>
        request<User>('/users/me/avatar', {
            method: 'POST',
            body: JSON.stringify({ dataUrl }),
        }),

    removeAvatar: () =>
        request<User>('/users/me/avatar', { method: 'DELETE' }),

    getStats: () =>
        request<{ totalSpent: number; totalPurchases: number }>('/users/me/stats'),

    getSavedOffers: () =>
        request<SavedOffer[]>('/users/me/saved-offers'),

    getBlockedUsers: () =>
        request<Array<{
            id: string;
            createdAt: string;
            blocked: Pick<User, 'id' | 'displayName' | 'avatarUrl'>;
        }>>('/users/me/blocked'),

    blockUser: (userId: string) =>
        request<{ id: string; blockerId: string; blockedId: string; createdAt: string }>(
            `/users/${userId}/block`,
            { method: 'POST' },
        ),

    unblockUser: (userId: string) =>
        request<{ success: boolean; removed: boolean }>(`/users/${userId}/block`, {
            method: 'DELETE',
        }),

    subscribe: (tier: 'GOLD' | 'PLATINUM', months: number) =>
        request<{ subscription: unknown; tier: string; endDate: string; cost: number }>('/users/me/subscribe',
            { method: 'POST', body: JSON.stringify({ tier, months }) },
        ),

    getWheelStatus: () =>
        request<WheelStatus>('/users/me/wheel/status'),

    spinWheel: () =>
        request<WheelSpinResponse>('/users/me/wheel/spin', {
            method: 'POST',
        }),

    getDailyBonusStatus: () =>
        request<DailyBonusStatus>('/users/me/daily-bonus/status'),

    claimDailyBonus: () =>
        request<{ success: boolean; message: string; points: number; newStreak: number; newRewardPoints: number }>('/users/me/daily-bonus/claim', {
            method: 'POST',
        }),
};

// ===== SAFETY & APPEALS =====
export const safetyApi = {
    createReport: (data: Pick<ModerationReport, 'targetType' | 'targetId' | 'category' | 'description'>) =>
        request<ModerationReport>('/safety/reports', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    myReports: () => request<ModerationReport[]>('/safety/reports/me'),
    createAppeal: (data: Pick<ModerationAppeal, 'subjectType' | 'reason'> & { subjectId?: string }) =>
        request<ModerationAppeal>('/safety/appeals', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    myAppeals: () => request<ModerationAppeal[]>('/safety/appeals/me'),
    adminReports: (status = '') =>
        request<ModerationReport[]>(`/safety/admin/reports${status ? `?status=${encodeURIComponent(status)}` : ''}`),
    adminAppeals: (status = '') =>
        request<ModerationAppeal[]>(`/safety/admin/appeals${status ? `?status=${encodeURIComponent(status)}` : ''}`),
    resolveReport: (id: string, status: string, resolution: string) =>
        request<ModerationReport>(`/safety/admin/reports/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status, resolution }),
        }),
    resolveAppeal: (id: string, status: string, resolution: string) =>
        request<ModerationAppeal>(`/safety/admin/appeals/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status, resolution }),
        }),
};

// ===== COMPANIES =====
export const companiesApi = {
    getMine: () =>
        request<Company | null>('/companies/me'),

    apply: (data: CompanyApplicationInput) =>
        request<Company>('/companies/apply', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    list: (status?: CompanyStatus) =>
        request<Company[]>(`/companies${status ? `?status=${status}` : ''}`),

    updateStatus: (id: string, status: CompanyStatus) =>
        request<Company>(`/companies/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        }),
};

// ===== PROMOCODES =====
export const promocodesApi = {
    listMine: () => request<Promocode[]>('/promocodes/company/me'),

    analytics: () => request<PromocodeAnalytics>('/promocodes/company/me/analytics'),

    create: (data: PromocodeInput) =>
        request<Promocode>('/promocodes', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    update: (id: string, data: PromocodeInput) =>
        request<Promocode>(`/promocodes/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),

    updateStatus: (id: string, status: PromocodeStatus) =>
        request<Promocode>(`/promocodes/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        }),

    activate: (id: string) =>
        request<PromocodeActivation>(`/promocodes/${id}/activate`, {
            method: 'POST',
        }),

    copyActivation: (id: string) =>
        request<PromocodeActivation>(`/promocodes/activations/${id}/copy`, {
            method: 'POST',
        }),

    useActivation: (id: string) =>
        request<PromocodeActivation>(`/promocodes/activations/${id}/use`, {
            method: 'POST',
        }),

    listMyActivations: () => request<PromocodeActivation[]>('/users/me/promocode-activations'),
};

// ===== PAYMENTS =====
export const paymentsApi = {
    topUp: (amount: number, idempotencyKey = crypto.randomUUID()) =>
        request<{ deposit: { id: string }; paymentUrl: string }>('/payments/topup', {
            method: 'POST',
            body: JSON.stringify({ amount, idempotencyKey }),
        }),
    mockWebhook: (depositId: string, success: boolean) =>
        request<unknown>('/payments/webhook/mock', {
            method: 'POST',
            body: JSON.stringify({ depositId, success }),
        }),
};

// ===== ANALYTICS =====
export const analyticsApi = {
    trackEvent: (data: { eventType: string; offerId?: string; metadata?: string }) => {
        if (!hasAnalyticsConsent()) {
            return Promise.resolve({ skipped: true as const });
        }
        return request('/analytics/events', {
            method: 'POST',
            headers: { 'X-Analytics-Consent': 'granted' },
            body: JSON.stringify(data),
        });
    },
    getEvents: (params?: { eventType?: string; userId?: string; skip?: number; take?: number }) => {
        const urlParams = new URLSearchParams();
        if (params?.eventType) urlParams.append('eventType', params.eventType);
        if (params?.userId) urlParams.append('userId', params.userId);
        if (params?.skip) urlParams.append('skip', String(params.skip));
        if (params?.take) urlParams.append('take', String(params.take));
        return request<{ data: AnalyticsEvent[]; total: number }>(`/analytics/events?${urlParams.toString()}`);
    }
};

// ===== CHAT =====
export const chatApi = {
    getRooms: async (params?: { skip?: number; take?: number }) => {
        const urlParams = new URLSearchParams();
        if (params?.skip !== undefined) {
            urlParams.append('skip', String(params.skip));
        }
        if (params?.take !== undefined) {
            urlParams.append('take', String(params.take));
        }
        const query = urlParams.toString();
        const response = await request<ChatRoomsResponse | ChatRoom[]>(
            `/chat/rooms${query ? `?${query}` : ''}`,
        );

        if (Array.isArray(response)) {
            return {
                data: response,
                rooms: response,
                total: response.length,
                pagination: {
                    skip: params?.skip ?? 0,
                    take: params?.take ?? response.length,
                    total: response.length,
                    hasMore: false,
                    nextSkip: (params?.skip ?? 0) + response.length,
                },
            };
        }

        return response;
    },

    getMessages: (roomId: string, params?: { skip?: number; take?: number }) => {
        const urlParams = new URLSearchParams();
        if (params?.skip !== undefined) {
            urlParams.append('skip', String(params.skip));
        }
        if (params?.take !== undefined) {
            urlParams.append('take', String(params.take));
        }
        const query = urlParams.toString();
        return request<ChatMessagesResponse>(`/chat/rooms/${roomId}/messages${query ? `?${query}` : ''}`);
    },

    sendMessage: (roomId: string, content: string) =>
        request<ChatMessage>('/chat/messages', {
            method: 'POST',
            body: JSON.stringify({ roomId, content }),
        }),

    markAsRead: (roomId: string) =>
        request<{ success: boolean }>('/chat/messages/read', {
            method: 'PATCH',
            body: JSON.stringify({ roomId }),
        }),

    createDirectRoom: (targetUserId: string) =>
        request<ChatRoom>('/chat/rooms', {
            method: 'POST',
            body: JSON.stringify({ targetUserId }),
        }),

    setTyping: (roomId: string, isTyping = true) =>
        request<{ success: boolean; roomId: string; isTyping: boolean; expiresAt: string }>(`/chat/rooms/${roomId}/typing`, {
            method: 'POST',
            body: JSON.stringify({ isTyping }),
        }),

    subscribeToEvents: (
        onEvent: (event: ChatRealtimeEvent) => void,
        onError?: (error: unknown) => void,
    ) => {
        const controller = new AbortController();

        const parseEventBlock = (block: string) => {
            const data = block
                .split('\n')
                .filter((line) => line.startsWith('data:'))
                .map((line) => line.slice(5).trimStart())
                .join('\n');

            if (!data) return;

            try {
                onEvent(JSON.parse(data) as ChatRealtimeEvent);
            } catch (error) {
                onError?.(error);
            }
        };

        const connect = async () => {
            try {
                const response = await fetch(`${API_BASE}/chat/events`, {
                    headers: getAuthHeaders(),
                    signal: controller.signal,
                });

                if (!response.ok) {
                    throw new Error(`Chat events failed: ${response.status}`);
                }
                if (!response.body) {
                    throw new Error('Chat events stream is not available');
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                while (!controller.signal.aborted) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const blocks = buffer.split(/\r?\n\r?\n/);
                    buffer = blocks.pop() ?? '';
                    blocks.forEach(parseEventBlock);
                }
            } catch (error) {
                if (!controller.signal.aborted) {
                    onError?.(error);
                }
            }
        };

        void connect();

        return () => controller.abort();
    },
};

// ===== SELLER =====
export const sellerApi = {
    getCapabilities: () =>
        request<PartnerCapabilities>('/seller/capabilities'),
    getStats: () =>
        request<SellerStats>('/seller/stats'),
    getOffers: () =>
        request<Offer[]>('/seller/offers'),
    getTransactions: (skip = 0, take = 20, status?: TransactionStatus) => {
        const params = new URLSearchParams({ skip: String(skip), take: String(take) });
        if (status) params.set('status', status);
        return request<{ data: Transaction[]; total: number }>(`/seller/transactions?${params.toString()}`);
    },
    getEvents: () =>
        request<Event[]>('/seller/events'),
};

// ===== ADMIN =====
export const adminApi = {
    getStats: () =>
        request<AdminStats>('/admin/stats'),
    getUsers: (search = '') =>
        request<{ users: User[]; total: number; page: number; totalPages: number }>(
            `/admin/users?search=${encodeURIComponent(search)}`,
        ),
    updateUser: (id: string, data: Partial<User>) =>
        request<User>(`/admin/users/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),
    getDisputes: (status = '') =>
        request<{ disputes: Dispute[]; total: number }>(`/admin/disputes${status ? `?status=${encodeURIComponent(status)}` : ''}`),
    resolveDispute: (id: string, resolution: 'BUYER' | 'SELLER', adminNote = '') =>
        request<{ message: string; dispute?: Dispute }>(`/admin/disputes/${id}/resolve`, {
            method: 'PATCH',
            body: JSON.stringify({ resolution, adminNote }),
        }),
    getOffers: (filters: { search?: string; status?: string } = {}) => {
        const params = new URLSearchParams();
        if (filters.search) params.set('search', filters.search);
        if (filters.status) params.set('status', filters.status);
        return request<{ offers: Offer[]; total: number }>(`/admin/offers?${params.toString()}`);
    },
    updateOffer: (id: string, data: Partial<Offer>) =>
        request<Offer>(`/admin/offers/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),
    moderateOffer: (id: string, status: 'APPROVED' | 'REJECTED', note = '') =>
        request<Offer>(`/admin/offers/${id}/moderation`, {
            method: 'PATCH',
            body: JSON.stringify({ status, note }),
        }),
    archiveOffer: (id: string) =>
        request<Offer>(`/admin/offers/${id}`, { method: 'DELETE' }),
    getTransactions: (filters: { search?: string; status?: string } = {}) => {
        const params = new URLSearchParams();
        if (filters.search) params.set('search', filters.search);
        if (filters.status) params.set('status', filters.status);
        return request<{ transactions: Transaction[]; total: number }>(`/admin/transactions?${params.toString()}`);
    },
    refundTransaction: (id: string) =>
        request<{ message: string }>(`/admin/transactions/${id}/refund`, {
            method: 'PATCH',
        }),
    getLogs: (action = '') =>
        request<{ logs: AdminLog[]; total: number }>(`/admin/logs${action ? `?action=${encodeURIComponent(action)}` : ''}`),
    getDiagnostics: () =>
        request<{ totalOccurrences: number; issues: DiagnosticIssue[] }>('/diagnostics/summary'),
    getTopkaPosts: (filters: { status?: string; postType?: string; category?: string; search?: string } = {}) => {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, val]) => {
            if (val) params.set(key, val);
        });
        return request<{ data: TopkaPost[]; total: number }>(`/admin/topka/posts?${params.toString()}`);
    },
    getTopkaPost: (id: string) =>
        request<TopkaPost>(`/admin/topka/posts/${id}`),
    createTopkaPost: (data: TopkaPostInput) =>
        request<TopkaPost>('/admin/topka/posts', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    updateTopkaPost: (id: string, data: TopkaPostInput) =>
        request<TopkaPost>(`/admin/topka/posts/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),
    archiveTopkaPost: (id: string) =>
        request<TopkaPost>(`/admin/topka/posts/${id}`, {
            method: 'DELETE',
        }),
    uploadTopkaMedia: (data: { fileName?: string; dataUrl: string; variant?: string }) =>
        request<{ url: string; variant: string; mime: string; size: number }>('/admin/topka/media/upload', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    cropTopkaMedia: (data: { fileName?: string; dataUrl: string; variant?: string }) =>
        request<{ url: string; variant: string; mime: string; size: number }>('/admin/topka/media/crop', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    getCatalogBanners: () => request<CatalogBanner[]>('/catalog-banners/admin/all'),
    createCatalogBanner: (data: Partial<CatalogBanner>) => request<CatalogBanner>('/catalog-banners/admin', { method: 'POST', body: JSON.stringify(data) }),
    updateCatalogBanner: (id: string, data: Partial<CatalogBanner>) => request<CatalogBanner>(`/catalog-banners/admin/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteCatalogBanner: (id: string) => request<CatalogBanner>(`/catalog-banners/admin/${id}`, { method: 'DELETE' }),
};

export const catalogBannersApi = {
    list: () => request<CatalogBanner[]>('/catalog-banners', { cache: 'no-store' }),
};

// ===== SQUADS =====
export const squadsApi = {
    create: (name: string) =>
        request<Squad>('/squads', {
            method: 'POST',
            body: JSON.stringify({ name }),
        }),
    join: (inviteCode: string) =>
        request<Squad>('/squads/join', {
            method: 'POST',
            body: JSON.stringify({ inviteCode }),
        }),
    getMe: () =>
        request<Squad | null>('/squads/me'),
};

// ===== EVENTS =====
export const eventsApi = {
    list: (params: { skip?: number; take?: number; category?: string; search?: string } = {}) => {
        const urlParams = new URLSearchParams();
        Object.entries(params).forEach(([key, val]) => {
            if (val !== undefined && val !== '') urlParams.set(key, String(val));
        });
        return request<{ data: Event[]; total: number }>(`/events?${urlParams.toString()}`, { cache: 'no-store' });
    },
    getById: (id: string) =>
        request<Event>(`/events/${id}`),
};


const api = {
    auth: authApi,
    reviews: reviewsApi,
    offers: offersApi,
    transactions: transactionsApi,
    users: usersApi,
    payments: paymentsApi,
    chat: chatApi,
    admin: adminApi,
    seller: sellerApi,
    companies: companiesApi,
    promocodes: promocodesApi,
    analytics: analyticsApi,
    squads: squadsApi,
    events: eventsApi,
    safety: safetyApi,
    // Add generic request methods
    get: <T = unknown>(url: string) => request<T>(url),
    post: <T = unknown>(url: string, body: unknown) => request<T>(url, { method: 'POST', body: JSON.stringify(body) }),
    patch: <T = unknown>(url: string, body: unknown) => request<T>(url, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: <T = unknown>(url: string) => request<T>(url, { method: 'DELETE' }),
};

export default api;
