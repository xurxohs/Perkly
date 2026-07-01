'use client';

import { useEffect, useMemo, useState } from 'react';
import { Trash2, ShoppingCart, ArrowLeft, ArrowRight, CheckCircle, Pizza, Tv, Gamepad2, Package, Tag } from 'lucide-react';
import Link from 'next/link';
import { useCart } from '@/lib/CartContext';
import { useAuth } from '@/lib/AuthContext';
import { promocodesApi, transactionsApi, type PromocodeActivation } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function CartPage() {
    const { items, total, removeItem, clearCart, count } = useCart();
    const { isAuthenticated, refreshUser } = useAuth();
    const router = useRouter();

    const [purchasing, setPurchasing] = useState(false);
    const [results, setResults] = useState<{ offerId: string; title: string; success: boolean; error?: string }[]>([]);
    const [done, setDone] = useState(false);
    const [promocodeActivations, setPromocodeActivations] = useState<PromocodeActivation[]>([]);
    const [promocodesLoading, setPromocodesLoading] = useState(false);
    const [selectedPromocodes, setSelectedPromocodes] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!isAuthenticated) {
            setPromocodeActivations([]);
            return;
        }

        setPromocodesLoading(true);
        promocodesApi.listMyActivations()
            .then(setPromocodeActivations)
            .catch((err) => {
                console.warn('Failed to load promocode activations', err);
                setPromocodeActivations([]);
            })
            .finally(() => setPromocodesLoading(false));
    }, [isAuthenticated]);

    const usablePromocodeActivations = useMemo(() => {
        const now = Date.now();
        return promocodeActivations.filter((activation) => {
            if (activation.status === 'USED') return false;
            if (activation.expiresAt && new Date(activation.expiresAt).getTime() < now) return false;
            if (activation.promocode?.status !== 'ACTIVE') return false;
            return true;
        });
    }, [promocodeActivations]);

    const getItemPromocodes = (offerId: string) =>
        usablePromocodeActivations.filter((activation) => !activation.offerId || activation.offerId === offerId);

    const getSelectedActivation = (offerId: string) => {
        const activationId = selectedPromocodes[offerId];
        return usablePromocodeActivations.find((activation) => activation.id === activationId) ?? null;
    };

    const getDiscountAmount = (price: number, activation: PromocodeActivation | null) => {
        const discountValue = activation?.promocode?.discountValue ?? 0;
        return Number(((price * discountValue) / 100).toFixed(2));
    };

    const promocodeDiscountTotal = items.reduce((sum, item) => {
        return sum + getDiscountAmount(item.price, getSelectedActivation(item.offerId));
    }, 0);
    const checkoutTotal = Number(Math.max(0, total - promocodeDiscountTotal).toFixed(2));

    const isActivationSelectedElsewhere = (activationId: string, offerId: string) =>
        Object.entries(selectedPromocodes).some(([selectedOfferId, selectedActivationId]) => (
            selectedOfferId !== offerId && selectedActivationId === activationId
        ));

    const handleCheckout = async () => {
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }

        setPurchasing(true);
        const purchaseResults: typeof results = [];

        for (const item of items) {
            try {
                await transactionsApi.purchase(item.offerId, false, selectedPromocodes[item.offerId]);
                purchaseResults.push({ offerId: item.offerId, title: item.title, success: true });
            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                purchaseResults.push({ offerId: item.offerId, title: item.title, success: false, error: errorMessage });
            }
        }

        setResults(purchaseResults);
        setPurchasing(false);
        setDone(true);
        await refreshUser();

        // Remove successfully purchased items from cart
        const successIds = purchaseResults.filter(r => r.success).map(r => r.offerId);
        successIds.forEach(id => removeItem(id));
    };

    return (
        <div className="max-w-3xl mx-auto px-6 py-8">
            <Link href="/catalog" className="inline-flex items-center gap-1 text-sm text-white/40 hover:text-white transition mb-8 no-underline">
                <ArrowLeft className="w-4 h-4" /> Каталог
            </Link>

            <h1 className="text-3xl font-extrabold mb-8 flex items-center gap-3">
                <ShoppingCart className="w-8 h-8 text-purple-400" />
                Корзина
                {count > 0 && <span className="text-lg font-normal text-white/30">({count})</span>}
            </h1>

            {done && results.length > 0 && (
                <div className="mb-8 rounded-2xl p-6 cart-results-card">
                    <h3 className="text-lg font-bold text-white mb-4">Результаты покупки</h3>
                    {results.map((r, i) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                            <span className="text-sm text-white">{r.title}</span>
                            {r.success ? (
                                <span className="text-sm text-green-400 font-semibold flex items-center gap-1.5"><CheckCircle className="w-4 h-4" /> Куплено</span>
                            ) : (
                                <span className="text-sm text-red-400">{r.error}</span>
                            )}
                        </div>
                    ))}
                    <Link href="/profile" className="inline-flex items-center gap-2 mt-4 text-purple-400 text-sm no-underline">
                        Перейти в профиль <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            )}

            {items.length === 0 && !done ? (
                <div className="text-center py-20">
                    <ShoppingCart className="w-16 h-16 text-white/10 mx-auto mb-4" />
                    <p className="text-white/30 text-lg mb-4">Корзина пуста</p>
                    <Link href="/catalog" className="text-purple-400 no-underline text-sm">
                        Перейти в каталог →
                    </Link>
                </div>
            ) : items.length > 0 && (
                <>
                    {/* Items */}
                    <div className="rounded-2xl overflow-hidden mb-6 cart-items-container">
                        {items.map((item, i) => {
                            const itemPromocodes = getItemPromocodes(item.offerId);
                            const selectedActivation = getSelectedActivation(item.offerId);
                            const discountAmount = getDiscountAmount(item.price, selectedActivation);
                            const itemFinalPrice = Number(Math.max(0, item.price - discountAmount).toFixed(2));

                            return (
                                <div
                                    key={item.offerId}
                                    className={`p-4 transition-colors cart-item-row ${i < items.length - 1 ? 'cart-item-border' : ''}`}
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white/50 shrink-0 cart-item-icon-bg">
                                                {item.category === 'RESTAURANTS' ? <Pizza className="w-6 h-6" /> :
                                                    item.category === 'SUBSCRIPTIONS' ? <Tv className="w-6 h-6" /> :
                                                        item.category === 'GAMES' ? <Gamepad2 className="w-6 h-6" /> : <Package className="w-6 h-6" />}
                                            </div>
                                            <div className="min-w-0 pr-2">
                                                <Link href={`/offer/${item.offerId}`} className="text-sm font-semibold text-white no-underline hover:text-purple-400 transition block truncate">
                                                    {item.title}
                                                </Link>
                                                <div className="text-xs text-white/30">{item.category}</div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 self-end sm:self-auto shrink-0">
                                            <div className="text-right">
                                                {discountAmount > 0 && (
                                                    <div className="text-xs text-white/25 line-through">{item.price.toFixed(2)}$</div>
                                                )}
                                                <span className="text-base font-bold text-white">{itemFinalPrice.toFixed(2)}$</span>
                                            </div>
                                            <button
                                                onClick={() => removeItem(item.offerId)}
                                                className="p-2 rounded-lg hover:bg-red-400/10 transition cursor-pointer bg-transparent border-0"
                                                aria-label="Remove item"
                                                title="Remove item"
                                            >
                                                <Trash2 className="w-4 h-4 text-red-400/60" />
                                            </button>
                                        </div>
                                    </div>

                                    {isAuthenticated && (
                                        <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-2">
                                            <div className="flex items-center gap-2 text-xs text-white/45 shrink-0">
                                                <Tag className="w-4 h-4 text-purple-300" />
                                                Промокод
                                            </div>
                                            <select
                                                value={selectedPromocodes[item.offerId] ?? ''}
                                                onChange={(event) => setSelectedPromocodes(prev => ({
                                                    ...prev,
                                                    [item.offerId]: event.target.value,
                                                }))}
                                                disabled={promocodesLoading || itemPromocodes.length === 0}
                                                className="w-full min-h-10 rounded-lg bg-black/30 border border-white/10 text-white text-sm px-3 outline-none disabled:opacity-50"
                                                aria-label="Выбрать промокод"
                                            >
                                                <option value="">
                                                    {promocodesLoading ? 'Загрузка промокодов...' : 'Без промокода'}
                                                </option>
                                                {itemPromocodes.map((activation) => {
                                                    const disabled = isActivationSelectedElsewhere(activation.id, item.offerId);
                                                    return (
                                                        <option key={activation.id} value={activation.id} disabled={disabled}>
                                                            {activation.promocode?.title ?? 'Промокод'} -{activation.promocode?.discountValue ?? 0}%{disabled ? ' · уже выбран' : ''}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Summary */}
                    <div className="rounded-2xl p-6 mb-4 cart-summary-card">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-white/50">Итого товаров:</span>
                            <span className="text-white font-semibold">{count}</span>
                        </div>
                        {promocodeDiscountTotal > 0 && (
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-white/50">Скидка по промокодам:</span>
                                <span className="text-green-400 font-semibold">-{promocodeDiscountTotal.toFixed(2)}$</span>
                            </div>
                        )}
                        <div className="flex items-center justify-between mb-6">
                            <span className="text-white/50">Общая сумма:</span>
                            <span className="text-2xl font-extrabold text-gradient-green">{checkoutTotal.toFixed(2)}$</span>
                        </div>

                        <button
                            onClick={handleCheckout}
                            disabled={purchasing}
                            className={`w-full py-4 rounded-xl text-white font-bold text-base cursor-pointer border-0 transition-all cart-checkout-btn ${purchasing ? 'opacity-60 scale-[0.98]' : 'opacity-100 scale-100'}`}
                        >
                            {purchasing ? 'Оформление...' : `Оформить покупку — ${checkoutTotal.toFixed(2)}$`}
                        </button>
                    </div>

                    <button
                        onClick={clearCart}
                        className="text-sm text-white/30 hover:text-red-400 transition cursor-pointer bg-transparent border-0"
                    >
                        Очистить корзину
                    </button>
                </>
            )}
        </div>
    );
}
