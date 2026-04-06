'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, CheckCircle, Share2 } from 'lucide-react';
import { transactionsApi } from '@/lib/api';
import { useCart } from '@/lib/CartContext';
import { useAuth } from '@/lib/AuthContext';
import { useTelegram } from '@/hooks/useTelegram';

interface OfferActionsProps {
  offer: {
    id: string;
    title: string;
    price: number;
    category: string;
  };
}

export default function OfferActions({ offer }: OfferActionsProps) {
  const router = useRouter();
  const { isAuthenticated, refreshUser } = useAuth();
  const { addItem, isInCart } = useCart();
  const { hapticImpact, hapticNotification } = useTelegram();

  const [purchasing, setPurchasing] = useState(false);
  const [purchased, setPurchased] = useState(false);
  const [error, setError] = useState('');

  const handleBuy = async () => {
    if (!isAuthenticated) {
      hapticImpact('medium');
      router.push('/login');
      return;
    }
    hapticImpact('heavy');
    setPurchasing(true);
    setError('');
    try {
      await transactionsApi.purchase(offer.id);
      hapticNotification('success');
      setPurchased(true);
      await refreshUser();
    } catch (err: unknown) {
      hapticNotification('error');
      const error = err as Error;
      setError(error.message || 'Ошибка при покупке');
    } finally {
      setPurchasing(false);
    }
  };

  const handleShare = () => {
    const BOT_USERNAME = process.env.NEXT_PUBLIC_BOT_USERNAME || 'PerklyPlatformBot';
    const url = `https://t.me/${BOT_USERNAME}/app?startapp=offer_${offer.id}`;
    const text = `🔥 Смотри, что я нашел в Perkly:\n\n${offer.title}\nЦена: ${offer.price === 0 ? 'Бесплатно' : offer.price + '$'}`;

    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;

    const tg = typeof window !== 'undefined' ? (window as any).Telegram?.WebApp : null;
    if (tg?.initData) {
      tg.openTelegramLink(shareUrl);
    } else {
      window.open(shareUrl, '_blank');
    }
  };

  if (purchased) {
    return (
      <div className="p-4 rounded-xl mb-4 bg-green-500/10 border border-green-500/20">
        <p className="text-green-400 font-semibold mb-1 flex items-center gap-1.5">
          <CheckCircle className="w-4 h-4" /> Покупка успешна!
        </p>
        <p className="text-green-400/60 text-sm">🛡 Средаства удержаны системой Эскроу. Подтвердите получение товара в профиле после проверки.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleBuy}
          disabled={purchasing}
          className="flex-1 py-4 rounded-xl text-white font-bold text-base cursor-pointer border-0 transition-all bg-gradient-to-r from-purple-500 to-pink-500 shadow-[0_0_25px_rgba(168,85,247,0.3)] disabled:opacity-60"
        >
          {purchasing ? 'Обработка...' : offer.price === 0 ? 'Получить бесплатно' : `Купить за ${offer.price.toFixed(2)}$`}
        </button>

        <button
          onClick={() => {
            hapticImpact('medium');
            addItem({ offerId: offer.id, title: offer.title, price: offer.price, category: offer.category });
          }}
          disabled={isInCart(offer.id)}
          className={`px-6 py-4 rounded-xl font-semibold cursor-pointer border transition-all flex items-center justify-center ${
            isInCart(offer.id) 
              ? 'bg-green-500/10 border-green-500/20 text-green-500' 
              : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
          }`}
        >
          {isInCart(offer.id) ? <CheckCircle className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
        </button>

        <button
          onClick={() => {
            hapticImpact('light');
            handleShare();
          }}
          className="px-6 py-4 rounded-xl font-semibold cursor-pointer border transition-all flex items-center justify-center bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20"
          title="Поделиться в Telegram"
        >
          <Share2 className="w-5 h-5" />
        </button>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}
