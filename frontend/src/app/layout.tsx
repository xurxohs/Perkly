import type { Metadata } from 'next';
import Script from 'next/script';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Navbar } from '@/components/Navbar';
import { MobileDock } from '@/components/MobileDock';
import { Footer } from '@/components/Footer';
import AnalyticsTracker from '@/components/AnalyticsTracker';

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
          <Navbar />
          <main className="flex-1 mt-16 pb-28 md:pb-0 relative overflow-x-hidden">
            {children}
          </main>
          <Footer />
          <MobileDock />
        </Providers>
      </body>
    </html>
  );
}

