export const dynamic = 'force-dynamic';
import FeedPage from '@/components/FeedPage';
import { eventsApi } from '@/lib/api';

export const metadata = {
  title: 'Топка | Perkly — Мероприятия и События',
  description: 'Актуальные мероприятия, концерты и события, опубликованные в Perkly.',
};

async function getEvents() {
  try {
    const { data } = await eventsApi.list({ take: 20 });
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
