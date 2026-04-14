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
    CreditCard,
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
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Protect route
    useEffect(() => {
        if (!loading && !user) {
            router.push('/profile');
        }
    }, [user, loading, router]);

    if (loading || !user) return null;

    const navItems = [
        { name: 'Дашборд', path: '/vendor', icon: LayoutDashboard },
        { name: 'Мои Товары', path: '/vendor/products', icon: PackageSearch },
        { name: 'Заказы', path: '/vendor/orders', icon: ShoppingBag },
        { name: 'Выплаты', path: '/vendor/analytics', icon: CreditCard },
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
            <aside
                className={`${isSidebarOpen ? 'w-72' : 'w-24'} transition-all duration-500 ease-in-out relative z-20 flex flex-col bg-white/5 backdrop-blur-[30px] border-r border-white/5 shadow-2xl`}
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
                        const isActive = pathname === item.path;
                        return (
                            <Link
                                key={item.name}
                                href={item.path}
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
            <main className="flex-1 relative z-10 overflow-y-auto min-h-screen">
                <div className="max-w-7xl mx-auto p-8 lg:p-12">
                    {/* Minimalist Top Header info */}
                    <header className="flex justify-end items-center mb-10 pb-6 border-b border-white/5">
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
