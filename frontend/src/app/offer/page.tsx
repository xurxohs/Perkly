export const dynamic = 'force-dynamic';
import { ArrowLeft, Shield, Clock, User, Package, Flame, Crown, ExternalLink, Boxes } from 'lucide-react';
import Link from 'next/link';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Reviews } from '@/components/Reviews';
import { Offer, User as UserType } from '@/lib/api';
import OfferActions from '@/components/OfferActions';
import { OfferGallery } from '@/components/OfferGallery';
import { ReportOfferButton } from '@/components/ReportOfferButton';

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

const API_BASE = typeof window !== 'undefined' ? '/api' : (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001');

async function getOffer(id: string): Promise<Offer | null> {
    try {
        const res = await fetch(`${API_BASE}/offers/${id}`, { cache: 'no-store' });
        if (res.status === 400 || res.status === 404) return null;
        if (!res.ok) throw new Error(`Offer API returned ${res.status}`);
        return res.json();
    } catch (err) {
        console.error('Fetch offer failed:', err);
        throw err;
    }
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ id?: string }> }): Promise<Metadata> {
    const { id } = await searchParams;
    if (!id) return { title: 'Товар не найден', robots: { index: false, follow: false } };

    const offer = await getOffer(id);
    if (!offer) return { title: 'Товар не найден', robots: { index: false, follow: false } };

    return {
        title: `Купить ${offer.title}`,
        description: offer.description,
        alternates: {
            canonical: `/offer?id=${encodeURIComponent(id)}`,
        },
        robots: {
            index: false,
            follow: false,
        },
        openGraph: {
            title: offer.title,
            description: offer.description,
            url: `/offer?id=${encodeURIComponent(id)}`,
            images: offer.imageUrl ? [offer.imageUrl] : offer.vendorLogo ? [offer.vendorLogo] : [],
        },
    };
}

export default async function OfferDetailPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
    const { id } = await searchParams;

    if (!id) notFound();

    const offer = await getOffer(id);

    if (!offer) notFound();
    const oldPrice = offer.discountPercent && offer.discountPercent > 0 && offer.discountPercent < 100
        ? Math.round(offer.price / (1 - offer.discountPercent / 100))
        : null;
    const deliveryLabel = offer.deliveryEstimateMinutes == null
        ? (offer.fulfillmentType === 'PROMOCODE' ? 'Код после оплаты' : 'Способ указан в карточке')
        : offer.deliveryEstimateMinutes < 60
            ? `Обычно до ${offer.deliveryEstimateMinutes} мин`
            : `Обычно до ${Math.ceil(offer.deliveryEstimateMinutes / 60)} ч`;

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
            {/* Back */}
            <Link href="/catalog" className="inline-flex items-center gap-1 text-sm text-white/40 hover:text-white transition mb-8 no-underline">
                <ArrowLeft className="w-4 h-4" /> Каталог
            </Link>

            <div className="grid md:grid-cols-2 gap-7 lg:gap-12 items-start">
                {/* Left - Image */}
                <div>
                    {(offer.images?.[0] || offer.imageUrl || offer.vendorLogo) ? <OfferGallery images={offer.images?.length ? offer.images : [offer.imageUrl || offer.vendorLogo || '']} title={offer.title} /> : <div className="flex aspect-[4/3] items-center justify-center rounded-[28px] border border-white/[0.07] bg-white/[0.025]"><Package className="w-24 h-24 text-white/20" /></div>}

                    {/* Seller info */}
                    {offer.seller && (
                        <div className="mt-3 flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.025] border border-white/[0.06]">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/[0.06]">
                                <User className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <div className="text-sm font-semibold text-white">{(offer.seller as UserType).displayName || 'Продавец'}</div>
                                <div className="text-xs text-white/30">Продавец на Perkly</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right - Info */}
                <div className="md:sticky md:top-24">
                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-2 mb-4">
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

                    <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-white mb-3 leading-[1.08]">{offer.title}</h1>

                    {/* Price */}
                    <div className="flex items-baseline gap-3 mb-7">
                        <span className="text-3xl font-black text-white">
                            {offer.price === 0 ? 'Бесплатно' : `${offer.price.toLocaleString('ru-RU')} сум`}
                        </span>
                        {oldPrice && <span className="text-base text-white/30 line-through">{oldPrice.toLocaleString('ru-RU')} сум</span>}
                        {offer.discountPercent ? <span className="text-sm font-bold text-emerald-400">−{offer.discountPercent}%</span> : null}
                    </div>

                    {/* Description */}
                    <div className="mb-8">
                        <h2 className="text-sm font-semibold text-white/45 mb-2">Что вы получите</h2>
                        <p className="text-white/65 leading-relaxed">{offer.description}</p>
                    </div>

                    {/* Guarantee badges */}
                    <div className="grid grid-cols-2 gap-2 mb-7">
                        <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.025] border border-white/[0.06] px-3 py-3 text-xs text-white/50">
                            <Shield className="w-4 h-4 text-green-400" />
                            Эскроу защита
                        </div>
                        <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.025] border border-white/[0.06] px-3 py-3 text-xs text-white/50">
                            <Clock className="w-4 h-4 text-blue-400" />
                            {deliveryLabel}
                        </div>
                        {offer.warrantyDays ? <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.025] border border-white/[0.06] px-3 py-3 text-xs text-white/50"><Shield className="w-4 h-4 text-purple-300" />Гарантия {offer.warrantyDays} дн.</div> : null}
                        {offer.stockQuantity != null ? <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.025] border border-white/[0.06] px-3 py-3 text-xs text-white/50"><Boxes className="w-4 h-4 text-white/45" />Осталось: {offer.stockQuantity}</div> : null}
                    </div>

                    {offer.sourceUrl && <a href={offer.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="mb-5 inline-flex items-center gap-2 text-xs text-white/35 hover:text-white/60">Источник предложения <ExternalLink className="h-3.5 w-3.5" /></a>}

                    {/* Actions */}
                    <OfferActions offer={offer} />
                    <ReportOfferButton offerId={offer.id} />
                </div>
            </div>

            {/* Reviews Section */}
            <div className="mt-12 pt-12 border-t border-white/5">
                <Reviews offerId={offer.id} />
            </div>
        </div>
    );
}
