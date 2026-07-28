'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Archive, Edit2, Flame, Plus, RefreshCw, Search } from 'lucide-react';
import api, { TopkaPost } from '@/lib/api';

const STATUS_OPTIONS = ['', 'draft', 'scheduled', 'published', 'archived'];
const TYPE_OPTIONS = ['', 'event', 'poster', 'promo', 'collection', 'news', 'place'];

export default function TopkaPostsPage() {
    const [posts, setPosts] = useState<TopkaPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ status: '', postType: '', category: '', search: '' });

    const fetchPosts = async () => {
        setLoading(true);
        try {
            const res = await api.admin.getTopkaPosts(filters);
            setPosts(res.data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeout = setTimeout(fetchPosts, 250);
        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters]);

    const archivePost = async (id: string) => {
        await api.admin.archiveTopkaPost(id);
        await fetchPosts();
    };

    return (
        <div className="space-y-6 animate-fade-in fade-in-up">
            <div className="flex flex-col lg:flex-row justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        <Flame className="w-8 h-8 text-orange-400" /> Topka posts
                    </h1>
                    <p className="text-white/40">Постеры, события, промо и подборки для iOS-ленты</p>
                </div>
                <Link
                    href="/admin/topka/posts/new"
                    className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-xl bg-gradient-to-r from-orange-600 to-red-500 text-white font-bold no-underline shadow-[0_0_24px_rgba(249,115,22,0.25)]"
                >
                    <Plus className="w-5 h-5" /> Создать пост
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="relative md:col-span-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                        value={filters.search}
                        onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
                        placeholder="Поиск..."
                        className="w-full h-11 bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 text-sm text-white outline-none focus:border-orange-500/50"
                    />
                </div>
                <select
                    value={filters.status}
                    onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
                    className="h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white outline-none focus:border-orange-500/50"
                    title="Статус"
                >
                    {STATUS_OPTIONS.map((status) => (
                        <option key={status || 'all'} value={status} className="bg-[#101524]">
                            {status || 'Все статусы'}
                        </option>
                    ))}
                </select>
                <select
                    value={filters.postType}
                    onChange={(event) => setFilters((prev) => ({ ...prev, postType: event.target.value }))}
                    className="h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white outline-none focus:border-orange-500/50"
                    title="Тип"
                >
                    {TYPE_OPTIONS.map((type) => (
                        <option key={type || 'all'} value={type} className="bg-[#101524]">
                            {type || 'Все типы'}
                        </option>
                    ))}
                </select>
                <input
                    value={filters.category}
                    onChange={(event) => setFilters((prev) => ({ ...prev, category: event.target.value }))}
                    placeholder="Категория"
                    className="h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white outline-none focus:border-orange-500/50"
                />
            </div>

            <div className="bg-[#101524]/60 backdrop-blur-xl rounded-3xl border border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/5">
                                <th className="py-4 px-6 text-xs font-semibold text-white/40 uppercase tracking-wider">Пост</th>
                                <th className="py-4 px-6 text-xs font-semibold text-white/40 uppercase tracking-wider">Тип</th>
                                <th className="py-4 px-6 text-xs font-semibold text-white/40 uppercase tracking-wider">Статус</th>
                                <th className="py-4 px-6 text-xs font-semibold text-white/40 uppercase tracking-wider">Публикация</th>
                                <th className="py-4 px-6 text-right text-xs font-semibold text-white/40 uppercase tracking-wider">Действия</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="py-10 text-center text-white/40">
                                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" /> Загрузка...
                                    </td>
                                </tr>
                            ) : posts.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-10 text-center text-white/40">Посты не найдены</td>
                                </tr>
                            ) : posts.map((post) => (
                                <tr key={post.id} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-[74px] rounded-2xl overflow-hidden bg-white/5 shrink-0">
                                                {post.media.poster3x4Url || post.media.originalUrl ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={post.media.poster3x4Url || post.media.originalUrl || ''} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-orange-500/30 to-purple-500/20" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-white">{post.title || 'Без названия'}</div>
                                                <div className="text-xs text-white/40 mt-1">{post.category} · priority {post.priority}</div>
                                                <div className="flex gap-1 mt-2">
                                                    {post.badges.slice(0, 3).map((badge) => (
                                                        <span key={badge} className="px-2 py-0.5 rounded-lg bg-orange-500/10 text-orange-300 text-[10px] font-bold">{badge}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-sm text-white/70">{post.postType}</td>
                                    <td className="py-4 px-6">
                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${statusClass(post.status)}`}>{post.status}</span>
                                    </td>
                                    <td className="py-4 px-6 text-sm text-white/50">
                                        {post.publishAt ? new Date(post.publishAt).toLocaleString('ru-RU') : 'Не задано'}
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <div className="inline-flex gap-2">
                                            <Link
                                                href={`/admin/topka/posts/new?id=${post.id}`}
                                                className="p-2 rounded-xl bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all"
                                                title="Редактировать"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </Link>
                                            <button
                                                onClick={() => archivePost(post.id)}
                                                className="p-2 rounded-xl bg-white/5 text-white/40 hover:text-red-300 hover:bg-red-500/10 transition-all border-0 cursor-pointer"
                                                title="Архивировать"
                                            >
                                                <Archive className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function statusClass(status: TopkaPost['status']) {
    if (status === 'published') return 'bg-green-500/10 text-green-300 border border-green-500/20';
    if (status === 'scheduled') return 'bg-blue-500/10 text-blue-300 border border-blue-500/20';
    if (status === 'archived') return 'bg-white/5 text-white/35 border border-white/10';
    return 'bg-amber-500/10 text-amber-300 border border-amber-500/20';
}
