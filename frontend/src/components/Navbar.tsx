'use client';

import Link from 'next/link';
import { User, LogOut, Search, X, Tag, Gem, Medal } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useTelegram } from '@/hooks/useTelegram';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function Navbar() {
    const { user, isAuthenticated, logout } = useAuth();
    const { hapticImpact } = useTelegram();
    const [searchOpen, setSearchOpen] = useState(false);
    const [query, setQuery] = useState('');
    const searchRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

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

    const tierBadge = user?.tier === 'PLATINUM'
        ? { icon: Gem, bg: 'linear-gradient(135deg, #a855f7, #d946ef)', shadow: '0 0 10px rgba(168,85,247,0.4)', color: '#fff' }
        : user?.tier === 'GOLD'
            ? { icon: Medal, bg: 'linear-gradient(135deg, #fbbf24, #f59e0b)', shadow: '0 0 10px rgba(251,191,36,0.4)', color: '#fff' }
            : null;

    return (
        <nav 
            className="fixed left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-7xl z-50 liquid-glass-nav px-6 py-3 rounded-[2rem] flex items-center justify-between transition-all duration-300"
            style={{ top: 'calc(1rem + env(safe-area-inset-top, 0px))' }}
        >
            <Link href="/" className="flex items-center gap-2 no-underline shrink-0">
                <div className="w-8 h-8 rounded-full" style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)', boxShadow: '0 0 15px rgba(168,85,247,0.5)' }} />
                <span className="text-xl font-bold tracking-tight text-white">Perkly</span>
            </Link>

            {/* Search Bar — центральный */}
            <div className="hidden md:flex flex-1 max-w-md mx-6">
                <form onSubmit={handleSearch} className="w-full relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                        ref={searchRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Поиск купонов, подписок, товаров..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-full text-sm text-white placeholder-white/30 outline-none"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                    />
                </form>
            </div>

            {/* Nav Links */}
            <div className="hidden lg:flex items-center gap-5 text-sm font-medium text-white/50 shrink-0">
                <Link href="/catalog" className="hover:text-white transition-colors no-underline text-inherit">Каталог</Link>
                <Link href="/coupons" className="hover:text-white transition-colors no-underline text-inherit flex items-center gap-1.5"><Tag className="w-4 h-4" /> Купоны</Link>
                <Link href="/pricing" className="hover:text-white transition-colors no-underline text-inherit">Тарифы ✨</Link>
                <Link href="/sell" className="hover:text-white transition-colors no-underline text-inherit">Продавать</Link>
                <Link href="/wheel" className="hover:text-white transition-colors no-underline text-inherit flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]">
                        <path d="M9.375 3a1.875 1.875 0 0 0 0 3.75h1.875v4.5H3.375A1.875 1.875 0 0 1 1.5 9.375v-.75c0-1.036.84-1.875 1.875-1.875h3.193A3.375 3.375 0 0 1 12 2.753a3.375 3.375 0 0 1 5.432 3.997h3.193c1.035 0 1.875.84 1.875 1.875v.75c0 1.036-.84 1.875-1.875 1.875H12.75v-4.5h1.875a1.875 1.875 0 1 0-1.875-1.875V6.75h-1.5V4.875C11.25 3.839 10.41 3 9.375 3ZM11.25 12.75H3v6.75a2.25 2.25 0 0 0 2.25 2.25h6v-9ZM12.75 12.75v9h6.75a2.25 2.25 0 0 0 2.25-2.25v-6.75h-9Z" />
                    </svg>
                    Фортуна
                </Link>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-4">
                {/* Mobile search toggle */}
                <button 
                    onClick={() => {
                        hapticImpact('light');
                        setSearchOpen(!searchOpen);
                    }} 
                    className="md:hidden p-2 rounded-full hover:bg-white/5 transition cursor-pointer bg-transparent border-0"
                    title={searchOpen ? "Закрыть поиск" : "Открыть поиск"}
                >
                    {searchOpen ? <X className="w-5 h-5 text-white/70" /> : <Search className="w-5 h-5 text-white/70" />}
                </button>



                {/* Cart removed as it is in the mobile dock */}

                {isAuthenticated ? (
                    <>
                        <Link href="/profile" className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-full hover:bg-white/5 transition no-underline text-white/70">
                            <User className="w-4 h-4" />
                            <span className="hidden sm:inline">{user?.displayName || 'Профиль'}</span>
                            {tierBadge && (
                                <tierBadge.icon
                                    className="w-3.5 h-3.5 ml-1"
                                    style={{
                                        filter: `drop-shadow(${tierBadge.shadow})`,
                                        color: tierBadge.color
                                    }}
                                />
                            )}
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
                        <Link href="/login" className="px-4 py-2 text-sm font-medium rounded-full border border-white/10 hover:bg-white/5 transition flex items-center text-white no-underline">
                            Войти
                        </Link>
                        <Link href="/register" className="px-4 py-2 text-sm font-medium rounded-full bg-white text-black hover:bg-white/90 transition flex items-center no-underline" style={{ boxShadow: '0 0 20px rgba(255,255,255,0.15)' }}>
                            Начать
                        </Link>
                    </>
                )}
            </div>

            {/* Mobile search overlay */}
            {searchOpen && (
                <div className="absolute top-full left-0 w-full p-4 md:hidden" style={{ background: 'rgba(0,0,0,0.95)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <form onSubmit={handleSearch} className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Поиск купонов, подписок, товаров..."
                            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                            autoFocus
                        />
                    </form>
                </div>
            )}
        </nav>
    );
}
