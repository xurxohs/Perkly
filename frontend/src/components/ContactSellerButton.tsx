'use client';

import { useState } from 'react';
import { MessageSquare, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import api from '@/lib/api';

export function ContactSellerButton({ sellerId }: { sellerId: string }) {
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const [loading, setLoading] = useState(false);

    const handleOpenChat = async () => {
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }

        setLoading(true);
        try {
            const res = await api.chat.createRoom({ targetUserId: sellerId });
            router.push('/chat');
        } catch (err) {
            console.error('Failed to open seller chat:', err);
            router.push('/chat');
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handleOpenChat}
            disabled={loading}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-purple-500/15 px-3.5 text-xs font-extrabold text-purple-300 border border-purple-500/30 transition-all hover:bg-purple-500/25 active:scale-95 disabled:opacity-50 cursor-pointer"
        >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />}
            Чат с продавцом
        </button>
    );
}
