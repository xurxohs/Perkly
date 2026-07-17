'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, PackageCheck, RefreshCw } from 'lucide-react';
import { sellerApi, Transaction, TransactionStatus } from '@/lib/api';

const PAGE_SIZE = 20;

const STATUS_FILTERS: { label: string; value?: TransactionStatus }[] = [
    { label: 'Все' },
    { label: 'В работе', value: 'ESCROW' },
    { label: 'Завершённые', value: 'COMPLETED' },
    { label: 'Споры', value: 'DISPUTED' },
    { label: 'Возвраты', value: 'REFUNDED' },
];

const STATUS_LABELS: Record<string, string> = {
    PENDING: 'Ожидает оплаты',
    PAID: 'Оплачено',
    ESCROW: 'В эскроу',
    COMPLETED: 'Завершено',
    DISPUTED: 'Открыт спор',
    CANCELLED: 'Отменено',
    REFUNDED: 'Возврат',
    FAILED: 'Ошибка',
    ACTIVATED: 'Активировано',
    SUCCESS: 'Успешно',
};

const statusClass = (status: string) => {
    if (['COMPLETED', 'SUCCESS', 'ACTIVATED'].includes(status)) return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
    if (['FAILED', 'CANCELLED', 'REFUNDED'].includes(status)) return 'bg-red-500/10 text-red-300 border-red-500/20';
    if (status === 'DISPUTED') return 'bg-orange-500/10 text-orange-300 border-orange-500/20';
    return 'bg-amber-500/10 text-amber-300 border-amber-500/20';
};

export default function VendorOrdersPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [status, setStatus] = useState<TransactionStatus | undefined>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await sellerApi.getTransactions(page * PAGE_SIZE, PAGE_SIZE, status);
            setTransactions(response.data);
            setTotal(response.total);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить заказы');
        } finally {
            setLoading(false);
        }
    }, [page, status]);

    useEffect(() => { void load(); }, [load]);

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-8 flex items-start justify-between gap-4">
                <div>
                    <h1 className="mb-2 text-3xl font-bold text-white">Заказы</h1>
                    <p className="text-white/45">{total} сделок по вашим товарам</p>
                </div>
                <button onClick={() => void load()} disabled={loading} className="rounded-xl border border-white/10 bg-white/5 p-3 text-white/60 transition hover:bg-white/10 disabled:opacity-40" aria-label="Обновить">
                    <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {error && (
                <div className="mb-5 flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                    <AlertCircle className="h-5 w-5" /> {error}
                </div>
            )}

            <div className="mb-5 flex gap-2 overflow-x-auto pb-1" aria-label="Фильтр заказов">
                {STATUS_FILTERS.map((filter) => (
                    <button
                        key={filter.label}
                        onClick={() => { setPage(0); setStatus(filter.value); }}
                        className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition ${status === filter.value ? 'border-purple-400/35 bg-purple-500/15 text-purple-200' : 'border-white/10 bg-white/[0.03] text-white/45 hover:bg-white/[0.07] hover:text-white/70'}`}
                    >
                        {filter.label}
                    </button>
                ))}
            </div>

            <div className="overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.025]">
                {loading && transactions.length === 0 ? (
                    <div className="space-y-3 p-6">
                        {Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-20 animate-pulse rounded-2xl bg-white/[0.04]" />)}
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
                        <PackageCheck className="h-12 w-12 text-white/15" />
                        <p className="font-semibold text-white">Заказов пока нет</p>
                        <p className="max-w-sm text-sm text-white/35">Когда покупатель оформит ваш товар, сделка появится здесь.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/[0.06]">
                        {transactions.map((transaction) => (
                            <article key={transaction.id} className="flex flex-col gap-4 p-5 transition hover:bg-white/[0.025] sm:flex-row sm:items-center">
                                <div className="min-w-0 flex-1">
                                    <h2 className="truncate text-sm font-bold text-white">{transaction.offer?.title ?? 'Заказ'}</h2>
                                    <p className="mt-1 truncate text-xs text-white/40">{transaction.buyer?.displayName ?? transaction.buyer?.email ?? 'Покупатель'}</p>
                                    <p className="mt-2 font-mono text-[10px] text-white/25">{transaction.id}</p>
                                </div>
                                <div className="flex items-center justify-between gap-4 sm:justify-end">
                                    <span className="text-sm font-bold text-white">{transaction.price.toLocaleString('ru-RU')} сум</span>
                                    <span className={`rounded-full border px-3 py-1.5 text-[10px] font-bold ${statusClass(transaction.status)}`}>
                                        {STATUS_LABELS[transaction.status] ?? transaction.status}
                                    </span>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>

            {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-3">
                    <button onClick={() => setPage((value) => Math.max(0, value - 1))} disabled={page === 0 || loading} className="rounded-xl border border-white/10 bg-white/5 p-3 text-white/60 disabled:opacity-30">
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm text-white/45">{page + 1} / {totalPages}</span>
                    <button onClick={() => setPage((value) => Math.min(totalPages - 1, value + 1))} disabled={page >= totalPages - 1 || loading} className="rounded-xl border border-white/10 bg-white/5 p-3 text-white/60 disabled:opacity-30">
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            )}
        </div>
    );
}
