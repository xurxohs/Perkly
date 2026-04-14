'use client';

import { useEffect, useState, useCallback } from 'react';

interface TelegramUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
}

interface TelegramWebApp {
    ready: () => void;
    close: () => void;
    expand: () => void;
    initData: string;
    initDataUnsafe: {
        user?: TelegramUser;
        query_id?: string;
        auth_date?: string;
        hash?: string;
    };
    openTelegramLink: (url: string) => void;
    MainButton: {
        text: string;
        color: string;
        textColor: string;
        isVisible: boolean;
        isActive: boolean;
        isProgressVisible: boolean;
        show: () => void;
        hide: () => void;
        enable: () => void;
        disable: () => void;
        showProgress: (leaveActive: boolean) => void;
        hideProgress: () => void;
        setParams: (params: Record<string, unknown>) => void;
        onClick: (callback: () => void) => void;
        offClick: (callback: () => void) => void;
    };
    HapticFeedback: {
        impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
        notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
        selectionChanged: () => void;
    };
}

export function useTelegram() {
    const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
    const [user, setUser] = useState<TelegramUser | null>(null);

    useEffect(() => {
        const win = window as unknown as { Telegram?: { WebApp: TelegramWebApp } };
        if (typeof window !== 'undefined' && win.Telegram?.WebApp) {
            const tg = win.Telegram.WebApp;
            
            // Defer state update to avoid 'set-state-in-effect' lint warning
            const timer = setTimeout(() => {
                setWebApp(tg);
                if (tg.initDataUnsafe?.user) {
                    setUser(tg.initDataUnsafe.user);
                }
            }, 0);

            tg.ready();
            return () => clearTimeout(timer);
        }
    }, []);

    const expand = useCallback(() => webApp?.expand(), [webApp]);
    const onClose = useCallback(() => webApp?.close(), [webApp]);

    const hapticImpact = useCallback((style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => {
        webApp?.HapticFeedback?.impactOccurred(style);
    }, [webApp]);

    const hapticNotification = useCallback((type: 'error' | 'success' | 'warning') => {
        webApp?.HapticFeedback?.notificationOccurred(type);
    }, [webApp]);

    const showMainButton = useCallback((text: string, onClick: () => void) => {
        if (!webApp) return;
        webApp.MainButton.setParams({
            text: text,
            is_visible: true
        });
        webApp.MainButton.onClick(onClick);
    }, [webApp]);

    const hideMainButton = useCallback(() => {
        webApp?.MainButton.hide();
    }, [webApp]);

    return {
        webApp,
        user,
        initData: webApp?.initData || '',
        isTMA: !!(webApp && webApp.initData),
        onClose,
        expand,
        hapticImpact,
        hapticNotification,
        showMainButton,
        hideMainButton,
    };
}
