'use client';

import { Home, Tag, ShoppingBag, ShoppingCart, User, Flame, Map, Ticket, Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useCart } from '@/lib/CartContext';
import { useTelegram } from '@/hooks/useTelegram';

const marketplaceDockItems = [
    { href: '/', icon: Home, label: 'Главная' },
    { href: '/coupons', icon: Tag, label: 'Купоны' },
    { href: '/catalog', icon: ShoppingBag, label: 'Каталог' },
    { href: '/cart', icon: ShoppingCart, label: 'Корзина' },
    { href: '/profile', icon: User, label: 'Профиль' },
];

const topkaDockItems = [
    { href: '/map', icon: Map, label: 'Карта' },
    { href: '/feed', icon: Flame, label: 'Топка' },
    { href: '/plans', icon: Ticket, label: 'Планы' },
    { href: '/search', icon: Search, label: 'Поиск' },
];

const TOPKA_PAGES = ['/feed', '/map', '/plans', '/search', '/notifications', '/chat'];

// Spring physics simulation
function useSpring(target: number, config = { stiffness: 400, damping: 28, mass: 1 }) {
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

            const { stiffness, damping, mass } = config;
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
    }, [target, config.stiffness, config.damping, config.mass]);

    return value;
}

function DockIcon({ item, isActive, onTap }: {
    item: typeof dockItems[0];
    isActive: boolean;
    onTap: () => void;
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

    const { count } = useCart();
    const isCart = item.href === '/cart';

    return (
        <Link
            href={item.href}
            className="flex flex-col items-center gap-0.5 no-underline relative select-none"
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
                className="w-11 h-11 flex items-center justify-center relative transition-all duration-[400ms] ease-out z-10"
                style={{
                    transform: `scale(${scale})`,
                    willChange: 'transform',
                }}
            >
                <item.icon
                    className="w-[22px] h-[22px]"
                    style={{
                        color: isActive ? '#d4b0ff' : 'rgba(255,255,255,0.45)',
                        strokeWidth: isActive ? 2.5 : 1.8,
                        filter: isActive ? 'drop-shadow(0 0 8px rgba(168,85,247,0.75)) brightness(1.2)' : 'none',
                        transition: 'color 0.4s ease-out, filter 0.4s ease-out'
                    }}
                />

                {/* Cart badge */}
                {isCart && count > 0 && (
                    <span
                        className="absolute -top-1 -right-1.5 min-w-[18px] h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center text-white px-1"
                        style={{
                            background: 'linear-gradient(135deg, #ef4444, #ec4899)',
                            boxShadow: '0 0 8px rgba(239,68,68,0.5)',
                        }}
                    >
                        {count}
                    </span>
                )}
            </div>

            <span
                className="text-[10px] font-medium leading-none"
                style={{
                    color: isActive ? '#c084fc' : 'rgba(255,255,255,0.3)',
                }}
            >
                {item.label}
            </span>

            {/* Active indicator dot */}
            {
                isActive && (
                    <div
                        className="absolute -bottom-1 w-1 h-1 rounded-full"
                        style={{
                            background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                            boxShadow: '0 0 6px rgba(168,85,247,0.6)',
                        }}
                    />
                )
            }
        </Link >
    );
}

export function MobileDock() {
    const pathname = usePathname();
    const { hapticImpact } = useTelegram();

    const isTopka = TOPKA_PAGES.some(p => pathname.startsWith(p));
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
            <div className="h-24 md:hidden" />

            {/* Dock */}
            <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden flex justify-center pb-[env(safe-area-inset-bottom,8px)]">
                {/* Outer container with blur */}
                <div
                    className="mx-3 mb-3 px-2 py-2.5 rounded-[36px] flex items-center justify-around gap-1 w-full max-w-[420px] liquid-glass-dock"
                >
                    {currentItems.map((item) => (
                        <DockIcon
                            key={item.href}
                            // @ts-ignore
                            item={item}
                            isActive={activeHref === item.href}
                            onTap={() => hapticImpact('light')}
                        />
                    ))}
                </div>
            </div>
        </>
    );
}
