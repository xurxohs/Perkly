import { getSessionId } from '@/hooks/useSessionId';

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
        request('/auth/me'),
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
        return request<{ data: unknown[]; total: number }>(`/offers?${params.toString()}`);
    },

    getById: (id: string) =>
        request<unknown>(`/offers/${id}`),

    create: (data: unknown) =>
        request<unknown>('/offers', { method: 'POST', body: JSON.stringify(data) }),

    featureOffer: (id: string, days: number) =>
        request<unknown>(`/offers/${id}/feature`, {
            method: 'POST',
            body: JSON.stringify({ days }),
        }),

    getMyOffers: () =>
        request<unknown[]>('/offers/vendor/me'),
};

// ===== TRANSACTIONS =====
export const transactionsApi = {
    purchase: (offerId: string) =>
        request<unknown>('/transactions', {
            method: 'POST',
            body: JSON.stringify({ offerId }),
        }),

    list: (skip = 0, take = 20) =>
        request<{ data: unknown[]; total: number }>(`/transactions?skip=${skip}&take=${take}`),

    getById: (id: string) =>
        request<unknown>(`/transactions/${id}`),
};

// ===== USERS =====
export const usersApi = {
    getMe: () =>
        request<unknown>('/users/me'),

    updateProfile: (data: { displayName?: string; avatarUrl?: string }) =>
        request<unknown>('/users/me', {
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
};

// ===== CHAT =====
export const chatApi = {
    getRooms: () =>
        request<unknown[]>('/chat/rooms'),

    getMessages: (roomId: string) =>
        request<{ data: unknown[] }>(`/chat/rooms/${roomId}/messages`),

    sendMessage: (roomId: string, content: string) =>
        request<unknown>('/chat/messages', {
            method: 'POST',
            body: JSON.stringify({ roomId, content }),
        }),

    markAsRead: (roomId: string) =>
        request<unknown>('/chat/messages/read', {
            method: 'PATCH',
            body: JSON.stringify({ roomId }),
        }),

    createDirectRoom: (targetUserId: string) =>
        request<unknown>('/chat/rooms', {
            method: 'POST',
            body: JSON.stringify({ targetUserId }),
        }),
};

const api = {
    auth: authApi,
    reviews: reviewsApi,
    offers: offersApi,
    transactions: transactionsApi,
    users: usersApi,
    payments: paymentsApi,
    chat: chatApi,
    // Add generic request methods
    get: <T = unknown>(url: string) => request<T>(url),
    post: <T = unknown>(url: string, body: unknown) => request<T>(url, { method: 'POST', body: JSON.stringify(body) }),
    patch: <T = unknown>(url: string, body: unknown) => request<T>(url, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: <T = unknown>(url: string) => request<T>(url, { method: 'DELETE' }),
};

export default api;
