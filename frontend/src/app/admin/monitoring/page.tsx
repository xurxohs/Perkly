'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import api, { DiagnosticIssue } from '@/lib/api';

export default function AdminMonitoringPage() {
    const [issues, setIssues] = useState<DiagnosticIssue[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await api.admin.getDiagnostics();
            setIssues(result.issues);
            setTotal(result.totalOccurrences);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Не удалось загрузить диагностику');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Мониторинг приложений</h1>
                    <p className="text-white/40">Ошибки и зависания iOS — всего повторов: {total}</p>
                </div>
                <button onClick={() => void load()} className="p-3 rounded-xl bg-white/5 border border-white/10 text-white/60">
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>
            {error && <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300">{error}</div>}
            <div className="grid gap-3">
                {!loading && issues.length === 0 && <div className="py-16 text-center text-white/40">Зафиксированных сбоев нет</div>}
                {issues.map((issue) => (
                    <article key={issue.id} className="p-5 rounded-3xl bg-white/[0.03] border border-white/[0.07]">
                        <div className="flex gap-4">
                            <div className="w-11 h-11 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center shrink-0">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <span className="font-bold text-white">{issue.kind}</span>
                                    <span className="text-xs px-2 py-1 rounded-lg bg-red-500/10 text-red-300">×{issue.occurrences}</span>
                                    <span className="text-xs text-white/30">{new Date(issue.lastSeenAt).toLocaleString('ru-RU')}</span>
                                </div>
                                <pre className="text-xs text-white/60 whitespace-pre-wrap break-words font-mono">{issue.message}</pre>
                                <div className="text-xs text-white/30 mt-3">{issue.appVersion || '—'} · {issue.osVersion || '—'} · {issue.deviceModel || '—'}</div>
                            </div>
                        </div>
                    </article>
                ))}
            </div>
        </div>
    );
}
