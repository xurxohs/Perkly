'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Crown, ShoppingBag, Settings, LogOut, Edit2, Check, X, AlertTriangle, ClipboardList, Store, Key, Copy, EyeOff, CheckCircle, QrCode, MessageCircle, Ticket, Percent, Bookmark, Trash2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '@/lib/AuthContext';
import { useTelegram } from '@/hooks/useTelegram';
import { usersApi, offersApi, transactionsApi, paymentsApi, authApi, analyticsApi, Transaction, PromocodeActivation, SavedOffer, DailyBonusStatus } from '@/lib/api';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import TopUpModal from '@/components/TopUpModal';
import { PerklyGlyph } from '@/components/PerklyGlyph';

const TIER_COLORS: Record<string, { bgClass: string; textClass: string; borderClass: string; glowClass: string }> = {
    SILVER: { bgClass: 'bg-slate-500/10', textClass: 'text-slate-400', borderClass: 'border-slate-400/30', glowClass: 'bg-[radial-gradient(circle,_rgba(148,163,184,0.2),_transparent_70%)]' },
    GOLD: { bgClass: 'bg-yellow-500/10', textClass: 'text-yellow-500', borderClass: 'border-yellow-500/30', glowClass: 'bg-[radial-gradient(circle,_rgba(234,179,8,0.2),_transparent_70%)]' },
    PLATINUM: { bgClass: 'bg-purple-500/10', textClass: 'text-purple-500', borderClass: 'border-purple-500/30', glowClass: 'bg-[radial-gradient(circle,_rgba(168,85,247,0.2),_transparent_70%)]' },
};

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
        className: 'bg-green-500/10 text-green-400 border-green-500/20',
    },
};

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



