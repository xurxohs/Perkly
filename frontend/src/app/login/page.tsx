"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { ArrowRight, Lock, Mail, CheckCircle, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useTelegram } from "@/hooks/useTelegram";

const API_BASE = typeof window !== 'undefined' ? '/api' : (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001');

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isRegistered = searchParams.get("registered");
    const requestedNext = searchParams.get("next");
    const nextPath = requestedNext?.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/';
    const { login } = useAuth();
    const { initData, isTMA, hapticNotification } = useTelegram();

    // Email form state
    const [formData, setFormData] = useState({ email: "", password: "" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Telegram polling state
    const [tgStep, setTgStep] = useState<'idle' | 'waiting' | 'done'>('idle');
    const [tgUrl, setTgUrl] = useState('');
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Auto TMA login if inside Telegram WebApp
    useEffect(() => {
        if (initData && isTMA) {
            setLoading(true);
            fetch(`${API_BASE}/auth/telegram-miniapp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ initData }),
            })
                .then((res) => res.json())
                .then((data) => {
                    if (data.access_token) {
                        localStorage.setItem('perkly_token', data.access_token);
                        hapticNotification('success');
                        setTgStep('done');
                        setTimeout(() => router.push(nextPath), 500);
                    }
                })
                .catch(() => {})
                .finally(() => setLoading(false));
        }
    }, [initData, isTMA, router, hapticNotification, nextPath]);

    // Clean up polling on unmount
    useEffect(() => {
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, []);

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            await login(formData.email, formData.password);
            router.push(nextPath);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Неверный email или пароль.";
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleTelegramLogin = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch(`${API_BASE}/auth/telegram-init`);
            const data = await res.json();
            setTgUrl(data.url);
            setTgStep('waiting');

            // Open Telegram in new tab
            window.open(data.url, '_blank');

            // Start polling
            pollRef.current = setInterval(async () => {
                try {
                    const pollRes = await fetch(`${API_BASE}/auth/telegram-poll?token=${data.token}`);
                    const pollData = await pollRes.json();
                    if (pollData.status === 'ok' && pollData.access_token) {
                        clearInterval(pollRef.current!);
                        localStorage.setItem('perkly_token', pollData.access_token);
                        setTgStep('done');
                        setTimeout(() => router.push(nextPath), 800);
                    } else if (pollData.status === 'expired') {
                        clearInterval(pollRef.current!);
                        setTgStep('idle');
                        setError('Время ожидания вышло. Попробуйте снова.');
                    } else if (pollData.status === 'error') {
                        clearInterval(pollRef.current!);
                        setTgStep('idle');
                        setError(pollData.user?.message || 'Ошибка входа через Telegram. Попробуйте снова.');
                    }
                } catch { /* keep polling */ }
            }, 2000);
        } catch {
            setError('Не удалось подключиться. Проверьте соединение.');
        } finally {
            setLoading(false);
        }
    };

    const cancelTgLogin = () => {
        if (pollRef.current) clearInterval(pollRef.current);
        setTgStep('idle');
        setTgUrl('');
    };

    return (
        <div className="glass-card w-full max-w-md p-8 relative flex flex-col">
            {/* Decorative glows */}
            <div className="absolute -top-6 -left-6 w-24 h-24 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full blur-2xl opacity-40 z-0 pointer-events-none" />
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full blur-3xl opacity-30 z-0 pointer-events-none" />

            {/* Header */}
            <div className="z-10 text-center mb-8">
                <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">С возвращением</h1>
                <p className="text-white/50 text-sm">Войдите через Telegram или email</p>
            </div>

            {isRegistered && (
                <div className="z-10 text-emerald-400 text-sm font-medium text-center bg-emerald-500/10 py-3 mb-6 rounded-xl border border-emerald-500/20">
                    ✅ Успешная регистрация! Теперь вы можете войти.
                </div>
            )}

            {/* ======= TELEGRAM SECTION ======= */}
            {tgStep === 'idle' && (
                <div className="z-10 mb-6 font-sans">
                    <button
                        onClick={handleTelegramLogin}
                        disabled={loading}
                        className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-white text-base transition-all cursor-pointer border-0 bg-telegram-gradient shadow-telegram-glow ${loading ? 'opacity-70' : 'opacity-100 hover:opacity-90'}`}
                        title="Войти через Telegram"
                    >
                        <Image
                            src="/brands/telegram.svg"
                            alt=""
                            width={24}
                            height={24}
                            className="w-6 h-6 shrink-0"
                            aria-hidden="true"
                        />
                        Войти через Telegram
                    </button>
                    <p className="text-center text-xs text-white/30 mt-2">
                        Откроется бот — он попросит номер телефона
                    </p>
                </div>
            )}

            {tgStep === 'waiting' && (
                <div className="z-10 mb-6 rounded-2xl p-5 text-center bg-[#0088cc]/10 border border-[#0088cc]/20">
                    <Loader2 className="w-8 h-8 text-blue-400 mx-auto mb-3 animate-spin" />
                    <p className="text-white font-semibold mb-1">Ожидаем подтверждения...</p>
                    <p className="text-white/40 text-sm mb-4">
                        Откройте Telegram, нажмите кнопку<br />
                        <span className="text-blue-300 font-medium">📱 Поделиться номером телефона</span>
                    </p>
                    <a
                        href={tgUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-blue-400 underline mb-3"
                    >
                        Открыть бот снова <ArrowRight className="w-3 h-3" />
                    </a>
                    <div>
                        <button onClick={cancelTgLogin} className="text-xs text-white/30 hover:text-white/60 transition bg-transparent border-0 cursor-pointer" title="Отменить вход">
                            Отменить
                        </button>
                    </div>
                </div>
            )}

            {tgStep === 'done' && (
                <div className="z-10 mb-6 rounded-2xl p-5 text-center bg-green-500/10 border border-green-500/20">
                    <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
                    <p className="text-green-400 font-bold text-lg">Вы вошли!</p>
                    <p className="text-white/40 text-sm mt-1">Перенаправляем на главную...</p>
                </div>
            )}

            {/* Divider */}
            {tgStep === 'idle' && (
                <>
                    <div className="z-10 flex items-center justify-center gap-4 mb-6">
                        <div className="h-px bg-white/10 flex-1" />
                        <span className="text-xs text-white/30 uppercase tracking-widest">или по email</span>
                        <div className="h-px bg-white/10 flex-1" />
                    </div>

                    {/* Email form */}
                    <form onSubmit={handleEmailLogin} className="z-10 flex flex-col gap-4">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-white/40" />
                            </div>
                            <input
                                type="email"
                                required
                                placeholder="Ваш E-mail"
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:bg-white/10 transition-all font-medium"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-white/40" />
                            </div>
                            <input
                                type="password"
                                required
                                placeholder="Ваш пароль"
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:bg-white/10 transition-all font-medium"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>

                        {error && <div className="text-rose-400 text-sm font-medium text-center bg-rose-500/10 py-2 rounded-lg border border-rose-500/20">{error}</div>}

                        <button
                            type="submit"
                            disabled={loading}
                            className={`mt-2 w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border-0 disabled:opacity-50 ${loading ? '' : 'hover:opacity-90 shadow-lg'}`}
                            title="Войти"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Войти <ArrowRight className="w-5 h-5" /></>}
                        </button>
                    </form>
                </>
            )}

            {error && tgStep !== 'idle' && (
                <p className="z-10 text-rose-400 text-sm text-center mt-2">{error}</p>
            )}

            <p className="z-10 text-center mt-6 text-sm text-white/50">
                Нет аккаунта?{" "}
                <Link href="/register" className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
                    Создать
                </Link>
            </p>
        </div>
    );
}

export default function LoginPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 w-full relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -track-x-1/2 -track-y-1/2 w-[800px] h-[800px] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none -z-10" />
            <Suspense fallback={<div className="text-white/50">Загрузка...</div>}>
                <LoginForm />
            </Suspense>
        </div>
    );
}
