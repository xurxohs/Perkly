'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FormEvent, useMemo, useState } from 'react';
import { ChevronRight, Info } from 'lucide-react';

const services = [
  { id: 'steam', label: 'Steam', query: 'Steam', image: '/brands/steam.svg', inputLabel: 'Логин Steam', defaultLogin: '123456', defaultAmount: '100000' },
  { id: 'psn', label: 'PlayStation', query: 'PlayStation', image: '/brands/playstation.svg', inputLabel: 'Email / Тег PSN', defaultLogin: '', defaultAmount: '150000' },
  { id: 'roblox', label: 'Roblox', query: 'Roblox', image: '/brands/roblox.svg', inputLabel: 'Логин Roblox', defaultLogin: '', defaultAmount: '50000' },
  { id: 'telegram', label: 'Telegram Stars', query: 'Telegram', image: '/brands/star.svg', inputLabel: '@Username Telegram', defaultLogin: '', defaultAmount: '30000' },
  { id: 'mlbb', label: 'Mobile Legends', query: 'Mobile Legends', image: '/brands/diamond.svg', inputLabel: 'User ID (Zone ID)', defaultLogin: '', defaultAmount: '40000' },
  { id: 'pubg', label: 'PUBG Mobile', query: 'PUBG', image: '/brands/uc.svg', inputLabel: 'Character ID', defaultLogin: '', defaultAmount: '60000' },
];

export function QuickServicePanel() {
  const router = useRouter();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const currentService = services[selectedIndex];

  const [login, setLogin] = useState('123456');
  const [amount, setAmount] = useState('100000');
  const [promoOpen, setPromoOpen] = useState(false);
  const [promo, setPromo] = useState('');
  const [error, setError] = useState('');

  const numericAmount = Math.max(0, Number(amount.replace(/\D/g, '')) || 0);
  const total = useMemo(() => Math.round(numericAmount * 1.05), [numericAmount]);

  const handleSelectService = (index: number) => {
    setSelectedIndex(index);
    const selected = services[index];
    if (selected.defaultLogin && !login) {
      setLogin(selected.defaultLogin);
    }
    setError('');
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (login.trim().length < 2) return setError(`Введите ${currentService.inputLabel}`);
    if (numericAmount < 10_000 || numericAmount > 5_000_000) return setError('Сумма: от 10 000 до 5 000 000 сум');
    window.sessionStorage.setItem('perkly:steam-draft', JSON.stringify({ service: currentService.id, login: login.trim(), amount: numericAmount, promo: promo.trim() }));
    router.push(`/catalog?search=${encodeURIComponent(currentService.query)}`);
  };

  return (
    <section className="mb-14" aria-label="Быстрое пополнение">
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
        {/* Left selector card */}
        <div className="relative flex h-[72px] shrink-0 items-center rounded-2xl bg-[#252734] p-1.5 border border-white/5 sm:w-[136px]">
          <span className="absolute -top-2.5 left-3 z-10 rounded-full bg-[#10b981] px-2 py-0.5 text-[9px] font-black text-white shadow-sm">
            Новое
          </span>
          <div className="grid h-full w-full grid-cols-3 grid-rows-2 gap-1">
            {services.map((service, index) => {
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={service.id}
                  type="button"
                  aria-label={service.label}
                  onClick={() => handleSelectService(index)}
                  className={`flex items-center justify-center rounded-lg border-0 transition-all ${
                    isSelected ? 'bg-[#373b4d] shadow-sm' : 'bg-transparent hover:bg-white/5 opacity-70 hover:opacity-100'
                  }`}
                >
                  <span className="relative flex h-6 w-6 items-center justify-center overflow-hidden">
                    <Image
                      src={service.image}
                      width={22}
                      height={22}
                      alt={service.label}
                      className="h-full w-full object-contain"
                    />
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right form card */}
        <form
          onSubmit={submit}
          className="flex flex-1 flex-col gap-3 rounded-2xl bg-[#252734] p-3 border border-white/5 sm:p-3.5 lg:flex-row lg:items-center justify-between"
        >
          {/* Title & promo section */}
          <div className="flex shrink-0 flex-col justify-center min-w-[170px] lg:pl-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black tracking-tight text-white sm:text-lg">
                Пополнить {currentService.label}
              </h2>
              <span className="rounded-full bg-gradient-to-r from-[#207bfe] to-[#12bcfb] px-2 py-0.5 text-[11px] font-black text-white">
                5%
              </span>
            </div>
            <button
              type="button"
              onClick={() => setPromoOpen((v) => !v)}
              className="mt-0.5 flex items-center text-xs font-semibold text-[#4887ff] hover:text-[#6fa1ff] transition-colors"
            >
              {promoOpen ? 'Скрыть промокод' : 'Ввести промокод'}
              <ChevronRight className={`ml-0.5 h-3.5 w-3.5 transition-transform ${promoOpen ? 'rotate-90' : ''}`} />
            </button>
          </div>

          {/* Form fields row */}
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            {/* Login Input */}
            <label className="flex min-h-[50px] flex-1 flex-col justify-center rounded-xl bg-[#161720] px-3.5 py-1.5 border border-white/5 focus-within:border-blue-500/40 transition-colors">
              <div className="flex items-center justify-between text-[11px] font-medium text-white/40">
                <span>{currentService.inputLabel}</span>
                <Info className="h-3 w-3 text-white/30" />
              </div>
              <input
                value={login}
                onChange={(e) => { setLogin(e.target.value); setError(''); }}
                autoCapitalize="none"
                autoCorrect="off"
                placeholder={currentService.defaultLogin || 'Введите данные'}
                className="mt-0.5 w-full border-0 bg-transparent p-0 text-sm font-semibold text-white outline-none placeholder:text-white/20"
              />
              {promoOpen && (
                <input
                  value={promo}
                  onChange={(e) => setPromo(e.target.value)}
                  placeholder="Промокод"
                  className="mt-1.5 w-full border-0 border-t border-white/10 bg-transparent pt-1 text-xs text-white outline-none placeholder:text-white/30"
                />
              )}
            </label>

            {/* Amount Input */}
            <label className="flex min-h-[50px] flex-1 flex-col justify-center rounded-xl bg-[#161720] px-3.5 py-1.5 border border-white/5 focus-within:border-blue-500/40 transition-colors">
              <span className="text-[11px] font-medium text-white/40">Сумма</span>
              <div className="mt-0.5 flex items-center justify-between gap-2">
                <input
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value.replace(/\D/g, '')); setError(''); }}
                  className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-bold text-white outline-none"
                />
                <span className="rounded-md bg-[#1c50e3] px-2 py-0.5 text-[10px] font-black tracking-wider text-white uppercase">
                  UZS
                </span>
              </div>
            </label>
          </div>

          {/* Pay Button */}
          <button
            type="submit"
            className="flex h-[50px] shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-[#1c55e2] to-[#0096e6] px-6 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition-all hover:brightness-110 active:scale-[0.99] whitespace-nowrap"
          >
            Оплатить {total.toLocaleString('ru-RU')} сум
          </button>
        </form>
      </div>
      {error && <p className="mt-2 text-xs font-semibold text-orange-300">{error}</p>}
    </section>
  );
}
