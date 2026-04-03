'use client';

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
}

interface AuthCtx {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, displayName?: string) => Promise<void>;
    loginWithTelegram: (telegramData: Record<string, unknown>) => Promise<void>;
    logout: () => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({
    user: null,
    token: null,
    isAuthenticated: false,
    loading: true,
    login: async () => { },
    register: async () => { },
    loginWithTelegram: async () => { },
    logout: () => { },
    refreshUser: async () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const { isTMA, initData, expand } = useTelegram();

    // Restore session on mount or when TMA initData settles
    useEffect(() => {
        // Expand the telegram WebApp
        if (isTMA) {
            expand();
        }

        const restoreSession = async () => {
            const savedToken = localStorage.getItem('perkly_token');
            if (savedToken) {
                setToken(savedToken);
                try {
                    const u = await usersApi.getMe() as User;
                    setUser(u);
                } catch (err) {
                    console.error("Session restore failed:", err);
                    localStorage.removeItem('perkly_token');
                    setToken(null);
                } finally {
                    setLoading(false);
                }
            } else if (isTMA && initData) {
                // Auto login via TMA
                try {
                    const res = (await authApi.telegramMiniapp(initData)) as { access_token: string };
                    localStorage.setItem('perkly_token', res.access_token);
                    setToken(res.access_token);
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
        const res = (await authApi.login({ email, password })) as { access_token: string };
        localStorage.setItem('perkly_token', res.access_token);
        setToken(res.access_token);
        const profile = await usersApi.getMe() as User;
        setUser(profile);
    };

    const register = async (email: string, password: string, displayName?: string) => {
        await authApi.register({ email, password, displayName });
        await login(email, password);
    };

    const loginWithTelegram = async (telegramData: Record<string, unknown>) => {
        const res = (await authApi.telegramLogin(telegramData)) as { access_token: string };
        localStorage.setItem('perkly_token', res.access_token);
        setToken(res.access_token);
        const profile = await usersApi.getMe() as User;
        setUser(profile);
    };

    const logout = () => {
        localStorage.removeItem('perkly_token');
        setToken(null);
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
            token,
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
