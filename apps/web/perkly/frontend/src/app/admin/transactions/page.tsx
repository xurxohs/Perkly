'use client';

import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, RefreshCw, Search, Undo2 } from 'lucide-react';
import api, { Transaction } from '@/lib/api';

export default function AdminTransactions() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');

    const fetchTransactions = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.admin.getTransactions({ search, status });
            setTransactions(res.transactions);
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Не удалось загрузить транзакции');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = window.setTimeout(() => { void fetchTransactions(); }, 250);
        return () => window.clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, status]);

    const handleRefund = async (id: string) => {
        if (!window.confirm('Оформить возврат средств? Деньги вернутся покутателю, товар будет отменен.')) return;
        try {
            await api.admin.refundTransaction(id);
            await fetchTransactions();
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Ошибка при оформлении возврата');
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'PAID':
            case 'COMPLETED':
                return 'bg-green-500/10 text-green-400 border-green-500/20';
            case 'CANCELLED':
            case 'REFUNDED':
                return 'bg-red-500/10 text-red-400 border-red-500/20';
            case 'DISPUTED':
                return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
            default:
                return 'bg-white/5 text-white/40 border-white/10';
        }
    };

    return (
        <div className="space-y-6 animate-fade-in fade-in-up">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Транзакции</h1>
                    <p className="text-white/40">История покупок и возвраты</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Покупатель или товар" className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white" />
                    </div>
                    <select value={status} onChange={(event) => setStatus(event.target.value)} className="bg-[#101524] border border-white/10 rounded-xl px-3 py-2 text-sm text-white">
                        <option value="">Все статусы</option>
                        {['ESCROW', 'DISPUTED', 'PAID', 'COMPLETED', 'REFUNDED', 'CANCELLED'].map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                    <button onClick={fetchTransactions} title="Обновить список" className="p-2 rounded-xl bg-white/5 text-white/60 hover:text-white cursor-pointer border-0">
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
                                <th className="py-4 px-6 text-xs font-semibold text-white/40 uppercase tracking-wider">Участники</th>
                                <th className="py-4 px-6 text-xs font-semibold text-white/40 uppercase tracking-wider">Товар</th>
                                <th className="py-4 px-6 text-xs font-semibold text-white/40 uppercase tracking-wider">Сумма</th>
                                <th className="py-4 px-6 text-xs font-semibold text-white/40 uppercase tracking-wider">Статус</th>
                                <th className="py-4 px-6 text-right text-xs font-semibold text-white/40 uppercase tracking-wider">Действия</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading && transactions.length === 0 ? (
                                <tr><td colSpan={5} className="py-8 text-center text-white/40">Загрузка...</td></tr>
                            ) : transactions.length === 0 ? (
                                <tr><td colSpan={5} className="py-8 text-center text-white/40">Транзакции не найдены</td></tr>
                            ) : transactions.map(tx => (
                                <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="py-4 px-6">
                                        <div className="flex flex-col text-sm">
                                            <span className="text-white">👤 {tx.buyer?.email || 'Неизвестно'}</span>
                                            <ArrowRightLeft className="w-3 h-3 text-white/20 my-1 ml-1" />
                                            <span className="text-white/60">🏪 {tx.offer?.seller?.email || 'Неизвестно'}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="text-sm text-white font-medium">{tx.offer?.title}</div>
                                        <div className="text-xs text-white/30">{new Date(tx.createdAt).toLocaleString()}</div>
                                    </td>
                                    <td className="py-4 px-6 font-mono text-sm text-white font-bold">
                                        {tx.price.toLocaleString('ru-RU')} сум
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${getStatusStyle(tx.status)}`}>
                                            {tx.status}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        {['PAID', 'COMPLETED', 'ESCROW', 'DISPUTED'].includes(tx.status) && (
                                            <button
                                                onClick={() => handleRefund(tx.id)}
                                                title="Оформить возврат"
                                                className="p-2 rounded-xl bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition-all border-0 cursor-pointer inline-flex items-center gap-2 text-xs font-medium"
                                            >
                                                <Undo2 className="w-4 h-4" /> Возврат
                                            </button>
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
