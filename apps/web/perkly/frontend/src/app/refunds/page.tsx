import type { Metadata } from 'next';
import { PublicArticlePage } from '@/components/PublicArticlePage';
import { refundsSections } from '@/content/trust-pages';

export const metadata: Metadata = {
  title: 'Возвраты и споры',
  description: 'Когда открывать спор в Perkly, какие доказательства приложить и какие решения возможны.',
  alternates: { canonical: '/refunds' },
};

export default function RefundsPage() {
  return <PublicArticlePage title="Возвраты и споры" intro="Разбираем проблемную покупку по фактам: что обещано, что получено и какие подтверждения доступны обеим сторонам." sections={refundsSections} related={[
    { href: '/how-it-works', title: 'Как работает покупка', description: 'Путь заказа и момент проверки результата.' },
    { href: '/safety', title: 'Безопасность', description: 'Как сохранить доказательства и аккаунт.' },
    { href: '/support', title: 'Открыть поддержку', description: 'Каналы связи и данные для обращения.' },
  ]} />;
}
