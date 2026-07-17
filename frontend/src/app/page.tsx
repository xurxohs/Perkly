export const dynamic = 'force-dynamic';

import { ArrowRight, Flame, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Offer } from '@/lib/api';
import SafeImage from '@/components/SafeImage';
import { PerklyGlyph, type PerklyGlyphName } from '@/components/PerklyGlyph';

const API_BASE = typeof window !== 'undefined' ? '/api' : (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001');

const CATEGORY_NAMES: Record<string, string> = {
  RESTAURANTS: 'Рестораны и кафе', MARKETPLACES: 'Маркетплейсы', SUBSCRIPTIONS: 'Подписки',
  GAMES: 'Игры', COURSES: 'Обучение', TOURISM: 'Туризм', FITNESS: 'Фитнес', OTHER: 'Другое',
};

const categories = [
  { title: 'Рядом', detail: 'Кафе и услуги', icon: 'location' as PerklyGlyphName, href: '/catalog?category=RESTAURANTS&near=true' },
  { title: 'Подписки', detail: 'Сервисы и приложения', icon: 'key' as PerklyGlyphName, href: '/catalog?category=SUBSCRIPTIONS' },
  { title: 'Игры', detail: 'Ключи и аккаунты', icon: 'game' as PerklyGlyphName, href: '/catalog?category=GAMES' },
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

const actionLabel = (offer: Offer) => offer.price === 0 ? 'Получить' : offer.fulfillmentType === 'LINK' ? 'Открыть' : 'Купить';

export default async function Home() {
  const { popularOffers, flashOffers } = await getOffers();

  return <div className="mx-auto flex w-full max-w-[1200px] flex-col px-4 pb-16 sm:px-6">
    <section className="relative flex min-h-[520px] items-center overflow-hidden py-16 text-center sm:min-h-[600px] sm:py-20">
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[420px] w-[720px] max-w-[95vw] -translate-x-1/2 rounded-full bg-purple-600/[0.12] blur-[110px]" />
      <div className="relative mx-auto max-w-4xl">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-purple-400/20 bg-purple-400/[0.08] px-4 py-2 text-xs font-bold text-purple-200"><Sparkles className="h-3.5 w-3.5" /> Выгода рядом — оплата в сумах</div>
        <h1 className="text-balance text-4xl font-black leading-[1.02] tracking-[-0.055em] text-white sm:text-6xl lg:text-7xl">Покупайте выгоднее.<br /><span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Получайте сразу.</span></h1>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-white/55 sm:text-lg">Промокоды, подписки и локальные предложения Узбекистана. Деньги защищены до получения покупки.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/catalog" className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-white px-7 font-bold text-black no-underline transition hover:scale-[1.02]">Смотреть предложения <ArrowRight className="h-4 w-4" /></Link><Link href="/sell" className="inline-flex h-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.035] px-7 font-semibold text-white/75 no-underline hover:bg-white/[0.07]">Стать продавцом</Link></div>
        <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-white/35"><span className="inline-flex items-center gap-1.5"><PerklyGlyph name="shield" className="h-4 w-4 text-emerald-400" /> Безопасная сделка</span><span className="inline-flex items-center gap-1.5"><PerklyGlyph name="catalog" className="h-4 w-4 text-purple-300" /> Моментальная выдача</span><span>Цены только в UZS</span></div>
      </div>
    </section>

    <section className="mb-14">
      <div className="mb-5 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-purple-300/60">Быстрый выбор</p><h2 className="mt-2 text-2xl font-black text-white">Что ищете?</h2></div><Link href="/catalog" className="text-sm font-semibold text-white/45 no-underline hover:text-white">Весь каталог →</Link></div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">{categories.map((category) => <Link key={category.title} href={category.href} className="group rounded-3xl border border-white/[0.07] bg-white/[0.025] p-4 no-underline transition hover:-translate-y-0.5 hover:border-purple-400/25 hover:bg-purple-500/[0.06]"><div className="mb-6 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-white/55 transition group-hover:bg-purple-500/15 group-hover:text-purple-200"><PerklyGlyph name={category.icon} className="h-5 w-5" /></div><h3 className="text-sm font-bold text-white">{category.title}</h3><p className="mt-1 text-xs leading-4 text-white/30">{category.detail}</p></Link>)}</div>
    </section>

    <section className="mb-14"><Link href="/feed" className="group relative block overflow-hidden rounded-[2rem] border border-orange-400/10 bg-gradient-to-br from-orange-500/[0.10] via-white/[0.025] to-purple-500/[0.06] p-6 no-underline sm:p-8"><div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between"><div><span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-orange-300"><Flame className="h-3.5 w-3.5" /> Topka</span><h2 className="mt-4 text-2xl font-black text-white sm:text-3xl">Что происходит сегодня</h2><p className="mt-2 max-w-xl text-sm leading-6 text-white/40">События, места и предложения города в вертикальной ленте.</p></div><span className="inline-flex h-12 w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 text-sm font-bold text-white/70 transition group-hover:bg-white/10 group-hover:text-white">Открыть Topka <ArrowRight className="h-4 w-4" /></span></div></Link></section>

    {flashOffers.length > 0 && <section className="mb-14"><div className="mb-5 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-orange-300/70">Ограничено по времени</p><h2 className="mt-2 text-2xl font-black text-white">Успейте забрать</h2></div><Link href="/catalog?isFlashDrop=true" className="text-sm font-semibold text-white/45 no-underline">Все акции →</Link></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{flashOffers.map((offer) => <OfferCard key={offer.id} offer={offer} urgent />)}</div></section>}

    <section><div className="mb-5 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-purple-300/60">Новые предложения</p><h2 className="mt-2 text-2xl font-black text-white">Стоит посмотреть</h2></div><Link href="/catalog" className="text-sm font-semibold text-white/45 no-underline">Смотреть все →</Link></div>{popularOffers.length ? <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">{popularOffers.map((offer) => <OfferCard key={offer.id} offer={offer} />)}</div> : <div className="rounded-3xl border border-dashed border-white/10 py-16 text-center text-sm text-white/30">Предложения скоро появятся</div>}</section>
  </div>;
}

function OfferCard({ offer, urgent = false }: { offer: Offer; urgent?: boolean }) {
  return <Link href={`/offer?id=${offer.id}`} className="group overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.025] no-underline transition hover:-translate-y-0.5 hover:border-white/[0.13]"><div className="relative aspect-[4/3] bg-white/[0.035]"><SafeImage src={offer.imageUrl || offer.vendorLogo || ''} fill className="object-contain p-5 transition duration-500 group-hover:scale-105" alt={offer.title} />{urgent && <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-orange-500 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-white"><Flame className="h-3 w-3" /> Скоро закончится</span>}</div><div className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-white/30">{CATEGORY_NAMES[offer.category] || 'Предложение'}</p><h3 className="mt-2 line-clamp-2 min-h-10 text-sm font-bold leading-5 text-white">{offer.title}</h3><div className="mt-4 flex items-end justify-between gap-2"><span className={`text-base font-black ${offer.price === 0 ? 'text-emerald-300' : 'text-white'}`}>{offer.price === 0 ? 'Бесплатно' : `${offer.price.toLocaleString('ru-RU')} сум`}</span><span className="text-xs font-bold text-purple-300">{actionLabel(offer)} →</span></div></div></Link>;
}
