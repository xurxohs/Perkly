'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { Shield, Mail, Lock, LogIn, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AdminLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { login } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await login(email, password);
            router.push('/admin'); // После логина перекидывает в дашборд (layout проверит роль)
        } catch (err: any) {
            setError(err.message || 'Ошибка входа');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0f1c] flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-500/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] bg-pink-500/10 rounded-full blur-[80px] pointer-events-none" />

            <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-white/40 hover:text-white transition-colors no-underline">
                <ArrowLeft className="w-4 h-4" /> На главную
            </Link>

            <div className="w-full max-w-md relative z-10 animate-fade-in fade-in-up">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-red-500/20 to-pink-500/20 border border-red-500/30 mb-6 shadow-[0_0_40px_rgba(239,68,68,0.2)]">
                        <Shield className="w-10 h-10 text-red-400" />
                    </div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-pink-500 mb-2">Superadmin</h1>
                    <p className="text-white/40">Доступ только для администраторов</p>
                </div>

                <div className="bg-[#101524]/60 backdrop-blur-xl border border-white/5 rounded-[2rem] p-8 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white/60 ml-1">E-mail</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail className="w-5 h-5 text-white/30" />
                                </div>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all"
                                    placeholder="admin@perkly.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white/60 ml-1">Пароль</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="w-5 h-5 text-white/30" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full relative group overflow-hidden rounded-2xl py-4 flex items-center justify-center gap-2 font-bold text-white transition-all duration-300 border-0 cursor-pointer ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:scale-[1.02]'
                                }`}
                            style={{
                                background: 'linear-gradient(135deg, rgba(239,68,68,0.8) 0%, rgba(249,115,22,0.8) 100%)',
                                boxShadow: '0 10px 30px rgba(239,68,68,0.2), inset 0 2px 0 rgba(255,255,255,0.2)'
                            }}
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span className="relative z-10">Войти в админ-панель</span>
                                    <LogIn className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-[100%] group-hover:animate-shimmer" />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
