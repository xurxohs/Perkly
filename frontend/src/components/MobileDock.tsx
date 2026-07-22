'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useCallback, useEffect } from 'react';
import { useTelegram } from '@/hooks/useTelegram';
import { PerklyGlyph, type PerklyGlyphName } from '@/components/PerklyGlyph';
import { useLanguage } from '@/lib/i18n';

const marketplaceDockItems = [
    { href: '/search', icon: 'search' as PerklyGlyphName, label: 'Поиск' },
    { href: '/coupons', icon: 'coupon' as PerklyGlyphName, label: 'Купоны' },
    { href: '/catalog', icon: 'catalog' as PerklyGlyphName, label: 'Каталог' },
    { href: '/chat', icon: 'chat' as PerklyGlyphName, label: 'Чаты' },
    { href: '/profile', icon: 'profile' as PerklyGlyphName, label: 'Профиль' },
];

const topkaDockItems = [
    { href: '/map', icon: 'map' as PerklyGlyphName, label: 'Карта' },
    { href: '/feed', icon: 'topka' as PerklyGlyphName, label: 'Топка' },
    { href: '/plans', icon: 'coupon' as PerklyGlyphName, label: 'Планы' },
    { href: '/search', icon: 'search' as PerklyGlyphName, label: 'Поиск' },
];

const TOPKA_PAGES = ['/feed', '/map', '/plans', '/notifications'];
type DockItem = (typeof marketplaceDockItems)[number] | (typeof topkaDockItems)[number];

function DockIcon({ item, isActive, onTap, light = false }: {
    item: DockItem;
    isActive: boolean;
    onTap: () => void;
    light?: boolean;
}) {
    const { t } = useLanguage();
    const [pressed, setPressed] = useState(false);
    const activeColor = light ? '#7b2cbf' : '#d8a4ff';
    const inactiveColor = light ? '#6e6e73' : '#8e8e93';

    const handlePointerDown = useCallback(() => {
        setPressed(true);
    }, []);

    const handlePointerUp = useCallback(() => {
        setPressed(false);
        onTap();
    }, [onTap]);

    const handlePointerLeave = useCallback(() => {
        setPressed(false);
    }, []);

    return (
        <Link
            href={item.href}
            className="flex min-w-12 flex-col items-center gap-0 no-underline relative select-none"
            style={{
                WebkitTapHighlightColor: 'transparent',
            }}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
            onPointerCancel={handlePointerLeave}
        >
            <div
                className="w-9 h-7 flex items-center justify-center relative transition-transform duration-100 ease-out z-10"
                style={{
                    transform: pressed ? 'scale(.94)' : 'scale(1)',
                }}
            >
                <PerklyGlyph
                    name={item.icon}
                    className="w-[22px] h-[22px]"
                    style={{
                        color: isActive ? activeColor : inactiveColor,
                        filter: isActive ? 'none' : 'none',
                        transition: 'color 0.4s ease-out, filter 0.4s ease-out'
                    }}
                />

            </div>

            <span
                className="-mt-px text-[10px] font-medium leading-[11px]"
                style={{
                    color: isActive ? activeColor : inactiveColor,
                }}
            >
                {t(item.label)}
            </span>

        </Link >
    );
}

export function MobileDock() {
    const pathname = usePathname();
    const { hapticImpact } = useTelegram();

    const isTopka = TOPKA_PAGES.some(p => pathname.startsWith(p));
    const [isLightCommerce, setIsLightCommerce] = useState(false);

    useEffect(() => {
        const syncTheme = () => setIsLightCommerce(
            document.documentElement.dataset.perklyTheme !== 'dark'
        );
        syncTheme();
        const observer = new MutationObserver(syncTheme);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-perkly-theme'] });
        return () => observer.disconnect();
    }, [pathname]);
    const currentItems = isTopka ? topkaDockItems : marketplaceDockItems;

    const getActiveHref = () => {
        for (const item of currentItems) {
            if (item.href === '/' && pathname === '/') return '/';
            if (item.href !== '/' && pathname.startsWith(item.href)) return item.href;
        }
        return '/';
    };

    const activeHref = getActiveHref();

    return (
        <>
            {/* Spacer so content isn't hidden behind dock */}
            <div className="h-20 md:hidden" />

            {/* Dock */}
            <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden flex justify-center pb-[env(safe-area-inset-bottom,8px)]">
                {/* Outer container with blur */}
                <div
                    className={`mx-4 mb-2 px-2 py-2 rounded-[30px] flex items-center justify-around gap-1 w-full max-w-[390px] liquid-glass-dock ${isLightCommerce ? 'light-commerce-dock' : ''}`}
                >
                    {currentItems.map((item) => (
                        <DockIcon
                            key={item.href}
                            item={item}
                            isActive={activeHref === item.href}
                            light={isLightCommerce}
                            onTap={() => hapticImpact('light')}
                        />
                    ))}
                </div>
            </div>
        </>
    );
}
