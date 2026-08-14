'use client';

// Глобальная клиентская сессия Web: вход, регистрация, Telegram-авторизация и восстановление пользователя.
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, usersApi } from './api';
import { useTelegram } from '@/hooks/useTelegram';

interface User {
    id: string;
    userId?: string;
    email: string;
    displayName?: string;
    avatarUrl?: string;
    telegramId?: string;
    role: string;
    tier: string;
    balance: number;
    rewardPoints: number;
    preferredLanguage?: 'ru' | 'uz';
}

interface AuthCtx {
    user: User | null;
    isAuthenticated: boolean;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, displayName?: string) => Promise<void>;
    loginWithTelegram: (telegramData: Record<string, unknown>) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({
    user: null,
    isAuthenticated: false,
    loading: true,
    login: async () => { },
    register: async () => { },
    loginWithTelegram: async () => { },
    logout: async () => { },
    refreshUser: async () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const { isTMA, initData, expand } = useTelegram();

    // Restore session on mount or when TMA initData settles
    useEffect(() => {
        // Expand the telegram WebApp
        if (isTMA) {
            expand();
        }

        const restoreSession = async () => {
            try {
                const u = await usersApi.getMe() as User;
                setUser(u);
                setLoading(false);
                return;
            } catch {
                setUser(null);
            }
            if (isTMA && initData) {
                // Auto login via TMA
                try {
                    await authApi.telegramMiniapp(initData);
                    const profile = await usersApi.getMe() as User;
                    setUser(profile);
                } catch (err) {
                    console.error('TMA Auto-login failed', err);
                } finally {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        };

        restoreSession();
    }, [isTMA, initData, expand]);

    const login = async (email: string, password: string) => {
        await authApi.login({ email, password });
        const profile = await usersApi.getMe() as User;
        setUser(profile);
    };

    const register = async (email: string, password: string, displayName?: string) => {
        await authApi.register({ email, password, displayName });
        await login(email, password);
    };

    const loginWithTelegram = async (telegramData: Record<string, unknown>) => {
        await authApi.telegramLogin(telegramData);
        const profile = await usersApi.getMe() as User;
        setUser(profile);
    };

    const logout = async () => {
        await authApi.logout().catch(() => undefined);
        setUser(null);
    };

    const refreshUser = async () => {
        try {
            const profile = await usersApi.getMe() as User;
            setUser(profile);
        } catch { }
    };

    return (
        <AuthContext.Provider value={{
            user,
            isAuthenticated: !!user,
            loading,
            login,
            register,
            loginWithTelegram,
            logout,
            refreshUser,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
