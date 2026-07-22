export const dynamic = 'force-dynamic';
import {
    ArrowLeft,
    Shield,
    Clock,
    User,
    Package,
    Flame,
    Crown,
    ExternalLink,
    Boxes,
    PackageCheck,
    Key,
    FileText,
    CheckCircle2,
    ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Reviews } from '@/components/Reviews';
import { Offer, User as UserType } from '@/lib/api';
import OfferActions from '@/components/OfferActions';
import { OfferGallery } from '@/components/OfferGallery';
import { ReportOfferButton } from '@/components/ReportOfferButton';
import { ContactSellerButton } from '@/components/ContactSellerButton';

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
                {/* Left - Image & Seller Card */}
                <div>
                    {(offer.images?.[0] || offer.imageUrl || offer.vendorLogo) ? (
                        <OfferGallery images={offer.images?.length ? offer.images : [offer.imageUrl || offer.vendorLogo || '']} title={offer.title} />
                    ) : (
                        <div className="flex aspect-[4/3] items-center justify-center rounded-[28px] border border-white/[0.07] bg-white/[0.025]">
                            <Package className="w-24 h-24 text-white/20" />
                        </div>
                    )}

                    {/* Seller Card & Activity */}
                    {offer.seller && (
                        <div className="mt-4 rounded-2xl bg-white/[0.025] border border-white/[0.06] p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="relative shrink-0">
                                        <div className="w-11 h-11 rounded-full flex items-center justify-center bg-purple-500/20 text-purple-200 font-extrabold border border-purple-500/30">
                                            {((offer.seller as UserType).displayName || 'П')[0].toUpperCase()}
                                        </div>
                                        <span className="absolute bottom-0 right-0 flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-[#121217]"></span>
                                        </span>
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-sm font-extrabold text-white truncate">{(offer.seller as UserType).displayName || 'Продавец'}</span>
                                            <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                        </div>
                                        <div className="flex items-center gap-2 text-[11px] text-white/40 mt-0.5 flex-wrap">
                                            <span className="text-emerald-400 font-semibold">В сети</span>
                                            <span>•</span>
                                            <span>Отвечает за ~5-15 мин</span>
                                        </div>
                                    </div>
                                </div>

                                <ContactSellerButton sellerId={offer.sellerId} />
                            </div>

                            <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-white/40">
                                <span>Продавец Perkly</span>
                                <span className="text-purple-300 font-medium flex items-center gap-1">
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> 100% Защита
                                </span>
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
                    <div className="flex items-baseline gap-3 mb-6">
                        <span className="text-3xl font-black text-white">
                            {offer.price === 0 ? 'Бесплатно' : `${offer.price.toLocaleString('ru-RU')} сум`}
                        </span>
                        {oldPrice && <span className="text-base text-white/30 line-through">{oldPrice.toLocaleString('ru-RU')} сум</span>}
                        {offer.discountPercent ? <span className="text-sm font-bold text-emerald-400">−{offer.discountPercent}%</span> : null}
                    </div>

                    {/* Block: What the buyer receives */}
                    <div className="mb-6 rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/[0.08] via-white/[0.02] to-transparent p-5">
                        <h2 className="text-base font-extrabold text-white mb-3.5 flex items-center gap-2">
                            <PackageCheck className="w-5 h-5 text-purple-400" />
                            Что получит покупатель после покупки
                        </h2>

                        <div className="space-y-3">
                            <div className="flex items-start gap-3 rounded-xl bg-white/[0.03] p-3 border border-white/5">
                                <div className="p-2 rounded-lg bg-purple-500/20 text-purple-300 shrink-0">
                                    <Key className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-white">
                                        {offer.fulfillmentType === 'DIGITAL_CODE' ? 'Цифровой промокод / Ваучер' : offer.fulfillmentType === 'LINK' ? 'Прямая ссылка / Доступ' : 'Пошаговая инструкция и доступ'}
                                    </div>
                                    <div className="text-xs text-white/50 mt-0.5">
                                        {offer.fulfillmentType === 'DIGITAL_CODE'
                                            ? 'Мгновенно отобразится на экране после оплаты и сохранится в истории ваших заказов'
                                            : offer.fulfillmentType === 'LINK'
                                                ? 'Вы получите персональную ссылку на доступ сразу после подтверждения оплаты'
                                                : 'Вы получите подробную инструкцию по активации сразу после подтверждения оплаты'}
                                    </div>
                                </div>
                            </div>

                            {offer.buyerInputPrompt && (
                                <div className="flex items-start gap-3 rounded-xl bg-white/[0.03] p-3 border border-white/5">
                                    <div className="p-2 rounded-lg bg-blue-500/20 text-blue-300 shrink-0">
                                        <FileText className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-white">Данные при оформлении</div>
                                        <div className="text-xs text-white/50 mt-0.5">Потребуется указать: <span className="text-white font-semibold">{offer.buyerInputPrompt}</span></div>
                                    </div>
                                </div>
                            )}

                            {offer.usageInstructions && (
                                <div className="flex items-start gap-3 rounded-xl bg-white/[0.03] p-3 border border-white/5">
                                    <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300 shrink-0">
                                        <CheckCircle2 className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-white">Инструкция от продавца</div>
                                        <div className="text-xs text-white/60 mt-0.5 whitespace-pre-wrap">{offer.usageInstructions}</div>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-2 text-xs text-white/40 pt-1">
                                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span>Средства переводятся продавцу только после подтвеждения получения товара</span>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="mb-6">
                        <h2 className="text-sm font-semibold text-white/45 mb-2">Описание товара</h2>
                        <p className="text-white/65 leading-relaxed text-sm whitespace-pre-wrap">{offer.description}</p>
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
