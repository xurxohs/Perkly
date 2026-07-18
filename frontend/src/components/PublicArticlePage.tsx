import Link from 'next/link';

export type PublicArticleSection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
  links?: Array<{
    href: string;
    label: string;
  }>;
};

type RelatedLink = {
  href: string;
  title: string;
  description: string;
};

export function PublicArticlePage({
  title,
  intro,
  updated = '18 июля 2026 года',
  author,
  sections,
  related = [],
}: {
  title: string;
  intro: string;
  updated?: string;
  author?: string;
  sections: PublicArticleSection[];
  related?: RelatedLink[];
}) {
  return (
    <main className="public-info-page min-h-screen px-5 py-12 sm:py-16">
      <article className="mx-auto max-w-6xl">
        <nav aria-label="Хлебные крошки" className="public-info-muted flex flex-wrap items-center gap-2 text-sm">
          <Link href="/" className="public-info-link public-info-breadcrumb-link">Perkly</Link>
          <span aria-hidden="true">/</span>
          <span>{title}</span>
        </nav>

        <header className="public-info-hero mt-8 rounded-[2rem] p-7 sm:p-10 lg:p-14">
          <p className="public-info-muted text-sm">
            {author ? `${author} · ` : ''}Обновлено {updated}
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-[-0.04em] sm:text-5xl lg:text-6xl">{title}</h1>
          <p className="public-info-muted mt-6 max-w-3xl text-lg leading-8 sm:text-xl">{intro}</p>
        </header>

        <div className="mt-10 grid gap-10 lg:grid-cols-[250px_minmax(0,1fr)] lg:items-start">
          <aside className="public-info-panel rounded-[1.5rem] p-5 lg:sticky lg:top-28">
            <p className="text-sm font-semibold">На этой странице</p>
            <ol className="mt-4 space-y-3 text-sm">
              {sections.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className="public-info-muted public-info-link no-underline">{section.title}</a>
                </li>
              ))}
            </ol>
          </aside>

          <div className="space-y-5">
            {sections.map((section) => (
              <section key={section.id} id={section.id} className="public-info-panel scroll-mt-28 rounded-[1.75rem] p-7 sm:p-9">
                <h2 className="text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">{section.title}</h2>
                <div className="public-info-muted mt-5 space-y-4 text-base leading-7 sm:text-lg sm:leading-8">
                  {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  {section.bullets && (
                    <ul className="space-y-3 pl-5">
                      {section.bullets.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  )}
                  {section.links && (
                    <ul className="space-y-3 pl-5">
                      {section.links.map((item) => (
                        <li key={item.href}>
                          <a
                            href={item.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="public-info-link"
                          >
                            {item.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            ))}
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-semibold tracking-[-0.025em]">Продолжить</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {related.map((item) => (
                <Link key={item.href} href={item.href} className="public-info-panel block rounded-[1.5rem] p-6 no-underline transition-transform hover:-translate-y-0.5">
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="public-info-muted mt-2 text-sm leading-6">{item.description}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </main>
  );
}
