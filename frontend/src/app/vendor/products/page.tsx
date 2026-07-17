'use client';

import Image from 'next/image';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
    AlertCircle, Archive, Edit2, Flame, ImagePlus, Package, Plus, RefreshCw,
    Search, Sparkles, Tag, X,
} from 'lucide-react';
import { Offer, offersApi } from '@/lib/api';

const CATEGORIES = [
    ['RESTAURANTS', 'Рестораны и кафе'], ['MARKETPLACES', 'Маркетплейсы'],
    ['SUBSCRIPTIONS', 'Подписки'], ['GAMES', 'Игры'], ['COURSES', 'Обучение'],
    ['TOURISM', 'Туризм'], ['FITNESS', 'Фитнес'], ['OTHER', 'Другое'],
] as const;

const CATEGORY_NAMES = Object.fromEntries(CATEGORIES);

const FULFILLMENT_TYPES: { id: Offer['fulfillmentType']; name: string; hint: string }[] = [
    { id: 'PROMOCODE', name: 'Промокод', hint: 'Код и QR после покупки' },
    { id: 'DIGITAL_CODE', name: 'Цифровой код', hint: 'Ключ и QR после покупки' },
    { id: 'LINK', name: 'Ссылка', hint: 'Кнопка перехода без QR' },
    { id: 'INSTRUCTIONS', name: 'Обычный товар', hint: 'Инструкция без QR' },
];

type OfferForm = {
    title: string; description: string; category: string; fulfillmentType: Offer['fulfillmentType'];
    price: string; discountPercent: string; hiddenData: string; imageUrl: string;
    periodDays: string; isActive: boolean; isExclusive: boolean; isFlashDrop: boolean;
};

const EMPTY_FORM: OfferForm = {
    title: '', description: '', category: 'MARKETPLACES', fulfillmentType: 'INSTRUCTIONS',
    price: '', discountPercent: '0', hiddenData: '', imageUrl: '', periodDays: '0',
    isActive: true, isExclusive: false, isFlashDrop: false,
};

const formFromOffer = (offer: Offer): OfferForm => ({
    title: offer.title, description: offer.description, category: offer.category,
    fulfillmentType: offer.fulfillmentType ?? 'INSTRUCTIONS', price: String(offer.price),
    discountPercent: String(offer.discountPercent ?? 0), hiddenData: offer.hiddenData ?? '',
    imageUrl: offer.imageUrl ?? offer.vendorLogo ?? '', periodDays: '0', isActive: offer.isActive,
    isExclusive: offer.isExclusive, isFlashDrop: offer.isFlashDrop,
});

const fileToDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Не удалось прочитать изображение'));
    reader.readAsDataURL(file);
});