export default function ProfilePage() {
    const { user, isAuthenticated, loading, logout, refreshUser } = useAuth();
    const { hapticImpact, hapticNotification } = useTelegram();
    const router = useRouter();

    const [stats, setStats] = useState({ totalSpent: 0, totalPurchases: 0 });
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [activeTab, setActiveTab] = useState<'history' | 'subscriptions' | 'saved' | 'promocodes' | 'settings'>('history');
    const [subscriptions, setSubscriptions] = useState<Transaction[]>([]);
    const [savedOffers, setSavedOffers] = useState<SavedOffer[]>([]);
    const [savedOffersLoading, setSavedOffersLoading] = useState(false);
    const [savedOffersError, setSavedOffersError] = useState<string | null>(null);
    const [promocodeActivations, setPromocodeActivations] = useState<PromocodeActivation[]>([]);
    const [promocodesLoading, setPromocodesLoading] = useState(false);
    const [promocodeError, setPromocodeError] = useState<string | null>(null);
    const [redeemModalOpen, setRedeemModalOpen] = useState(false);
    const [redeemCode, setRedeemCode] = useState('');
    const [redeeming, setRedeeming] = useState(false);
    const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [qrModalData, setQrModalData] = useState<{ title: string; data: string } | null>(null);
    const [topUpModalOpen, setTopUpModalOpen] = useState(false);

    // Telegram binding states
    const [tgStep, setTgStep] = useState<'idle' | 'waiting' | 'done'>('idle');
    const [tgUrl, setTgUrl] = useState('');
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Daily Bonus states
    const [dailyStatus, setDailyStatus] = useState<DailyBonusStatus | null>(null);
    const [claimingDaily, setClaimingDaily] = useState(false);

    // Clean up polling on unmount
    useEffect(() => {
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, []);

    const handleStartChat = async (sellerId?: string) => {
        if (!sellerId) return;
        try {
            await api.post('/chat/rooms', { targetUserId: sellerId });
            router.push('/messages');
        } catch (error) {
            console.error('Failed to start chat:', error);
        }
    };

    const handleClaimDailyBonus = async () => {
        if (claimingDaily || !dailyStatus?.canClaimToday) return;
        setClaimingDaily(true);
        hapticImpact('medium');
        try {
            const res = await usersApi.claimDailyBonus();
            hapticNotification('success');
            alert(res.message);
            await refreshUser();
            const newStatus = await usersApi.getDailyBonusStatus();
            setDailyStatus(newStatus);
        } catch (err: unknown) {
            hapticNotification('error');
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
            transactionsApi.getSubscriptions().then(setSubscriptions).catch(() => { });
            usersApi.getDailyBonusStatus().then(setDailyStatus).catch(() => { });
            setSavedOffersLoading(true);
            usersApi.getSavedOffers()
                .then(setSavedOffers)
                .catch((err) => {
                    console.error('Failed to load saved offers', err);
                    setSavedOffersError('Не удалось загрузить сохранённые офферы.');
                })
                .finally(() => setSavedOffersLoading(false));
            setPromocodesLoading(true);
            api.promocodes.listMyActivations()
                .then(setPromocodeActivations)
                .catch((err) => {
                    console.error('Failed to load promocode activations', err);
                    setPromocodeError('Не удалось загрузить активированные промокоды.');
                })
                .finally(() => setPromocodesLoading(false));
        }
    }, [isAuthenticated]);

    const handleSaveName = async () => {
        try {
            await usersApi.updateProfile({ displayName: editName });
            await refreshUser();
            setEditing(false);
        } catch { }
    };

    const handleRemoveSavedOffer = async (offerId: string) => {
        try {
            await offersApi.unsave(offerId);
            setSavedOffers((current) => current.filter((savedOffer) => savedOffer.offerId !== offerId));
            hapticNotification('success');
        } catch (err) {
            console.error('Failed to remove saved offer', err);
            hapticNotification('error');
            setSavedOffersError('Не удалось удалить оффер из сохранённых.');
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
            const res = await paymentsApi.topUp(amount);
            const deposit = res.deposit;
            const isLocalhost =
                typeof window !== 'undefined' &&
                ['localhost', '127.0.0.1'].includes(window.location.hostname);

            if (isLocalhost) {
                await paymentsApi.mockWebhook(deposit.id, true);
                await refreshUser();
                setTopUpModalOpen(false);
                alert(`Баланс успешно пополнен на ${amount.toLocaleString('ru-RU')} сум!`);
                return;
            }

            window.location.href = res.paymentUrl;
        } catch (err: unknown) {
            console.error(err);
            const error = err as Error;
            throw new Error(error.message || 'Ошибка пополнения баланса');
        }
    };

    const handleConfirmDelivery = async (txId: string) => {
        if (!confirm('Вы подтверждаете получение товара? После этого средства будут переведены продавцу, и вы не сможете открыть спор.')) return;
        try {
            await transactionsApi.confirm(txId);
            setTransactions(prev => prev.map(t => t.id === txId ? { ...t, status: 'COMPLETED' } : t));
            hapticNotification('success');
            alert('Сделка успешно завершена!');
        } catch (err: unknown) {
            hapticNotification('error');
            const error = err as Error;
            alert('Ошибка при подтверждении: ' + (error.message || 'Попробуйте позже'));
        }
    };

    const handleRedeemGift = async () => {
        if (!redeemCode) return;
        setRedeeming(true);
        try {
            await transactionsApi.redeem(redeemCode);
            hapticNotification('success');
            alert('Подарок успешно активирован!');
            setRedeemModalOpen(false);
            setRedeemCode('');
            await refreshUser();
            const res = await transactionsApi.list(0, 50);
            setTransactions(res.data);
            const subs = await transactionsApi.getSubscriptions();
            setSubscriptions(subs);
        } catch (err: unknown) {
            hapticNotification('error');
            const error = err as Error;
            alert(error.message || 'Ошибка активации подарка');
        } finally {
            setRedeeming(false);
        }
    };

    const handleCopyPromocode = async (activation: PromocodeActivation) => {
        if (!activation.codeSnapshot) return;

        try {
            const updated = await api.promocodes.copyActivation(activation.id);
            await navigator.clipboard.writeText(updated.codeSnapshot || activation.codeSnapshot);
            setPromocodeActivations((current) =>
                current.map((item) => item.id === activation.id ? { ...item, ...updated } : item),
            );
            setCopiedId(`promo-${activation.id}`);
            hapticNotification('success');
            analyticsApi.trackEvent({
                eventType: 'promocode_copy',
                metadata: JSON.stringify({ activationId: activation.id, promocodeId: activation.promocodeId }),
            }).catch(() => {});
            setTimeout(() => setCopiedId(null), 2000);
        } catch (err) {
            hapticNotification('error');
            alert(err instanceof Error ? err.message : 'Не удалось скопировать промокод');
        }
    };

    const handleUsePromocode = async (activation: PromocodeActivation) => {
        if (!confirm('Отметить промокод как использованный?')) return;

        try {
            const updated = await api.promocodes.useActivation(activation.id);
            setPromocodeActivations((current) =>
                current.map((item) => item.id === activation.id ? { ...item, ...updated } : item),
            );
            hapticNotification('success');
        } catch (err) {
            hapticNotification('error');
            alert(err instanceof Error ? err.message : 'Не удалось обновить промокод');
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
    const canUseVendorHub = user.role === 'VENDOR' || user.role === 'ADMIN';

    return (
        <>
            <div className="profile-modern max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
                <div className="mb-6 flex items-end justify-between">
                    <div><p className="text-[10px] font-black uppercase tracking-[.22em] text-white/30">Perkly ID</p><h1 className="mt-1 text-3xl font-black tracking-[-.045em] text-white sm:text-4xl">Профиль</h1></div>
                    <span className="profile-brand-mark" aria-hidden="true" />
                </div>
                {/* Profile card */}
                <div className="profile-identity-card rounded-[30px] p-5 sm:p-7 mb-4 relative overflow-hidden border border-white/[0.08]">
                    <div className="profile-identity-orb" />

                    <div className="flex items-start sm:items-center gap-4 sm:gap-5 relative z-10">
                        <div className="profile-avatar w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center shrink-0">
                            <PerklyGlyph name="profile" className="w-8 h-8 sm:w-9 sm:h-9 text-white" />
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

                                {canUseVendorHub ? (
                                    <Link
                                        href="/vendor"
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-white/70 transition-colors hover:text-white group w-fit no-underline bg-white/[0.04] border border-white/[0.07]"
                                    >
                                        <Store className="w-3.5 h-3.5 text-purple-400 group-hover:text-white transition-colors" />
                                        <span className="tracking-wide">Кабинет Продавца</span>
                                    </Link>
                                ) : (
                                    <Link
                                        href="/sell"
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-white/70 transition-colors hover:text-white group w-fit no-underline bg-white/[0.04] border border-white/[0.07]"
                                    >
                                        <Store className="w-3.5 h-3.5 text-emerald-400 group-hover:text-white transition-colors" />
                                        <span className="tracking-wide">Стать партнером</span>
                                    </Link>
                                )}

                                {/* Admin Dashboard Button */}
                                {user.role === 'ADMIN' && (
                                    <Link
                                        href="/admin"
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-white/70 transition-colors group w-fit no-underline bg-white/[0.04] border border-white/[0.07]"
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
                <div className="profile-balance-grid grid grid-cols-2 sm:grid-cols-[1.4fr_1fr_1fr] gap-px mb-4 overflow-hidden rounded-[24px] border border-white/[0.07]">
                    <div className="p-4 sm:p-5">
                        <div className="flex items-center gap-2 text-xs text-white/35 mb-2"><PerklyGlyph name="catalog" className="w-4 h-4" /> Баланс</div>
                        <div className="text-xl sm:text-2xl font-black text-white whitespace-nowrap">{user.balance.toLocaleString('ru-RU')} сум</div>
                        <button
                            onClick={() => setTopUpModalOpen(true)}
                            className="mt-3 bg-white text-black hover:bg-white/90 transition-colors px-4 py-2 rounded-full text-xs font-bold cursor-pointer border-0"
                        >
                            Пополнить
                        </button>
                    </div>
                    <div className="p-4 sm:p-5 flex flex-col justify-center">
                        <div className="flex items-center gap-2 text-xs text-white/35 mb-2"><PerklyGlyph name="catalog" className="w-4 h-4" /> Покупки</div>
                        <div className="text-2xl font-black text-white">{stats.totalPurchases}</div>
                    </div>
                    <div className="col-span-2 sm:col-span-1 p-4 sm:p-5 flex flex-col justify-center">
                        <div className="flex items-center gap-2 text-xs text-white/35 mb-2"><PerklyGlyph name="coupon" className="w-4 h-4" /> Perkly Points</div>
                        <div className="text-2xl font-black text-white">{user.rewardPoints.toLocaleString('ru-RU')}</div>
                    </div>
                </div>

                {/* Referral Section */}
                <div className="profile-referral-card rounded-[24px] p-5 mb-6 border border-white/[0.07] relative overflow-hidden group">
                    <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                        <div className="profile-bare-icon w-9 h-9 flex items-center justify-center shrink-0">
                            <PerklyGlyph name="coupon" className="w-6 h-6 text-white/65" />
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <h3 className="text-lg font-bold text-white mb-1 flex items-center justify-center md:justify-start gap-2">
                                Пригласи друга — получи 500 баллов
                            </h3>
                            <p className="text-white/50 text-sm">
                                Начислим по 500 Perkly Points вам и вашему другу после его регистрации.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <button
                                onClick={() => {
                                    hapticImpact('medium');
                                    setRedeemModalOpen(true);
                                }}
                                className="profile-secondary-button flex-1 md:flex-none flex items-center justify-center px-6 py-3 rounded-xl font-bold border text-white"
                            >
                                Активировать код
                            </button>
                            <button
                                onClick={() => {
                                    const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME || 'PerklyPlatformBot';
                                    const link = `https://t.me/${botUsername}?start=ref_${user?.id}`;
                                    navigator.clipboard.writeText(link);
                                    setCopiedId('ref');
                                    hapticNotification('success');
                                    setTimeout(() => setCopiedId(null), 2000);
                                }}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all bg-white/5 border border-white/10 hover:bg-white/10 text-white"
                            >
                                {copiedId === 'ref' ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                {copiedId === 'ref' ? 'Скопировано' : 'Реф. ссылка'}
                            </button>
                        </div>
                    </div>
                </div>
                {/* Daily Bonus Section */}
                {dailyStatus && (
                    <div className="profile-daily-card w-full p-6 rounded-[24px] mb-4 border border-white/[0.07] relative overflow-hidden">

                        <div className="flex items-center justify-between mb-4 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="profile-bare-icon w-9 h-9 flex items-center justify-center">
                                    <PerklyGlyph name="coupon" className="w-5 h-5 text-white/70" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white leading-tight">Ежедневный бонус</h3>
                                    <span className="text-xs text-white/30">Заходите каждый день для получения наград</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-bold text-white/70">{dailyStatus.currentStreak} {getStreakWord(dailyStatus.currentStreak)} подряд</div>
                                <div className="text-[10px] text-white/30 uppercase tracking-wider">Рекорд {dailyStatus.longestStreak}</div>
                            </div>
                        </div>

                        {/* 7 Days Progress Grid */}
                        <div className="grid grid-cols-7 gap-1.5 mb-5 relative z-10">
                            {dailyStatus.weekProgress.map((day, idx) => (
                                <div
                                    key={day.day || idx}
                                    className={`profile-day flex flex-col items-center justify-between p-2 rounded-xl border text-center ${
                                        day.claimed
                                            ? 'is-claimed'
                                            : !day.claimed && dailyStatus.canClaimToday && idx === 6
                                                ? 'is-today'
                                                : ''
                                    }`}
                                >
                                    <span className="text-[9px] font-bold uppercase tracking-wider mb-1">{day.label}</span>
                                    <div className="profile-day-status text-xs my-0.5">{day.claimed ? '✓' : '•'}</div>
                                    <span className="text-[9px] font-black">{day.reward.points > 0 ? `+${day.reward.points}` : '0'}</span>
                                </div>
                            ))}
                        </div>

                        {/* Claim Action */}
                        <div className="relative z-10">
                            {dailyStatus.canClaimToday ? (
                                <button
                                    onClick={handleClaimDailyBonus}
                                    disabled={claimingDaily}
                                    className="w-full py-3 rounded-xl font-extrabold text-sm transition-colors bg-white hover:bg-white/90 text-black border-0 cursor-pointer flex items-center justify-center"
                                >
                                    {claimingDaily ? 'Получение...' : `Забрать ${dailyStatus.todayReward.points} Points`}
                                </button>
                            ) : (
                                <div className="w-full py-3 rounded-xl font-bold text-xs bg-white/5 border border-white/10 text-white/30 flex items-center justify-center text-center cursor-default">
                                    Бонус забран! Возвращайтесь завтра.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Squad Rewards Button */}
                <Link href="/profile/squad" className="profile-action-row w-full flex items-center justify-between p-5 rounded-[22px] mb-2 group no-underline border relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="profile-action-icon w-9 h-9 flex items-center justify-center">
                            <PerklyGlyph name="profile" className="w-6 h-6 text-white/70" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white mb-0.5">Сквад и награды</h3>
                            <p className="text-sm text-indigo-200/60">Цели с друзьями и Mega Perk (15% кешбэк)</p>
                        </div>
                    </div>
                    <div className="profile-action-chevron w-8 h-8 flex items-center justify-center relative z-10">
                        <svg className="w-5 h-5 text-white/50 group-hover:text-white group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                </Link>

                {/* Pricing/Tariffs Button (Moved from Mobile Dock) */}
                <Link href="/pricing" className="profile-action-row w-full flex items-center justify-between p-5 rounded-[22px] mb-2 group no-underline border">
                    <div className="flex items-center gap-4">
                        <div className="profile-action-icon w-9 h-9 flex items-center justify-center">
                            <PerklyGlyph name="crown" className="w-6 h-6 text-white/70" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white mb-0.5">Тарифы и привилегии</h3>
                            <p className="text-sm text-yellow-200/60">Улучшите свой аккаунт и получайте больше выгоды</p>
                        </div>
                    </div>
                    <div className="profile-action-chevron w-8 h-8 flex items-center justify-center">
                        <svg className="w-5 h-5 text-white/50 group-hover:text-white group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                </Link>

                {/* Messages Button (Moved from Navbar) */}
                <Link href="/messages" className="profile-action-row w-full flex items-center justify-between p-5 rounded-[22px] mb-8 group no-underline border">
                    <div className="flex items-center gap-4">
                        <div className="profile-action-icon w-9 h-9 flex items-center justify-center">
                            <PerklyGlyph name="chat" className="w-6 h-6 text-white/70" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white mb-0.5">Личные сообщения</h3>
                            <p className="text-sm text-purple-200/60">Чаты с продавцами и системные уведомления</p>
                        </div>
                    </div>
                    <div className="profile-action-chevron w-8 h-8 flex items-center justify-center">
                        <svg className="w-5 h-5 text-white/50 group-hover:text-white group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                </Link>

                {/* Tabs */}
                <div className="profile-tabs -mx-4 mb-6 flex gap-1 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-1 sm:py-1">
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 py-3 rounded-lg text-sm font-semibold cursor-pointer border-0 transition-all ${activeTab === 'history' ? 'text-white bg-purple-500/15' : 'text-white/40 bg-transparent'}`}
                    >
                        <span className="flex items-center justify-center gap-1.5"><ClipboardList className="w-4 h-4" /> История</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('subscriptions')}
                        className={`flex-1 py-3 rounded-lg text-sm font-semibold cursor-pointer border-0 transition-all ${activeTab === 'subscriptions' ? 'text-white bg-purple-500/15' : 'text-white/40 bg-transparent'}`}
                    >
                        <span className="flex items-center justify-center gap-1.5"><Key className="w-4 h-4" /> Подписки</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('saved')}
                        className={`flex-1 py-3 rounded-lg text-sm font-semibold cursor-pointer border-0 transition-all ${activeTab === 'saved' ? 'text-white bg-purple-500/15' : 'text-white/40 bg-transparent'}`}
                    >
                        <span className="flex items-center justify-center gap-1.5"><Bookmark className="w-4 h-4" /> Сохранённые</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('promocodes')}
                        className={`flex-1 py-3 rounded-lg text-sm font-semibold cursor-pointer border-0 transition-all ${activeTab === 'promocodes' ? 'text-white bg-purple-500/15' : 'text-white/40 bg-transparent'}`}
                    >
                        <span className="flex items-center justify-center gap-1.5"><Ticket className="w-4 h-4" /> Промокоды</span>
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
                                                        {tx.isGift && <div className="text-[10px] text-pink-400 font-bold uppercase mt-0.5">🎁 Подарок</div>}
                                                    </td>
                                                    <td className="py-3 px-4 text-sm font-semibold text-white">{tx.price.toLocaleString('ru-RU')} сум</td>
                                                    <td className="py-3 px-4">
                                                        <span className={`text-xs font-semibold px-2 py-1 rounded-md ${tx.status === 'COMPLETED' || tx.status === 'PAID' ? 'text-green-400 bg-green-500/10' :
                                                            tx.status === 'ESCROW' ? 'text-blue-400 bg-blue-500/10' :
                                                            tx.status === 'PENDING' ? 'text-yellow-400 bg-yellow-500/10' :
                                                                tx.status === 'DISPUTED' ? 'text-orange-400 bg-orange-500/10' :
                                                                    tx.status === 'CANCELLED' ? 'text-red-400 bg-red-500/10' : 'text-white/50 bg-white/5'
                                                            }`}>
                                                            {tx.status === 'PAID' ? 'Оплачено' : tx.status === 'COMPLETED' ? 'Завершено' :
                                                                tx.status === 'ESCROW' ? 'В Эскроу' :
                                                                tx.status === 'PENDING' ? 'Ожидание' : tx.status === 'DISPUTED' ? 'Спор' : tx.status === 'CANCELLED' ? 'Отменено' : tx.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-xs text-white/30">{new Date(tx.createdAt).toLocaleDateString('ru-RU')}</td>
                                                    <td className="py-3 px-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {tx.status === 'ESCROW' && (
                                                                <button
                                                                    onClick={() => handleConfirmDelivery(tx.id)}
                                                                    className="text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-all cursor-pointer border-0 shadow-lg shadow-green-500/20"
                                                                >
                                                                    <CheckCircle className="w-3.5 h-3.5" /> Подтвердить
                                                                </button>
                                                            )}
                                                            {(tx.status === 'COMPLETED' || tx.status === 'PAID' || tx.status === 'ESCROW') && tx.offer?.hiddenData && !tx.isGift && (
                                                                <button
                                                                    onClick={() => setRevealedKeys(prev => ({ ...prev, [tx.id]: !prev[tx.id] }))}
                                                                    className={`text-xs font-medium flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer border-0 ${revealedKeys[tx.id] ? 'bg-purple-500/15 text-purple-400' : 'bg-blue-500/10 text-blue-400'}`}
                                                                >
                                                                    {revealedKeys[tx.id] ? <EyeOff className="w-3 h-3" /> : <Key className="w-3 h-3" />}
                                                                    {revealedKeys[tx.id] ? 'Скрыть' : offerAccessLabel(tx)}
                                                                </button>
                                                            )}
                                                            {(tx.status === 'COMPLETED' || tx.status === 'PAID' || tx.status === 'ESCROW') && tx.offer?.hiddenData && !tx.isGift && offerUsesQr(tx) && (
                                                                <button
                                                                    onClick={() => setQrModalData({ title: tx.offer?.title || 'Промокод', data: tx.offer?.hiddenData || '' })}
                                                                    className="text-xs font-medium flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer border-0 bg-green-500/10 text-green-500"
                                                                >
                                                                    <QrCode className="w-3.5 h-3.5" /> QR
                                                                </button>
                                                            )}
                                                            {tx.status === 'DISPUTED' ? (
                                                                <Link href={`/profile/transactions/dispute/?id=${tx.id}`} className="text-xs text-orange-400 hover:text-orange-300 font-medium flex items-center gap-1 no-underline">
                                                                    Чат спора
                                                                </Link>
                                                            ) : (tx.status === 'COMPLETED' || tx.status === 'PAID' || tx.status === 'ESCROW') && (
                                                                <>
                                                                    <button onClick={() => handleStartChat(tx.offer?.sellerId)} className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1 bg-transparent border-0 cursor-pointer">
                                                                        <MessageCircle className="w-3.5 h-3.5" /> Написать
                                                                    </button>
                                                                    <button onClick={() => handleOpenDispute(tx.id)} className="text-xs text-gray-400 hover:text-red-400 font-medium flex items-center gap-1 bg-transparent border-0 cursor-pointer">
                                                                        <AlertTriangle className="w-3.5 h-3.5" /> Проблема?
                                                                    </button>
                                                                </>
                                                            )}
                                                            {tx.isGift && tx.giftCode && (
                                                                <button
                                                                    onClick={() => {
                                                                        const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME || 'PerklyPlatformBot';
                                                                        const link = `https://t.me/${botUsername}?start=gift_${tx.giftCode}`;
                                                                        navigator.clipboard.writeText(link);
                                                                        hapticNotification('success');
                                                                        alert('Ссылка на подарок скопирована!');
                                                                    }}
                                                                    className="text-xs font-medium flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer border-0 bg-pink-500/10 text-pink-400"
                                                                >
                                                                    <Copy className="w-3 h-3" /> Ссылка
                                                                </button>
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
                                                    {tx.isGift && <div className="text-[10px] text-pink-400 font-bold uppercase mt-0.5">🎁 Подарок</div>}
                                                </div>
                                                <div className="text-sm font-semibold text-white shrink-0 block">{tx.price.toLocaleString('ru-RU')} сум</div>
                                            </div>
                                            <div className="flex justify-between items-center mb-3">
                                                <span className={`text-xs font-semibold px-2 py-1 rounded-md ${tx.status === 'COMPLETED' || tx.status === 'PAID' ? 'text-green-400 bg-green-500/10' : tx.status === 'ESCROW' ? 'text-blue-400 bg-blue-500/10' : tx.status === 'PENDING' ? 'text-yellow-400 bg-yellow-500/10' : tx.status === 'DISPUTED' ? 'text-orange-400 bg-orange-500/10' : tx.status === 'CANCELLED' ? 'text-red-400 bg-red-500/10' : 'text-white/50 bg-white/5'}`}>
                                                    {tx.status === 'PAID' ? 'Оплачено' : tx.status === 'COMPLETED' ? 'Завершено' : tx.status === 'ESCROW' ? 'В Эскроу' : tx.status === 'PENDING' ? 'Ожидание' : tx.status === 'DISPUTED' ? 'Спор' : tx.status === 'CANCELLED' ? 'Отменено' : tx.status}
                                                </span>
                                                <div className="text-xs text-white/30">{new Date(tx.createdAt).toLocaleDateString('ru-RU')}</div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {tx.status === 'ESCROW' && (
                                                    <button onClick={() => handleConfirmDelivery(tx.id)} className="w-full mb-2 py-3 rounded-xl bg-green-500 text-white font-bold text-sm cursor-pointer border-0 shadow-lg shadow-green-500/20">
                                                        Подтвердить получение
                                                    </button>
                                                )}
                                                {(tx.status === 'COMPLETED' || tx.status === 'PAID' || tx.status === 'ESCROW') && tx.offer?.hiddenData && !tx.isGift && (
                                                    <button onClick={() => setRevealedKeys(prev => ({ ...prev, [tx.id]: !prev[tx.id] }))} className={`text-xs font-medium flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer border-0 ${revealedKeys[tx.id] ? 'bg-purple-500/15 text-purple-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                                        {revealedKeys[tx.id] ? <EyeOff className="w-3 h-3" /> : <Key className="w-3 h-3" />} {revealedKeys[tx.id] ? 'Скрыть' : offerAccessLabel(tx)}
                                                    </button>
                                                )}
                                                {tx.isGift && tx.giftCode && (
                                                    <button
                                                        onClick={() => {
                                                            const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME || 'PerklyPlatformBot';
                                                            const link = `https://t.me/${botUsername}?start=gift_${tx.giftCode}`;
                                                            navigator.clipboard.writeText(link);
                                                            hapticNotification('success');
                                                            alert('Ссылка скопирована!');
                                                        }}
                                                        className="text-xs font-medium flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer border-0 bg-pink-500/10 text-pink-400"
                                                    >
                                                        <Copy className="w-3 h-3" /> Ссылка на подарок
                                                    </button>
                                                )}
                                                {(tx.status === 'COMPLETED' || tx.status === 'PAID' || tx.status === 'ESCROW') && tx.offer?.hiddenData && !tx.isGift && offerUsesQr(tx) && (
                                                    <button onClick={() => setQrModalData({ title: tx.offer?.title || 'Промокод', data: tx.offer?.hiddenData || '' })} className="text-xs font-medium flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer border-0 bg-green-500/10 text-green-500">
                                                        <QrCode className="w-3.5 h-3.5" /> QR
                                                    </button>
                                                )}
                                                {tx.status === 'DISPUTED' ? (
                                                    <Link href={`/profile/transactions/dispute/?id=${tx.id}`} className="text-xs text-orange-400 hover:text-orange-300 font-medium flex items-center gap-1 no-underline">
                                                        Чат спора
                                                    </Link>
                                                ) : (tx.status === 'COMPLETED' || tx.status === 'PAID' || tx.status === 'ESCROW') && (
                                                    <>
                                                        <button onClick={() => handleStartChat(tx.offer?.sellerId)} className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1 bg-transparent border-0 cursor-pointer">
                                                            <MessageCircle className="w-3.5 h-3.5" /> Написать
                                                        </button>
                                                        <button onClick={() => handleOpenDispute(tx.id)} className="text-xs text-gray-400 hover:text-red-400 font-medium flex items-center gap-1 bg-transparent border-0 cursor-pointer">
                                                            <AlertTriangle className="w-3.5 h-3.5" /> Спор
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

                {activeTab === 'subscriptions' && (
                    <div className="space-y-4">
                        {subscriptions.length === 0 ? (
                            <div className="p-12 text-center rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                                <Key className="w-12 h-12 text-white/10 mx-auto mb-3" />
                                <p className="text-white/30 mb-3">У вас пока нет активных подписок</p>
                                <Link href="/catalog" className="text-purple-400 text-sm no-underline">Найти в каталоге →</Link>
                            </div>
                        ) : (
                            subscriptions.map(tx => {
                                const expires = tx.expiresAt ? new Date(tx.expiresAt) : null;
                                const isExpired = expires && expires < new Date();
                                const diffDays = expires ? Math.ceil((expires.getTime() - Date.now()) / (24*60*60*1000)) : 0;

                                return (
                                    <div key={tx.id} className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-purple-500/10 border border-purple-500/20`}>
                                                <Store className="w-6 h-6 text-purple-400" />
                                            </div>
                                            <div>
                                                <h4 className="text-white font-bold mb-0.5">{tx.offer?.title}</h4>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${isExpired ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>
                                                        {isExpired ? 'Истекла' : 'Активна'}
                                                    </span>
                                                    <p className="text-xs text-white/40">
                                                        {isExpired ? `Закончилась ${expires?.toLocaleDateString()}` : `До ${expires?.toLocaleDateString()} (${diffDays} дн.)`}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => router.push(`/offer/?id=${tx.offerId}`)}
                                            className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs font-bold hover:bg-white/10 transition-all no-underline"
                                        >
                                            Продлить
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {activeTab === 'saved' && (
                    <div className="space-y-4">
                        {savedOffersLoading ? (
                            <div className="p-12 text-center rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                                <div className="animate-spin w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
                                <p className="text-white/30">Загружаем сохранённые...</p>
                            </div>
                        ) : savedOffersError ? (
                            <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                                {savedOffersError}
                            </div>
                        ) : savedOffers.length === 0 ? (
                            <div className="p-12 text-center rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                                <Bookmark className="w-12 h-12 text-white/10 mx-auto mb-3" />
                                <p className="text-white/30 mb-3">Сохранённых офферов пока нет</p>
                                <Link href="/catalog" className="text-purple-400 text-sm no-underline">Перейти в каталог →</Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {savedOffers.map((savedOffer) => (
                                    <div key={savedOffer.id} className="rounded-2xl p-5 bg-white/[0.02] border border-white/[0.06]">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="min-w-0">
                                                <p className="text-[10px] text-white/30 uppercase font-semibold mb-1">{savedOffer.offer.category}</p>
                                                <Link href={`/offer/?id=${savedOffer.offerId}`} className="text-white font-bold no-underline hover:text-purple-300 transition-colors line-clamp-2">
                                                    {savedOffer.offer.title}
                                                </Link>
                                                <p className="text-sm text-white/40 mt-2 line-clamp-2">{savedOffer.offer.description}</p>
                                                <div className="flex items-center gap-3 mt-3">
                                                    <span className="text-lg font-extrabold text-gradient-green">
                                                        {savedOffer.offer.price === 0 ? 'Бесплатно' : `${savedOffer.offer.price.toLocaleString('ru-RU')} сум`}
                                                    </span>
                                                    <span className="text-xs text-white/30">
                                                        {new Date(savedOffer.createdAt).toLocaleDateString('ru-RU')}
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveSavedOffer(savedOffer.offerId)}
                                                className="shrink-0 p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/10 cursor-pointer transition-colors"
                                                title="Удалить из сохранённых"
                                                aria-label="Удалить из сохранённых"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'promocodes' && (
                    <div className="space-y-4">
                        {promocodesLoading ? (
                            <div className="p-12 text-center rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                                <div className="animate-spin w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
                                <p className="text-white/30">Загружаем промокоды...</p>
                            </div>
                        ) : promocodeError ? (
                            <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                                {promocodeError}
                            </div>
                        ) : promocodeActivations.length === 0 ? (
                            <div className="p-12 text-center rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                                <Ticket className="w-12 h-12 text-white/10 mx-auto mb-3" />
                                <p className="text-white/30 mb-3">Активированных промокодов пока нет</p>
                                <Link href="/catalog" className="text-purple-400 text-sm no-underline">Перейти в каталог →</Link>
                            </div>
                        ) : (
                            promocodeActivations.map((activation) => {
                                const statusMeta = PROMOCODE_ACTIVATION_META[activation.status] ?? PROMOCODE_ACTIVATION_META.ISSUED;
                                const expiresAt = activation.expiresAt ? new Date(activation.expiresAt) : null;
                                const isExpired = Boolean(expiresAt && expiresAt < new Date());
                                const canUse = activation.status !== 'USED' && !isExpired;
                                const copied = copiedId === `promo-${activation.id}`;

                                return (
                                    <div key={activation.id} className="rounded-2xl p-5 bg-white/[0.02] border border-white/[0.06]">
                                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                            <div className="flex items-start gap-4 min-w-0">
                                                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-purple-500/10 border border-purple-500/20">
                                                    <Ticket className="w-6 h-6 text-purple-400" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                                        <h4 className="text-white font-bold truncate">{activation.promocode?.title ?? 'Промокод'}</h4>
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusMeta.className}`}>
                                                            {isExpired && activation.status !== 'USED' ? 'Истёк' : statusMeta.label}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-white/40 truncate">
                                                        {activation.promocode?.company?.brandName ?? 'Perkly'} · {activation.promocode?.offer?.title ?? 'Любой подходящий оффер'}
                                                    </p>
                                                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-white/35">
                                                        <span className="inline-flex items-center gap-1 text-green-400 font-semibold">
                                                            <Percent className="w-3 h-3" />
                                                            {activation.promocode?.discountValue ?? 0}%
                                                        </span>
                                                        <span>{activation.promocode?.codeType ?? 'CODE'}</span>
                                                        <span>{expiresAt ? `до ${expiresAt.toLocaleDateString('ru-RU')}` : 'без срока'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="md:text-right shrink-0">
                                                <div className="rounded-xl px-4 py-3 bg-black/20 border border-white/5 mb-3 md:min-w-[180px]">
                                                    <p className="text-[10px] text-white/30 uppercase font-bold mb-1">Код</p>
                                                    <code className="block text-sm text-purple-300 font-mono break-all select-all">
                                                        {activation.codeSnapshot ?? 'Будет создан при копировании'}
                                                    </code>
                                                </div>
                                                <div className="flex md:justify-end gap-2">
                                                    <button
                                                        onClick={() => handleCopyPromocode(activation)}
                                                        disabled={!activation.codeSnapshot || activation.status === 'USED' || isExpired}
                                                        className={`px-3 py-2 rounded-lg text-xs font-bold cursor-pointer border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${copied ? 'bg-green-500/15 text-green-400 border-green-500/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20'}`}
                                                    >
                                                        {copied ? 'Скопировано' : 'Копировать'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleUsePromocode(activation)}
                                                        disabled={!canUse}
                                                        className="px-3 py-2 rounded-lg text-xs font-bold cursor-pointer border border-white/10 bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                                    >
                                                        Использован
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
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

            {/* Redeem Gift Modal */}
            {redeemModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-6" onClick={() => setRedeemModalOpen(false)}>
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                    <div
                        className="relative rounded-3xl p-8 flex flex-col items-center gap-6 max-w-sm w-full bg-[#141928]/90 backdrop-blur-[40px] border border-white/10 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="text-center">
                            <Key className="w-10 h-10 text-purple-400 mx-auto mb-3" />
                            <h3 className="text-xl font-bold text-white mb-1">Активация подарка</h3>
                            <p className="text-sm text-white/40">Введите 8-значный код вашего подарка</p>
                        </div>

                        <input
                            value={redeemCode}
                            onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                            placeholder="Например: A1B2C3D4"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-center text-xl font-mono tracking-widest text-white outline-none focus:border-purple-500/50 transition-all uppercase"
                            maxLength={8}
                        />

                        <div className="flex gap-3 w-full">
                            <button
                                onClick={() => setRedeemModalOpen(false)}
                                className="flex-1 py-3 rounded-xl bg-white/5 text-white/60 font-bold border-0 cursor-pointer"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleRedeemGift}
                                disabled={redeeming || redeemCode.length < 4}
                                className="flex-2 py-3 px-6 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold border-0 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                            >
                                {redeeming ? 'Загрузка...' : 'Активировать'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
