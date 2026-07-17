'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { MobileDock } from '@/components/MobileDock';
import { Footer } from '@/components/Footer';

// Pages where we hide the desktop navbar and footer (app-style fullscreen pages)
const IMMERSIVE_PAGES = ['/feed', '/map', '/plans', '/search', '/notifications', '/chat'];

export function LayoutShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isImmersive = IMMERSIVE_PAGES.some(p => pathname.startsWith(p));
    const supportsTheme = pathname.startsWith('/catalog');
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        if (typeof window === 'undefined') return 'light';
        return window.localStorage.getItem('perkly-theme') === 'dark' ? 'dark' : 'light';
    });

    useEffect(() => {
        document.documentElement.dataset.perklyTheme = theme;
        window.localStorage.setItem('perkly-theme', theme);
    }, [theme]);

    const toggleTheme = () => setTheme((current) => current === 'light' ? 'dark' : 'light');
    const isLightCommerce = supportsTheme && theme === 'light';

    return (
        <div className={`min-h-screen flex flex-col ${isLightCommerce ? 'site-light-commerce' : supportsTheme ? 'site-dark-commerce' : ''}`}>
            {!isImmersive && <Navbar theme={theme} onToggleTheme={toggleTheme} showThemeToggle={supportsTheme} />}
            <main className={`flex-1 relative overflow-x-hidden ${isImmersive ? 'pb-24 md:pb-0' : 'mt-16 pb-28 md:pb-0'}`}>
                {children}
            </main>
            {!isImmersive && <Footer />}
            <MobileDock />
        </div>
    );
}
