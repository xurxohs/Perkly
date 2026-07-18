import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Контакты',
  description: 'Официальные каналы поддержки Perkly по покупкам, продавцам, модерации и персональным данным.',
  alternates: { canonical: '/contacts' },
};

const contacts = [
  { title: 'Поддержка и покупки', value: 'support@perkly.uz', href: 'mailto:support@perkly.uz', text: 'Аккаунт, платёж, покупка, возврат или спор.' },
  { title: 'Telegram', value: '@perkly_support', href: 'https://t.me/perkly_support', text: 'Быстрый вопрос и проверка статуса обращения.' },
  { title: 'Модерация и права', value: 'support@perkly.uz', href: 'mailto:support@perkly.uz?subject=Модерация%20Perkly', text: 'Жалоба на товар, продавца или нарушение прав.' },
  { title: 'Персональные данные', value: 'support@perkly.uz', href: 'mailto:support@perkly.uz?subject=Персональные%20данные', text: 'Доступ, исправление, выгрузка или удаление данных.' },
];

export default function ContactsPage() {
  return <main className="public-info-page min-h-screen px-5 py-12 sm:py-16"><div className="mx-auto max-w-5xl">
    <nav className="public-info-muted text-sm"><Link href="/" className="public-info-link no-underline">Perkly</Link> / Контакты</nav>
    <header className="public-info-hero mt-8 rounded-[2rem] p-8 sm:p-12"><h1 className="text-4xl font-bold tracking-[-0.04em] sm:text-6xl">Контакты</h1><p className="public-info-muted mt-5 max-w-3xl text-lg leading-8">Выберите тему и напишите по официальному каналу. Мы не просим пароль, код из SMS или полный номер банковской карты.</p></header>
    <section className="mt-8 grid gap-4 sm:grid-cols-2">{contacts.map((contact) => <a key={contact.title} href={contact.href} target={contact.href.startsWith('http') ? '_blank' : undefined} rel={contact.href.startsWith('http') ? 'noopener noreferrer' : undefined} className="public-info-panel rounded-[1.5rem] p-7 no-underline"><p className="public-info-muted text-sm">{contact.title}</p><h2 className="mt-2 text-xl font-semibold">{contact.value}</h2><p className="public-info-muted mt-3 leading-6">{contact.text}</p></a>)}</section>
    <section className="public-info-panel mt-8 rounded-[1.75rem] p-7 sm:p-9"><h2 className="text-2xl font-semibold">Что указать в обращении</h2><ul className="public-info-muted mt-5 space-y-3 pl-5 leading-7"><li>Email аккаунта и номер операции, если вопрос связан с покупкой.</li><li>Короткое описание ожидаемого и фактического результата.</li><li>Скриншот ошибки без пароля, банковских реквизитов и секретного кода.</li><li>Для жалобы правообладателя — ссылку на карточку и подтверждение прав.</li></ul><p className="public-info-muted mt-6 text-sm">Оператор сервиса Perkly развивает продукт для пользователей и компаний Узбекистана. Обращения рассматриваются по существу указанной темы.</p></section>
  </div></main>;
}
