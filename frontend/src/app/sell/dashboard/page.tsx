'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DollarSign, Package, TrendingUp, Clock } from 'lucide-react';
import api, { SellerStats, Offer } from '@/lib/api';
import Image from 'next/image';

export default function SellerDashboard() {
    const { user, isAuthenticated, loading } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState<SellerStats | null>(null);
    const [offers, setOffers] = useState<Offer[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!loading && (!isAuthenticated || !user)) {
            router.push('/auth/login');
            return;
        }

        async function fetchData() {
            try {
                const [statsRes, offersRes] = await Promise.all([
                    api.seller.getStats(),
                    api.seller.getOffers()
                ]);
                setStats(statsRes.data);
                setOffers(offersRes.data);
            } catch (err) {
                console.error('Failed to fetch seller data', err);
            } finally {
                setIsLoading(false);
            }
        }

        if (isAuthenticated) {
            fetchData();
        }
    }, [isAuthenticated, loading, user, router]);

    if (loading || isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-6 py-12">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Панель Продавца</h1>
                    <p className="text-gray-400">Управляйте вашими товарами и отслеживайте статистику продаж</p>
                </div>
                <Link href="/sell" className="px-6 py-3 rounded-xl text-white font-semibold flex items-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }}>
                    <Package className="w-5 h-5" /> Добавить Товар
                </Link>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                <div className="glass-card p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-green-500/20 text-green-400">
                            <DollarSign className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-400">Общий доход</p>
                            <h3 className="text-2xl font-bold text-white">${stats?.totalEarnings?.toFixed(2) || '0.00'}</h3>
                        </div>
                    </div>
                </div>

                <div className="glass-card p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-500/20 text-blue-400">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-400">Всего продаж</p>
                            <h3 className="text-2xl font-bold text-white">{stats?.totalSales || 0} шт.</h3>
                        </div>
                    </div>
                </div>

                <div className="glass-card p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-purple-500/20 text-purple-400">
                            <Package className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-400">Активные товары</p>
                            <h3 className="text-2xl font-bold text-white">{stats?.activeOffers || 0}</h3>
                        </div>
                    </div>
                </div>

                <div className="glass-card p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-orange-500/20 text-orange-400">
                            <Clock className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-400">Новых сделок</p>
                            <h3 className="text-2xl font-bold text-white">{stats?.recentTransactions?.length || 0}</h3>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Active Offers List */}
                <div className="lg:col-span-2 glass-card p-6">
                    <h2 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-4">Ваши Товары</h2>

                    {offers.length === 0 ? (
                        <div className="text-center py-12">
                            <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-400 mb-4">У вас пока нет добавленных товаров</p>
                            <Link href="/sell" className="text-purple-400 hover:text-purple-300 font-medium">Создать первый оффер</Link>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {offers.map((offer) => (
                                <div key={offer.id} className="flex items-center justify-between p-4 rounded-xl relative hover:bg-white/5 border border-white/5 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 bg-white/10 rounded-lg flex-shrink-0 flex items-center justify-center relative overflow-hidden">
                                            {offer.vendorLogo ? (
                                                <Image src={offer.vendorLogo} alt={offer.title} width={64} height={64} className="w-full h-full object-cover" />
                                            ) : (
                                                <Package className="w-6 h-6 text-gray-400" />
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-white">{offer.title}</h4>
                                            <p className="text-sm text-gray-400">{offer.category}</p>
                                            <div className="flex items-center gap-3 mt-1 text-xs">
                                                <span className="text-green-400 font-medium">${offer.price}</span>
                                                <span className="text-gray-500">•</span>
                                                <span className="text-gray-400">Продаж: {offer._count?.transactions || 0}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${offer.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                            {offer.isActive ? 'Активен' : 'Скрыт'}
                                        </span>
                                        <button className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
                                            Ред.
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Transactions List */}
                <div className="glass-card p-6">
                    <h2 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-4">Последние Покупки</h2>

                    {(!stats?.recentTransactions || stats.recentTransactions.length === 0) ? (
                        <div className="text-center py-8 px-4">
                            <p className="text-gray-400 text-sm">У вас еще не было продаж.</p>
                            <p className="text-xs text-gray-500 mt-2">Разместите лучшие предложения, чтобы привлечь покупателей!</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {stats.recentTransactions.map((tx, idx) => (
                                <div key={idx} className="flex items-center gap-4 p-3 rounded-lg bg-black/20 border border-white/5">
                                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 text-blue-400">
                                        {tx.buyer?.displayName?.charAt(0) || 'U'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-white truncate">{tx.offer?.title}</p>
                                        <p className="text-xs text-gray-400 truncate">Покупатель: {tx.buyer?.displayName || tx.buyer?.email}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-sm font-bold text-green-400">+${tx.price}</p>
                                        <p className="text-[10px] text-gray-500 mt-1">{new Date(tx.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            ))}
                            <button className="w-full py-2 mt-4 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-gray-300 font-medium transition-colors border border-white/10">
                                Смотреть все транзакции
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
