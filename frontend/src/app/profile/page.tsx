'use client';

import React, { useState, useEffect, useRef } from 'react';
import { User as UserIcon, Crown, Coins, ShoppingBag, Settings, LogOut, Edit2, Check, X, AlertTriangle, ClipboardList, Store, Key, Copy, EyeOff, CheckCircle, QrCode, MessageCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '@/lib/AuthContext';
import { usersApi, transactionsApi, paymentsApi, authApi, analyticsApi, Transaction } from '@/lib/api';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import TopUpModal from '@/components/TopUpModal';

const TIER_COLORS: Record<string, { bgClass: string; textClass: string; borderClass: string; glowClass: string }> = {
    SILVER: { bgClass: 'bg-slate-500/10', textClass: 'text-slate-400', borderClass: 'border-slate-400/30', glowClass: 'bg-[radial-gradient(circle,_rgba(148,163,184,0.2),_transparent_70%)]' },
    GOLD: { bgClass: 'bg-yellow-500/10', textClass: 'text-yellow-500', borderClass: 'border-yellow-500/30', glowClass: 'bg-[radial-gradient(circle,_rgba(234,179,8,0.2),_transparent_70%)]' },
    PLATINUM: { bgClass: 'bg-purple-500/10', textClass: 'text-purple-500', borderClass: 'border-purple-500/30', glowClass: 'bg-[radial-gradient(circle,_rgba(168,85,247,0.2),_transparent_70%)]' },
};



export default function ProfilePage() {
    const { user, isAuthenticated, loading, logout, refreshUser } = useAuth();
    const router = useRouter();

    const [stats, setStats] = useState({ totalSpent: 0, totalPurchases: 0 });
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [activeTab, setActiveTab] = useState<'history' | 'settings'>('history');
    const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [qrModalData, setQrModalData] = useState<{ title: string; data: string } | null>(null);
    const [topUpModalOpen, setTopUpModalOpen] = useState(false);

    // Telegram binding states
    const [tgStep, setTgStep] = useState<'idle' | 'waiting' | 'done'>('idle');
    const [tgUrl, setTgUrl] = useState('');
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Clean up polling on unmount
    useEffect(() => {
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, []);

    const handleStartChat = async (sellerId?: string) => {
        if (!sellerId) return;
        try {
            await api.post('/chat/rooms', { sellerId });
            router.push('/messages');
        } catch (error) {
            console.error('Failed to start chat:', error);
        }
    };

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push('/login');
        }
    }, [loading, isAuthenticated, router]);

    useEffect(() => {
        if (isAuthenticated) {
            usersApi.getStats().then(setStats).catch(() => { });
            transactionsApi.list(0, 50).then(res => {
                setTransactions(res.data);
            }).catch(() => { });
        }
    }, [isAuthenticated]);

    const handleSaveName = async () => {
        try {
            await usersApi.updateProfile({ displayName: editName });
            await refreshUser();
            setEditing(false);
        } catch { }
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
            // If dispute already exists, just redirect to it
            if (error.response?.status === 400 && error.response?.data?.message === 'Dispute already exists for this transaction') {
                router.push(`/profile/transactions/dispute/?id=${txId}`);
            } else {
                alert('Ошибка при открытии спора: ' + (error.response?.data?.message || error.message));
            }
        }
    };

    const handleTopUp = async (amount: number) => {
        try {
            const res = await paymentsApi.topUp(amount) as { deposit: { id: string } };
            const deposit = res.deposit;
            await paymentsApi.mockWebhook(deposit.id, true);
            await refreshUser();
            setTopUpModalOpen(false);
            alert(`Баланс успешно пополнен на $${amount}!`);
        } catch (err: unknown) {
            console.error(err);
            const error = err as Error;
            throw new Error(error.message || 'Ошибка пополнения баланса');
        }
    };

    const handleBindTelegram = async () => {
        setTgStep('waiting');
        try {
            const { token, url } = await authApi.telegramInit();
            setTgUrl(url);
            window.open(url, '_blank');

            pollRef.current = setInterval(async () => {
                try {
                    const pollData = await authApi.telegramPoll(token);
                    if (pollData.status === 'ok' && pollData.access_token) {
                        clearInterval(pollRef.current!);
                        localStorage.setItem('perkly_token', pollData.access_token);
                        setTgStep('done');
                        await refreshUser();
                        alert('✅ Telegram успешно привязан!');
                    } else if (pollData.status === 'expired') {
                        clearInterval(pollRef.current!);
                        setTgStep('idle');
                        alert('Время ожидания вышло. Попробуйте снова.');
                    } else if (pollData.status === 'error') {
                        clearInterval(pollRef.current!);
                        setTgStep('idle');
                        alert('Ошибка привязки: ' + (pollData.user?.message || 'Telegram уже привязан к другому аккаунту!'));
                    }
                } catch { /* keep polling */ }
            }, 2000);
        } catch {
            setTgStep('idle');
            alert('Не удалось подключиться. Проверьте соединение.');
        }
    };

    const cancelTgBind = () => {
        if (pollRef.current) clearInterval(pollRef.current);
        setTgStep('idle');
        setTgUrl('');
    };

    if (loading || !user) {
        return (
            <div className="max-w-4xl mx-auto px-6 py-12">
                <div className="h-40 rounded-2xl animate-pulse mb-8 bg-white/[0.03]" />
            </div>
        );
    }

    const tier = TIER_COLORS[user.tier] || TIER_COLORS.SILVER;

    return (
        <>
            <div className="max-w-4xl mx-auto px-6 py-8">
                {/* Profile card */}
                <div className="rounded-2xl p-8 mb-8 relative overflow-hidden bg-white/[0.02] border border-white/[0.06]">
                    <div className={`absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none translate-x-[30%] -translate-y-[30%] ${tier.glowClass}`} />

                    <div className="flex items-center gap-6 relative z-10">
                        <div className="w-20 h-20 rounded-2xl flex items-center justify-center shrink-0 bg-gradient-to-br from-purple-500 to-pink-500 shadow-[0_0_30px_rgba(168,85,247,0.3)]">
                            <UserIcon className="w-10 h-10 text-white" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                                {editing ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="px-3 py-1 rounded-lg text-white text-lg font-bold outline-none bg-white/5 border border-white/[0.15]"
                                            aria-label="Имя пользователя"
                                            placeholder="Имя пользователя"
                                        />
                                        <button aria-label="Сохранить" title="Сохранить" onClick={handleSaveName} className="p-1 cursor-pointer bg-transparent border-0"><Check className="w-4 h-4 text-green-400" /></button>
                                        <button aria-label="Отменить" title="Отменить" onClick={() => setEditing(false)} className="p-1 cursor-pointer bg-transparent border-0"><X className="w-4 h-4 text-red-400" /></button>
                                    </div>
                                ) : (
                                    <>
                                        <h1 className="text-2xl font-extrabold text-white">{user.displayName || 'Пользователь'}</h1>
                                        <button aria-label="Редактировать профиль" title="Редактировать профиль" onClick={() => { setEditing(true); setEditName(user.displayName || ''); }} className="p-1 cursor-pointer bg-transparent border-0">
                                            <Edit2 className="w-4 h-4 text-white/30" />
                                        </button>
                                    </>
                                )}
                            </div>
                            <p className="text-white/40 text-sm mb-3">{user.email}</p>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                <span className={`px-3 py-1 rounded-lg text-xs font-bold w-fit border ${tier.bgClass} ${tier.textClass} ${tier.borderClass}`}>
                                    <Crown className="w-3 h-3 inline mr-1" />{user.tier}
                                </span>

                                {/* Vendor Dashboard Button */}
                                <Link
                                    href="/vendor"
                                    className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:scale-105 group w-fit no-underline bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 shadow-[0_4px_15px_rgba(0,0,0,0.2),inset_0_0_10px_rgba(168,85,247,0.1)]"
                                >
                                    <Store className="w-3.5 h-3.5 text-purple-400 group-hover:text-white transition-colors" />
                                    <span className="tracking-wide">Кабинет Продавца</span>
                                </Link>

                                {/* Admin Dashboard Button */}
                                {user.role === 'ADMIN' && (
                                    <Link
                                        href="/admin"
                                        className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:scale-105 group w-fit no-underline bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 shadow-[0_4px_15px_rgba(0,0,0,0.2),inset_0_0_10px_rgba(239,68,68,0.1)]"
                                    >
                                        <span className="text-red-400 group-hover:text-white transition-colors">🛡️</span>
                                        <span className="tracking-wide">Панель Администратора</span>
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="rounded-xl p-5 text-center flex flex-col items-center justify-center relative group bg-white/[0.02] border border-white/[0.06]">
                        <Coins className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                        <div className="text-2xl font-extrabold text-white">{user.balance.toFixed(2)}$</div>
                        <div className="text-xs text-white/30 mt-1 mb-3">Баланс</div>
                        <button
                            onClick={() => setTopUpModalOpen(true)}
                            className="bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white transition-all w-full py-2 rounded-lg text-sm font-bold cursor-pointer border border-blue-500/30"
                        >
                            Пополнить
                        </button>
                    </div>
                    <div className="rounded-xl p-5 text-center flex flex-col items-center justify-center bg-white/[0.02] border border-white/[0.06]">
                        <ShoppingBag className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                        <div className="text-2xl font-extrabold text-white">{stats.totalPurchases}</div>
                        <div className="text-xs text-white/30 mt-1">Покупок</div>
                    </div>
                    <div className="rounded-xl p-5 text-center bg-white/[0.02] border border-white/[0.06]">
                        <Crown className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                        <div className="text-2xl font-extrabold text-white">{user.rewardPoints}</div>
                        <div className="text-xs text-white/30 mt-1">Perkly Points</div>
                    </div>
                </div>

                {/* Messages Button (Moved from Navbar) */}
                <Link href="/messages" className="w-full flex items-center justify-between p-5 rounded-2xl mb-8 group no-underline transition-all hover:scale-[1.01] bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                            <MessageCircle className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white mb-0.5">Личные сообщения</h3>
                            <p className="text-sm text-purple-200/60">Чаты с продавцами и системные уведомления</p>
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                        <svg className="w-5 h-5 text-white/50 group-hover:text-white group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                </Link>

                {/* Tabs */}
                <div className="flex gap-1 mb-6 p-1 rounded-xl bg-white/[0.02]">
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 py-3 rounded-lg text-sm font-semibold cursor-pointer border-0 transition-all ${activeTab === 'history' ? 'text-white bg-purple-500/15' : 'text-white/40 bg-transparent'}`}
                    >
                        <span className="flex items-center justify-center gap-1.5"><ClipboardList className="w-4 h-4" /> История покупок</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`flex-1 py-3 rounded-lg text-sm font-semibold cursor-pointer border-0 transition-all ${activeTab === 'settings' ? 'text-white bg-purple-500/15' : 'text-white/40 bg-transparent'}`}
                    >
                        <span className="flex items-center justify-center gap-1.5"><Settings className="w-4 h-4" /> Настройки</span>
                    </button>
                </div>

                {/* Tab content */}
                {activeTab === 'history' && (
                    <div className="rounded-2xl overflow-hidden border border-white/[0.06]">
                        {transactions.length === 0 ? (
                            <div className="p-12 text-center">
                                <ShoppingBag className="w-12 h-12 text-white/10 mx-auto mb-3" />
                                <p className="text-white/30 mb-3">Покупок пока нет</p>
                                <Link href="/catalog" className="text-purple-400 text-sm no-underline">Перейти в каталог →</Link>
                            </div>
                        ) : (
                            <>
                                <table className="hidden md:table w-full">
                                    <thead>
                                        <tr className="bg-white/[0.03]">
                                            <th className="text-left text-xs text-white/30 uppercase font-semibold py-3 px-4">Товар</th>
                                            <th className="text-left text-xs text-white/30 uppercase font-semibold py-3 px-4">Сумма</th>
                                            <th className="text-left text-xs text-white/30 uppercase font-semibold py-3 px-4">Статус</th>
                                            <th className="text-left text-xs text-white/30 uppercase font-semibold py-3 px-4">Дата</th>
                                            <th className="text-right text-xs text-white/30 uppercase font-semibold py-3 px-4">Действия</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transactions.map((tx) => (
                                            <React.Fragment key={tx.id}>
                                                <tr className="border-t border-white/5 group">
                                                    <td className="py-3 px-4">
                                                        <span className="text-sm text-white font-medium">{tx.offer?.title || 'Товар'}</span>
                                                        <div className="text-xs text-white/30">{tx.offer?.category}</div>
                                                    </td>
                                                    <td className="py-3 px-4 text-sm font-semibold text-white">{tx.price.toFixed(2)}$</td>
                                                    <td className="py-3 px-4">
                                                        <span className={`text-xs font-semibold px-2 py-1 rounded-md ${tx.status === 'COMPLETED' || tx.status === 'PAID' ? 'text-green-400 bg-green-500/10' :
                                                            tx.status === 'PENDING' ? 'text-yellow-400 bg-yellow-500/10' :
                                                                tx.status === 'DISPUTED' ? 'text-orange-400 bg-orange-500/10' :
                                                                    tx.status === 'CANCELLED' ? 'text-red-400 bg-red-500/10' : 'text-white/50 bg-white/5'
                                                            }`}>
                                                            {tx.status === 'PAID' ? 'Оплачено' : tx.status === 'COMPLETED' ? 'Завершено' :
                                                                tx.status === 'PENDING' ? 'Ожидание' : tx.status === 'DISPUTED' ? 'Спор' : tx.status === 'CANCELLED' ? 'Отменено' : tx.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-xs text-white/30">{new Date(tx.createdAt).toLocaleDateString('ru-RU')}</td>
                                                    <td className="py-3 px-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {(tx.status === 'COMPLETED' || tx.status === 'PAID') && tx.offer?.hiddenData && (
                                                                <button
                                                                    onClick={() => setRevealedKeys(prev => ({ ...prev, [tx.id]: !prev[tx.id] }))}
                                                                    className={`text-xs font-medium flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer border-0 ${revealedKeys[tx.id] ? 'bg-purple-500/15 text-purple-400' : 'bg-blue-500/10 text-blue-400'}`}
                                                                >
                                                                    {revealedKeys[tx.id] ? <EyeOff className="w-3 h-3" /> : <Key className="w-3 h-3" />}
                                                                    {revealedKeys[tx.id] ? 'Скрыть' : 'Ключ'}
                                                                </button>
                                                            )}
                                                            {(tx.status === 'COMPLETED' || tx.status === 'PAID') && tx.offer?.hiddenData && (
                                                                <button
                                                                    onClick={() => setQrModalData({ title: tx.offer?.title || 'Промокод', data: tx.offer?.hiddenData || '' })}
                                                                    className="text-xs font-medium flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer border-0 bg-green-500/10 text-green-500"
                                                                >
                                                                    <QrCode className="w-3 h-3" /> QR
                                                                </button>
                                                            )}
                                                            {tx.status === 'DISPUTED' ? (
                                                                <Link href={`/profile/transactions/dispute/?id=${tx.id}`} className="text-xs text-orange-400 hover:text-orange-300 font-medium flex items-center gap-1 no-underline">
                                                                    Чат спора
                                                                </Link>
                                                            ) : (tx.status === 'COMPLETED' || tx.status === 'PAID') && (
                                                                <>
                                                                    <button onClick={() => handleStartChat(tx.offer?.sellerId)} className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1 bg-transparent border-0 cursor-pointer">
                                                                        <MessageCircle className="w-3 h-3" /> Написать
                                                                    </button>
                                                                    <button onClick={() => handleOpenDispute(tx.id)} className="text-xs text-gray-400 hover:text-red-400 font-medium flex items-center gap-1 bg-transparent border-0 cursor-pointer">
                                                                        <AlertTriangle className="w-3 h-3" /> Проблема?
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                                {revealedKeys[tx.id] && tx.offer?.hiddenData && (
                                                    <tr className="border-t border-purple-500/10">
                                                        <td colSpan={5} className="px-4 py-3">
                                                            <div className="flex items-center gap-3 rounded-xl px-4 py-3 bg-purple-500/5 border border-purple-500/15 shadow-[inset_0_0_20px_rgba(168,85,247,0.05)]">
                                                                <Key className="w-4 h-4 text-purple-400 shrink-0" />
                                                                <code className="flex-1 text-sm text-purple-300 font-mono break-all select-all">
                                                                    {tx.offer?.hiddenData}
                                                                </code>
                                                                <button
                                                                    onClick={() => {
                                                                        navigator.clipboard.writeText(tx.offer?.hiddenData || '');
                                                                        setCopiedId(tx.id);
                                                                        setTimeout(() => setCopiedId(null), 2000);
                                                                        analyticsApi.trackEvent({ eventType: 'copy_code', metadata: JSON.stringify({ transactionId: tx.id, offerTitle: tx.offer?.title }) }).catch(() => {});
                                                                    }}
                                                                    className={`shrink-0 p-2 rounded-lg transition-all cursor-pointer border-0 ${copiedId === tx.id ? 'bg-green-500/15 text-green-500' : 'bg-white/5 text-purple-400'}`}
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

                                {/* Мобильные карточки */}
                                <div className="flex flex-col md:hidden">
                                     {transactions.map((tx) => (
                                         <div key={`mob-${tx.id}`} className="p-4 border-b border-white/5 last:border-0">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="pr-2 text-wrap">
                                                    <div className="text-sm text-white font-medium leading-tight mb-1 break-words">{tx.offer?.title || 'Товар'}</div>
                                                    <div className="text-xs text-white/30">{tx.offer?.category}</div>
                                                </div>
                                                <div className="text-sm font-semibold text-white shrink-0 block">{tx.price.toFixed(2)}$</div>
                                            </div>
                                            <div className="flex justify-between items-center mb-3">
                                                <span className={`text-xs font-semibold px-2 py-1 rounded-md ${tx.status === 'COMPLETED' || tx.status === 'PAID' ? 'text-green-400 bg-green-500/10' : tx.status === 'PENDING' ? 'text-yellow-400 bg-yellow-500/10' : tx.status === 'DISPUTED' ? 'text-orange-400 bg-orange-500/10' : tx.status === 'CANCELLED' ? 'text-red-400 bg-red-500/10' : 'text-white/50 bg-white/5'}`}>
                                                    {tx.status === 'PAID' ? 'Оплачено' : tx.status === 'COMPLETED' ? 'Завершено' : tx.status === 'PENDING' ? 'Ожидание' : tx.status === 'DISPUTED' ? 'Спор' : tx.status === 'CANCELLED' ? 'Отменено' : tx.status}
                                                </span>
                                                <div className="text-xs text-white/30">{new Date(tx.createdAt).toLocaleDateString('ru-RU')}</div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {(tx.status === 'COMPLETED' || tx.status === 'PAID') && tx.offer?.hiddenData && (
                                                    <button onClick={() => setRevealedKeys(prev => ({ ...prev, [tx.id]: !prev[tx.id] }))} className={`text-xs font-medium flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer border-0 ${revealedKeys[tx.id] ? 'bg-purple-500/15 text-purple-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                                        {revealedKeys[tx.id] ? <EyeOff className="w-3 h-3" /> : <Key className="w-3 h-3" />} {revealedKeys[tx.id] ? 'Скрыть' : 'Ключ'}
                                                    </button>
                                                )}
                                                {(tx.status === 'COMPLETED' || tx.status === 'PAID') && tx.offer?.hiddenData && (
                                                    <button onClick={() => setQrModalData({ title: tx.offer?.title || 'Промокод', data: tx.offer?.hiddenData || '' })} className="text-xs font-medium flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer border-0 bg-green-500/10 text-green-500">
                                                        <QrCode className="w-3 h-3" /> QR
                                                    </button>
                                                )}
                                                {tx.status === 'DISPUTED' ? (
                                                    <Link href={`/profile/transactions/dispute/?id=${tx.id}`} className="text-xs text-orange-400 hover:text-orange-300 font-medium flex items-center gap-1 no-underline">
                                                        Чат спора
                                                    </Link>
                                                ) : (tx.status === 'COMPLETED' || tx.status === 'PAID') && (
                                                    <>
                                                        <button onClick={() => handleStartChat(tx.offer?.sellerId)} className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1 bg-transparent border-0 cursor-pointer">
                                                            <MessageCircle className="w-3 h-3" /> Написать
                                                        </button>
                                                        <button onClick={() => handleOpenDispute(tx.id)} className="text-xs text-gray-400 hover:text-red-400 font-medium flex items-center gap-1 bg-transparent border-0 cursor-pointer">
                                                            <AlertTriangle className="w-3 h-3" /> Спор
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                            {revealedKeys[tx.id] && tx.offer?.hiddenData && (
                                                <div className="mt-3 flex items-center gap-3 rounded-xl px-4 py-3 bg-purple-500/5 border border-purple-500/15 shadow-[inset_0_0_20px_rgba(168,85,247,0.05)] overflow-hidden">
                                                    <Key className="w-4 h-4 text-purple-400 shrink-0" />
                                                    <code className="flex-1 text-sm text-purple-300 font-mono break-all select-all">{tx.offer?.hiddenData}</code>
                                                    <button onClick={() => { navigator.clipboard.writeText(tx.offer?.hiddenData || ''); setCopiedId(tx.id); setTimeout(() => setCopiedId(null), 2000); analyticsApi.trackEvent({ eventType: 'copy_code', metadata: JSON.stringify({ transactionId: tx.id, offerTitle: tx.offer?.title }) }).catch(() => {}); }} className={`shrink-0 p-2 rounded-lg transition-all cursor-pointer border-0 ${copiedId === tx.id ? 'bg-green-500/15 text-green-500' : 'bg-white/5 text-purple-400'}`} title="Копировать">
                                                        {copiedId === tx.id ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            )}
                                         </div>
                                     ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="rounded-2xl p-6 bg-white/[0.02] border border-white/[0.06]">
                        <div className="mb-6">
                            <label className="text-sm text-white/50 mb-2 block">Email</label>
                            <div className="px-4 py-3 rounded-xl text-white/60 text-sm bg-white/[0.03]">
                                {user.email}
                            </div>
                        </div>
                        <div className="mb-6">
                            <label className="text-sm text-white/50 mb-2 block">Тариф</label>
                            <div className={`px-4 py-3 rounded-xl text-sm font-semibold ${tier.bgClass} ${tier.textClass}`}>
                                {user.tier} — {user.tier === 'SILVER' ? 'Базовый доступ' : user.tier === 'GOLD' ? 'Расширенный доступ' : 'Полный доступ'}
                            </div>
                        </div>

                        <div className="mb-10">
                            <label className="text-sm text-white/50 mb-2 block">Связанные аккаунты</label>
                            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-[#0088cc]/20 flex items-center justify-center border border-[#0088cc]/30">
                                            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#0088cc]">
                                                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.869 4.326-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.829.941z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-white font-medium mb-0.5">Telegram Бот Perkly</p>
                                            <p className="text-xs text-white/40">Для авто-выдачи и уведомлений</p>
                                        </div>
                                    </div>

                                    {user.telegramId ? (
                                        <span className="text-sm font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                                            Привязан
                                        </span>
                                    ) : tgStep === 'idle' ? (
                                        <button
                                            onClick={handleBindTelegram}
                                            className="px-4 py-2 rounded-lg text-sm font-bold border-0 cursor-pointer text-white bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 transition-all"
                                        >
                                            Привязать
                                        </button>
                                    ) : tgStep === 'waiting' ? (
                                        <div className="text-center">
                                            <a href={tgUrl} target="_blank" rel="noreferrer" className="text-blue-400 no-underline text-sm block mb-1">Открыть бота</a>
                                            <button onClick={cancelTgBind} className="text-xs text-white/30 border-0 bg-transparent cursor-pointer">Отменить</button>
                                        </div>
                                    ) : (
                                        <span className="text-sm font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                                            Готово
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => { logout(); router.push('/'); }}
                            className="flex items-center gap-2 px-4 py-3 rounded-xl text-red-400 text-sm cursor-pointer bg-transparent transition hover:bg-red-400/5 border border-red-500/[0.15]"
                        >
                            <LogOut className="w-4 h-4" /> Выйти из аккаунта
                        </button>
                    </div>
                )}
            </div>

            {/* QR Code Modal */}
            {
                qrModalData && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" onClick={() => setQrModalData(null)}>
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                        <div
                            className="relative rounded-3xl p-8 flex flex-col items-center gap-6 max-w-sm w-full bg-[#141928]/90 backdrop-blur-[40px] border border-white/10 shadow-[0_25px_50px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.1)]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                aria-label="Закрыть"
                                title="Закрыть"
                                onClick={() => setQrModalData(null)}
                                className="absolute top-4 right-4 p-1 rounded-lg bg-white/5 border-0 cursor-pointer text-white/40 hover:text-white hover:bg-white/10 transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="text-center">
                                <QrCode className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                                <h3 className="text-lg font-bold text-white mb-1">{qrModalData.title}</h3>
                                <p className="text-xs text-white/40">Покажите этот QR-код кассиру</p>
                            </div>

                            <div className="p-5 rounded-2xl bg-white">
                                <QRCodeSVG
                                    value={qrModalData.data}
                                    size={220}
                                    level="H"
                                    includeMargin={false}
                                    fgColor="#0a0f1c"
                                    bgColor="#ffffff"
                                />
                            </div>

                            <div className="w-full rounded-xl px-4 py-3 text-center bg-white/[0.05] border border-white/[0.08]">
                                <code className="text-sm text-purple-300 font-mono break-all select-all">{qrModalData.data}</code>
                            </div>

                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(qrModalData.data);
                                    setCopiedId('qr-modal');
                                    setTimeout(() => setCopiedId(null), 2000);
                                    analyticsApi.trackEvent({ eventType: 'copy_code', metadata: JSON.stringify({ source: 'qr_modal' }) }).catch(() => {});
                                }}
                                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium cursor-pointer transition-all ${copiedId === 'qr-modal' ? 'bg-green-500/15 text-green-500 border border-green-500/30' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'}`}
                            >
                                {copiedId === 'qr-modal' ? <><CheckCircle className="w-4 h-4" /> Скопировано!</> : <><Copy className="w-4 h-4" /> Копировать код</>}
                            </button>
                        </div>
                    </div>
                )
            }

            {/* Top Up Modal */}
            <TopUpModal
                isOpen={topUpModalOpen}
                onClose={() => setTopUpModalOpen(false)}
                onTopUp={handleTopUp}
            />
        </>
    );
}
