import type { Metadata } from 'next';

// The public catalog is intentionally excluded from search indexing while it
// has no production inventory. Remove this override only after real,
// moderated offers are live; ads remain disabled on marketplace routes.
export const metadata: Metadata = {
  title: 'Каталог',
  description: 'Каталог проверенных предложений Perkly с ценами в узбекских сумах.',
  robots: {
    index: false,
    follow: true,
    googleBot: {
      index: false,
      follow: true,
    },
  },
  alternates: { canonical: '/catalog' },
};

export default function CatalogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
