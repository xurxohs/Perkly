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
  const [isGift, setIsGift] = useState(false);
  const [giftCode, setGiftCode] = useState<string | null>(null);
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
      const tx = await transactionsApi.purchase(offer.id, isGift);
      hapticNotification('success');
      setPurchased(true);
      if (isGift && tx.giftCode) {
        setGiftCode(tx.giftCode);
      }
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
    const BOT_USERNAME = process.env.NEXT_PUBLIC_BOT_USERNAME || 'PerklyPlatformBot';
    const giftLink = `https://t.me/${BOT_USERNAME}?start=gift_${giftCode}`;

    return (
      <div className="p-4 rounded-xl mb-4 bg-green-500/10 border border-green-500/20">
        <p className="text-green-400 font-semibold mb-1 flex items-center gap-1.5">
          <CheckCircle className="w-4 h-4" /> {isGift ? 'Подарок готов!' : 'Покупка успешна!'}
        </p>
        {isGift ? (
          <>
            <p className="text-white/80 text-sm mb-3">Скопируйте ссылку ниже и отправьте ее другу:</p>
            <div className="bg-black/40 p-3 rounded-lg border border-white/10 break-all font-mono text-xs mb-3 select-all">
              {giftLink}
            </div>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(giftLink);
                hapticImpact('light');
              }}
              className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-semibold transition-all"
            >
              Копировать ссылку
            </button>
          </>
        ) : (
          <p className="text-green-400/60 text-sm">🛡 Средства удержаны системой Эскроу. Подтвердите получение товара в профиле после проверки.</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10 mb-1">
        <input 
          type="checkbox" 
          id="gift-toggle"
          checked={isGift}
          onChange={(e) => {
            hapticImpact('light');
            setIsGift(e.target.checked);
          }}
          className="w-5 h-5 accent-purple-500 cursor-pointer"
        />
        <label htmlFor="gift-toggle" className="text-sm text-white/80 cursor-pointer select-none">
          🎁 Купить в подарок (создать ссылку)
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleBuy}
          disabled={purchasing}
          className="flex-1 py-4 rounded-xl text-white font-bold text-base cursor-pointer border-0 transition-all bg-gradient-to-r from-purple-500 to-pink-500 shadow-[0_0_25px_rgba(168,85,247,0.3)] disabled:opacity-60"
        >
          {purchasing ? 'Обработка...' : isGift ? 'Купить подарок' : offer.price === 0 ? 'Получить бесплатно' : `Купить за ${offer.price.toFixed(2)}$`}
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
