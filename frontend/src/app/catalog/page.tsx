'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { Search, Flame, Pizza, Tv, Gamepad2, GraduationCap, Store, Plane, Dumbbell, Package } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { offersApi, OfferFilters, Offer } from '@/lib/api';
import { useCart } from '@/lib/CartContext';

const CATEGORIES = [
    { value: '', label: 'Все категории' },
    { value: 'RESTAURANTS', label: 'Рестораны и Кафе', icon: Pizza },
    { value: 'SUBSCRIPTIONS', label: 'Подписки', icon: Tv },
    { value: 'GAMES', label: 'Игры', icon: Gamepad2 },
    { value: 'COURSES', label: 'Курсы', icon: GraduationCap },
    { value: 'MARKETPLACES', label: 'Маркетплейсы', icon: Store },
    { value: 'TOURISM', label: 'Туризм', icon: Plane },
    { value: 'FITNESS', label: 'Фитнес', icon: Dumbbell },
    { value: 'OTHER', label: 'Другое', icon: Package },
];

const SORT_OPTIONS = [
    { value: 'newest', label: 'Новые' },
    { value: 'price_asc', label: 'Цена ↑' },
    { value: 'price_desc', label: 'Цена ↓' },
    { value: 'oldest', label: 'Старые' },
];


