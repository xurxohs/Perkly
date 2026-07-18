'use client';

import { AuthProvider } from '@/lib/AuthContext';
import { CartProvider } from '@/lib/CartContext';
import { AdSenseRuntime } from '@/components/AdSense';
import { ConsentProvider } from '@/components/ConsentManager';
import { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
    return (
        <ConsentProvider>
            <AuthProvider>
                <CartProvider>
                    <AdSenseRuntime />
                    {children}
                </CartProvider>
            </AuthProvider>
        </ConsentProvider>
    );
}
