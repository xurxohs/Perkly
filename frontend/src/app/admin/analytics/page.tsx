'use client';

import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw, Eye, Globe, Navigation, User as UserIcon } from 'lucide-react';
import api from '@/lib/api';

interface AnalyticsEvent {
    id: string;
    eventType: string;
    userId: string | null;
    sessionId: string | null;
    offerId: string | null;
    metadata: string | null;
    createdAt: string;
}

export default function AdminAnalytics() {
    const [events, setEvents] = useState<AnalyticsEvent[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            // We expect the backend to return { data: AnalyticsEvent[], total: number }
            const res = await api.analytics.getEvents({ eventType: 'PAGE_VIEW', take: 100 });
            setEvents(res.data || []);
        } catch (error) {
            console.error('Failed to fetch analytics events:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    const parseMetadata = (metadata: string | null) => {
        if (!metadata) return null;
        try {
            return JSON.parse(metadata);
        } catch {
            return null;
        }
    };

    return (
        <div className="space-y-6 animate-fade-in fade-in-up">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        <Activity className="w-8 h-8 text-blue-400" />
                        Посещения (Analytics)
                    </h1>
                    <p className="text-white/40">Лог всех просмотров страниц (PAGE_VIEW) на сайте</p>
                </div>

                <button 
                    onClick={fetchEvents}
                    disabled={loading}
                    className="flexItems-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-colors cursor-pointer border-0"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Обновить
                </button>
            </div>

            {/* Table */}
            <div className="bg-[#101524]/60 backdrop-blur-xl rounded-3xl border border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/5">
                                <th className="py-4 px-6 text-xs font-semibold text-white/40 uppercase tracking-wider">Дата</th>
                                <th className="py-4 px-6 text-xs font-semibold text-white/40 uppercase tracking-wider">Пользователь</th>
                                <th className="py-4 px-6 text-xs font-semibold text-white/40 uppercase tracking-wider">Сессия</th>
                                <th className="py-4 px-6 text-xs font-semibold text-white/40 uppercase tracking-wider">Страница</th>
                                <th className="py-4 px-6 text-xs font-semibold text-white/40 uppercase tracking-wider">Источник (Referrer)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading && events.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-white/40">
                                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" /> Загрузка данных...
                                    </td>
                                </tr>
                            ) : events.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-white/40">Нет данных о посещениях</td>
                                </tr>
                            ) : events.map(evt => {
                                const meta = parseMetadata(evt.metadata);
                                const url = meta?.url ? new URL(meta.url).pathname : 'Неизвестно';
                                const referrer = meta?.referrer || 'Прямой заход';
                                
                                return (
                                <tr key={evt.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="py-4 px-6 text-sm text-white/80">
                                        {new Date(evt.createdAt).toLocaleString('ru-RU')}
                                    </td>
                                    <td className="py-4 px-6">
                                        {evt.userId ? (
                                            <span className="flex items-center gap-2 text-sm text-green-400 font-medium">
                                                <UserIcon className="w-4 h-4" />
                                                Авторизован ({evt.userId.substring(0,6)}...)
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-2 text-sm text-white/40 font-medium">
                                                <Eye className="w-4 h-4" />
                                                Гость
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-4 px-6 text-sm text-white/60 font-mono">
                                        {evt.sessionId || '-'}
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className="flex items-center gap-2 text-sm text-blue-300">
                                            <Globe className="w-4 h-4 text-blue-400/50" />
                                            {url}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className="flex items-center gap-2 text-xs text-white/40 truncate max-w-[200px]" title={referrer}>
                                            <Navigation className="w-3 h-3 shrink-0" />
                                            {referrer}
                                        </span>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
