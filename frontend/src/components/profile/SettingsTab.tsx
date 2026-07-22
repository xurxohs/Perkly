'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Globe, Mail, ShieldCheck, Send, CheckCircle2, Loader2 } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { authApi } from '@/lib/api';

interface SettingsTabProps {
    user: {
        email: string;
        tier: string;
        telegramId?: string;
    };
    logout: () => void;
    refreshUser: () => Promise<void>;
}

export function SettingsTab({ user, logout, refreshUser }: SettingsTabProps) {
    const router = useRouter();
    const [tgStep, setTgStep] = useState<'idle' | 'waiting' | 'done'>('idle');
    const [tgUrl, setTgUrl] = useState('');
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, []);

    const handleBindTelegram = async () => {
        setTgStep('waiting');
        try {
            const { token, url } = await authApi.telegramInit();
            setTgUrl(url);
            window.open(url, '_blank');

            pollRef.current = setInterval(async () => {
                try {
                    const pollData = await authApi.telegramPoll(token);
                    if (pollData.status === 'ok' && pollData.access_token) {
                        if (pollRef.current) clearInterval(pollRef.current);
                        localStorage.setItem('perkly_token', pollData.access_token);
                        setTgStep('done');
                        await refreshUser();
                        alert('✅ Telegram успешно привязан!');
                    } else if (pollData.status === 'expired') {
                        if (pollRef.current) clearInterval(pollRef.current);
                        setTgStep('idle');
                        alert('Время ожидания вышло. Попробуйте снова.');
                    } else if (pollData.status === 'error') {
                        if (pollRef.current) clearInterval(pollRef.current);
                        setTgStep('idle');
                        alert('Ошибка привязки: ' + (pollData.user?.message || 'Telegram уже привязан к другому аккаунту!'));
                    }
                } catch {
                    /* keep polling */
                }
            }, 2000);
        } catch {
            setTgStep('idle');
            alert('Не удалось подключиться к боту. Проверьте соединение.');
        }
    };

    const cancelTgBind = () => {
        if (pollRef.current) clearInterval(pollRef.current);
        setTgStep('idle');
        setTgUrl('');
    };

    return (
        <div className="rounded-2xl p-6 bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.08] backdrop-blur-xl space-y-6">
            {/* Language Selection */}
            <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-black/40 border border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                        <Globe className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white">Язык интерфейса</p>
                        <p className="text-xs text-white/40 font-medium">Выберите удобный язык приложения</p>
                    </div>
                </div>
                <LanguageSwitcher />
            </div>

            {/* Account Email */}
            <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
                <label className="text-xs text-white/40 uppercase font-bold tracking-wider flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-purple-400" />
                    Email аккаунта
                </label>
                <div className="text-sm font-extrabold text-white">{user.email}</div>
            </div>

            {/* User Tier Details */}
            <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
                <label className="text-xs text-white/40 uppercase font-bold tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    Текущий тариф аккаунта
                </label>
                <div className="text-sm font-extrabold text-amber-300">
                    {user.tier} — {user.tier === 'SILVER' ? 'Базовый доступ и кэшбэк' : user.tier === 'GOLD' ? 'Расширенный доступ и бонусы' : 'VIP привилегии и персональный менеджер'}
                </div>
            </div>

            {/* Telegram Account Binding */}
            <div className="p-4.5 rounded-xl bg-black/40 border border-white/5 space-y-3">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                            <Send className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white">Telegram Бот Perkly</p>
                            <p className="text-xs text-white/40 font-medium">Мгновенные уведомления и выдача ключей</p>
                        </div>
                    </div>

                    {user.telegramId ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                            <CheckCircle2 className="w-4 h-4" /> Привязан
                        </span>
                    ) : tgStep === 'idle' ? (
                        <button
                            onClick={handleBindTelegram}
                            className="px-4 py-2 rounded-xl text-xs font-extrabold border border-blue-500/30 cursor-pointer text-white bg-blue-500/20 hover:bg-blue-500/30 transition-all shadow-sm"
                        >
                            Привязать Бот
                        </button>
                    ) : tgStep === 'waiting' ? (
                        <div className="text-right space-y-1">
                            <a
                                href={tgUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-bold text-blue-400 hover:text-blue-300 no-underline bg-blue-500/10 px-3 py-1.5 rounded-xl border border-blue-500/20"
                            >
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Открыть бота</span>
                            </a>
                            <button
                                onClick={cancelTgBind}
                                className="block text-[11px] text-white/30 hover:text-white/60 border-0 bg-transparent cursor-pointer ml-auto"
                            >
                                Отменить
                            </button>
                        </div>
                    ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                            <CheckCircle2 className="w-4 h-4" /> Готово
                        </span>
                    )}
                </div>
            </div>

            {/* Logout Action */}
            <div className="pt-2">
                <button
                    onClick={() => {
                        logout();
                        router.push('/');
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-rose-400 font-extrabold text-sm cursor-pointer bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/20 transition-all"
                >
                    <LogOut className="w-4 h-4" />
                    <span>Выйти из аккаунта</span>
                </button>
            </div>
        </div>
    );
}
