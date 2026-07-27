'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, ChevronLeft, Gift, Loader2, LockKeyhole, ShoppingBag, Wallet, X } from 'lucide-react';
import { transactionsApi } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { useTelegram } from '@/hooks/useTelegram';

interface OfferActionsProps {
  offer: {
    id: string;
    title: string;
    price: number;
    fulfillmentType: 'PROMOCODE' | 'DIGITAL_CODE' | 'LINK' | 'INSTRUCTIONS';
    usageInstructions?: string;
    buyerInputPrompt?: string | null;
    buyerInputRequired?: boolean;
    stockQuantity?: number | null;
  };
}

const fulfillmentCopy = {
  PROMOCODE: ['Промокод или QR-код', 'Код появится в покупке сразу после успешной оплаты.'],
  DIGITAL_CODE: ['Цифровая выдача', 'Ключ или данные доступа появятся в защищённом разделе покупки.'],
  LINK: ['Защищённая ссылка', 'Ссылка на получение станет доступна после оплаты.'],
  INSTRUCTIONS: ['Получение по инструкции', 'После оплаты откроются инструкция и дальнейшие шаги.'],
} as const;

export default function OfferActions({ offer }: OfferActionsProps) {
  const router = useRouter();
  const { isAuthenticated, user, refreshUser } = useAuth();
  const { hapticImpact, hapticNotification } = useTelegram();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [buyerComment, setBuyerComment] = useState('');
  const [isGift, setIsGift] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [giftCode, setGiftCode] = useState<string | null>(null);
  const [error, setError] = useState('');
  const fulfillment = fulfillmentCopy[offer.fulfillmentType] || fulfillmentCopy.INSTRUCTIONS;
  const soldOut = offer.stockQuantity === 0;

  useEffect(() => {
    if (!checkoutOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !purchasing) setCheckoutOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [checkoutOpen, purchasing]);

  const openCheckout = () => {
    if (soldOut) return;
    if (!isAuthenticated) {
      hapticImpact('medium');
      router.push(`/login?next=${encodeURIComponent(`/offer?id=${offer.id}`)}`);
      return;
    }
    setError('');
    setCheckoutOpen(true);
  };

  const confirmPurchase = async () => {
    if (offer.buyerInputRequired && !buyerComment.trim()) {
      setError('Заполните обязательные данные для получения товара.');
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
      setTransactionId(tx.id);
      setGiftCode(tx.giftCode || null);
      await refreshUser();
    } catch (err: unknown) {
      hapticNotification('error');
      setError(err instanceof Error ? err.message : 'Не удалось оформить покупку');
    } finally {
      setPurchasing(false);
    }
  };

  const actionLabel = soldOut
    ? 'Нет в наличии'
    : offer.price === 0
      ? 'Получить бесплатно'
      : `Купить за ${offer.price.toLocaleString('ru-RU')} сум`;

  return (
    <>
      <button
        type="button"
        onClick={openCheckout}
        disabled={soldOut}
        className="offer-primary-action"
      >
        <ShoppingBag aria-hidden="true" />
        {actionLabel}
      </button>

      <div className="offer-mobile-buybar" aria-label="Панель покупки">
        <div>
          <span>Цена</span>
          <strong>{offer.price === 0 ? 'Бесплатно' : `${offer.price.toLocaleString('ru-RU')} сум`}</strong>
        </div>
        <button type="button" onClick={openCheckout} disabled={soldOut}>{soldOut ? 'Нет в наличии' : 'Купить'}</button>
      </div>

      {checkoutOpen && (
        <div className="offer-checkout-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !purchasing) setCheckoutOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="checkout-title" className="offer-checkout-sheet">
            {transactionId ? (
              <div className="offer-checkout-success">
                <span className="offer-checkout-success-icon"><Check aria-hidden="true" /></span>
                <p>Оплата прошла</p>
                <h2 id="checkout-title">{isGift ? 'Подарок готов' : 'Покупка оформлена'}</h2>
                <span>Заказ сохранён в профиле. Там находятся статус, инструкция и данные для получения.</span>
                {giftCode && <code>{giftCode}</code>}
                <Link href="/profile">Открыть покупку</Link>
                <button type="button" onClick={() => setCheckoutOpen(false)}>Остаться на странице</button>
              </div>
            ) : (
              <>
                <header>
                  <div>
                    <p>Безопасное оформление</p>
                    <h2 id="checkout-title">Подтвердите покупку</h2>
                  </div>
                  <button type="button" onClick={() => setCheckoutOpen(false)} disabled={purchasing} aria-label="Закрыть"><X aria-hidden="true" /></button>
                </header>

                <div className="offer-checkout-scroll">
                  <div className="offer-checkout-product">
                    <span>{offer.title}</span>
                    <strong>{offer.price === 0 ? 'Бесплатно' : `${offer.price.toLocaleString('ru-RU')} сум`}</strong>
                  </div>

                  <div className="offer-checkout-delivery">
                    <LockKeyhole aria-hidden="true" />
                    <div><strong>{fulfillment[0]}</strong><span>{offer.usageInstructions || fulfillment[1]}</span></div>
                  </div>

                  {(offer.buyerInputPrompt || offer.buyerInputRequired) && (
                    <label className="offer-checkout-input">
                      <span>{offer.buyerInputPrompt || 'Данные для получения'} {offer.buyerInputRequired ? <em>Обязательно</em> : <small>Необязательно</small>}</span>
                      <textarea
                        required={offer.buyerInputRequired}
                        value={buyerComment}
                        onChange={(event) => setBuyerComment(event.target.value.slice(0, 1000))}
                        rows={3}
                        placeholder="Введите данные внимательно"
                      />
                      <small>{buyerComment.length}/1000</small>
                    </label>
                  )}

                  <label className="offer-checkout-gift">
                    <input type="checkbox" checked={isGift} onChange={(event) => setIsGift(event.target.checked)} />
                    <Gift aria-hidden="true" />
                    <span><strong>Купить в подарок</strong><small>Создадим код для получателя</small></span>
                  </label>

                  <div className="offer-checkout-balance">
                    <Wallet aria-hidden="true" />
                    <span>Ваш баланс</span>
                    <strong>{user ? `${user.balance.toLocaleString('ru-RU')} сум` : '—'}</strong>
                  </div>

                  {error && <p className="offer-checkout-error">{error}</p>}
                </div>

                <footer>
                  <p><LockKeyhole aria-hidden="true" /> Оплата защищена Perkly</p>
                  <div>
                    <button type="button" onClick={() => setCheckoutOpen(false)} disabled={purchasing} aria-label="Назад"><ChevronLeft aria-hidden="true" /></button>
                    <button type="button" onClick={confirmPurchase} disabled={purchasing}>
                      {purchasing ? <><Loader2 className="animate-spin" /> Оформляем…</> : actionLabel}
                    </button>
                  </div>
                </footer>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
