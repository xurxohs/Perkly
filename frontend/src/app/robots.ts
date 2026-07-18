import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/admin/', '/vendor/', '/profile/', '/chat/', '/messages/', '/notifications/', '/cart/'] },
      { userAgent: 'AdsBot-Google', allow: '/' },
      { userAgent: 'Mediapartners-Google', allow: '/' },
    ],
    sitemap: 'https://perkly.uz/sitemap.xml',
    host: 'https://perkly.uz',
  };
}
