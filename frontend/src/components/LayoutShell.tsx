'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useSyncExternalStore } from 'react';
import { Navbar } from '@/components/Navbar';
import { MobileDock } from '@/components/MobileDock';
import { Footer } from '@/components/Footer';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

// Pages where we hide the desktop navbar and footer (app-style fullscreen pages)
const IMMERSIVE_PAGES = ['/feed', '/map', '/plans', '/search', '/notifications', '/chat'];
const THEME_EVENT = 'perkly-theme-change';

const subscribeToTheme = (callback: () => void) => {
    window.addEventListener('storage', callback);
    window.addEventListener(THEME_EVENT, callback);
    return () => {
        window.removeEventListener('storage', callback);
        window.removeEventListener(THEME_EVENT, callback);
    };
};
const getThemeSnapshot = (): 'light' | 'dark' => window.localStorage.getItem('perkly-theme') === 'dark' ? 'dark' : 'light';
const getServerThemeSnapshot = (): 'light' | 'dark' => 'light';

export function LayoutShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isImmersive = IMMERSIVE_PAGES.some(p => pathname.startsWith(p));
    const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerThemeSnapshot);

    useEffect(() => {
        document.documentElement.dataset.perklyTheme = theme;
    }, [theme]);

    const toggleTheme = () => {
        const nextTheme = theme === 'light' ? 'dark' : 'light';
        window.localStorage.setItem('perkly-theme', nextTheme);
        window.dispatchEvent(new Event(THEME_EVENT));
    };
    const isLightCommerce = theme === 'light';

    return (
        <div className={`min-h-screen flex flex-col ${isLightCommerce ? 'site-light-commerce' : 'site-dark-commerce'}`}>
            {!isImmersive && <Navbar theme={theme} onToggleTheme={toggleTheme} showThemeToggle />}
            {isImmersive && (
                <LanguageSwitcher
                    compact
                    className="fixed right-4 top-[max(12px,env(safe-area-inset-top))] z-[70] text-white shadow-lg"
                />
            )}
            <main className={`flex-1 relative overflow-x-hidden ${isImmersive ? 'pb-24 md:pb-0' : 'mt-16 pb-28 md:pb-0'}`}>
                {children}
            </main>
            {!isImmersive && <Footer />}
            <MobileDock />
        </div>
    );
}
