'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Key, Store, RefreshCw } from 'lucide-react';
import { Transaction } from '@/lib/api';

interface SubscriptionsTabProps {
    subscriptions: Transaction[];
}

export function SubscriptionsTab({ subscriptions }: SubscriptionsTabProps) {
    const router = useRouter();

    if (subscriptions.length === 0) {
        return (
            <div className="p-12 text-center rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <Key className="w-12 h-12 text-white/10 mx-auto mb-3" />
                <p className="text-white/40 mb-3 text-sm font-medium">У вас пока нет активных подписок</p>
                <Link href="/catalog" className="text-purple-400 font-bold text-sm no-underline hover:underline">
                    Найти в каталоге →
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {subscriptions.map((tx) => {
                const expires = tx.expiresAt ? new Date(tx.expiresAt) : null;
                const isExpired = Boolean(expires && expires < new Date());
                const diffDays = expires ? Math.ceil((expires.getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : 0;

                return (
                    <div
                        key={tx.id}
                        className="p-5 rounded-2xl bg-gradient-to-r from-white/[0.03] to-white/[0.01] border border-white/[0.08] backdrop-blur-xl flex items-center justify-between gap-4 group hover:border-purple-500/30 transition-all"
                    >
                        <div className="flex items-center gap-4 min-w-0">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0 group-hover:scale-105 transition-transform">
                                <Store className="w-6 h-6" />
                            </div>
                            <div className="min-w-0">
                                <h4 className="text-white font-bold text-base mb-1 truncate">{tx.offer?.title}</h4>
                                <div className="flex items-center gap-2.5 flex-wrap">
                                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${
                                        isExpired
                                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    }`}>
                                        {isExpired ? 'Истекла' : 'Активна'}
                                    </span>
                                    <p className="text-xs text-white/40 font-medium">
                                        {isExpired
                                            ? `Закончилась ${expires?.toLocaleDateString('ru-RU')}`
                                            : `До ${expires?.toLocaleDateString('ru-RU')} (осталось ${diffDays} дн.)`}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => router.push(`/offer/?id=${tx.offerId}`)}
                            className="px-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white text-xs font-bold hover:bg-purple-600 hover:border-purple-500 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-sm"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Продлить</span>
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
