'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Ticket, Percent, Copy, CheckCircle, Loader2 } from 'lucide-react';
import { PromocodeActivation, analyticsApi } from '@/lib/api';
import api from '@/lib/api';

const PROMOCODE_ACTIVATION_META: Record<string, { label: string; className: string }> = {
    ISSUED: {
        label: 'Выдан',
        className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    },
    COPIED: {
        label: 'Скопирован',
        className: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    },
    USED: {
        label: 'Использован',
        className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    },
};

interface PromocodesTabProps {
    promocodeActivations: PromocodeActivation[];
    setPromocodeActivations: React.Dispatch<React.SetStateAction<PromocodeActivation[]>>;
    loading: boolean;
    error: string | null;
    hapticNotification?: (type: 'error' | 'success' | 'warning') => void;
}

export function PromocodesTab({
    promocodeActivations,
    setPromocodeActivations,
    loading,
    error,
    hapticNotification,
}: PromocodesTabProps) {
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const handleCopyPromocode = async (activation: PromocodeActivation) => {
        if (!activation.codeSnapshot) return;

        try {
            const updated = await api.promocodes.copyActivation(activation.id);
            await navigator.clipboard.writeText(updated.codeSnapshot || activation.codeSnapshot);
            setPromocodeActivations((current) =>
                current.map((item) => (item.id === activation.id ? { ...item, ...updated } : item))
            );
            setCopiedId(`promo-${activation.id}`);
            hapticNotification?.('success');
            analyticsApi.trackEvent({
                eventType: 'promocode_copy',
                metadata: JSON.stringify({ activationId: activation.id, promocodeId: activation.promocodeId }),
            }).catch(() => {});
            setTimeout(() => setCopiedId(null), 2000);
        } catch (err) {
            hapticNotification?.('error');
            alert(err instanceof Error ? err.message : 'Не удалось скопировать промокод');
        }
    };

    const handleUsePromocode = async (activation: PromocodeActivation) => {
        if (!confirm('Отметить промокод как использованный?')) return;

        try {
            const updated = await api.promocodes.useActivation(activation.id);
            setPromocodeActivations((current) =>
                current.map((item) => (item.id === activation.id ? { ...item, ...updated } : item))
            );
            hapticNotification?.('success');
        } catch (err) {
            hapticNotification?.('error');
            alert(err instanceof Error ? err.message : 'Не удалось обновить промокод');
        }
    };

    if (loading) {
        return (
            <div className="p-12 text-center rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-3" />
                <p className="text-white/40 text-sm font-medium">Загружаем промокоды...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm font-medium">
                {error}
            </div>
        );
    }

    if (promocodeActivations.length === 0) {
        return (
            <div className="p-12 text-center rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <Ticket className="w-12 h-12 text-white/10 mx-auto mb-3" />
                <p className="text-white/40 mb-3 text-sm font-medium">Активированных промокодов пока нет</p>
                <Link href="/catalog" className="text-purple-400 font-bold text-sm no-underline hover:underline">
                    Перейти в каталог →
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {promocodeActivations.map((activation) => {
                const statusMeta = PROMOCODE_ACTIVATION_META[activation.status] ?? PROMOCODE_ACTIVATION_META.ISSUED;
                const expiresAt = activation.expiresAt ? new Date(activation.expiresAt) : null;
                const isExpired = Boolean(expiresAt && expiresAt < new Date());
                const canUse = activation.status !== 'USED' && !isExpired;
                const copied = copiedId === `promo-${activation.id}`;

                return (
                    <div
                        key={activation.id}
                        className="rounded-2xl p-5 bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.08] backdrop-blur-xl hover:border-purple-500/30 transition-all"
                    >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-start gap-4 min-w-0">
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-purple-500/10 border border-purple-500/20 text-purple-400">
                                    <Ticket className="w-6 h-6" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                        <h4 className="text-white font-extrabold text-base truncate">
                                            {activation.promocode?.title ?? 'Промокод'}
                                        </h4>
                                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${statusMeta.className}`}>
                                            {isExpired && activation.status !== 'USED' ? 'Истёк' : statusMeta.label}
                                        </span>
                                    </div>
                                    <p className="text-xs text-white/40 truncate font-medium">
                                        {activation.promocode?.company?.brandName ?? 'Perkly'} · {activation.promocode?.offer?.title ?? 'Любой подходящий оффер'}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-white/40 font-semibold">
                                        <span className="inline-flex items-center gap-1 text-emerald-400 font-extrabold">
                                            <Percent className="w-3.5 h-3.5" />
                                            {activation.promocode?.discountValue ?? 0}% Скидка
                                        </span>
                                        <span>•</span>
                                        <span>{expiresAt ? `До ${expiresAt.toLocaleDateString('ru-RU')}` : 'Без срока'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="md:text-right shrink-0 space-y-2">
                                <div className="rounded-xl px-4 py-2.5 bg-black/40 border border-white/10 md:min-w-[180px] text-center">
                                    <p className="text-[10px] text-white/40 uppercase font-bold mb-0.5">Код купона</p>
                                    <code className="block text-sm text-purple-300 font-mono font-bold break-all select-all">
                                        {activation.codeSnapshot ?? 'Сгенерируется при копировании'}
                                    </code>
                                </div>
                                <div className="flex md:justify-end gap-2">
                                    <button
                                        onClick={() => handleCopyPromocode(activation)}
                                        disabled={!activation.codeSnapshot || activation.status === 'USED' || isExpired}
                                        className={`px-3 py-2 rounded-xl text-xs font-extrabold cursor-pointer border transition-all disabled:opacity-40 flex items-center justify-center gap-1.5 ${
                                            copied
                                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                                : 'bg-purple-500/10 text-purple-300 border-purple-500/20 hover:bg-purple-500/20'
                                        }`}
                                    >
                                        {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                        <span>{copied ? 'Скопировано' : 'Копировать'}</span>
                                    </button>
                                    <button
                                        onClick={() => handleUsePromocode(activation)}
                                        disabled={!canUse}
                                        className="px-3 py-2 rounded-xl text-xs font-extrabold cursor-pointer border border-white/10 bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all disabled:opacity-40"
                                    >
                                        Использован
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
