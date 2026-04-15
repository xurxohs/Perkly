export const dynamic = 'force-dynamic';
import FeedPage from '@/components/FeedPage';
import { eventsApi } from '@/lib/api';

export const metadata = {
  title: 'Топка | Perkly — Мероприятия и События',
  description: 'Найди лучшие мероприятия, концерты и вечеринки в новом формате кинокарточек.',
};

async function getEvents() {
  try {
    const { data } = await eventsApi.list({ take: 15 });
    return data || [];
  } catch (err) {
    console.error('SSR Events fetch failed:', err);
    return [];
  }
}

export default async function FeedPageRoute() {
  const events = await getEvents();

  return <FeedPage events={events} />;
}
