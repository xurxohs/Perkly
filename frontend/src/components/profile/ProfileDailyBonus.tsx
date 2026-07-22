'use client';

import React, { useState } from 'react';
import { Flame, Check, Sparkles } from 'lucide-react';
import { usersApi, DailyBonusStatus } from '@/lib/api';

interface ProfileDailyBonusProps {
    dailyStatus: DailyBonusStatus | null;
    refreshBonus: () => Promise<void>;
    refreshUser: () => Promise<void>;
    hapticImpact?: (style: 'light' | 'medium' | 'heavy') => void;
    hapticNotification?: (type: 'error' | 'success' | 'warning') => void;
}

export function ProfileDailyBonus({
    dailyStatus,
    refreshBonus,
    refreshUser,
    hapticImpact,
    hapticNotification,
}: ProfileDailyBonusProps) {
    const [claimingDaily, setClaimingDaily] = useState(false);

    if (!dailyStatus) return null;

    const handleClaimDailyBonus = async () => {
        if (claimingDaily || !dailyStatus.canClaimToday) return;
        setClaimingDaily(true);
        hapticImpact?.('medium');

        try {
            const res = await usersApi.claimDailyBonus();
            hapticNotification?.('success');
            alert(res.message);
            await refreshUser();
            await refreshBonus();
        } catch (err: unknown) {
            hapticNotification?.('error');
            alert(err instanceof Error ? err.message : 'Ошибка при получении бонуса');
        } finally {
            setClaimingDaily(false);
        }
    };

    const getStreakWord = (streak: number) => {
        const lastDigit = streak % 10;
        const lastTwoDigits = streak % 100;
        if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return 'дней';
        if (lastDigit === 1) return 'день';
        if (lastDigit >= 2 && lastDigit <= 4) return 'дня';
        return 'дней';
    };

    return (
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-amber-950/20 via-slate-900/40 to-black/60 p-5 sm:p-6 backdrop-blur-xl shadow-lg mb-6">
            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                        <Flame className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                        <h3 className="text-base font-extrabold text-white leading-tight">Ежедневный бонус</h3>
                        <span className="text-xs text-white/40 font-medium">Заходите каждый день и собирайте награды</span>
                    </div>
                </div>

                <div className="text-right">
                    <div className="text-sm font-black text-amber-300 flex items-center justify-end gap-1">
                        <span>{dailyStatus.currentStreak} {getStreakWord(dailyStatus.currentStreak)}</span>
                        <span className="text-xs">🔥</span>
                    </div>
                    <div className="text-[10px] text-white/30 uppercase font-bold tracking-wider">Рекорд {dailyStatus.longestStreak}</div>
                </div>
            </div>

            {/* 7 Days Progress Grid */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-4 relative z-10">
                {dailyStatus.weekProgress.map((day, idx) => {
                    const isClaimed = day.claimed;
                    const isToday = !day.claimed && dailyStatus.canClaimToday && idx === dailyStatus.weekProgress.findIndex(d => !d.claimed);

                    return (
                        <div
                            key={day.day || idx}
                            className={`flex flex-col items-center justify-between p-2 rounded-xl border text-center transition-all ${
                                isClaimed
                                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                                    : isToday
                                    ? 'bg-white/10 border-amber-400 text-white ring-2 ring-amber-400/50 animate-pulse'
                                    : 'bg-white/[0.02] border-white/5 text-white/30'
                            }`}
                        >
                            <span className="text-[9px] font-extrabold uppercase tracking-wider mb-1">{day.label}</span>
                            <div className="text-xs my-0.5 font-bold">
                                {isClaimed ? (
                                    <Check className="w-3.5 h-3.5 text-amber-400 mx-auto" />
                                ) : (
                                    <span className="text-white/20">•</span>
                                )}
                            </div>
                            <span className="text-[10px] font-black">{day.reward.points > 0 ? `+${day.reward.points}` : '0'}</span>
                        </div>
                    );
                })}
            </div>

            {/* Action button */}
            <div className="relative z-10">
                {dailyStatus.canClaimToday ? (
                    <button
                        onClick={handleClaimDailyBonus}
                        disabled={claimingDaily}
                        className="w-full py-3 rounded-xl font-extrabold text-sm transition-all bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black border-0 cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.99]"
                    >
                        <Sparkles className="w-4 h-4" />
                        <span>{claimingDaily ? 'Получение...' : `Забрать +${dailyStatus.todayReward.points} Points`}</span>
                    </button>
                ) : (
                    <div className="w-full py-3 rounded-xl font-bold text-xs bg-white/5 border border-white/10 text-white/40 flex items-center justify-center text-center cursor-default gap-2">
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Бонус получен! Следующий забор завтра</span>
                    </div>
                )}
            </div>
        </div>
    );
}
