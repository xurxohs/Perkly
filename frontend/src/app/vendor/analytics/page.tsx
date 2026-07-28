'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Banknote, CalendarDays, Eye, Package, ShoppingBag, Users, ReceiptText } from 'lucide-react';
import { sellerApi, SellerStats } from '@/lib/api';

export default function VendorAnalyticsPage() {
    const [stats, setStats] = useState<SellerStats | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        sellerApi.getStats()
            .then(setStats)
            .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить аналитику'));
    }, []);

    const cards = [
        { title: 'Зачислено продавцу', value: `${(stats?.totalEarnings ?? 0).toLocaleString('ru-RU')} сум`, icon: Banknote, color: 'text-emerald-300 bg-emerald-500/10' },
        { title: 'Оборот завершённых сделок', value: `${(stats?.completedVolume ?? 0).toLocaleString('ru-RU')} сум`, icon: ShoppingBag, color: 'text-purple-300 bg-purple-500/10' },
        { title: 'Все продажи', value: String(stats?.totalSales ?? 0), icon: Users, color: 'text-blue-300 bg-blue-500/10' },
        { title: 'Активные товары', value: String(stats?.activeOffers ?? 0), icon: Package, color: 'text-amber-300 bg-amber-500/10' },
        { title: 'События Topka', value: String(stats?.activeEvents ?? 0), icon: CalendarDays, color: 'text-orange-300 bg-orange-500/10' },
        { title: 'Просмотры событий', value: String(stats?.eventViews ?? 0), icon: Eye, color: 'text-cyan-300 bg-cyan-500/10' },
    ];
    const platformFee = Math.max(0, (stats?.completedVolume ?? 0) - (stats?.totalEarnings ?? 0));

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-8">
                <h1 className="mb-2 text-3xl font-bold text-white">Аналитика</h1>
                <p className="text-white/45">Реальные значения из завершённых сделок и публикаций.</p>
            </div>

            {error && (
                <div className="mb-5 flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                    <AlertCircle className="h-5 w-5" /> {error}
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {cards.map((card) => (
                    <article key={card.title} className="rounded-3xl border border-white/[0.07] bg-white/[0.03] p-6">
                        <div className={`mb-5 flex h-11 w-11 items-center justify-center rounded-2xl ${card.color}`}>
                            <card.icon className="h-5 w-5" />
                        </div>
                        <p className="text-2xl font-black tracking-tight text-white">{stats ? card.value : '—'}</p>
                        <p className="mt-2 text-sm text-white/40">{card.title}</p>
                    </article>
                ))}
            </div>

            <div className="mt-6 rounded-3xl border border-white/[0.07] bg-white/[0.025] p-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-white/60"><ReceiptText className="h-5 w-5" /></div>
                    <h2 className="font-bold text-white">Как считается выручка</h2>
                </div>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">
                    «Зачислено продавцу» показывает сумму после комиссии Perkly только по завершённым сделкам. Заказы в эскроу не считаются заработанными до подтверждения покупателем.
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-white/[0.03] p-4"><p className="text-xs text-white/35">Оборот</p><p className="mt-1 font-bold text-white">{stats ? `${stats.completedVolume.toLocaleString('ru-RU')} сум` : '—'}</p></div>
                    <div className="rounded-2xl bg-white/[0.03] p-4"><p className="text-xs text-white/35">Комиссия Perkly</p><p className="mt-1 font-bold text-white">{stats ? `${platformFee.toLocaleString('ru-RU')} сум` : '—'}</p></div>
                    <div className="rounded-2xl bg-emerald-500/[0.07] p-4"><p className="text-xs text-emerald-200/50">Начислено</p><p className="mt-1 font-bold text-emerald-300">{stats ? `${stats.totalEarnings.toLocaleString('ru-RU')} сум` : '—'}</p></div>
                </div>
                <p className="mt-4 text-sm text-white/35">Участников событий: {stats?.eventParticipants ?? 0}</p>
                <p className="mt-3 text-xs leading-5 text-white/25">Вывод средств появится здесь после подключения платёжного провайдера и сверки выплат. Сейчас интерфейс не обещает операцию, которой ещё нет в backend.</p>
            </div>
        </div>
    );
}
