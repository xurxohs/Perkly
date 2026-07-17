'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
    AlertCircle, Archive, BarChart3, Copy, Pause, Percent, Play, Plus,
    RefreshCw, Sparkles, TicketPercent, Users, X,
} from 'lucide-react';
import {
    Offer, Promocode, PromocodeAnalytics, PromocodeCodeType, PromocodeStatus,
    promocodesApi, sellerApi,
} from '@/lib/api';

const STATUS_META: Record<PromocodeStatus, { label: string; className: string }> = {
    ACTIVE: { label: 'Активен', className: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' },
    PAUSED: { label: 'На паузе', className: 'border-amber-500/20 bg-amber-500/10 text-amber-300' },
    ARCHIVED: { label: 'В архиве', className: 'border-white/10 bg-white/5 text-white/40' },
};

const EMPTY_FORM = {
    title: '', description: '', codeType: 'STATIC' as PromocodeCodeType, code: '',
    discountValue: 10, maxActivations: '', perUserLimit: 1, offerId: '', validTo: '',
};

export default function VendorPromocodesPage() {
    const [promocodes, setPromocodes] = useState<Promocode[]>([]);
    const [analytics, setAnalytics] = useState<PromocodeAnalytics | null>(null);
    const [offers, setOffers] = useState<Offer[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState<'ALL' | PromocodeStatus>('ALL');
    const [form, setForm] = useState(EMPTY_FORM);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [promocodeData, analyticsData, offerData] = await Promise.all([
                promocodesApi.listMine(), promocodesApi.analytics(), sellerApi.getOffers(),
            ]);
            setPromocodes(promocodeData);
            setAnalytics(analyticsData);
            setOffers(offerData);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить промокоды');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const visiblePromocodes = useMemo(
        () => statusFilter === 'ALL' ? promocodes : promocodes.filter((item) => item.status === statusFilter),
        [promocodes, statusFilter],
    );

    const createPromocode = async (event: FormEvent) => {
        event.preventDefault();
        setError(null);
        if (form.codeType === 'STATIC' && !form.code.trim()) {
            setError('Укажите код для статического промокода.');
            return;
        }
        setSaving(true);
        try {
            await promocodesApi.create({
                title: form.title.trim(),
                description: form.description.trim() || undefined,
                codeType: form.codeType,
                code: form.codeType === 'STATIC' ? form.code.trim().toUpperCase() : undefined,
                discountValue: form.discountValue,
                maxActivations: form.maxActivations ? Number(form.maxActivations) : null,
                perUserLimit: form.perUserLimit,
                offerId: form.offerId || null,
                validTo: form.validTo || null,
                status: 'ACTIVE',
            });
            setForm(EMPTY_FORM);
            setIsCreateOpen(false);
            await load();
        } catch (createError) {
            setError(createError instanceof Error ? createError.message : 'Не удалось создать промокод');
        } finally {
            setSaving(false);
        }
    };

    const updateStatus = async (id: string, status: PromocodeStatus) => {
        setUpdatingId(id);
        setError(null);
        try {
            const updated = await promocodesApi.updateStatus(id, status);
            setPromocodes((items) => items.map((item) => item.id === id ? { ...item, status: updated.status } : item));
            setAnalytics(await promocodesApi.analytics());
        } catch (statusError) {
            setError(statusError instanceof Error ? statusError.message : 'Не удалось изменить статус');
        } finally {
            setUpdatingId(null);
        }
    };

    const summaryCards = [
        { label: 'Активные', value: analytics ? `${analytics.summary.activePromocodes} / ${analytics.summary.totalPromocodes}` : '—', icon: TicketPercent },
        { label: 'Активации', value: analytics?.summary.totalActivations ?? '—', icon: Users },
        { label: 'Скопировали', value: analytics ? `${analytics.summary.copyRate}%` : '—', icon: Copy },
        { label: 'Использовали', value: analytics ? `${analytics.summary.useRate}%` : '—', icon: BarChart3 },
    ];

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div><h1 className="mb-2 text-3xl font-bold text-white">Промокоды</h1><p className="text-white/45">Скидки для всей компании или отдельного товара.</p></div>
                <div className="flex gap-2">
                    <button onClick={() => void load()} disabled={loading} className="rounded-xl border border-white/10 bg-white/5 p-3 text-white/60 disabled:opacity-40" aria-label="Обновить"><RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} /></button>
                    <button onClick={() => { setError(null); setIsCreateOpen(true); }} className="inline-flex items-center gap-2 rounded-xl bg-purple-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-purple-500/20 transition hover:bg-purple-400"><Plus className="h-4 w-4" /> Создать</button>
                </div>
            </div>

            {error && <div className="mb-5 flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300"><AlertCircle className="h-5 w-5 shrink-0" />{error}</div>}

            <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
                {summaryCards.map((card) => <article key={card.label} className="rounded-3xl border border-white/[0.07] bg-white/[0.03] p-5"><card.icon className="mb-4 h-5 w-5 text-purple-300" /><p className="text-xl font-black text-white">{loading ? '—' : card.value}</p><p className="mt-1 text-xs text-white/35">{card.label}</p></article>)}
            </div>

            <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
                {(['ALL', 'ACTIVE', 'PAUSED', 'ARCHIVED'] as const).map((status) => <button key={status} onClick={() => setStatusFilter(status)} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold ${statusFilter === status ? 'border-purple-400/35 bg-purple-500/15 text-purple-200' : 'border-white/10 bg-white/[0.03] text-white/45'}`}>{status === 'ALL' ? 'Все' : STATUS_META[status].label}</button>)}
            </div>

            {loading && promocodes.length === 0 ? (
                <div className="grid gap-4 lg:grid-cols-2">{[0, 1, 2, 3].map((item) => <div key={item} className="h-52 animate-pulse rounded-3xl bg-white/[0.035]" />)}</div>
            ) : visiblePromocodes.length === 0 ? (
                <div className="flex flex-col items-center rounded-3xl border border-dashed border-white/10 px-6 py-20 text-center"><Sparkles className="mb-4 h-10 w-10 text-purple-300/30" /><h2 className="font-bold text-white">Промокодов здесь пока нет</h2><p className="mt-2 max-w-sm text-sm text-white/35">Создайте код, задайте срок и лимит — статистика появится после первых активаций.</p></div>
            ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                    {visiblePromocodes.map((promo) => {
                        const itemAnalytics = analytics?.promocodes.find((item) => item.id === promo.id);
                        return <article key={promo.id} className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-5 sm:p-6">
                            <div className="flex items-start justify-between gap-4"><div className="min-w-0"><div className="mb-2 flex flex-wrap items-center gap-2"><h2 className="truncate font-bold text-white">{promo.title}</h2><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${STATUS_META[promo.status].className}`}>{STATUS_META[promo.status].label}</span></div><p className="text-xs text-white/35">{promo.offer?.title ?? 'Вся компания'}</p></div><span className="shrink-0 text-xl font-black text-emerald-300">−{promo.discountValue}%</span></div>
                            <div className="my-5 flex items-center justify-between rounded-2xl border border-white/[0.06] bg-black/15 px-4 py-3"><div><p className="text-[10px] uppercase tracking-wider text-white/25">{promo.codeType === 'STATIC' ? 'Статический код' : 'Динамический код'}</p><p className="mt-1 font-mono text-sm font-bold tracking-wider text-white/80">{promo.code ?? 'Создаётся при активации'}</p></div><Percent className="h-5 w-5 text-white/20" /></div>
                            <div className="grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-white/[0.03] p-3"><p className="font-bold text-white">{promo._count?.activations ?? 0}{promo.maxActivations ? ` / ${promo.maxActivations}` : ''}</p><p className="mt-1 text-[10px] text-white/30">активаций</p></div><div className="rounded-xl bg-white/[0.03] p-3"><p className="font-bold text-purple-300">{itemAnalytics?.copyRate ?? 0}%</p><p className="mt-1 text-[10px] text-white/30">скопировали</p></div><div className="rounded-xl bg-white/[0.03] p-3"><p className="font-bold text-emerald-300">{itemAnalytics?.useRate ?? 0}%</p><p className="mt-1 text-[10px] text-white/30">использовали</p></div></div>
                            <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-4"><p className="text-xs text-white/30">{promo.validTo ? `До ${new Date(promo.validTo).toLocaleDateString('ru-RU')}` : 'Без срока'} · до {promo.perUserLimit} на пользователя</p><div className="flex gap-2">{promo.status !== 'ACTIVE' && <button disabled={updatingId === promo.id} onClick={() => void updateStatus(promo.id, 'ACTIVE')} className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-300 disabled:opacity-40" aria-label="Активировать"><Play className="h-4 w-4" /></button>}{promo.status === 'ACTIVE' && <button disabled={updatingId === promo.id} onClick={() => void updateStatus(promo.id, 'PAUSED')} className="rounded-xl bg-amber-500/10 p-2.5 text-amber-300 disabled:opacity-40" aria-label="Поставить на паузу"><Pause className="h-4 w-4" /></button>}{promo.status !== 'ARCHIVED' && <button disabled={updatingId === promo.id} onClick={() => void updateStatus(promo.id, 'ARCHIVED')} className="rounded-xl bg-white/5 p-2.5 text-white/40 disabled:opacity-40" aria-label="Архивировать"><Archive className="h-4 w-4" /></button>}</div></div>
                        </article>;
                    })}
                </div>
            )}

            {isCreateOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xl"><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-white/10 bg-[#111626] p-6 shadow-2xl sm:p-8"><div className="mb-7 flex items-start justify-between"><div><h2 className="text-2xl font-bold text-white">Новый промокод</h2><p className="mt-1 text-sm text-white/40">Настройте скидку и ограничения.</p></div><button onClick={() => setIsCreateOpen(false)} className="rounded-xl bg-white/5 p-2.5 text-white/50" aria-label="Закрыть"><X className="h-5 w-5" /></button></div>
                <form onSubmit={createPromocode} className="space-y-5">
                    <label className="block text-sm text-white/50">Название<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-purple-400/60" placeholder="Летняя скидка" /></label>
                    <label className="block text-sm text-white/50">Описание<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-2 min-h-20 w-full resize-y rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" placeholder="Условия для покупателя" /></label>
                    <div className="grid gap-4 sm:grid-cols-3"><label className="text-sm text-white/50">Скидка, %<input type="number" min="1" max="100" required value={form.discountValue} onChange={(event) => setForm({ ...form, discountValue: Number(event.target.value) })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white" /></label><label className="text-sm text-white/50">Тип<select value={form.codeType} onChange={(event) => setForm({ ...form, codeType: event.target.value as PromocodeCodeType, code: event.target.value === 'DYNAMIC' ? '' : form.code })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#1a2031] px-4 py-3 text-white"><option value="STATIC">Статический</option><option value="DYNAMIC">Динамический</option></select></label><label className="text-sm text-white/50">Код<input disabled={form.codeType === 'DYNAMIC'} required={form.codeType === 'STATIC'} value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono uppercase text-white disabled:opacity-35" placeholder="PERKLY10" /></label></div>
                    <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm text-white/50">Привязать к товару<select value={form.offerId} onChange={(event) => setForm({ ...form, offerId: event.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#1a2031] px-4 py-3 text-white"><option value="">Вся компания</option>{offers.map((offer) => <option key={offer.id} value={offer.id}>{offer.title}</option>)}</select></label><label className="text-sm text-white/50">Действует до<input type="date" value={form.validTo} onChange={(event) => setForm({ ...form, validTo: event.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white" /></label></div>
                    <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm text-white/50">Общий лимит<input type="number" min="1" value={form.maxActivations} onChange={(event) => setForm({ ...form, maxActivations: event.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white" placeholder="Без лимита" /></label><label className="text-sm text-white/50">На пользователя<input type="number" min="1" required value={form.perUserLimit} onChange={(event) => setForm({ ...form, perUserLimit: Number(event.target.value) })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white" /></label></div>
                    <button disabled={saving} className="w-full rounded-xl bg-purple-500 py-3.5 font-bold text-white transition hover:bg-purple-400 disabled:opacity-50">{saving ? 'Создаём…' : 'Создать промокод'}</button>
                </form></div></div>}
        </div>
    );
}
