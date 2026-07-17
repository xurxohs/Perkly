'use client';

import { useAuth } from '@/lib/AuthContext';
import { offersApi, sellerApi, SellerStats } from '@/lib/api';
import { TrendingUp, Package, ShoppingBag, CalendarDays, ArrowUpRight, Zap, Star, Clock, X, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';

interface Offer {
    id: string;
    title: string;
    price: number;
    category: string;
    isActive: boolean;
    featuredUntil?: string | null;
}

const FEATURE_PLANS = [
    { days: 1, label: '1 день', price: 12_000 },
    { days: 3, label: '3 дня', price: 36_000 },
    { days: 7, label: '7 дней', price: 84_000, popular: true },
    { days: 30, label: '30 дней', price: 360_000 },
];

const ORDER_STATUS_LABELS: Record<string, string> = {
    PENDING: 'Ожидает оплаты', PAID: 'Оплачено', ESCROW: 'В работе', ACTIVATED: 'Активировано',
    DISPUTED: 'Спор', COMPLETED: 'Завершено', CANCELLED: 'Отменено', REFUNDED: 'Возврат',
};

export default function VendorDashboardPage() {
    const { user, refreshUser } = useAuth();
    const [offers, setOffers] = useState<Offer[]>([]);
    const [sellerStats, setSellerStats] = useState<SellerStats | null>(null);
    const [loadingDashboard, setLoadingDashboard] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
    const [selectedDays, setSelectedDays] = useState(7);
    const [promoting, setPromoting] = useState(false);
    const [promoted, setPromoted] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        const load = async () => {
            setLoadingDashboard(true);
            setLoadError(null);
            try {
                const [offersData, statsData] = await Promise.all([
                    offersApi.getMyOffers() as Promise<Offer[]>,
                    sellerApi.getStats(),
                ]);
                setOffers(offersData);
                setSellerStats(statsData);
            } catch (loadFailure) {
                setLoadError(loadFailure instanceof Error ? loadFailure.message : 'Не удалось загрузить кабинет');
            } finally {
                setLoadingDashboard(false);
            }
        };
        void load();
    }, []);

    const handleFeature = async () => {
        if (!selectedOffer) return;
        setPromoting(true);
        setError(null);
        try {
            await offersApi.featureOffer(selectedOffer.id, selectedDays);
            await refreshUser();
            const data = await offersApi.getMyOffers() as Offer[];
            setOffers(data);
            setPromoted(selectedOffer.id);
            setSelectedOffer(null);
            intervalRef.current = setTimeout(() => setPromoted(null), 3000);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Ошибка продвижения';
            setError(msg);
        } finally {
            setPromoting(false);
        }
    };

    const isFeatured = (o: Offer) =>
        o.featuredUntil && new Date(o.featuredUntil) > new Date();

    const dashboardCards = [
        { title: 'Зачислено продавцу', value: `${(sellerStats?.totalEarnings ?? 0).toLocaleString('ru-RU')} сум`, icon: TrendingUp, color: 'from-emerald-500 to-emerald-400' },
        { title: 'Все продажи', value: String(sellerStats?.totalSales ?? 0), icon: ShoppingBag, color: 'from-blue-500 to-blue-400' },
        { title: 'Активные товары', value: String(sellerStats?.activeOffers ?? offers.filter((offer) => offer.isActive).length), icon: Package, color: 'from-purple-500 to-purple-400' },
        { title: 'События Topka', value: String(sellerStats?.activeEvents ?? 0), icon: CalendarDays, color: 'from-orange-500 to-orange-400' },
    ];

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">С возвращением, {user?.displayName}</h1>
                    <p className="text-white/50">Вот что происходит с вашими товарами сегодня.</p>
                </div>
            </div>

            {loadError && (
                <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    {loadError}
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {dashboardCards.map((stat, i) => (
                    <div key={i} className="rounded-3xl p-6 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300 bg-white/[0.03] backdrop-blur-[20px] border border-white/[0.08] shadow-[0_10px_30px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.1)]">
                        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${stat.color} opacity-10 rounded-full blur-[30px] -mr-10 -mt-10 transition-opacity group-hover:opacity-20`} />
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/5 border border-white/5">
                                <stat.icon className="w-6 h-6 text-white/80" />
                            </div>
                            {loadingDashboard && <span className="h-5 w-12 animate-pulse rounded-full bg-white/5" />}
                        </div>
                        <div>
                            <h3 className="text-3xl font-bold text-white mb-1 tracking-tight">{stat.value}</h3>
                            <p className="text-sm text-white/50 font-medium">{stat.title}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* My Offers with Promote */}
            {offers.length > 0 && (
                <div className="rounded-3xl p-6 mb-10 bg-white/[0.02] border border-white/[0.06]">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-xl font-bold text-white">Мои офферы</h2>
                        <span className="text-xs text-white/30">Баланс: <span className="text-white/70 font-semibold">{(user?.balance ?? 0).toLocaleString('ru-RU')} сум</span></span>
                    </div>
                    <div className="space-y-3">
                        {offers.map((o) => (
                            <div key={o.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
                                <div className="flex items-center gap-3">
                                    {isFeatured(o) && (
                                        <span className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/20">
                                            <Star className="w-3 h-3" /> Топ
                                        </span>
                                    )}
                                    <div>
                                        <p className="text-white text-sm font-medium">{o.title}</p>
                                        <p className="text-white/40 text-xs">{o.category} · {o.price.toLocaleString('ru-RU')} сум</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {isFeatured(o) && (
                                        <span className="text-xs text-white/30 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            до {new Date(o.featuredUntil!).toLocaleDateString('ru')}
                                        </span>
                                    )}
                                    {promoted === o.id ? (
                                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                                            <CheckCircle className="w-3.5 h-3.5" /> Продвинуто!
                                        </span>
                                    ) : (
                                        <button
                                            onClick={() => { setSelectedOffer(o); setError(null); }}
                                            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg text-amber-900 border-0 cursor-pointer transition-all bg-[linear-gradient(135deg,#fbbf24,#f59e0b)]"
                                        >
                                            <Zap className="w-3.5 h-3.5" /> Продвинуть
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recent real orders */}
            <div className="w-full rounded-3xl p-6 sm:p-8 flex flex-col bg-white/[0.02] backdrop-blur-[20px] border border-white/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-white mb-1">Последние заказы</h3>
                        <p className="text-sm text-white/50">Фактические сделки из backend</p>
                    </div>
                    <Link href="/vendor/orders" className="text-sm font-medium text-purple-400 bg-purple-400/10 px-4 py-2 rounded-xl hover:bg-purple-400/20 transition-colors flex items-center gap-2 no-underline">
                        Все заказы <ArrowUpRight className="w-4 h-4" />
                    </Link>
                </div>
                <div className="space-y-3">
                    {(sellerStats?.recentTransactions ?? []).map((transaction) => (
                        <div key={transaction.id} className="flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4 sm:flex-row sm:items-center">
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-white">{transaction.offer?.title ?? 'Заказ'}</p>
                                <p className="mt-1 text-xs text-white/40">{transaction.buyer?.displayName ?? transaction.buyer?.email ?? 'Покупатель'}</p>
                            </div>
                            <div className="flex items-center justify-between gap-4 sm:justify-end">
                                <span className="text-sm font-bold text-white">{transaction.price.toLocaleString('ru-RU')} сум</span>
                                <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-bold text-white/50">{ORDER_STATUS_LABELS[transaction.status] ?? transaction.status}</span>
                            </div>
                        </div>
                    ))}
                    {!loadingDashboard && (sellerStats?.recentTransactions.length ?? 0) === 0 && (
                        <div className="py-10 text-center text-sm text-white/35">Заказов пока нет</div>
                    )}
                </div>
            </div>

            {/* Feature Modal */}
            {selectedOffer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-[12px]">
                    <div className="w-full max-w-md rounded-3xl p-6 relative bg-[#0f0a19]/97 border border-white/10 shadow-[0_40px_80px_rgba(0,0,0,0.5)]">
                        <button onClick={() => setSelectedOffer(null)}
                            title="Закрыть"
                            className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all border-0 cursor-pointer text-white/60">
                            <X className="w-4 h-4" />
                        </button>

                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[linear-gradient(135deg,#fbbf24,#f59e0b)]">
                                <Zap className="w-5 h-5 text-amber-900" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg">Продвинуть оффер</h3>
                                <p className="text-white/40 text-sm truncate max-w-[240px]">{selectedOffer.title}</p>
                            </div>
                        </div>

                        <p className="text-sm text-white/50 mb-5">Выберите длительность — оффер появится в топе каталога с бейджем <span className="text-amber-400 font-semibold">⭐ Топ</span>:</p>

                        <div className="grid grid-cols-2 gap-3 mb-6">
                            {FEATURE_PLANS.map((plan) => (
                                <button
                                    key={plan.days}
                                    onClick={() => setSelectedDays(plan.days)}
                                    className={`relative p-4 rounded-2xl text-left transition-all border cursor-pointer ${
                                        selectedDays === plan.days
                                            ? 'bg-amber-400/15 border-amber-400/40'
                                            : 'bg-white/[0.03] border-white/10'
                                    }`}
                                >
                                    {plan.popular && (
                                        <span className="absolute -top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-amber-900">
                                            Популярно
                                        </span>
                                    )}
                                    <p className="text-white font-bold text-base">{plan.label}</p>
                                    <p className="text-amber-400 text-sm font-semibold">{plan.price.toLocaleString('ru-RU')} сум</p>
                                </button>
                            ))}
                        </div>

                        {error && (
                            <p className="text-red-400 text-sm mb-4 text-center bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                                {error}
                            </p>
                        )}

                        <div className="flex items-center justify-between mb-4 text-sm text-white/40">
                            <span>Ваш баланс</span>
                            <span className="text-white font-semibold">{(user?.balance ?? 0).toLocaleString('ru-RU')} сум</span>
                        </div>

                        <button
                            onClick={handleFeature}
                            disabled={promoting}
                            className="w-full py-3.5 rounded-xl font-bold text-sm border-0 cursor-pointer transition-all disabled:opacity-50 bg-[linear-gradient(135deg,#fbbf24,#f59e0b)] text-[#1a0a00]"
                        >
                            {promoting
                                ? 'Обработка...'
                                : `Продвинуть за ${(selectedDays * 12_000).toLocaleString('ru-RU')} сум`}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
