'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { transactionsApi } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { useTelegram } from '@/hooks/useTelegram';
import { PerklyGlyph } from '@/components/PerklyGlyph';

interface OfferActionsProps {
  offer: {
    id: string;
    title: string;
    price: number;
    category: string;
    fulfillmentType: 'PROMOCODE' | 'DIGITAL_CODE' | 'LINK' | 'INSTRUCTIONS';
    usageInstructions?: string;
    buyerInputPrompt?: string | null;
    buyerInputRequired?: boolean;
    isDemo?: boolean;
  };
}

const fulfillmentCopy = {
  PROMOCODE: {
    title: 'Промокод или QR-код',
    detail: 'Код появится в профиле сразу после успешной покупки.',
    items: ['Рабочий код товара', 'Инструкция по активации', 'Защита покупки Perkly'],
  },
  DIGITAL_CODE: {
    title: 'Цифровая выдача',
    detail: 'Ключ или данные доступа появятся в защищённом разделе покупки.',
    items: ['Данные цифрового товара', 'Инструкция после покупки', 'Чат с продавцом'],
  },
  LINK: {
    title: 'Защищённая ссылка',
    detail: 'Ссылка на получение станет доступна после оплаты.',
    items: ['Ссылка на товар', 'Инструкция после покупки', 'Защита покупки Perkly'],
  },
  INSTRUCTIONS: {
    title: 'Получение по инструкции',
    detail: 'Продавец получит заказ, а вам откроются дальнейшие шаги.',
    items: ['Инструкция по получению', 'Чат с продавцом', 'Защита сделки Perkly'],
  },
} as const;

