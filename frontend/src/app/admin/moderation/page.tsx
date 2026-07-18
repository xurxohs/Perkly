'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw, ShieldAlert, XCircle } from 'lucide-react';
import api, { ModerationAppeal, ModerationReport } from '@/lib/api';

type QueueItem =
    | { kind: 'REPORT'; item: ModerationReport }
    | { kind: 'APPEAL'; item: ModerationAppeal };

export default function AdminModerationPage() {
    const [items, setItems] = useState<QueueItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [reports, appeals] = await Promise.all([
                api.safety.adminReports(),
                api.safety.adminAppeals(),
            ]);
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

    const resolve = async (entry: QueueItem, status: 'RESOLVED' | 'REJECTED', action: 'NONE' | 'HIDE_CONTENT' = 'NONE') => {
        const resolution = window.prompt(
            status === 'RESOLVED' ? 'Опишите принятое решение' : 'Укажите причину отклонения',
            '',
        );
        if (resolution === null || resolution.trim().length < 3) return;
        setUpdatingId(entry.item.id);
        setError(null);
        try {
            if (entry.kind === 'REPORT') {
                await api.safety.resolveReport(entry.item.id, status, resolution.trim(), action);
            } else {
                await api.safety.resolveAppeal(entry.item.id, status, resolution.trim());
            }
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
