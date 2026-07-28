'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  CalendarDays,
  Clock3,
  MapPin,
  Plus,
  Share2,
  Sparkles,
  Sun,
  Ticket,
} from 'lucide-react';
import { Event, eventsApi } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import SafeImage from '@/components/SafeImage';
import { RichText, toSafeHref } from '@/components/RichText';

export type FeedEvent = Event;
type FeedFilter = 'all' | 'today' | 'weekend' | 'free';

const filters = [
  { id: 'all' as const, label: 'Все', icon: Sparkles },
  { id: 'today' as const, label: 'Сегодня', icon: CalendarDays },
  { id: 'weekend' as const, label: 'Выходные', icon: Sun },
  { id: 'free' as const, label: 'Бесплатно', icon: Ticket },
];

function isUpcomingEvent(event: FeedEvent) {
  const timestamp = new Date(event.date).getTime();
  return Number.isFinite(timestamp) && timestamp + 86_400_000 >= Date.now();
}

function matchesFilter(event: FeedEvent, filter: FeedFilter) {
  if (filter === 'all') return true;
  const date = new Date(event.date);
  const now = new Date();
  if (filter === 'today') return date.toDateString() === now.toDateString();
  if (filter === 'weekend') return date.getDay() === 0 || date.getDay() === 6;
  return /бесплат|free|0\s*сум/i.test(`${event.priceText ?? ''} ${event.description}`);
}

function getCategoryColor(category: string): string {
  const map: Record<string, string> = {
    'Фестиваль': '#005CFF', 'Вечеринка': '#FF6B35', 'Выставка': '#06B6D4',
    'Фуд-Фест': '#F97316', 'Стендап': '#4A3AFF', 'Концерт': '#7C6CFF',
    'Спорт': '#22C55E', 'Акция': '#EF4444',
  };
  return map[category] || '#005CFF';
}