export default function VendorProductsPage() {
    const [offers, setOffers] = useState<Offer[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [archivingId, setArchivingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState<'ALL' | 'ACTIVE' | 'ARCHIVED'>('ALL');
    const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [form, setForm] = useState<OfferForm>(EMPTY_FORM);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try { setOffers(await offersApi.getMyOffers()); }
        catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить товары'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const visibleOffers = useMemo(() => {
        const query = search.trim().toLocaleLowerCase('ru-RU');
        return offers.filter((offer) => {
            if (status === 'ACTIVE' && !offer.isActive) return false;
            if (status === 'ARCHIVED' && offer.isActive) return false;
            return !query || [offer.title, offer.description, CATEGORY_NAMES[offer.category] ?? offer.category]
                .some((value) => value.toLocaleLowerCase('ru-RU').includes(query));
        });
    }, [offers, search, status]);

    const openCreate = () => { setEditingOffer(null); setForm(EMPTY_FORM); setError(null); setIsEditorOpen(true); };
    const openEdit = (offer: Offer) => { setEditingOffer(offer); setForm(formFromOffer(offer)); setError(null); setIsEditorOpen(true); };

    const uploadImage = async (file: File) => {
        if (file.size > 8 * 1024 * 1024) { setError('Изображение должно быть меньше 8 МБ.'); return; }
        setUploading(true); setError(null);
        try {
            const dataUrl = await fileToDataUrl(file);
            const uploaded = await offersApi.uploadVendorImage(dataUrl);
            setForm((current) => ({ ...current, imageUrl: uploaded.url }));
        } catch (uploadError) {
            setError(uploadError instanceof Error ? uploadError.message : 'Не удалось загрузить изображение');
        } finally { setUploading(false); }
    };

    const saveOffer = async (event: FormEvent) => {
        event.preventDefault(); setSaving(true); setError(null);
        const payload = {
            title: form.title.trim(), description: form.description.trim(), category: form.category,
            fulfillmentType: form.fulfillmentType, price: Number(form.price),
            discountPercent: Number(form.discountPercent || 0), hiddenData: form.hiddenData.trim(),
            vendorLogo: form.imageUrl || undefined, imageUrl: form.imageUrl || undefined,
            periodDays: Number(form.periodDays || 0), isActive: form.isActive,
            isExclusive: form.isExclusive, isFlashDrop: form.isFlashDrop,
        };
        try {
            if (editingOffer) await offersApi.updateVendorOffer(editingOffer.id, payload);
            else await offersApi.createVendor(payload);
            setIsEditorOpen(false); setEditingOffer(null); setForm(EMPTY_FORM); await load();
        } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Не удалось сохранить товар'); }
        finally { setSaving(false); }
    };

    const archiveOffer = async (offer: Offer) => {
        if (!window.confirm(`Архивировать «${offer.title}»? Товар исчезнет из каталога, история сделок сохранится.`)) return;
        setArchivingId(offer.id); setError(null);
        try {
            await offersApi.deleteVendorOffer(offer.id);
            setOffers((items) => items.map((item) => item.id === offer.id ? { ...item, isActive: false } : item));
        } catch (archiveError) { setError(archiveError instanceof Error ? archiveError.message : 'Не удалось архивировать товар'); }
        finally { setArchivingId(null); }
    };

    const stats = {
        all: offers.length, active: offers.filter((offer) => offer.isActive).length,
        flash: offers.filter((offer) => offer.isActive && offer.isFlashDrop).length,
        sales: offers.reduce((sum, offer) => sum + (offer._count?.transactions ?? 0), 0),
    };

    return <div className="animate-in fade-in slide-in-from-bottom-4 pb-20 duration-500">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div><h1 className="mb-2 text-3xl font-bold text-white">Товары</h1><p className="text-white/45">Каталог, выдача покупки и доступность предложений.</p></div>
            <div className="flex gap-2"><button onClick={() => void load()} disabled={loading} className="rounded-xl border border-white/10 bg-white/5 p-3 text-white/60 disabled:opacity-40" aria-label="Обновить"><RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} /></button><button onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-purple-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-purple-500/20 hover:bg-purple-400"><Plus className="h-4 w-4" /> Добавить товар</button></div>
        </div>

        {error && <div className="mb-5 flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300"><AlertCircle className="h-5 w-5 shrink-0" />{error}</div>}

        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">{[
            ['Всего', stats.all], ['Активные', stats.active], ['Flash Drop', stats.flash], ['Продажи', stats.sales],
        ].map(([label, value]) => <div key={label} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4"><p className="text-xl font-black text-white">{value}</p><p className="mt-1 text-xs text-white/35">{label}</p></div>)}</div>

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-2 overflow-x-auto">{(['ALL', 'ACTIVE', 'ARCHIVED'] as const).map((item) => <button key={item} onClick={() => setStatus(item)} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold ${status === item ? 'border-purple-400/35 bg-purple-500/15 text-purple-200' : 'border-white/10 bg-white/[0.03] text-white/45'}`}>{item === 'ALL' ? 'Все' : item === 'ACTIVE' ? 'Активные' : 'Архив'}</button>)}</div><label className="relative"><Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Найти товар" className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-purple-400/40 sm:w-64" /></label></div>

        {loading && offers.length === 0 ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((item) => <div key={item} className="h-64 animate-pulse rounded-3xl bg-white/[0.035]" />)}</div> : visibleOffers.length === 0 ? <div className="flex flex-col items-center rounded-3xl border border-dashed border-white/10 py-20 text-center"><Package className="mb-4 h-11 w-11 text-white/15" /><h2 className="font-bold text-white">Товаров не найдено</h2><p className="mt-2 text-sm text-white/35">{search ? 'Измените запрос или фильтр.' : 'Добавьте первое предложение в каталог.'}</p></div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visibleOffers.map((offer) => <article key={offer.id} className="group overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.025] transition hover:-translate-y-0.5 hover:border-white/[0.12]">
            <div className="relative h-40 bg-gradient-to-br from-white/[0.06] to-transparent">{offer.imageUrl || offer.vendorLogo ? <Image src={offer.imageUrl || offer.vendorLogo || ''} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-contain p-5" alt={offer.title} /> : <div className="flex h-full items-center justify-center"><Tag className="h-10 w-10 text-white/15" /></div>}<div className="absolute left-3 top-3 flex gap-2">{offer.isFlashDrop && <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/90 px-2.5 py-1 text-[10px] font-bold text-white"><Flame className="h-3 w-3" /> Flash</span>}{offer.isExclusive && <span className="rounded-full bg-purple-500/90 px-2.5 py-1 text-[10px] font-bold text-white">Exclusive</span>}</div></div>
            <div className="p-5"><div className="mb-2 flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="truncate font-bold text-white">{offer.title}</h2><p className="mt-1 text-xs text-white/35">{CATEGORY_NAMES[offer.category] ?? offer.category}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${offer.isActive ? 'bg-emerald-500/10 text-emerald-300' : 'bg-white/5 text-white/35'}`}>{offer.isActive ? 'Активен' : 'Архив'}</span></div><p className="line-clamp-2 min-h-10 text-sm leading-5 text-white/45">{offer.description}</p><div className="mt-5 flex items-end justify-between"><div><p className={`text-lg font-black ${offer.price === 0 ? 'text-emerald-300' : 'text-white'}`}>{offer.price === 0 ? 'Бесплатно' : `${offer.price.toLocaleString('ru-RU')} сум`}</p><p className="mt-1 text-[10px] text-white/25">{offer._count?.transactions ?? 0} продаж</p></div><div className="flex gap-2"><button onClick={() => openEdit(offer)} className="rounded-xl bg-white/5 p-2.5 text-white/55 hover:bg-white/10 hover:text-white" aria-label="Редактировать"><Edit2 className="h-4 w-4" /></button>{offer.isActive && <button disabled={archivingId === offer.id} onClick={() => void archiveOffer(offer)} className="rounded-xl bg-white/5 p-2.5 text-white/35 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-30" aria-label="Архивировать"><Archive className="h-4 w-4" /></button>}</div></div></div>
        </article>)}</div>}

        {isEditorOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xl"><div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-white/10 bg-[#111626] p-6 shadow-2xl sm:p-8"><div className="mb-7 flex items-start justify-between"><div><h2 className="text-2xl font-bold text-white">{editingOffer ? 'Редактировать товар' : 'Новый товар'}</h2><p className="mt-1 text-sm text-white/40">Одна форма для каталога и способа выдачи.</p></div><button onClick={() => setIsEditorOpen(false)} className="rounded-xl bg-white/5 p-2.5 text-white/50" aria-label="Закрыть"><X className="h-5 w-5" /></button></div>
            <form onSubmit={saveOffer} className="space-y-5"><div className="grid gap-4 sm:grid-cols-2"><Field label="Название"><input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="field" placeholder="Название товара" /></Field><Field label="Категория"><select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="field bg-[#1a2031]">{CATEGORIES.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></Field></div>
                <Field label="Описание"><textarea required rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="field resize-y" placeholder="Что получает покупатель" /></Field>
                <div className="grid gap-4 sm:grid-cols-3"><Field label="Цена, сум"><input type="number" min="0" max="100000000" required value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} className="field" /></Field><Field label="Скидка, %"><input type="number" min="0" max="100" value={form.discountPercent} onChange={(event) => setForm({ ...form, discountPercent: event.target.value })} className="field" /></Field><Field label="Срок, дней"><input type="number" min="0" max="3650" value={form.periodDays} onChange={(event) => setForm({ ...form, periodDays: event.target.value })} className="field" /></Field></div>
                <Field label="Как выдать покупку"><div className="grid gap-2 sm:grid-cols-2">{FULFILLMENT_TYPES.map((type) => <button type="button" key={type.id} onClick={() => setForm({ ...form, fulfillmentType: type.id })} className={`rounded-2xl border p-3 text-left ${form.fulfillmentType === type.id ? 'border-purple-400/40 bg-purple-500/10' : 'border-white/10 bg-white/[0.025]'}`}><p className="text-sm font-bold text-white">{type.name}</p><p className="mt-1 text-xs text-white/35">{type.hint}</p></button>)}</div></Field>
                <Field label={form.fulfillmentType === 'INSTRUCTIONS' ? 'Инструкция после покупки' : 'Скрытые данные после покупки'}><textarea required rows={2} value={form.hiddenData} onChange={(event) => setForm({ ...form, hiddenData: event.target.value })} className="field font-mono" placeholder="Код, ссылка или инструкция" /></Field>
                <Field label="Изображение"><div className="flex items-center gap-4">{form.imageUrl ? <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5"><Image src={form.imageUrl} fill sizes="80px" className="object-contain p-2" alt="Предпросмотр" /></div> : <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-dashed border-white/10"><ImagePlus className="h-6 w-6 text-white/20" /></div>}<label className="flex-1 cursor-pointer rounded-xl border border-dashed border-white/10 bg-white/[0.025] px-4 py-3 text-center text-sm text-white/55 hover:bg-white/5">{uploading ? 'Загружаем…' : form.imageUrl ? 'Заменить файл' : 'Выбрать файл'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file); }} /></label></div></Field>
                <div className="grid gap-3 sm:grid-cols-3"><Toggle checked={form.isActive} onChange={(value) => setForm({ ...form, isActive: value })} label="Активен" /><Toggle checked={form.isFlashDrop} onChange={(value) => setForm({ ...form, isFlashDrop: value })} label="Flash Drop" icon={<Flame className="h-4 w-4 text-orange-400" />} /><Toggle checked={form.isExclusive} onChange={(value) => setForm({ ...form, isExclusive: value })} label="Эксклюзив" icon={<Sparkles className="h-4 w-4 text-purple-300" />} /></div>
                <div className="flex justify-end gap-3 border-t border-white/[0.07] pt-5"><button type="button" onClick={() => setIsEditorOpen(false)} className="rounded-xl px-5 py-3 text-sm font-semibold text-white/50 hover:bg-white/5">Отмена</button><button disabled={saving || uploading} className="rounded-xl bg-purple-500 px-6 py-3 text-sm font-bold text-white hover:bg-purple-400 disabled:opacity-50">{saving ? 'Сохраняем…' : editingOffer ? 'Сохранить' : 'Создать товар'}</button></div>
            </form></div></div>}
        <style jsx global>{`.field{margin-top:.5rem;width:100%;border-radius:.75rem;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);padding:.75rem 1rem;color:white;outline:none}.field:focus{border-color:rgba(192,132,252,.55)}`}</style>
    </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return <label className="block text-sm text-white/50">{label}{children}</label>;
}

function Toggle({ checked, onChange, label, icon }: { checked: boolean; onChange: (value: boolean) => void; label: string; icon?: React.ReactNode }) {
    return <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`flex items-center gap-3 rounded-2xl border p-3 text-left ${checked ? 'border-purple-400/30 bg-purple-500/10' : 'border-white/10 bg-white/[0.025]'}`}><span className={`h-5 w-9 rounded-full p-0.5 transition ${checked ? 'bg-purple-500' : 'bg-white/10'}`}><span className={`block h-4 w-4 rounded-full bg-white transition ${checked ? 'translate-x-4' : ''}`} /></span>{icon}<span className="text-sm font-semibold text-white/75">{label}</span></button>;
}
