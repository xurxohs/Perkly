"use client";

import { useAuth } from '@/lib/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
    LayoutDashboard,
    PackageSearch,
    ShoppingBag,
    ChartNoAxesCombined,
    TicketPercent,
    Settings,
    LogOut,
    ChevronRight,
    Sparkles,
    Menu
} from 'lucide-react';

export default function VendorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const canUseVendorHub = user?.role === 'VENDOR' || user?.role === 'ADMIN';

    // Protect route
    useEffect(() => {
        if (!loading && !user) {
            router.push('/profile');
        } else if (!loading && user && !canUseVendorHub) {
            router.replace('/sell');
        }
    }, [user, loading, canUseVendorHub, router]);

    useEffect(() => {
        const media = window.matchMedia('(min-width: 768px)');
        const frame = window.requestAnimationFrame(() => setIsSidebarOpen(media.matches));
        return () => window.cancelAnimationFrame(frame);
    }, []);

    if (loading || !user || !canUseVendorHub) return null;

    const navItems = [
        { name: 'Обзор', path: '/vendor', icon: LayoutDashboard },
        { name: 'Товары', path: '/vendor/products', icon: PackageSearch },
        { name: 'Промокоды', path: '/vendor/promocodes', icon: TicketPercent },
        { name: 'Заказы', path: '/vendor/orders', icon: ShoppingBag },
        { name: 'Аналитика', path: '/vendor/analytics', icon: ChartNoAxesCombined },
        { name: 'Настройки', path: '/vendor/settings', icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-[#0a0f1c] text-white flex overflow-hidden selection:bg-purple-500/30">
            {/* Background Effects matching Liquid Glass theme */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/10 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px]" />
            </div>

            {/* Sidebar - Liquid Glass Style */}
            {isSidebarOpen && (
                <button
                    className="fixed inset-0 z-30 bg-black/55 backdrop-blur-sm md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                    aria-label="Закрыть меню"
                />
            )}

            <aside
                className={`${isSidebarOpen ? 'translate-x-0 md:w-72' : '-translate-x-full md:translate-x-0 md:w-24'} fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-white/5 bg-[#0d1220]/95 shadow-2xl backdrop-blur-[30px] transition-all duration-500 ease-in-out md:relative`}
            >
                {/* Logo Area */}
                <div className="p-8 flex items-center justify-between border-b border-white/5">
                    <Link href="/" className="flex items-center gap-3 no-underline group" title="На главную">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 bg-primary-gradient shadow-primary-glow">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        {isSidebarOpen && (
                            <div className="flex flex-col">
                                <span className="font-bold text-lg text-white tracking-wide">Perkly</span>
                                <span className="text-[10px] text-white/50 uppercase tracking-widest font-semibold">Vendor Hub</span>
                            </div>
                        )}
                    </Link>
                    {isSidebarOpen && (
                        <button 
                            onClick={() => setIsSidebarOpen(false)} 
                            className="p-2 text-white/40 hover:text-white transition-colors bg-transparent border-0 cursor-pointer"
                            title="Свернуть меню"
                            aria-label="Свернуть меню"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {!isSidebarOpen && (
                    <div className="flex justify-center p-4">
                        <button 
                            onClick={() => setIsSidebarOpen(true)} 
                            className="p-2 text-white/40 hover:text-white transition-colors bg-white/5 rounded-lg border-0 cursor-pointer"
                            title="Развернуть меню"
                            aria-label="Развернуть меню"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {/* Navigation Area */}
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto mt-4">
                    {navItems.map((item) => {
                        const isActive = item.path === '/vendor'
                            ? pathname === item.path
                            : pathname.startsWith(item.path);
                        return (
                            <Link
                                key={item.name}
                                href={item.path}
                                onClick={() => {
                                    if (window.innerWidth < 768) setIsSidebarOpen(false);
                                }}
                                className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 no-underline group ${isActive ? 'text-white bg-white/10 shadow-inner-border' : 'text-white/60 hover:text-white'}`}
                            >
                                <item.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-purple-400' : 'group-hover:text-white/90'}`} />
                                {isSidebarOpen && (
                                    <span className="font-medium tracking-wide flex-1">{item.name}</span>
                                )}
                                {isSidebarOpen && isActive && (
                                    <ChevronRight className="w-4 h-4 text-purple-400/50" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer / Logout */}
                <div className="p-4 border-t border-white/5">
                    <button
                        onClick={logout}
                        className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300 group border-0 bg-transparent cursor-pointer"
                        title="Выйти из аккаунта"
                    >
                        <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        {isSidebarOpen && <span className="font-medium">Выйти</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 relative z-10 overflow-y-auto min-h-screen min-w-0">
                <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-12">
                    {/* Minimalist Top Header info */}
                    <header className="flex justify-between items-center mb-8 pb-5 border-b border-white/5">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-white/70 md:hidden"
                            aria-label="Открыть меню"
                        >
                            <Menu className="h-5 w-5" />
                        </button>
                        <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-full border border-white/5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 p-[2px] relative overflow-hidden">
                                <Image 
                                    src={user.avatarUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + user.displayName} 
                                    alt="Vendor" 
                                    fill 
                                    className="rounded-full object-cover bg-[#0a0f1c]" 
                                />
                            </div>
                            <span className="font-medium text-sm text-white/90">{user.displayName}</span>
                        </div>
                    </header>

                    {/* Render nested routes (page.tsx) */}
                    {children}
                </div>
            </main>
        </div>
    );
}
