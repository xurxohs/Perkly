import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PublicArticlePage } from '@/components/PublicArticlePage';
import { guideArticles, guideBySlug } from '@/content/trust-pages';

export function generateStaticParams() {
  return guideArticles.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = guideBySlug.get(slug);
  if (!article) return {};
  return { title: article.title, description: article.description, alternates: { canonical: `/guides/${slug}` }, openGraph: { type: 'article', title: article.title, description: article.description, url: `/guides/${slug}` } };
}

export default async function GuideArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = guideBySlug.get(slug);
  if (!article) notFound();
  return <PublicArticlePage title={article.title} intro={`${article.description} Время чтения: ${article.readingTime}.`} sections={article.sections} related={[
    { href: '/guides', title: 'Все материалы', description: 'Другие практические руководства Perkly.' },
    { href: '/safety', title: 'Безопасность', description: 'Общие правила защиты аккаунта и сделки.' },
    { href: '/support', title: 'Поддержка', description: 'Помощь по конкретной покупке или аккаунту.' },
  ]} />;
}
