'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle2, User, Store } from 'lucide-react';
import api, { Dispute } from '@/lib/api';

export default function AdminDisputes() {
    const [disputes, setDisputes] = useState<Dispute[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState('');

    const fetchDisputes = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.admin.getDisputes(status);
            setDisputes(res.disputes);
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Не удалось загрузить споры');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchDisputes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status]);

    const resolveDispute = async (id: string, resolution: 'BUYER' | 'SELLER') => {
        const text = resolution === 'BUYER'
            ? 'Решить в пользу ПОКУПАТЕЛЯ? Деньги вернутся на его баланс.'
            : 'Решить в пользу ПРОДАВЦА? Товар будет считаться выполненным, деньги перейдут продавцу.';
        if (!window.confirm(text)) return;
        const adminNote = window.prompt('Комментарий к решению (будет сохранён в истории)', '');
        if (adminNote === null) return;

        try {
            await api.admin.resolveDispute(id, resolution, adminNote);
            await fetchDisputes();
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Ошибка при разрешении спора');
        }
    };

    return (
        <div className="space-y-6 animate-fade-in fade-in-up">
            <div className="flex justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Споры (Арбитраж)</h1>
                    <p className="text-white/40">Решение конфликтов между покупателем и продавцом</p>
                </div>
                <div className="flex gap-2">
                    <select value={status} onChange={(event) => setStatus(event.target.value)} className="bg-[#101524] border border-white/10 rounded-xl px-3 py-2 text-sm text-white">
                        <option value="">Все</option>
                        <option value="OPEN">Открытые</option>
                        <option value="RESOLVED">Решённые</option>
                    </select>
                    <button onClick={fetchDisputes} title="Обновить список" className="p-2 rounded-xl bg-white/5 text-white/60 hover:text-white cursor-pointer border-0">
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {error && <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300">{error}</div>}

            <div className="bg-[#101524]/60 backdrop-blur-xl rounded-3xl border border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/5">
                                <th className="py-4 px-6 text-xs font-semibold text-white/40 uppercase tracking-wider">Суть спора</th>
                                <th className="py-4 px-6 text-xs font-semibold text-white/40 uppercase tracking-wider">Сумма/Товар</th>
                                <th className="py-4 px-6 text-xs font-semibold text-white/40 uppercase tracking-wider">Статус</th>
                                <th className="py-4 px-6 text-right text-xs font-semibold text-white/40 uppercase tracking-wider">Вердикт</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading && disputes.length === 0 ? (
                                <tr><td colSpan={4} className="py-8 text-center text-white/40">Загрузка...</td></tr>
                            ) : disputes.length === 0 ? (
                                <tr><td colSpan={4} className="py-8 text-center text-white/40">Открытых споров нет</td></tr>
                            ) : disputes.map(dispute => (
                                <tr key={dispute.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="py-4 px-6">
                                        <div className="font-medium text-white text-sm mb-1">{dispute.reason}</div>
                                        <div className="flex flex-col gap-1 text-xs">
                                            <div className="text-blue-400 flex items-center gap-1"><User className="w-3 h-3" /> Покупатель: {dispute.transaction?.buyer?.email}</div>
                                            <div className="text-purple-400 flex items-center gap-1"><Store className="w-3 h-3" /> Продавец: {dispute.transaction?.offer?.seller?.email}</div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="text-sm font-bold text-white mb-1">{(dispute.transaction?.price ?? 0).toLocaleString('ru-RU')} сум</div>
                                        <div className="text-xs text-white/40 line-clamp-1">{dispute.transaction?.offer?.title}</div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${dispute.status === 'OPEN' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'
                                            }`}>
                                            {dispute.status === 'OPEN' ? 'Открыт' : `Решён (${dispute.resolution || '—'})`}
                                        </span>
                                        {dispute.adminNote && <div className="text-xs text-white/40 mt-2 max-w-xs">{dispute.adminNote}</div>}
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        {dispute.status === 'OPEN' ? (
                                            <div className="flex flex-col gap-2 items-end">
                                                <button
                                                    onClick={() => resolveDispute(dispute.id, 'BUYER')}
                                                    className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all border border-blue-500/20 cursor-pointer flex items-center gap-1 text-xs font-medium"
                                                >
                                                    <CheckCircle2 className="w-3 h-3" /> В пользу Покупателя
                                                </button>
                                                <button
                                                    onClick={() => resolveDispute(dispute.id, 'SELLER')}
                                                    className="px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-all border border-purple-500/20 cursor-pointer flex items-center gap-1 text-xs font-medium"
                                                >
                                                    <CheckCircle2 className="w-3 h-3" /> В пользу Продавца
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-white/30">Спор решен</span>
                                        )}
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
