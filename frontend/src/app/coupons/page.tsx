'use client';

import { Tag, Coffee, Gamepad2, KeyRound, ShoppingBag, Sparkles, Clock, Zap, ArrowRight, Filter, Star } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { offersApi } from '@/lib/api';

const categoryFilters = [
    { key: 'ALL', label: 'Все', icon: Sparkles },
    { key: 'RESTAURANTS', label: 'Рестораны', icon: Coffee },
    { key: 'SUBSCRIPTIONS', label: 'Подписки', icon: KeyRound },
    { key: 'GAMES', label: 'Игры', icon: Gamepad2 },
    { key: 'MARKETPLACES', label: 'Маркетплейс', icon: ShoppingBag },
];

const couponImages: Record<string, string> = {
    'RESTAURANTS': 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=400&auto=format&fit=crop',
    'SUBSCRIPTIONS': 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=400&auto=format&fit=crop',
    'GAMES': 'https://images.unsplash.com/photo-1628102491629-77858ab23612?q=80&w=400&auto=format&fit=crop',
    'MARKETPLACES': 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=400&auto=format&fit=crop',
    'DEFAULT': 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=400&auto=format&fit=crop',
};

interface Offer {
    id: string;
    title: string;
    description: string;
    price: number;
    category: string;
    isExclusive: boolean;
    isFlashDrop: boolean;
    isActive: boolean;
    expiresAt: string | null;
    seller: { displayName: string; avatarUrl: string | null };
}

export default function CouponsPage() {
    const [activeCategory, setActiveCategory] = useState('ALL');
    const [offers, setOffers] = useState<Offer[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const data = await offersApi.list();
                setOffers(data.data || []);
            } catch {
                setOffers([]);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const filtered = activeCategory === 'ALL'
        ? offers
        : offers.filter(o => o.category === activeCategory);

    const getDiscount = (price: number) => {
        if (price === 0) return 100;
        if (price < 2) return Math.floor(70 + Math.random() * 20);
        if (price < 10) return Math.floor(40 + Math.random() * 30);
        return Math.floor(20 + Math.random() * 30);
    };

    return (
        <div className="flex flex-col items-center px-6 pb-24 max-w-[1200px] mx-auto w-full">
            {/* Header */}
            <section className="pt-20 pb-10 text-center w-full relative">
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.08) 0%, transparent 70%)' }} />

                <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full mb-6" style={{ background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.15)' }}>
                    <Tag className="w-4 h-4 text-pink-400" />
                    <span className="text-sm font-medium text-pink-300">Лучшие предложения</span>
                </div>

                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-4">
                    Купоны и <span className="text-gradient">Скидки</span>
                </h1>

                <p className="text-base text-white/40 max-w-lg mx-auto mb-8">
                    Промокоды от ресторанов, подписки со скидкой, игровые аккаунты — всё в одном месте.
                </p>
            </section>

            {/* Category chips */}
            <section className="w-full mb-8">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                    {categoryFilters.map(cat => (
                        <button
                            key={cat.key}
                            onClick={() => setActiveCategory(cat.key)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer border-0 transition-all shrink-0 ${activeCategory === cat.key
                                ? 'bg-white text-black'
                                : 'text-white/50 hover:text-white/80'
                                }`}
                            style={activeCategory !== cat.key ? { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' } : {}}
                        >
                            <cat.icon className="w-4 h-4" />
                            {cat.label}
                        </button>
                    ))}
                </div>
            </section>

            {/* Coupons Grid */}
            <section className="w-full">
                {loading ? (
                    <div className="text-center py-20">
                        <div className="w-8 h-8 mx-auto rounded-full border-2 border-purple-500 border-t-transparent" style={{ animation: 'spin 1s linear infinite' }} />
                        <p className="text-white/30 text-sm mt-4">Загрузка купонов...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20">
                        <Tag className="w-12 h-12 text-white/10 mx-auto mb-4" />
                        <p className="text-white/30">Купоны не найдены</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filtered.map((offer) => {
                            const discount = getDiscount(offer.price);
                            const originalPrice = offer.price > 0 ? (offer.price / (1 - discount / 100)).toFixed(2) : null;
                            const imgUrl = couponImages[offer.category] || couponImages['DEFAULT'];

                            return (
                                <Link href={`/offer/?id=${offer.id}`} key={offer.id} className="no-underline">
                                    <div className="glass-card cursor-pointer group">
                                        {/* Image */}
                                        <div className="w-full h-40 relative overflow-hidden">
                                            <Image src={imgUrl} fill className="object-cover transition-transform duration-500 group-hover:scale-105" alt={offer.title} />

                                            {/* Discount badge */}
                                            <div className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold text-white z-10" style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)', boxShadow: '0 0 15px rgba(239,68,68,0.3)' }}>
                                                -{discount}%
                                            </div>

                                            {/* Flash Drop badge */}
                                            {offer.isFlashDrop && (
                                                <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-amber-300 z-10" style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(245,158,11,0.3)' }}>
                                                    <Zap className="w-3 h-3" /> Flash
                                                </div>
                                            )}

                                            {/* Exclusive badge */}
                                            {offer.isExclusive && (
                                                <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-purple-300 z-10" style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(168,85,247,0.3)' }}>
                                                    <Star className="w-3 h-3" /> VIP
                                                </div>
                                            )}

                                            {/* Category */}
                                            <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-semibold text-white/80 z-10" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
                                                {categoryFilters.find(c => c.key === offer.category)?.label || offer.category}
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="p-5 relative z-10">
                                            <h3 className="text-base font-bold text-white mb-1 leading-snug">{offer.title}</h3>
                                            <p className="text-xs text-white/30 mb-3 line-clamp-2">{offer.description}</p>

                                            <div className="flex justify-between items-center">
                                                <div>
                                                    {originalPrice && (
                                                        <div className="text-xs text-white/20 line-through">${originalPrice}</div>
                                                    )}
                                                    <div className="text-lg font-extrabold text-gradient-green">
                                                        {offer.price === 0 ? 'Бесплатно' : `$${offer.price.toFixed(2)}`}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1 text-xs text-white/30">
                                                    <Zap className="w-3 h-3 text-green-400" />
                                                    Автовыдача
                                                </div>
                                            </div>

                                            {/* Seller */}
                                            <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                <div className="w-5 h-5 rounded-full" style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }} />
                                                <span className="text-xs text-white/30">{offer.seller?.displayName || 'Perkly'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}
