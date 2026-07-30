'use client';

import React, { useState, useEffect } from 'react';
import { ShoppingBag, Eye, EyeOff, Archive, RefreshCw, Pencil, Search, X, CheckCircle2, XCircle } from 'lucide-react';
import api, { Offer } from '@/lib/api';

export default function AdminOffers() {
    const [offers, setOffers] = useState<Offer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [moderatingId, setModeratingId] = useState<string | null>(null);
    const [editing, setEditing] = useState<Offer | null>(null);
    const [form, setForm] = useState({ title: '', description: '', price: 0, discountPercent: 0, category: '', isActive: true });

    const fetchOffers = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.admin.getOffers({ search, status });
            setOffers(res.offers);
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Не удалось загрузить офферы');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = window.setTimeout(() => { void fetchOffers(); }, 250);
        return () => window.clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, status]);

    const toggleOfferStatus = async (id: string, currentStatus: boolean) => {
        try {
            await api.admin.updateOffer(id, { isActive: !currentStatus });
            await fetchOffers();
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Не удалось обновить статус');
        }
    };

    const deleteOffer = async (id: string) => {
        if (!window.confirm('Архивировать оффер? Он исчезнет из каталога, но история покупок сохранится.')) return;
        try {
            await api.admin.archiveOffer(id);
            await fetchOffers();
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Не удалось архивировать оффер');
        }
    };

    const moderateOffer = async (offer: Offer, nextStatus: 'APPROVED' | 'REJECTED') => {
        let note = '';
        if (nextStatus === 'REJECTED') {
            const reason = window.prompt('Укажите причину отказа. Она будет видна продавцу:', offer.moderationNote || '');
            if (reason === null) return;
            note = reason.trim();
            if (!note) {
                setError('Для отказа необходимо указать причину');
                return;
            }
        }
        setModeratingId(offer.id);
        setError(null);
        try {
            await api.admin.moderateOffer(offer.id, nextStatus, note);
            await fetchOffers();
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Не удалось сохранить решение модерации');
        } finally {
            setModeratingId(null);
        }
    };

    const openEdit = (offer: Offer) => {
        setEditing(offer);
        setForm({
            title: offer.title,
            description: offer.description,
            price: offer.price,
            discountPercent: offer.discountPercent ?? 0,
            category: offer.category,
            isActive: offer.isActive,
        });
    };

    const saveEdit = async () => {
        if (!editing) return;
        setLoading(true);
        setError(null);
        try {
            await api.admin.updateOffer(editing.id, {
                ...form,
                price: Math.round(Number(form.price)),
                discountPercent: Math.round(Number(form.discountPercent)),
            });
            setEditing(null);
            await fetchOffers();
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Не удалось сохранить оффер');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in fade-in-up">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Товары платформы</h1>
                    <p className="text-white/40">Модерация, блокировка и удаление</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Название или продавец" className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white outline-none" />
                    </div>
                    <select value={status} onChange={(event) => setStatus(event.target.value)} className="bg-[#101524] border border-white/10 rounded-xl px-3 py-2 text-sm text-white">
                        <option value="">Все статусы</option>
                        <option value="ACTIVE">Активные</option>
                        <option value="INACTIVE">Скрытые</option>
                        <option value="PENDING">Ожидают проверки</option>
                        <option value="APPROVED">Одобренные</option>
                        <option value="REJECTED">Отклонённые</option>
                    </select>
                    <button onClick={fetchOffers} title="Обновить список" className="p-2 rounded-xl bg-white/5 text-white/60 hover:text-white cursor-pointer border-0">
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {error && <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300">{error}</div>}

            <div className="bg-[#101524]/60 backdrop-blur-xl rounded-3xl border border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/5">
                                <th className="py-4 px-6 text-xs font-semibold text-white/40 uppercase tracking-wider">Товар</th>
                                <th className="py-4 px-6 text-xs font-semibold text-white/40 uppercase tracking-wider">Продавец</th>
                                <th className="py-4 px-6 text-xs font-semibold text-white/40 uppercase tracking-wider">Цена</th>
                                <th className="py-4 px-6 text-xs font-semibold text-white/40 uppercase tracking-wider">Статус</th>
                                <th className="py-4 px-6 text-right text-xs font-semibold text-white/40 uppercase tracking-wider">Действия</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading && offers.length === 0 ? (
                                <tr><td colSpan={5} className="py-8 text-center text-white/40">Загрузка...</td></tr>
                            ) : offers.length === 0 ? (
                                <tr><td colSpan={5} className="py-8 text-center text-white/40">Товары не найдены</td></tr>
                            ) : offers.map(offer => (
                                <tr key={offer.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center shrink-0 border border-white/5">
                                                <ShoppingBag className="w-5 h-5 text-indigo-400" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-white text-sm line-clamp-1">{offer.title}</div>
                                                <div className="text-xs text-white/30">{offer.category}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="text-sm text-white">{offer.seller?.displayName || offer.seller?.email || 'Неизвестно'}</div>
                                    </td>
                                    <td className="py-4 px-6 font-mono text-sm text-green-400 font-bold">
                                        {offer.price.toLocaleString('ru-RU')} сум
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex flex-col items-start gap-1.5">
                                            <ModerationBadge status={offer.moderationStatus} />
                                            <span className={`text-[11px] ${offer.isActive ? 'text-emerald-400/70' : 'text-white/30'}`}>
                                                {offer.isActive ? 'В каталоге' : 'Не опубликован'}
                                            </span>
                                            {offer.moderationNote && <span className="max-w-56 text-[11px] leading-4 text-red-300/70" title={offer.moderationNote}>{offer.moderationNote}</span>}
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {offer.moderationStatus !== 'APPROVED' && (
                                                <button
                                                    disabled={moderatingId === offer.id}
                                                    onClick={() => void moderateOffer(offer, 'APPROVED')}
                                                    title="Одобрить и опубликовать"
                                                    className="p-2 rounded-xl bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-all border-0 cursor-pointer disabled:opacity-40"
                                                >
                                                    <CheckCircle2 className="w-4 h-4" />
                                                </button>
                                            )}
                                            {offer.moderationStatus !== 'REJECTED' && (
                                                <button
                                                    disabled={moderatingId === offer.id}
                                                    onClick={() => void moderateOffer(offer, 'REJECTED')}
                                                    title="Отклонить с причиной"
                                                    className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all border-0 cursor-pointer disabled:opacity-40"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => openEdit(offer)}
                                                title="Редактировать"
                                                className="p-2 rounded-xl bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-all border-0 cursor-pointer"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            {offer.moderationStatus === 'APPROVED' && (
                                                <button
                                                    onClick={() => toggleOfferStatus(offer.id, offer.isActive)}
                                                    title={offer.isActive ? 'Скрыть из каталога' : 'Вернуть в каталог'}
                                                    className={`p-2 rounded-xl transition-all border-0 cursor-pointer ${offer.isActive ? 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20' : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                                                        }`}
                                                >
                                                    {offer.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            )}
                                            <button
                                                onClick={() => deleteOffer(offer.id)}
                                                title="Архивировать"
                                                className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all border-0 cursor-pointer"
                                            >
                                                <Archive className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {editing && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <button aria-label="Закрыть" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setEditing(null)} />
                    <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#141928] border border-white/10 p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white">Редактировать оффер</h2>
                            <button onClick={() => setEditing(null)} className="p-2 text-white/50"><X className="w-5 h-5" /></button>
                        </div>
                        <label className="block text-xs text-white/50">Название
                            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="mt-2 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" />
                        </label>
                        <label className="block text-xs text-white/50">Описание
                            <textarea rows={5} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-2 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" />
                        </label>
                        <div className="grid md:grid-cols-3 gap-3">
                            <label className="text-xs text-white/50">Цена, сум
                                <input type="number" min={0} max={100000000} step={1000} value={form.price} onChange={(event) => setForm({ ...form, price: Number(event.target.value) })} className="mt-2 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" />
                            </label>
                            <label className="text-xs text-white/50">Скидка, %
                                <input type="number" min={0} max={100} value={form.discountPercent} onChange={(event) => setForm({ ...form, discountPercent: Number(event.target.value) })} className="mt-2 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" />
                            </label>
                            <label className="text-xs text-white/50">Категория
                                <input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value.toUpperCase() })} className="mt-2 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" />
                            </label>
                        </div>
                        <label className="flex items-center gap-3 text-sm text-white/70">
                            <input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />
                            Показывать в каталоге
                        </label>
                        <button disabled={loading || !form.title.trim() || !form.description.trim()} onClick={() => void saveEdit()} className="w-full py-4 rounded-xl bg-purple-600 text-white font-bold disabled:opacity-40">
                            Сохранить изменения
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function ModerationBadge({ status }: { status?: Offer['moderationStatus'] }) {
    const meta = status === 'PENDING'
        ? { label: 'На проверке', className: 'bg-amber-500/10 text-amber-300 border-amber-500/20' }
        : status === 'REJECTED'
            ? { label: 'Отклонён', className: 'bg-red-500/10 text-red-300 border-red-500/20' }
            : { label: 'Одобрен', className: 'bg-green-500/10 text-green-300 border-green-500/20' };
    return <span className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${meta.className}`}>{meta.label}</span>;
}
