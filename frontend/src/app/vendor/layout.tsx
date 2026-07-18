"use client";

import { useAuth } from '@/lib/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
    LayoutDashboard, PackageSearch, ShoppingBag, ChartNoAxesCombined,
    TicketPercent, Settings, LogOut, ChevronRight, Store,
} from 'lucide-react';

const NAV_ITEMS = [
    { name: 'Обзор', shortName: 'Обзор', path: '/vendor', icon: LayoutDashboard },
    { name: 'Товары', shortName: 'Товары', path: '/vendor/products', icon: PackageSearch },
    { name: 'Промокоды', shortName: 'Коды', path: '/vendor/promocodes', icon: TicketPercent },
    { name: 'Заказы', shortName: 'Заказы', path: '/vendor/orders', icon: ShoppingBag },
    { name: 'Аналитика', shortName: 'Аналитика', path: '/vendor/analytics', icon: ChartNoAxesCombined },
    { name: 'Настройки', shortName: 'Ещё', path: '/vendor/settings', icon: Settings },
];

export default function VendorLayout({ children }: { children: React.ReactNode }) {
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const canUseVendorHub = user?.role === 'VENDOR' || user?.role === 'ADMIN';

    useEffect(() => {
        if (!loading && !user) router.push('/profile');
        else if (!loading && user && !canUseVendorHub) router.replace('/sell');
    }, [user, loading, canUseVendorHub, router]);

    if (loading || !user || !canUseVendorHub) return null;

    const isActive = (path: string) => path === '/vendor' ? pathname === path : pathname.startsWith(path);
    const current = NAV_ITEMS.find((item) => isActive(item.path)) ?? NAV_ITEMS[0];

    return <div className="vendor-workspace min-h-screen">
        <aside className="vendor-sidebar hidden lg:flex">
            <Link href="/vendor" className="vendor-brand no-underline">
                <span className="vendor-brand-mark"><Store className="h-5 w-5" /></span>
                <span><strong>Perkly</strong><small>Для продавцов</small></span>
            </Link>

            <nav className="vendor-desktop-nav" aria-label="Кабинет продавца">
                {NAV_ITEMS.map((item) => <Link key={item.path} href={item.path} className={`vendor-nav-item ${isActive(item.path) ? 'is-active' : ''}`}>
                    <item.icon className="h-[18px] w-[18px]" />
                    <span>{item.name}</span>
                    {isActive(item.path) && <ChevronRight className="ml-auto h-4 w-4 opacity-45" />}
                </Link>)}
            </nav>

            <div className="vendor-sidebar-footer">
                <Link href="/profile" className="vendor-user no-underline">
                    <span className="vendor-avatar"><Image src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.displayName}`} alt="" fill className="object-cover" /></span>
                    <span className="min-w-0"><strong className="truncate">{user.displayName}</strong><small>Открыть профиль</small></span>
                </Link>
                <button onClick={logout} className="vendor-logout" aria-label="Выйти"><LogOut className="h-[18px] w-[18px]" /></button>
            </div>
        </aside>

        <div className="vendor-main-column">
            <header className="vendor-mobile-header lg:hidden">
                <div><p>Кабинет продавца</p><h1>{current.name}</h1></div>
                <Link href="/profile" className="vendor-avatar no-underline"><Image src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.displayName}`} alt={user.displayName || 'Профиль продавца'} fill className="object-cover" /></Link>
            </header>

            <main className="vendor-content">
                <div className="vendor-content-inner">{children}</div>
            </main>

            <nav className="vendor-mobile-nav lg:hidden" aria-label="Кабинет продавца">
                {NAV_ITEMS.map((item) => <Link key={item.path} href={item.path} className={`vendor-mobile-item ${isActive(item.path) ? 'is-active' : ''}`}>
                    <item.icon className="h-5 w-5" /><span>{item.shortName}</span>
                </Link>)}
            </nav>
        </div>
    </div>;
}
