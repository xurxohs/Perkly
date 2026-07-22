'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FormEvent, useMemo, useState } from 'react';
import { ArrowRight, Info } from 'lucide-react';

const services = [
  { label: 'Steam', query: 'Steam', image: '/brands/steam.svg', color: '#171a21' },
  { label: 'Telegram', query: 'Telegram', image: '/brands/telegram.svg', color: '#229ed9' },
  { label: 'PSN', query: 'PlayStation', mark: 'PS', color: '#0866d7' },
  { label: 'MLBB', query: 'Mobile Legends', mark: 'ML', color: '#263e73' },
  { label: 'Roblox', query: 'Roblox', mark: 'R', color: '#e2231a' },
  { label: 'PUBG', query: 'PUBG', mark: 'P', color: '#e6a000' },
];

const formatUzs = (value: number) => value.toLocaleString('ru-RU');

export function QuickServicePanel() {
  const router = useRouter();
  const [login, setLogin] = useState('');
  const [amount, setAmount] = useState('100000');
  const [promoOpen, setPromoOpen] = useState(false);
  const [promo, setPromo] = useState('');
  const [error, setError] = useState('');
  const numericAmount = Math.max(0, Number(amount.replace(/\D/g, '')) || 0);
  const total = useMemo(() => Math.round(numericAmount * 1.05), [numericAmount]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (login.trim().length < 2) return setError('Введите логин Steam');
    if (numericAmount < 10_000 || numericAmount > 5_000_000) return setError('Сумма: от 10 000 до 5 000 000 сум');
    window.sessionStorage.setItem('perkly:steam-draft', JSON.stringify({ login: login.trim(), amount: numericAmount, promo: promo.trim() }));
    router.push('/catalog?search=Steam');
  };

  return (
    <section className="mb-14 grid overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#1d1d27] shadow-[0_22px_70px_rgba(0,0,0,.22)] lg:grid-cols-[1fr_300px]" aria-label="Быстрые сервисы">
      <form onSubmit={submit} className="grid min-w-0 gap-3 p-4 sm:grid-cols-[210px_1fr_210px_220px] sm:items-stretch sm:p-5">
        <div className="flex min-h-24 flex-col justify-center rounded-[20px] bg-white/[0.045] px-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-[#171a21]"><Image src="/brands/steam.svg" width={40} height={40} alt="" className="h-full w-full object-cover" /></span>
            <div><h2 className="text-base font-black text-white">Пополнить Steam</h2><span className="mt-0.5 inline-flex rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-black text-white">5%</span></div>
          </div>
          <button type="button" onClick={() => setPromoOpen((value) => !value)} className="mt-3 w-fit border-0 bg-transparent p-0 text-xs font-bold text-blue-300 hover:text-blue-200">{promoOpen ? 'Скрыть промокод' : 'Ввести промокод'} →</button>
        </div>

        <label className="flex min-h-24 flex-col justify-center rounded-[20px] bg-[#141419] px-5 text-left"><span className="mb-2 flex items-center justify-between text-xs font-semibold text-white/40">Логин Steam <Info className="h-3.5 w-3.5" /></span><input value={login} onChange={(event) => { setLogin(event.target.value); setError(''); }} autoCapitalize="none" autoCorrect="off" placeholder="Введите логин" className="w-full border-0 bg-transparent p-0 text-base font-bold text-white outline-none placeholder:text-white/20" />{promoOpen && <input value={promo} onChange={(event) => setPromo(event.target.value)} placeholder="Промокод" className="mt-2 w-full border-0 border-t border-white/10 bg-transparent pt-2 text-xs text-white outline-none placeholder:text-white/25" />}</label>

        <label className="flex min-h-24 flex-col justify-center rounded-[20px] bg-[#141419] px-5 text-left"><span className="mb-2 text-xs font-semibold text-white/40">Сумма</span><div className="flex items-end justify-between gap-2"><input inputMode="numeric" value={amount} onChange={(event) => { setAmount(event.target.value.replace(/\D/g, '')); setError(''); }} className="min-w-0 flex-1 border-0 bg-transparent p-0 text-lg font-black text-white outline-none" /><span className="pb-0.5 text-xs font-black text-white/35">UZS</span></div></label>

        <button type="submit" className="relative flex min-h-24 flex-col items-start justify-center overflow-hidden rounded-[20px] border-0 bg-gradient-to-r from-[#5328ff] to-[#008de9] px-5 text-left text-white transition-[filter] hover:brightness-110"><span className="text-xs font-semibold text-white/65">К оплате</span><span className="mt-1 whitespace-nowrap text-lg font-black">{formatUzs(total)} сум</span><ArrowRight className="absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2" /></button>
        {error && <p className="text-xs font-semibold text-orange-300 sm:col-span-4">{error}</p>}
      </form>

      <div className="grid grid-cols-6 gap-2 border-t border-white/[0.07] bg-[#242430] p-4 lg:grid-cols-3 lg:border-l lg:border-t-0 lg:p-5">
        {services.map((service, index) => <button key={service.label} type="button" onClick={() => router.push(`/catalog?search=${encodeURIComponent(service.query)}`)} aria-label={service.label} className={`group flex min-w-0 flex-col items-center justify-center rounded-[18px] border p-2 transition-colors ${index === 0 ? 'border-blue-400/50 bg-blue-500/10' : 'border-transparent bg-white/[0.035] hover:bg-white/[0.07]'}`}>
          <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-[25%] text-xs font-black text-white" style={{ background: service.color }}>{service.image ? <Image src={service.image} width={40} height={40} alt="" className="h-full w-full object-cover" /> : service.mark}</span>
          <span className="mt-1.5 truncate text-[10px] font-bold text-white/55 group-hover:text-white">{service.label}</span>
        </button>)}
      </div>
    </section>
  );
}
