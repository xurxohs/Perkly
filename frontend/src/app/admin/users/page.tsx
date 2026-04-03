'use client';

import React, { useState, useEffect } from 'react';
import { Search, User, Shield, Edit2, X, Check, SearchIcon, RefreshCw, MessageCircle } from 'lucide-react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function AdminUsers() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [editingUser, setEditingUser] = useState<any>(null);
    const [editForm, setEditForm] = useState({ role: '', tier: '', balance: 0 });
    const router = useRouter();

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/admin/users?search=${encodeURIComponent(search)}`) as any;
            setUsers(res.users);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const bounce = setTimeout(() => {
            fetchUsers();
        }, 300);
        return () => clearTimeout(bounce);
    }, [search]);

    const handleEditSave = async () => {
        if (!editingUser) return;
        try {
            await api.patch(`/admin/users/${editingUser.id}`, editForm);
            setEditingUser(null);
            fetchUsers();
        } catch (error) {
            console.error('Update failed', error);
        }
    };

    const handleMessageUser = async (userId: string) => {
        try {
            await api.chat.createDirectRoom(userId);
            router.push('/admin/chats');
        } catch (error) {
            console.error('Failed to start chat from admin panel', error);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in fade-in-up">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Пользователи</h1>
                    <p className="text-white/40">Управление ролями и балансами</p>
                </div>

                {/* Search */}
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                        type="text"
                        placeholder="Поиск по email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-sm text-white placeholder-white/40 focus:outline-none focus:border-red-500/50 transition-colors"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-[#101524]/60 backdrop-blur-xl rounded-3xl border border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/5">
                                <th className="py-4 px-6 text-xs font-semibold text-white/40 uppercase tracking-wider">Пользователь</th>
                                <th className="py-4 px-6 text-xs font-semibold text-white/40 uppercase tracking-wider">Роль</th>
                                <th className="py-4 px-6 text-xs font-semibold text-white/40 uppercase tracking-wider">Тариф</th>
                                <th className="py-4 px-6 text-xs font-semibold text-white/40 uppercase tracking-wider">Баланс</th>
                                <th className="py-4 px-6 text-right text-xs font-semibold text-white/40 uppercase tracking-wider">Действия</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-white/40">
                                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" /> Загрузка...
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-white/40">Пользователи не найдены</td>
                                </tr>
                            ) : users.map(user => (
                                <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                                                <User className="w-5 h-5 text-white/60" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-white text-sm">{user.email}</div>
                                                <div className="text-xs text-white/30">Рег: {new Date(user.createdAt).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${user.role === 'ADMIN' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                            user.role === 'VENDOR' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                                'bg-white/5 text-white/60'
                                            }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${user.tier === 'PLATINUM' ? 'bg-indigo-500/10 text-indigo-400' :
                                            user.tier === 'GOLD' ? 'bg-amber-500/10 text-amber-400' :
                                                'bg-slate-500/10 text-slate-400'
                                            }`}>
                                            {user.tier}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 font-mono text-sm text-white">
                                        ${user.balance.toFixed(2)}
                                    </td>
                                    <td className="py-4 px-6 text-right space-x-2">
                                        <button
                                            onClick={() => handleMessageUser(user.id)}
                                            className="p-2 rounded-xl bg-white/5 text-purple-400 hover:text-white hover:bg-purple-500/20 transition-all border-0 cursor-pointer"
                                            title="Написать"
                                        >
                                            <MessageCircle className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingUser(user);
                                                setEditForm({ role: user.role, tier: user.tier, balance: user.balance });
                                            }}
                                            className="p-2 rounded-xl bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all border-0 cursor-pointer"
                                            title="Редактировать"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal */}
            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setEditingUser(null)}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div
                        className="relative w-full max-w-md bg-[#161b2e] border border-white/10 rounded-3xl p-6 shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <h3 className="text-xl font-bold text-white mb-4">Редактирование {editingUser.email}</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-white/50 mb-1.5">Роль</label>
                                <select
                                    value={editForm.role}
                                    onChange={e => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white appearance-none outline-none focus:border-red-500/50"
                                >
                                    <option value="USER" className="bg-[#161b2e]">Покупатель (USER)</option>
                                    <option value="VENDOR" className="bg-[#161b2e]">Продавец (VENDOR)</option>
                                    <option value="ADMIN" className="bg-[#161b2e]">Администратор (ADMIN)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-white/50 mb-1.5">Тариф</label>
                                <select
                                    value={editForm.tier}
                                    onChange={e => setEditForm(prev => ({ ...prev, tier: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white appearance-none outline-none focus:border-red-500/50"
                                >
                                    <option value="SILVER" className="bg-[#161b2e]">SILVER</option>
                                    <option value="GOLD" className="bg-[#161b2e]">GOLD</option>
                                    <option value="PLATINUM" className="bg-[#161b2e]">PLATINUM</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-white/50 mb-1.5">Баланс ($)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={editForm.balance}
                                    onChange={e => setEditForm(prev => ({ ...prev, balance: parseFloat(e.target.value) || 0 }))}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-red-500/50"
                                />
                                <p className="text-[10px] text-white/30 mt-1">Осторожно! Изменение баланса напрямую.</p>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={() => setEditingUser(null)}
                                className="flex-1 py-3 px-4 rounded-xl border border-white/10 text-white hover:bg-white/5 font-medium transition-colors cursor-pointer bg-transparent"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleEditSave}
                                className="flex-1 py-3 px-4 rounded-xl font-medium text-white border-0 cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.3)] bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 transition-all"
                            >
                                <Check className="w-4 h-4" /> Сохранить
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
