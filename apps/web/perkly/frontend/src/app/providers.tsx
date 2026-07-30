'use client';

import { AuthProvider } from '@/lib/AuthContext';
import { CartProvider } from '@/lib/CartContext';
import { AdSenseRuntime } from '@/components/AdSense';
import { ConsentProvider } from '@/components/ConsentManager';
import { ReactNode } from 'react';
import { LanguageProvider } from '@/lib/i18n';
import { LanguageAccountSync } from '@/components/LanguageAccountSync';

export function Providers({ children }: { children: ReactNode }) {
    return (
        <LanguageProvider>
            <ConsentProvider>
                <AuthProvider>
                    <CartProvider>
                        <AdSenseRuntime />
                        <LanguageAccountSync />
                        {children}
                    </CartProvider>
                </AuthProvider>
            </ConsentProvider>
        </LanguageProvider>
    );
}
