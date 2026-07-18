'use client';

import Link from 'next/link';
import { Mail, MapPin, MessageCircle } from 'lucide-react';
import { useTelegram } from '@/hooks/useTelegram';

const footerGroups = [
  {
    title: 'Perkly',
    links: [
      { href: '/about', label: 'О сервисе' },
      { href: '/how-it-works', label: 'Как это работает' },
      { href: '/guides', label: 'Полезные материалы' },
      { href: '/contacts', label: 'Контакты' },
    ],
  },
  {
    title: 'Покупателям',
    links: [
      { href: '/catalog', label: 'Каталог' },
      { href: '/safety', label: 'Безопасность' },
      { href: '/refunds', label: 'Возвраты и споры' },
      { href: '/support', label: 'Поддержка' },
    ],
  },
  {
    title: 'Продавцам',
    links: [
      { href: '/sell', label: 'Стать продавцом' },
      { href: '/seller-rules', label: 'Правила продавцов' },
      { href: '/content-policy', label: 'Правила контента' },
      { href: '/guides/create-clear-listing', label: 'Как оформить карточку' },
    ],
  },
];

export function Footer() {
  const { isTMA } = useTelegram();
  if (isTMA) return null;

  return (
    <footer className="relative mt-auto w-full border-t border-white/[0.06] bg-[#08080b] text-white">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-3 text-white no-underline">
              <span className="h-9 w-9 rounded-full bg-primary-gradient" />
              <span className="text-xl font-semibold tracking-tight">Perkly</span>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-6 text-white/45">Каталог предложений и цифровых товаров для Узбекистана. Цена, ограничения и способ получения должны быть понятны до покупки.</p>
            <div className="mt-6 flex flex-wrap gap-4 text-sm text-white/55">
              <a href="mailto:support@perkly.uz" className="inline-flex items-center gap-2 text-inherit no-underline hover:text-white"><Mail className="h-4 w-4" />support@perkly.uz</a>
              <a href="https://t.me/perkly_support" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-inherit no-underline hover:text-white"><MessageCircle className="h-4 w-4" />@perkly_support</a>
              <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" />Узбекистан</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {footerGroups.map((group) => <div key={group.title}><h2 className="text-sm font-semibold">{group.title}</h2><ul className="mt-4 space-y-3 p-0 text-sm text-white/45">{group.links.map((link) => <li key={link.href} className="list-none"><Link href={link.href} className="text-inherit no-underline hover:text-white">{link.label}</Link></li>)}</ul></div>)}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/[0.06] pt-7 text-xs text-white/35 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Perkly. Информация о предложении проверяется перед покупкой.</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2"><Link href="/privacy" className="text-inherit no-underline hover:text-white">Конфиденциальность</Link><Link href="/terms" className="text-inherit no-underline hover:text-white">Условия использования</Link><button type="button" onClick={() => window.dispatchEvent(new Event('perkly-open-privacy-settings'))} className="border-0 bg-transparent p-0 text-inherit hover:text-white">Настройки конфиденциальности</button></div>
        </div>
      </div>
    </footer>
  );
}
