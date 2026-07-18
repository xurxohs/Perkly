'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  FileText,
  Bell,
  Share2,
  Sparkles,
  ChevronDown,
  MessageCircle
} from 'lucide-react';
import { Event, eventsApi } from '@/lib/api';
import SafeImage from '@/components/SafeImage';
import { PerklyGlyph } from '@/components/PerklyGlyph';

export type FeedEvent = Event;

function isUpcomingEvent(event: FeedEvent) {
  const timestamp = new Date(event.date).getTime();
  return Number.isFinite(timestamp) && timestamp + 86_400_000 >= Date.now();
}

// ===== Category Color Map =====
function getCategoryColor(category: string): string {
  const map: Record<string, string> = {
    'Фестиваль': '#a855f7',
    'Вечеринка': '#f59e0b',
    'Выставка': '#06b6d4',
    'Фуд-Фест': '#f97316',
    'Стендап': '#ec4899',
    'Концерт': '#8b5cf6',
    'Спорт': '#22c55e',
    'Акция': '#ef4444',
  };
  return map[category] || '#a855f7';
}

// ===== Single Event Card =====
function EventCard({
  event,
  index,
  total,
}: {
  event: FeedEvent;
  index: number;
  total: number;
}) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const categoryColor = getCategoryColor(event.category);

  // Formatting date
  const eventDate = new Date(event.date);
  const formattedDate = eventDate.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long'
  });

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: event.description,
          url: window.location.href,
        });
      } catch { /* user cancelled */ }
    }
  };

  return (
    <div className="feed-post event-screen" id={`event-${event.id}-${index}`}>
      {/* 1. Hero Image & Vignette */}
      <div className="event-hero">
        <div className="event-hero-image-wrapper">
          <SafeImage
            src={event.imageUrl}
            fill
            className="object-cover"
            alt={event.title}
            sizes="100vw"
            priority={index < 2}
            fallbackIcon={<Sparkles className="w-16 h-16 text-white/10" />}
          />
        </div>
        {/* Multi-layer vignette for cinematic feel */}
        <div className="event-vignette" />
        <div className="event-vignette-top" />

        {/* Back Button */}
        <Link href="/" className="event-top-action-btn back-btn" aria-label="Назад">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <Link href="/notifications" className="event-top-action-btn bell-btn" aria-label="Уведомления">
          <Bell className="w-5 h-5" />
          <span className="bell-pulse-indicator" />
        </Link>

      </div>

      {/* 2. Content Section (over gradient) */}
      <div className="event-content">
        {/* Category chip */}
        <div className="event-header">
          <span
            className="event-category-chip"
            style={{
              '--cat-color': categoryColor,
              borderColor: `${categoryColor}40`,
              background: `${categoryColor}15`,
            } as React.CSSProperties}
          >
            {event.category}
          </span>
          <h1 className="event-title">{event.title}</h1>
        </div>

        <div className="event-meta">
          <div className="meta-chunk">
            <span>{formattedDate}</span>
          </div>
          <div className="meta-chunk">
            <span>{event.startTime}</span>
          </div>
          <div className="age-badge">{event.ageLimit}</div>
        </div>

        {/* 4. Main CTAs */}
        <div className="event-actions-main">
          <button className="cta-btn cta-orange" id={`cta-attend-${event.id}`}>
            Сходить
          </button>
          <button className="cta-btn cta-dark" id={`cta-address-${event.id}`}>
            <PerklyGlyph name="location" className="w-4 h-4" />
            Адрес
          </button>
        </div>

        {/* 5. Fast Action Panel */}
        <div className="event-fast-actions">
          <div
            className="fast-action-item"
            onClick={() => setShowFullDesc(!showFullDesc)}
          >
            <div className="action-icon-circle">
              <FileText className="w-5 h-5" />
            </div>
            <span>Подробнее</span>
          </div>
          <div
            className={`fast-action-item ${isBookmarked ? 'active' : ''}`}
            onClick={() => setIsBookmarked(!isBookmarked)}
          >
            <div className="action-icon-circle">
              <PerklyGlyph name="bookmark" className="w-5 h-5" />
            </div>
            <span>Планы</span>
          </div>
          <Link href="/chat" className="fast-action-item no-underline text-inherit">
            <div className="action-icon-circle">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <span>Чат</span>
          </Link>
          <div className="fast-action-item" onClick={handleShare}>
            <div className="action-icon-circle">
              <Share2 className="w-5 h-5" />
            </div>
            <span>Поделиться</span>
          </div>
        </div>

        {/* 6. Description / Announcement */}
        <div className={`event-announcement ${showFullDesc ? 'expanded' : ''}`}>
          <p>{event.description}</p>
        </div>
      </div>

      {/* Side progress dots */}
      <div className="feed-side-dots">
        {Array.from({ length: Math.min(total, 8) }).map((_, i) => (
          <div
            key={i}
            className={`feed-dot ${i === index % 8 ? 'feed-dot-active' : ''}`}
          />
        ))}
      </div>

      {/* Scroll hint on first card */}
      {index === 0 && (
        <div className="scroll-hint">
          <ChevronDown className="w-5 h-5 animate-bounce-slow" />
        </div>
      )}
    </div>
  );
}

// ===== Main Feed Component =====
export default function FeedPage({ events }: { events: FeedEvent[] }) {
  const [feedEvents, setFeedEvents] = useState<FeedEvent[]>(() =>
    events.filter(isUpcomingEvent)
  );

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

  if (!feedEvents || feedEvents.length === 0) {
    return (
      <div className="feed-empty px-6 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/[0.04]">
          <Sparkles className="h-7 w-7 text-white/20" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-white/75">Сейчас нет актуальных событий</h1>
        <p className="max-w-sm text-sm leading-6 text-white/35">
          Новые мероприятия появятся здесь после публикации организаторами.
        </p>
        <Link
          href="/catalog"
          className="mt-7 inline-flex h-11 items-center rounded-full bg-white px-5 text-sm font-bold text-black no-underline"
        >
          Перейти в каталог
        </Link>
      </div>
    );
  }

  return (
    <div className="feed-container">
      <header className="feed-app-header">
        <div>
          <h1>Топка</h1>
          <p>События Ташкента</p>
        </div>
      </header>
      {feedEvents.map((event, i) => (
        <EventCard
          key={event.id}
          event={event}
          index={i}
          total={feedEvents.length}
        />
      ))}
    </div>
  );
}
