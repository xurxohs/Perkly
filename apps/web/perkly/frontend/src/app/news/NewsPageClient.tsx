'use client';

import NewsCard, { NewsItem } from '@/components/NewsCard';
import { Event } from '@/lib/api';
import { Newspaper } from 'lucide-react';
import Link from 'next/link';

function isCurrent(event: Event) {
  const timestamp = new Date(event.date).getTime();
  return Number.isFinite(timestamp) && timestamp + 86_400_000 >= Date.now();
}

function eventToNewsItem(event: Event): NewsItem {
  return {
    id: event.id,
    title: event.title,
    imageUrl: event.imageUrl,
    date: event.date,
  };
}

export default function NewsPageClient({ events }: { events: Event[] }) {
  const newsItems = events.filter(isCurrent).map(eventToNewsItem);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#111111',
        paddingBottom: 80,
      }}
    >
      {/* Page title */}
      <h1
        style={{
          textAlign: 'center',
          color: '#fff',
          fontSize: 24,
          fontWeight: 700,
          paddingTop: 16,
          margin: 0,
        }}
      >
        Новости
      </h1>

      {newsItems.length > 0 ? (
        <div
          style={{
            paddingLeft: 16,
            paddingRight: 16,
            paddingTop: 16,
          }}
        >
          {newsItems.map((item, index) => (
            <NewsCard key={item.id} item={item} index={index} />
          ))}
        </div>
      ) : (
        <div className="mx-auto flex min-h-[65vh] max-w-md flex-col items-center justify-center px-6 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/[0.04]">
            <Newspaper className="h-7 w-7 text-white/20" />
          </div>
          <h2 className="text-2xl font-bold text-white/75">Пока нет новых публикаций</h2>
          <p className="mt-2 text-sm leading-6 text-white/35">
            Здесь появятся подтверждённые новости и актуальные события Perkly.
          </p>
          <Link
            href="/catalog"
            className="mt-7 inline-flex h-11 items-center rounded-full bg-white px-5 text-sm font-bold text-black no-underline"
          >
            Смотреть каталог
          </Link>
        </div>
      )}
    </div>
  );
}
