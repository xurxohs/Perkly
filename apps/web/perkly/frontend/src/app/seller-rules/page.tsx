import type { Metadata } from 'next';
import { PublicArticlePage } from '@/components/PublicArticlePage';
import { sellerRulesSections } from '@/content/trust-pages';

export const metadata: Metadata = {
  title: 'Правила продавцов',
  description: 'Требования Perkly к продавцам, карточкам, правам на материалы, исполнению заказов и модерации.',
  alternates: { canonical: '/seller-rules' },
};

export default function SellerRulesPage() {
  return <PublicArticlePage title="Правила продавцов" intro="Понятная карточка, законный товар и предсказуемое исполнение важнее количества публикаций. Эти правила применяются к каждому предложению." sections={sellerRulesSections} related={[
    { href: '/content-policy', title: 'Запрещённый контент', description: 'Категории и практики, которые не допускаются.' },
    { href: '/guides/create-clear-listing', title: 'Сильная карточка', description: 'Практическая структура предложения.' },
    { href: '/sell', title: 'Стать продавцом', description: 'Условия регистрации компании.' },
  ]} />;
}
