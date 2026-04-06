import { ArrowLeft, Shield, Clock, User, Package, Flame, Crown } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Metadata } from 'next';
import { Reviews } from '@/components/Reviews';
import { Offer, User as UserType } from '@/lib/api';
import OfferActions from '@/components/OfferActions';

const CATEGORY_LABELS: Record<string, string> = {
    RESTAURANTS: 'Рестораны и Кафе',
    SUBSCRIPTIONS: 'Подписки',
    GAMES: 'Игры',
    COURSES: 'Курсы',
    MARKETPLACES: 'Маркетплейсы',
    TOURISM: 'Туризм',
    FITNESS: 'Фитнес',
    OTHER: 'Другое',
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function getOffer(id: string): Promise<Offer | null> {
    try {
        const res = await fetch(`${API_BASE}/offers/${id}`, { cache: 'no-store' });
        if (!res.ok) return null;
        return res.json();
    } catch (err) {
        console.error('Fetch offer failed:', err);
        return null;
    }
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ id?: string }> }): Promise<Metadata> {
    const { id } = await searchParams;
    if (!id) return { title: 'Товар не найден | Perkly' };

    const offer = await getOffer(id);
    if (!offer) return { title: 'Товар не найден | Perkly' };

    return {
        title: `${offer.title} | Купить на Perkly`,
        description: offer.description,
        openGraph: {
            title: offer.title,
            description: offer.description,
            images: offer.vendorLogo ? [offer.vendorLogo] : [],
        },
    };
}

export default async function OfferDetailPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
    const { id } = await searchParams;

    if (!id) {
        return (
            <div className="max-w-4xl mx-auto px-6 py-20 text-center">
                <p className="text-white/40 text-lg mb-4">ID товара не указан</p>
                <Link href="/catalog" className="text-purple-400 no-underline">← Вернуться в каталог</Link>
            </div>
        );
    }

    const offer = await getOffer(id);

    if (!offer) {
        return (
            <div className="max-w-4xl mx-auto px-6 py-20 text-center">
                <p className="text-white/40 text-lg mb-4">Товар не найден</p>
                <Link href="/catalog" className="text-purple-400 no-underline">← Вернуться в каталог</Link>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-6 py-8">
            {/* Back */}
            <Link href="/catalog" className="inline-flex items-center gap-1 text-sm text-white/40 hover:text-white transition mb-8 no-underline">
                <ArrowLeft className="w-4 h-4" /> Каталог
            </Link>

            <div className="grid md:grid-cols-5 gap-8">
                {/* Left - Image */}
                <div className="md:col-span-2">
                    <div className="rounded-3xl overflow-hidden aspect-square flex items-center justify-center p-8 transition-transform duration-500 hover:scale-[1.02] bg-white/5 backdrop-blur-3xl border border-white/10 shadow-2xl">
                        {offer.vendorLogo ? (
                            <div className="relative w-full h-full">
                                <Image 
                                  src={offer.vendorLogo} 
                                  fill 
                                  className="object-contain drop-shadow-2xl" 
                                  alt={offer.title} 
                                />
                            </div>
                        ) : (
                            <Package className="w-24 h-24 text-white/20" />
                        )}
                    </div>

                    {/* Seller info */}
                    {offer.seller && (
                        <div className="mt-4 flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700">
                                <User className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <div className="text-sm font-semibold text-white">{(offer.seller as UserType).displayName || 'Продавец'}</div>
                                <div className="text-xs text-white/30">Проверенный продавец</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right - Info */}
                <div className="md:col-span-3">
                    {/* Badges */}
                    <div className="flex items-center gap-2 mb-3">
                        <span className="px-3 py-1 rounded-lg text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            {CATEGORY_LABELS[offer.category] || offer.category}
                        </span>
                        {offer.isFlashDrop && (
                            <span className="px-3 py-1 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-red-500">
                                <Flame className="w-3 h-3 inline-block mr-1" /> Flash Drop
                            </span>
                        )}
                        {offer.isExclusive && (
                            <span className="px-3 py-1 rounded-lg text-xs font-bold text-yellow-300 bg-yellow-500/10 border border-yellow-500/30">
                                <Crown className="w-3 h-3 inline-block mr-1" /> Эксклюзив
                            </span>
                        )}
                    </div>

                    <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-4 leading-tight">{offer.title}</h1>

                    {/* Price */}
                    <div className="flex items-baseline gap-3 mb-6">
                        <span className="text-4xl font-black text-gradient-green">
                            {offer.price === 0 ? 'Бесплатно' : `${offer.price.toFixed(2)}$`}
                        </span>
                    </div>

                    {/* Description */}
                    <div className="mb-8">
                        <h3 className="text-sm font-semibold text-white/30 uppercase mb-2 tracking-wider text-glow-sm">Описание</h3>
                        <p className="text-white/60 leading-relaxed">{offer.description}</p>
                    </div>

                    {/* Guarantee badges */}
                    <div className="flex flex-wrap gap-4 mb-8">
                        <div className="flex items-center gap-2 text-xs text-white/40">
                            <Shield className="w-4 h-4 text-green-400" />
                            Эскроу защита
                        </div>
                        <div className="flex items-center gap-2 text-xs text-white/40">
                            <Clock className="w-4 h-4 text-blue-400" />
                            Мгновенная доставка
                        </div>
                    </div>

                    {/* Actions */}
                    <OfferActions offer={offer} />
                </div>
            </div>

            {/* Reviews Section */}
            <div className="mt-12 pt-12 border-t border-white/5">
                <Reviews offerId={offer.id} />
            </div>
        </div>
    );
}
