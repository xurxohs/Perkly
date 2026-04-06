export const dynamic = 'force-dynamic';
import { Clock, Gamepad2, Coffee, KeyRound, Tag, Sparkles, ArrowRight, Flame } from 'lucide-react';
import Link from 'next/link';
import { Offer } from '@/lib/api';
import Countdown from '@/components/Countdown';
import SafeImage from '@/components/SafeImage';

export type OfferWithHours = Offer & { hours?: number };

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function getOffers() {
  try {
    // We can't use the relative 'request' helper from api.ts on the server-side as easily without full URL
    const trendingRes = await fetch(`${API_BASE}/offers?take=4&sort=newest`, { cache: 'no-store' });
    const flashRes = await fetch(`${API_BASE}/offers?isFlashDrop=true`, { cache: 'no-store' });

    const trendingData = await trendingRes.json();
    const flashData = await flashRes.json();

    const trendingOffers = trendingData.data || [];
    const rawFlashDrops = flashData.data || [];

    const flashDrops = rawFlashDrops.map((drop: Offer) => {
      let hours = 0;
      if (drop.expiresAt) {
        const diff = new Date(drop.expiresAt).getTime() - new Date().getTime();
        hours = Math.max(0, diff / (1000 * 60 * 60));
      }
      return { ...drop, hours } as OfferWithHours;
    }).filter((d: OfferWithHours) => d.hours !== undefined && d.hours > 0);

    return { trendingOffers, flashDrops };
  } catch (err) {
    console.error('SSR Fetch failed:', err);
    return { trendingOffers: [], flashDrops: [] };
  }
}

