import type { Metadata } from 'next';
import Script from 'next/script';
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
    images: [{ url: '/icon-512.png', width: 512, height: 512, alt: 'Perkly' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: defaultTitle,
    description: defaultDescription,
    images: ['/icon-512.png'],
  },
  manifest: '/manifest.json',
  icons: {
    apple: '/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Perkly',
  },
  formatDetection: {
    telephone: false,
  },
  other: ADSENSE_PUBLISHER_ID
    ? { 'google-adsense-account': ADSENSE_PUBLISHER_ID }
    : undefined,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="dark" suppressHydrationWarning>
      <head>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      </head>
      <body className={`${inter.variable} font-sans antialiased text-white min-h-screen flex flex-col bg-black`}>
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
