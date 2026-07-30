'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    AlertCircle, ArrowUpRight, BadgeCheck, BarChart3, Building2, Check,
    CheckCircle2, Clock3, ExternalLink, Package, RefreshCw, ShieldAlert,
    Sparkles, TicketPercent, UserRound, X,
} from 'lucide-react';
import { companiesApi, Company, PartnerCapabilities, sellerApi } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';

const TIER_NAMES = { SILVER: 'Basic', GOLD: 'Gold', PLATINUM: 'Platinum' } as const;

export default function VendorSettingsPage() {
    const { user } = useAuth();
    const [company, setCompany] = useState<Company | null>(null);
    const [capabilities, setCapabilities] = useState<PartnerCapabilities | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true); setError(null);
        const [companyResult, capabilityResult] = await Promise.allSettled([
            companiesApi.getMine(), sellerApi.getCapabilities(),
        ]);
        if (companyResult.status === 'fulfilled') setCompany(companyResult.value);
        if (capabilityResult.status === 'fulfilled') setCapabilities(capabilityResult.value);
        if (companyResult.status === 'rejected' || capabilityResult.status === 'rejected') {
            const failure = companyResult.status === 'rejected' ? companyResult.reason : capabilityResult.status === 'rejected' ? capabilityResult.reason : null;
            setError(failure instanceof Error ? failure.message : 'Часть данных кабинета недоступна');
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        const frame = window.requestAnimationFrame(() => { void load(); });
        return () => window.cancelAnimationFrame(frame);
    }, [load]);

    const companyStatus = company?.status;
    const StatusIcon = companyStatus === 'ACTIVE' ? CheckCircle2 : companyStatus === 'SUSPENDED' ? ShieldAlert : Clock3;
    const statusText = !company ? 'Компания не зарегистрирована' : companyStatus === 'ACTIVE' ? 'Компания подтверждена' : companyStatus === 'SUSPENDED' ? 'Продажи приостановлены' : 'Заявка на модерации';
    const statusClass = companyStatus === 'ACTIVE' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : companyStatus === 'SUSPENDED' ? 'border-red-500/20 bg-red-500/10 text-red-300' : 'border-amber-500/20 bg-amber-500/10 text-amber-300';

    const checklist = useMemo(() => [
        { title: 'Профиль заполнен', description: 'Имя и рабочий email доступны покупателям и поддержке.', done: Boolean(user?.displayName && user?.email), href: '/profile', icon: UserRound },
        { title: 'Юридические данные', description: company ? `${company.legalName} · ИНН ${company.inn}` : 'Подайте заявку компании для начала продаж.', done: Boolean(company), href: '/sell', icon: Building2 },
        { title: 'Модерация пройдена', description: companyStatus === 'ACTIVE' ? 'Можно публиковать товары.' : companyStatus === 'SUSPENDED' ? 'Обратитесь в поддержку для восстановления.' : 'Дождитесь решения администратора.', done: companyStatus === 'ACTIVE', href: companyStatus === 'SUSPENDED' ? '/support' : '/sell', icon: BadgeCheck },
        { title: 'Добавлен активный товар', description: `${capabilities?.usage.activeOffers ?? 0} активных из ${capabilities?.limits.offersLimit === -1 ? '∞' : capabilities?.limits.offersLimit ?? '—'}.`, done: (capabilities?.usage.activeOffers ?? 0) > 0, href: '/vendor/products', icon: Package },
        { title: 'Промокоды настроены', description: `${company?._count?.promocodes ?? 0} промокодов компании. Необязательно для обычных товаров.`, done: (company?._count?.promocodes ?? 0) > 0, optional: true, href: '/vendor/promocodes', icon: TicketPercent },
    ], [user, company, companyStatus, capabilities]);
    const requiredItems = checklist.filter((item) => !item.optional);
    const completedRequired = requiredItems.filter((item) => item.done).length;
    const progress = Math.round((completedRequired / requiredItems.length) * 100);

    const capabilityRows = [
        ['Создание товаров', capabilities?.capabilities.canCreateOffers],
        ['Продвижение товаров', capabilities?.capabilities.canFeatureOffers],
        ['Расширенная аналитика', capabilities?.capabilities.canViewAdvancedAnalytics],
        ['Публикации Topka', capabilities?.capabilities.canPublishTopka],
        ['Приоритетная поддержка', capabilities?.capabilities.hasPrioritySupport],
    ];

    return <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-8 flex items-start justify-between gap-4"><div><h1 className="mb-2 text-3xl font-bold text-white">Настройки продавца</h1><p className="text-white/45">Готовность компании, тариф и доступные функции.</p></div><button onClick={() => void load()} disabled={loading} className="rounded-xl border border-white/10 bg-white/5 p-3 text-white/60 disabled:opacity-40" aria-label="Обновить"><RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} /></button></div>

        {error && <div className="mb-5 flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200"><AlertCircle className="h-5 w-5 shrink-0" />{error}</div>}

        <section className="mb-5 overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.03] p-6 sm:p-7">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between"><div><div className={`mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold ${statusClass}`}><StatusIcon className="h-4 w-4" />{loading ? 'Проверяем статус…' : statusText}</div><h2 className="text-2xl font-black text-white">Готовность к продажам — {loading ? '—' : `${progress}%`}</h2><p className="mt-2 text-sm text-white/40">{completedRequired} из {requiredItems.length} обязательных шагов выполнено</p></div><div className="relative h-24 w-24 shrink-0 rounded-full" style={{ background: `conic-gradient(#a855f7 ${progress * 3.6}deg, rgba(255,255,255,.06) 0deg)` }}><div className="absolute inset-2 flex items-center justify-center rounded-full bg-[#111625] text-lg font-black text-white">{loading ? '—' : `${progress}%`}</div></div></div>
            <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-400 transition-all duration-700" style={{ width: `${loading ? 0 : progress}%` }} /></div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
            <section className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-5 sm:p-6"><div className="mb-5"><h2 className="font-bold text-white">Checklist запуска</h2><p className="mt-1 text-sm text-white/35">Только шаги, которые подтверждаются backend.</p></div><div className="space-y-2">{checklist.map((item) => <Link key={item.title} href={item.href} className="group flex items-center gap-4 rounded-2xl border border-transparent p-3 no-underline transition hover:border-white/[0.06] hover:bg-white/[0.025]"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${item.done ? 'bg-emerald-500/10 text-emerald-300' : 'bg-white/5 text-white/30'}`}>{item.done ? <Check className="h-5 w-5" /> : <item.icon className="h-5 w-5" />}</div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="text-sm font-bold text-white/85">{item.title}</h3>{item.optional && <span className="rounded-full bg-white/5 px-2 py-0.5 text-[9px] font-bold text-white/30">необязательно</span>}</div><p className="mt-1 text-xs leading-5 text-white/35">{item.description}</p></div><ArrowUpRight className="h-4 w-4 text-white/15 transition group-hover:text-white/50" /></Link>)}</div></section>

            <div className="space-y-5"><section className="rounded-3xl border border-white/[0.07] bg-white/[0.03] p-6"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-purple-300/60">Тариф</p><h2 className="mt-1 text-2xl font-black text-white">{capabilities ? TIER_NAMES[capabilities.tier] : '—'}</h2></div><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-300"><Sparkles className="h-5 w-5" /></div></div><div className="space-y-3">{capabilityRows.map(([label, enabled]) => <div key={String(label)} className="flex items-center justify-between text-sm"><span className="text-white/45">{label}</span>{loading ? <span className="h-4 w-8 animate-pulse rounded bg-white/5" /> : enabled ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <X className="h-4 w-4 text-white/20" />}</div>)}</div>{capabilities?.daysRemaining != null && <p className="mt-4 text-xs text-white/30">Осталось дней: {capabilities.daysRemaining}</p>}<Link href="/pricing" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-purple-500/15 px-4 py-3 text-sm font-bold text-purple-200 no-underline hover:bg-purple-500/20">Тарифы <ExternalLink className="h-4 w-4" /></Link></section>

                <section className="rounded-3xl border border-white/[0.07] bg-white/[0.03] p-6"><div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-300"><Building2 className="h-5 w-5" /></div><h2 className="font-bold text-white">{company?.brandName ?? 'Компания'}</h2>{company ? <dl className="mt-4 space-y-3 text-sm"><div><dt className="text-white/30">Юридическое название</dt><dd className="mt-1 text-white/70">{company.legalName}</dd></div><div><dt className="text-white/30">ИНН</dt><dd className="mt-1 font-mono text-white/70">{company.inn}</dd></div><div><dt className="text-white/30">Телефон</dt><dd className="mt-1 text-white/70">{company.phone || 'Не указан'}</dd></div></dl> : <p className="mt-2 text-sm leading-6 text-white/35">Юридические данные ещё не отправлены.</p>}<Link href="/sell" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-white/55 no-underline hover:text-white">{company ? 'Посмотреть заявку' : 'Заполнить данные'} <ExternalLink className="h-4 w-4" /></Link></section>

                <section className="rounded-3xl border border-white/[0.07] bg-white/[0.03] p-6"><div className="flex items-center gap-3"><BarChart3 className="h-5 w-5 text-white/35" /><div><h2 className="text-sm font-bold text-white">Профиль и безопасность</h2><p className="mt-1 text-xs text-white/35">{user?.email}</p></div></div><Link href="/profile" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-purple-300 no-underline">Открыть общий профиль <ExternalLink className="h-4 w-4" /></Link></section>
            </div>
        </div>
    </div>;
}
