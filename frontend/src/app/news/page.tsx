export const dynamic = 'force-dynamic';
import NewsPageClient from './NewsPageClient';
import { eventsApi } from '@/lib/api';

export const metadata = {
  title: 'Новости | Perkly — События и Обновления',
  description: 'Актуальные новости, мероприятия и обновления платформы Perkly.',
};

async function getNews() {
  try {
    const { data } = await eventsApi.list({ take: 20 });
    return data || [];
  } catch (err) {
    console.error('SSR News fetch failed:', err);
    return [];
  }
}

export default async function NewsPage() {
  const events = await getNews();

  return <NewsPageClient events={events} />;
}
