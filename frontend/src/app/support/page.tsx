import Link from 'next/link';

const topics = [
  {
    id: 'purchases',
    title: 'Покупки и платежи',
    text: 'Укажите номер операции, сумму в UZS и время платежа. Не отправляйте пароль, код из SMS или полные реквизиты банковской карты.',
  },
  {
    id: 'disputes',
    title: 'Споры и возвраты',
    text: 'Откройте спор из истории покупок и приложите описание проблемы. Переписка и материалы заказа помогут поддержке принять решение.',
  },
  {
    id: 'safety',
    title: 'Жалобы и безопасность',
    text: 'Используйте действие «Пожаловаться» рядом с контентом или пользователем. При необходимости заблокируйте пользователя в меню чата.',
  },
  {
    id: 'account',
    title: 'Аккаунт и персональные данные',
    text: 'В профиле доступны выгрузка данных и удаление аккаунта. Если войти не получается, напишите с email, привязанного к аккаунту.',
  },
];

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-[#07070a] px-5 py-16 text-white">
      <article className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-purple-300 no-underline">
          ← На главную
        </Link>

        <p className="mt-10 text-xs uppercase tracking-[0.2em] text-white/40">
          Служба поддержки Perkly
        </p>
        <h1 className="mt-3 text-4xl font-bold">Как мы можем помочь?</h1>
        <p className="mt-5 text-lg leading-8 text-white/65">
          Напишите нам по одному из каналов ниже. Мы ответим как можно скорее и
          никогда не попросим пароль или полный номер карты.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <a
            href="mailto:support@perkly.com"
            className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 no-underline transition-colors hover:bg-white/[0.07]"
          >
            <p className="text-sm text-white/45">Email</p>
            <p className="mt-2 text-lg font-semibold text-white">
              support@perkly.com
            </p>
          </a>
          <a
            href="https://t.me/perkly_support"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 no-underline transition-colors hover:bg-white/[0.07]"
          >
            <p className="text-sm text-white/45">Telegram</p>
            <p className="mt-2 text-lg font-semibold text-white">
              @perkly_support
            </p>
          </a>
        </div>

        <div className="mt-14 space-y-8">
          {topics.map((topic) => (
            <section key={topic.id} id={topic.id} className="scroll-mt-8">
              <h2 className="text-xl font-semibold">{topic.title}</h2>
              <p className="mt-3 leading-7 text-white/60">{topic.text}</p>
            </section>
          ))}
        </div>

        <section
          id="faq"
          className="mt-14 rounded-3xl border border-white/10 bg-white/[0.04] p-6"
        >
          <h2 className="text-xl font-semibold">O‘zbekcha / English</h2>
          <p className="mt-3 leading-7 text-white/60">
            Yordam uchun support@perkly.com manziliga yoki @perkly_support
            Telegram akkauntiga yozing. Parol, SMS kodi yoki bank kartasining
            to‘liq raqamini yubormang.
          </p>
          <p className="mt-3 leading-7 text-white/60">
            For help, email support@perkly.com or contact @perkly_support on
            Telegram. Never send your password, SMS code, or full card number.
          </p>
        </section>

        <div className="mt-10 flex flex-wrap gap-5 text-sm">
          <Link href="/privacy" className="text-purple-300 no-underline">
            Политика конфиденциальности
          </Link>
          <Link href="/terms" className="text-purple-300 no-underline">
            Пользовательское соглашение
          </Link>
        </div>
      </article>
    </main>
  );
}
