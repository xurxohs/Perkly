'use client';

import { useEffect, useState, useCallback } from 'react';

export function useTelegram() {
    const [webApp, setWebApp] = useState<any>(null);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        // Check if the script has loaded and WebApp object is available
        if (typeof window !== 'undefined' && (window as any).Telegram && (window as any).Telegram.WebApp) {
            const tg = (window as any).Telegram.WebApp;
            tg.ready(); // Tell Telegram the app is ready to be displayed
            setWebApp(tg);

            if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
                setUser(tg.initDataUnsafe.user);
            }
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
