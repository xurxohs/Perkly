'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Eye,
  Users,
  Calendar,
  Clock,
  MapPin,
  ChevronLeft,
  FileText,
  Bookmark,
  Bell,
  Share2,
  Sparkles,
  ChevronDown,
  MessageCircle
} from 'lucide-react';
import { Event } from '@/lib/api';
import SafeImage from '@/components/SafeImage';

export type FeedEvent = Event;

// ===== Demo Data (fallback when API has no events) =====
const DEMO_EVENTS: FeedEvent[] = [
  {
    id: 'demo-1',
    title: 'Electric Nights',
    category: 'Фестиваль',
    description: 'Крупнейший музыкальный фестиваль этого лета! Хедлайнеры, световое шоу и незабываемая атмосфера под открытым небом. Более 30 артистов на 3 сценах.',
    fullDescription: null,
    date: '2026-08-15T00:00:00Z',
    startTime: '19:00',
    ageLimit: '18+',
    location: 'Центральный Парк',
    address: 'ул. Паркова 42',
    latitude: null,
    longitude: null,
    imageUrl: '/demo-events/festival.png',
    viewersCount: 247,
    participantsCount: 3200,
    organizerId: 'demo',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-2',
    title: 'Skyline Gala',
    category: 'Вечеринка',
    description: 'Эксклюзивная вечеринка на крыше с панорамным видом на ночной город. Коктейли, живая музыка и networking в атмосфере роскоши.',
    fullDescription: null,
    date: '2026-07-20T00:00:00Z',
    startTime: '21:00',
    ageLimit: '21+',
    location: 'Sky Lounge',
    address: 'пр. Амира Темура 88, 32 этаж',
    latitude: null,
    longitude: null,
    imageUrl: '/demo-events/party.png',
    viewersCount: 124,
    participantsCount: 1200,
    organizerId: 'demo',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-3',
    title: 'Abstract Voices',
    category: 'Выставка',
    description: 'Иммерсивная выставка современного искусства. 50+ работ от молодых художников, интерактивные инсталляции и аудио-гид в приложении.',
    fullDescription: null,
    date: '2026-06-10T00:00:00Z',
    startTime: '11:00',
    ageLimit: '0+',
    location: 'Галерея Modern',
    address: 'ул. Навои 15',
    latitude: null,
    longitude: null,
    imageUrl: '/demo-events/exhibition.png',
    viewersCount: 89,
    participantsCount: 2400,
    organizerId: 'demo',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-4',
    title: 'Night Bites',
    category: 'Фуд-Фест',
    description: 'Ночной фуд-маркет с лучшей уличной едой города! Более 40 стендов, мастер-классы от шеф-поваров и живая музыка до утра.',
    fullDescription: null,
    date: '2026-09-05T00:00:00Z',
    startTime: '18:00',
    ageLimit: '0+',
    location: 'Magic City',
    address: 'ул. Буюк Ипак Йули 154',
    latitude: null,
    longitude: null,
    imageUrl: '/demo-events/food.png',
    viewersCount: 312,
    participantsCount: 5100,
    organizerId: 'demo',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-5',
    title: 'Вечер Стендапа',
    category: 'Стендап',
    description: 'Лучшие комики города собираются на одной сцене! Два часа нон-стоп юмора, сюрприз-гости и afterparty для всех зрителей.',
    fullDescription: null,
    date: '2026-07-28T00:00:00Z',
    startTime: '20:00',
    ageLimit: '16+',
    location: 'Comedy Club',
    address: 'ул. Шота Руставели 26',
    latitude: null,
    longitude: null,
    imageUrl: '/demo-events/comedy.png',
    viewersCount: 156,
    participantsCount: 800,
    organizerId: 'demo',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// ===== Animated Viewer Count Hook =====
function useAnimatedCount(target: number) {
  const [count, setCount] = useState(target);

  useEffect(() => {
    // Simulate live fluctuation
    const interval = setInterval(() => {
      setCount(prev => {
        const delta = Math.floor(Math.random() * 7) - 3; // -3 to +3
        return Math.max(1, prev + delta);
      });
    }, 3000 + Math.random() * 2000);

    return () => clearInterval(interval);
  }, [target]);

  return count;
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

// ===== Format participants count =====
function formatParticipants(count: number): string {
  if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return count.toString();
}

// ===== Single Event Card =====
function EventCard({
  event,
  index,
  total,
  isActive,
}: {
  event: FeedEvent;
  index: number;
  total: number;
  isActive: boolean;
}) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const liveViewers = useAnimatedCount(event.viewersCount);
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

        {/* Live Badge (top center) */}
        {isActive && (
          <div className="event-live-badge absolute top-[env(safe-area-inset-top,16px)] left-1/2 -translate-x-1/2 mt-3 z-20">
            <span className="live-pulse-dot" />
            <Eye className="w-3.5 h-3.5" />
            <span>{liveViewers}</span>
          </div>
        )}
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

        {/* 3. Social Proof & Info */}
        <div className="event-metrics">
          <div className="metric-item live">
            <span className="metric-live-dot" />
            <Eye className="w-3.5 h-3.5" />
            <span>{liveViewers} смотрят</span>
          </div>
          <div className="metric-divider" />
          <div className="metric-item participants">
            <Users className="w-3.5 h-3.5" />
            <span>{formatParticipants(event.participantsCount)} пойдут</span>
          </div>
        </div>

        <div className="event-meta">
          <div className="meta-chunk">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formattedDate}</span>
          </div>
          <div className="meta-chunk">
            <Clock className="w-3.5 h-3.5" />
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
            <MapPin className="w-4 h-4" />
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
              <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-current' : ''}`} />
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Use demo events if API returns empty
  const feedEvents = events && events.length > 0 ? events : DEMO_EVENTS;

  // Track which card is currently in view
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, clientHeight } = containerRef.current;
    const newIndex = Math.round(scrollTop / clientHeight);
    setActiveIndex(newIndex);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  if (!feedEvents || feedEvents.length === 0) {
    return (
      <div className="feed-empty">
        <Sparkles className="w-12 h-12 text-white/10 mb-4" />
        <h2 className="text-xl font-bold text-white/60 mb-2">Мероприятий пока нет</h2>
        <p className="text-white/30 text-sm">Следите за обновлениями — скоро здесь будет жарко!</p>
      </div>
    );
  }

  return (
    <div className="feed-container" ref={containerRef}>
      {feedEvents.map((event, i) => (
        <EventCard
          key={event.id}
          event={event}
          index={i}
          total={feedEvents.length}
          isActive={i === activeIndex}
        />
      ))}
    </div>
  );
}
