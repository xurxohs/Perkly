import type { MetadataRoute } from 'next';

const PRIVATE_OR_NON_CONTENT_PREFIXES = [
  '/api',
  '/admin',
  '/vendor',
  '/profile',
  '/chat',
  '/messages',
  '/notifications',
  '/cart',
  '/login',
  '/register',
  '/sell/dashboard',
  '/search',
  '/offer',
  '/map',
  '/plans',
  '/wheel',
  '/feed',
  '/news',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: PRIVATE_OR_NON_CONTENT_PREFIXES },
      { userAgent: 'AdsBot-Google', allow: '/', disallow: PRIVATE_OR_NON_CONTENT_PREFIXES },
      { userAgent: 'Mediapartners-Google', allow: '/', disallow: PRIVATE_OR_NON_CONTENT_PREFIXES },
    ],
    sitemap: 'https://perkly.uz/sitemap.xml',
    host: 'https://perkly.uz',
  };
}
