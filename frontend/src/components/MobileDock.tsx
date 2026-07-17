'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useTelegram } from '@/hooks/useTelegram';
import { PerklyGlyph, type PerklyGlyphName } from '@/components/PerklyGlyph';

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

// Spring physics simulation
function useSpring(target: number, { stiffness = 400, damping = 28, mass = 1 } = {}) {
    const [value, setValue] = useState(target);
    const velocity = useRef(0);
    const currentValue = useRef(target);
    const targetRef = useRef(target);
    const frameRef = useRef<number>(0);
    const lastTime = useRef(0);

    useEffect(() => {
        lastTime.current = performance.now();
    }, []);

    useEffect(() => {
        targetRef.current = target;

        const animate = () => {
            const now = performance.now();
            const dt = Math.min((now - lastTime.current) / 1000, 0.064); // cap dt
            lastTime.current = now;

            const displacement = currentValue.current - targetRef.current;
            const springForce = -stiffness * displacement;
            const dampingForce = -damping * velocity.current;
            const acceleration = (springForce + dampingForce) / mass;

            velocity.current += acceleration * dt;
            currentValue.current += velocity.current * dt;

            // Check if settled
            if (Math.abs(velocity.current) < 0.01 && Math.abs(displacement) < 0.001) {
                currentValue.current = targetRef.current;
                velocity.current = 0;
                setValue(targetRef.current);
                return;
            }

            setValue(currentValue.current);
            frameRef.current = requestAnimationFrame(animate);
        };

        frameRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frameRef.current);
    }, [target, stiffness, damping, mass]);

    return value;
}

function DockIcon({ item, isActive, onTap, light = false }: {
    item: DockItem;
    isActive: boolean;
    onTap: () => void;
    light?: boolean;
}) {
    const [pressed, setPressed] = useState(false);
    const [tapped, setTapped] = useState(false);

    // Spring scale: resting = 1, pressed = 0.8, tap bounce = 1.15 → 1
    const targetScale = pressed ? 0.82 : tapped ? 1.18 : 1;
    const scale = useSpring(targetScale, { stiffness: 500, damping: 22, mass: 0.8 });

    // Spring Y translation for active indicator
    const targetY = isActive ? -2 : 0;
    const y = useSpring(targetY, { stiffness: 300, damping: 24, mass: 1 });

    const handlePointerDown = useCallback(() => {
        setPressed(true);
    }, []);

    const handlePointerUp = useCallback(() => {
        setPressed(false);
        setTapped(true);
        onTap();

        // Reset tap bounce
        setTimeout(() => setTapped(false), 200);
    }, [onTap]);

    const handlePointerLeave = useCallback(() => {
        setPressed(false);
    }, []);

    return (
        <Link
            href={item.href}
            className="flex min-w-12 flex-col items-center gap-0 no-underline relative select-none"
            style={{
                transform: `translateY(${y}px)`,
                willChange: 'transform',
                WebkitTapHighlightColor: 'transparent',
            }}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
            onPointerCancel={handlePointerLeave}
        >
            <div
                className="w-9 h-7 flex items-center justify-center relative transition-all duration-[400ms] ease-out z-10"
                style={{
                    transform: `scale(${scale})`,
                    willChange: 'transform',
                }}
            >
                <PerklyGlyph
                    name={item.icon}
                    className="w-[22px] h-[22px]"
                    style={{
                        color: isActive ? '#b43be2' : light ? 'rgba(29,29,31,0.48)' : 'rgba(255,255,255,0.45)',
                        filter: isActive ? 'none' : 'none',
                        transition: 'color 0.4s ease-out, filter 0.4s ease-out'
                    }}
                />

            </div>

            <span
                className="-mt-px text-[10px] font-medium leading-[11px]"
                style={{
                    color: isActive ? '#b43be2' : light ? 'rgba(29,29,31,0.42)' : 'rgba(255,255,255,0.3)',
                }}
            >
                {item.label}
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
