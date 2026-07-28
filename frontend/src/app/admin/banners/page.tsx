'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Eye, EyeOff, ImagePlus, Loader2, Save, Trash2 } from 'lucide-react';
import api, { CatalogBanner } from '@/lib/api';

const fileToDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file);
});
const imageSize = (src: string) => new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new window.Image(); image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight }); image.onerror = reject; image.src = src;
});

export default function AdminBannersPage() {
    const [items, setItems] = useState<CatalogBanner[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = async () => { setLoading(true); setError(null); try { setItems(await api.admin.getCatalogBanners()); } catch (e) { setError(e instanceof Error ? e.message : 'Не удалось загрузить баннеры'); } finally { setLoading(false); } };
    useEffect(() => { void load(); }, []);

    const upload = async (file: File) => {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('Выберите JPG, PNG или WebP.'); return; }
        if (file.size > 12 * 1024 * 1024) { setError('Файл должен быть меньше 12 МБ.'); return; }
        setUploading(true); setError(null);
        try {
            const dataUrl = await fileToDataUrl(file); const size = await imageSize(dataUrl);
            const media = await api.admin.uploadTopkaMedia({ fileName: file.name, dataUrl, variant: 'catalog-banner' });
            await api.admin.createCatalogBanner({ imageUrl: media.url, width: size.width, height: size.height, href: '/catalog', altText: 'Баннер Perkly', sortOrder: items.length, isActive: true });
            await load();
        } catch (e) { setError(e instanceof Error ? e.message : 'Не удалось загрузить баннер'); }
        finally { setUploading(false); }
    };

    const update = async (item: CatalogBanner, patch: Partial<CatalogBanner>) => {
        setError(null); try { const saved = await api.admin.updateCatalogBanner(item.id, patch); setItems((current) => current.map((value) => value.id === item.id ? saved : value)); } catch (e) { setError(e instanceof Error ? e.message : 'Не удалось сохранить баннер'); }
    };
    const remove = async (item: CatalogBanner) => {
        if (!window.confirm('Удалить баннер из каталога?')) return;
        try { await api.admin.deleteCatalogBanner(item.id); setItems((current) => current.filter((value) => value.id !== item.id)); } catch (e) { setError(e instanceof Error ? e.message : 'Не удалось удалить баннер'); }
    };

    return <div className="space-y-7">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="text-3xl font-bold text-white">Баннеры каталога</h1><p className="mt-2 text-sm text-white/40">Одна оригинальная фотография используется на всех устройствах без обрезки.</p></div><label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-black">{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}{uploading ? 'Загружаем' : 'Добавить баннер'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.currentTarget.value = ''; }} /></label></div>
        {error && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}
        <div className="rounded-2xl border border-blue-400/15 bg-blue-400/[0.07] p-4 text-sm leading-6 text-blue-100/70"><strong className="text-blue-100">Как подготовить:</strong> загружайте готовую фотографию со всем текстом внутри. Рекомендуемый формат — 1920 × 720 px. Каталог сохранит исходные пропорции, поэтому края не исчезнут ни на телефоне, ни на ПК.</div>
        {loading ? <div className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin text-white/30" /></div> : items.length === 0 ? <div className="rounded-3xl border border-dashed border-white/10 py-20 text-center text-white/35">Загрузите первый баннер — после этого он автоматически появится в каталоге.</div> : <div className="space-y-5">{items.map((item) => <article key={item.id} className="overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.025]">
            <div className="relative w-full bg-black" style={{ aspectRatio: `${item.width}/${item.height}` }}><Image src={item.imageUrl} alt={item.altText} fill sizes="100vw" className="object-contain" /></div>
            <div className="grid gap-4 p-5 lg:grid-cols-[1fr_1fr_110px_auto] lg:items-end">
                <label className="text-xs text-white/40">Ссылка после нажатия<input defaultValue={item.href} onBlur={(event) => { if (event.target.value !== item.href) void update(item, { href: event.target.value }); }} className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none" /></label>
                <label className="text-xs text-white/40">Описание для доступности<input defaultValue={item.altText} onBlur={(event) => { if (event.target.value !== item.altText) void update(item, { altText: event.target.value }); }} className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none" /></label>
                <label className="text-xs text-white/40">Порядок<input type="number" defaultValue={item.sortOrder} onBlur={(event) => void update(item, { sortOrder: Number(event.target.value) })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none" /></label>
                <div className="flex gap-2"><button onClick={() => void update(item, { isActive: !item.isActive })} className="rounded-xl bg-white/5 p-3 text-white/60" title={item.isActive ? 'Скрыть' : 'Показать'}>{item.isActive ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}</button><button onClick={() => void update(item, {})} className="rounded-xl bg-white/5 p-3 text-white/60" title="Сохранено"><Save className="h-5 w-5" /></button><button onClick={() => void remove(item)} className="rounded-xl bg-red-500/10 p-3 text-red-300" title="Удалить"><Trash2 className="h-5 w-5" /></button></div>
            </div>
        </article>)}</div>}
    </div>;
}
