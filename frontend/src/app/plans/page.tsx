'use client';

import { useState } from 'react';
import { Calendar, Clock, MapPin, Bookmark, Trash2, Bell, BellOff, ChevronRight, Sparkles, Ticket, CalendarDays } from 'lucide-react';
import Link from 'next/link';

// Demo planned events
const DEMO_PLANS = [
  {
    id: '1',
    title: 'Electric Nights',
    category: 'Фестиваль',
    date: '15 Августа',
    time: '19:00',
    location: 'Центральный Парк',
    color: '#a855f7',
    imageUrl: '/demo-events/festival.png',
    reminded: true,
    daysLeft: 127,
  },
  {
    id: '2',
    title: 'Skyline Gala',
    category: 'Вечеринка',
    date: '20 Июля',
    time: '21:00',
    location: 'Sky Lounge',
    color: '#f59e0b',
    imageUrl: '/demo-events/party.png',
    reminded: true,
    daysLeft: 101,
  },
  {
    id: '3',
    title: 'Night Bites Фуд-Маркет',
    category: 'Фуд-Фест',
    date: '5 Сентября',
    time: '18:00',
    location: 'Magic City',
    color: '#f97316',
    imageUrl: '/demo-events/food.png',
    reminded: false,
    daysLeft: 148,
  },
];

const PAST_EVENTS = [
  {
    id: 'p1',
    title: 'Весенний Jazz Вечер',
    category: 'Концерт',
    date: '22 Марта',
    location: 'Консерватория',
    color: '#8b5cf6',
  },
  {
    id: 'p2',
    title: 'Tech Meetup Tashkent',
    category: 'Сходка',
    date: '10 Марта',
    location: 'IT Park',
    color: '#06b6d4',
  },
];

type Tab = 'upcoming' | 'past';

export default function PlansPage() {
  const [activeTab, setActiveTab] = useState<Tab>('upcoming');
  const [plans, setPlans] = useState(DEMO_PLANS);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const toggleReminder = (id: string) => {
    setPlans(prev => prev.map(p =>
      p.id === id ? { ...p, reminded: !p.reminded } : p
    ));
  };

  const removePlan = (id: string) => {
    setRemovingId(id);
    setTimeout(() => {
      setPlans(prev => prev.filter(p => p.id !== id));
      setRemovingId(null);
    }, 300);
  };

  return (
    <div className="plans-page">
      {/* Header */}
      <div className="plans-header">
        <div className="plans-header-content">
          <h1 className="plans-title">Мои Планы</h1>
          <p className="plans-subtitle">Мероприятия, которые вы запланировали</p>
        </div>
        <div className="plans-stats flex items-center gap-3 relative">
          <div className="stat-badge">
            <Ticket className="w-4 h-4" />
            <span>{plans.length}</span>
          </div>
          <Link href="/notifications" className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition relative">
            <Bell className="w-5 h-5 text-white/80" />
            {/* Unread indicator */}
            <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
          </Link>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="plans-tabs">
        <button
          className={`plans-tab ${activeTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('upcoming')}
        >
          <CalendarDays className="w-4 h-4" />
          Предстоящие
          {plans.length > 0 && <span className="tab-count">{plans.length}</span>}
        </button>
        <button
          className={`plans-tab ${activeTab === 'past' ? 'active' : ''}`}
          onClick={() => setActiveTab('past')}
        >
          <Clock className="w-4 h-4" />
          Прошедшие
        </button>
      </div>

      {/* Upcoming Plans */}
      {activeTab === 'upcoming' && (
        <div className="plans-list">
          {plans.length > 0 ? (
            plans.map(plan => (
              <div
                key={plan.id}
                className={`plan-card ${removingId === plan.id ? 'removing' : ''}`}
              >
                {/* Event image thumbnail */}
                <div className="plan-card-image">
                  <img src={plan.imageUrl} alt={plan.title} />
                  <div className="plan-card-overlay" />
                  <div className="plan-days-badge">
                    <span className="days-number">{plan.daysLeft}</span>
                    <span className="days-label">дн.</span>
                  </div>
                </div>

                {/* Event info */}
                <div className="plan-card-body">
                  <div className="plan-card-top">
                    <span className="plan-category" style={{ color: plan.color }}>
                      {plan.category}
                    </span>
                    <div className="plan-card-actions">
                      <button
                        className={`plan-icon-btn ${plan.reminded ? 'active' : ''}`}
                        onClick={() => toggleReminder(plan.id)}
                        title={plan.reminded ? 'Убрать напоминание' : 'Напомнить'}
                      >
                        {plan.reminded
                          ? <Bell className="w-4 h-4" />
                          : <BellOff className="w-4 h-4" />
                        }
                      </button>
                      <button
                        className="plan-icon-btn danger"
                        onClick={() => removePlan(plan.id)}
                        title="Удалить из планов"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="plan-card-title">{plan.title}</h3>

                  <div className="plan-card-meta">
                    <div className="plan-meta-item">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{plan.date}</span>
                    </div>
                    <div className="plan-meta-item">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{plan.time}</span>
                    </div>
                    <div className="plan-meta-item">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{plan.location}</span>
                    </div>
                  </div>

                  <Link href="/feed" className="plan-detail-link">
                    Подробнее <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="plans-empty">
              <div className="plans-empty-icon">
                <Bookmark className="w-12 h-12" />
              </div>
              <h3>Пока пусто</h3>
              <p>Добавляйте мероприятия в планы из Топки или Карты</p>
              <Link href="/feed" className="plans-empty-btn">
                <Sparkles className="w-4 h-4" />
                Открыть Топку
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Past Events */}
      {activeTab === 'past' && (
        <div className="plans-list">
          {PAST_EVENTS.map(event => (
            <div key={event.id} className="plan-card past">
              <div className="plan-card-body">
                <div className="plan-card-top">
                  <span className="plan-category" style={{ color: event.color }}>
                    {event.category}
                  </span>
                </div>
                <h3 className="plan-card-title">{event.title}</h3>
                <div className="plan-card-meta">
                  <div className="plan-meta-item">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{event.date}</span>
                  </div>
                  <div className="plan-meta-item">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{event.location}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
