'use client';

import { useState } from 'react';
import { Trash2, ShoppingCart, ArrowLeft, ArrowRight, CheckCircle, Pizza, Tv, Gamepad2, Package } from 'lucide-react';
import Link from 'next/link';
import { useCart } from '@/lib/CartContext';
import { useAuth } from '@/lib/AuthContext';
import { transactionsApi } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function CartPage() {
    const { items, total, removeItem, clearCart, count } = useCart();
    const { isAuthenticated, refreshUser } = useAuth();
    const router = useRouter();

    const [purchasing, setPurchasing] = useState(false);
    const [results, setResults] = useState<{ offerId: string; title: string; success: boolean; error?: string }[]>([]);
    const [done, setDone] = useState(false);

    const handleCheckout = async () => {
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }

        setPurchasing(true);
        const purchaseResults: typeof results = [];

        for (const item of items) {
            try {
                await transactionsApi.purchase(item.offerId);
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
                        {items.map((item, i) => (
                            <div
                                key={item.offerId}
                                className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 transition-colors gap-3 sm:gap-0 cart-item-row ${i < items.length - 1 ? 'cart-item-border' : ''}`}
                            >
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
                                    <span className="text-base font-bold text-white">{item.price.toFixed(2)}$</span>
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
                        ))}
                    </div>

                    {/* Summary */}
                    <div className="rounded-2xl p-6 mb-4 cart-summary-card">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-white/50">Итого товаров:</span>
                            <span className="text-white font-semibold">{count}</span>
                        </div>
                        <div className="flex items-center justify-between mb-6">
                            <span className="text-white/50">Общая сумма:</span>
                            <span className="text-2xl font-extrabold text-gradient-green">{total.toFixed(2)}$</span>
                        </div>

                        <button
                            onClick={handleCheckout}
                            disabled={purchasing}
                            className={`w-full py-4 rounded-xl text-white font-bold text-base cursor-pointer border-0 transition-all cart-checkout-btn ${purchasing ? 'opacity-60 scale-[0.98]' : 'opacity-100 scale-100'}`}
                        >
                            {purchasing ? 'Оформление...' : `Оформить покупку — ${total.toFixed(2)}$`}
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
