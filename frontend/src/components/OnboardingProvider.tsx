'use client';

import { useState, useEffect } from 'react';
import { Flame, Ticket, MessageCircle, ChevronRight, Sparkles } from 'lucide-react';
import { useTelegram } from '@/hooks/useTelegram';

const SLIDES = [
    {
        id: 'discover',
        icon: Flame,
        title: 'Залетай в Топку',
        description: 'Свайпай самые горячие ивенты, фестивали и вечеринки в твоём городе. Как в TikTok, только про реальную жизнь.',
        color: '#f97316', // Orange
        glow: 'rgba(249, 115, 22, 0.5)'
    },
    {
        id: 'plan',
        icon: Ticket,
        title: 'Строй планы',
        description: 'Сохраняй билеты, ставь напоминания и обсуждай с друзьями куда пойти на этих выходных.',
        color: '#a855f7', // Purple
        glow: 'rgba(168, 85, 247, 0.5)'
    },
    {
        id: 'chat',
        icon: MessageCircle,
        title: 'Общайся',
        description: 'Знакомься с теми, кто тоже идёт на тусовку. Ищи компанию прямо в чате мероприятия.',
        color: '#06b6d4', // Cyan
        glow: 'rgba(6, 182, 212, 0.5)'
    }
];

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [animating, setAnimating] = useState(false);
    const { hapticImpact } = useTelegram();

    useEffect(() => {
        // Check if user has already seen onboarding
        const hasOnboarded = localStorage.getItem('perkly_onboarded');
        // UNCOMMENT THIS TO BYPASS DURING DEV FOR EASY TEST
        // if (!hasOnboarded) {
        //     setShowOnboarding(true);
        // }
        // FORCE SHOW FOR DEMONSTRATION PURPOSES:
        if (localStorage.getItem('perkly_onboarded_v2') !== 'true') {
            setShowOnboarding(true);
        }
    }, []);

    const handleNext = () => {
        hapticImpact('light');
        if (animating) return;
        
        if (currentSlide < SLIDES.length - 1) {
            setAnimating(true);
            setTimeout(() => {
                setCurrentSlide(prev => prev + 1);
                setAnimating(false);
            }, 300); // transition duration
        } else {
            // Finish
            hapticImpact('heavy');
            localStorage.setItem('perkly_onboarded_v2', 'true');
            setShowOnboarding(false);
        }
    };

    if (!showOnboarding) {
        return <>{children}</>;
    }

    const slide = SLIDES[currentSlide];
    const Icon = slide.icon;

    return (
        <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col items-center justify-between overflow-hidden">
            {/* Background effects */}
            <div 
                className="absolute inset-0 transition-opacity duration-1000 ease-in-out opacity-40 mix-blend-screen pointer-events-none"
                style={{
                    background: `radial-gradient(circle at 50% 30%, ${slide.glow} 0%, transparent 70%)`
                }}
            />
            
            {/* Top: Progress dots */}
            <div className="w-full flex justify-center gap-2 pt-12 z-10">
                {SLIDES.map((s, i) => (
                    <div 
                        key={s.id} 
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                            i === currentSlide ? 'w-8 bg-white' : 'w-2 bg-white/20'
                        }`} 
                    />
                ))}
            </div>

            {/* Middle: Content */}
            <div className={`flex flex-col items-center text-center px-6 transition-all duration-300 ease-out z-10 w-full max-w-sm
                ${animating ? 'opacity-0 scale-95 translate-y-4' : 'opacity-100 scale-100 translate-y-0'}
            `}>
                <div 
                    className="w-24 h-24 rounded-3xl flex items-center justify-center mb-8 shadow-2xl relative"
                    style={{ background: `linear-gradient(135deg, ${slide.color}, #000)` }}
                >
                    <div className="absolute inset-0 rounded-3xl opacity-50" style={{ boxShadow: `0 0 30px ${slide.color}` }} />
                    <Icon className="w-12 h-12 text-white relative z-10 drop-shadow-md" />
                </div>
                
                <h1 className="text-3xl font-bold mb-4 tracking-tight flex items-center justify-center gap-2">
                    {slide.title}
                    {currentSlide === 0 && <Sparkles className="w-6 h-6 text-orange-400" />}
                </h1>
                
                <p className="text-[15px] leading-relaxed text-white/60 font-medium">
                    {slide.description}
                </p>
            </div>

            {/* Bottom: Action */}
            <div className="w-full px-6 pb-[env(safe-area-inset-bottom,32px)] pt-8 z-10">
                <button
                    onClick={handleNext}
                    className="w-full h-[56px] rounded-full bg-white text-black font-semibold text-[17px] flex items-center justify-center gap-2 shadow-white-glow active:scale-[0.98] transition-all"
                >
                    {currentSlide === SLIDES.length - 1 ? 'Погнали' : 'Дальше'}
                    {currentSlide < SLIDES.length - 1 && <ChevronRight className="w-5 h-5 -mx-1" />}
                </button>
            </div>
            
            {/* Children rendered behind */}
            <div className="hidden">{children}</div>
        </div>
    );
}
