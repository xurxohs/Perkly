import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

export function BrandButton({ href, children, variant = 'primary' }: { href: string; children: ReactNode; variant?: 'primary' | 'secondary' }) {
  return <Link href={href} className={`brand-button brand-button-${variant}`}>
    <span>{children}</span>
    <ArrowRight aria-hidden="true" />
  </Link>;
}
