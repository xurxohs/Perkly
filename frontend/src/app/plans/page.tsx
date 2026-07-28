'use client';

import { ArrowRight, Bookmark, CalendarDays, Clock, Loader2, MapPin, Sparkles, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import SafeImage from '@/components/SafeImage';
import { useAuth } from '@/lib/AuthContext';
import { Event, eventsApi } from '@/lib/api';

type Tab = 'upcoming' | 'past';
const SESSION_NOW = Date.now();

export default function PlansPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('upcoming');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) return;
    Promise.all([eventsApi.getSaved(), eventsApi.list({ take: 100 })])
      .then(([saved, response]) => {
        const savedIds = new Set(saved.map((item) => item.eventId));
        setEvents((response.data ?? []).filter((event) => savedIds.has(event.id)));
      })
      .finally(() => setLoading(false));
  }, [authLoading, isAuthenticated]);

  const visibleEvents = useMemo(() => events.filter((event) => {
    const isPast = new Date(event.date).getTime() + 86_400_000 < SESSION_NOW;
    return activeTab === 'past' ? isPast : !isPast;
  }), [events, activeTab]);

  const remove = async (eventId: string) => {
    setEvents((current) => current.filter((event) => event.id !== eventId));
    try { await eventsApi.unsave(eventId); } catch { /* feed refresh restores server state */ }
  };

  return <main className="plans-page">
    <header className="plans-header"><div><h1 className="plans-title">Мои планы</h1><p className="plans-subtitle">Сохранённые события всегда под рукой</p></div><span className="plans-count">{events.length}</span></header>

    <div className="plans-tabs" role="tablist" aria-label="Планы">
      <button type="button" role="tab" aria-selected={activeTab === 'upcoming'} className={`plans-tab ${activeTab === 'upcoming' ? 'active' : ''}`} onClick={() => setActiveTab('upcoming')}><CalendarDays /> Предстоящие</button>
      <button type="button" role="tab" aria-selected={activeTab === 'past'} className={`plans-tab ${activeTab === 'past' ? 'active' : ''}`} onClick={() => setActiveTab('past')}><Clock /> Прошедшие</button>
    </div>

    <section className="plans-list" role="tabpanel">
      {(authLoading || (isAuthenticated && loading)) ? <div className="plans-loading"><Loader2 className="animate-spin" /> Загружаем планы</div> : !isAuthenticated ? <div className="plans-empty"><div className="plans-empty-icon"><Bookmark /></div><h2>Войдите, чтобы сохранять</h2><p>Планы синхронизируются между вашими устройствами.</p><Link href="/login?next=/plans" className="plans-empty-btn">Войти <ArrowRight /></Link></div> : visibleEvents.length ? visibleEvents.map((event) => {
        const date = new Date(event.date);
        return <article className={`plan-card ${activeTab === 'past' ? 'past' : ''}`} key={event.id}>
          <Link href={`/feed#event-${event.id}`} className="plan-card-image"><SafeImage src={event.imageUrl} alt={event.title} fill sizes="120px" className="object-cover" /></Link>
          <div className="plan-card-body">
            <div className="plan-card-top"><span className="plan-category">{event.category}</span><button type="button" className="plan-icon-btn danger" onClick={() => void remove(event.id)} aria-label="Удалить из планов"><Trash2 /></button></div>
            <h2 className="plan-card-title">{event.title}</h2>
            <div className="plan-card-meta"><span className="plan-meta-item"><CalendarDays /> {date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</span><span className="plan-meta-item"><Clock /> {event.startTime}</span><span className="plan-meta-item"><MapPin /> {event.location}</span></div>
            <Link href={`/feed#event-${event.id}`} className="plan-detail-link">Открыть событие <ArrowRight /></Link>
          </div>
        </article>;
      }) : <div className="plans-empty"><div className="plans-empty-icon"><Sparkles /></div><h2>{activeTab === 'upcoming' ? 'Планов пока нет' : 'История пока пуста'}</h2><p>{activeTab === 'upcoming' ? 'Нажмите на закладку в карточке события — оно появится здесь.' : 'Завершённые сохранённые события появятся здесь автоматически.'}</p><Link href="/feed" className="plans-empty-btn">Открыть Топку <ArrowRight /></Link></div>}
    </section>
  </main>;
}
