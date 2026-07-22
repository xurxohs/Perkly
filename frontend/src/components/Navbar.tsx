'use client';

import Link from 'next/link';
import { LogOut, X, Moon, Sun } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useTelegram } from '@/hooks/useTelegram';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PerklyGlyph } from '@/components/PerklyGlyph';
import { useLanguage } from '@/lib/i18n';

export function Navbar({ theme = 'dark', onToggleTheme, showThemeToggle = false }: {
    theme?: 'light' | 'dark';
    onToggleTheme?: () => void;
    showThemeToggle?: boolean;
}) {
    const { user, isAuthenticated, logout } = useAuth();
    const { hapticImpact } = useTelegram();
    const [searchOpen, setSearchOpen] = useState(false);
    const [query, setQuery] = useState('');
    const searchRef = useRef<HTMLInputElement>(null);
    const router = useRouter();
    const { t } = useLanguage();

    useEffect(() => {
        if (searchOpen && searchRef.current) searchRef.current.focus();
    }, [searchOpen]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            router.push(`/catalog?search=${encodeURIComponent(query.trim())}`);
            setSearchOpen(false);
            setQuery('');
        }
    };

    const tierNameGradient = user?.tier === 'PLATINUM'
        ? theme === 'light'
            ? 'linear-gradient(90deg, #3547a8 0%, #7540a8 42%, #b22f79 72%, #167b9f 100%)'
            : 'linear-gradient(90deg, #b8c6ff 0%, #d7a8ff 42%, #ff8fcb 72%, #8bd8ff 100%)'
        : user?.tier === 'GOLD'
            ? theme === 'light'
                ? 'linear-gradient(90deg, #8a5a00 0%, #b47800 48%, #7a4800 100%)'
                : 'linear-gradient(90deg, #fff0a8 0%, #f6c453 48%, #e7a92f 100%)'
            : null;
    const canUseVendorHub = user?.role === 'VENDOR' || user?.role === 'ADMIN';

    return (
        <nav 
            className="fixed left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] sm:w-[calc(100%-2rem)] max-w-7xl z-50 liquid-glass-nav px-2.5 sm:px-5 py-1.5 sm:py-2.5 rounded-[1.65rem] sm:rounded-[2rem] flex items-center justify-between transition-all duration-300 top-safe"
        >
            <div className="flex items-center gap-1 shrink-0">
                <Link href="/" className="flex items-center gap-2 no-underline shrink-0">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary-gradient shadow-primary-glow" />
                    <span className="hidden min-[360px]:inline text-xl font-bold tracking-tight text-white">Perkly</span>
                </Link>
                {showThemeToggle && (
                    <button
                        type="button"
                        onClick={onToggleTheme}
                        className="theme-toggle ml-0.5 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border-0 bg-transparent transition-colors cursor-pointer"
                        aria-label={theme === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему'}
                        title={theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}
                    >
                        {theme === 'light' ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
                    </button>
                )}
            </div>

            {/* Search Bar — центральный */}
            <div className="hidden md:flex flex-1 max-w-lg ml-3 mr-6">
                <form onSubmit={handleSearch} className="w-full relative">
                    <PerklyGlyph name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                        ref={searchRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t('Поиск купонов, подписок, товаров...')}
                        className="w-full pl-10 pr-4 py-2.5 rounded-full text-sm text-white placeholder-white/30 outline-none bg-white/[0.04] border border-white/[0.08]"
                    />
                </form>
            </div>

            {/* Nav Links */}
            <div className="hidden lg:flex items-center gap-6 text-sm font-medium text-white/50 shrink-0">
                <Link href="/catalog" className="hover:text-white transition-colors no-underline text-inherit">{t('Каталог')}</Link>
                <Link
                    href={canUseVendorHub ? '/vendor' : '/sell'}
                    title={canUseVendorHub ? 'Открыть кабинет продавца' : 'Стать продавцом'}
                    className="hover:text-white transition-colors no-underline text-inherit"
                >
                    {t('Продать')}
                </Link>
                <Link href="/chat" className="hover:text-white transition-colors no-underline text-inherit">{t('Чаты')}</Link>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-2 sm:ml-4">
                {/* Mobile search toggle */}
                <button 
                    onClick={() => {
                        hapticImpact('light');
                        setSearchOpen(!searchOpen);
                    }} 
                    className="md:hidden p-2 rounded-full hover:bg-white/5 transition cursor-pointer bg-transparent border-0"
                    title={searchOpen ? "Закрыть поиск" : "Открыть поиск"}
                >
                    {searchOpen ? <X className="w-5 h-5 text-white/70" /> : <PerklyGlyph name="search" className="w-5 h-5 text-white/70" />}
                </button>



                {/* Cart removed as it is in the mobile dock */}

                {isAuthenticated ? (
                    <>
                        <Link href="/profile" className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-full hover:bg-white/5 transition no-underline text-white/70">
                            <PerklyGlyph name="profile" className="w-4 h-4" />
                            <span
                                className="hidden sm:inline font-bold"
                                style={tierNameGradient ? {
                                    backgroundImage: tierNameGradient,
                                    WebkitBackgroundClip: 'text',
                                    backgroundClip: 'text',
                                    color: 'transparent'
                                } : undefined}
                            >
                                {user?.displayName || t('Профиль')}
                            </span>
                        </Link>
                        <button 
                            onClick={() => {
                                hapticImpact('medium');
                                logout();
                            }} 
                            className="p-2 rounded-full hover:bg-white/5 transition cursor-pointer bg-transparent border-0"
                            title="Выйти"
                        >
                            <LogOut className="w-4 h-4 text-white/40" />
                        </button>
                    </>
                ) : (
                    <>
                        <Link href="/login" className="hidden sm:flex px-4 py-2 text-sm font-medium rounded-full border border-white/10 hover:bg-white/5 transition items-center text-white no-underline">
                            {t('Войти')}
                        </Link>
                        <Link href="/register" className="px-4 py-2 text-sm font-medium rounded-full bg-white text-black hover:bg-white/90 transition flex items-center no-underline shadow-white-glow">
                            {t('Начать')}
                        </Link>
                    </>
                )}
            </div>

            {/* Mobile search overlay */}
            {searchOpen && (
                <div className="absolute top-full left-0 w-full p-4 md:hidden bg-black/95 border-b border-white/[0.06]">
                    <form onSubmit={handleSearch} className="relative">
                        <PerklyGlyph name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={t('Поиск купонов, подписок, товаров...')}
                            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none bg-white/[0.04] border border-white/[0.08]"
                            autoFocus
                        />
                    </form>
                </div>
            )}
        </nav>
    );
}
