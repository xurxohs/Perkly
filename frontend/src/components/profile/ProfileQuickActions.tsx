'use client';

import React from 'react';
import Link from 'next/link';
import { Users, Crown, MessageSquare, Store, ShieldAlert, ChevronRight } from 'lucide-react';

interface ProfileQuickActionsProps {
    userRole: string;
}

export function ProfileQuickActions({ userRole }: ProfileQuickActionsProps) {
    const isVendorOrAdmin = userRole === 'VENDOR' || userRole === 'ADMIN';

    return (
        <div className="mb-6">
            <h2 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Быстрый доступ</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Squad Rewards */}
                <Link
                    href="/profile/squad"
                    className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-950/30 via-slate-900/50 to-black/60 p-4.5 backdrop-blur-xl shadow-md hover:border-indigo-500/40 transition-all no-underline flex items-center justify-between"
                >
                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white mb-0.5 group-hover:text-indigo-300 transition-colors">Сквад и награды</h3>
                            <p className="text-xs text-white/40">Цели с друзьями и 15% кешбэк</p>
                        </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                </Link>

                {/* Tariffs */}
                <Link
                    href="/pricing"
                    className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-amber-950/30 via-slate-900/50 to-black/60 p-4.5 backdrop-blur-xl shadow-md hover:border-amber-500/40 transition-all no-underline flex items-center justify-between"
                >
                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                            <Crown className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white mb-0.5 group-hover:text-amber-300 transition-colors">Тарифы и привилегии</h3>
                            <p className="text-xs text-white/40">Улучшите статус и выгоду</p>
                        </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                </Link>

                {/* Direct Messages */}
                <Link
                    href="/chat"
                    className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-purple-950/30 via-slate-900/50 to-black/60 p-4.5 backdrop-blur-xl shadow-md hover:border-purple-500/40 transition-all no-underline flex items-center justify-between"
                >
                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                            <MessageSquare className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white mb-0.5 group-hover:text-purple-300 transition-colors">Личные сообщения</h3>
                            <p className="text-xs text-white/40">Чаты с продавцами и диспатчи</p>
                        </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                </Link>

                {/* Seller/Partner or Admin Hub */}
                {isVendorOrAdmin ? (
                    <Link
                        href="/vendor"
                        className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-950/30 via-slate-900/50 to-black/60 p-4.5 backdrop-blur-xl shadow-md hover:border-emerald-500/40 transition-all no-underline flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                                <Store className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white mb-0.5 group-hover:text-emerald-300 transition-colors">Кабинет продавца</h3>
                                <p className="text-xs text-white/40">Управление офферами и доходами</p>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                    </Link>
                ) : (
                    <Link
                        href="/sell"
                        className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-950/30 via-slate-900/50 to-black/60 p-4.5 backdrop-blur-xl shadow-md hover:border-emerald-500/40 transition-all no-underline flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                                <Store className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white mb-0.5 group-hover:text-emerald-300 transition-colors">Стать партнером</h3>
                                <p className="text-xs text-white/40">Продавайте товары на Perkly</p>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                    </Link>
                )}
            </div>
        </div>
    );
}
