'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Archive, Clock, DollarSign, Package, Pause, Percent, Play, Plus, Ticket, TrendingUp, X } from 'lucide-react';
import api, { SellerStats, Offer, Promocode, PromocodeCodeType, PromocodeStatus } from '@/lib/api';
import Image from 'next/image';

const PROMOCODE_STATUS_META: Record<PromocodeStatus, { label: string; className: string }> = {
    ACTIVE: {
        label: 'Активен',
        className: 'bg-green-500/20 text-green-400',
    },
    PAUSED: {
        label: 'Пауза',
        className: 'bg-amber-500/20 text-amber-300',
    },
    ARCHIVED: {
        label: 'Архив',
        className: 'bg-white/10 text-white/40',
    },
};

export default function SellerDashboard() {
    const { user, isAuthenticated, loading } = useAuth();
    const router = useRouter();
    const canUseSellerDashboard = user?.role === 'VENDOR' || user?.role === 'ADMIN';
    const [stats, setStats] = useState<SellerStats | null>(null);
    const [offers, setOffers] = useState<Offer[]>([]);
    const [promocodes, setPromocodes] = useState<Promocode[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [promoError, setPromoError] = useState<string | null>(null);
    const [promoSaving, setPromoSaving] = useState(false);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
    const [newOffer, setNewOffer] = useState({
        title: '',
        description: '',
        price: 0,
        category: 'SUBSCRIPTIONS',
        hiddenData: '',
        latitude: null as number | null,
        longitude: null as number | null,
        periodDays: 30,
        isFlashDrop: false
    });
    const [newPromo, setNewPromo] = useState({
        title: '',
        description: '',
        codeType: 'STATIC' as PromocodeCodeType,
        code: '',
        discountValue: 10,
        maxActivations: '',
        perUserLimit: 1,
        offerId: '',
        validTo: '',
    });

    const fetchSellerData = async () => {
        const [statsRes, offersRes] = await Promise.all([
            api.seller.getStats(),
            api.seller.getOffers(),
        ]);
        setStats(statsRes);
        setOffers(offersRes);

        try {
            const promocodesRes = await api.promocodes.listMine();
            setPromocodes(promocodesRes);
        } catch (err) {
            console.warn('Failed to fetch promocodes', err);
            setPromocodes([]);
        }
    };

    useEffect(() => {
        if (!loading && (!isAuthenticated || !user)) {
            router.push('/login');
            return;
        }

        if (!loading && user && !canUseSellerDashboard) {
            setIsLoading(false);
            router.replace('/sell');
            return;
        }

        async function fetchData() {
            try {
                await fetchSellerData();
            } catch (err) {
                console.error('Failed to fetch seller data', err);
            } finally {
                setIsLoading(false);
            }
        }

        if (isAuthenticated && canUseSellerDashboard) {
            fetchData();
        }
    }, [isAuthenticated, loading, user, canUseSellerDashboard, router]);

    const handleCreateOffer = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.offers.createVendor(newOffer);
            setIsCreateModalOpen(false);
            setNewOffer({ title: '', description: '', price: 0, category: 'SUBSCRIPTIONS', hiddenData: '', latitude: null, longitude: null, periodDays: 30, isFlashDrop: false });
            await fetchSellerData();
        } catch (err) {
            alert('Failed to create offer: ' + (err instanceof Error ? err.message : String(err)));
        }
    };

    const handleCreatePromocode = async (e: React.FormEvent) => {
        e.preventDefault();
        setPromoError(null);

        if (newPromo.codeType === 'STATIC' && !newPromo.code.trim()) {
            setPromoError('Для STATIC промокода нужен код.');
            return;
        }

        setPromoSaving(true);
        try {
            await api.promocodes.create({
                title: newPromo.title,
                description: newPromo.description || undefined,
                codeType: newPromo.codeType,
                code: newPromo.codeType === 'STATIC' ? newPromo.code : undefined,
                discountValue: newPromo.discountValue,
                maxActivations: newPromo.maxActivations ? Number(newPromo.maxActivations) : null,
                perUserLimit: newPromo.perUserLimit,
                offerId: newPromo.offerId || null,
                validTo: newPromo.validTo || null,
                status: 'ACTIVE',
            });
            setIsPromoModalOpen(false);
            setNewPromo({
                title: '',
                description: '',
                codeType: 'STATIC',
                code: '',
                discountValue: 10,
                maxActivations: '',
                perUserLimit: 1,
                offerId: '',
                validTo: '',
            });
            await fetchSellerData();
        } catch (err) {
            setPromoError(err instanceof Error ? err.message : 'Не удалось создать промокод.');
        } finally {
            setPromoSaving(false);
        }
    };

    const handlePromocodeStatus = async (id: string, status: PromocodeStatus) => {
        setPromoError(null);
        try {
            const updated = await api.promocodes.updateStatus(id, status);
            setPromocodes((current) =>
                current.map((item) => item.id === id ? { ...item, status: updated.status } : item),
            );
        } catch (err) {
            setPromoError(err instanceof Error ? err.message : 'Не удалось обновить статус промокода.');
        }
    };

    const getCurrentLocation = () => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition((position) => {
                setNewOffer(prev => ({
                    ...prev,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                }));
            });
        }
    };

    if (!loading && user && !canUseSellerDashboard) {
        return null;
    }

    if (loading || isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-6 py-12">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Панель Продавца</h1>
                    <p className="text-gray-400">Управляйте вашими товарами и отслеживайте статистику продаж</p>
                </div>
                <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="px-6 py-3 rounded-xl text-white font-semibold flex items-center gap-2 border-0 cursor-pointer bg-gradient-to-br from-purple-500 to-pink-500 hover:opacity-90 transition-opacity">
                    <Package className="w-5 h-5" /> Добавить Товар
                </button>
            </div>

            {/* Create Offer Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 border-white/10">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-white">Новый товар</h2>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-white/40 hover:text-white bg-transparent border-0 cursor-pointer text-2xl">&times;</button>
                        </div>
                        <form onSubmit={handleCreateOffer} className="space-y-4">
                            <div>
                                <label htmlFor="offer-title" className="block text-sm text-white/50 mb-1">Название</label>
                                <input id="offer-title" type="text" required value={newOffer.title} onChange={e => setNewOffer({...newOffer, title: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-purple-500" placeholder="Напр: Подписка Netflix Premium" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="offer-price" className="block text-sm text-white/50 mb-1">Цена ($)</label>
                                    <input id="offer-price" type="number" step="0.01" required value={newOffer.price} onChange={e => setNewOffer({...newOffer, price: Number(e.target.value)})} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none" />
                                </div>
                                <div>
                                    <label htmlFor="offer-period" className="block text-sm text-white/50 mb-1">Период действия (дни)</label>
                                    <input id="offer-period" type="number" required value={newOffer.periodDays} onChange={e => setNewOffer({...newOffer, periodDays: Number(e.target.value)})} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none" />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="offer-category" className="block text-sm text-white/50 mb-1">Категория</label>
                                <select id="offer-category" value={newOffer.category} onChange={e => setNewOffer({...newOffer, category: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-[#1a1f2e] border border-white/10 text-white outline-none">
                                    <option value="SUBSCRIPTIONS">Подписки</option>
                                    <option value="RESTAURANTS">Рестораны и Кафе</option>
                                    <option value="GAMES">Игры</option>
                                    <option value="MARKETPLACES">Маркетплейсы</option>
                                </select>
                            </div>
                            
                            {/* Geofencing Fields */}
                            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                                <h3 className="text-sm font-bold text-blue-400 mb-3 flex items-center gap-2">📍 Геолокация (для функции &quot;Рядом со мной&quot;)</h3>
                                <div className="grid grid-cols-2 gap-2 mb-3">
                                    <input type="number" step="any" placeholder="Широта (Lat)" value={newOffer.latitude || ''} onChange={e => setNewOffer({...newOffer, latitude: e.target.value ? Number(e.target.value) : null})} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white" />
                                    <input type="number" step="any" placeholder="Долгота (Lng)" value={newOffer.longitude || ''} onChange={e => setNewOffer({...newOffer, longitude: e.target.value ? Number(e.target.value) : null})} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white" />
                                </div>
                                <button type="button" onClick={getCurrentLocation} className="text-xs text-blue-400 bg-blue-400/10 hover:bg-blue-400/20 px-3 py-1.5 rounded-lg border-0 cursor-pointer transition-colors">
                                    Определить моё местоположение
                                </button>
                                <p className="text-[10px] text-white/30 mt-2">Оставьте пустым, если товар цифровой (без физической точки).</p>
                            </div>

                            <div>
                                <label className="block text-sm text-white/50 mb-1">Описание</label>
                                <textarea value={newOffer.description} onChange={e => setNewOffer({...newOffer, description: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none h-24" placeholder="Подробности..."></textarea>
                            </div>
                            <div>
                                <label htmlFor="offer-hidden" className="block text-sm text-white/50 mb-1">Скрытые данные (Ключ/Ссылка)</label>
                                <input id="offer-hidden" type="text" required value={newOffer.hiddenData} onChange={e => setNewOffer({...newOffer, hiddenData: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none" placeholder="То, что увидит покупатель после оплаты" />
                            </div>
                            <button type="submit" className="w-full py-4 rounded-xl text-white font-bold cursor-pointer border-0 mt-4 bg-gradient-to-br from-purple-500 to-pink-500 hover:opacity-90 transition-opacity">Создать Оффер</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Promocode Modal */}
            {isPromoModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 border-white/10">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-white">Новый промокод</h2>
                                <p className="text-sm text-white/40 mt-1">Создайте скидку для оффера или всей компании.</p>
                            </div>
                            <button
                                onClick={() => setIsPromoModalOpen(false)}
                                className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 bg-transparent border-0 cursor-pointer"
                                title="Закрыть"
                                aria-label="Закрыть"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreatePromocode} className="space-y-4">
                            <div>
                                <label htmlFor="promo-title" className="block text-sm text-white/50 mb-1">Название</label>
                                <input
                                    id="promo-title"
                                    type="text"
                                    required
                                    value={newPromo.title}
                                    onChange={e => setNewPromo({ ...newPromo, title: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-purple-500"
                                    placeholder="Напр: Летняя скидка"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label htmlFor="promo-discount" className="block text-sm text-white/50 mb-1">Скидка (%)</label>
                                    <input
                                        id="promo-discount"
                                        type="number"
                                        min={1}
                                        max={100}
                                        required
                                        value={newPromo.discountValue}
                                        onChange={e => setNewPromo({ ...newPromo, discountValue: Number(e.target.value) })}
                                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="promo-type" className="block text-sm text-white/50 mb-1">Тип кода</label>
                                    <select
                                        id="promo-type"
                                        value={newPromo.codeType}
                                        onChange={e => setNewPromo({ ...newPromo, codeType: e.target.value as PromocodeCodeType, code: e.target.value === 'DYNAMIC' ? '' : newPromo.code })}
                                        className="w-full px-4 py-3 rounded-xl bg-[#1a1f2e] border border-white/10 text-white outline-none"
                                    >
                                        <option value="STATIC">STATIC</option>
                                        <option value="DYNAMIC">DYNAMIC</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="promo-code" className="block text-sm text-white/50 mb-1">Код</label>
                                    <input
                                        id="promo-code"
                                        type="text"
                                        disabled={newPromo.codeType === 'DYNAMIC'}
                                        required={newPromo.codeType === 'STATIC'}
                                        value={newPromo.code}
                                        onChange={e => setNewPromo({ ...newPromo, code: e.target.value.toUpperCase() })}
                                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none disabled:opacity-40"
                                        placeholder={newPromo.codeType === 'DYNAMIC' ? 'Создаётся автоматически' : 'SALE10'}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="promo-offer" className="block text-sm text-white/50 mb-1">Оффер</label>
                                    <select
                                        id="promo-offer"
                                        value={newPromo.offerId}
                                        onChange={e => setNewPromo({ ...newPromo, offerId: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl bg-[#1a1f2e] border border-white/10 text-white outline-none"
                                    >
                                        <option value="">Вся компания</option>
                                        {offers.map((offer) => (
                                            <option key={offer.id} value={offer.id}>
                                                {offer.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="promo-valid-to" className="block text-sm text-white/50 mb-1">Действует до</label>
                                    <input
                                        id="promo-valid-to"
                                        type="date"
                                        value={newPromo.validTo}
                                        onChange={e => setNewPromo({ ...newPromo, validTo: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="promo-max-activations" className="block text-sm text-white/50 mb-1">Общий лимит активаций</label>
                                    <input
                                        id="promo-max-activations"
                                        type="number"
                                        min={1}
                                        value={newPromo.maxActivations}
                                        onChange={e => setNewPromo({ ...newPromo, maxActivations: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none"
                                        placeholder="Без лимита"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="promo-per-user-limit" className="block text-sm text-white/50 mb-1">Лимит на пользователя</label>
                                    <input
                                        id="promo-per-user-limit"
                                        type="number"
                                        min={1}
                                        required
                                        value={newPromo.perUserLimit}
                                        onChange={e => setNewPromo({ ...newPromo, perUserLimit: Number(e.target.value) })}
                                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="promo-description" className="block text-sm text-white/50 mb-1">Описание</label>
                                <textarea
                                    id="promo-description"
                                    value={newPromo.description}
                                    onChange={e => setNewPromo({ ...newPromo, description: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none h-24"
                                    placeholder="Короткое описание для команды и будущего UI."
                                />
                            </div>

                            {promoError && (
                                <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-300">
                                    {promoError}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={promoSaving}
                                className="w-full py-4 rounded-xl text-white font-bold cursor-pointer border-0 mt-4 bg-gradient-to-br from-purple-500 to-pink-500 hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                                {promoSaving ? 'Создаём...' : 'Создать промокод'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                <div className="glass-card p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-green-500/20 text-green-400">
                            <DollarSign className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-400">Общий доход</p>
                            <h3 className="text-2xl font-bold text-white">${stats?.totalEarnings?.toFixed(2) || '0.00'}</h3>
                        </div>
                    </div>
                </div>

                <div className="glass-card p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-500/20 text-blue-400">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-400">Всего продаж</p>
                            <h3 className="text-2xl font-bold text-white">{stats?.totalSales || 0} шт.</h3>
                        </div>
                    </div>
                </div>

                <div className="glass-card p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-purple-500/20 text-purple-400">
                            <Package className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-400">Активные товары</p>
                            <h3 className="text-2xl font-bold text-white">{stats?.activeOffers || 0}</h3>
                        </div>
                    </div>
                </div>

                <div className="glass-card p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-orange-500/20 text-orange-400">
                            <Clock className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-400">Новых сделок</p>
                            <h3 className="text-2xl font-bold text-white">{stats?.recentTransactions?.length || 0}</h3>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Active Offers List */}
                <div className="lg:col-span-2 glass-card p-6">
                    <h2 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-4">Ваши Товары</h2>

                    {offers.length === 0 ? (
                        <div className="text-center py-12">
                            <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-400 mb-4">У вас пока нет добавленных товаров</p>
                            <Link href="/sell" className="text-purple-400 hover:text-purple-300 font-medium">Создать первый оффер</Link>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {offers.map((offer) => (
                                <div key={offer.id} className="flex items-center justify-between p-4 rounded-xl relative hover:bg-white/5 border border-white/5 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 bg-white/10 rounded-lg flex-shrink-0 flex items-center justify-center relative overflow-hidden">
                                            {offer.vendorLogo ? (
                                                <Image src={offer.vendorLogo} alt={offer.title} width={64} height={64} className="w-full h-full object-cover" />
                                            ) : (
                                                <Package className="w-6 h-6 text-gray-400" />
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-white">{offer.title}</h4>
                                            <p className="text-sm text-gray-400">{offer.category}</p>
                                            <div className="flex items-center gap-3 mt-1 text-xs">
                                                <span className="text-green-400 font-medium">${offer.price}</span>
                                                <span className="text-gray-500">•</span>
                                                <span className="text-gray-400">Продаж: {offer._count?.transactions || 0}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${offer.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                            {offer.isActive ? 'Активен' : 'Скрыт'}
                                        </span>
                                        <button className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
                                            Ред.
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="space-y-8">
                {/* Promocodes List */}
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between gap-4 mb-6 border-b border-white/10 pb-4">
                        <div>
                            <h2 className="text-xl font-bold text-white">Промокоды</h2>
                            <p className="text-xs text-white/35 mt-1">{promocodes.length} всего</p>
                        </div>
                        <button
                            onClick={() => { setPromoError(null); setIsPromoModalOpen(true); }}
                            className="p-2 rounded-lg bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 transition-colors border border-purple-500/20 cursor-pointer"
                            title="Добавить промокод"
                            aria-label="Добавить промокод"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>

                    {promoError && !isPromoModalOpen && (
                        <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-300">
                            {promoError}
                        </div>
                    )}

                    {promocodes.length === 0 ? (
                        <div className="text-center py-8 px-4">
                            <Ticket className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-400 text-sm mb-4">Промокоды еще не созданы.</p>
                            <button
                                onClick={() => setIsPromoModalOpen(true)}
                                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-gray-300 font-medium transition-colors border border-white/10 cursor-pointer"
                            >
                                Создать первый
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {promocodes.map((promo) => {
                                const statusMeta = PROMOCODE_STATUS_META[promo.status];
                                return (
                                    <div key={promo.id} className="p-4 rounded-xl bg-black/20 border border-white/5">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="font-semibold text-white truncate">{promo.title}</h4>
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusMeta.className}`}>
                                                        {statusMeta.label}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2 text-xs text-white/40">
                                                    <span className="inline-flex items-center gap-1 text-green-400">
                                                        <Percent className="w-3 h-3" />
                                                        {promo.discountValue}%
                                                    </span>
                                                    <span>{promo.codeType}</span>
                                                    {promo.code && <span className="text-white/65 font-mono">{promo.code}</span>}
                                                </div>
                                                <p className="text-xs text-white/30 mt-2 truncate">
                                                    {promo.offer?.title ?? 'Вся компания'}
                                                </p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-sm font-bold text-white">
                                                    {promo._count?.activations ?? 0}{promo.maxActivations ? ` / ${promo.maxActivations}` : ''}
                                                </p>
                                                <p className="text-[10px] text-white/30">активаций</p>
                                                <p className="text-[10px] text-white/30">на юзера: {promo.perUserLimit}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-white/5">
                                            <p className="text-[10px] text-white/30">
                                                {promo.validTo ? `до ${new Date(promo.validTo).toLocaleDateString('ru')}` : 'без срока'}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                {promo.status !== 'ACTIVE' && (
                                                    <button
                                                        onClick={() => handlePromocodeStatus(promo.id, 'ACTIVE')}
                                                        className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 border-0 cursor-pointer"
                                                        title="Активировать"
                                                        aria-label="Активировать"
                                                    >
                                                        <Play className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {promo.status === 'ACTIVE' && (
                                                    <button
                                                        onClick={() => handlePromocodeStatus(promo.id, 'PAUSED')}
                                                        className="p-2 rounded-lg bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border-0 cursor-pointer"
                                                        title="Пауза"
                                                        aria-label="Пауза"
                                                    >
                                                        <Pause className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {promo.status !== 'ARCHIVED' && (
                                                    <button
                                                        onClick={() => handlePromocodeStatus(promo.id, 'ARCHIVED')}
                                                        className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white hover:bg-white/10 border-0 cursor-pointer"
                                                        title="В архив"
                                                        aria-label="В архив"
                                                    >
                                                        <Archive className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Recent Transactions List */}
                <div className="glass-card p-6">
                    <h2 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-4">Последние Покупки</h2>

                    {(!stats?.recentTransactions || stats.recentTransactions.length === 0) ? (
                        <div className="text-center py-8 px-4">
                            <p className="text-gray-400 text-sm">У вас еще не было продаж.</p>
                            <p className="text-xs text-gray-500 mt-2">Разместите лучшие предложения, чтобы привлечь покупателей!</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {stats.recentTransactions.map((tx, idx) => (
                                <div key={idx} className="flex items-center gap-4 p-3 rounded-lg bg-black/20 border border-white/5">
                                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 text-blue-400">
                                        {tx.buyer?.displayName?.charAt(0) || 'U'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-white truncate">{tx.offer?.title}</p>
                                        <p className="text-xs text-gray-400 truncate">Покупатель: {tx.buyer?.displayName || tx.buyer?.email}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-sm font-bold text-green-400">+${tx.price}</p>
                                        <p className="text-[10px] text-gray-500 mt-1">{new Date(tx.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            ))}
                            <button className="w-full py-2 mt-4 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-gray-300 font-medium transition-colors border border-white/10">
                                Смотреть все транзакции
                            </button>
                        </div>
                    )}
                </div>
                </div>
            </div>
        </div>
    );
}
