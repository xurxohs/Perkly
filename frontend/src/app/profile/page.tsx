'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    ClipboardList,
    Key,
    Bookmark,
    Ticket,
    Settings,
    X,
    QrCode,
    Copy,
    CheckCircle,
    Loader2,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '@/lib/AuthContext';
import { useTelegram } from '@/hooks/useTelegram';
import {
    usersApi,
    transactionsApi,
    paymentsApi,
    offersApi,
    Transaction,
    PromocodeActivation,
    SavedOffer,
    DailyBonusStatus,
    analyticsApi,
} from '@/lib/api';
import api from '@/lib/api';

import TopUpModal from '@/components/TopUpModal';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileStats } from '@/components/profile/ProfileStats';
import { ProfileDailyBonus } from '@/components/profile/ProfileDailyBonus';
import { ProfileQuickActions } from '@/components/profile/ProfileQuickActions';
import { HistoryTab } from '@/components/profile/HistoryTab';
import { SubscriptionsTab } from '@/components/profile/SubscriptionsTab';
import { SavedOffersTab } from '@/components/profile/SavedOffersTab';
import { PromocodesTab } from '@/components/profile/PromocodesTab';
import { SettingsTab } from '@/components/profile/SettingsTab';

export default function ProfilePage() {
    const { user, isAuthenticated, loading, logout, refreshUser } = useAuth();
    const { hapticImpact, hapticNotification } = useTelegram();
    const router = useRouter();

    const [stats, setStats] = useState({ totalSpent: 0, totalPurchases: 0 });
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [activeTab, setActiveTab] = useState<'history' | 'subscriptions' | 'saved' | 'promocodes' | 'settings'>('history');

    // Additional data states
    const [subscriptions, setSubscriptions] = useState<Transaction[]>([]);
    const [savedOffers, setSavedOffers] = useState<SavedOffer[]>([]);
    const [savedOffersLoading, setSavedOffersLoading] = useState(false);
    const [savedOffersError, setSavedOffersError] = useState<string | null>(null);

    const [promocodeActivations, setPromocodeActivations] = useState<PromocodeActivation[]>([]);
    const [promocodesLoading, setPromocodesLoading] = useState(false);
    const [promocodeError, setPromocodeError] = useState<string | null>(null);

    const [dailyStatus, setDailyStatus] = useState<DailyBonusStatus | null>(null);

    // Modals
    const [topUpModalOpen, setTopUpModalOpen] = useState(false);
    const [redeemModalOpen, setRedeemModalOpen] = useState(false);
    const [redeemCode, setRedeemCode] = useState('');
    const [redeeming, setRedeeming] = useState(false);

    const [qrModalData, setQrModalData] = useState<{ title: string; data: string } | null>(null);
    const [copiedQrId, setCopiedQrId] = useState(false);

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push('/login');
        }
    }, [loading, isAuthenticated, router]);

    const fetchProfileData = async () => {
        if (!isAuthenticated) return;

        usersApi.getStats().then(setStats).catch(() => {});
        transactionsApi.list(0, 50).then((res) => setTransactions(res.data)).catch(() => {});
        transactionsApi.getSubscriptions().then(setSubscriptions).catch(() => {});
        usersApi.getDailyBonusStatus().then(setDailyStatus).catch(() => {});

        setSavedOffersLoading(true);
        usersApi.getSavedOffers()
            .then(setSavedOffers)
            .catch((err) => {
                console.error('Failed to load saved offers', err);
                setSavedOffersError('Не удалось загрузить сохранённые товары');
            })
            .finally(() => setSavedOffersLoading(false));

        setPromocodesLoading(true);
        api.promocodes.listMyActivations()
            .then(setPromocodeActivations)
            .catch((err) => {
                console.error('Failed to load promocode activations', err);
                setPromocodeError('Не удалось загрузить промокоды');
            })
            .finally(() => setPromocodesLoading(false));
    };

    useEffect(() => {
        if (isAuthenticated) {
            void fetchProfileData();
        }
    }, [isAuthenticated]);

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
                hapticNotification('success');
                alert(`Баланс успешно пополнен на ${amount.toLocaleString('ru-RU')} сум!`);
                return;
            }

            window.location.href = res.paymentUrl;
        } catch (err: unknown) {
            console.error(err);
            const error = err as Error;
            hapticNotification('error');
            throw new Error(error.message || 'Ошибка пополнения баланса');
        }
    };

    const handleRedeemGift = async () => {
        if (!redeemCode.trim()) return;
        setRedeeming(true);
        try {
            await transactionsApi.redeem(redeemCode.trim());
            hapticNotification('success');
            alert('Подарок успешно активирован!');
            setRedeemModalOpen(false);
            setRedeemCode('');
            await refreshUser();
            await fetchProfileData();
        } catch (err: unknown) {
            hapticNotification('error');
            const error = err as Error;
            alert(error.message || 'Ошибка активации подарка');
        } finally {
            setRedeeming(false);
        }
    };

    if (loading || !user) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="w-10 h-10 text-purple-500 animate-spin mb-4" />
                <p className="text-white/40 text-sm font-medium">Загрузка профиля...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 text-slate-100">
            {/* Header */}
            <ProfileHeader user={user} refreshUser={refreshUser} />

            {/* Stats & Balance Hub */}
            <ProfileStats
                user={user}
                stats={stats}
                onOpenTopUp={() => setTopUpModalOpen(true)}
                onOpenRedeemGift={() => setRedeemModalOpen(true)}
                hapticImpact={hapticImpact}
                hapticNotification={hapticNotification}
            />

            {/* Quick Actions Grid */}
            <ProfileQuickActions userRole={user.role} />

            {/* Daily Bonus Section */}
            <ProfileDailyBonus
                dailyStatus={dailyStatus}
                refreshBonus={async () => {
                    const status = await usersApi.getDailyBonusStatus();
                    setDailyStatus(status);
                }}
                refreshUser={refreshUser}
                hapticImpact={hapticImpact}
                hapticNotification={hapticNotification}
            />

            {/* Glass Navigation Tabs */}
            <div className="profile-tabs -mx-4 mb-6 flex gap-1.5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
                <button
                    onClick={() => {
                        hapticImpact('light');
                        setActiveTab('history');
                    }}
                    className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold cursor-pointer border transition-all whitespace-nowrap flex items-center justify-center gap-2 ${
                        activeTab === 'history'
                            ? 'text-white bg-purple-500/20 border-purple-500/40 shadow-lg shadow-purple-950/40'
                            : 'text-white/40 bg-white/[0.02] border-white/5 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <ClipboardList className="w-4 h-4" />
                    <span>История</span>
                    {transactions.length > 0 && (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-white/10 text-white/70">
                            {transactions.length}
                        </span>
                    )}
                </button>

                <button
                    onClick={() => {
                        hapticImpact('light');
                        setActiveTab('subscriptions');
                    }}
                    className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold cursor-pointer border transition-all whitespace-nowrap flex items-center justify-center gap-2 ${
                        activeTab === 'subscriptions'
                            ? 'text-white bg-purple-500/20 border-purple-500/40 shadow-lg shadow-purple-950/40'
                            : 'text-white/40 bg-white/[0.02] border-white/5 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <Key className="w-4 h-4" />
                    <span>Подписки</span>
                    {subscriptions.length > 0 && (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-white/10 text-white/70">
                            {subscriptions.length}
                        </span>
                    )}
                </button>

                <button
                    onClick={() => {
                        hapticImpact('light');
                        setActiveTab('saved');
                    }}
                    className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold cursor-pointer border transition-all whitespace-nowrap flex items-center justify-center gap-2 ${
                        activeTab === 'saved'
                            ? 'text-white bg-purple-500/20 border-purple-500/40 shadow-lg shadow-purple-950/40'
                            : 'text-white/40 bg-white/[0.02] border-white/5 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <Bookmark className="w-4 h-4" />
                    <span>Сохранённые</span>
                    {savedOffers.length > 0 && (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-white/10 text-white/70">
                            {savedOffers.length}
                        </span>
                    )}
                </button>

                <button
                    onClick={() => {
                        hapticImpact('light');
                        setActiveTab('promocodes');
                    }}
                    className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold cursor-pointer border transition-all whitespace-nowrap flex items-center justify-center gap-2 ${
                        activeTab === 'promocodes'
                            ? 'text-white bg-purple-500/20 border-purple-500/40 shadow-lg shadow-purple-950/40'
                            : 'text-white/40 bg-white/[0.02] border-white/5 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <Ticket className="w-4 h-4" />
                    <span>Промокоды</span>
                    {promocodeActivations.length > 0 && (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-white/10 text-white/70">
                            {promocodeActivations.length}
                        </span>
                    )}
                </button>

                <button
                    onClick={() => {
                        hapticImpact('light');
                        setActiveTab('settings');
                    }}
                    className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold cursor-pointer border transition-all whitespace-nowrap flex items-center justify-center gap-2 ${
                        activeTab === 'settings'
                            ? 'text-white bg-purple-500/20 border-purple-500/40 shadow-lg shadow-purple-950/40'
                            : 'text-white/40 bg-white/[0.02] border-white/5 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <Settings className="w-4 h-4" />
                    <span>Настройки</span>
                </button>
            </div>

            {/* Tab Content Display */}
            {activeTab === 'history' && (
                <HistoryTab
                    transactions={transactions}
                    setTransactions={setTransactions}
                    onShowQr={(data) => setQrModalData(data)}
                    hapticNotification={hapticNotification}
                />
            )}

            {activeTab === 'subscriptions' && (
                <SubscriptionsTab subscriptions={subscriptions} />
            )}

            {activeTab === 'saved' && (
                <SavedOffersTab
                    savedOffers={savedOffers}
                    setSavedOffers={setSavedOffers}
                    loading={savedOffersLoading}
                    error={savedOffersError}
                    hapticNotification={hapticNotification}
                />
            )}

            {activeTab === 'promocodes' && (
                <PromocodesTab
                    promocodeActivations={promocodeActivations}
                    setPromocodeActivations={setPromocodeActivations}
                    loading={promocodesLoading}
                    error={promocodeError}
                    hapticNotification={hapticNotification}
                />
            )}

            {activeTab === 'settings' && (
                <SettingsTab user={user} logout={logout} refreshUser={refreshUser} />
            )}

            {/* Top Up Modal */}
            <TopUpModal
                isOpen={topUpModalOpen}
                onClose={() => setTopUpModalOpen(false)}
                onTopUp={handleTopUp}
            />

            {/* Redeem Gift Code Modal */}
            {redeemModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center px-4"
                    onClick={() => setRedeemModalOpen(false)}
                >
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
                    <div
                        className="relative rounded-3xl p-6 sm:p-8 flex flex-col items-center gap-5 max-w-sm w-full bg-[#121624] border border-white/10 shadow-2xl z-10"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="text-center">
                            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mx-auto mb-3">
                                <Key className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-black text-white mb-1">Активация подарка</h3>
                            <p className="text-xs text-white/40 font-medium">Введите 8-значный промокод вашего подарка</p>
                        </div>

                        <input
                            value={redeemCode}
                            onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                            placeholder="A1B2C3D4"
                            className="w-full bg-black/40 border border-white/15 rounded-2xl px-4 py-3.5 text-center text-xl font-mono font-bold tracking-widest text-white outline-none focus:border-purple-500 transition-all uppercase"
                            maxLength={8}
                            autoFocus
                        />

                        <div className="flex gap-3 w-full">
                            <button
                                onClick={() => setRedeemModalOpen(false)}
                                className="flex-1 py-3 rounded-xl bg-white/5 text-white/60 font-bold text-xs border-0 cursor-pointer hover:bg-white/10 transition-all"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleRedeemGift}
                                disabled={redeeming || redeemCode.length < 4}
                                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-extrabold text-xs border-0 cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                            >
                                {redeeming ? 'Загрузка...' : 'Активировать'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* QR Code Modal */}
            {qrModalData && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center px-4"
                    onClick={() => setQrModalData(null)}
                >
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
                    <div
                        className="relative rounded-3xl p-6 sm:p-8 flex flex-col items-center gap-5 max-w-sm w-full bg-[#121624] border border-white/10 shadow-2xl z-10"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setQrModalData(null)}
                            className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all border-0 cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="text-center">
                            <QrCode className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                            <h3 className="text-lg font-extrabold text-white mb-1">{qrModalData.title}</h3>
                            <p className="text-xs text-white/40 font-medium">Покажите этот QR-код кассиру для применения</p>
                        </div>

                        <div className="p-4 rounded-2xl bg-white shadow-inner">
                            <QRCodeSVG
                                value={qrModalData.data}
                                size={200}
                                level="H"
                                includeMargin={false}
                                fgColor="#090d16"
                                bgColor="#ffffff"
                            />
                        </div>

                        <div className="w-full rounded-xl px-4 py-2.5 text-center bg-black/40 border border-white/10">
                            <code className="text-xs text-purple-300 font-mono font-bold break-all select-all">
                                {qrModalData.data}
                            </code>
                        </div>

                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(qrModalData.data);
                                setCopiedQrId(true);
                                hapticNotification('success');
                                setTimeout(() => setCopiedQrId(false), 2000);
                                analyticsApi.trackEvent({ eventType: 'copy_code', metadata: JSON.stringify({ source: 'qr_modal' }) }).catch(() => {});
                            }}
                            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-extrabold cursor-pointer transition-all border ${
                                copiedQrId
                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                    : 'bg-purple-500/10 text-purple-300 border-purple-500/20 hover:bg-purple-500/20'
                            }`}
                        >
                            {copiedQrId ? (
                                <>
                                    <CheckCircle className="w-4 h-4" />
                                    <span>Скопировано в буфер!</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="w-4 h-4" />
                                    <span>Скопировать код</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
