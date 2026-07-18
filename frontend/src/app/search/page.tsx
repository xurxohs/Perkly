'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Calendar,
  MapPin,
  Search,
  ShoppingBag,
  Sparkles,
  X,
} from 'lucide-react';
import Link from 'next/link';
import SafeImage from '@/components/SafeImage';
import {
  eventsApi,
  offersApi,
  type Event,
  type Offer,
} from '@/lib/api';

const CATEGORY_LABELS: Record<string, string> = {
  RESTAURANTS: 'Рестораны и кафе',
  MARKETPLACES: 'Маркетплейсы',
  SUBSCRIPTIONS: 'Подписки',
  GAMES: 'Игры',
  COURSES: 'Обучение',
  TOURISM: 'Туризм',
  FITNESS: 'Фитнес',
  OTHER: 'Другое',
};

const CATEGORY_COLORS: Record<string, string> = {
  RESTAURANTS: '#f97316',
  MARKETPLACES: '#a855f7',
  SUBSCRIPTIONS: '#06b6d4',
  GAMES: '#3b82f6',
  COURSES: '#14b8a6',
  TOURISM: '#22c55e',
  FITNESS: '#ec4899',
};

type SearchResult = {
  id: string;
  type: 'offer' | 'event';
  title: string;
  searchableText: string;
  category: string;
  color: string;
  imageUrl: string;
  href: string;
  meta: string;
};

function isUpcoming(event: Event) {
  const timestamp = new Date(event.date).getTime();
  return Number.isFinite(timestamp) && timestamp + 86_400_000 >= Date.now();
}

function formatPrice(price: number) {
  return price === 0 ? 'Бесплатно' : `${price.toLocaleString('ru-RU')} сум`;
}

function offerToResult(offer: Offer): SearchResult {
  const category = CATEGORY_LABELS[offer.category] || 'Предложение';
  return {
    id: offer.id,
    type: 'offer',
    title: offer.title,
    searchableText: `${offer.title} ${offer.description} ${category}`.toLowerCase(),
    category,
    color: CATEGORY_COLORS[offer.category] || '#a855f7',
    imageUrl: offer.imageUrl || offer.thumbnailUrl || offer.vendorLogo || '',
    href: `/offer?id=${offer.id}`,
    meta: formatPrice(offer.price),
  };
}

