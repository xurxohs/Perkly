'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CalendarDays, Clock3, Command, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PerklyGlyph, type PerklyGlyphName } from '@/components/PerklyGlyph';
import SafeImage from '@/components/SafeImage';
import { eventsApi, offersApi, type Event, type Offer } from '@/lib/api';
import { useLanguage } from '@/lib/i18n';

const RECENT_KEY = 'perkly-recent-searches';
const MAX_RECENT = 6;

const CATEGORY_META: Record<string, { label: string; icon: PerklyGlyphName }> = {
  RESTAURANTS: { label: 'Рестораны и кафе', icon: 'coffee' },
  MARKETPLACES: { label: 'Маркетплейсы', icon: 'store' },
  SUBSCRIPTIONS: { label: 'Подписки', icon: 'key' },
  GAMES: { label: 'Игры', icon: 'game' },
  COURSES: { label: 'Обучение', icon: 'catalog' },
  TOURISM: { label: 'Туризм', icon: 'location' },
  FITNESS: { label: 'Фитнес', icon: 'profile' },
  OTHER: { label: 'Другое', icon: 'catalog' },
};

type Scope = 'all' | 'offers' | 'promocodes' | 'events' | 'free';
type SearchResult = {
  id: string;
  type: 'offer' | 'event';
  title: string;
  description: string;
  searchText: string;
  category: string;
  categoryKey: string;
  imageUrl: string;
  href: string;
  meta: string;
  price?: number;
  fulfillmentType?: Offer['fulfillmentType'];
  score: number;
};

const scopes: { id: Scope; label: string }[] = [
  { id: 'all', label: 'Всё' },
  { id: 'offers', label: 'Товары' },
  { id: 'promocodes', label: 'Промокоды' },
  { id: 'events', label: 'События' },
  { id: 'free', label: 'Бесплатно' },
];

const aliases: Record<string, string> = {
  tg: 'telegram телеграм', telegram: 'telegram телеграм', телега: 'telegram телеграм',
  яндекс: 'yandex яндекс', yandex: 'yandex яндекс',
  узум: 'uzum узум', uzum: 'uzum узум',
  промик: 'промокод купон', промокоды: 'промокод купон', купоны: 'купон промокод',
  подписка: 'подписки premium премиум', премиум: 'premium премиум подписка',
};

