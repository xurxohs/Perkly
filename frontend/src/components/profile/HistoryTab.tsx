'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingBag, CheckCircle, EyeOff, Key, QrCode, MessageCircle, AlertTriangle, Copy } from 'lucide-react';
import { Transaction, transactionsApi, analyticsApi } from '@/lib/api';
import api from '@/lib/api';

interface HistoryTabProps {
    transactions: Transaction[];
    setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
    onShowQr: (data: { title: string; data: string }) => void;
    hapticNotification?: (type: 'error' | 'success' | 'warning') => void;
}

export function HistoryTab({
    transactions,
    setTransactions,
    onShowQr,
    hapticNotification,
}: HistoryTabProps) {
    const router = useRouter();
    const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const offerUsesQr = (transaction: Transaction) => {
        if (transaction.isGift) return true;
        const type = transaction.offer?.fulfillmentType ?? 'DIGITAL_CODE';
        return type === 'PROMOCODE' || type === 'DIGITAL_CODE';
    };

    const offerAccessLabel = (transaction: Transaction) => {
        switch (transaction.offer?.fulfillmentType) {
            case 'LINK': return 'Ссылка';
            case 'INSTRUCTIONS': return 'Данные';
            case 'PROMOCODE': return 'Промокод';
            default: return 'Ключ';
        }
    };

    const handleConfirmDelivery = async (txId: string) => {
        if (!confirm('Вы подтверждаете получение товара? Средства будут переведены продавцу.')) return;
        try {
            await transactionsApi.confirm(txId);
            setTransactions(prev => prev.map(t => t.id === txId ? { ...t, status: 'COMPLETED' } : t));
            hapticNotification?.('success');
            alert('Сделка успешно завершена!');
        } catch (err: unknown) {
            hapticNotification?.('error');
            const error = err as Error;
            alert('Ошибка при подтверждении: ' + (error.message || 'Попробуйте позже'));
        }
    };

    const handleStartChat = async (sellerId?: string) => {
        if (!sellerId) return;
        try {
            await api.post('/chat/rooms', { targetUserId: sellerId });
            router.push('/messages');
        } catch (error) {
            console.error('Failed to start chat:', error);
        }
    };

    const handleOpenDispute = async (txId: string) => {
        const reason = prompt('Пожалуйста, опишите причину спора (товар не работает, неверные данные и т.д.):');
        if (!reason) return;

        try {
            await api.post('/disputes', { transactionId: txId, reason });
            alert('Спор успешно открыт!');
            router.push(`/profile/transactions/dispute/?id=${txId}`);
        } catch (err: unknown) {
            const error = err as { response?: { status?: number; data?: { message?: string } }; message?: string };
            if (error.response?.status === 400 && error.response?.data?.message === 'Dispute already exists for this transaction') {
                router.push(`/profile/transactions/dispute/?id=${txId}`);
            } else {
                alert('Ошибка при открытии спора: ' + (error.response?.data?.message || error.message));
            }
        }
    };

    if (transactions.length === 0) {
        return (
            <div className="p-12 text-center rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <ShoppingBag className="w-12 h-12 text-white/10 mx-auto mb-3" />
                <p className="text-white/40 mb-3 font-medium text-sm">У вас пока нет покупок</p>
                <Link href="/catalog" className="text-purple-400 font-bold text-sm no-underline hover:underline">
                    Перейти в каталог →
                </Link>
            </div>
        );
    }

    return (
        <div className="rounded-2xl overflow-hidden border border-white/[0.08] bg-black/40 backdrop-blur-xl">
            {/* Desktop Table View */}
            <table className="hidden md:table w-full">
                <thead>
                    <tr className="bg-white/[0.03] border-b border-white/[0.06]">
                        <th className="text-left text-xs text-white/40 uppercase font-bold py-3.5 px-4">Товар</th>
                        <th className="text-left text-xs text-white/40 uppercase font-bold py-3.5 px-4">Сумма</th>
                        <th className="text-left text-xs text-white/40 uppercase font-bold py-3.5 px-4">Статус</th>
                        <th className="text-left text-xs text-white/40 uppercase font-bold py-3.5 px-4">Дата</th>
                        <th className="text-right text-xs text-white/40 uppercase font-bold py-3.5 px-4">Действия</th>
                    </tr>
                </thead>
                <tbody>
                    {transactions.map((tx) => (
                        <React.Fragment key={tx.id}>
                            <tr className="border-t border-white/5 hover:bg-white/[0.01] transition-colors">
                                <td className="py-3.5 px-4">
                                    <span className="text-sm text-white font-bold block">{tx.offer?.title || 'Товар'}</span>
                                    <div className="text-xs text-white/40">{tx.offer?.category}</div>
                                    {tx.isGift && <div className="text-[10px] text-pink-400 font-bold uppercase mt-0.5">🎁 Подарок</div>}
                                </td>
                                <td className="py-3.5 px-4 text-sm font-extrabold text-white">
                                    {tx.price.toLocaleString('ru-RU')} сум
                                </td>
                                <td className="py-3.5 px-4">
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                                        tx.status === 'COMPLETED' || tx.status === 'PAID'
                                            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                                            : tx.status === 'ESCROW'
                                            ? 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                                            : tx.status === 'PENDING'
                                            ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                                            : tx.status === 'DISPUTED'
                                            ? 'text-orange-400 bg-orange-500/10 border-orange-500/20'
                                            : tx.status === 'CANCELLED'
                                            ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                                            : 'text-white/50 bg-white/5 border-white/10'
                                    }`}>
                                        {tx.status === 'PAID' ? 'Оплачено' : tx.status === 'COMPLETED' ? 'Завершено' :
                                            tx.status === 'ESCROW' ? 'В Эскроу' :
                                            tx.status === 'PENDING' ? 'Ожидание' : tx.status === 'DISPUTED' ? 'Спор' : tx.status === 'CANCELLED' ? 'Отменено' : tx.status}
                                    </span>
                                </td>
                                <td className="py-3.5 px-4 text-xs text-white/40 font-medium">
                                    {new Date(tx.createdAt).toLocaleDateString('ru-RU')}
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                    <div className="flex items-center justify-end gap-2 flex-wrap">
                                        {tx.status === 'ESCROW' && (
                                            <button
                                                onClick={() => handleConfirmDelivery(tx.id)}
                                                className="text-xs font-extrabold flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 text-white hover:bg-emerald-400 transition-all cursor-pointer border-0 shadow-md shadow-emerald-500/20"
                                            >
                                                <CheckCircle className="w-3.5 h-3.5" /> Подтвердить
                                            </button>
                                        )}
                                        {(tx.status === 'COMPLETED' || tx.status === 'PAID' || tx.status === 'ESCROW') && tx.offer?.hiddenData && !tx.isGift && (
                                            <button
                                                onClick={() => setRevealedKeys(prev => ({ ...prev, [tx.id]: !prev[tx.id] }))}
                                                className={`text-xs font-bold flex items-center gap-1 px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                                                    revealedKeys[tx.id]
                                                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                                        : 'bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20'
                                                }`}
                                            >
                                                {revealedKeys[tx.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Key className="w-3.5 h-3.5" />}
                                                {revealedKeys[tx.id] ? 'Скрыть' : offerAccessLabel(tx)}
                                            </button>
                                        )}
                                        {(tx.status === 'COMPLETED' || tx.status === 'PAID' || tx.status === 'ESCROW') && tx.offer?.hiddenData && !tx.isGift && offerUsesQr(tx) && (
                                            <button
                                                onClick={() => onShowQr({ title: tx.offer?.title || 'Промокод', data: tx.offer?.hiddenData || '' })}
                                                className="text-xs font-bold flex items-center gap-1 px-3 py-1.5 rounded-xl border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 transition-all cursor-pointer"
                                            >
                                                <QrCode className="w-3.5 h-3.5" /> QR
                                            </button>
                                        )}
                                        {tx.status === 'DISPUTED' ? (
                                            <Link href={`/profile/transactions/dispute/?id=${tx.id}`} className="text-xs text-orange-400 hover:text-orange-300 font-bold flex items-center gap-1 no-underline bg-orange-500/10 px-3 py-1.5 rounded-xl border border-orange-500/20">
                                                Чат спора
                                            </Link>
                                        ) : (tx.status === 'COMPLETED' || tx.status === 'PAID' || tx.status === 'ESCROW') && (
                                            <>
                                                <button onClick={() => handleStartChat(tx.offer?.sellerId)} className="text-xs text-purple-300 hover:text-purple-200 font-bold flex items-center gap-1 bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-xl cursor-pointer hover:bg-white/10 transition-all">
                                                    <MessageCircle className="w-3.5 h-3.5 text-purple-400" /> Написать
                                                </button>
                                                <button onClick={() => handleOpenDispute(tx.id)} className="text-xs text-white/50 hover:text-rose-400 font-bold flex items-center gap-1 bg-transparent border-0 cursor-pointer p-1">
                                                    <AlertTriangle className="w-3.5 h-3.5" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                            {revealedKeys[tx.id] && tx.offer?.hiddenData && (
                                <tr className="border-t border-purple-500/10 bg-purple-500/[0.02]">
                                    <td colSpan={5} className="px-4 py-3">
                                        <div className="flex items-center gap-3 rounded-xl px-4 py-3 bg-black/40 border border-purple-500/30 shadow-inner">
                                            <Key className="w-4 h-4 text-purple-400 shrink-0" />
                                            <code className="flex-1 text-sm text-purple-200 font-mono break-all select-all">
                                                {tx.offer?.hiddenData}
                                            </code>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(tx.offer?.hiddenData || '');
                                                    setCopiedId(tx.id);
                                                    hapticNotification?.('success');
                                                    setTimeout(() => setCopiedId(null), 2000);
                                                    analyticsApi.trackEvent({ eventType: 'copy_code', metadata: JSON.stringify({ transactionId: tx.id, offerTitle: tx.offer?.title }) }).catch(() => {});
                                                }}
                                                className={`shrink-0 p-2 rounded-lg transition-all cursor-pointer border ${copiedId === tx.id ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-white/5 text-purple-300 border-white/10 hover:bg-white/10'}`}
                                                title="Копировать"
                                            >
                                                {copiedId === tx.id ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>

            {/* Mobile Cards View */}
            <div className="flex flex-col md:hidden divide-y divide-white/5">
                {transactions.map((tx) => (
                    <div key={`mob-${tx.id}`} className="p-4 space-y-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="text-sm text-white font-bold leading-snug break-words">{tx.offer?.title || 'Товар'}</div>
                                <div className="text-xs text-white/40">{tx.offer?.category}</div>
                                {tx.isGift && <div className="text-[10px] text-pink-400 font-bold uppercase mt-0.5">🎁 Подарок</div>}
                            </div>
                            <div className="text-sm font-black text-white shrink-0">
                                {tx.price.toLocaleString('ru-RU')} сум
                            </div>
                        </div>

                        <div className="flex justify-between items-center text-xs">
                            <span className={`font-bold px-2.5 py-1 rounded-lg border ${
                                tx.status === 'COMPLETED' || tx.status === 'PAID'
                                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                                    : tx.status === 'ESCROW'
                                    ? 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                                    : tx.status === 'PENDING'
                                    ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                                    : tx.status === 'DISPUTED'
                                    ? 'text-orange-400 bg-orange-500/10 border-orange-500/20'
                                    : tx.status === 'CANCELLED'
                                    ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                                    : 'text-white/50 bg-white/5 border-white/10'
                            }`}>
                                {tx.status === 'PAID' ? 'Оплачено' : tx.status === 'COMPLETED' ? 'Завершено' :
                                    tx.status === 'ESCROW' ? 'В Эскроу' :
                                    tx.status === 'PENDING' ? 'Ожидание' : tx.status === 'DISPUTED' ? 'Спор' : tx.status === 'CANCELLED' ? 'Отменено' : tx.status}
                            </span>
                            <div className="text-white/40 font-medium">{new Date(tx.createdAt).toLocaleDateString('ru-RU')}</div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap pt-1">
                            {tx.status === 'ESCROW' && (
                                <button onClick={() => handleConfirmDelivery(tx.id)} className="w-full py-2.5 rounded-xl bg-emerald-500 text-white font-extrabold text-xs cursor-pointer border-0 shadow-md">
                                    Подтвердить получение
                                </button>
                            )}
                            {(tx.status === 'COMPLETED' || tx.status === 'PAID' || tx.status === 'ESCROW') && tx.offer?.hiddenData && !tx.isGift && (
                                <button onClick={() => setRevealedKeys(prev => ({ ...prev, [tx.id]: !prev[tx.id] }))} className={`text-xs font-bold flex items-center gap-1 px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${revealedKeys[tx.id] ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-purple-500/10 text-purple-400 border-purple-500/20'}`}>
                                    {revealedKeys[tx.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Key className="w-3.5 h-3.5" />} {revealedKeys[tx.id] ? 'Скрыть' : offerAccessLabel(tx)}
                                </button>
                            )}
                            {(tx.status === 'COMPLETED' || tx.status === 'PAID' || tx.status === 'ESCROW') && tx.offer?.hiddenData && !tx.isGift && offerUsesQr(tx) && (
                                <button onClick={() => onShowQr({ title: tx.offer?.title || 'Промокод', data: tx.offer?.hiddenData || '' })} className="text-xs font-bold flex items-center gap-1 px-3 py-1.5 rounded-xl border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 cursor-pointer">
                                    <QrCode className="w-3.5 h-3.5" /> QR
                                </button>
                            )}
                            {tx.status === 'DISPUTED' ? (
                                <Link href={`/profile/transactions/dispute/?id=${tx.id}`} className="text-xs text-orange-400 font-bold flex items-center gap-1 no-underline bg-orange-500/10 px-3 py-1.5 rounded-xl border border-orange-500/20">
                                    Чат спора
                                </Link>
                            ) : (tx.status === 'COMPLETED' || tx.status === 'PAID' || tx.status === 'ESCROW') && (
                                <>
                                    <button onClick={() => handleStartChat(tx.offer?.sellerId)} className="text-xs text-purple-300 font-bold flex items-center gap-1 bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-xl cursor-pointer">
                                        <MessageCircle className="w-3.5 h-3.5 text-purple-400" /> Написать
                                    </button>
                                    <button onClick={() => handleOpenDispute(tx.id)} className="text-xs text-white/50 font-bold flex items-center gap-1 bg-transparent border-0 cursor-pointer p-1">
                                        <AlertTriangle className="w-3.5 h-3.5" /> Спор
                                    </button>
                                </>
                            )}
                        </div>

                        {revealedKeys[tx.id] && tx.offer?.hiddenData && (
                            <div className="mt-2 flex items-center gap-3 rounded-xl p-3 bg-black/50 border border-purple-500/30">
                                <Key className="w-4 h-4 text-purple-400 shrink-0" />
                                <code className="flex-1 text-xs text-purple-200 font-mono break-all select-all">{tx.offer?.hiddenData}</code>
                                <button onClick={() => { navigator.clipboard.writeText(tx.offer?.hiddenData || ''); setCopiedId(tx.id); hapticNotification?.('success'); setTimeout(() => setCopiedId(null), 2000); }} className={`p-2 rounded-lg border ${copiedId === tx.id ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-white/5 text-purple-300 border-white/10'}`}>
                                    {copiedId === tx.id ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
