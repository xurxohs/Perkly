import type { Metadata } from 'next';
import { PublicArticlePage } from '@/components/PublicArticlePage';
import { safetySections } from '@/content/trust-pages';

export const metadata: Metadata = {
  title: 'Безопасность',
  description: 'Правила безопасной покупки, защита аккаунта, жалобы, модерация и действия при подозрении на мошенничество.',
  alternates: { canonical: '/safety' },
};

export default function SafetyPage() {
  return <PublicArticlePage title="Безопасность в Perkly" intro="Никакой маркетплейс не устраняет риск полностью. Мы объясняем, как его уменьшить, какие данные нельзя передавать и как зафиксировать проблему." sections={safetySections} related={[
    { href: '/content-policy', title: 'Правила контента', description: 'Что нельзя продавать и публиковать.' },
    { href: '/refunds', title: 'Возвраты и споры', description: 'Порядок рассмотрения проблемной покупки.' },
    { href: '/support', title: 'Поддержка', description: 'Сообщить о проблеме команде Perkly.' },
  ]} />;
}
