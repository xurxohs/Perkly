'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Crown, Edit2, Check, X, Store, Camera, Loader2, Copy, CheckCircle, ShieldAlert } from 'lucide-react';
import { PerklyGlyph } from '@/components/PerklyGlyph';
import { usersApi } from '@/lib/api';

const TIER_COLORS: Record<string, { bgClass: string; textClass: string; borderClass: string; glowClass: string; label: string }> = {
    SILVER: {
        bgClass: 'bg-slate-500/10',
        textClass: 'text-slate-300',
        borderClass: 'border-slate-400/30',
        glowClass: 'from-slate-400/20 to-slate-600/10',
        label: 'Silver Access',
    },
    GOLD: {
        bgClass: 'bg-amber-500/10',
        textClass: 'text-amber-400',
        borderClass: 'border-amber-400/40',
        glowClass: 'from-amber-400/20 to-yellow-600/10',
        label: 'Gold Member',
    },
    PLATINUM: {
        bgClass: 'bg-purple-500/10',
        textClass: 'text-purple-300',
        borderClass: 'border-purple-400/40',
        glowClass: 'from-purple-400/25 to-pink-500/10',
        label: 'VIP Platinum',
    },
};

interface ProfileHeaderProps {
    user: {
        id: string;
        email: string;
        displayName?: string;
        avatarUrl?: string;
        tier: string;
        role: string;
    };
    refreshUser: () => Promise<void>;
}

export function ProfileHeader({ user, refreshUser }: ProfileHeaderProps) {
    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState(user.displayName || '');
    const [savingName, setSavingName] = useState(false);

    const [avatarUploading, setAvatarUploading] = useState(false);
    const [avatarError, setAvatarError] = useState<string | null>(null);

    const [copiedId, setCopiedId] = useState(false);

    const handleSaveName = async () => {
        if (!editName.trim()) return;
        setSavingName(true);
        try {
            await usersApi.updateProfile({ displayName: editName.trim() });
            await refreshUser();
            setEditing(false);
        } catch (err) {
            console.error('Failed to update display name', err);
        } finally {
            setSavingName(false);
        }
    };

    const handleAvatarFile = async (file: File) => {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            setAvatarError('Поддерживаются форматы JPG, PNG и WebP');
            return;
        }
        if (file.size > 6 * 1024 * 1024) {
            setAvatarError('Размер файла не должен превышать 6 МБ');
            return;
        }

        setAvatarUploading(true);
        setAvatarError(null);

        try {
            const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result));
                reader.onerror = () => reject(new Error('Ошибка чтения файла'));
                reader.readAsDataURL(file);
            });

            await usersApi.uploadAvatar(dataUrl);
            await refreshUser();
        } catch (error) {
            setAvatarError(error instanceof Error ? error.message : 'Не удалось загрузить фото');
        } finally {
            setAvatarUploading(false);
        }
    };

    const copyUserId = () => {
        navigator.clipboard.writeText(user.id);
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
    };

    const tierInfo = TIER_COLORS[user.tier] || TIER_COLORS.SILVER;
    const canUseVendorHub = user.role === 'VENDOR' || user.role === 'ADMIN';

    return (
        <div className="relative overflow-hidden rounded-[28px] border border-white/[0.1] bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-6 sm:p-8 backdrop-blur-2xl shadow-2xl mb-6">
            {/* Background Glow */}
            <div className={`absolute -top-24 -right-24 w-80 h-80 rounded-full bg-gradient-to-br ${tierInfo.glowClass} blur-3xl pointer-events-none opacity-60`} />

            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center gap-5 sm:gap-6">
                    {/* Avatar Upload Container */}
                    <label
                        className="group relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center shrink-0 cursor-pointer overflow-hidden border border-white/20 bg-gradient-to-br from-white/10 to-white/5 shadow-inner transition-transform active:scale-95 hover:border-purple-500/50"
                        title="Изменить фото профиля"
                    >
                        {user.avatarUrl ? (
                            <Image
                                src={user.avatarUrl}
                                alt={user.displayName || 'Аватар'}
                                fill
                                sizes="96px"
                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                        ) : (
                            <div className="flex items-center justify-center w-full h-full bg-purple-500/10 text-purple-300">
                                <PerklyGlyph name="profile" className="w-10 h-10" />
                            </div>
                        )}

                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                            {avatarUploading ? (
                                <Loader2 className="w-6 h-6 animate-spin text-white" />
                            ) : (
                                <>
                                    <Camera className="w-6 h-6 text-white mb-0.5" />
                                    <span className="text-[10px] font-bold text-white/80 uppercase">Фото</span>
                                </>
                            )}
                        </div>
                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            disabled={avatarUploading}
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) void handleAvatarFile(file);
                                e.currentTarget.value = '';
                            }}
                        />
                    </label>

                    {/* Info */}
                    <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            {editing ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="px-3 py-1 rounded-xl text-white text-lg font-bold outline-none bg-black/40 border border-purple-500/50 focus:ring-2 focus:ring-purple-500/30"
                                        placeholder="Ваше имя"
                                        autoFocus
                                    />
                                    <button
                                        onClick={handleSaveName}
                                        disabled={savingName}
                                        className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 transition-all cursor-pointer"
                                        title="Сохранить"
                                    >
                                        <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setEditing(false)}
                                        className="p-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition-all cursor-pointer"
                                        title="Отмена"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight truncate">
                                        {user.displayName || 'Пользователь'}
                                    </h1>
                                    <button
                                        onClick={() => {
                                            setEditing(true);
                                            setEditName(user.displayName || '');
                                        }}
                                        className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                                        title="Редактировать имя"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>

                        <p className="text-sm text-white/50 font-medium truncate flex items-center gap-2">
                            <span>{user.email}</span>
                            <span className="text-white/20">•</span>
                            <button
                                onClick={copyUserId}
                                className="inline-flex items-center gap-1 text-xs text-white/40 hover:text-purple-300 transition-colors cursor-pointer bg-white/5 px-2 py-0.5 rounded-md border border-white/10"
                                title="Скопировать ID"
                            >
                                {copiedId ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                <span className="font-mono">{copiedId ? 'Скопирован' : `ID: ${user.id.slice(0, 8)}...`}</span>
                            </button>
                        </p>

                        {avatarError && <p className="text-xs font-semibold text-red-400">{avatarError}</p>}

                        {/* Tier & Role Badges */}
                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black tracking-wide border ${tierInfo.bgClass} ${tierInfo.textClass} ${tierInfo.borderClass} shadow-sm backdrop-blur-md`}>
                                <Crown className="w-3.5 h-3.5" />
                                {tierInfo.label}
                            </span>

                            {canUseVendorHub ? (
                                <Link
                                    href="/vendor"
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold text-purple-200 bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 transition-all no-underline shadow-sm"
                                >
                                    <Store className="w-3.5 h-3.5 text-purple-400" />
                                    Кабинет продавца
                                </Link>
                            ) : (
                                <Link
                                    href="/sell"
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all no-underline shadow-sm"
                                >
                                    <Store className="w-3.5 h-3.5 text-emerald-400" />
                                    Стать партнером
                                </Link>
                            )}

                            {user.role === 'ADMIN' && (
                                <Link
                                    href="/admin"
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold text-rose-300 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 transition-all no-underline shadow-sm"
                                >
                                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                                    Админ Панель
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
