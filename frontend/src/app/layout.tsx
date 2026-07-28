import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { LayoutShell } from '@/components/LayoutShell';
import AnalyticsTracker from '@/components/AnalyticsTracker';
import { OnboardingProvider } from '@/components/OnboardingProvider';
import { ADSENSE_PUBLISHER_ID } from '@/lib/adsense-config';

const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-inter' });
const siteName = 'Perkly';
const defaultTitle = 'Perkly — маркетплейс цифровых товаров и промокодов';
const defaultDescription = 'Промокоды, подписки и цифровые товары с понятными условиями, историей операции и оплатой в узбекских сумах.';

export const metadata: Metadata = {
  metadataBase: new URL('https://perkly.uz'),
  title: {
    default: defaultTitle,
    template: `%s · ${siteName}`,
  },
  description: defaultDescription,
  alternates: {
    // Next resolves `./` against the current route and strips query variants.
    canonical: './',
  },
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    siteName,
    url: './',
    title: defaultTitle,
    description: defaultDescription,
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Perkly — маркетплейс цифровых товаров и промокодов' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: defaultTitle,
    description: defaultDescription,
    images: ['/og-image.png'],
  },
  manifest: '/manifest.json',
  icons: {
    apple: '/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Perkly',
  },
  formatDetection: {
    telephone: false,
  },
  other: ADSENSE_PUBLISHER_ID
    ? { 'google-adsense-account': ADSENSE_PUBLISHER_ID }
    : undefined,
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  colorScheme: 'light dark',
  // The stored Perkly theme is applied before paint below. A single initial
  // color prevents Safari from choosing its dark chrome from the OS theme.
  themeColor: '#EEF2FF',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="dark" data-perkly-theme="light" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => {
              try {
                const theme = localStorage.getItem('perkly-theme') === 'dark' ? 'dark' : 'light';
                const color = theme === 'dark' ? '#0A0F24' : '#EEF2FF';
                const root = document.documentElement;
                root.dataset.perklyTheme = theme;
                root.style.backgroundColor = color;
                root.style.colorScheme = theme;
                document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
                  meta.removeAttribute('media');
                  meta.setAttribute('content', color);
                });
              } catch (_) {}
            })();`,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased min-h-screen flex flex-col`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'Organization',
                  '@id': 'https://perkly.uz/#organization',
                  name: 'Perkly',
                  url: 'https://perkly.uz',
                  logo: 'https://perkly.uz/icon-512.png',
                  contactPoint: {
                    '@type': 'ContactPoint',
                    email: 'support@perkly.uz',
                    contactType: 'customer support',
                    availableLanguage: ['Russian', 'Uzbek'],
                  },
                },
                {
                  '@type': 'WebSite',
                  '@id': 'https://perkly.uz/#website',
                  url: 'https://perkly.uz',
                  name: 'Perkly',
                  publisher: { '@id': 'https://perkly.uz/#organization' },
                  potentialAction: {
                    '@type': 'SearchAction',
                    target: {
                      '@type': 'EntryPoint',
                      urlTemplate: 'https://perkly.uz/search?q={search_term_string}',
                    },
                    'query-input': 'required name=search_term_string',
                  },
                },
              ],
            }).replace(/</g, '\\u003c'),
          }}
        />
        <Providers>
          <AnalyticsTracker />
          <OnboardingProvider>
            <LayoutShell>
              {children}
            </LayoutShell>
          </OnboardingProvider>
        </Providers>
      </body>
    </html>
  );
}
