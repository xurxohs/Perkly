export const dynamic = 'force-dynamic';
import {
    ArrowLeft,
    Shield,
    Clock,
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
    BadgeCheck,
    RotateCcw,
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
            index: true,
            follow: true,
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
    const canonicalUrl = `https://perkly.uz/offer?id=${encodeURIComponent(id)}`;
    const productJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        '@id': `${canonicalUrl}#product`,
        name: offer.title,
        description: offer.description,
        image: (offer.images?.length ? offer.images : [offer.imageUrl || offer.vendorLogo]).filter(Boolean),
        category: CATEGORY_LABELS[offer.category] || offer.category,
        brand: {
            '@type': 'Brand',
            name: 'Perkly',
        },
        offers: {
            '@type': 'Offer',
            url: canonicalUrl,
            priceCurrency: 'UZS',
            price: offer.price,
            availability:
                offer.stockQuantity === 0
                    ? 'https://schema.org/OutOfStock'
                    : 'https://schema.org/InStock',
            seller: {
                '@type': 'Organization',
                name: offer.seller?.displayName || 'Perkly',
            },
        },
    };
    const breadcrumbJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Главная', item: 'https://perkly.uz/' },
            { '@type': 'ListItem', position: 2, name: 'Каталог', item: 'https://perkly.uz/catalog' },
            { '@type': 'ListItem', position: 3, name: offer.title, item: canonicalUrl },
        ],
    };
    const offerFacts = (
        <div className="offer-facts">
            <div><Shield className="w-4 h-4 text-green-400" /><span>Защита сделки</span><strong>Средства под защитой</strong></div>
            <div><Clock className="w-4 h-4 text-blue-400" /><span>Срок получения</span><strong>{deliveryLabel}</strong></div>
            {offer.warrantyDays ? <div><RotateCcw className="w-4 h-4 text-indigo-300" /><span>Гарантия</span><strong>{offer.warrantyDays} дней</strong></div> : null}
            {offer.stockQuantity != null ? <div><Boxes className="w-4 h-4 text-white/45" /><span>Доступность</span><strong>{offer.stockQuantity > 0 ? `Осталось ${offer.stockQuantity}` : 'Нет в наличии'}</strong></div> : null}
        </div>
    );
    const sellerCard = offer.seller ? (
        <div className="offer-seller-card">
            <div className="offer-seller-avatar">{((offer.seller as UserType).displayName || 'П')[0].toUpperCase()}</div>
            <div className="offer-seller-copy">
                <span>Продавец</span>
                <strong>{(offer.seller as UserType).displayName || 'Продавец Perkly'} <BadgeCheck aria-label="Проверенный продавец" /></strong>
                <small>Покупка и переписка сохраняются в Perkly</small>
            </div>
            <ContactSellerButton sellerId={offer.sellerId} />
        </div>
    ) : null;

    return (
        <div className="offer-detail-page max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-10">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify([productJsonLd, breadcrumbJsonLd]).replace(/</g, '\\u003c'),
                }}
            />
            {/* Back */}
            <Link href="/catalog" className="offer-back-link">
                <ArrowLeft className="w-4 h-4" /> Каталог
            </Link>

            <div className="offer-detail-layout">
                <div className="offer-media-column">
                    {(offer.images?.[0] || offer.imageUrl || offer.vendorLogo) ? (
                        <OfferGallery images={offer.images?.length ? offer.images : [offer.imageUrl || offer.vendorLogo || '']} title={offer.title} />
                    ) : (
                        <div className="offer-gallery-placeholder">
                            <Package className="w-24 h-24 text-white/20" />
                        </div>
                    )}
                    <div className="offer-desktop-extras">
                        {offerFacts}
                        {sellerCard}
                    </div>
                </div>

                <div className="offer-info-column">
                    {/* Badges */}
                    <div className="offer-badges">
                        <span>
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

                    <h1>{offer.title}</h1>

                    {/* Price */}
                    <div className="offer-price-row">
                        <strong>
                            {offer.price === 0 ? 'Бесплатно' : `${offer.price.toLocaleString('ru-RU')} сум`}
                        </strong>
                        {oldPrice && <span className="text-base text-white/30 line-through">{oldPrice.toLocaleString('ru-RU')} сум</span>}
                        {offer.discountPercent ? <span className="text-sm font-bold text-emerald-400">−{offer.discountPercent}%</span> : null}
                    </div>

                    {/* Block: What the buyer receives */}
                    <div className="offer-fulfillment-card">
                        <h2>
                            <PackageCheck className="w-5 h-5 text-indigo-400" />
                            Что получит покупатель после покупки
                        </h2>

                        <div className="offer-fulfillment-list">
                            <div>
                                <i>
                                    <Key className="w-4 h-4" />
                                </i>
                                <section>
                                    <strong>
                                        {offer.fulfillmentType === 'DIGITAL_CODE' ? 'Цифровой промокод / Ваучер' : offer.fulfillmentType === 'LINK' ? 'Прямая ссылка / Доступ' : 'Пошаговая инструкция и доступ'}
                                    </strong>
                                    <span>
                                        {offer.fulfillmentType === 'DIGITAL_CODE'
                                            ? 'Мгновенно отобразится на экране после оплаты и сохранится в истории ваших заказов'
                                            : offer.fulfillmentType === 'LINK'
                                                ? 'Вы получите персональную ссылку на доступ сразу после подтверждения оплаты'
                                                : 'Вы получите подробную инструкцию по активации сразу после подтверждения оплаты'}
                                    </span>
                                </section>
                            </div>

                            {offer.buyerInputPrompt && (
                                <div>
                                    <i>
                                        <FileText className="w-4 h-4" />
                                    </i>
                                    <section><strong>Данные при оформлении</strong><span>Потребуется указать: <b>{offer.buyerInputPrompt}</b></span></section>
                                </div>
                            )}

                            {offer.usageInstructions && (
                                <div>
                                    <i>
                                        <CheckCircle2 className="w-4 h-4" />
                                    </i>
                                    <section><strong>Инструкция от продавца</strong><span className="whitespace-pre-wrap">{offer.usageInstructions}</span></section>
                                </div>
                            )}
                        </div>
                        <p><ShieldCheck aria-hidden="true" /> Средства переводятся продавцу после подтверждения получения товара</p>
                    </div>

                    {offer.sourceUrl && <a href={offer.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="mb-5 inline-flex items-center gap-2 text-xs text-white/35 hover:text-white/60">Источник предложения <ExternalLink className="h-3.5 w-3.5" /></a>}

                    {/* Actions */}
                    <OfferActions offer={offer} />
                    <div className="offer-mobile-extras">{offerFacts}{sellerCard}</div>
                </div>
            </div>

            <section className="offer-description-section">
                <div>
                    <span>О предложении</span>
                    <h2>Описание и условия</h2>
                </div>
                <p>{offer.description}</p>
            </section>

            <div className="offer-reviews-section">
                <Reviews offerId={offer.id} />
            </div>
            <div className="offer-report-row"><ReportOfferButton offerId={offer.id} /></div>
        </div>
    );
}
