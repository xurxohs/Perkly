'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { Users, UserPlus, Share2, Trophy, ArrowRight, CheckCircle2, Loader2, Copy, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useTelegram } from '@/hooks/useTelegram';
import { squadsApi, Squad } from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

function SquadContent() {
    const { user, refreshUser } = useAuth();
    const { hapticImpact, hapticNotification } = useTelegram();
    const router = useRouter();
    const searchParams = useSearchParams();
    const joinCode = searchParams.get('join');

    const [squad, setSquad] = useState<Squad | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [squadName, setSquadName] = useState('');
    const [copied, setCopied] = useState(false);

    const handleJoinSquad = useCallback(async (code: string) => {
        setActionLoading(true);
        try {
            const joinedSquad = await squadsApi.join(code);
            setSquad(joinedSquad);
            hapticNotification('success');
            await refreshUser();
            router.replace('/profile/squad');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Ошибка при вступлении в сквад';
            alert(message);
            hapticNotification('error');
        } finally {
            setActionLoading(false);
        }
    }, [hapticNotification, refreshUser, router]);

    const handleCreateSquad = async () => {
        if (!squadName.trim()) return;
        setActionLoading(true);
        try {
            const newSquad = await squadsApi.create(squadName);
            setSquad(newSquad);
            hapticNotification('success');
            await refreshUser();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Ошибка при создании сквада';
            alert(message);
            hapticNotification('error');
        } finally {
            setActionLoading(false);
        }
    };

    const fetchSquad = async () => {
        try {
            const data = await squadsApi.getMe();
            setSquad(data);
        } catch (err) {
            console.error('Failed to fetch squad:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSquad();
    }, []);

    useEffect(() => {
        if (joinCode && !loading && !squad) {
            handleJoinSquad(joinCode);
        }
    }, [joinCode, loading, squad, handleJoinSquad]);

    const copyInviteLink = () => {
        if (!squad) return;
        const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME || 'PerklyPlatformBot';
        const link = `https://t.me/${botUsername}?start=squad_${squad.inviteCode}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        hapticImpact('light');
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
                <p className="text-white/40 mt-4 font-medium italic">Загружаем ваш сквад...</p>
            </div>
        );
    }

    if (!squad) {
        return (
            <div className="max-w-2xl mx-auto px-6 py-12">
                <div className="text-center mb-12">
                    <div className="w-20 h-20 bg-purple-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-primary-glow">
                        <Users className="w-10 h-10 text-purple-400" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-white mb-4">Командные Цели ✨</h1>
                    <p className="text-white/50 leading-relaxed max-w-md mx-auto">
                        Объединяйтесь с друзьями в сквад (до 5 человек). 
                        Достигайте общей цели по тратам и получайте <span className="text-purple-400 font-bold">Mega Perk</span> — кешбэк 15% на следующую покупку!
                    </p>
                </div>

                <div className="space-y-6">
                    <div className="rounded-2xl p-8 bg-white/[0.02] border border-white/[0.08] backdrop-blur-sm shadow-xl">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <UserPlus className="w-5 h-5 text-purple-400" /> Создать свой сквад
                        </h2>
                        <div className="space-y-4">
                            <input
                                type="text"
                                value={squadName}
                                onChange={(e) => setSquadName(e.target.value)}
                                placeholder="Название сквада (например: Элита)"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white outline-none focus:border-purple-500/50 transition-all font-medium"
                            />
                            <button
                                onClick={handleCreateSquad}
                                disabled={actionLoading || !squadName.trim()}
                                className="w-full py-4 rounded-xl font-extrabold text-lg transition-all transform active:scale-95 disabled:opacity-50 disabled:active:scale-100 bg-primary-gradient text-white shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 border-0 cursor-pointer"
                                title="Создать сквад"
                            >
                                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : '🚀 Создать Сквад'}
                            </button>
                        </div>
                    </div>

                    <div className="text-center">
                        <p className="text-white/30 text-sm">Или используйте ссылку от друга для вступления</p>
                    </div>
                </div>
            </div>
        );
    }

    const progressPercentage = Math.min(100, (squad.currentSpending / squad.monthlyGoal) * 100);
    const isGoalReached = squad.currentSpending >= squad.monthlyGoal;

    return (
        <div className="max-w-4xl mx-auto px-6 py-12">
            {/* Squad Header */}
            <div className="rounded-3xl p-8 mb-8 relative overflow-hidden bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-white/[0.08] backdrop-blur-md shadow-2xl">
                <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/2" />
                
                <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8 relative z-10">
                    <div className="text-center md:text-left">
                        <div className="flex items-center justify-center md:justify-start gap-4 mb-4">
                            <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center shadow-lg border border-purple-500/30">
                                <Users className="w-8 h-8 text-purple-400" />
                            </div>
                            <div>
                                <span className="text-[10px] uppercase tracking-widest text-purple-400 font-extrabold mb-1 block">Ваш Сквад</span>
                                <h1 className="text-3xl font-extrabold text-white leading-tight">{squad.name}</h1>
                            </div>
                        </div>
                        <p className="text-white/40 text-sm max-w-sm">
                            Достигайте цели вместе! В команде уже {squad.members.length} из 5 участников.
                        </p>
                    </div>

                    <div className="flex flex-col items-center md:items-end gap-3">
                        <div className="text-xs text-white/30 font-medium">Ваш код приглашения:</div>
                        <div className="flex items-center gap-2">
                            <span className="px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-xl tracking-widest font-bold">
                                {squad.inviteCode}
                            </span>
                            <button
                                onClick={copyInviteLink}
                                className={`p-4 rounded-xl border-0 cursor-pointer transition-all ${copied ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'}`}
                                title="Копировать код"
                                aria-label="Копировать код"
                            >
                                {copied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                            </button>
                        </div>
                        <button
                            onClick={copyInviteLink}
                            className="flex items-center gap-2 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-wider mt-2 bg-transparent border-0 cursor-pointer"
                            title="Поделиться ссылкой"
                        >
                            <Share2 className="w-3.5 h-3.5" /> Поделиться ссылкой
                        </button>
                    </div>
                </div>
            </div>

            {/* Progress Section */}
            <div className="rounded-3xl p-8 mb-8 bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm relative overflow-hidden">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-xl font-extrabold text-white mb-2 flex items-center gap-2">
                            <Trophy className={`w-6 h-6 ${isGoalReached ? 'text-yellow-400 animate-pulse' : 'text-gray-500'}`} /> Цель месяца
                        </h2>
                        <p className="text-sm text-white/30 italic">Суммарные траты всех участников за этот месяц</p>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-extrabold text-white">{(squad.currentSpending).toLocaleString()} / 1,000,000</div>
                        <div className="text-xs text-purple-400 font-bold uppercase tracking-widest">UZS</div>
                    </div>
                </div>

                <div className="relative h-6 bg-white/[0.03] rounded-full overflow-hidden border border-white/10 p-1 mb-8 shadow-inner">
                    <div
                        className="h-full bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 rounded-full transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(168,85,247,0.5)] [width:var(--progress)]"
                        style={{ '--progress': `${progressPercentage}%` } as React.CSSProperties}
                    />
                    {isGoalReached && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[10px] font-extrabold text-white uppercase tracking-[0.2em] drop-shadow-md">Цель Достигнута! 🎉</span>
                        </div>
                    )}
                </div>

                {isGoalReached ? (
                    <div className="rounded-2xl p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 flex flex-col items-center text-center gap-4">
                        <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center animate-bounce shadow-lg border border-green-500/30">
                            <ShieldCheck className="w-8 h-8 text-green-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-green-400 mb-2">Статус Mega Perk Активирован! ⚡️</h3>
                            <p className="text-white/60 text-sm max-w-sm">
                                Теперь вы и ваши друзья получите <span className="text-green-400 font-extrabold">15% кешбэк</span> Perkly Points на следующую покупку.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
                            <h4 className="text-xs font-bold text-white/30 uppercase mb-2">Осталось собрать</h4>
                            <div className="text-lg font-bold text-white italic">{Math.max(0, squad.monthlyGoal - squad.currentSpending).toLocaleString()} UZS</div>
                        </div>
                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
                            <h4 className="text-xs font-bold text-white/30 uppercase mb-2">Участников</h4>
                            <div className="text-lg font-bold text-white italic">{squad.members.length} / 5</div>
                        </div>
                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
                            <h4 className="text-xs font-bold text-white/30 uppercase mb-2">Дней до конца</h4>
                            <div className="text-lg font-bold text-white italic">
                                {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate()}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Members Section */}
            <div className="mb-12">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    👥 Состав Сквада <span className="text-white/20 font-medium font-mono">({squad.members.length}/5)</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {squad.members.map((member) => (
                        <div key={member.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] group hover:border-purple-500/30 transition-all cursor-default">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 flex items-center justify-center border border-white/5 transition-transform group-hover:scale-110 relative overflow-hidden">
                                {member.avatarUrl ? (
                                    <Image src={member.avatarUrl} alt={member.displayName || 'Avatar'} fill className="object-cover" />
                                ) : (
                                    <div className="text-xl font-extrabold text-purple-400 capitalize">
                                        {(member.displayName || 'U')[0]}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1">
                                <div className="text-sm font-bold text-white mb-0.5">{member.displayName || 'Аноним'}</div>
                                <div className="text-[10px] text-white/30 uppercase tracking-widest font-extrabold">Участник</div>
                            </div>
                            {member.id === user?.id && (
                                <span className="px-2 py-1 rounded-md bg-purple-500/20 text-purple-400 text-[10px] font-black uppercase">Вы</span>
                            )}
                        </div>
                    ))}
                    
                    {squad.members.length < 5 && (
                        <button
                            onClick={copyInviteLink}
                            className="flex items-center gap-4 p-4 rounded-2xl bg-purple-500/5 border border-dashed border-purple-500/30 group hover:border-purple-400/50 hover:bg-purple-500/10 transition-all cursor-pointer"
                            title="Пригласить друга"
                        >
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                                <UserPlus className="w-6 h-6 text-purple-400" />
                            </div>
                            <div className="text-left flex-1">
                                <div className="text-sm font-bold text-purple-400">Пригласить друга</div>
                                <div className="text-[10px] text-purple-400/40 font-medium">Ещё есть свободные места!</div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-purple-400/30 group-hover:translate-x-1 transition-all" />
                        </button>
                    )}
                </div>
            </div>

            {/* Info Footer */}
            <div className="text-center">
                <Link href="/profile" className="text-white/30 hover:text-white transition-all text-sm no-underline flex items-center justify-center gap-2 group">
                    <span className="w-6 h-px bg-white/10 group-hover:bg-white/30 transition-all" />
                    Вернуться в профиль
                    <span className="w-6 h-px bg-white/10 group-hover:bg-white/30 transition-all" />
                </Link>
            </div>
        </div>
    );
}

export default function SquadPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
            </div>
        }>
            <SquadContent />
        </Suspense>
    );
}
