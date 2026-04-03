'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';

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

    return {
        webApp,
        user,
        initData: webApp?.initData || '',
        isTMA: !!(webApp && webApp.initData),
        onClose,
        expand,
    };
}
