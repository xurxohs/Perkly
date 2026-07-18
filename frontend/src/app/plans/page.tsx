'use client';

import { Bookmark, CalendarDays, Clock, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

type Tab = 'upcoming' | 'past';

export default function PlansPage() {
  const [activeTab, setActiveTab] = useState<Tab>('upcoming');

  return (
    <main className="plans-page">
      <header className="plans-header">
        <div className="plans-header-content">
          <h1 className="plans-title">Мои планы</h1>
          <p className="plans-subtitle">Сохранённые мероприятия появятся здесь после добавления</p>
        </div>
      </header>

      <div className="plans-tabs" role="tablist" aria-label="Планы">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'upcoming'}
          className={`plans-tab ${activeTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('upcoming')}
        >
          <CalendarDays className="h-4 w-4" />
          Предстоящие
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'past'}
          className={`plans-tab ${activeTab === 'past' ? 'active' : ''}`}
          onClick={() => setActiveTab('past')}
        >
          <Clock className="h-4 w-4" />
          Прошедшие
        </button>
      </div>

      <section className="plans-list" role="tabpanel">
        <div className="plans-empty">
          <div className="plans-empty-icon">
            <Bookmark className="h-12 w-12" />
          </div>
          <h2>{activeTab === 'upcoming' ? 'Планов пока нет' : 'История пока пуста'}</h2>
          <p>
            {activeTab === 'upcoming'
              ? 'Когда сохранение мероприятий станет доступно, выбранные события будут отображаться здесь.'
              : 'Завершённые сохранённые события появятся после запуска функции планов.'}
          </p>
          <Link href="/feed" className="plans-empty-btn">
            <Sparkles className="h-4 w-4" />
            Открыть Топку
          </Link>
        </div>
      </section>
    </main>
  );
}