export default async function Home() {
  const categories = [
    { title: 'Игры и Аккаунты', icon: Gamepad2, count: '1.2k+', className: 'cat-bg-games', href: '/catalog?category=GAMES' },
    { title: 'Подписки', icon: KeyRound, count: '850+', className: 'cat-bg-subscriptions', href: '/catalog?category=SUBSCRIPTIONS' },
    { title: 'Рестораны и Кафе', icon: Coffee, count: '430+', className: 'cat-bg-restaurants', href: '/catalog?category=RESTAURANTS' },
    { title: 'Маркетплейс', icon: Tag, count: '2.4k+', className: 'cat-bg-marketplaces', href: '/catalog?category=MARKETPLACES' },
    { title: 'Купоны', icon: Tag, count: '320+', className: 'cat-bg-coupons', href: '/coupons' },
    { title: 'Тарифы ✨', icon: Sparkles, count: '3', className: 'cat-bg-pricing', href: '/pricing' },
  ];

  const { trendingOffers, flashDrops } = await getOffers();
  const loading = false; // Data is already here

  return (
    <div className="flex flex-col items-center px-6 pb-24 max-w-[1200px] mx-auto w-full">

      {/* ======== HERO ======== */}
      <section className="pt-24 pb-20 text-center w-full relative">
        {/* Neon glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] max-w-full h-[500px] rounded-full pointer-events-none hero-neon-bg" />

        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full mb-8 hero-subtitle-badge">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-purple-300">Добро пожаловать в будущее цифровой торговли</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tighter mb-6 leading-[1.05]">
          Безопасный и Быстрый<br />
          <span className="text-gradient text-glow">Цифровой Маркетплейс</span>
        </h1>

        <p className="text-lg text-white/40 max-w-xl mx-auto mb-10 leading-relaxed">
          Находите невероятные скидки на подписки, игры, кафе и многое другое. Покупайте безопасно через Эскроу.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
          <Link href="/catalog" className="px-8 py-4 rounded-full bg-white text-black font-semibold text-base flex justify-center items-center gap-2 cursor-pointer no-underline w-full sm:w-auto hero-btn-white">
            Начать Покупки <ArrowRight className="w-5 h-5" />
          </Link>
          <Link href="/sell" className="px-8 py-4 rounded-full text-white font-medium text-base cursor-pointer no-underline flex justify-center items-center w-full sm:w-auto hero-btn-glass">
            Продать Товар
          </Link>
        </div>
      </section>

      {/* ======== FLASH DROPS ======== */}
      <section className="w-full mb-20 relative">
        {/* Warm ambient glow behind section */}
        <div className="absolute -inset-16 rounded-3xl pointer-events-none max-w-full overflow-hidden flash-drops-ambient" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] max-w-full h-[500px] rounded-full pointer-events-none flash-drops-glow" />

        <div className="flex justify-between items-center mb-7 relative z-10">
          <h2 className="text-2xl font-bold text-gradient-fire flex items-center gap-2">Временные Акции <Flame className="w-6 h-6 text-orange-500" /></h2>
          <span className="text-sm text-white/30">Исчезнут совсем скоро</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10">
          {flashDrops.length > 0 ? flashDrops.map((d: OfferWithHours, i: number) => (
            <Link href={`/offer/?id=${d.id}`} key={d.id || i} className="flex flex-col sm:flex-row items-start sm:items-center p-4 cursor-pointer rounded-2xl transition-all duration-300 no-underline group hover:-translate-y-1 hover:shadow-xl gap-4 sm:gap-0 offer-card">
              <div className="flex gap-3 sm:gap-4 w-full sm:flex-1">
                <div className="w-20 h-20 rounded-xl overflow-hidden relative shrink-0 bg-white/5 flex items-center justify-center p-2 offer-card-image">
                  <SafeImage 
                    src={d.vendorLogo || ''} 
                    fill 
                    className="object-contain drop-shadow-lg p-1 transition-transform group-hover:scale-105" 
                    alt={d.title} 
                    fallbackIcon={<Flame className="w-8 h-8 text-orange-500/80 drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]" />}
                  />
                </div>
                <div className="flex-1 relative z-10 flex flex-col justify-center">
                  <h3 className="text-base font-bold text-white mb-1 line-clamp-1">{d.title}</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-extrabold text-white">${d.price}</span>
                    {d.discountPercent !== null && d.discountPercent > 0 && <span className="text-xs text-white/25 line-through">${(d.price / (1 - d.discountPercent / 100)).toFixed(2)}</span>}
                  </div>
                  <div className="inline-flex items-center gap-1.5 text-xs text-red-400 font-mono px-2.5 py-1 rounded-full cursor-default w-fit offer-card-timer">
                    <Clock className="w-3.5 h-3.5" />
                    Осталось: <Countdown hours={d.hours || 0} />
                  </div>
                </div>
              </div>
              <button className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-white font-bold text-sm cursor-pointer border-0 sm:ml-2 whitespace-nowrap relative z-10 flash-drop-btn">
                Забрать
              </button>
            </Link>
          )) : (
            <div className="col-span-1 md:col-span-2 text-center text-white/50 py-10">Временных акций пока нет, заходите позже!</div>
          )}
        </div>
      </section>

      {/* ======== WHEEL OF FORTUNE ======== */}
      <section className="w-full mb-20">
        <div className="glass-card flex items-center justify-between gap-12 flex-wrap p-12 wheel-card">
          <div className="absolute -right-12 -top-12 w-72 h-72 rounded-full pointer-events-none wheel-glow" />

          <div className="z-10 max-w-md">
            <div className="inline-flex items-center gap-2 text-purple-300 font-semibold text-sm mb-4 px-3 py-1.5 rounded-full wheel-badge">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M9.375 3a1.875 1.875 0 0 0 0 3.75h1.875v4.5H3.375A1.875 1.875 0 0 1 1.5 9.375v-.75c0-1.036.84-1.875 1.875-1.875h3.193A3.375 3.375 0 0 1 12 2.753a3.375 3.375 0 0 1 5.432 3.997h3.193c1.035 0 1.875.84 1.875 1.875v.75c0 1.036-.84 1.875-1.875 1.875H12.75v-4.5h1.875a1.875 1.875 0 1 0-1.875-1.875V6.75h-1.5V4.875C11.25 3.839 10.41 3 9.375 3ZM11.25 12.75H3v6.75a2.25 2.25 0 0 0 2.25 2.25h6v-9ZM12.75 12.75v9h6.75a2.25 2.25 0 0 0 2.25-2.25v-6.75h-9Z" />
              </svg> Испытайте Удачу
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4 leading-tight">
              Колесо Фортуны<br /><span className="text-purple-400">Perkly Points</span>
            </h2>
            <p className="text-white/40 text-base leading-relaxed mb-6">
              Крутите рулетку и выигрывайте бесплатные промокоды от Яндекс, Safia, Dodo Pizza!
            </p>
            <Link href="/wheel" className="inline-block px-6 py-3 rounded-xl text-white font-semibold no-underline wheel-btn">
              🎰 Крутить Барабан Бесплатно
            </Link>
          </div>

          <div className="z-10 relative w-60 h-60 shrink-0">
            <div className="absolute inset-0 rounded-full wheel-spinner-blur" />
            <div className="w-48 h-48 m-6 rounded-full flex items-center justify-center wheel-spinner-outer">
              <div className="w-[70%] h-[70%] rounded-full flex items-center justify-center wheel-spinner-inner">
                <span className="text-5xl font-black wheel-spinner-text">P</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======== CATEGORIES ======== */}
      <section className="w-full mb-20">
        <h2 className="text-2xl font-bold mb-7 text-white">Категории Товаров</h2>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((c, i: number) => (
            <Link href={c.href} key={i} className="glass-card p-5 cursor-pointer shrink-0 w-[160px] no-underline">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 relative z-10 ${c.className}`}>
                <c.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1 relative z-10">{c.title}</h3>
              <p className="text-xs text-white/30 relative z-10">{c.count} предложений</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ======== HOT OFFERS ======== */}
      <section className="w-full">
        <div className="flex justify-between items-center mb-7">
          <h2 className="text-2xl font-bold text-white">Популярные Сделки</h2>
          <button className="text-sm text-purple-400 flex items-center gap-1 cursor-pointer bg-transparent border-0">
            Смотреть все <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            <div className="col-span-1 md:col-span-4 text-center py-10 text-white/50">Загрузка скидок...</div>
          ) : trendingOffers.length > 0 ? (
            trendingOffers.map((o: Offer, i: number) => (
              <Link href={`/offer/?id=${o.id}`} key={o.id || i} className="rounded-2xl overflow-hidden cursor-pointer block no-underline group hover:-translate-y-1 transition-all duration-300 offer-card">
                <div className="w-full h-44 relative bg-white/5 flex items-center justify-center p-6 offer-card-image-bg">
                  <SafeImage 
                    src={o.vendorLogo || ''} 
                    fill 
                    className="object-contain p-6 drop-shadow-xl transition-transform duration-500 group-hover:scale-110" 
                    alt={o.title} 
                  />
                  <div className="absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-semibold text-white/80 z-10 offer-card-category-badge">
                    {o.category}
                  </div>
                </div>
                <div className="p-5 relative z-10 bg-gradient-to-b from-transparent to-black/20">
                  <h3 className="text-base font-bold text-white mb-3 leading-snug line-clamp-2" title={o.title}>{o.title}</h3>
                  <div className="flex justify-between items-center">
                    <div>
                      {o.discountPercent !== null && o.discountPercent > 0 && <div className="text-xs text-white/25 line-through">${(o.price / (1 - o.discountPercent / 100)).toFixed(2)}</div>}
                      <div className="text-lg font-extrabold text-gradient-green">${o.price}</div>
                    </div>
                    <button className="px-4 py-2 rounded-xl text-white font-semibold text-sm cursor-pointer border-0 offer-card-buy-btn">
                      Купить
                    </button>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="col-span-1 sm:col-span-2 lg:col-span-4 text-center py-10 text-white/50">Новых предложений пока нет</div>
          )}
        </div>
      </section>
    </div>
  );
}
