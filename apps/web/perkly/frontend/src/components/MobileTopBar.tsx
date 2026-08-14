'use client';

import Link from 'next/link';
import { Search } from 'lucide-react';
import { PerklyGlyph } from '@/components/PerklyGlyph';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/i18n';

/** A compact, persistent orientation point for the mobile web experience. */
export function MobileTopBar() {
    const { isAuthenticated } = useAuth();
    const { t } = useLanguage();

    return (
        <header className="mobile-topbar md:hidden">
            <Link href="/" className="mobile-topbar-brand" aria-label="Perkly — главная">
                <span className="mobile-topbar-mark" aria-hidden="true">P</span>
                <span>Perkly</span>
            </Link>
            <div className="mobile-topbar-actions">
                <Link href="/search" className="mobile-topbar-action" aria-label={t('Поиск')}>
                    <Search className="h-[18px] w-[18px]" aria-hidden="true" />
                </Link>
                <Link
                    href={isAuthenticated ? '/profile' : '/login'}
                    className="mobile-topbar-action"
                    aria-label={isAuthenticated ? t('Профиль') : t('Войти')}
                >
                    <PerklyGlyph name="profile" className="h-[19px] w-[19px]" aria-hidden="true" />
                </Link>
            </div>
        </header>
    );
}
