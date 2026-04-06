'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import Link from 'next/link';
import { LayoutDashboard, Users, ShoppingBag, CreditCard, Scale, Image as ImageIcon, Settings, LogOut, MessageCircle, Activity } from 'lucide-react';

const ADMIN_LINKS = [
    { name: 'Обзор', href: '/admin', icon: LayoutDashboard },
    { name: 'Посещения', href: '/admin/analytics', icon: Activity },
    { name: 'Пользователи', href: '/admin/users', icon: Users },
    { name: 'Товары', href: '/admin/offers', icon: ShoppingBag },
    { name: 'Транзакции', href: '/admin/transactions', icon: CreditCard },
    { name: 'Споры', href: '/admin/disputes', icon: Scale },
    { name: 'Чаты', href: '/admin/chats', icon: MessageCircle },
    { name: 'Баннеры', href: '/admin/banners', icon: ImageIcon },
    { name: 'Настройки', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, isAuthenticated, loading, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    // Экран логина должен загружаться без проверки на Админа и без сайдбара
    const isLoginPage = pathname === '/admin/login';

    useEffect(() => {
        if (!loading && !isLoginPage) {
            if (!isAuthenticated) {
                router.replace('/admin/login');
            } else if (user?.role !== 'ADMIN') {
                router.replace('/profile');
            }
        }
    }, [isAuthenticated, loading, user, router, isLoginPage, pathname]);

    if (isLoginPage) {
        return <>{children}</>;
    }

    if (loading || !isAuthenticated || user?.role !== 'ADMIN') {
        return (
            <div className="min-h-screen bg-[#0a0f1c] flex items-center justify-center">
                <div className="w-12 h-12 rounded-full border-4 border-red-500/30 border-t-red-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0f1c] flex flex-col md:flex-row text-white pt-[72px]">
            {/* Sidebar Desktop */}
            <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-white/5 bg-[#0d1326]/50 backdrop-blur-xl h-[calc(100vh-72px)] sticky top-[72px] overflow-y-auto">
                <div className="p-6">
                    <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-pink-500 mb-1">Superadmin</h2>
                    <p className="text-xs text-white/40">Управление платформой</p>
                </div>

                <nav className="flex-1 px-4 pb-6 space-y-1">
                    {ADMIN_LINKS.map((link) => {
                        const Icon = link.icon;
                        const isActive = pathname === link.href;

                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 no-underline ${isActive
                                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                    : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
                                    }`}
                                style={{
                                    boxShadow: isActive ? 'inset 0 0 20px rgba(239,68,68,0.05)' : 'none'
                                }}
                            >
                                <Icon className={`w-5 h-5 ${isActive ? 'text-red-400' : 'text-white/40'}`} />
                                <span className="font-medium text-sm">{link.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-white/5 mt-auto">
                    <button
                        onClick={() => { logout(); router.push('/'); }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer border-0 bg-transparent text-sm font-medium"
                    >
                        <LogOut className="w-4 h-4" /> Выйти
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0 p-4 md:p-8 overflow-y-auto h-[calc(100vh-72px)]">
                {children}
            </main>
        </div>
    );
}
