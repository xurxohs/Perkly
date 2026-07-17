'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { Search, Flame, Store, Package, ChevronDown, Link2, MapPin, SlidersHorizontal, Sparkles, Ticket, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { offersApi, OfferFilters, Offer } from '@/lib/api';
import { CatalogShowcase } from '@/components/CatalogShowcase';
import { PerklyGlyph, type PerklyGlyphName } from '@/components/PerklyGlyph';

const CATEGORIES = [
    { value: '', label: 'Все категории', glyph: 'coupon' as PerklyGlyphName },
    { value: 'RESTAURANTS', label: 'Рестораны и Кафе', glyph: 'coffee' as PerklyGlyphName },
    { value: 'SUBSCRIPTIONS', label: 'Подписки', glyph: 'key' as PerklyGlyphName },
    { value: 'GAMES', label: 'Игры', glyph: 'game' as PerklyGlyphName },
    { value: 'COURSES', label: 'Курсы', glyph: 'catalog' as PerklyGlyphName },
    { value: 'MARKETPLACES', label: 'Маркетплейсы', glyph: 'store' as PerklyGlyphName },
    { value: 'TOURISM', label: 'Туризм', glyph: 'location' as PerklyGlyphName },
    { value: 'FITNESS', label: 'Фитнес', glyph: 'profile' as PerklyGlyphName },
    { value: 'OTHER', label: 'Другое', glyph: 'catalog' as PerklyGlyphName },
];

const SORT_OPTIONS = [
    { value: 'newest', label: 'Сначала новые' },
    { value: 'price_asc', label: 'Сначала дешевле' },
    { value: 'price_desc', label: 'Сначала дороже' },
    { value: 'oldest', label: 'Сначала старые' },
];

const PRODUCT_TYPES: Array<{
    value: '' | Offer['fulfillmentType'];
    label: string;
    description: string;
    icon: React.ElementType;
}> = [
    { value: '', label: 'Все товары', description: 'Без ограничений', icon: Sparkles },
    { value: 'PROMOCODE', label: 'Промокоды', description: 'Код или QR после покупки', icon: Ticket },
    { value: 'DIGITAL_CODE', label: 'Цифровые товары', description: 'Ключи, аккаунты и доступы', icon: Package },
    { value: 'LINK', label: 'Ссылки', description: 'Доступ по защищённой ссылке', icon: Link2 },
    { value: 'INSTRUCTIONS', label: 'Товары и услуги', description: 'Получение по инструкции', icon: Store },
];