function eventToResult(event: Event): SearchResult {
  const date = new Date(event.date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  });
  return {
    id: event.id,
    type: 'event',
    title: event.title,
    searchableText:
      `${event.title} ${event.description} ${event.category} ${event.location} ${event.address}`.toLowerCase(),
    category: event.category || 'Событие',
    color: '#f97316',
    imageUrl: event.imageUrl,
    href: '/feed',
    meta: [date, event.startTime].filter(Boolean).join(' · '),
  };
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();

    let cancelled = false;
    const loadSearchData = async () => {
      setLoading(true);
      setLoadError(false);
      const [offersResult, eventsResult] = await Promise.allSettled([
        offersApi.list({ take: 60, sort: 'newest' }),
        eventsApi.list({ take: 60 }),
      ]);
      if (cancelled) return;

      if (offersResult.status === 'fulfilled') {
        setOffers(offersResult.value.data ?? []);
      }
      if (eventsResult.status === 'fulfilled') {
        setEvents((eventsResult.value.data ?? []).filter(isUpcoming));
      }
      setLoadError(
        offersResult.status === 'rejected' && eventsResult.status === 'rejected',
      );
      setLoading(false);
    };

    void loadSearchData();
    return () => {
      cancelled = true;
    };
  }, []);

  const allResults = useMemo(
    () => [
      ...offers.map(offerToResult),
      ...events.map(eventToResult),
    ],
    [events, offers],
  );
  const normalizedQuery = query.trim().toLowerCase();
  const filteredResults = useMemo(
    () =>
      normalizedQuery
        ? allResults.filter((result) =>
            result.searchableText.includes(normalizedQuery),
          )
        : [],
    [allResults, normalizedQuery],
  );
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    offers.forEach((offer) => {
      const label = CATEGORY_LABELS[offer.category] || 'Другое';
      counts.set(label, (counts.get(label) ?? 0) + 1);
    });
    events.forEach((event) => {
      const label = event.category || 'События';
      counts.set(label, (counts.get(label) ?? 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [events, offers]);

  const showResults = normalizedQuery.length > 0;
  const hasData = allResults.length > 0;

  return (
    <div className="search-page">
      <div className="search-header">
        <div className={`search-input-wrapper ${isFocused ? 'focused' : ''}`}>
          <Search className="h-5 w-5 text-white/30" />
          <input
            ref={inputRef}
            type="search"
            placeholder="Товар, промокод или мероприятие"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="search-input"
            id="search-marketplace-input"
            aria-label="Поиск по Perkly"
          />
          {query && (
            <button
              className="search-clear-btn"
              onClick={() => setQuery('')}
              aria-label="Очистить поиск"
              title="Очистить поиск"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="search-no-results min-h-[55vh]">
          <div className="mb-5 h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-white/50" />
          <h1 className="text-lg font-extrabold text-white/50">Обновляем данные</h1>
          <p>Получаем актуальные предложения и события</p>
        </div>
      ) : loadError ? (
        <div className="search-no-results min-h-[55vh]">
          <Sparkles className="mb-3 h-10 w-10 text-white/10" />
          <h1 className="text-lg font-extrabold text-white/50">Поиск временно недоступен</h1>
          <p>Проверьте соединение и попробуйте открыть страницу снова</p>
        </div>
      ) : showResults ? (
        <div className="search-results">
          {filteredResults.length > 0 ? (
            <>
              <h2 className="search-section-title">
                Результаты
                <span className="result-count">{filteredResults.length}</span>
              </h2>
              <div className="search-results-list">
                {filteredResults.map((result) => (
                  <Link
                    href={result.href}
                    key={`${result.type}-${result.id}`}
                    className="search-result-card"
                  >
                    <div className="result-card-image relative bg-white/[0.035]">
                      <SafeImage
                        src={result.imageUrl}
                        alt={result.title}
                        fill
                        sizes="64px"
                        className="object-cover"
                        fallbackIcon={
                          result.type === 'offer' ? (
                            <ShoppingBag className="h-6 w-6 text-white/15" />
                          ) : (
                            <Calendar className="h-6 w-6 text-white/15" />
                          )
                        }
                      />
                    </div>
                    <div className="result-card-info">
                      <span
                        className="result-category"
                        style={{ color: result.color }}
                      >
                        {result.category}
                      </span>
                      <h3 className="result-title">{result.title}</h3>
                      <div className="result-meta">
                        <span>
                          {result.type === 'offer' ? (
                            <ShoppingBag className="h-3 w-3" />
                          ) : (
                            <MapPin className="h-3 w-3" />
                          )}
                          {result.meta}
                        </span>
                      </div>
                    </div>
                    <ArrowUpRight className="result-arrow h-4 w-4 text-white/20" />
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <div className="search-no-results min-h-[50vh]">
              <Search className="mb-3 h-10 w-10 text-white/10" />
              <h2>Ничего не найдено</h2>
              <p>Проверьте запрос или выберите доступную категорию</p>
            </div>
          )}
        </div>
      ) : hasData ? (
        <>
          {categoryCounts.length > 0 && (
            <div className="search-section">
              <h2 className="search-section-title">Доступные категории</h2>
              <div className="trending-tags">
                {categoryCounts.map(([label, count]) => (
                  <button
                    key={label}
                    className="trending-tag"
                    onClick={() => setQuery(label)}
                  >
                    <span className="tag-label">{label}</span>
                    <span className="tag-count">{count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {offers.length > 0 && (
            <div className="search-section">
              <h2 className="search-section-title">
                <ShoppingBag className="h-4 w-4 text-purple-300" />
                Новые предложения
              </h2>
              <div className="popular-events-grid">
                {offers.slice(0, 4).map((offer) => (
                  <Link
                    href={`/offer?id=${offer.id}`}
                    key={offer.id}
                    className="popular-event-card"
                  >
                    <div className="popular-event-image bg-white/[0.035]">
                      <SafeImage
                        src={offer.imageUrl || offer.thumbnailUrl || offer.vendorLogo || ''}
                        alt={offer.title}
                        fill
                        sizes="(max-width: 600px) 50vw, 240px"
                        className="object-cover"
                        fallbackIcon={<ShoppingBag className="h-8 w-8 text-white/15" />}
                      />
                    </div>
                    <div className="popular-event-info">
                      <span
                        className="popular-category"
                        style={{
                          color: CATEGORY_COLORS[offer.category] || '#a855f7',
                        }}
                      >
                        {CATEGORY_LABELS[offer.category] || 'Предложение'}
                      </span>
                      <h3 className="popular-title">{offer.title}</h3>
                      <span className="popular-meta">
                        {formatPrice(offer.price)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="search-no-results min-h-[55vh]">
          <Search className="mb-3 h-10 w-10 text-white/10" />
          <h1 className="text-lg font-extrabold text-white/50">Пока нечего искать</h1>
          <p>Предложения появятся после публикации и проверки Perkly</p>
          <Link
            href="/catalog"
            className="mt-6 inline-flex h-11 items-center rounded-full bg-white px-5 text-sm font-bold text-black no-underline"
          >
            Открыть каталог
          </Link>
        </div>
      )}
    </div>
  );
}
