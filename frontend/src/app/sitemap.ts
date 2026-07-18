import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ['', '/catalog', '/feed', '/news', '/map', '/sell', '/pricing', '/support', '/privacy', '/terms'];
  const now = new Date();
  return pages.map((path) => ({
    url: `https://perkly.uz${path}`,
    lastModified: now,
    changeFrequency: path === '' || path === '/catalog' ? 'daily' : 'weekly',
    priority: path === '' ? 1 : path === '/catalog' ? 0.9 : 0.6,
  }));
}