function EventCard({ event, index, isBookmarked, isSaving, onToggleSaved }: {
  event: FeedEvent;
  index: number;
  isBookmarked: boolean;
  isSaving: boolean;
  onToggleSaved: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const categoryColor = getCategoryColor(event.category);
  const eventDate = new Date(event.date);
  const formattedDate = eventDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  const addressQuery = [event.location, event.address].filter(Boolean).join(', ');
  const mapHref = event.latitude != null && event.longitude != null
    ? `https://yandex.uz/maps/?pt=${event.longitude},${event.latitude}&z=16&l=map`
    : `https://yandex.uz/maps/?text=${encodeURIComponent(addressQuery)}`;
  const ctaHref = toSafeHref(event.ctaUrl) || mapHref;
  const description = expanded ? (event.fullDescription || event.description) : event.description;

  const handleShare = async () => {
    const url = new URL(window.location.href);
    url.hash = `event-${event.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: event.title, text: event.description, url: url.toString() });
        return;
      } catch { return; }
    }
    await navigator.clipboard?.writeText(url.toString());
  };

  return <article className="feed-post event-screen" id={`event-${event.id}`}>
    <div className="event-hero">
      <div className="event-hero-image-wrapper">
        <SafeImage src={event.imageUrl} fill className="object-cover" alt={event.title} sizes="(max-width: 760px) 100vw, 720px" priority={index < 2} fallbackIcon={<Sparkles className="h-16 w-16 text-white/10" />} />
      </div>
      <div className="event-vignette" />
      <div className="event-vignette-top" />
      <div className="event-card-toolbar">
        <span style={{ '--cat-color': categoryColor } as CSSProperties}>{event.category}</span>
        <div>
          <button type="button" onClick={() => void handleShare()} aria-label="Поделиться событием"><Share2 /></button>
          <button type="button" onClick={onToggleSaved} disabled={isSaving} aria-label={isBookmarked ? 'Убрать из планов' : 'Сохранить в планы'} aria-pressed={isBookmarked} className={isBookmarked ? 'is-active' : ''}><Bookmark fill={isBookmarked ? 'currentColor' : 'none'} /></button>
        </div>
      </div>
    </div>

    <div className="event-content">
      <div className="event-header">
        {(event.badges?.length || event.isFeatured) && <div className="event-badges">{event.isFeatured && <span>Выбор Топки</span>}{event.badges?.slice(0, 2).map((badge) => <span key={badge}>{badge}</span>)}</div>}
        <h2 className="event-title">{event.title}</h2>
        {event.subtitle && <p className="event-subtitle">{event.subtitle}</p>}
      </div>

      <div className="event-meta">
        <span><CalendarDays /> {formattedDate}</span>
        <span><Clock3 /> {event.startTime}{event.endTime ? `–${event.endTime}` : ''}</span>
        {event.ageLimit && <span>{event.ageLimit}</span>}
      </div>

      <div className={`event-announcement ${expanded ? 'expanded' : ''}`}>
        <RichText className="rich-text">{description}</RichText>
      </div>
      {(event.fullDescription || event.description.length > 150) && <button type="button" className="event-description-toggle" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>{expanded ? 'Свернуть' : 'Читать полностью'}</button>}

      <div className="event-card-links">
        <a href={ctaHref} target="_blank" rel="noopener noreferrer nofollow" className="event-card-link event-card-link-primary">{event.ctaText || 'Подробнее'} <ArrowUpRight /></a>
        <a href={mapHref} target="_blank" rel="noopener noreferrer" className="event-card-link event-card-link-secondary"><MapPin /> <span>{event.location || 'Адрес'}</span></a>
      </div>
    </div>
  </article>;
}

export default function FeedPage({ events }: { events: FeedEvent[] }) {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [feedEvents, setFeedEvents] = useState<FeedEvent[]>(() => events.filter(isUpcomingEvent));
  const [activeFilter, setActiveFilter] = useState<FeedFilter>('all');
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    eventsApi.getSaved().then((items) => setSavedIds(new Set(items.map((item) => item.eventId)))).catch(() => undefined);
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    const refreshIfVisible = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const response = await eventsApi.list({ take: 20 });
        setFeedEvents((response.data ?? []).filter(isUpcomingEvent));
      } catch (error) {
        console.error('Topka refresh failed:', error);
      }
    };
    const interval = window.setInterval(() => void refreshIfVisible(), 15_000);
    const handleFocus = () => void refreshIfVisible();
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, []);

  const visibleEvents = useMemo(() => feedEvents.filter((event) => matchesFilter(event, activeFilter)), [feedEvents, activeFilter]);

  const toggleSaved = async (eventId: string) => {
    if (!isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent(`/feed#event-${eventId}`)}`);
      return;
    }
    if (savingIds.has(eventId)) return;
    const wasSaved = savedIds.has(eventId);
    setSavingIds((current) => new Set(current).add(eventId));
    setSavedIds((current) => { const next = new Set(current); if (wasSaved) next.delete(eventId); else next.add(eventId); return next; });
    try {
      if (wasSaved) await eventsApi.unsave(eventId); else await eventsApi.save(eventId);
    } catch {
      setSavedIds((current) => { const next = new Set(current); if (wasSaved) next.add(eventId); else next.delete(eventId); return next; });
    } finally {
      setSavingIds((current) => { const next = new Set(current); next.delete(eventId); return next; });
    }
  };

  return <div className="feed-container">
    <header className="feed-app-header">
      <Link href="/" className="feed-header-back" aria-label="Вернуться на главную"><ArrowLeft /></Link>
      <div><h1>Топка</h1><p>События Ташкента</p></div>
      <Link href="/sell" className="feed-create-button" aria-label="Добавить событие"><Plus /></Link>
    </header>

    <nav className="feed-filter-rail" aria-label="Фильтры событий">
      {filters.map((filter) => { const Icon = filter.icon; return <button key={filter.id} type="button" className={activeFilter === filter.id ? 'is-active' : ''} onClick={() => setActiveFilter(filter.id)} aria-pressed={activeFilter === filter.id}><Icon /> {filter.label}</button>; })}
    </nav>

    <div className="feed-section-heading"><div><h2>Скоро</h2><p>События, которые стоит сохранить в планах</p></div><span>{visibleEvents.length}</span></div>

    {visibleEvents.length ? visibleEvents.map((event, index) => <EventCard key={event.id} event={event} index={index} isBookmarked={savedIds.has(event.id)} isSaving={savingIds.has(event.id)} onToggleSaved={() => void toggleSaved(event.id)} />) : <div className="feed-empty-state"><Sparkles /><h2>Здесь пока тихо</h2><p>Для выбранного фильтра нет актуальных событий.</p><button type="button" onClick={() => setActiveFilter('all')}>Показать все</button></div>}
  </div>;
}
