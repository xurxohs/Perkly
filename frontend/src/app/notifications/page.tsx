'use client';

import { Bell, Ticket, Users, Percent, Flame, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTelegram } from '@/hooks/useTelegram';

const NOTIFICATIONS = [
    {
        id: '1',
        type: 'invite',
        title: 'Запрос в Squad',
        message: 'Алексей хочет добавить вас в компанию на Electric Nights',
        time: '2 мин назад',
        icon: Users,
        color: 'from-blue-500 to-cyan-400',
        action: 'Принять'
    },
    {
        id: '2',
        type: 'reminder',
        title: 'Скоро начало!',
        message: 'Skyline Gala начнется уже через 3 часа. Не забудьте билеты.',
        time: '1 час назад',
        icon: Ticket,
        color: 'from-purple-500 to-pink-500',
        action: 'Билет'
    },
    {
        id: '3',
        type: 'sale',
        title: 'Flash Drop ⚡',
        message: 'Сбросили 50 билетов с 30% скидкой на концерт ЛСП.',
        time: '3 часа назад',
        icon: Percent,
        color: 'from-orange-500 to-red-500',
        action: 'Смотреть'
    },
    {
        id: '4',
        type: 'system',
        title: 'Топка обновлена',
        message: 'Свежая подборка мероприятий на эти выходные уже ждет!',
        time: 'Вчера',
        icon: Flame,
        color: 'from-zinc-500 to-zinc-400',
        action: null
    }
];

export default function NotificationsPage() {
    const router = useRouter();
    const { hapticImpact } = useTelegram();

    const handleAction = (e: React.MouseEvent, type: string) => {
        e.preventDefault();
        hapticImpact('light');
        if (type === 'sale' || type === 'system') router.push('/feed');
        if (type === 'reminder' || type === 'invite') router.push('/plans');
    };

    return (
        <div className="min-h-screen bg-black pb-28">
            {/* Navbar */}
            <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/5 pt-safe px-4 py-3 flex items-center justify-between">
                <button 
                    onClick={() => router.back()} 
                    className="p-2 -ml-2 rounded-full hover:bg-white/10 transition text-white/70"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-white/80" />
                    <span className="font-semibold text-lg">Уведомления</span>
                </div>
                <div className="w-10" /> {/* Spacer */}
            </div>

            <div className="p-4 flex flex-col gap-3">
                {/* Section Header */}
                <h2 className="text-sm font-semibold text-white/40 mt-2 mb-1 px-2 uppercase tracking-wide">
                    Новые
                </h2>

                {NOTIFICATIONS.slice(0, 3).map((notif) => {
                    const Icon = notif.icon;
                    return (
                        <div key={notif.id} className="notification-card">
                            <div className={`notification-icon-wrap bg-gradient-to-br ${notif.color}`}>
                                <Icon className="w-4 h-4 text-white" />
                            </div>
                            <div className="notification-content">
                                <div className="flex items-start justify-between gap-2">
                                    <h4 className="font-semibold text-[15px]">{notif.title}</h4>
                                    <span className="text-[11px] text-white/40 whitespace-nowrap mt-1">{notif.time}</span>
                                </div>
                                <p className="text-sm text-white/60 leading-snug mt-1.5">{notif.message}</p>
                                
                                {notif.action && (
                                    <button 
                                        onClick={(e) => handleAction(e, notif.type)}
                                        className="mt-3 text-xs font-semibold px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors w-fit border border-white/5"
                                    >
                                        {notif.action}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}

                <h2 className="text-sm font-semibold text-white/40 mt-4 mb-1 px-2 uppercase tracking-wide">
                    Ранее
                </h2>

                {NOTIFICATIONS.slice(3).map((notif) => {
                    const Icon = notif.icon;
                    return (
                        <div key={notif.id} className="notification-card opacity-70">
                            <div className={`notification-icon-wrap bg-gradient-to-br ${notif.color}`}>
                                <Icon className="w-4 h-4 text-white" />
                            </div>
                            <div className="notification-content">
                                <div className="flex items-start justify-between gap-2">
                                    <h4 className="font-semibold text-[15px]">{notif.title}</h4>
                                    <span className="text-[11px] text-white/40 whitespace-nowrap mt-1">{notif.time}</span>
                                </div>
                                <p className="text-sm text-white/60 leading-snug mt-1.5">{notif.message}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
