import { ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6 py-20">
      <section className="w-full max-w-lg text-center">
        <div className="text-7xl font-black tracking-[-0.08em] text-black/10 dark:text-white/10">404</div>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-[#17171c] dark:text-white">Страница не найдена</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-black/55 dark:text-white/55">
          Возможно, предложение завершилось или ссылка изменилась.
        </p>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <Link href="/" className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white font-bold text-[#17171c] no-underline dark:border-white/10 dark:bg-white/5 dark:text-white">
            <ArrowLeft className="h-4 w-4" /> На главную
          </Link>
          <Link href="/search" className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#17171c] font-bold text-white no-underline dark:bg-white dark:text-black">
            <Search className="h-4 w-4" /> Найти товар
          </Link>
        </div>
      </section>
    </main>
  );
}
