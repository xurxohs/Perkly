'use client';

import { AlertCircle, RotateCcw } from 'lucide-react';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Perkly route error', error);
  }, [error]);

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6 py-20">
      <section className="w-full max-w-lg rounded-[32px] border border-black/10 bg-white p-8 text-center text-[#17171c] shadow-xl shadow-black/5 dark:border-white/10 dark:bg-[#16161c] dark:text-white">
        <AlertCircle className="mx-auto h-11 w-11 text-[#a94cff]" strokeWidth={2.2} />
        <h1 className="mt-5 text-3xl font-black tracking-tight">Не удалось открыть страницу</h1>
        <p className="mt-3 text-sm leading-6 text-black/55 dark:text-white/55">
          Проверьте соединение и попробуйте ещё раз. Ваши данные сохранены.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#17171c] px-5 font-bold text-white transition-opacity hover:opacity-85 dark:bg-white dark:text-black"
        >
          <RotateCcw className="h-4 w-4" strokeWidth={2.4} />
          Повторить
        </button>
      </section>
    </main>
  );
}
