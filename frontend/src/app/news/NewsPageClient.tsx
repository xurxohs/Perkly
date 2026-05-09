'use client';

import NewsCard, { NewsItem } from '@/components/NewsCard';
import { Event } from '@/lib/api';

// Demo data fallback
const DEMO_NEWS: NewsItem[] = [
  {
    id: 'news-1',
    title: 'Electric Nights — крупнейший фестиваль лета!',
    imageUrl: '/demo-events/festival.png',
    date: '2026-08-15T00:00:00Z',
  },
  {
    id: 'news-2',
    title: 'Skyline Gala — вечеринка на крыше',
    imageUrl: '/demo-events/party.png',
    date: '2026-07-20T00:00:00Z',
  },
  {
    id: 'news-3',
    title: 'Abstract Voices — выставка современного искусства',
    imageUrl: '/demo-events/exhibition.png',
    date: '2026-06-10T00:00:00Z',
  },
  {
    id: 'news-4',
    title: 'Night Bites — ночной фуд-маркет',
    imageUrl: '/demo-events/food.png',
    date: '2026-09-05T00:00:00Z',
  },
  {
    id: 'news-5',
    title: 'Вечер Стендапа — лучшие комики города',
    imageUrl: '/demo-events/comedy.png',
    date: '2026-07-28T00:00:00Z',
  },
];

function eventToNewsItem(event: Event): NewsItem {
  return {
    id: event.id,
    title: event.title,
    imageUrl: event.imageUrl,
    date: event.date,
  };
}

export default function NewsPageClient({ events }: { events: Event[] }) {
  const newsItems: NewsItem[] =
    events && events.length > 0
      ? events.map(eventToNewsItem)
      : DEMO_NEWS;

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

      {/* Cards container */}
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
    </div>
  );
}
