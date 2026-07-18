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
  return {
    title: article.title,
    description: article.description,
    authors: [{ name: 'Редакция Perkly', url: 'https://perkly.uz/about' }],
    alternates: { canonical: `/guides/${slug}` },
    openGraph: {
      type: 'article',
      title: article.title,
      description: article.description,
      url: `/guides/${slug}`,
      publishedTime: '2026-07-18T00:00:00+05:00',
      modifiedTime: '2026-07-18T00:00:00+05:00',
      authors: ['https://perkly.uz/about'],
      images: [{ url: '/icon-512.png', width: 512, height: 512, alt: 'Perkly' }],
    },
  };
}

export default async function GuideArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = guideBySlug.get(slug);
  if (!article) notFound();
  const canonicalUrl = `https://perkly.uz/guides/${article.slug}`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    datePublished: '2026-07-18T00:00:00+05:00',
    dateModified: '2026-07-18T00:00:00+05:00',
    inLanguage: 'ru',
    mainEntityOfPage: canonicalUrl,
    image: 'https://perkly.uz/icon-512.png',
    author: { '@type': 'Organization', name: 'Редакция Perkly', url: 'https://perkly.uz/about' },
    publisher: { '@type': 'Organization', name: 'Perkly', url: 'https://perkly.uz', logo: { '@type': 'ImageObject', url: 'https://perkly.uz/icon-512.png' } },
  };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
    <PublicArticlePage title={article.title} author="Редакция Perkly" intro={`${article.description} Время чтения: ${article.readingTime}.`} sections={article.sections} related={[
    { href: '/guides', title: 'Все материалы', description: 'Другие практические руководства Perkly.' },
    { href: '/safety', title: 'Безопасность', description: 'Общие правила защиты аккаунта и сделки.' },
    { href: '/support', title: 'Поддержка', description: 'Помощь по конкретной покупке или аккаунту.' },
  ]} />
  </>;
}
