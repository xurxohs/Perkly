'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

const slides = [
    {
        eyebrow: 'Только в Perkly',
        title: 'Выгода для города',
        description: 'Промокоды заведений и сервисов Узбекистана — сразу после покупки.',
        href: '/catalog?fulfillmentType=PROMOCODE',
        action: 'Смотреть промокоды',
        accent: 'from-[#5424d6] via-[#a52ee9] to-[#ff3d91]',
        glow: 'bg-fuchsia-300/30',
        mark: 'P',
    },
    {
        eyebrow: 'Подписки без ожидания',
        title: 'Telegram и сервисы',
        description: 'Цифровой доступ с защищённой выдачей и оплатой только в сумах.',
        href: '/catalog?category=SUBSCRIPTIONS',
        action: 'Выбрать подписку',
        accent: 'from-[#0e65c7] via-[#1ba9e8] to-[#5be5ff]',
        glow: 'bg-cyan-200/35',
        mark: '↗',
    },
    {
        eyebrow: 'Предложения рядом',
        title: 'Город становится выгоднее',
        description: 'Кофе, рестораны, события и локальные услуги в одном каталоге.',
        href: '/catalog?category=RESTAURANTS&near=true',
        action: 'Найти рядом',
        accent: 'from-[#ff5a1f] via-[#ff8a1d] to-[#ffd058]',
        glow: 'bg-amber-100/30',
        mark: '•',
    },
];

const quickApps = [
    { label: 'Telegram', image: '/brands/telegram.svg', href: '/catalog?search=Telegram', badge: 'Популярно' },
    { label: 'Yandex', image: '/brands/yandex_plus.svg', href: '/catalog?search=Yandex' },
    { label: 'Uzum', image: '/brands/uzum_market.svg', href: '/catalog?search=Uzum', badge: 'Новое' },
    { label: 'Steam', image: '/brands/steam.svg', href: '/catalog?search=Steam' },
    { label: 'Dodo', image: '/brands/dodo_pizza.svg', href: '/catalog?search=Dodo' },
    { label: 'Skillbox', image: '/brands/skillbox.svg', href: '/catalog?search=Skillbox' },
    { label: 'Yandex Go', image: '/brands/yandex_go.svg', href: '/catalog?search=Yandex%20Go' },
    { label: 'Netflix', image: '/brands/netflix.svg', href: '/catalog?search=Netflix' },
];

export function CatalogShowcase() {
    const [active, setActive] = useState(0);
    const touchStart = useRef<number | null>(null);

    const select = useCallback((index: number) => {
        setActive((index + slides.length) % slides.length);
    }, []);

    useEffect(() => {
        const timer = window.setInterval(() => setActive((current) => (current + 1) % slides.length), 5500);
        return () => window.clearInterval(timer);
    }, []);

    const slide = slides[active];

    return (
        <section className="mb-7" aria-label="Рекомендуем в каталоге">
            <div
                className={`group relative min-h-[230px] overflow-hidden rounded-[30px] bg-gradient-to-br ${slide.accent} p-6 sm:min-h-[280px] sm:p-9`}
                onTouchStart={(event) => { touchStart.current = event.touches[0]?.clientX ?? null; }}
                onTouchEnd={(event) => {
                    if (touchStart.current === null) return;
                    const delta = (event.changedTouches[0]?.clientX ?? touchStart.current) - touchStart.current;
                    if (Math.abs(delta) > 45) select(active + (delta < 0 ? 1 : -1));
                    touchStart.current = null;
                }}
            >
                <div className={`pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full ${slide.glow} blur-3xl`} />
                <div className="pointer-events-none absolute -bottom-44 right-[12%] h-72 w-72 rounded-full border-[44px] border-white/10" />
                <div className="pointer-events-none absolute right-[8%] top-1/2 hidden -translate-y-1/2 text-[170px] font-black leading-none text-white/[0.13] sm:block">{slide.mark}</div>

                <div className="relative z-10 max-w-2xl">
                    <p className="text-[10px] font-black uppercase tracking-[.22em] text-white/70">{slide.eyebrow}</p>
                    <h2 className="mt-3 text-3xl font-black leading-[.98] tracking-[-.05em] text-white sm:text-5xl">{slide.title}</h2>
                    <p className="mt-4 max-w-xl text-sm leading-6 text-white/72 sm:text-base">{slide.description}</p>
                    <Link href={slide.href} className="mt-6 inline-flex h-11 items-center rounded-full bg-white px-5 text-sm font-black text-black no-underline transition hover:scale-[1.02]">{slide.action}</Link>
                </div>

                <button type="button" onClick={() => select(active - 1)} className="pointer-events-none absolute left-5 top-1/2 hidden -translate-y-1/2 border-0 bg-transparent p-3 text-5xl font-light leading-none text-white/90 opacity-0 drop-shadow-[0_2px_10px_rgba(0,0,0,.35)] transition duration-200 group-hover:pointer-events-auto group-hover:opacity-100 sm:block" aria-label="Предыдущий баннер">‹</button>
                <button type="button" onClick={() => select(active + 1)} className="pointer-events-none absolute right-5 top-1/2 hidden -translate-y-1/2 border-0 bg-transparent p-3 text-5xl font-light leading-none text-white/90 opacity-0 drop-shadow-[0_2px_10px_rgba(0,0,0,.35)] transition duration-200 group-hover:pointer-events-auto group-hover:opacity-100 sm:block" aria-label="Следующий баннер">›</button>

                <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
                    {slides.map((item, index) => (
                        <button key={item.title} type="button" onClick={() => select(index)} aria-label={`Баннер ${index + 1}`} className={`h-1.5 rounded-full border-0 transition-all ${index === active ? 'w-8 bg-white' : 'w-2 bg-white/35'}`} />
                    ))}
                </div>
            </div>

            <div className="-mx-6 overflow-x-auto px-6 pt-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex min-w-max gap-3 pb-1">
                    {quickApps.map((app) => (
                        <Link key={app.label} href={app.href} className="group relative w-[72px] shrink-0 text-center no-underline sm:w-[82px]">
                            {app.badge && <span className="absolute -top-2 left-1/2 z-10 -translate-x-1/2 rounded-full bg-emerald-500 px-2 py-0.5 text-[8px] font-black text-white shadow-lg">{app.badge}</span>}
                            <span className="app-icon-squircle mx-auto block h-16 w-16 overflow-hidden bg-[#17171c] shadow-[0_10px_28px_rgba(0,0,0,.32)] transition duration-200 group-hover:-translate-y-1 sm:h-[70px] sm:w-[70px]">
                                <Image src={app.image} alt="" width={70} height={70} className="h-full w-full object-cover" />
                            </span>
                            <span className="mt-2 block truncate text-[11px] font-semibold text-white/55 group-hover:text-white">{app.label}</span>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
