export const dynamic = 'force-dynamic';

import { ArrowRight, Check, Flame, ShieldCheck, Sparkles } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Event, Offer } from '@/lib/api';
import SafeImage from '@/components/SafeImage';
import { PerklyGlyph, type PerklyGlyphName } from '@/components/PerklyGlyph';
import { QuickServicePanel } from '@/components/QuickServicePanel';
import { BrandButton } from '@/components/BrandButton';

const API_BASE = typeof window !== 'undefined' ? '/api' : (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001');

const CATEGORY_NAMES: Record<string, string> = {
  RESTAURANTS: 'Рестораны и кафе', MARKETPLACES: 'Маркетплейсы', SUBSCRIPTIONS: 'Подписки',
  GAMES: 'Игры', COURSES: 'Обучение', TOURISM: 'Туризм', FITNESS: 'Фитнес', OTHER: 'Другое',
};

const categories = [
  { title: 'Рядом', detail: 'Кафе и услуги', icon: 'location' as PerklyGlyphName, href: '/catalog?category=RESTAURANTS&near=true' },
  { title: 'Подписки', detail: 'Сервисы и приложения', icon: 'key' as PerklyGlyphName, href: '/catalog?category=SUBSCRIPTIONS' },
  { title: 'Игры', detail: 'Ключи и лицензии', icon: 'game' as PerklyGlyphName, href: '/catalog?category=GAMES' },
  { title: 'Промокоды', detail: 'Скидки и QR-коды', icon: 'coupon' as PerklyGlyphName, href: '/catalog?fulfillmentType=PROMOCODE' },
  { title: 'Маркетплейсы', detail: 'Выгода на покупки', icon: 'store' as PerklyGlyphName, href: '/catalog?category=MARKETPLACES' },
  { title: 'Еда', detail: 'Предложения заведений', icon: 'coffee' as PerklyGlyphName, href: '/catalog?category=RESTAURANTS' },
];

async function getOffers() {
  try {
    const [popularResponse, flashResponse] = await Promise.all([
      fetch(`${API_BASE}/offers?take=8&sort=newest`, { cache: 'no-store' }),
      fetch(`${API_BASE}/offers?isFlashDrop=true&take=4`, { cache: 'no-store' }),
    ]);
    if (!popularResponse.ok || !flashResponse.ok) throw new Error('Offers API unavailable');
    const popular = await popularResponse.json();
    const flash = await flashResponse.json();
    const now = Date.now();
    return {
      popularOffers: (popular.data || []) as Offer[],
      flashOffers: ((flash.data || []) as Offer[]).filter((offer) => offer.expiresAt && new Date(offer.expiresAt).getTime() > now),
    };
  } catch {
    return { popularOffers: [] as Offer[], flashOffers: [] as Offer[] };
  }
}

async function hasUpcomingEvents() {
  try {
    const response = await fetch(`${API_BASE}/events?take=20`, { cache: 'no-store' });
    if (!response.ok) return false;
    const payload = (await response.json()) as { data?: Event[] };
    return (payload.data ?? []).some((event) => {
      const timestamp = new Date(event.date).getTime();
      return Number.isFinite(timestamp) && timestamp + 86_400_000 >= Date.now();
    });
  } catch {
    return false;
  }
}

const actionLabel = (offer: Offer) => offer.price === 0 ? 'Получить' : offer.fulfillmentType === 'LINK' ? 'Открыть' : 'Купить';

export default async function Home() {
  const [{ popularOffers, flashOffers }, showTopka] = await Promise.all([getOffers(), hasUpcomingEvents()]);

  return <div className="brand-home mx-auto flex w-full max-w-[1320px] flex-col px-4 pb-20 sm:px-6 lg:px-8">
    <section className="brand-hero" aria-labelledby="hero-title">
      <div className="brand-hero-grid" aria-hidden="true" />
      <div className="brand-hero-copy">
        <div className="brand-eyebrow"><span /> Digital marketplace · Uzbekistan</div>
        <h1 id="hero-title">Выгода, которая<br /><em>движется с вами.</em></h1>
        <p>Промокоды, подписки и локальные предложения — в одном точном интерфейсе. Цена, ограничения и способ получения понятны до оплаты.</p>
        <div className="brand-hero-actions">
          <BrandButton href="/catalog">Открыть каталог</BrandButton>
          <BrandButton href="/sell" variant="secondary">Стать продавцом</BrandButton>
        </div>
        <ul className="brand-trust-list" aria-label="Преимущества Perkly">
          <li><Check aria-hidden="true" /> Цены в UZS</li>
          <li><Check aria-hidden="true" /> Проверка условий</li>
          <li><Check aria-hidden="true" /> История операций</li>
        </ul>
      </div>

      <div className="brand-hero-art" aria-hidden="true">
        <div className="brand-orbit brand-orbit-one" />
        <div className="brand-orbit brand-orbit-two" />
        <div className="brand-chevron-plane brand-chevron-plane-back" />
        <div className="brand-chevron-plane brand-chevron-plane-front">
          <Image src="/perkly-logo.svg" alt="" width={180} height={134} priority className="brand-hero-logo" />
        </div>
        <div className="brand-signal-card brand-signal-card-top"><span>Доступ</span><strong>24/7</strong></div>
        <div className="brand-signal-card brand-signal-card-bottom"><ShieldCheck /><span>Условия<br /><strong>проверены</strong></span></div>
      </div>
    </section>

    <div className="brand-reveal"><QuickServicePanel /></div>

    <section className="brand-section brand-reveal">
      <SectionHeading eyebrow="Навигация" title="Найдите нужное быстрее" href="/catalog" linkLabel="Весь каталог" />
      <div className="brand-category-grid">{categories.map((category, index) => <Link key={category.title} href={category.href} className="brand-category-card">
        <span className="brand-category-index">0{index + 1}</span>
        <PerklyGlyph name={category.icon} className="brand-category-icon" />
        <div><h3>{category.title}</h3><p>{category.detail}</p></div>
        <ArrowRight className="brand-card-arrow" aria-hidden="true" />
      </Link>)}</div>
    </section>

    {showTopka && <section className="brand-section brand-reveal"><Link href="/feed" className="brand-topka-banner">
      <div><span className="brand-topka-label"><Flame /> Live · Topka</span><h2>Город в вашем ритме.</h2><p>Актуальные события и места — в быстрой вертикальной ленте.</p></div>
      <span className="brand-topka-action">Открыть Topka <ArrowRight /></span>
      <div className="brand-topka-chevron" aria-hidden="true" />
    </Link></section>}

    {flashOffers.length > 0 && <section className="brand-section brand-reveal">
      <SectionHeading eyebrow="Ограничено" title="Успейте забрать" href="/catalog?isFlashDrop=true" linkLabel="Все акции" />
      <div className="brand-offer-grid brand-offer-grid-four">{flashOffers.map((offer) => <OfferCard key={offer.id} offer={offer} urgent />)}</div>
    </section>}

    <section className="brand-section brand-reveal">
      <SectionHeading eyebrow="Подборка" title="Стоит посмотреть" href={popularOffers.length ? '/catalog' : undefined} linkLabel="Смотреть все" />
      {popularOffers.length ? <div className="brand-offer-grid">{popularOffers.map((offer) => <OfferCard key={offer.id} offer={offer} />)}</div> : <div className="brand-empty-state">
        <div className="brand-empty-icon"><Sparkles /></div>
        <div><h3>Только проверенные предложения</h3><p>Мы не заполняем каталог вымышленными карточками. Новые предложения появятся после модерации, а пока можно изучить правила безопасной покупки.</p></div>
        <BrandButton href="/guides">Читать руководства</BrandButton>
      </div>}
    </section>
  </div>;
}

function SectionHeading({ eyebrow, title, href, linkLabel }: { eyebrow: string; title: string; href?: string; linkLabel: string }) {
  return <div className="brand-section-heading"><div><span>{eyebrow}</span><h2>{title}</h2></div>{href && <Link href={href}>{linkLabel}<ArrowRight /></Link>}</div>;
}

function OfferCard({ offer, urgent = false }: { offer: Offer; urgent?: boolean }) {
  return <Link href={`/offer?id=${offer.id}`} className="brand-offer-card">
    <div className="brand-offer-media"><SafeImage src={offer.imageUrl || offer.vendorLogo || ''} fill className="object-cover" alt={offer.title} />{urgent && <span className="brand-urgent"><Flame /> Скоро закончится</span>}</div>
    <div className="brand-offer-body"><p className="brand-offer-category">{CATEGORY_NAMES[offer.category] || 'Предложение'}</p><h3>{offer.title}</h3><div className="brand-offer-meta"><strong>{offer.price === 0 ? 'Бесплатно' : `${offer.price.toLocaleString('ru-RU')} сум`}</strong><span>{actionLabel(offer)} <ArrowRight /></span></div></div>
  </Link>;
}
