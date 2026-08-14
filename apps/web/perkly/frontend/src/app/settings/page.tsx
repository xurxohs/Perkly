'use client';

// Настройки: сгруппированные списки, поясняющая подпись под каждой группой,
// необратимые действия вынесены в отдельную группу.

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Bell, ChevronRight, Crown, Download, FileText, Info, Languages, LifeBuoy,
    Loader2, Lock, ShieldCheck, Store, SunMoon, TriangleAlert, Wallet,
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/i18n';
import { authApi, usersApi } from '@/lib/api';

const THEME_EVENT = 'perkly-theme-change';

const TIER_LABELS: Record<string, string> = {
    SILVER: 'Базовый',
    GOLD: 'Gold',
    PLATINUM: 'Platinum',
};

const formatSum = (value: number) => `${new Intl.NumberFormat('ru-RU').format(value)} сум`;

export default function SettingsPage() {
    const router = useRouter();
    const { user, isAuthenticated, loading, logout, refreshUser } = useAuth();
    const { language, setLanguage } = useLanguage();

    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [tgState, setTgState] = useState<'idle' | 'waiting'>('idle');
    const [exporting, setExporting] = useState(false);
    const [notice, setNotice] = useState('');
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        setTheme(window.localStorage.getItem('perkly-theme') === 'dark' ? 'dark' : 'light');
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, []);

    useEffect(() => {
        if (!loading && !isAuthenticated) router.push('/login?next=/settings');
    }, [loading, isAuthenticated, router]);

    const applyTheme = (next: 'light' | 'dark') => {
        window.localStorage.setItem('perkly-theme', next);
        window.dispatchEvent(new Event(THEME_EVENT));
        setTheme(next);
    };

    const bindTelegram = useCallback(async () => {
        setNotice('');
        setTgState('waiting');
        try {
            const { token, url } = await authApi.telegramLinkInit();
            window.open(url, '_blank');
            pollRef.current = setInterval(async () => {
                try {
                    const result = await authApi.telegramLinkPoll(token);
                    if (result.status === 'linked') {
                        if (pollRef.current) clearInterval(pollRef.current);
                        setTgState('idle');
                        await refreshUser();
                    } else if (result.status === 'expired' || result.status === 'error') {
                        if (pollRef.current) clearInterval(pollRef.current);
                        setTgState('idle');
                        setNotice(
                            result.status === 'expired'
                                ? 'Время ожидания вышло. Попробуйте ещё раз.'
                                : 'Этот Telegram уже привязан к другому аккаунту.',
                        );
                    }
                } catch {
                    // Сеть могла моргнуть — продолжаем опрос.
                }
            }, 2000);
        } catch {
            setTgState('idle');
            setNotice('Не удалось подключиться. Проверьте соединение.');
        }
    }, [refreshUser]);

    const exportData = async () => {
        setNotice('');
        setExporting(true);
        try {
            const data = await usersApi.exportPersonalData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `perkly-data-${new Date().toISOString().slice(0, 10)}.json`;
            link.click();
            URL.revokeObjectURL(url);
        } catch {
            setNotice('Не удалось выгрузить данные. Попробуйте позже.');
        } finally {
            setExporting(false);
        }
    };

    if (loading || !user) {
        return (
            <div className="pk pk-screen pk-screen--wide">
                <h1 className="pk-title">Настройки</h1>
                <p className="pk-subtitle">Загрузка…</p>
            </div>
        );
    }

    const isVendor = user.role === 'VENDOR' || user.role === 'ADMIN';
    const initial = (user.displayName || user.email || '?').trim().charAt(0).toUpperCase();

    return (
        <div className="pk pk-screen pk-screen--wide">
            <h1 className="pk-title">Настройки</h1>

            {notice && (
                <p className="pk-alert">
                    <TriangleAlert aria-hidden="true" />
                    {notice}
                </p>
            )}

            <div className="pk-list" style={{ marginTop: 22 }}>
                <Link href="/profile" className="pk-identity">
                    <span className="pk-identity-avatar">
                        {user.avatarUrl
                            ? <Image src={user.avatarUrl} alt="" fill sizes="58px" style={{ objectFit: 'cover' }} />
                            : initial}
                    </span>
                    <span className="pk-identity-body">
                        <strong>{user.displayName || 'Профиль'}</strong>
                        <span>{user.email}</span>
                    </span>
                    <ChevronRight className="pk-row-chevron" aria-hidden="true" />
                </Link>
            </div>
            <p className="pk-note">Имя, фотография, история покупок и сохранённые предложения.</p>

            <p className="pk-section">Аккаунт</p>
            <div className="pk-list pk-list--icons">
                <Link href="/pricing" className="pk-row">
                    <span className="pk-row-icon pk-ic-purple"><Crown aria-hidden="true" /></span>
                    <span className="pk-row-body"><strong>Тариф</strong></span>
                    <span className="pk-row-value">{TIER_LABELS[user.tier] ?? user.tier}</span>
                    <ChevronRight className="pk-row-chevron" aria-hidden="true" />
                </Link>
                <Link href="/profile" className="pk-row">
                    <span className="pk-row-icon pk-ic-green"><Wallet aria-hidden="true" /></span>
                    <span className="pk-row-body"><strong>Баланс</strong></span>
                    <span className="pk-row-value">{formatSum(user.balance)}</span>
                    <ChevronRight className="pk-row-chevron" aria-hidden="true" />
                </Link>
                <Link href={isVendor ? '/vendor' : '/sell'} className="pk-row">
                    <span className="pk-row-icon pk-ic-orange"><Store aria-hidden="true" /></span>
                    <span className="pk-row-body">
                        <strong>{isVendor ? 'Кабинет продавца' : 'Стать продавцом'}</strong>
                    </span>
                    <ChevronRight className="pk-row-chevron" aria-hidden="true" />
                </Link>
            </div>

            <p className="pk-section">Подключения</p>
            <div className="pk-list pk-list--icons">
                <div className="pk-row pk-row--static">
                    <span className="pk-row-icon" style={{ background: 'var(--pk-telegram)' }}>
                        <Image src="/brands/telegram.svg" alt="" width={17} height={17} aria-hidden="true" />
                    </span>
                    <span className="pk-row-body"><strong>Telegram</strong></span>
                    {user.telegramId ? (
                        <span className="pk-row-value">Привязан</span>
                    ) : tgState === 'waiting' ? (
                        <span className="pk-row-value">Ожидание…</span>
                    ) : (
                        <button type="button" onClick={bindTelegram} className="pk-row-btn">
                            Привязать
                        </button>
                    )}
                </div>
            </div>
            <p className="pk-note">
                Коды, статусы заказов и вход без пароля приходят в бот Perkly.
            </p>

            <p className="pk-section">Основные</p>
            <div className="pk-list pk-list--icons">
                <div className="pk-row pk-row--static">
                    <span className="pk-row-icon pk-ic-blue"><Languages aria-hidden="true" /></span>
                    <span className="pk-row-body"><strong>Язык</strong></span>
                    <div className="pk-segment" role="group" aria-label="Язык интерфейса" data-no-translate>
                        {(['ru', 'uz'] as const).map((item) => (
                            <button
                                key={item}
                                type="button"
                                aria-pressed={language === item}
                                onClick={() => setLanguage(item)}
                            >
                                {item === 'ru' ? 'Русский' : 'O‘zbekcha'}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="pk-row pk-row--static">
                    <span className="pk-row-icon pk-ic-indigo"><SunMoon aria-hidden="true" /></span>
                    <span className="pk-row-body"><strong>Оформление</strong></span>
                    <div className="pk-segment" role="group" aria-label="Оформление">
                        {(['light', 'dark'] as const).map((item) => (
                            <button
                                key={item}
                                type="button"
                                aria-pressed={theme === item}
                                onClick={() => applyTheme(item)}
                            >
                                {item === 'light' ? 'Светлое' : 'Тёмное'}
                            </button>
                        ))}
                    </div>
                </div>
                <Link href="/notifications" className="pk-row">
                    <span className="pk-row-icon pk-ic-red"><Bell aria-hidden="true" /></span>
                    <span className="pk-row-body"><strong>Уведомления</strong></span>
                    <ChevronRight className="pk-row-chevron" aria-hidden="true" />
                </Link>
            </div>

            <p className="pk-section">Приватность и безопасность</p>
            <div className="pk-list pk-list--icons">
                <Link href="/safety" className="pk-row">
                    <span className="pk-row-icon pk-ic-blue"><ShieldCheck aria-hidden="true" /></span>
                    <span className="pk-row-body"><strong>Безопасная сделка</strong></span>
                    <ChevronRight className="pk-row-chevron" aria-hidden="true" />
                </Link>
                <Link href="/privacy" className="pk-row">
                    <span className="pk-row-icon pk-ic-gray"><Lock aria-hidden="true" /></span>
                    <span className="pk-row-body"><strong>Конфиденциальность</strong></span>
                    <ChevronRight className="pk-row-chevron" aria-hidden="true" />
                </Link>
                <button type="button" onClick={exportData} disabled={exporting} className="pk-row">
                    <span className="pk-row-icon pk-ic-teal">
                        {exporting
                            ? <Loader2 className="animate-spin" aria-hidden="true" />
                            : <Download aria-hidden="true" />}
                    </span>
                    <span className="pk-row-body"><strong>Скачать мои данные</strong></span>
                    <ChevronRight className="pk-row-chevron" aria-hidden="true" />
                </button>
            </div>
            <p className="pk-note">
                Выгрузка в формате JSON: профиль, покупки, промокоды и обращения в поддержку.
            </p>

            <p className="pk-section">Поддержка</p>
            <div className="pk-list pk-list--icons">
                <Link href="/support" className="pk-row">
                    <span className="pk-row-icon pk-ic-green"><LifeBuoy aria-hidden="true" /></span>
                    <span className="pk-row-body"><strong>Помощь</strong></span>
                    <ChevronRight className="pk-row-chevron" aria-hidden="true" />
                </Link>
                <Link href="/terms" className="pk-row">
                    <span className="pk-row-icon pk-ic-gray"><FileText aria-hidden="true" /></span>
                    <span className="pk-row-body"><strong>Правила сервиса</strong></span>
                    <ChevronRight className="pk-row-chevron" aria-hidden="true" />
                </Link>
                <Link href="/about" className="pk-row">
                    <span className="pk-row-icon pk-ic-gray"><Info aria-hidden="true" /></span>
                    <span className="pk-row-body"><strong>О Perkly</strong></span>
                    <ChevronRight className="pk-row-chevron" aria-hidden="true" />
                </Link>
            </div>

            <div className="pk-list" style={{ marginTop: 30 }}>
                <button
                    type="button"
                    onClick={() => { void logout(); router.push('/'); }}
                    className="pk-row pk-row--danger"
                >
                    Выйти из аккаунта
                </button>
            </div>

            <p className="pk-footnote">Perkly · аккаунт {user.id.slice(0, 8)}</p>
        </div>
    );
}
