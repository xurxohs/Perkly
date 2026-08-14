'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useSyncExternalStore } from 'react';
import { Navbar } from '@/components/Navbar';
import { MobileDock } from '@/components/MobileDock';
import { Footer } from '@/components/Footer';
import { SwipeBackGesture } from '@/components/SwipeBackGesture';
import { MobileTopBar } from '@/components/MobileTopBar';

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
        const browserChromeColor = theme === 'light' ? '#f5f5f7' : '#000000';
        document.documentElement.style.backgroundColor = browserChromeColor;
        document.documentElement.style.colorScheme = theme;
        document.body.style.backgroundColor = browserChromeColor;

        let themeTags = Array.from(document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'));
        if (themeTags.length === 0) {
            const runtimeTheme = document.createElement('meta');
            runtimeTheme.name = 'theme-color';
            document.head.appendChild(runtimeTheme);
            themeTags = [runtimeTheme];
        }
        themeTags.forEach((themeTag) => {
            themeTag.removeAttribute('media');
            themeTag.content = browserChromeColor;
        });
    }, [theme]);

    const toggleTheme = () => {
        const nextTheme = theme === 'light' ? 'dark' : 'light';
        window.localStorage.setItem('perkly-theme', nextTheme);
        window.dispatchEvent(new Event(THEME_EVENT));
    };
    const isLightCommerce = theme === 'light';
    const shellThemeClass = isImmersive
        ? (theme === 'light' ? 'site-immersive-light' : 'site-immersive-dark')
        : isLightCommerce
            ? 'site-light-commerce'
            : 'site-dark-commerce';

    return (
        <div className={`site-shell min-h-screen flex flex-col ${shellThemeClass}`}>
            <SwipeBackGesture />
            {!isImmersive && (
                <div className="desktop-site-navbar">
                    <Navbar theme={theme} onToggleTheme={toggleTheme} showThemeToggle />
                </div>
            )}
            {!isImmersive && <MobileTopBar />}
            <main className={`site-main flex-1 relative overflow-x-hidden ${isImmersive ? 'pb-24 md:pb-0' : 'pb-28 md:mt-16 md:pb-0'}`}>
                {children}
            </main>
            {!isImmersive && (
                <div className="desktop-site-footer">
                    <Footer />
                </div>
            )}
            <MobileDock />
        </div>
    );
}
