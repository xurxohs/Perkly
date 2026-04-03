'use client';

import { useAuth } from '@/lib/AuthContext';
import { offersApi } from '@/lib/api';
import { TrendingUp, Package, Users, Activity, ArrowUpRight, Zap, Star, Clock, X, CheckCircle } from 'lucide-react';
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
    { days: 1, label: '1 день', price: 1 },
    { days: 3, label: '3 дня', price: 3 },
    { days: 7, label: '7 дней', price: 7, popular: true },
    { days: 30, label: '30 дней', price: 30 },
];

export default function VendorDashboardPage() {
    const { user, refreshUser } = useAuth();
    const [offers, setOffers] = useState<Offer[]>([]);
    const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
    const [selectedDays, setSelectedDays] = useState(7);
    const [promoting, setPromoting] = useState(false);
    const [promoted, setPromoted] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await offersApi.getMyOffers() as Offer[];
                setOffers(data);
            } catch {
                // ignore
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

    const stats = [
        { title: 'Всего заработано', value: '$1,450.00', trend: '+12.5%', isPositive: true, icon: TrendingUp, color: 'from-emerald-500 to-emerald-400' },
        { title: 'Активные товары', value: String(offers.length || 0), trend: '', isPositive: true, icon: Package, color: 'from-purple-500 to-purple-400' },
        { title: 'Уникальные клиенты', value: '156', trend: '+18%', isPositive: true, icon: Users, color: 'from-blue-500 to-blue-400' },
        { title: 'Конверсия', value: '8.4%', trend: '-1.2%', isPositive: false, icon: Activity, color: 'from-orange-500 to-orange-400' },
    ];

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">С возвращением, {user?.displayName}</h1>
                    <p className="text-white/50">Вот что происходит с вашими товарами сегодня.</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {stats.map((stat, i) => (
                    <div key={i} className="rounded-3xl p-6 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300 bg-white/[0.03] backdrop-blur-[20px] border border-white/[0.08] shadow-[0_10px_30px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.1)]">
                        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${stat.color} opacity-10 rounded-full blur-[30px] -mr-10 -mt-10 transition-opacity group-hover:opacity-20`} />
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/5 border border-white/5">
                                <stat.icon className="w-6 h-6 text-white/80" />
                            </div>
                            {stat.trend && (
                                <span className={`flex items-center text-xs font-semibold px-2 py-1 rounded-full ${stat.isPositive ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'}`}>
                                    {stat.trend}
                                </span>
                            )}
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
                        <span className="text-xs text-white/30">Баланс: <span className="text-white/70 font-semibold">${user?.balance?.toFixed(2)}</span></span>
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
                                        <p className="text-white/40 text-xs">{o.category} · ${o.price}</p>
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

            {/* Chart */}
            <div className="w-full h-96 rounded-3xl p-8 flex flex-col bg-white/[0.02] backdrop-blur-[20px] border border-white/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-white mb-1">Динамика продаж</h3>
                        <p className="text-sm text-white/50">За последние 7 дней</p>
                    </div>
                    <button className="text-sm font-medium text-purple-400 bg-purple-400/10 px-4 py-2 rounded-xl hover:bg-purple-400/20 transition-colors flex items-center gap-2 border-0 cursor-pointer">
                        Отчет <ArrowUpRight className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex-1 flex items-end justify-between gap-2 opacity-50 relative pb-6 border-b border-white/5">
                    <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                        <defs>
                            <linearGradient id="gradientLine" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#a855f7" />
                                <stop offset="50%" stopColor="#8b5cf6" />
                                <stop offset="100%" stopColor="#3b82f6" />
                            </linearGradient>
                            <linearGradient id="gradientFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.2" />
                                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <path d="M 0,150 Q 100,60 200,100 T 400,120 T 600,40 T 800,110 T 1000,20 L 1000,300 L 0,300 Z" fill="url(#gradientFill)" />
                        <path d="M 0,150 Q 100,60 200,100 T 400,120 T 600,40 T 800,110 T 1000,20" fill="none" stroke="url(#gradientLine)" strokeWidth="4" strokeLinecap="round" />
                        <circle cx="600" cy="40" r="6" fill="#fff" filter="drop-shadow(0 0 10px #fff)" />
                        <circle cx="600" cy="40" r="14" fill="none" stroke="#fff" strokeWidth="2" strokeOpacity="0.5" />
                    </svg>
                </div>
                <div className="flex justify-between mt-4 text-xs font-medium text-white/30 uppercase tracking-widest px-4">
                    <span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span><span className="text-white">Сб</span><span>Вс</span>
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
                                    <p className="text-amber-400 text-sm font-semibold">${plan.price}</p>
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
                            <span className="text-white font-semibold">${user?.balance?.toFixed(2)}</span>
                        </div>

                        <button
                            onClick={handleFeature}
                            disabled={promoting}
                            className="w-full py-3.5 rounded-xl font-bold text-sm border-0 cursor-pointer transition-all disabled:opacity-50 bg-[linear-gradient(135deg,#fbbf24,#f59e0b)] text-[#1a0a00]"
                        >
                            {promoting
                                ? 'Обработка...'
                                : `Продвинуть за $${selectedDays * 1}`}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
