'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FormEvent, useMemo, useState } from 'react';
import { ArrowRight, BadgePercent } from 'lucide-react';

const services = [
  { label: 'Steam', query: 'Steam', image: '/brands/steam.svg', color: '#171a21' },
  { label: 'Telegram', query: 'Telegram', image: '/brands/telegram.svg', color: '#229ed9' },
  { label: 'PSN', query: 'PlayStation', mark: 'PS', color: '#0866d7' },
  { label: 'MLBB', query: 'Mobile Legends', mark: 'ML', color: '#1c315f' },
  { label: 'Roblox', query: 'Roblox', mark: 'R', color: '#e2231a' },
  { label: 'PUBG', query: 'PUBG', mark: 'P', color: '#f2a900' },
];

const formatUzs = (value: number) => `${value.toLocaleString('ru-RU')} сум`;

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
    if (login.trim().length < 2) {
      setError('Введите логин Steam');
      return;
    }
    if (numericAmount < 10_000 || numericAmount > 5_000_000) {
      setError('Укажите сумму от 10 000 до 5 000 000 сум');
      return;
    }
    window.sessionStorage.setItem('perkly:steam-draft', JSON.stringify({ login: login.trim(), amount: numericAmount, promo: promo.trim() }));
    router.push('/catalog?search=Steam');
  };

  return (
    <section className="mb-14 overflow-hidden rounded-[30px] border border-white/[0.08] bg-[#111115]" aria-labelledby="quick-services-title">
      <div className="grid lg:grid-cols-[1.55fr_.85fr]">
        <form onSubmit={submit} className="p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-white/35">Быстрая покупка</p>
              <h2 id="quick-services-title" className="mt-2 text-2xl font-black tracking-[-.035em] text-white">Пополнить Steam</h2>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-300"><BadgePercent className="h-4 w-4" /> 5%</span>
          </div>

          <button type="button" onClick={() => setPromoOpen((value) => !value)} className="mt-5 border-0 bg-transparent p-0 text-sm font-semibold text-purple-300 hover:text-purple-200">{promoOpen ? 'Скрыть промокод' : 'Ввести промокод'} →</button>
          {promoOpen && <input value={promo} onChange={(event) => setPromo(event.target.value)} placeholder="Промокод" className="mt-3 h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.045] px-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-purple-400/45" />}

          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_.8fr_auto] sm:items-end">
            <label className="block"><span className="mb-2 block text-xs font-semibold text-white/40">Логин Steam</span><input value={login} onChange={(event) => { setLogin(event.target.value); setError(''); }} autoCapitalize="none" autoCorrect="off" placeholder="Ваш логин" className="h-14 w-full rounded-2xl border border-white/[0.08] bg-white/[0.045] px-4 text-base text-white outline-none placeholder:text-white/25 focus:border-purple-400/45" /></label>
            <label className="block"><span className="mb-2 block text-xs font-semibold text-white/40">Сумма</span><div className="relative"><input inputMode="numeric" value={amount} onChange={(event) => { setAmount(event.target.value.replace(/\D/g, '')); setError(''); }} className="h-14 w-full rounded-2xl border border-white/[0.08] bg-white/[0.045] px-4 pr-14 text-base font-bold text-white outline-none focus:border-purple-400/45" /><span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-white/35">UZS</span></div></label>
            <button type="submit" className="inline-flex h-14 min-w-52 items-center justify-center gap-2 rounded-2xl border-0 bg-white px-5 text-sm font-black text-black transition-colors hover:bg-white/90">Продолжить · {formatUzs(total)} <ArrowRight className="h-4 w-4" /></button>
          </div>
          <div className="mt-3 min-h-5 text-xs text-white/30">{error ? <span className="text-orange-300">{error}</span> : 'Итог включает сервисный сбор. Оплата — после выбора предложения.'}</div>
        </form>

        <div className="border-t border-white/[0.07] bg-white/[0.025] p-5 sm:p-7 lg:border-l lg:border-t-0">
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-white/35">Сервисы</p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {services.map((service) => <button key={service.label} type="button" onClick={() => router.push(`/catalog?search=${encodeURIComponent(service.query)}`)} className="group border-0 bg-transparent p-0 text-center">
              <span className="mx-auto flex aspect-square w-full max-w-20 items-center justify-center overflow-hidden rounded-[24%] text-lg font-black text-white" style={{ background: service.color }}>
                {service.image ? <Image src={service.image} width={80} height={80} alt="" className="h-full w-full object-cover" /> : service.mark}
              </span>
              <span className="mt-2 block text-xs font-semibold text-white/55 transition-colors group-hover:text-white">{service.label}</span>
            </button>)}
          </div>
        </div>
      </div>
    </section>
  );
}
