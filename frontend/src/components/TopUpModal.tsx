'use client';

import React, { useState } from 'react';
import { X, Loader2, Wallet, CreditCard } from 'lucide-react';

interface TopUpModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTopUp: (amount: number) => Promise<void>;
}

export default function TopUpModal({ isOpen, onClose, onTopUp }: TopUpModalProps) {
    const [amount, setAmount] = useState<string>('10');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const predefinedAmounts = [5, 10, 50, 100];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            setError('Введите корректную сумму');
            return;
        }

        try {
            setLoading(true);
            setError('');
            await onTopUp(numAmount);
        } catch (err: unknown) {
            const error = err as Error;
            setError(error.message || 'Ошибка пополнения');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={!loading ? onClose : undefined} />
            <div
                className="relative rounded-3xl p-8 flex flex-col gap-6 max-w-sm w-full bg-[#141928]/90 backdrop-blur-[40px] border border-white/10 shadow-[0_25px_50px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.1)]"
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                            <Wallet className="w-5 h-5 text-blue-400" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Пополнение</h2>
                    </div>
                    {!loading && (
                        <button onClick={onClose} aria-label="Закрыть" title="Закрыть" className="p-2 -mr-2 rounded-xl hover:bg-white/10 text-white/50 hover:text-white transition-all border-0 bg-transparent cursor-pointer">
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <div>
                        <label className="text-sm font-medium text-white/60 mb-2 block">Сумма (USD)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-bold">$</span>
                            <input
                                type="number"
                                min="1"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                disabled={loading}
                                className="w-full bg-white/5 text-white font-bold text-xl py-4 pl-8 pr-4 rounded-xl outline-none transition-all placeholder-white/20 focus:bg-white/10 border border-white/10"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                        {predefinedAmounts.map(val => (
                            <button
                                key={val}
                                type="button"
                                disabled={loading}
                                onClick={() => setAmount(val.toString())}
                                className={`py-2 rounded-lg text-sm font-bold transition-all border-0 cursor-pointer ${amount === val.toString() ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/5'}`}
                            >
                                ${val}
                            </button>
                        ))}
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                            {error}
                        </div>
                    )}

                    <div className="p-3 rounded-lg text-sm text-yellow-500/80 bg-yellow-500/10 border border-yellow-500/20 mt-2">
                        <b>Mock Mode:</b> В целях тестирования средства будут зачислены мгновенно (фиктивный платеж).
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.02] border-0 bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-[0_10px_25px_-5px_rgba(59,130,246,0.4)] ${loading ? 'opacity-70' : 'opacity-100'}`}
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <CreditCard className="w-5 h-5" />
                                Оплатить
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