export default function OfferActions({ offer }: OfferActionsProps) {
  const router = useRouter();
  const { isAuthenticated, refreshUser } = useAuth();
  const { hapticImpact, hapticNotification } = useTelegram();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<1 | 2>(1);
  const [buyerComment, setBuyerComment] = useState('');
  const [isGift, setIsGift] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [purchased, setPurchased] = useState(false);
  const [giftCode, setGiftCode] = useState<string | null>(null);
  const [error, setError] = useState('');
  const fulfillment = fulfillmentCopy[offer.fulfillmentType] || fulfillmentCopy.INSTRUCTIONS;

  const openCheckout = () => {
    if (!isAuthenticated) {
      hapticImpact('medium');
      router.push('/login');
      return;
    }
    setError('');
    setCheckoutStep(1);
    setCheckoutOpen(true);
  };

  const closeCheckout = () => {
    if (purchasing) return;
    setCheckoutOpen(false);
    setCheckoutStep(1);
    setError('');
  };

  const confirmPurchase = async () => {
    if (offer.buyerInputRequired && !buyerComment.trim()) {
      setError('Заполните данные для получения товара.');
      setCheckoutStep(1);
      return;
    }
    hapticImpact('heavy');
    setPurchasing(true);
    setError('');
    try {
      const tx = await transactionsApi.purchase(
        offer.id,
        isGift,
        undefined,
        crypto.randomUUID(),
        buyerComment.trim() || undefined,
      );
      hapticNotification('success');
      setPurchased(true);
      setGiftCode(tx.giftCode || null);
      setCheckoutOpen(false);
      await refreshUser();
    } catch (err: unknown) {
      hapticNotification('error');
      setError(err instanceof Error ? err.message : 'Не удалось оформить покупку');
    } finally {
      setPurchasing(false);
    }
  };

  if (purchased) {
    return (
      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.08] p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400 text-black"><PerklyGlyph name="shield" className="h-5 w-5" /></span>
          <div><p className="font-bold text-white">{isGift ? 'Подарок готов' : 'Покупка оформлена'}</p><p className="mt-0.5 text-sm text-white/45">Откройте покупку в профиле, чтобы получить товар.</p></div>
        </div>
        {giftCode && <p className="mt-4 rounded-xl bg-black/30 p-3 text-center font-mono text-sm text-white/70">{giftCode}</p>}
      </div>
    );
  }

  return (
    <>
      <button onClick={openCheckout} className="w-full rounded-2xl border-0 bg-white py-4 text-base font-black text-black transition-colors hover:bg-white/90">
        {offer.isDemo ? 'Оформить beta-заказ' : offer.price === 0 ? 'Получить бесплатно' : `Купить за ${offer.price.toLocaleString('ru-RU')} сум`}
      </button>

      {checkoutOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeCheckout(); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="checkout-title" className="w-full max-w-[600px] overflow-hidden rounded-t-[30px] border border-white/[0.09] bg-[#151519] shadow-2xl sm:rounded-[28px]">
            <header className="flex items-center justify-between px-5 pb-4 pt-5 sm:px-7 sm:pt-6">
              <div><p className="text-[10px] font-black uppercase tracking-[.18em] text-purple-300/65">Шаг {checkoutStep} из 2</p><h2 id="checkout-title" className="mt-1 text-xl font-black text-white">{checkoutStep === 1 ? 'Получение' : 'Подтверждение'}</h2></div>
              <button onClick={closeCheckout} aria-label="Закрыть" className="border-0 bg-transparent p-2 text-2xl font-light text-white/45 hover:text-white">×</button>
            </header>
            <div className="grid grid-cols-2 gap-2 px-5 sm:px-7"><span className="h-1 rounded-full bg-purple-500" /><span className={`h-1 rounded-full ${checkoutStep === 2 ? 'bg-purple-500' : 'bg-white/15'}`} /></div>

            {checkoutStep === 1 ? (
              <div className="space-y-5 p-5 sm:p-7">
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.045] p-4">
                  <div className="flex items-start gap-3"><PerklyGlyph name="catalog" className="mt-0.5 h-5 w-5 text-purple-300" /><div><p className="font-bold text-white">Способ получения</p><p className="mt-2 text-sm font-semibold text-white/75">{fulfillment.title}</p><p className="mt-1 text-xs leading-5 text-white/40">{offer.usageInstructions || fulfillment.detail}</p></div></div>
                </div>
                <label className="block"><span className="mb-2 block text-sm font-semibold text-white/55">{offer.buyerInputPrompt || 'Комментарий продавцу'} <span className="font-normal text-white/25">· {offer.buyerInputRequired ? 'обязательно' : 'необязательно'}</span></span><textarea required={offer.buyerInputRequired} value={buyerComment} onChange={(event) => setBuyerComment(event.target.value.slice(0, 1000))} rows={3} placeholder={offer.buyerInputPrompt ? 'Введите данные без ошибок' : 'Например, уточнение по аккаунту или активации'} className="w-full resize-none rounded-2xl border border-white/[0.08] bg-white/[0.045] p-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-purple-400/35" /><span className="mt-1 block text-right text-[10px] text-white/20">{buyerComment.length}/1000</span></label>
                {error && <p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
                <div><h3 className="text-lg font-black text-white">Вы получите после оплаты</h3><ul className="mt-3 space-y-2">{fulfillment.items.map((item, index) => <li key={item} className="flex items-center gap-3 text-sm text-white/65"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.06] text-[11px] font-black text-purple-300">{index + 1}</span>{item}</li>)}</ul></div>
                <button onClick={() => { if (offer.buyerInputRequired && !buyerComment.trim()) { setError('Заполните данные для получения товара.'); return; } setError(''); hapticImpact('light'); setCheckoutStep(2); }} className="w-full rounded-2xl border-0 bg-white py-4 font-black text-black">Далее</button>
              </div>
            ) : (
              <div className="space-y-5 p-5 sm:p-7">
                {offer.isDemo && <p className="rounded-xl bg-white/[0.06] p-3 text-sm text-white/55">Beta-заказ: можно проверить весь интерфейс, реальное списание отключено.</p>}
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.04] p-4"><p className="line-clamp-2 text-sm font-bold text-white">{offer.title}</p><div className="mt-4 flex items-end justify-between"><span className="text-sm text-white/40">К оплате</span><span className="text-2xl font-black text-white">{offer.price === 0 ? 'Бесплатно' : `${offer.price.toLocaleString('ru-RU')} сум`}</span></div></div>
                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4"><input type="checkbox" checked={isGift} onChange={(event) => setIsGift(event.target.checked)} className="h-5 w-5 accent-purple-500" /><span><span className="block text-sm font-bold text-white">Купить в подарок</span><span className="mt-0.5 block text-xs text-white/35">Создадим ссылку для получателя</span></span></label>
                <div className="flex items-center gap-2 text-xs text-white/35"><PerklyGlyph name="shield" className="h-4 w-4 text-emerald-400" /> Для поддерживаемых сделок действуют защищённые статусы и спор</div>
                {error && <p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
                <div className="grid grid-cols-[auto_1fr] gap-2"><button onClick={() => setCheckoutStep(1)} disabled={purchasing} className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 font-bold text-white/60">Назад</button><button onClick={confirmPurchase} disabled={purchasing || offer.isDemo} className="rounded-2xl border-0 bg-white py-4 font-black text-black disabled:opacity-55">{offer.isDemo ? 'Beta-заказ готов к проверке' : purchasing ? 'Оформляем…' : 'Подтвердить покупку'}</button></div>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
