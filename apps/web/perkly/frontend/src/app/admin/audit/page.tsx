'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, ScrollText } from 'lucide-react';
import api, { AdminLog } from '@/lib/api';

export default function AdminAuditPage() {
    const [logs, setLogs] = useState<AdminLog[]>([]);
    const [action, setAction] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await api.admin.getLogs(action);
            setLogs(result.logs);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Не удалось загрузить журнал');
        } finally {
            setLoading(false);
        }
    }, [action]);

    useEffect(() => {
        const timer = window.setTimeout(() => { void load(); }, 250);
        return () => window.clearTimeout(timer);
    }, [load]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Журнал действий</h1>
                    <p className="text-white/40">Неизменяемая история критичных операций администраторов</p>
                </div>
                <div className="flex gap-2">
                    <input value={action} onChange={(event) => setAction(event.target.value)} placeholder="Фильтр по действию" className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none" />
                    <button onClick={() => void load()} className="p-3 rounded-xl bg-white/5 border border-white/10 text-white/60">
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>
            {error && <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300">{error}</div>}
            <div className="space-y-2">
                {logs.map((log) => (
                    <article key={log.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] flex gap-4">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                            <ScrollText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap gap-2 items-center">
                                <span className="font-bold text-white">{log.action}</span>
                                <span className="text-xs text-white/30">{new Date(log.createdAt).toLocaleString('ru-RU')}</span>
                            </div>
                            <p className="text-xs text-white/40 mt-1">{log.admin?.displayName || log.admin?.email || log.adminId} · {log.targetId || 'без target'}</p>
                            {log.details && <pre className="text-xs text-white/50 whitespace-pre-wrap break-words mt-2">{log.details}</pre>}
                        </div>
                    </article>
                ))}
                {!loading && logs.length === 0 && <div className="py-16 text-center text-white/40">Записей нет</div>}
            </div>
        </div>
    );
}
