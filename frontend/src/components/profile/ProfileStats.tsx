'use client';

import React, { useState } from 'react';
import { Wallet, ShoppingBag, Sparkles, Gift, Copy, CheckCircle } from 'lucide-react';
import { PerklyGlyph } from '@/components/PerklyGlyph';

interface ProfileStatsProps {
    user: {
        id: string;
        balance: number;
        rewardPoints: number;
    };
    stats: {
        totalSpent: number;
        totalPurchases: number;
    };
    onOpenTopUp: () => void;
    onOpenRedeemGift: () => void;
    hapticImpact?: (style: 'light' | 'medium' | 'heavy') => void;
    hapticNotification?: (type: 'error' | 'success' | 'warning') => void;
}

export function ProfileStats({
    user,
    stats,
    onOpenTopUp,
    onOpenRedeemGift,
    hapticImpact,
    hapticNotification,
}: ProfileStatsProps) {
    const [copiedRef, setCopiedRef] = useState(false);

    const handleCopyRefLink = () => {
        hapticImpact?.('medium');
        const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME || 'PerklyPlatformBot';
        const link = `https://t.me/${botUsername}?start=ref_${user.id}`;
        navigator.clipboard.writeText(link);
        setCopiedRef(true);
        hapticNotification?.('success');
        setTimeout(() => setCopiedRef(false), 2000);
    };

    return (
        <div className="space-y-4 mb-6">
            {/* Stats Dashboard Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Balance Card */}
                <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-purple-900/30 via-slate-900/50 to-black/60 p-5 backdrop-blur-xl shadow-lg flex flex-col justify-between group hover:border-purple-500/30 transition-all">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-purple-500/20 transition-all" />
                    <div>
                        <div className="flex items-center justify-between text-xs font-bold text-white/50 uppercase tracking-wider mb-2">
                            <span className="flex items-center gap-1.5">
                                <Wallet className="w-4 h-4 text-purple-400" />
                                Личный баланс
                            </span>
                        </div>
                        <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                            {user.balance.toLocaleString('ru-RU')} <span className="text-sm font-semibold text-white/60">сум</span>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            hapticImpact?.('light');
                            onOpenTopUp();
                        }}
                        className="mt-4 w-full py-2.5 px-4 rounded-xl bg-white text-black font-extrabold text-xs transition-all hover:bg-purple-200 active:scale-[0.98] cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                    >
                        <span>+ Пополнить баланс</span>
                    </button>
                </div>

                {/* Purchases Card */}
                <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-blue-900/20 via-slate-900/50 to-black/60 p-5 backdrop-blur-xl shadow-lg flex flex-col justify-between group hover:border-blue-500/30 transition-all">
                    <div className="flex items-center justify-between text-xs font-bold text-white/50 uppercase tracking-wider mb-2">
                        <span className="flex items-center gap-1.5">
                            <ShoppingBag className="w-4 h-4 text-blue-400" />
                            Всего покупок
                        </span>
                    </div>
                    <div>
                        <div className="text-3xl font-black text-white tracking-tight">
                            {stats.totalPurchases}
                        </div>
                        <p className="text-xs text-white/40 mt-1 font-medium">Активных и завершённых заказов</p>
                    </div>
                </div>

                {/* Reward Points Card */}
                <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-amber-900/20 via-slate-900/50 to-black/60 p-5 backdrop-blur-xl shadow-lg flex flex-col justify-between group hover:border-amber-500/30 transition-all">
                    <div className="flex items-center justify-between text-xs font-bold text-white/50 uppercase tracking-wider mb-2">
                        <span className="flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-amber-400" />
                            Perkly Points
                        </span>
                    </div>
                    <div>
                        <div className="text-3xl font-black text-amber-300 tracking-tight flex items-center gap-1">
                            {user.rewardPoints.toLocaleString('ru-RU')}
                            <span className="text-xs font-bold text-amber-400/70 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">PTS</span>
                        </div>
                        <p className="text-xs text-white/40 mt-1 font-medium">Используйте для скидок и бонусов</p>
                    </div>
                </div>
            </div>

            {/* Referral / Gift Card Banner */}
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-black/60 p-5 sm:p-6 backdrop-blur-xl shadow-lg">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-5">
                    <div className="flex items-center gap-4 text-center lg:text-left">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center shrink-0 shadow-inner">
                            <Gift className="w-6 h-6 text-pink-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white flex items-center justify-center lg:justify-start gap-2">
                                Пригласи друга — получи 500 баллов!
                            </h3>
                            <p className="text-xs text-white/50 mt-0.5 max-w-md">
                                Начислим по 500 Perkly Points вам и вашему другу после его первого успешного заказа.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
                        <button
                            onClick={() => {
                                hapticImpact?.('medium');
                                onOpenRedeemGift();
                            }}
                            className="flex-1 sm:flex-none py-2.5 px-4 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/15 border border-white/15 text-white transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                            <PerklyGlyph name="coupon" className="w-4 h-4 text-purple-300" />
                            <span>Активировать код</span>
                        </button>

                        <button
                            onClick={handleCopyRefLink}
                            className="flex-1 sm:flex-none py-2.5 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-900/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                            {copiedRef ? (
                                <>
                                    <CheckCircle className="w-4 h-4 text-emerald-300" />
                                    <span>Ссылка скопирована!</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="w-4 h-4" />
                                    <span>Реф. ссылка</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
