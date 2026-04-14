"use client";

import { useAuth } from '@/lib/AuthContext';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, Tag, Flame, AlertCircle, Package } from 'lucide-react';
import Image from 'next/image';

// We'll use the CATEGORIES from your main page if available, or define them here for the form
const CATEGORIES = [
    { id: 'games', name: 'Игры' },
    { id: 'services', name: 'Программы подписки' },
    { id: 'coupons', name: 'Рестораны' },
    { id: 'education', name: 'Обучение' }
];

const API_BASE = typeof window !== 'undefined' ? '/api' : (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001');

interface Offer {
    id: string;
    title: string;
    description: string;
    category: string;
    price: number;
    isActive: boolean;
    vendorLogo?: string;
    isFlashDrop?: boolean;
}

export default function VendorProductsPage() {
    const { token } = useAuth();
    const [offers, setOffers] = useState<Offer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'games',
        price: '',
        isFree: false,
        hiddenData: '',
        isFlashDrop: false,
        vendorLogo: '',
        periodDays: '0'
    });

    const fetchMyOffers = useCallback(async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            // Using direct fetch with auth header for the new endpoint
            const res = await fetch(`${API_BASE}/offers/vendor/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setOffers(data);
            }
        } catch (error) {
            console.error("Failed to fetch offers", error);
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchMyOffers();
    }, [fetchMyOffers]);

    const handleCreateOffer = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                title: formData.title,
                description: formData.description,
                category: formData.category,
                price: formData.isFree ? 0 : Number(formData.price),
                hiddenData: formData.hiddenData,
                isFlashDrop: formData.isFlashDrop,
                vendorLogo: formData.vendorLogo || null,
                periodDays: Number(formData.periodDays) || 0,
                isActive: true
            };

            const res = await fetch(`${API_BASE}/offers/vendor`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setIsAddModalOpen(false);
                setFormData({ title: '', description: '', category: 'games', price: '', isFree: false, hiddenData: '', isFlashDrop: false, vendorLogo: '', periodDays: '0' });
                fetchMyOffers(); // Refresh list
            }
        } catch (error) {
            console.error("Failed to create offer", error);
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Мои Товары</h1>
                    <p className="text-white/50">Управление вашим каталогом продуктов.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-white/40 group-focus-within:text-purple-400 transition-colors" />
                        </div>
                        <input
                            type="text"
                            placeholder="Поиск товаров..."
                            className="bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white text-sm focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all w-64 placeholder:text-white/30 hover:bg-white/10"
                        />
                    </div>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-400 hover:to-blue-400 text-white px-5 py-3 rounded-xl font-medium shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all duration-300 hover:shadow-[0_0_25px_rgba(168,85,247,0.6)] hover:-translate-y-0.5"
                    >
                        <Plus className="w-5 h-5" />
                        Добавить Товар
                    </button>
                </div>
            </div>

            {/* Products Table Area */}
            <div className="rounded-3xl overflow-hidden glass-card shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 text-white/40 text-xs uppercase tracking-wider">
                                <th className="p-6 font-semibold">Товар</th>
                                <th className="p-6 font-semibold">Категория</th>
                                <th className="p-6 font-semibold">Цена</th>
                                <th className="p-6 font-semibold">Статус</th>
                                <th className="p-6 font-semibold text-right">Действия</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="p-10 text-center text-white/50">Загрузка товаров...</td>
                                </tr>
                            ) : offers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-16 text-center text-white/50">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                                                <Package className="w-8 h-8 text-white/20" />
                                            </div>
                                            <p>У вас пока нет добавленных товаров.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                offers.map((offer) => (
                                    <tr key={offer.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="p-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center overflow-hidden relative shrink-0">
                                                    {offer.vendorLogo ? (
                                                        <Image src={offer.vendorLogo} fill className="object-contain p-2" alt={offer.title} />
                                                    ) : (
                                                        <Tag className="w-5 h-5 text-white/30" />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-white mb-0.5 group-hover:text-purple-400 transition-colors flex items-center gap-2">
                                                        {offer.title}
                                                        {offer.isFlashDrop && <Flame className="w-3 h-3 text-orange-500" />}
                                                    </div>
                                                    <div className="text-xs text-white/40 line-clamp-1 max-w-xs">{offer.description}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-xs text-white/70">
                                                {offer.category}
                                            </span>
                                        </td>
                                        <td className="p-6">
                                            <span className={`font-semibold ${offer.price === 0 ? 'text-emerald-400' : 'text-white'}`}>
                                                {offer.price === 0 ? 'Бесплатно' : `$${offer.price}`}
                                            </span>
                                        </td>
                                        <td className="p-6">
                                            <span className="flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full w-fit">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Активен
                                            </span>
                                        </td>
                                        <td className="p-6 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="p-2 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors" title="Редактировать">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button className="p-2 hover:bg-red-500/20 rounded-lg text-white/50 hover:text-red-400 transition-colors" title="Удалить">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal: Create Item */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)} />
                    <div className="relative w-full max-w-2xl rounded-3xl overflow-hidden p-8 flex flex-col max-h-[90vh] glass-card-heavy shadow-2xl border border-white/10">
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                            <Plus className="w-6 h-6 text-purple-400" /> Добавить Новый Товар
                        </h2>

                        <form onSubmit={handleCreateOffer} className="space-y-5 overflow-y-auto pr-2 custom-scrollbar flex-1">
                            {/* Title & Category */}
                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium tracking-wide text-white/60 uppercase">Название</label>
                                    <input required type="text" placeholder="Например: Aura Pro 3D" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 transition-colors" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium tracking-wide text-white/60 uppercase">Категория</label>
                                    <select
                                        required
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 transition-colors appearance-none"
                                        title="Выберите категорию"
                                    >
                                        {CATEGORIES.map(c => <option key={c.id} value={c.id} className="bg-[#1a1f2e]">{c.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium tracking-wide text-white/60 uppercase">Описание</label>
                                <textarea required rows={3} placeholder="Опишите преимущества вашего товара..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 transition-colors resize-none" />
                            </div>

                            {/* Price & Duration */}
                            <div className="grid grid-cols-2 gap-5 items-end">
                                <div className={`space-y-1.5 transition-all duration-300 ${formData.isFree ? 'opacity-30 pointer-events-none' : ''}`}>
                                    <label className="text-xs font-medium tracking-wide text-white/60 uppercase">Цена ($)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-3 text-white/40">$</span>
                                        <input type="number" step="0.01" min="0" required={!formData.isFree} disabled={formData.isFree} value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="w-full bg-black/30 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-white focus:outline-none focus:border-purple-500/50 transition-colors" />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium tracking-wide text-white/60 uppercase">Длительность (дни, 0=бессрочно)</label>
                                    <input type="number" min="0" value={formData.periodDays} onChange={e => setFormData({ ...formData, periodDays: e.target.value })} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 transition-colors" />
                                </div>
                            </div>

                            <label 
                                className="flex items-center gap-3 bg-black/30 border border-white/10 rounded-xl px-4 py-3 cursor-pointer w-fit hover:bg-white/5 transition-colors"
                                title="Отдавать бесплатно"
                            >
                                <input 
                                    type="checkbox"
                                    className="sr-only"
                                    checked={formData.isFree}
                                    onChange={() => setFormData({ ...formData, isFree: !formData.isFree, price: '' })}
                                />
                                <div className={`w-10 h-6 rounded-full p-1 transition-colors ${formData.isFree ? 'bg-emerald-500' : 'bg-white/10'}`}>
                                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${formData.isFree ? 'translate-x-4' : 'translate-x-0'}`} />
                                </div>
                                <span className="font-medium text-white/90">Отдавать бесплатно</span>
                            </label>

                            {/* Hidden Data (Digital Item Delivery) */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium tracking-wide text-white/60 uppercase flex items-center gap-2">
                                    Скрытые данные <AlertCircle className="w-3 h-3 text-purple-400" />
                                </label>
                                <p className="text-[11px] text-white/40 mb-2 leading-relaxed">Это то, что получит покупатель после оплаты. Сюда можно вписать лицензионный ключ, ссылку на скачивание (Google Drive) или промокод.</p>
                                <textarea required rows={2} placeholder="Пример: XQZ-1234-ABCD или https://drive.google.com/..." value={formData.hiddenData} onChange={e => setFormData({ ...formData, hiddenData: e.target.value })} className="w-full bg-black/30 border border-purple-500/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors resize-none shadow-[inset_0_0_15px_rgba(168,85,247,0.1)] font-mono text-sm" />
                            </div>

                            {/* Logo URL & Flash Drop */}
                            <div className="grid grid-cols-2 gap-5 items-end pb-2">
                                <div className="space-y-1.5 flex-1">
                                    <label className="text-xs font-medium tracking-wide text-white/60 uppercase">Ссылка на Логотип (URL)</label>
                                    <input type="text" placeholder="https://..." value={formData.vendorLogo} onChange={e => setFormData({ ...formData, vendorLogo: e.target.value })} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 transition-colors text-sm" />
                                </div>
                                <label 
                                    className="flex items-center gap-3 bg-black/30 border border-white/10 rounded-xl px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors"
                                    title="Flash Drop"
                                >
                                    <input 
                                        type="checkbox"
                                        className="sr-only"
                                        checked={formData.isFlashDrop}
                                        onChange={() => setFormData({ ...formData, isFlashDrop: !formData.isFlashDrop })}
                                    />
                                    <div className={`w-10 h-6 rounded-full p-1 transition-colors ${formData.isFlashDrop ? 'bg-orange-500' : 'bg-white/10'}`}>
                                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${formData.isFlashDrop ? 'translate-x-4' : 'translate-x-0'}`} />
                                    </div>
                                    <span className="font-medium text-white/90 flex items-center gap-1.5"><Flame className="w-4 h-4 text-orange-500" /> Flash Drop</span>
                                </label>
                            </div>

                            {/* Actions */}
                            <div className="pt-6 mt-6 border-t border-white/10 flex justify-end gap-4 sticky bottom-0 bg-[#141928] pb-1">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-6 py-2.5 rounded-xl font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                                    Отмена
                                </button>
                                <button type="submit" className="px-6 py-2.5 rounded-xl font-medium text-white bg-purple-600 hover:bg-purple-500 transition-colors shadow-[0_0_15px_rgba(147,51,234,0.3)]">
                                    Создать товар
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.1);
                    border-radius: 10px;
                }
            `}</style>
        </div>
    );
}
