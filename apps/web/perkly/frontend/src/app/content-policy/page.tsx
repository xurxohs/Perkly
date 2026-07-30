import type { Metadata } from 'next';
import { PublicArticlePage } from '@/components/PublicArticlePage';
import { contentPolicySections } from '@/content/trust-pages';

export const metadata: Metadata = {
  title: 'Правила контента и запрещённые товары',
  description: 'Какие товары и публикации запрещены в Perkly, как проходит проверка и как подать апелляцию.',
  alternates: { canonical: '/content-policy' },
};

export default function ContentPolicyPage() {
  return <PublicArticlePage title="Правила контента" intro="Perkly не публикует всё подряд. Незаконные товары, мошенничество, контрафакт и вводящие в заблуждение карточки удаляются или не проходят модерацию." sections={contentPolicySections} related={[
    { href: '/seller-rules', title: 'Правила продавцов', description: 'Обязанности при публикации и исполнении.' },
    { href: '/safety', title: 'Безопасность', description: 'Жалобы и действия при подозрении на нарушение.' },
    { href: '/contacts', title: 'Сообщить о нарушении', description: 'Контакты поддержки и модерации.' },
  ]} />;
}