function normalize(value: string) {
  return value
    .toLocaleLowerCase('ru-RU')
    .replace(/ё/g, 'е')
    .replace(/[‘’']/g, '')
    .replace(/[^a-zа-я0-9\s-]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function words(value: string) {
  return normalize(value).split(' ').filter(Boolean);
}

function editDistance(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const saved = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = saved;
    }
  }
  return row[b.length];
}

function relevance(result: Omit<SearchResult, 'score'>, rawQuery: string) {
  const query = normalize(rawQuery);
  if (!query) return 0;
  const expanded = `${query} ${words(query).map((word) => aliases[word] || '').join(' ')}`.trim();
  const title = normalize(result.title);
  const haystack = normalize(result.searchText);
  let score = 0;
  if (title === query) score += 100;
  if (title.startsWith(query)) score += 70;
  if (title.includes(query)) score += 48;
  if (normalize(result.category).includes(query)) score += 30;
  if (haystack.includes(query)) score += 22;
  for (const queryWord of words(expanded)) {
    if (queryWord.length < 2) continue;
    const bestDistance = Math.min(...words(`${result.title} ${result.searchText}`).map((candidate) => editDistance(queryWord, candidate)));
    if (bestDistance === 0) score += 12;
    else if (queryWord.length >= 4 && bestDistance === 1) score += 7;
    else if (queryWord.length >= 6 && bestDistance === 2) score += 3;
  }
  return score;
}

function isUpcoming(event: Event) {
  const timestamp = new Date(event.date).getTime();
  return Number.isFinite(timestamp) && timestamp + 86_400_000 >= Date.now();
}

function Highlight({ text, query }: { text: string; query: string }) {
  const needle = normalize(query);
  if (!needle || needle.length < 2) return text;
  const index = normalize(text).indexOf(needle);
  if (index < 0) return text;
  return <>{text.slice(0, index)}<mark>{text.slice(index, index + needle.length)}</mark>{text.slice(index + needle.length)}</>;
}

export default function SearchPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<Scope>('all');
  const [offers, setOffers] = useState<Offer[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const formatPrice = useCallback((price: number) => {
    if (price === 0) return language === 'uz' ? 'Bepul' : 'Бесплатно';
    return `${new Intl.NumberFormat(language === 'uz' ? 'uz-UZ' : 'ru-RU').format(price)} ${language === 'uz' ? 'so‘m' : 'сум'}`;
  }, [language]);

  useEffect(() => {
    inputRef.current?.focus();
    const params = new URLSearchParams(window.location.search);
    const initialQuery = params.get('q')?.trim();
    if (initialQuery) queueMicrotask(() => setQuery(initialQuery));
    try {
      const stored = JSON.parse(window.localStorage.getItem(RECENT_KEY) || '[]');
      if (Array.isArray(stored)) queueMicrotask(() => setRecent(stored.filter((item): item is string => typeof item === 'string').slice(0, MAX_RECENT)));
    } catch { /* Ignore broken local history. */ }

    const focusShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', focusShortcut);
    return () => window.removeEventListener('keydown', focusShortcut);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      offersApi.list({ take: 100, sort: 'newest' }),
      eventsApi.list({ take: 100 }),
    ]).then(([offersResult, eventsResult]) => {
      if (cancelled) return;
      if (offersResult.status === 'fulfilled') setOffers(offersResult.value.data ?? []);
      if (eventsResult.status === 'fulfilled') setEvents((eventsResult.value.data ?? []).filter(isUpcoming));
      setLoadError(offersResult.status === 'rejected' && eventsResult.status === 'rejected');
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const saveRecent = useCallback((value: string) => {
    const clean = value.trim();
    if (!clean) return;
    setRecent((current) => {
      const next = [clean, ...current.filter((item) => normalize(item) !== normalize(clean))].slice(0, MAX_RECENT);
      window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const baseResults = useMemo<Omit<SearchResult, 'score'>[]>(() => [
    ...offers.map((offer) => ({
      id: offer.id,
      type: 'offer' as const,
      title: offer.title,
      description: offer.description,
      searchText: `${offer.title} ${offer.description} ${CATEGORY_META[offer.category]?.label || offer.category} ${offer.seller?.displayName || ''} ${offer.fulfillmentType}`,
      category: CATEGORY_META[offer.category]?.label || 'Предложение',
      categoryKey: offer.category,
      imageUrl: offer.imageUrl || offer.thumbnailUrl || offer.vendorLogo || '',
      href: `/offer?id=${offer.id}`,
      meta: formatPrice(offer.price),
      price: offer.price,
      fulfillmentType: offer.fulfillmentType,
    })),
    ...events.map((event) => ({
      id: event.id,
      type: 'event' as const,
      title: event.title,
      description: event.description,
      searchText: `${event.title} ${event.description} ${event.category} ${event.location} ${event.address} ${(event.tags || []).join(' ')}`,
      category: event.category || 'Событие',
      categoryKey: 'EVENTS',
      imageUrl: event.imageUrl || event.media?.preview16x9Url || '',
      href: `/feed?event=${event.id}`,
      meta: new Intl.DateTimeFormat(language === 'uz' ? 'uz-UZ' : 'ru-RU', { day: 'numeric', month: 'long' }).format(new Date(event.date)),
    })),
  ], [events, formatPrice, language, offers]);

  const normalizedQuery = normalize(query);
  const hasActiveSearch = normalizedQuery.length > 0 || scope !== 'all';
  const results = useMemo(() => baseResults
    .filter((item) => {
      if (scope === 'offers') return item.type === 'offer';
      if (scope === 'events') return item.type === 'event';
      if (scope === 'promocodes') return item.type === 'offer' && item.fulfillmentType === 'PROMOCODE';
      if (scope === 'free') return item.type === 'offer' && item.price === 0;
      return true;
    })
    .map((item) => ({ ...item, score: relevance(item, query) }))
    .filter((item) => normalizedQuery ? item.score > 0 : true)
    .sort((a, b) => normalizedQuery ? b.score - a.score : (a.type === 'offer' ? -1 : 1)), [baseResults, normalizedQuery, query, scope]);

  const suggestions = useMemo(() => {
    if (normalizedQuery.length < 2) return [];
    const unique = new Set<string>();
    return results.filter((item) => {
      const key = normalize(item.title);
      if (unique.has(key)) return false;
      unique.add(key);
      return true;
    }).slice(0, 5);
  }, [normalizedQuery, results]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    offers.forEach((offer) => counts.set(offer.category, (counts.get(offer.category) || 0) + 1));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [offers]);

  const openResult = useCallback((result: SearchResult) => {
    saveRecent(query || result.title);
    router.push(result.href);
  }, [query, router, saveRecent]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, Math.min(results.length, 8) - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, -1));
    } else if (event.key === 'Enter') {
      const selected = results[activeIndex >= 0 ? activeIndex : 0];
      if (selected) openResult(selected);
    } else if (event.key === 'Escape') {
      setQuery('');
      setActiveIndex(-1);
    }
  };

  const topResult = hasActiveSearch ? results[0] : undefined;
  const remainingResults = topResult ? results.slice(1) : results;

  return (
    <div className="global-search-page">
      <header className="global-search-header">
        <div className="global-search-heading">
          <div>
            <span className="global-search-eyebrow">Поиск по всему Perkly</span>
            <h1>Что вам нужно?</h1>
          </div>
          <span className="global-search-shortcut"><Command /> K</span>
        </div>

        <div className="global-search-box">
          <PerklyGlyph name="search" className="global-search-icon" />
          <input
            ref={inputRef}
            id="search-marketplace-input"
            type="search"
            autoComplete="off"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setActiveIndex(-1); }}
            onKeyDown={onKeyDown}
            placeholder="Например: Telegram Premium, кофе или концерт"
            aria-label="Глобальный поиск по Perkly"
            aria-controls="global-search-results"
          />
          {query && <button type="button" onClick={() => { setQuery(''); inputRef.current?.focus(); }} aria-label="Очистить поиск"><X /></button>}
        </div>

        <div className="global-search-scopes" role="tablist" aria-label="Область поиска">
          {scopes.map((item) => (
            <button key={item.id} type="button" role="tab" aria-selected={scope === item.id} onClick={() => setScope(item.id)}>{item.label}</button>
          ))}
        </div>
      </header>

      <main className="global-search-content" id="global-search-results" aria-live="polite">
        {loading ? (
          <div className="global-search-loading"><span /><span /><span /></div>
        ) : loadError ? (
          <div className="global-search-empty">
            <h2>Поиск временно недоступен</h2>
            <p>Не удалось получить актуальные данные. Попробуйте ещё раз.</p>
            <button type="button" onClick={() => window.location.reload()}>Повторить</button>
          </div>
        ) : hasActiveSearch ? (
          <>
            {suggestions.length > 1 && (
              <section className="global-search-suggestions" aria-label="Подсказки">
                {suggestions.map((item) => (
                  <button key={`${item.type}-${item.id}`} type="button" onClick={() => setQuery(item.title)}>
                    <PerklyGlyph name={item.type === 'event' ? 'topka' : CATEGORY_META[item.categoryKey]?.icon || 'catalog'} />
                    <span><Highlight text={item.title} query={query} /><small>{item.category}</small></span>
                    <ArrowRight />
                  </button>
                ))}
              </section>
            )}

            {topResult ? (
              <>
                <div className="global-search-summary"><span>{normalizedQuery ? 'Лучшее совпадение' : 'Результаты раздела'}</span><span>{results.length} найдено</span></div>
                <button type="button" className="global-search-hero-result" onClick={() => openResult(topResult)}>
                  <div className="global-search-hero-image">
                    <SafeImage src={topResult.imageUrl} alt="" fill sizes="(max-width: 700px) 38vw, 280px" className="object-cover" fallbackIcon={<PerklyGlyph name={topResult.type === 'event' ? 'topka' : 'catalog'} />} />
                  </div>
                  <div className="global-search-hero-copy">
                    <span>{topResult.category}</span>
                    <h2><Highlight text={topResult.title} query={query} /></h2>
                    <p>{topResult.description}</p>
                    <strong>{topResult.meta}</strong>
                  </div>
                  <span className="global-search-open"><ArrowRight /></span>
                </button>

                {remainingResults.length > 0 && (
                  <section className="global-search-results-section">
                    <h2>Ещё результаты</h2>
                    <div className="global-search-results-list">
                      {remainingResults.map((result, index) => (
                        <button key={`${result.type}-${result.id}`} type="button" className={activeIndex === index + 1 ? 'is-keyboard-active' : ''} onClick={() => openResult(result)}>
                          <span className="global-search-result-image"><SafeImage src={result.imageUrl} alt="" fill sizes="72px" className="object-cover" fallbackIcon={<PerklyGlyph name={result.type === 'event' ? 'topka' : 'catalog'} />} /></span>
                          <span className="global-search-result-copy"><small>{result.category}</small><strong><Highlight text={result.title} query={query} /></strong><span>{result.meta}</span></span>
                          <ArrowRight />
                        </button>
                      ))}
                    </div>
                  </section>
                )}
              </>
            ) : (
              <div className="global-search-empty">
                <h2>Такого пока нет</h2>
                <p>Попробуйте короче сформулировать запрос или выберите другую область поиска.</p>
                <div><button type="button" onClick={() => setQuery('')}>Очистить</button><Link href="/catalog">Открыть каталог</Link></div>
              </div>
            )}
          </>
        ) : baseResults.length === 0 ? (
          <div className="global-search-empty">
            <h2>Каталог пока пуст</h2>
            <p>Здесь появятся товары, промокоды и события сразу после публикации и модерации.</p>
            <div><Link href="/catalog">Открыть каталог</Link><Link href="/sell">Стать продавцом</Link></div>
          </div>
        ) : (
          <>
            {recent.length > 0 && (
              <section className="global-search-recent">
                <div className="global-search-section-head"><h2>Недавние</h2><button type="button" onClick={() => { setRecent([]); window.localStorage.removeItem(RECENT_KEY); }}>Очистить</button></div>
                <div>{recent.map((item) => <button type="button" key={item} onClick={() => setQuery(item)}><Clock3 /><span>{item}</span><ArrowRight /></button>)}</div>
              </section>
            )}

            <section className="global-search-discovery">
              <div className="global-search-section-head"><h2>Искать по разделу</h2><span>{baseResults.length} вариантов</span></div>
              <div className="global-search-category-grid">
                {categoryCounts.map(([key, count]) => {
                  const category = CATEGORY_META[key] || CATEGORY_META.OTHER;
                  return <button type="button" key={key} onClick={() => setQuery(category.label)}><PerklyGlyph name={category.icon} /><span><strong>{category.label}</strong><small>{count} предложений</small></span><ArrowRight /></button>;
                })}
                {events.length > 0 && <button type="button" onClick={() => setScope('events')}><CalendarDays /><span><strong>События</strong><small>{events.length} ближайших</small></span><ArrowRight /></button>}
              </div>
            </section>

            {offers.length > 0 && (
              <section className="global-search-picks">
                <div className="global-search-section-head"><h2>Можно начать отсюда</h2><Link href="/catalog">Весь каталог <ArrowRight /></Link></div>
                <div>{offers.slice(0, 6).map((offer) => <Link href={`/offer?id=${offer.id}`} key={offer.id} onClick={() => saveRecent(offer.title)}><span className="global-search-pick-image"><SafeImage src={offer.imageUrl || offer.thumbnailUrl || offer.vendorLogo || ''} alt="" fill sizes="180px" className="object-cover" fallbackIcon={<PerklyGlyph name="catalog" />} /></span><strong>{offer.title}</strong><small>{formatPrice(offer.price)}</small></Link>)}</div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
