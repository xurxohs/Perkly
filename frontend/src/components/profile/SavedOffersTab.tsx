'use client';

import React from 'react';
import Link from 'next/link';
import { Bookmark, Trash2, Loader2 } from 'lucide-react';
import { SavedOffer, offersApi } from '@/lib/api';

interface SavedOffersTabProps {
    savedOffers: SavedOffer[];
    setSavedOffers: React.Dispatch<React.SetStateAction<SavedOffer[]>>;
    loading: boolean;
    error: string | null;
    hapticNotification?: (type: 'error' | 'success' | 'warning') => void;
}

export function SavedOffersTab({
    savedOffers,
    setSavedOffers,
    loading,
    error,
    hapticNotification,
}: SavedOffersTabProps) {
    const handleRemoveSavedOffer = async (offerId: string) => {
        try {
            await offersApi.unsave(offerId);
            setSavedOffers((current) => current.filter((savedOffer) => savedOffer.offerId !== offerId));
            hapticNotification?.('success');
        } catch (err) {
            console.error('Failed to remove saved offer', err);
            hapticNotification?.('error');
        }
    };

    if (loading) {
        return (
            <div className="p-12 text-center rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-3" />
                <p className="text-white/40 text-sm font-medium">Загружаем сохранённые товары...</p>
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

    if (savedOffers.length === 0) {
        return (
            <div className="p-12 text-center rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <Bookmark className="w-12 h-12 text-white/10 mx-auto mb-3" />
                <p className="text-white/40 mb-3 text-sm font-medium">Сохранённых офферов пока нет</p>
                <Link href="/catalog" className="text-purple-400 font-bold text-sm no-underline hover:underline">
                    Перейти в каталог →
                </Link>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedOffers.map((savedOffer) => (
                <div
                    key={savedOffer.id}
                    className="rounded-2xl p-5 bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.08] backdrop-blur-xl hover:border-purple-500/30 transition-all flex flex-col justify-between"
                >
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] text-white/40 uppercase font-extrabold tracking-wider mb-1">
                                {savedOffer.offer.category}
                            </p>
                            <Link
                                href={`/offer/?id=${savedOffer.offerId}`}
                                className="text-white font-extrabold text-base no-underline hover:text-purple-300 transition-colors line-clamp-2 leading-snug"
                            >
                                {savedOffer.offer.title}
                            </Link>
                            {savedOffer.offer.description && (
                                <p className="text-xs text-white/40 mt-1.5 line-clamp-2 font-medium">
                                    {savedOffer.offer.description}
                                </p>
                            )}
                        </div>

                        <button
                            onClick={() => handleRemoveSavedOffer(savedOffer.offerId)}
                            className="shrink-0 p-2.5 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 cursor-pointer transition-all"
                            title="Удалить из сохранённых"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                        <span className="text-lg font-black text-emerald-400">
                            {savedOffer.offer.price === 0 ? 'Бесплатно' : `${savedOffer.offer.price.toLocaleString('ru-RU')} сум`}
                        </span>
                        <span className="text-xs text-white/30 font-medium">
                            Добавлено {new Date(savedOffer.createdAt).toLocaleDateString('ru-RU')}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}
