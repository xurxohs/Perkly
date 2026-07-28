export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-10" aria-busy="true" aria-label="Загрузка">
      <div className="h-10 w-52 animate-pulse rounded-2xl bg-[#0A0F24]/10 dark:bg-white/10" />
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="overflow-hidden rounded-[28px] border border-black/5 bg-white dark:border-white/5 dark:bg-white/[0.04]">
            <div className="aspect-[16/10] animate-pulse bg-[#0A0F24]/5 dark:bg-white/[0.06]" />
            <div className="space-y-3 p-5">
              <div className="h-5 w-3/4 animate-pulse rounded-lg bg-[#0A0F24]/10 dark:bg-white/10" />
              <div className="h-4 w-1/2 animate-pulse rounded-lg bg-[#0A0F24]/5 dark:bg-white/[0.06]" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
