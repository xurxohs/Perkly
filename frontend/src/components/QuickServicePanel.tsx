'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FormEvent, useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';

const services = [
  { label: 'Steam', query: 'Steam', image: '/brands/steam.svg', color: '#132b50' },
  { label: 'PSN', query: 'PlayStation', mark: 'PS', color: 'transparent', text: '#1768bd' },
  { label: 'Roblox', query: 'Roblox', mark: '◆', color: '#3853ac' },
  { label: 'MLBB', query: 'Mobile Legends', mark: '★', color: 'transparent', text: '#b66d35' },
  { label: 'Telegram', query: 'Telegram', mark: '◆', color: 'transparent', text: '#2f8fbd' },
  { label: 'PUBG', query: 'PUBG', mark: 'UC', color: 'transparent', text: '#a17b35' },
];

export function QuickServicePanel() {
  const router = useRouter();
  const [login, setLogin] = useState('123456');
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
    <section className="mb-14 grid gap-3 lg:grid-cols-[185px_minmax(0,1fr)]" aria-label="Быстрое пополнение">
      <div className="relative grid min-h-[215px] grid-cols-3 grid-rows-2 rounded-[28px] bg-[#292936] p-2">
        <span className="absolute left-[58px] top-0 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#14a75b] px-3 py-1 text-xs font-black text-white">Новое</span>
        {services.map((service, index) => <button key={service.label} type="button" aria-label={service.label} onClick={() => router.push(`/catalog?search=${encodeURIComponent(service.query)}`)} className={`flex min-w-0 items-center justify-center rounded-[22px] border-0 bg-transparent p-1 ${index === 0 ? 'bg-[#484855]' : ''}`}>
          <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-[28%] text-sm font-black" style={{ background: service.color, color: service.text || '#fff' }}>{service.image ? <Image src={service.image} width={44} height={44} alt="" className="h-full w-full object-cover" /> : service.mark}</span>
        </button>)}
      </div>

      <form onSubmit={submit} className="rounded-[28px] bg-[#292936] p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-3"><h2 className="text-2xl font-black tracking-[-.03em] text-white sm:text-3xl">Пополнить Steam</h2><span className="rounded-full bg-gradient-to-r from-[#236bff] to-[#21c7ec] px-3 py-1 text-base font-black text-white">5%</span></div>
        <button type="button" onClick={() => setPromoOpen((value) => !value)} className="mt-2 inline-flex items-center border-0 bg-transparent p-0 text-base font-semibold text-[#5790ff] hover:text-[#7aa8ff]">{promoOpen ? 'Скрыть промокод' : 'Ввести промокод'} <ChevronRight className={`ml-1 h-5 w-5 transition-transform ${promoOpen ? 'rotate-90' : ''}`} /></button>

        <div className="mt-5 grid gap-3 md:grid-cols-[1.05fr_1.05fr_1fr]">
          <label className="flex min-h-[88px] flex-col justify-center rounded-[22px] bg-[#15161a] px-5"><span className="text-sm text-white/55">Логин Steam</span><input value={login} onChange={(event) => { setLogin(event.target.value); setError(''); }} autoCapitalize="none" autoCorrect="off" className="mt-1 w-full border-0 bg-transparent p-0 text-xl text-white outline-none" />{promoOpen && <input value={promo} onChange={(event) => setPromo(event.target.value)} placeholder="Промокод" className="mt-2 w-full border-0 border-t border-white/10 bg-transparent pt-2 text-xs text-white outline-none placeholder:text-white/25" />}</label>
          <label className="flex min-h-[88px] flex-col justify-center rounded-[22px] bg-[#15161a] px-5"><span className="text-sm text-white/55">Сумма</span><div className="mt-1 flex items-center gap-3"><input inputMode="numeric" value={amount} onChange={(event) => { setAmount(event.target.value.replace(/\D/g, '')); setError(''); }} className="min-w-0 flex-1 border-0 bg-transparent p-0 text-xl text-white outline-none" /><span className="rounded-full bg-[#2469f4] px-3 py-2 text-xs font-black text-white">UZS</span></div></label>
          <button type="submit" className="min-h-[88px] rounded-[22px] border-0 bg-gradient-to-r from-[#3265f3] to-[#3ac6ed] px-5 text-lg font-black text-white shadow-[inset_0_-4px_0_rgba(0,67,210,.38)] transition-[filter] hover:brightness-110">Оплатить {total.toLocaleString('ru-RU')} сум</button>
        </div>
        {error && <p className="mt-2 text-xs font-semibold text-orange-300">{error}</p>}
      </form>
    </section>
  );
}