function CatalogContent() {
    const searchParams = useSearchParams();
    const initialCategory = searchParams.get('category') || '';
    const initialFlash = searchParams.get('isFlashDrop') === 'true';
    const initialSearch = searchParams.get('search') || '';
    const initialNear = searchParams.get('near') === 'true';

    const [offers, setOffers] = useState<Offer[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState(initialSearch);
    const [category, setCategory] = useState(initialCategory);
    const [sort, setSort] = useState('newest');
    const [page, setPage] = useState(0);
    const [isFlashDrop, setIsFlashDrop] = useState(initialFlash);
    const [isNearMe, setIsNearMe] = useState(initialNear || !!searchParams.get('lat'));
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
        searchParams.get('lat') && searchParams.get('lng') 
            ? { lat: Number(searchParams.get('lat')), lng: Number(searchParams.get('lng')) }
            : null
    );
    const { addItem, isInCart } = useCart();

    const PAGE_SIZE = 12;

    const fetchOffers = useCallback(async () => {
        setLoading(true);
        try {
            const filters: OfferFilters = {
                skip: page * PAGE_SIZE,
                take: PAGE_SIZE,
                sort,
            };
            if (category) filters.category = category;
            if (search) filters.search = search;
            if (isFlashDrop) filters.isFlashDrop = true;
            if (isNearMe && coords) {
                filters.lat = coords.lat;
                filters.lng = coords.lng;
                filters.radiusKm = 3;
            }

            const res = await offersApi.list(filters);
            setOffers(res.data);
            setTotal(res.total);
        } catch (err) {
            console.error('Failed to fetch offers:', err);
            setOffers([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [page, category, sort, search, isFlashDrop, isNearMe, coords]);

    useEffect(() => {
        fetchOffers();
    }, [fetchOffers]);

    const totalPages = Math.ceil(total / PAGE_SIZE);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(0);
        fetchOffers();
    };

    const toggleNearMe = () => {
        if (!isNearMe) {
            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        setCoords({
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                        });
                        setIsNearMe(true);
                        setPage(0);
                    },
                    (error) => {
                        console.error("Error getting location:", error);
                        alert("Не удалось получить доступ к геопозиции. Пожалуйста, проверьте настройки браузера.");
                    }
                );
            } else {
                alert("Ваш браузер не поддерживает геолокацию.");
            }
        } else {
            setIsNearMe(false);
            setCoords(null);
            setPage(0);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl md:text-4xl font-extrabold mb-2">
                    {isFlashDrop ? (
                        <span className="text-gradient-fire flex items-center gap-2"><Flame className="w-8 h-8" /> Временные Акции</span>
                    ) : category ? (
                        <span className="flex items-center gap-2">
                            {CATEGORIES.find(c => c.value === category)?.icon && (
                                (() => {
                                    const IconNode = CATEGORIES.find(c => c.value === category)?.icon as React.ElementType;
                                    return IconNode ? <IconNode className="w-8 h-8 text-purple-400" /> : null;
                                })()
                            )}
                            {CATEGORIES.find(c => c.value === category)?.label || 'Каталог'}
                        </span>
                    ) : (
                        'Каталог'
                    )}
                </h1>
                <p className="text-white/40">
                    {total > 0 ? `${total} товаров` : loading ? 'Загрузка...' : 'Нет товаров'}
                </p>
            </div>

            {/* Filters bar */}
            <div className="flex flex-wrap gap-4 mb-8">
                <form onSubmit={handleSearch} className="flex-1 min-w-[250px]">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                        <input
                            type="text"
                            placeholder="Поиск товаров..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none bg-white/[0.04] border border-white/[0.06]"
                        />
                    </div>
                </form>

                <select
                    value={category}
                    onChange={(e) => { setCategory(e.target.value); setPage(0); }}
                    title="Категория"
                    className="px-4 py-3 rounded-xl text-sm text-white outline-none cursor-pointer appearance-none bg-white/[0.04] border border-white/[0.06] min-w-[180px]"
                >
                    {CATEGORIES.map(c => (
                        <option key={c.value} value={c.value} className="bg-[#111]">{c.label}</option>
                    ))}
                </select>

                <select
                    value={sort}
                    onChange={(e) => { setSort(e.target.value); setPage(0); }}
                    title="Сортировка"
                    className="px-4 py-3 rounded-xl text-sm text-white outline-none cursor-pointer appearance-none bg-white/[0.04] border border-white/[0.06] min-w-[140px]"
                >
                    {SORT_OPTIONS.map(s => (
                        <option key={s.value} value={s.value} className="bg-[#111]">{s.label}</option>
                    ))}
                </select>

                <button
                    onClick={() => { setIsFlashDrop(!isFlashDrop); setPage(0); }}
                    className={`px-4 py-3 rounded-xl text-sm font-medium cursor-pointer transition-all ${isFlashDrop ? 'text-white bg-orange-500/15 border-orange-500/30' : 'text-white/50 bg-white/[0.04] border-white/[0.06]'} border`}
                >
                    <Flame className="w-4 h-4 inline-block mr-1.5" /> Flash Drops
                </button>

                <button
                    onClick={toggleNearMe}
                    className={`px-4 py-3 rounded-xl text-sm font-medium cursor-pointer transition-all ${isNearMe ? 'text-white bg-blue-500/15 border-blue-500/30' : 'text-white/50 bg-white/[0.04] border-white/[0.06]'} border`}
                >
                    📍 Рядом со мной
                </button>
            </div>

            {/* Grid */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="rounded-2xl h-72 animate-pulse bg-white/[0.03]" />
                    ))}
                </div>
            ) : offers.length === 0 ? (
                <div className="text-center py-20">
                    <p className="text-white/30 text-lg mb-4">Товары не найдены</p>
                    <button onClick={() => { setSearch(''); setCategory(''); setIsFlashDrop(false); }} className="text-purple-400 cursor-pointer bg-transparent border-0 text-sm underline">
                        Сбросить фильтры
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {offers.map((offer) => (
                        <div key={offer.id} className="rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 group bg-white/[0.03] backdrop-blur-[20px] border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
                            <Link href={`/offer/?id=${offer.id}`} className="no-underline text-inherit block">
                                <div className="relative h-44 overflow-hidden bg-white/5 flex items-center justify-center p-6 border-b border-white/[0.04]">
                                    {offer.vendorLogo ? (
                                        <Image src={offer.vendorLogo} fill className="object-contain p-6 drop-shadow-xl transition-transform duration-500 group-hover:scale-110" alt={offer.title} onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
                                    ) : null}
                                    <div className={`flex items-center justify-center h-full text-white/20 ${offer.vendorLogo ? 'hidden' : ''}`}>
                                        {(() => {
                                            const cat = CATEGORIES.find(c => c.value === offer.category);
                                            if (cat && cat.icon) {
                                                const IconNode = cat.icon;
                                                return <IconNode className="w-16 h-16" />;
                                            }
                                            return <Package className="w-16 h-16" />;
                                        })()}
                                    </div>

                                    {offer.isFlashDrop && (
                                        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[10px] uppercase font-extrabold text-white tracking-wider bg-gradient-to-br from-orange-500 to-red-500 shadow-[0_4px_15px_rgba(239,68,68,0.4)]">
                                            <Flame className="w-3 h-3 inline-block mr-1" /> Flash
                                        </div>
                                    )}
                                    {offer.isExclusive && (
                                        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg text-[10px] uppercase font-extrabold text-yellow-300 tracking-wider bg-yellow-500/[0.15] backdrop-blur-[10px] border border-yellow-500/[0.3]">
                                            👑 VIP
                                        </div>
                                    )}
                                </div>

                                <div className="p-5 bg-gradient-to-b from-transparent to-black/20">
                                    <div className="text-[10px] text-white/40 mb-1.5 uppercase tracking-widest font-semibold">{offer.category}</div>
                                    <h3 className="text-base font-bold text-white mb-2 line-clamp-2 leading-snug">{offer.title}</h3>
                                    <p className="text-xs text-white/30 line-clamp-2 mb-3">{offer.description}</p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-lg font-extrabold text-gradient-green">{offer.price === 0 ? 'Бесплатно' : `${offer.price.toFixed(2)}$`}</span>
                                    </div>
                                </div>
                            </Link>

                            <div className="px-4 pb-4">
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        addItem({ offerId: offer.id, title: offer.title, price: offer.price, category: offer.category });
                                    }}
                                    disabled={isInCart(offer.id)}
                                    className={`w-full py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                                        isInCart(offer.id)
                                            ? 'bg-green-500/10 border-green-500/20 text-green-500 cursor-default'
                                            : 'bg-purple-500/10 border-purple-500/20 text-purple-400 hover:bg-purple-500/20 cursor-pointer'
                                    }`}
                                >
                                    {isInCart(offer.id) ? '✓ В корзине' : '🛒 В корзину'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-10">
                    {Array.from({ length: totalPages }).map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setPage(i)}
                            className={`w-10 h-10 rounded-xl text-sm font-semibold cursor-pointer border-0 transition-all ${page === i ? 'text-white bg-gradient-to-br from-purple-500 to-pink-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'text-white/40 hover:text-white bg-white/[0.03]'}`}
                        >
                            {i + 1}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function CatalogPage() {
    return (
        <Suspense fallback={<div className="max-w-7xl mx-auto px-6 py-8"><div className="h-8 w-48 rounded-xl animate-pulse bg-white/[0.05]" /></div>}>
            <CatalogContent />
        </Suspense>
    );
}
