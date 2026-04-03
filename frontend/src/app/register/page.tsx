"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowRight, Lock, Mail, User, Loader2, CheckCircle, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function RegisterPage() {
    const router = useRouter();
    const { register } = useAuth();
    const [formData, setFormData] = useState({ displayName: "", email: "", passwordHash: "" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Telegram polling state
    const [tgStep, setTgStep] = useState<'idle' | 'waiting' | 'done'>('idle');
    const [tgUrl, setTgUrl] = useState('');
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            await register(formData.email, formData.passwordHash, formData.displayName);
            router.push("/");
        } catch (err: any) {
            setError(err.message || "Ошибка регистрации. Возможно, email уже занят.");
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
            window.open(data.url, '_blank');
            pollRef.current = setInterval(async () => {
                try {
                    const pollRes = await fetch(`${API_BASE}/auth/telegram-poll?token=${data.token}`);
                    const pollData = await pollRes.json();
                    if (pollData.status === 'ok' && pollData.access_token) {
                        clearInterval(pollRef.current!);
                        localStorage.setItem('perkly_token', pollData.access_token);
                        setTgStep('done');
                        setTimeout(() => router.push('/'), 800);
                    } else if (pollData.status === 'expired') {
                        clearInterval(pollRef.current!);
                        setTgStep('idle');
                        setError('Время ожидания вышло. Попробуйте снова.');
                    }
                } catch { /* keep polling */ }
            }, 2000);
        } catch {
            setError('Не удалось подключиться. Проверьте соединение.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 w-full relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-fuchsia-600/10 blur-[150px] rounded-full pointer-events-none -z-10" />

            <div className="glass-card w-full max-w-md p-8 relative flex flex-col">
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-br from-purple-500 to-fuchsia-500 rounded-full blur-2xl opacity-50 z-0" />
                <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-gradient-to-tr from-orange-500 to-rose-500 rounded-full blur-3xl opacity-30 z-0" />

                <div className="z-10 text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{ background: 'linear-gradient(135deg, #0088cc, #00b4ff)' }}>
                        <Send className="w-7 h-7 text-white" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">Создать аккаунт</h1>
                    <p className="text-white/50 text-sm">Присоединяйтесь через Telegram — быстро и просто</p>
                </div>

                {/* ======= TELEGRAM SECTION ======= */}
                {tgStep === 'idle' && (
                    <div className="z-10 mb-6">
                        <button
                            onClick={handleTelegramLogin}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-white text-base transition-all cursor-pointer border-0"
                            style={{
                                background: 'linear-gradient(135deg, #0088cc, #00b4ff)',
                                boxShadow: '0 0 30px rgba(0,136,204,0.35)',
                                opacity: loading ? 0.7 : 1
                            }}
                        >
                            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.869 4.326-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.829.941z" />
                            </svg>
                            Зарегистрироваться через Telegram
                        </button>
                        <p className="text-center text-xs text-white/30 mt-2">
                            Номер телефона из Telegram (+998, +7, +77 и другие)
                        </p>
                    </div>
                )}

                {tgStep === 'waiting' && (
                    <div className="z-10 mb-6 rounded-2xl p-5 text-center" style={{ background: 'rgba(0,136,204,0.08)', border: '1px solid rgba(0,136,204,0.2)' }}>
                        <Loader2 className="w-8 h-8 text-blue-400 mx-auto mb-3 animate-spin" />
                        <p className="text-white font-semibold mb-1">Подтвердите в Telegram</p>
                        <p className="text-white/40 text-sm mb-4">
                            Нажмите кнопку в боте:<br />
                            <span className="text-blue-300 font-medium">📱 Поделиться номером телефона</span>
                        </p>
                        <a href={tgUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-blue-400 underline mb-3">
                            Открыть бот <ArrowRight className="w-3 h-3" />
                        </a>
                        <div>
                            <button onClick={() => { clearInterval(pollRef.current!); setTgStep('idle'); }} className="text-xs text-white/30 hover:text-white/60 transition bg-transparent border-0 cursor-pointer">
                                Отменить
                            </button>
                        </div>
                    </div>
                )}

                {tgStep === 'done' && (
                    <div className="z-10 mb-6 rounded-2xl p-5 text-center" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                        <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
                        <p className="text-green-400 font-bold text-lg">Аккаунт создан!</p>
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

                        <form onSubmit={handleSubmit} className="z-10 flex flex-col gap-4">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-white/40" />
                                </div>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ваш никнейм"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 focus:bg-white/10 transition-all font-medium"
                                    value={formData.displayName}
                                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                />
                            </div>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-white/40" />
                                </div>
                                <input
                                    type="email"
                                    required
                                    placeholder="E-mail адрес"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 focus:bg-white/10 transition-all font-medium"
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
                                    placeholder="Придумайте пароль"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 focus:bg-white/10 transition-all font-medium"
                                    value={formData.passwordHash}
                                    onChange={(e) => setFormData({ ...formData, passwordHash: e.target.value })}
                                />
                            </div>

                            {error && <div className="text-rose-400 text-sm font-medium text-center bg-rose-500/10 py-2 rounded-lg border border-rose-500/20">{error}</div>}

                            <button
                                type="submit"
                                disabled={loading}
                                className="mt-4 w-full bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border-0 disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Зарегистрироваться <ArrowRight className="w-5 h-5" /></>}
                            </button>
                        </form>
                    </>
                )}

                <p className="z-10 text-center mt-6 text-sm text-white/50">
                    Уже есть аккаунт?{" "}
                    <Link href="/login" className="text-fuchsia-400 hover:text-fuchsia-300 font-semibold transition-colors">
                        Войти
                    </Link>
                </p>
            </div>
        </div>
    );
}
