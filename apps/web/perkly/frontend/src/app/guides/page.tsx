import type { Metadata } from 'next';
import Link from 'next/link';
import { guideArticles } from '@/content/trust-pages';

export const metadata: Metadata = {
  title: 'Полезные материалы',
  description: 'Практические руководства Perkly по безопасной покупке, промокодам и качественным карточкам продавцов.',
  alternates: { canonical: '/guides' },
};

export default function GuidesPage() {
  return <main className="public-info-page min-h-screen px-5 py-12 sm:py-16"><div className="mx-auto max-w-6xl">
    <nav aria-label="Хлебные крошки" className="public-info-muted text-sm"><Link href="/" className="public-info-link public-info-breadcrumb-link">Perkly</Link> / Материалы</nav>
    <header className="public-info-hero mt-8 rounded-[2rem] p-8 sm:p-12 lg:p-14"><h1 className="max-w-4xl text-4xl font-bold tracking-[-0.04em] sm:text-6xl">Покупать и продавать понятнее</h1><p className="public-info-muted mt-6 max-w-3xl text-lg leading-8 sm:text-xl">Не рекламные обещания, а практические инструкции: что проверить до оплаты, как работает промокод и какие сведения нужны в карточке товара.</p></header>
    <section className="mt-8 grid gap-5 md:grid-cols-2">{guideArticles.map((article) => <Link key={article.slug} href={`/guides/${article.slug}`} className="public-info-panel group rounded-[1.75rem] p-7 no-underline transition-transform hover:-translate-y-0.5 sm:p-9"><p className="public-info-muted text-sm">{article.readingTime}</p><h2 className="mt-3 text-2xl font-semibold tracking-[-0.025em]">{article.title}</h2><p className="public-info-muted mt-4 leading-7">{article.description}</p><span className="public-info-link mt-7 inline-block text-sm font-semibold">Читать материал →</span></Link>)}</section>
  </div></main>;
}
