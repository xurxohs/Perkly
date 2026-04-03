'use client';

import { Check, Zap, Crown, Gem, ArrowRight, Sparkles, Shield, Clock, Gift, Star, Medal, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { usersApi } from '@/lib/api';

const tiers = [
    {
        name: 'Silver',
        icon: Shield,
        price: 'Бесплатно',
        priceNum: 0,
        period: '',
        description: 'Идеально для начала — все базовые функции',
        badge: null,
        gradient: 'from-zinc-400 to-zinc-500',
        borderColor: 'rgba(161,161,170,0.15)',
        shadowColor: 'rgba(161,161,170,0.06)',
        iconBg: 'linear-gradient(135deg, #a1a1aa, #71717a)',
        features: [
            { text: 'Доступ к каталогу купонов', included: true },
            { text: 'Покупка цифровых товаров', included: true },
            { text: '1% кэшбек Perkly Points', included: true },
            { text: '1 бесплатный спин в день', included: true },
            { text: 'Стандартная поддержка', included: true },
            { text: 'Эксклюзивные предложения', included: false },
            { text: 'VIP Flash Drops', included: false },
            { text: 'Бейдж профиля', included: false },
        ],
    },
    {
        name: 'Gold',
        icon: Crown,
        price: '$4.99',
        priceNum: 4.99,
        period: '/мес',
        description: 'Для активных покупателей — больше скидок',
        badge: 'Популярный',
        gradient: 'from-amber-400 to-yellow-500',
        borderColor: 'rgba(251,191,36,0.2)',
        shadowColor: 'rgba(251,191,36,0.1)',
        iconBg: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
        features: [
            { text: 'Всё из Silver', included: true },
            { text: '3% кэшбек Perkly Points', included: true },
            { text: '3 бесплатных спина в день', included: true },
            { text: 'Эксклюзивные предложения', included: true },
            { text: 'Быстрая поддержка', included: true },
            { text: <><span className="inline-flex items-center gap-1"><Medal className="w-4 h-4 text-yellow-500" /> Gold</span> бейдж профиля</>, included: true },
            { text: 'Ранний доступ к акциям', included: true },
            { text: 'VIP Flash Drops', included: false },
        ],
    },
    {
        name: 'Platinum',
        icon: Gem,
        price: '$9.99',
        priceNum: 9.99,
        period: '/мес',
        description: 'Максимальные привилегии — лучшие цены',
        badge: 'Макс. выгода',
        gradient: 'from-purple-400 to-fuchsia-500',
        borderColor: 'rgba(168,85,247,0.2)',
        shadowColor: 'rgba(168,85,247,0.12)',
        iconBg: 'linear-gradient(135deg, #a855f7, #d946ef)',
        features: [
            { text: 'Всё из Gold', included: true },
            { text: '5% кэшбек Perkly Points', included: true },
            { text: '5 бесплатных спинов в день', included: true },
            { text: 'VIP Flash Drops', included: true },
            { text: 'Мгновенная поддержка 24/7', included: true },
            { text: <><span className="inline-flex items-center gap-1"><Gem className="w-4 h-4 text-purple-400" /> Platinum</span> бейдж профиля</>, included: true },
            { text: 'Секретные промокоды', included: true },
            { text: 'Приоритет при покупке', included: true },
        ],
    },
];

const stats = [
    { icon: Star, value: '50K+', label: 'Активных пользователей' },
    { icon: Gift, value: '10K+', label: 'Купонов и офферов' },
    { icon: Clock, value: '<1 мин', label: 'Моментальная доставка' },
    { icon: Shield, value: '100%', label: 'Безопасные сделки' },
];

export default function PricingPage() {
    const { user, refreshUser } = useAuth();
    const [annual, setAnnual] = useState(false);
    const [loadingTier, setLoadingTier] = useState<string | null>(null);
    const [subError, setSubError] = useState<string | null>(null);
    const [subSuccess, setSubSuccess] = useState<string | null>(null);

    const handleSubscribe = async (tierName: string, priceNum: number) => {
        if (priceNum === 0) return;
        const tier = tierName.toUpperCase() as 'GOLD' | 'PLATINUM';
        setLoadingTier(tier);
        setSubError(null);
        setSubSuccess(null);
        try {
            const months = annual ? 12 : 1;
            await usersApi.subscribe(tier, months);
            await refreshUser();
            setSubSuccess(`${tierName} активирован!`);
            setTimeout(() => setSubSuccess(null), 4000);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Ошибка оплаты';
            setSubError(msg);
        } finally {
            setLoadingTier(null);
        }
    };

    return (
        <div className="flex flex-col items-center px-6 pb-24 max-w-[1200px] mx-auto w-full">
            {/* Hero */}
            <section className="pt-20 pb-16 text-center w-full relative">
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none bg-[radial-gradient(circle,rgba(168,85,247,0.1)_0%,transparent_70%)]" />

                <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full mb-6 bg-[rgba(168,85,247,0.08)] border border-[rgba(168,85,247,0.15)]">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-medium text-purple-300">Выберите свой тариф</span>
                </div>

                <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter mb-5 leading-[1.05]">
                    Больше привилегий —<br />
                    <span className="text-gradient text-glow">Больше выгоды</span>
                </h1>

                <p className="text-lg text-white/40 max-w-lg mx-auto mb-8 leading-relaxed">
                    Подберите идеальный план для получения максимальных скидок, кэшбека и эксклюзивных предложений.
                </p>

                {/* Toggle */}
                <div className="inline-flex items-center gap-3 p-1.5 rounded-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)]">
                    <button
                        onClick={() => setAnnual(false)}
                        className={`px-5 py-2 rounded-full text-sm font-semibold transition-all cursor-pointer border-0 ${!annual ? 'bg-white text-black' : 'text-white/50 bg-transparent'}`}
                    >
                        Ежемесячно
                    </button>
                    <button
                        onClick={() => setAnnual(true)}
                        className={`px-5 py-2 rounded-full text-sm font-semibold transition-all cursor-pointer border-0 flex items-center gap-2 ${annual ? 'bg-white text-black' : 'text-white/50 bg-transparent'}`}
                    >
                        Ежегодно
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500 text-white font-bold">-20%</span>
                    </button>
                </div>
            </section>

            {/* Pricing Cards */}
            <section className="w-full grid grid-cols-1 md:grid-cols-3 gap-5 mb-20">
                {tiers.map((tier) => {
                    const isGold = tier.name === 'Gold';
                    const monthlyPrice = tier.priceNum;
                    const displayPrice = tier.priceNum === 0
                        ? 'Бесплатно'
                        : annual
                            ? `$${(monthlyPrice * 0.8 * 12).toFixed(0)}`
                            : tier.price;
                    const currentTier = user?.tier || 'SILVER';
                    const isCurrent = currentTier === tier.name.toUpperCase();

                    return (
                        <div
                            key={tier.name}
                            className={`relative rounded-2xl p-[1px] transition-all duration-300 ${isGold ? 'bg-[linear-gradient(135deg,rgba(251,191,36,0.3),rgba(245,158,11,0.1))] shadow-[0_0_50px_rgba(251,191,36,0.08)]' : 'bg-transparent shadow-none'}`}
                        >
                            {tier.badge && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                                    <span className={`px-4 py-1 rounded-full text-xs font-bold text-black whitespace-nowrap ${isGold ? 'bg-[linear-gradient(135deg,#fbbf24,#f59e0b)]' : 'bg-[linear-gradient(135deg,#a855f7,#d946ef)]'}`}>
                                        {tier.badge}
                                    </span>
                                </div>
                            )}

                            <div
                                className={`rounded-2xl p-7 h-full flex flex-col relative overflow-hidden border ${
                                    tier.name === 'Silver' ? 'border-[rgba(161,161,170,0.15)] bg-[rgba(255,255,255,0.02)]' :
                                    tier.name === 'Gold' ? 'border-[rgba(251,191,36,0.2)] bg-[rgba(20,15,5,0.95)]' :
                                    'border-[rgba(168,85,247,0.2)] bg-[rgba(255,255,255,0.02)]'
                                }`}
                            >
                                {/* Ambient glow */}
                                <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full pointer-events-none ${
                                    tier.name === 'Silver' ? 'bg-[radial-gradient(circle,rgba(161,161,170,0.06),transparent)]' :
                                    tier.name === 'Gold' ? 'bg-[radial-gradient(circle,rgba(251,191,36,0.1),transparent)]' :
                                    'bg-[radial-gradient(circle,rgba(168,85,247,0.12),transparent)]'
                                }`} />

                                {/* Icon + Name */}
                                <div className="flex items-center gap-3 mb-5 relative z-10">
                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                                        tier.name === 'Silver' ? 'bg-[linear-gradient(135deg,#a1a1aa,#71717a)] shadow-[0_0_20px_rgba(161,161,170,0.06)]' :
                                        tier.name === 'Gold' ? 'bg-[linear-gradient(135deg,#fbbf24,#f59e0b)] shadow-[0_0_20px_rgba(251,191,36,0.1)]' :
                                        'bg-[linear-gradient(135deg,#a855f7,#d946ef)] shadow-[0_0_20px_rgba(168,85,247,0.12)]'
                                    }`}>
                                        <tier.icon className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">{tier.name}</h3>
                                        <p className="text-xs text-white/35">{tier.description}</p>
                                    </div>
                                </div>

                                {/* Price */}
                                <div className="mb-6 relative z-10">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-extrabold text-white">{displayPrice}</span>
                                        {tier.period && (
                                            <span className="text-sm text-white/30">{annual ? '/год' : tier.period}</span>
                                        )}
                                    </div>
                                    {annual && tier.priceNum > 0 && (
                                        <span className="text-xs text-green-400 mt-1 block">
                                            Экономия ${(monthlyPrice * 12 * 0.2).toFixed(0)} в год
                                        </span>
                                    )}
                                </div>

                                {/* Features */}
                                <ul className="flex-1 space-y-3 mb-7 relative z-10">
                                    {tier.features.map((f, j) => (
                                        <li key={j} className="flex items-center gap-3">
                                            {f.included ? (
                                                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-green-500/15">
                                                    <Check className="w-3 h-3 text-green-400" />
                                                </div>
                                            ) : (
                                                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-white/[0.04]">
                                                    <div className="w-1.5 h-[2px] bg-white/15 rounded-full" />
                                                </div>
                                            )}
                                            <span className={`text-sm ${f.included ? 'text-white/80' : 'text-white/25'}`}>{f.text}</span>
                                        </li>
                                    ))}
                                </ul>

                                {/* Error / Success Feedback */}
                                {subError && isCurrent && (
                                    <p className="text-xs text-red-400 text-center mt-2">{subError}</p>
                                )}
                                {subSuccess && tier.name.toUpperCase() === user?.tier && (
                                    <p className="text-xs text-emerald-400 text-center mt-2">{subSuccess}</p>
                                )}
                                {/* CTA */}
                                <button
                                    onClick={() => handleSubscribe(tier.name, monthlyPrice)}
                                    disabled={isCurrent || loadingTier !== null || tier.priceNum === 0}
                                    className={`w-full py-3.5 rounded-xl font-semibold text-sm cursor-pointer border flex items-center justify-center gap-2 transition-all relative z-10 disabled:opacity-50 disabled:cursor-not-allowed ${
                                        isCurrent
                                            ? 'bg-white/[0.05] border-white/10 text-white/[0.4]'
                                            : isGold
                                                ? 'bg-[linear-gradient(135deg,#fbbf24,#f59e0b)] border-transparent text-black shadow-[0_0_25px_rgba(251,191,36,0.2)]'
                                                : tier.name === 'Platinum'
                                                    ? 'bg-[linear-gradient(135deg,#a855f7,#d946ef)] border-transparent text-white shadow-[0_0_25px_rgba(168,85,247,0.2)]'
                                                    : 'bg-white/[0.06] border-white/10 text-white'
                                    }`}
                                >
                                    {loadingTier === tier.name.toUpperCase() ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Обработка...</>
                                    ) : isCurrent ? 'Текущий план' : (
                                        <>
                                            {tier.priceNum === 0 ? 'Начать бесплатно' : 'Выбрать план'}
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </section>

            {/* Stats */}
            <section className="w-full mb-20">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {stats.map((s, i) => (
                        <div key={i} className="glass-card p-6 text-center">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3 relative z-10 bg-purple-400/10">
                                <s.icon className="w-5 h-5 text-purple-400" />
                            </div>
                            <div className="text-2xl font-extrabold text-white mb-1 relative z-10">{s.value}</div>
                            <div className="text-xs text-white/35 relative z-10">{s.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* FAQ / CTA */}
            <section className="w-full glass-card p-10 text-center bg-[linear-gradient(135deg,rgba(88,28,135,0.15),rgba(30,58,138,0.08))] border-purple-500/10 relative overflow-hidden">
                <div className="absolute -right-20 -top-20 w-60 h-60 rounded-full pointer-events-none bg-[radial-gradient(circle,rgba(168,85,247,0.12),transparent)]" />
                <h2 className="text-2xl font-extrabold text-white mb-3 relative z-10">Остались вопросы?</h2>
                <p className="text-white/40 mb-6 relative z-10">Свяжитесь с нами в Telegram — ответим за минуту</p>
                <a href="https://t.me/perkly_support" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold no-underline relative z-10 bg-[linear-gradient(135deg,#a855f7,#ec4899)] shadow-[0_0_25px_rgba(168,85,247,0.3)]">
                    <Zap className="w-4 h-4" />
                    Написать в Telegram
                </a>
            </section>
        </div>
    );
}
