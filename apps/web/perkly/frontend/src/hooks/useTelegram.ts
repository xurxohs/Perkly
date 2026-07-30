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

type TelegramWindow = Window & {
    Telegram?: { WebApp: TelegramWebApp };
};

const TELEGRAM_WEB_APP_SDK = 'https://telegram.org/js/telegram-web-app.js';
let telegramSdkPromise: Promise<TelegramWebApp | null> | null = null;

function hasTelegramLaunchParams() {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const searchParams = new URLSearchParams(window.location.search);

    return [hashParams, searchParams].some(
        (params) => params.has('tgWebAppVersion') && params.has('tgWebAppPlatform'),
    );
}

function loadTelegramWebApp(): Promise<TelegramWebApp | null> {
    const win = window as TelegramWindow;
    if (win.Telegram?.WebApp) return Promise.resolve(win.Telegram.WebApp);
    if (!hasTelegramLaunchParams()) return Promise.resolve(null);
    if (telegramSdkPromise) return telegramSdkPromise;

    telegramSdkPromise = new Promise((resolve) => {
        const finish = () => resolve(win.Telegram?.WebApp ?? null);
        const existingScript = document.querySelector<HTMLScriptElement>(
            `script[src="${TELEGRAM_WEB_APP_SDK}"]`,
        );

        if (existingScript) {
            existingScript.addEventListener('load', finish, { once: true });
            existingScript.addEventListener('error', () => resolve(null), { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = TELEGRAM_WEB_APP_SDK;
        script.async = true;
        script.onload = finish;
        script.onerror = () => resolve(null);
        document.head.appendChild(script);
    });

    return telegramSdkPromise;
}

export function useTelegram() {
    const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
    const [user, setUser] = useState<TelegramUser | null>(null);

    useEffect(() => {
        let cancelled = false;

        void loadTelegramWebApp().then((tg) => {
            if (!tg || cancelled) return;

            tg.ready();
            window.requestAnimationFrame(() => {
                if (cancelled) return;
                setWebApp(tg);
                if (tg.initDataUnsafe?.user) {
                    setUser(tg.initDataUnsafe.user);
                }
            });
        });

        return () => {
            cancelled = true;
        };
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
