import type { Metadata } from 'next';
import { PublicArticlePage } from '@/components/PublicArticlePage';
import { aboutSections } from '@/content/trust-pages';

export const metadata: Metadata = {
  title: 'О Perkly',
  description: 'Как устроен Perkly, зачем мы развиваем площадку в Узбекистане и как работаем с доверием и модерацией.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return <PublicArticlePage title="О Perkly" intro="Площадка, где условия цифровой покупки должны быть понятны до оплаты, а у пользователя остаются история операции, поддержка и способ сообщить о проблеме." sections={aboutSections} related={[
    { href: '/how-it-works', title: 'Как это работает', description: 'Путь покупателя от поиска до получения.' },
    { href: '/safety', title: 'Безопасность', description: 'Что проверять и как действовать при проблеме.' },
    { href: '/contacts', title: 'Контакты', description: 'Каналы связи с командой Perkly.' },
  ]} />;
}
