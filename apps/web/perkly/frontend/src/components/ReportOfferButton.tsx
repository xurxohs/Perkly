'use client';

import { useState } from 'react';
import { Flag, X } from 'lucide-react';
import api from '@/lib/api';

const reasons = [
  ['FRAUD', 'Мошенничество'],
  ['MISLEADING', 'Неверное описание'],
  ['INAPPROPRIATE', 'Запрещённый контент'],
  ['SPAM', 'Спам'],
  ['OTHER', 'Другое'],
] as const;

export function ReportOfferButton({ offerId }: { offerId: string }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<(typeof reasons)[number][0]>('MISLEADING');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit() {
    if (description.trim().length < 10) { setMessage('Опишите проблему минимум в 10 символах.'); return; }
    setBusy(true); setMessage(null);
    try {
      await api.safety.createReport({ targetType: 'OFFER', targetId: offerId, category, description: description.trim() });
      setMessage('Жалоба отправлена. Мы проверим товар и сообщим о решении.');
      setDescription('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Не удалось отправить жалобу');
    } finally { setBusy(false); }
  }

  return <>
    <button type="button" onClick={() => setOpen(true)} className="mt-5 inline-flex items-center gap-2 border-0 bg-transparent p-0 text-sm text-white/35 transition hover:text-white/65">
      <Flag className="h-4 w-4" /> Пожаловаться на товар
    </button>
    {open && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center" onMouseDown={(event) => { if (event.currentTarget === event.target) setOpen(false); }}>
      <div className="w-full max-w-md rounded-[28px] bg-[#1c1c1e] p-5 shadow-2xl">
        <div className="mb-5 flex items-center justify-between"><div><h2 className="text-xl font-bold text-white">Сообщить о нарушении</h2><p className="mt-1 text-sm text-white/45">Жалоба конфиденциальна для продавца.</p></div><button type="button" aria-label="Закрыть" onClick={() => setOpen(false)} className="rounded-full border-0 bg-white/5 p-2 text-white/60"><X className="h-5 w-5" /></button></div>
        <div className="grid grid-cols-2 gap-2">{reasons.map(([value, label]) => <button key={value} type="button" onClick={() => setCategory(value)} className={`rounded-2xl border px-3 py-3 text-left text-sm ${category === value ? 'border-purple-400/50 bg-purple-500/15 text-white' : 'border-white/10 bg-white/[.03] text-white/55'}`}>{label}</button>)}</div>
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} rows={4} placeholder="Что именно произошло? Не указывайте пароль или данные карты." className="mt-3 w-full resize-none rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-purple-400/50" />
        {message && <p className="mt-2 text-sm text-white/60">{message}</p>}
        <button type="button" disabled={busy} onClick={() => void submit()} className="mt-4 w-full rounded-2xl border-0 bg-white py-3.5 font-semibold text-black disabled:opacity-40">{busy ? 'Отправляем…' : 'Отправить жалобу'}</button>
      </div>
    </div>}
  </>;
}
