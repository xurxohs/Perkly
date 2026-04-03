'use client';

import React, { useState, useEffect } from 'react';
import { Users, ShoppingBag, CreditCard, Scale, TrendingUp, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';

export default function AdminDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/admin/stats');
                setStats(res);
            } catch (error) {
                console.error('Failed to fetch stats:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="w-12 h-12 rounded-full border-4 border-red-500/30 border-t-red-500 animate-spin" />
            </div>
        );
    }

    if (!stats) return <div className="text-white">Ошибка загрузки данных</div>;

    const cards = [
        { title: 'Всего пользователей', value: stats.usersCount, sub: `+${stats.newUsersToday} за сегодня`, icon: Users, color: 'text-blue-400', bg: 'rgba(59,130,246,0.1)' },
        { title: 'Активных товаров', value: stats.activeOffersCount, icon: ShoppingBag, color: 'text-green-400', bg: 'rgba(34,197,94,0.1)' },
        { title: 'Оборот (Сумма)', value: `$${stats.totalVolume.toFixed(2)}`, icon: CreditCard, color: 'text-purple-400', bg: 'rgba(168,85,247,0.1)' },
        { title: 'Доход платформы', value: `$${stats.platformIncome.toFixed(2)}`, sub: '(5% комиссия)', icon: TrendingUp, color: 'text-amber-400', bg: 'rgba(245,158,11,0.1)' },
        { title: 'Открытых споров', value: stats.openDisputesCount, icon: Scale, color: stats.openDisputesCount > 0 ? 'text-red-400' : 'text-gray-400', bg: stats.openDisputesCount > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)' },
    ];

    return (
        <div className="space-y-8 animate-fade-in fade-in-up">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Обзор платформы</h1>
                <p className="text-white/40">Статистика и метрики в реальном времени</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                {cards.map((card, idx) => {
                    const Icon = card.icon;
                    return (
                        <div key={idx} className="p-6 rounded-3xl relative overflow-hidden group transition-all duration-300 hover:scale-[1.02]" style={{
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.05)',
                        }}>
                            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl opacity-50 transition-opacity group-hover:opacity-70" style={{ background: card.bg }} />
                            <div className="relative z-10">
                                <div className="w-12 h-12 mb-4 rounded-xl flex items-center justify-center aspect-square" style={{ background: card.bg }}>
                                    <Icon className={`w-6 h-6 ${card.color}`} />
                                </div>
                                <h3 className="text-3xl font-bold text-white mb-1">{card.value}</h3>
                                <p className="text-sm text-white/50">{card.title}</p>
                                {card.sub && <div className="text-xs text-white/30 mt-2">{card.sub}</div>}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Recent Transactions */}
                <div className="p-6 rounded-3xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2"><CreditCard className="w-5 h-5 text-purple-400" /> Последние покупки</h2>
                    </div>
                    <div className="space-y-4">
                        {stats.recentTransactions?.length > 0 ? stats.recentTransactions.map((tx: any) => (
                            <div key={tx.id} className="flex items-center justify-between p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
                                <div>
                                    <div className="text-sm font-medium text-white mb-1">{tx.offer?.title}</div>
                                    <div className="text-xs text-white/40">Покупатель: {tx.buyer?.email}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-bold text-green-400 mb-1">+${tx.price}</div>
                                    <div className="text-xs text-white/30">{new Date(tx.createdAt).toLocaleDateString()}</div>
                                </div>
                            </div>
                        )) : <div className="text-sm text-white/30 text-center py-4">Нет недавних транзакций</div>}
                    </div>
                </div>

                {/* Recent Users */}
                <div className="p-6 rounded-3xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2"><Users className="w-5 h-5 text-blue-400" /> Новые пользователи</h2>
                    </div>
                    <div className="space-y-4">
                        {stats.recentUsers?.length > 0 ? stats.recentUsers.map((user: any) => (
                            <div key={user.id} className="flex items-center justify-between p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-white">{user.email}</span>
                                    <span className="text-xs text-white/40">{user.role} • {user.tier}</span>
                                </div>
                                <div className="text-xs text-white/30">{new Date(user.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                        )) : <div className="text-sm text-white/30 text-center py-4">Нет новых пользователей</div>}
                    </div>
                </div>
            </div>
        </div>
    );
}
