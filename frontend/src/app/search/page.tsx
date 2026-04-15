'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, X, TrendingUp, Clock, MapPin, Flame, Star, ArrowUpRight, Sparkles, Calendar, Users } from 'lucide-react';
import Link from 'next/link';

const TRENDING_TAGS = [
  { label: 'Вечеринки', count: '120+', color: '#f59e0b' },
  { label: 'Фестивали', count: '45', color: '#a855f7' },
  { label: 'Стендап', count: '30+', color: '#ec4899' },
  { label: 'Фуд-маркеты', count: '55', color: '#f97316' },
  { label: 'Выставки', count: '25', color: '#06b6d4' },
  { label: 'Концерты', count: '80+', color: '#8b5cf6' },
  { label: 'Спорт', count: '40', color: '#22c55e' },
  { label: 'Мастер-классы', count: '35', color: '#14b8a6' },
];

const RECENT_SEARCHES = [
  'Electric Nights',
  'Вечеринка на крыше',
  'Comedy Club',
];

const POPULAR_EVENTS = [
  {
    id: '1',
    title: 'Electric Nights Festival',
    category: 'Фестиваль',
    date: '15 Авг',
    attendees: '3.2K',
    imageUrl: '/demo-events/festival.png',
    color: '#a855f7',
    hot: true,
  },
  {
    id: '2',
    title: 'Skyline Gala Party',
    category: 'Вечеринка',
    date: '20 Июл',
    attendees: '1.2K',
    imageUrl: '/demo-events/party.png',
    color: '#f59e0b',
    hot: true,
  },
  {
    id: '3',
    title: 'Abstract Voices',
    category: 'Выставка',
    date: '10 Июн',
    attendees: '2.4K',
    imageUrl: '/demo-events/exhibition.png',
    color: '#06b6d4',
    hot: false,
  },
  {
    id: '4',
    title: 'Night Bites Фуд-Маркет',
    category: 'Фуд-Фест',
    date: '5 Сен',
    attendees: '5.1K',
    imageUrl: '/demo-events/food.png',
    color: '#f97316',
    hot: true,
  },
  {
    id: '5',
    title: 'Вечер Стендапа',
    category: 'Стендап',
    date: '28 Июл',
    attendees: '800',
    imageUrl: '/demo-events/comedy.png',
    color: '#ec4899',
    hot: false,
  },
];

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredEvents = query.trim()
    ? POPULAR_EVENTS.filter(e =>
        e.title.toLowerCase().includes(query.toLowerCase()) ||
        e.category.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const showResults = query.trim().length > 0;

  useEffect(() => {
    // Auto-focus the search input
    inputRef.current?.focus();
  }, []);

  return (
    <div className="search-page">
      {/* Search Header */}
      <div className="search-header">
        <div className={`search-input-wrapper ${isFocused ? 'focused' : ''}`}>
          <Search className="w-5 h-5 text-white/30" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Найти мероприятие, место..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="search-input"
            id="search-events-input"
          />
          {query && (
            <button className="search-clear-btn" onClick={() => setQuery('')}>
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Search Results */}
      {showResults ? (
        <div className="search-results">
          {filteredEvents.length > 0 ? (
            <>
              <h3 className="search-section-title">
                Результаты <span className="result-count">{filteredEvents.length}</span>
              </h3>
              <div className="search-results-list">
                {filteredEvents.map(event => (
                  <Link href="/feed" key={event.id} className="search-result-card">
                    <div className="result-card-image">
                      <img src={event.imageUrl} alt={event.title} />
                    </div>
                    <div className="result-card-info">
                      <span className="result-category" style={{ color: event.color }}>
                        {event.category}
                      </span>
                      <h4 className="result-title">{event.title}</h4>
                      <div className="result-meta">
                        <span><Calendar className="w-3 h-3" /> {event.date}</span>
                        <span><Users className="w-3 h-3" /> {event.attendees}</span>
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-white/20 result-arrow" />
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <div className="search-no-results">
              <Sparkles className="w-10 h-10 text-white/10 mb-3" />
              <h3>Ничего не нашлось</h3>
              <p>Попробуйте другой запрос или выберите из популярных</p>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Recent Searches */}
          {RECENT_SEARCHES.length > 0 && (
            <div className="search-section">
              <h3 className="search-section-title">
                <Clock className="w-4 h-4 text-white/30" />
                Недавние
              </h3>
              <div className="recent-searches">
                {RECENT_SEARCHES.map((term, i) => (
                  <button
                    key={i}
                    className="recent-search-item"
                    onClick={() => setQuery(term)}
                  >
                    <Clock className="w-3.5 h-3.5 text-white/20" />
                    <span>{term}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Trending Tags */}
          <div className="search-section">
            <h3 className="search-section-title">
              <TrendingUp className="w-4 h-4 text-white/30" />
              Популярные категории
            </h3>
            <div className="trending-tags">
              {TRENDING_TAGS.map((tag, i) => (
                <button
                  key={i}
                  className="trending-tag"
                  onClick={() => setQuery(tag.label)}
                  style={{ '--tag-color': tag.color } as React.CSSProperties}
                >
                  <span className="tag-label">{tag.label}</span>
                  <span className="tag-count">{tag.count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Popular Right Now */}
          <div className="search-section">
            <h3 className="search-section-title">
              <Flame className="w-4 h-4 text-orange-400" />
              Сейчас популярно
            </h3>
            <div className="popular-events-grid">
              {POPULAR_EVENTS.slice(0, 4).map(event => (
                <Link href="/feed" key={event.id} className="popular-event-card">
                  <div className="popular-event-image">
                    <img src={event.imageUrl} alt={event.title} />
                    <div className="popular-event-overlay" />
                    {event.hot && (
                      <span className="popular-hot-badge">
                        <Flame className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <div className="popular-event-info">
                    <span className="popular-category" style={{ color: event.color }}>{event.category}</span>
                    <h4 className="popular-title">{event.title}</h4>
                    <span className="popular-meta">{event.date} · {event.attendees} чел.</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
