'use client';

import React, { useState, useEffect } from 'react';
import { ShoppingBag, Eye, EyeOff, Trash2, Check, X, RefreshCw } from 'lucide-react';
import api from '@/lib/api';

export default function AdminOffers() {
    const [offers, setOffers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchOffers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/offers');
            setOffers(res.offers);
        } catch (error) {
            console.error('Failed to fetch offers:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOffers();
    }, []);

    const toggleOfferStatus = async (id: string, currentStatus: boolean) => {
        try {
            await api.patch(`/admin/offers/${id}`, { isActive: !currentStatus });
            fetchOffers();
        } catch (error) {
            console.error('Failed to update status', error);
        }
    };

    const deleteOffer = async (id: string) => {
        if (!window.confirm('Вы уверены, что хотите удалить этот товар навсегда?')) return;
        try {
            await api.delete(`/admin/offers/${id}`);
            fetchOffers();
        } catch (error) {
            console.error('Failed to delete offer', error);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in fade-in-up">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Товары платформы</h1>
                    <p className="text-white/40">Модерация, блокировка и удаление</p>
                </div>
                <button onClick={fetchOffers} className="p-2 rounded-xl bg-white/5 text-white/60 hover:text-white cursor-pointer border-0">
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="bg-[#101524]/60 backdrop-blur-xl rounded-3xl border border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/5">
                                <th className="py-4 px-6 text-xs font-semibold text-white/40 uppercase tracking-wider">Товар</th>
                                <th className="py-4 px-6 text-xs font-semibold text-white/40 uppercase tracking-wider">Продавец</th>
                                <th className="py-4 px-6 text-xs font-semibold text-white/40 uppercase tracking-wider">Цена</th>
                                <th className="py-4 px-6 text-xs font-semibold text-white/40 uppercase tracking-wider">Статус</th>
                                <th className="py-4 px-6 text-right text-xs font-semibold text-white/40 uppercase tracking-wider">Действия</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading && offers.length === 0 ? (
                                <tr><td colSpan={5} className="py-8 text-center text-white/40">Загрузка...</td></tr>
                            ) : offers.length === 0 ? (
                                <tr><td colSpan={5} className="py-8 text-center text-white/40">Товары не найдены</td></tr>
                            ) : offers.map(offer => (
                                <tr key={offer.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center shrink-0 border border-white/5">
                                                <ShoppingBag className="w-5 h-5 text-indigo-400" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-white text-sm line-clamp-1">{offer.title}</div>
                                                <div className="text-xs text-white/30">{offer.category}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="text-sm text-white">{offer.seller?.displayName || offer.seller?.email || 'Неизвестно'}</div>
                                    </td>
                                    <td className="py-4 px-6 font-mono text-sm text-green-400 font-bold">
                                        ${offer.price.toFixed(2)}
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${offer.isActive ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                            }`}>
                                            {offer.isActive ? 'Активен' : 'Заблокирован'}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => toggleOfferStatus(offer.id, offer.isActive)}
                                                title={offer.isActive ? 'Заблокировать' : 'Активировать'}
                                                className={`p-2 rounded-xl transition-all border-0 cursor-pointer ${offer.isActive ? 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20' : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                                                    }`}
                                            >
                                                {offer.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                            <button
                                                onClick={() => deleteOffer(offer.id)}
                                                title="Удалить"
                                                className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all border-0 cursor-pointer"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
