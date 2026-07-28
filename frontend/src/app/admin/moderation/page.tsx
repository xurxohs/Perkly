'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, CheckCircle2, MapPin, RefreshCw, ShieldAlert, XCircle } from 'lucide-react';
import api, { Event, ModerationAppeal, ModerationReport } from '@/lib/api';

type QueueItem =
    | { kind: 'REPORT'; item: ModerationReport }
    | { kind: 'APPEAL'; item: ModerationAppeal };

export default function AdminModerationPage() {
    const [items, setItems] = useState<QueueItem[]>([]);
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [reports, appeals, eventQueue] = await Promise.all([
                api.safety.adminReports(),
                api.safety.adminAppeals(),
                api.admin.getEvents({ status: 'PENDING' }),
            ]);
            setEvents(eventQueue.events);
            setItems([
                ...reports.map((item) => ({ kind: 'REPORT' as const, item })),
                ...appeals.map((item) => ({ kind: 'APPEAL' as const, item })),
            ].sort((a, b) => new Date(b.item.createdAt).getTime() - new Date(a.item.createdAt).getTime()));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Не удалось загрузить очередь');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const resolve = async (entry: QueueItem, status: 'RESOLVED' | 'REJECTED', action: 'NONE' | 'HIDE_CONTENT' | 'RESTORE_ACCOUNT' | 'RESTORE_CONTENT' = 'NONE') => {
        const resolution = window.prompt(
            status === 'RESOLVED' ? 'Опишите принятое решение' : 'Укажите причину отклонения',
            '',
        );
        if (resolution === null || resolution.trim().length < 3) return;
        setUpdatingId(entry.item.id);
        setError(null);
        try {
            if (entry.kind === 'REPORT') {
                await api.safety.resolveReport(entry.item.id, status, resolution.trim(), action as 'NONE' | 'HIDE_CONTENT');
            } else {
                await api.safety.resolveAppeal(entry.item.id, status, resolution.trim(), action as 'NONE' | 'RESTORE_ACCOUNT' | 'RESTORE_CONTENT');
            }
            await load();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Не удалось сохранить решение');
        } finally {
            setUpdatingId(null);
        }
    };

    const moderateEvent = async (event: Event, status: 'APPROVED' | 'REJECTED') => {
        let note = '';
        if (status === 'REJECTED') {
            const answer = window.prompt('Что автору нужно исправить?', '');
            if (answer === null || answer.trim().length < 3) return;
            note = answer.trim();
        }
        setUpdatingId(event.id);
        setError(null);
        try {
            await api.admin.moderateEvent(event.id, status, note);
            await load();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Не удалось сохранить решение');
        } finally {
            setUpdatingId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Модерация и апелляции</h1>
                    <p className="text-white/40">Жалобы пользователей и пересмотр решений платформы</p>
                </div>
                <button onClick={() => void load()} className="p-3 rounded-xl bg-white/5 border border-white/10 text-white/60">
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {error && <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300">{error}</div>}

            <section className="space-y-3">
                <div className="flex items-end justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-semibold text-white">События на публикацию</h2>
                        <p className="mt-1 text-sm text-white/40">Проверьте обложку, описание, дату и место</p>
                    </div>
                    <span className="rounded-full bg-white/5 px-3 py-1 text-sm text-white/50">{events.length}</span>
                </div>
                {!loading && events.length === 0 && (
                    <div className="rounded-3xl bg-white/[0.03] py-10 text-center text-white/35">Новых событий на проверке нет</div>
                )}
                {events.map((event) => {
                    const busy = updatingId === event.id;
                    return (
                        <article key={event.id} className="overflow-hidden rounded-3xl bg-white/[0.04]">
                            <div className="grid gap-0 md:grid-cols-[240px_1fr]">
                                <div className="min-h-48 bg-white/[0.04] bg-cover bg-center" style={{ backgroundImage: `url(${event.imageUrl})` }} />
                                <div className="flex min-w-0 flex-col p-5">
                                    <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-white/40">
                                        <span className="rounded-full bg-amber-400/10 px-2.5 py-1 font-semibold text-amber-200">ОЖИДАЕТ</span>
                                        <span>{event.category}</span>
                                        <span>·</span>
                                        <span>{new Date(event.createdAt).toLocaleString('ru-RU')}</span>
                                    </div>
                                    <h3 className="text-xl font-semibold text-white">{event.title}</h3>
                                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-white/55">{event.description}</p>
                                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/45">
                                        <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4" />{new Date(event.date).toLocaleString('ru-RU')}</span>
                                        <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" />{event.location}</span>
                                    </div>
                                    <div className="mt-5 flex flex-wrap gap-2 md:mt-auto md:justify-end">
                                        <button disabled={busy} onClick={() => void moderateEvent(event, 'REJECTED')} className="rounded-full bg-white/[0.06] px-5 py-2.5 text-sm font-semibold text-white/70 disabled:opacity-40">Вернуть на исправление</button>
                                        <button disabled={busy} onClick={() => void moderateEvent(event, 'APPROVED')} className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black disabled:opacity-40">Опубликовать</button>
                                    </div>
                                </div>
                            </div>
                        </article>
                    );
                })}
            </section>

            <div className="space-y-3">
                {!loading && items.length === 0 && (
                    <div className="py-16 text-center text-white/40">Очередь модерации пуста</div>
                )}
                {items.map((entry) => {
                    const isReport = entry.kind === 'REPORT';
                    const report = isReport ? entry.item as ModerationReport : null;
                    const appeal = !isReport ? entry.item as ModerationAppeal : null;
                    const user = report?.reporter ?? appeal?.user;
                    const busy = updatingId === entry.item.id;
                    return (
                        <article key={`${entry.kind}-${entry.item.id}`} className="p-5 rounded-3xl bg-white/[0.03] border border-white/[0.07]">
                            <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                                <div className="w-11 h-11 rounded-2xl bg-orange-500/10 text-orange-400 flex items-center justify-center shrink-0">
                                    <ShieldAlert className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <span className="text-xs font-bold text-orange-300">{isReport ? 'ЖАЛОБА' : 'АПЕЛЛЯЦИЯ'}</span>
                                        <span className="text-xs px-2 py-1 rounded-lg bg-white/5 text-white/50">{entry.item.status}</span>
                                        {report && <span className={`text-xs px-2 py-1 rounded-lg ${report.priority === 2 ? 'bg-red-500/15 text-red-300' : 'bg-white/5 text-white/40'}`}>Приоритет {report.priority ?? 1}</span>}
                                        <span className="text-xs text-white/30">{new Date(entry.item.createdAt).toLocaleString('ru-RU')}</span>
                                    </div>
                                    <h2 className="text-white font-bold mb-2">
                                        {report ? `${report.targetType}: ${report.category}` : `${appeal?.subjectType} ${appeal?.subjectId ?? ''}`}
                                    </h2>
                                    <p className="text-sm text-white/60 whitespace-pre-wrap">{report?.description ?? appeal?.reason}</p>
                                    {report?.targetSnapshot && <pre className="mt-3 max-h-32 overflow-auto rounded-xl bg-black/20 p-3 text-xs text-white/40">{JSON.stringify(report.targetSnapshot, null, 2)}</pre>}
                                    <p className="text-xs text-white/30 mt-3">{user?.displayName || user?.email || 'Пользователь не найден'}</p>
                                    {entry.item.resolution && <p className="text-sm text-emerald-300 mt-3">Решение: {entry.item.resolution}</p>}
                                </div>
                                {['OPEN', 'REVIEWING'].includes(entry.item.status) && (
                                    <div className="flex gap-2 shrink-0">
                                        <button disabled={busy} onClick={() => void resolve(entry, 'RESOLVED')} className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 disabled:opacity-40">
                                            <CheckCircle2 className="w-5 h-5" />
                                        </button>
                                        {report && ['OFFER', 'EVENT', 'MESSAGE'].includes(report.targetType) && <button disabled={busy} onClick={() => void resolve(entry, 'RESOLVED', 'HIDE_CONTENT')} className="rounded-xl bg-orange-500/10 px-3 text-xs font-semibold text-orange-300 disabled:opacity-40">Скрыть</button>}
                                        {appeal?.subjectType === 'ACCOUNT' && <button disabled={busy} onClick={() => void resolve(entry, 'RESOLVED', 'RESTORE_ACCOUNT')} className="rounded-xl bg-blue-500/10 px-3 text-xs font-semibold text-blue-300 disabled:opacity-40">Восстановить аккаунт</button>}
                                        {appeal?.subjectType === 'CONTENT' && <button disabled={busy} onClick={() => void resolve(entry, 'RESOLVED', 'RESTORE_CONTENT')} className="rounded-xl bg-blue-500/10 px-3 text-xs font-semibold text-blue-300 disabled:opacity-40">Вернуть товар</button>}
                                        <button disabled={busy} onClick={() => void resolve(entry, 'REJECTED')} className="p-3 rounded-xl bg-red-500/10 text-red-400 disabled:opacity-40">
                                            <XCircle className="w-5 h-5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </article>
                    );
                })}
            </div>
        </div>
    );
}
