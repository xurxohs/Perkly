import type { Metadata } from 'next';
import { PublicArticlePage } from '@/components/PublicArticlePage';
import { howItWorksSections } from '@/content/trust-pages';

export const metadata: Metadata = {
  title: 'Как работает покупка',
  description: 'Пошагово: как выбрать предложение, проверить условия, оплатить, получить товар и открыть спор в Perkly.',
  alternates: { canonical: '/how-it-works' },
};

export default function HowItWorksPage() {
  return <PublicArticlePage title="Как работает покупка" intro="Пять понятных этапов без скрытых переходов: выбор, проверка условий, покупка, получение и решение проблемы, если она возникла." sections={howItWorksSections} related={[
    { href: '/guides/check-digital-offer', title: 'Проверить предложение', description: 'Чек-лист перед оплатой цифрового товара.' },
    { href: '/refunds', title: 'Возвраты и споры', description: 'Когда открывать спор и что приложить.' },
    { href: '/catalog', title: 'Открыть каталог', description: 'Перейти к прошедшим модерацию предложениям.' },
  ]} />;
}
