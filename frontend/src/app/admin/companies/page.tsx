'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Ban, Building2, CheckCircle2, Clock3, RefreshCw } from 'lucide-react';
import api, { Company, CompanyStatus } from '@/lib/api';

const STATUS_META: Record<CompanyStatus, { label: string; className: string; icon: typeof Clock3 }> = {
    PENDING_MODERATION: {
        label: 'На модерации',
        className: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        icon: Clock3,
    },
    ACTIVE: {
        label: 'Активна',
        className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        icon: CheckCircle2,
    },
    SUSPENDED: {
        label: 'Остановлена',
        className: 'bg-red-500/10 text-red-400 border-red-500/20',
        icon: AlertTriangle,
    },
};

const FILTERS: Array<{ label: string; value: CompanyStatus | 'ALL' }> = [
    { label: 'Все', value: 'ALL' },
    { label: 'На модерации', value: 'PENDING_MODERATION' },
    { label: 'Активные', value: 'ACTIVE' },
    { label: 'Остановленные', value: 'SUSPENDED' },
];

export default function AdminCompaniesPage() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [status, setStatus] = useState<CompanyStatus | 'ALL'>('PENDING_MODERATION');
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchCompanies = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.companies.list(status === 'ALL' ? undefined : status);
            setCompanies(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Не удалось загрузить компании');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCompanies();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status]);

    const updateStatus = async (companyId: string, nextStatus: CompanyStatus) => {
        setUpdatingId(companyId);
        setError(null);
        try {
            await api.companies.updateStatus(companyId, nextStatus);
            await fetchCompanies();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Не удалось обновить статус');
        } finally {
            setUpdatingId(null);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in fade-in-up">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Компании</h1>
                    <p className="text-white/40">Модерация B2B заявок и доступов продавцов</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {FILTERS.map((filter) => (
                        <button
                            key={filter.value}
                            onClick={() => setStatus(filter.value)}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold border cursor-pointer transition-colors ${status === filter.value
                                ? 'bg-red-500/15 text-red-300 border-red-500/30'
                                : 'bg-white/5 text-white/50 border-white/10 hover:text-white'
                                }`}
                        >
                            {filter.label}
                        </button>
                    ))}
                    <button onClick={fetchCompanies} title="Обновить список" className="p-2 rounded-xl bg-white/5 text-white/60 hover:text-white cursor-pointer border border-white/10">
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {error && (
                <div className="rounded-2xl p-4 bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                    {error}
                </div>
            )}

            <div className="bg-[#101524]/60 backdrop-blur-xl rounded-3xl border border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/5">
                                <th className="py-4 px-6 text-xs font-semibold text-white/40 uppercase tracking-wider">Компания</th>
                                <th className="py-4 px-6 text-xs font-semibold text-white/40 uppercase tracking-wider">Владелец</th>
                                <th className="py-4 px-6 text-xs font-semibold text-white/40 uppercase tracking-wider">ИНН</th>
                                <th className="py-4 px-6 text-xs font-semibold text-white/40 uppercase tracking-wider">Статус</th>
                                <th className="py-4 px-6 text-xs font-semibold text-white/40 uppercase tracking-wider">Активность</th>
                                <th className="py-4 px-6 text-right text-xs font-semibold text-white/40 uppercase tracking-wider">Действия</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading && companies.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-10 text-center text-white/40">
                                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" /> Загрузка...
                                    </td>
                                </tr>
                            ) : companies.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-10 text-center text-white/40">Компании не найдены</td>
                                </tr>
                            ) : companies.map((company) => {
                                const meta = STATUS_META[company.status];
                                const Icon = meta.icon;
                                const isUpdating = updatingId === company.id;

                                return (
                                    <tr key={company.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center shrink-0">
                                                    <Building2 className="w-5 h-5 text-emerald-400" />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-white text-sm">{company.brandName}</div>
                                                    <div className="text-xs text-white/30">{company.legalName}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="text-sm text-white">{company.owner?.displayName || company.owner?.email || 'Неизвестно'}</div>
                                            <div className="text-xs text-white/30">{company.owner?.role || 'USER'}</div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="font-mono text-sm text-white/70">{company.inn}</div>
                                            {company.phone && <div className="text-xs text-white/30">{company.phone}</div>}
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${meta.className}`}>
                                                <Icon className="w-3.5 h-3.5" />
                                                {meta.label}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="text-sm text-white/70">{company._count?.offers ?? 0} офферов</div>
                                            <div className="text-xs text-white/30">{company._count?.promocodes ?? 0} промокодов</div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center justify-end gap-2">
                                                {company.status !== 'ACTIVE' && (
                                                    <button
                                                        onClick={() => updateStatus(company.id, 'ACTIVE')}
                                                        disabled={isUpdating}
                                                        className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 transition-all border-0 cursor-pointer"
                                                        title="Одобрить"
                                                    >
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {company.status !== 'PENDING_MODERATION' && (
                                                    <button
                                                        onClick={() => updateStatus(company.id, 'PENDING_MODERATION')}
                                                        disabled={isUpdating}
                                                        className="p-2 rounded-xl bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 disabled:opacity-50 transition-all border-0 cursor-pointer"
                                                        title="Вернуть на модерацию"
                                                    >
                                                        <Clock3 className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {company.status !== 'SUSPENDED' && (
                                                    <button
                                                        onClick={() => updateStatus(company.id, 'SUSPENDED')}
                                                        disabled={isUpdating}
                                                        className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-all border-0 cursor-pointer"
                                                        title="Остановить"
                                                    >
                                                        <Ban className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
