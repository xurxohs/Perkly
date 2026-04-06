import { getSessionId } from '@/hooks/useSessionId';

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
    category: string;
    isExclusive: boolean;
    isFlashDrop: boolean;
    expiresAt: string | null;
    sellerId: string;
    seller?: User;
    isActive: boolean;
    usageInstructions?: string;
    hiddenData?: string;
    _count?: {
        transactions: number;
    };
}

export interface Transaction {
    id: string;
    offerId: string;
    buyerId: string;
    price: number;
    status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'PAID' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED' | 'DISPUTED' | 'ESCROW';
    createdAt: string;
    offer?: Offer;
    buyer?: User;
}

export interface ChatMessage {
    id: string;
    content: string;
    roomId: string;
    senderId: string | null;
    isRead: boolean;
    createdAt: string;
    sender?: User;
}

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

export interface Dispute {
    id: string;
    transactionId: string;
    reason: string;
    status: 'OPEN' | 'RESOLVED' | 'CLOSED';
    createdAt: string;
    transaction?: Transaction;
    resolution?: 'BUYER' | 'SELLER';
    messages?: ChatMessage[];
}

export interface SellerStats {
    totalEarnings: number;
    totalSales: number;
    activeOffers: number;
    recentTransactions: Transaction[];
}

export interface AdminStats {
    usersCount: number;
    newUsersToday: number;
    activeOffersCount: number;
    totalVolume: number;
    platformIncome: number;
    openDisputesCount: number;
    recentTransactions: Transaction[];
    recentUsers: User[];
}


const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('perkly_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = getToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const sessionId = getSessionId();
    if (sessionId) {
        headers['X-Session-Id'] = sessionId;
    }

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
    search?: string;
    sort?: string;
    isFlashDrop?: boolean;
    minPrice?: number;
    maxPrice?: number;
}

export const offersApi = {
    list: (filters: OfferFilters = {}) => {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, val]) => {
            if (val !== undefined && val !== '') params.set(key, String(val));
        });
        return request<{ data: Offer[]; total: number }>(`/offers?${params.toString()}`);
    },

    getById: (id: string) =>
        request<Offer>(`/offers/${id}`),

    create: (data: unknown) =>
        request<Offer>('/offers', { method: 'POST', body: JSON.stringify(data) }),

    featureOffer: (id: string, days: number) =>
        request<{ featuredUntil: string }>(`/offers/${id}/feature`, {
            method: 'POST',
            body: JSON.stringify({ days }),
        }),

    getMyOffers: () =>
        request<Offer[]>('/offers/vendor/me'),
};

// ===== TRANSACTIONS =====
export const transactionsApi = {
    purchase: (offerId: string) =>
        request<Transaction>('/transactions', {
            method: 'POST',
            body: JSON.stringify({ offerId }),
        }),

    list: (skip = 0, take = 20) =>
        request<{ data: Transaction[]; total: number }>(`/transactions?skip=${skip}&take=${take}`),

    getById: (id: string) =>
        request<Transaction>(`/transactions/${id}`),

    confirm: (id: string) =>
        request<Transaction>(`/transactions/${id}/confirm`, {
            method: 'PATCH',
        }),
};

// ===== USERS =====
export const usersApi = {
    getMe: () =>
        request<User>('/users/me'),

    updateProfile: (data: { displayName?: string; avatarUrl?: string }) =>
        request<User>('/users/me', {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),

    getStats: () =>
        request<{ totalSpent: number; totalPurchases: number }>('/users/me/stats'),

    subscribe: (tier: 'GOLD' | 'PLATINUM', months: number) =>
        request<{ subscription: unknown; tier: string; endDate: string; cost: number }>('/users/me/subscribe',
            { method: 'POST', body: JSON.stringify({ tier, months }) },
        ),
};



// ===== PAYMENTS =====
export const paymentsApi = {
    topUp: (amount: number) =>
        request<unknown>('/payments/topup', {
            method: 'POST',
            body: JSON.stringify({ amount }),
        }),
    mockWebhook: (depositId: string, success: boolean) =>
        request<unknown>('/payments/webhook/mock', {
            method: 'POST',
            body: JSON.stringify({ depositId, success }),
        }),
};

// ===== ANALYTICS =====
export const analyticsApi = {
    trackEvent: (data: { eventType: string; offerId?: string; metadata?: string }) =>
        request('/analytics/events', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    getEvents: (params?: { eventType?: string; userId?: string; skip?: number; take?: number }) => {
        const urlParams = new URLSearchParams();
        if (params?.eventType) urlParams.append('eventType', params.eventType);
        if (params?.userId) urlParams.append('userId', params.userId);
        if (params?.skip) urlParams.append('skip', String(params.skip));
        if (params?.take) urlParams.append('take', String(params.take));
        return request<any>(`/analytics/events?${urlParams.toString()}`);
    }
};

// ===== CHAT =====
export const chatApi = {
    getRooms: () =>
        request<ChatRoom[]>('/chat/rooms'),

    getMessages: (roomId: string) =>
        request<{ data: ChatMessage[] }>(`/chat/rooms/${roomId}/messages`),

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
};

// ===== SELLER =====
export const sellerApi = {
    getStats: () =>
        request<{ data: SellerStats }>('/seller/stats'),
    getOffers: () =>
        request<{ data: Offer[] }>('/seller/offers'),
};

// ===== ADMIN =====
export const adminApi = {
    getStats: () =>
        request<AdminStats>('/admin/stats'),
    getUsers: (search = '') =>
        request<User[]>(`/admin/users?search=${search}`),
    updateUser: (id: string, data: Partial<User>) =>
        request<User>(`/admin/users/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),
    getDisputes: () =>
        request<{ disputes: Dispute[] }>('/admin/disputes'),
    getOffers: () =>
        request<{ offers: Offer[] }>('/admin/offers'),
    getTransactions: () =>
        request<{ transactions: Transaction[] }>('/admin/transactions'),
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
    analytics: analyticsApi,
    // Add generic request methods
    get: <T = unknown>(url: string) => request<T>(url),
    post: <T = unknown>(url: string, body: unknown) => request<T>(url, { method: 'POST', body: JSON.stringify(body) }),
    patch: <T = unknown>(url: string, body: unknown) => request<T>(url, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: <T = unknown>(url: string) => request<T>(url, { method: 'DELETE' }),
};

export default api;
