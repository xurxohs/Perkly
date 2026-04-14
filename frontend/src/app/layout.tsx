import type { Metadata } from 'next';
import Script from 'next/script';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { LayoutShell } from '@/components/LayoutShell';
import AnalyticsTracker from '@/components/AnalyticsTracker';
import { OnboardingProvider } from '@/components/OnboardingProvider';

const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Perkly | Премиум Маркетплейс Цифровых Услуг',
  description: 'Покупка и продажа промокодов, подписок и цифровых товаров с безопасной сделкой.',
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


