'use client';

import { useEffect, useState } from 'react';

export default function TelegramAuthCompletePage() {
  const [opening, setOpening] = useState(true);

  const openApp = () => {
    setOpening(true);
    window.location.assign('perkly://auth/complete');
    window.setTimeout(() => setOpening(false), 1200);
  };

  useEffect(() => {
    window.location.assign('perkly://auth/complete');
    const timeout = window.setTimeout(() => setOpening(false), 1200);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <main className="min-h-dvh bg-[#EEF2FF] px-6 py-12 text-[#0A0F24] dark:bg-[#0A0F24] dark:text-white">
      <section className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center text-center">
        <div className="mb-7 grid h-20 w-20 place-items-center rounded-[24px] bg-gradient-to-br from-[#9f4dff] to-[#ed3e9b] text-4xl font-black text-white shadow-xl">
          P
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Вход подтверждён</h1>
        <p className="mt-3 text-base text-black/55 dark:text-white/58">
          Вернитесь в Perkly — ваш аккаунт уже готов.
        </p>
        <button
          type="button"
          onClick={openApp}
          className="mt-8 min-h-14 w-full rounded-full bg-[#0A0F24] px-6 text-base font-semibold text-white dark:bg-white dark:text-black"
        >
          {opening ? 'Открываем Perkly…' : 'Открыть Perkly'}
        </button>
      </section>
    </main>
  );
}
