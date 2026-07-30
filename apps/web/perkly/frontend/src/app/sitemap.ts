import type { MetadataRoute } from 'next';

import { guideArticles } from '@/content/trust-pages';

type SitemapOffer = {
  id: string;
  updatedAt?: string;
};

async function activeOfferEntries(): Promise<MetadataRoute.Sitemap> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';
  const entries: MetadataRoute.Sitemap = [];
  const take = 100;

  try {
    for (let skip = 0; skip < 2_000; skip += take) {
      const response = await fetch(`${apiBase}/offers?skip=${skip}&take=${take}`, {
        next: { revalidate: 3600 },
      });
      if (!response.ok) break;
      const payload = (await response.json()) as { data?: SitemapOffer[]; total?: number };
      const offers = Array.isArray(payload.data) ? payload.data : [];
      entries.push(
        ...offers.map((offer) => ({
          url: `https://perkly.uz/offer?id=${encodeURIComponent(offer.id)}`,
          lastModified: offer.updatedAt ? new Date(offer.updatedAt) : undefined,
          changeFrequency: 'daily' as const,
          priority: 0.8,
        })),
      );
      if (offers.length < take || entries.length >= (payload.total ?? 0)) break;
    }
  } catch {
    // Static routes remain available if the API is temporarily unavailable.
  }

  return entries;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = [
    '', '/catalog', '/coupons', '/search', '/sell', '/pricing', '/about', '/how-it-works', '/safety',
    '/seller-rules', '/content-policy', '/refunds', '/contacts', '/guides',
    '/support', '/privacy', '/terms',
    ...guideArticles.map(({ slug }) => `/guides/${slug}`),
  ];
  const editorialUpdate = new Date('2026-07-18T00:00:00+05:00');
  const staticEntries: MetadataRoute.Sitemap = pages.map((path) => ({
    url: `https://perkly.uz${path}`,
    lastModified: editorialUpdate,
    changeFrequency: path === '' ? 'daily' : path.startsWith('/guides') ? 'monthly' : 'weekly',
    priority: path === '' ? 1 : path === '/guides' ? 0.8 : 0.7,
  }));
  return [...staticEntries, ...(await activeOfferEntries())];
}