const categoryLabel = (value: string) => CATEGORIES.find((category) => category.value === value)?.label || value;
const productTypeLabel = (value: Offer['fulfillmentType']) => PRODUCT_TYPES.find((type) => type.value === value)?.label || value;
const isUrgentOffer = (offer: Offer) => Boolean(
    offer.isFlashDrop && offer.expiresAt && new Date(offer.expiresAt).getTime() > Date.now(),
);
function CatalogContent() {
    const searchParams = useSearchParams();
    const initialCategory = searchParams.get('category') || '';
    const initialFlash = searchParams.get('isFlashDrop') === 'true';
    const initialSearch = searchParams.get('search') || '';
    const initialNear = searchParams.get('near') === 'true';
    const requestedFulfillment = searchParams.get('fulfillmentType') || '';
    const initialFulfillment = PRODUCT_TYPES.some((type) => type.value === requestedFulfillment)
        ? requestedFulfillment as '' | Offer['fulfillmentType']
        : '';

    const [offers, setOffers] = useState<Offer[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchInput, setSearchInput] = useState(initialSearch);
    const [search, setSearch] = useState(initialSearch);
    const [category, setCategory] = useState(initialCategory);
    const [fulfillmentType, setFulfillmentType] = useState<'' | Offer['fulfillmentType']>(initialFulfillment);
    const [sort, setSort] = useState('newest');
    const [page, setPage] = useState(0);
    const [isFlashDrop, setIsFlashDrop] = useState(initialFlash);
    const [isNearMe, setIsNearMe] = useState(initialNear || !!searchParams.get('lat'));
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
        searchParams.get('lat') && searchParams.get('lng') 
            ? { lat: Number(searchParams.get('lat')), lng: Number(searchParams.get('lng')) }
            : null
    );
    const [showFilters, setShowFilters] = useState(false);
    const [priceFromInput, setPriceFromInput] = useState('');
    const [priceToInput, setPriceToInput] = useState('');
    const [minPrice, setMinPrice] = useState<number | undefined>();
    const [maxPrice, setMaxPrice] = useState<number | undefined>();

    const PAGE_SIZE = 12;

    const fetchOffers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const filters: OfferFilters = {
                skip: page * PAGE_SIZE,
                take: PAGE_SIZE,
                sort,
            };
            if (category) filters.category = category;
            if (fulfillmentType) filters.fulfillmentType = fulfillmentType;
            if (search) filters.search = search;
            if (isFlashDrop) filters.isFlashDrop = true;
            if (minPrice !== undefined) filters.minPrice = minPrice;
            if (maxPrice !== undefined) filters.maxPrice = maxPrice;
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
            setError(err instanceof Error ? err.message : 'Не удалось загрузить каталог');
        } finally {
            setLoading(false);
        }
    }, [page, category, fulfillmentType, sort, search, isFlashDrop, isNearMe, coords, minPrice, maxPrice]);

    useEffect(() => {
        fetchOffers();
    }, [fetchOffers]);

    useEffect(() => {
        setSearchInput(initialSearch);
        setSearch(initialSearch);
        setCategory(initialCategory);
        setFulfillmentType(initialFulfillment);
        setIsFlashDrop(initialFlash);
        setPage(0);
    }, [initialCategory, initialFlash, initialFulfillment, initialSearch]);

    const totalPages = Math.ceil(total / PAGE_SIZE);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(0);
        setSearch(searchInput.trim());
    };

    const applyPriceFilter = () => {
        const parsedMin = priceFromInput.trim() ? Number(priceFromInput) : undefined;
        const parsedMax = priceToInput.trim() ? Number(priceToInput) : undefined;
        setMinPrice(parsedMin !== undefined && Number.isFinite(parsedMin) ? Math.max(0, parsedMin) : undefined);
        setMaxPrice(parsedMax !== undefined && Number.isFinite(parsedMax) ? Math.max(0, parsedMax) : undefined);
        setPage(0);
    };

    const resetFilters = () => {
        setSearchInput('');
        setSearch('');
        setCategory('');
        setFulfillmentType('');
        setSort('newest');
        setIsFlashDrop(false);
        setIsNearMe(false);
        setCoords(null);
        setPriceFromInput('');
        setPriceToInput('');
        setMinPrice(undefined);
        setMaxPrice(undefined);
        setPage(0);
    };

    const activeFilterCount = [
        category,
        fulfillmentType,
        isFlashDrop ? 'flash' : '',
        isNearMe ? 'near' : '',
        minPrice !== undefined ? 'min' : '',
        maxPrice !== undefined ? 'max' : '',
    ].filter(Boolean).length;

    const visiblePages = Array.from({ length: totalPages }, (_, index) => index)
        .filter((index) => index === 0 || index === totalPages - 1 || Math.abs(index - page) <= 2);

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
            <div className="mb-7 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-purple-400/15 bg-purple-400/[0.07] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-purple-300">
                    <Sparkles className="h-3.5 w-3.5" /> Каталог Perkly
                </div>
                <h1 className="text-3xl md:text-5xl font-extrabold mb-2 tracking-tight">
                    {isFlashDrop ? (
                        <span className="text-gradient-fire flex items-center gap-2"><Flame className="w-8 h-8" /> Временные Акции</span>
                    ) : fulfillmentType ? (
                        productTypeLabel(fulfillmentType)
                    ) : category ? (
                        <span className="flex items-center gap-2">
                            <PerklyGlyph name={CATEGORIES.find(c => c.value === category)?.glyph || 'catalog'} className="w-8 h-8 text-purple-400" />
                            {CATEGORIES.find(c => c.value === category)?.label || 'Каталог'}
                        </span>
                    ) : (
                        'Каталог'
                    )}
                </h1>
                <p className="text-white/40">
                    {total > 0 ? `${total} предложений · цены только в сумах` : loading ? 'Обновляем предложения…' : 'Предложений пока нет'}
                </p>
                </div>
                {activeFilterCount > 0 && (
                    <button onClick={resetFilters} className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-white/55 transition hover:bg-white/[0.08] hover:text-white md:self-auto">
                        <X className="h-4 w-4" /> Сбросить {activeFilterCount}
                    </button>
                )}
            </div>

            <CatalogShowcase />

            <div className="-mx-6 mb-5 overflow-x-auto px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex min-w-max gap-2 pb-1">
                    {CATEGORIES.map((item) => {
                        const selected = category === item.value;
                        return (
                            <button
                                key={item.value || 'all'}
                                onClick={() => { setCategory(item.value); setPage(0); }}
                                className={`inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-bold transition ${selected ? 'border-purple-400/35 bg-purple-500/15 text-white shadow-[0_8px_30px_rgba(168,85,247,0.12)]' : 'border-white/[0.07] bg-white/[0.035] text-white/50 hover:bg-white/[0.07] hover:text-white'}`}
                            >
                                <PerklyGlyph name={item.glyph} className="h-4 w-4" /> {item.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Search and filters */}
            <div className="mb-6 rounded-[28px] border border-white/[0.07] bg-white/[0.025] p-3 backdrop-blur-2xl">
                <div className="flex flex-col gap-3 lg:flex-row">
                <form onSubmit={handleSearch} className="min-w-0 flex-1">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" aria-hidden="true" />
                        <input
                            type="text"
                            placeholder="Найти промокод, подписку или товар"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="h-12 w-full rounded-2xl border border-white/[0.07] bg-black/20 pl-11 pr-24 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-purple-400/35 focus:bg-white/[0.04]"
                        />
                        <button type="submit" className="absolute right-1.5 top-1.5 h-9 rounded-xl bg-white px-4 text-xs font-extrabold text-black transition hover:bg-white/90">Найти</button>
                    </div>
                </form>

                <div className="relative min-w-[190px]">
                    <select
                    value={sort}
                    onChange={(e) => { setSort(e.target.value); setPage(0); }}
                    title="Сортировка"
                    className="h-12 w-full appearance-none rounded-2xl border border-white/[0.07] bg-white/[0.04] px-4 pr-10 text-sm font-semibold text-white/75 outline-none cursor-pointer"
                >
                    {SORT_OPTIONS.map(s => (
                        <option key={s.value} value={s.value} className="bg-[#111]">{s.label}</option>
                    ))}
                </select>
                    <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                </div>

                <button
                    onClick={() => setShowFilters((value) => !value)}
                    aria-expanded={showFilters}
                    className={`relative inline-flex h-12 items-center justify-center gap-2 rounded-2xl border px-5 text-sm font-bold transition ${showFilters || activeFilterCount > 0 ? 'border-purple-400/30 bg-purple-500/12 text-white' : 'border-white/[0.07] bg-white/[0.04] text-white/60 hover:text-white'}`}
                >
                    <SlidersHorizontal className="h-4 w-4" /> Фильтры
                    {activeFilterCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-purple-500 px-1.5 text-[10px] text-white">{activeFilterCount}</span>}
                </button>
                </div>

                {showFilters && (
                    <div className="mt-3 border-t border-white/[0.07] px-1 pb-1 pt-5">
                        <div className="mb-5">
                            <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.14em] text-white/35">Тип предложения</p>
                            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                                {PRODUCT_TYPES.map((type) => {
                                    const Icon = type.icon;
                                    const selected = fulfillmentType === type.value;
                                    return (
                                        <button key={type.value || 'all'} onClick={() => { setFulfillmentType(type.value); setPage(0); }} className={`flex min-h-20 items-center gap-3 rounded-2xl border p-3 text-left transition ${selected ? 'border-purple-400/30 bg-purple-500/12' : 'border-white/[0.06] bg-black/15 hover:bg-white/[0.04]'}`}>
                                            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selected ? 'bg-purple-500 text-white' : 'bg-white/[0.05] text-white/45'}`}><Icon className="h-4.5 w-4.5" /></span>
                                            <span className="min-w-0"><span className="block text-sm font-bold text-white/90">{type.label}</span><span className="mt-0.5 block text-[11px] leading-tight text-white/30">{type.description}</span></span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]">
                            <label className="rounded-2xl border border-white/[0.06] bg-black/15 px-4 py-2"><span className="block text-[10px] font-bold uppercase tracking-wider text-white/30">Цена от</span><input inputMode="numeric" value={priceFromInput} onChange={(e) => setPriceFromInput(e.target.value.replace(/\D/g, ''))} placeholder="0 сум" className="mt-1 w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/20" /></label>
                            <label className="rounded-2xl border border-white/[0.06] bg-black/15 px-4 py-2"><span className="block text-[10px] font-bold uppercase tracking-wider text-white/30">Цена до</span><input inputMode="numeric" value={priceToInput} onChange={(e) => setPriceToInput(e.target.value.replace(/\D/g, ''))} placeholder="Без ограничения" className="mt-1 w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/20" /></label>
                            <button onClick={applyPriceFilter} className="h-14 rounded-2xl border border-white/10 bg-white/[0.06] px-5 text-sm font-bold text-white transition hover:bg-white/[0.1]">Применить цену</button>
                            <div className="flex gap-2">
                                <button onClick={() => { setIsFlashDrop(!isFlashDrop); setPage(0); }} className={`inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-bold transition ${isFlashDrop ? 'border-orange-400/30 bg-orange-500/15 text-orange-200' : 'border-white/[0.07] bg-white/[0.035] text-white/45'}`}><Flame className="h-4 w-4" /> Срочные</button>
                                <button onClick={toggleNearMe} className={`inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-bold transition ${isNearMe ? 'border-cyan-400/30 bg-cyan-500/15 text-cyan-200' : 'border-white/[0.07] bg-white/[0.035] text-white/45'}`}><MapPin className="h-4 w-4" /> Рядом</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {error && (
                <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                    <p className="font-semibold">Каталог временно недоступен</p>
                    <p className="mt-1 text-red-200/60">{error}</p>
                    <button onClick={() => void fetchOffers()} className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-2 text-xs font-bold text-red-200">
                        Повторить
                    </button>
                </div>
            )}

            {/* Grid */}
            {loading ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="rounded-2xl h-72 animate-pulse bg-white/[0.03]" />
                    ))}
                </div>
            ) : offers.length === 0 ? (
                <div className="text-center py-20">
                    <p className="text-white/30 text-lg mb-4">Товары не найдены</p>
                    <button onClick={resetFilters} className="text-purple-400 cursor-pointer bg-transparent border-0 text-sm underline">
                        Сбросить фильтры
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
                    {offers.map((offer) => (
                        <div key={offer.id} className="relative rounded-[24px] overflow-hidden group bg-white/[0.03] backdrop-blur-[20px] border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.2)] transition-colors duration-200 hover:border-white/[0.14]">
                            <Link href={`/offer/?id=${offer.id}`} className="no-underline text-inherit block">
                                <div className="relative h-32 sm:h-44 overflow-hidden bg-white/5 flex items-center justify-center p-3 sm:p-6 border-b border-white/[0.04]">
                                    {(offer.imageUrl || offer.vendorLogo) ? (
                                        <Image src={offer.imageUrl || offer.vendorLogo || ''} fill className="object-contain p-5 drop-shadow-xl" alt={offer.title} onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
                                    ) : null}
                                    <div className={`flex items-center justify-center h-full text-white/20 ${(offer.imageUrl || offer.vendorLogo) ? 'hidden' : ''}`}>
                                        {(() => {
                                            const cat = CATEGORIES.find(c => c.value === offer.category);
                                            return <PerklyGlyph name={cat?.glyph || 'catalog'} className="w-16 h-16" />;
                                        })()}
                                    </div>

                                    {isUrgentOffer(offer) && (
                                        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[10px] uppercase font-extrabold text-white tracking-wider bg-gradient-to-br from-orange-500 to-red-500 shadow-[0_4px_15px_rgba(239,68,68,0.4)]">
                                            <Flame className="w-3 h-3 inline-block mr-1" /> Flash
                                        </div>
                                    )}
                                    {offer.isExclusive && (
                                        <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg text-[10px] uppercase font-extrabold text-yellow-300 tracking-wider bg-yellow-500/[0.15] backdrop-blur-[10px] border border-yellow-500/[0.3]">
                                            👑 VIP
                                        </div>
                                    )}
                                </div>

                                <div className="p-3 sm:p-5 bg-gradient-to-b from-transparent to-black/20">
                                    <div className="mb-1.5 flex items-center gap-1.5 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider sm:tracking-widest text-white/40">
                                        <span className="truncate">{categoryLabel(offer.category)}</span><span className="hidden sm:block h-1 w-1 shrink-0 rounded-full bg-white/20" /><span className="hidden sm:inline truncate">{productTypeLabel(offer.fulfillmentType)}</span>
                                    </div>
                                    <h3 className="text-sm sm:text-base font-bold text-white mb-2 line-clamp-2 leading-snug min-h-10">{offer.title}</h3>
                                    <p className="hidden sm:block text-xs text-white/30 line-clamp-2 mb-3">{offer.description}</p>
                                    <div className="flex items-center justify-between">
                                        <span className={`text-sm sm:text-lg font-extrabold ${offer.price === 0 ? 'text-emerald-300' : 'text-white'}`}>{offer.price === 0 ? 'Бесплатно' : `${offer.price.toLocaleString('ru-RU')} сум`}</span>
                                    </div>
                                </div>
                            </Link>

                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-10">
                    {visiblePages.map((pageIndex, position) => (
                        <div key={pageIndex} className="flex items-center gap-2">
                            {position > 0 && pageIndex - visiblePages[position - 1] > 1 && <span className="text-white/25">…</span>}
                            <button
                                onClick={() => setPage(pageIndex)}
                                className={`w-10 h-10 rounded-xl text-sm font-semibold cursor-pointer border-0 transition-all ${page === pageIndex ? 'text-white bg-gradient-to-br from-purple-500 to-pink-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'text-white/40 hover:text-white bg-white/[0.03]'}`}
                            >
                                {pageIndex + 1}
                            </button>
                        </div>
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
