'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { MobileDock } from '@/components/MobileDock';
import { Footer } from '@/components/Footer';

// Pages where we hide the desktop navbar and footer (app-style fullscreen pages)
const IMMERSIVE_PAGES = ['/feed', '/map', '/plans', '/search', '/notifications', '/chat'];

export function LayoutShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isImmersive = IMMERSIVE_PAGES.some(p => pathname.startsWith(p));

    return (
        <>
            {!isImmersive && <Navbar />}
            <main className={`flex-1 relative overflow-x-hidden ${isImmersive ? 'pb-24 md:pb-0' : 'mt-16 pb-28 md:pb-0'}`}>
                {children}
            </main>
            {!isImmersive && <Footer />}
            <MobileDock />
        </>
    );
}
