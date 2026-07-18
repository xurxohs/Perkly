import type { MetadataRoute } from 'next';

import { guideArticles } from '@/content/trust-pages';

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    '', '/sell', '/pricing', '/about', '/how-it-works', '/safety',
    '/seller-rules', '/content-policy', '/refunds', '/contacts', '/guides',
    '/support', '/privacy', '/terms',
    ...guideArticles.map(({ slug }) => `/guides/${slug}`),
  ];
  const editorialUpdate = new Date('2026-07-18T00:00:00+05:00');
  return pages.map((path) => ({
    url: `https://perkly.uz${path}`,
    lastModified: editorialUpdate,
    changeFrequency: path === '' ? 'daily' : path.startsWith('/guides') ? 'monthly' : 'weekly',
    priority: path === '' ? 1 : path === '/guides' ? 0.8 : 0.7,
  }));
}
