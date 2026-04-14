'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Coins, Ticket, Coffee } from 'lucide-react';
import React from 'react';

interface Prize {
    label: string;
    shortLabel: string;
    color: string;
    icon: string;
    probability: number; // weight
    value: string;
    description: string;
}

const PRIZES: Prize[] = [
    { label: '10 Perkly Points', shortLabel: '10', color: '#ef4444', icon: '🪙', probability: 30, value: '10pp', description: 'Вам начислено 10 Perkly Points!' },
    { label: 'Скидка 5%', shortLabel: '5%', color: '#f97316', icon: '🏷️', probability: 25, value: '5off', description: 'Скидка 5% на любую покупку!' },
    { label: '25 Perkly Points', shortLabel: '25', color: '#eab308', icon: '🪙', probability: 20, value: '25pp', description: 'Отлично! 25 Perkly Points!' },
    { label: 'Бесплатный кофе', shortLabel: '☕', color: '#22c55e', icon: '☕', probability: 8, value: 'coffee', description: 'Промокод на бесплатный кофе в Safia!' },
    { label: '50 Perkly Points', shortLabel: '50', color: '#3b82f6', icon: '💎', probability: 10, value: '50pp', description: 'Вау! 50 Perkly Points на ваш счёт!' },
    { label: 'Скидка 15%', shortLabel: '15%', color: '#a855f7', icon: '🔥', probability: 5, value: '15off', description: 'Суперскидка 15% на любой товар!' },
    { label: '100 Perkly Points', shortLabel: '100', color: '#ec4899', icon: '👑', probability: 1, value: '100pp', description: '🎉 ДЖЕКПОТ! 100 Perkly Points!' },
    { label: 'Попробуйте ещё', shortLabel: '🔄', color: '#f59e0b', icon: '🔄', probability: 1, value: 'retry', description: 'Не повезло... Попробуйте завтра!' },
];

const SEGMENT_ANGLE = 360 / PRIZES.length;
const SPIN_DURATION = 5000; // ms
const DAILY_LIMIT = 3;

function getWeightedRandom(): number {
    const totalWeight = PRIZES.reduce((sum, p) => sum + p.probability, 0);
    let random = Math.random() * totalWeight;
    for (let i = 0; i < PRIZES.length; i++) {
        random -= PRIZES[i].probability;
        if (random <= 0) return i;
    }
    return 0;
}

function recordSpin() {
    const today = new Date().toDateString();
    const data = localStorage.getItem('perkly_wheel');
    let spins = 1;
    try {
        const parsed = data ? JSON.parse(data) : null;
        if (parsed?.date === today) spins = (parsed.spins || 0) + 1;
    } catch { }
    localStorage.setItem('perkly_wheel', JSON.stringify({ date: today, spins }));
}

export default function FortuneWheel() {
    const [rotation, setRotation] = useState(0);
    const [isSpinning, setIsSpinning] = useState(false);
    const [prize, setPrize] = useState<Prize | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [spinsLeft, setSpinsLeft] = useState<number>(() => {
        if (typeof window === 'undefined') return DAILY_LIMIT;
        // Force reset limit for the user as requested
        localStorage.removeItem('perkly_wheel');
        return DAILY_LIMIT;
    });
    const [totalPoints, setTotalPoints] = useState<number>(() => {
        if (typeof window === 'undefined') return 0;
        const pts = localStorage.getItem('perkly_points');
        return pts ? parseInt(pts) : 0;
    });
    const wheelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Any other non-state-setting initialization can go here
    }, []);

    const resetSpins = () => {
        localStorage.removeItem('perkly_wheel');
        setSpinsLeft(DAILY_LIMIT);
    };

    const spin = () => {
        if (isSpinning || spinsLeft <= 0) return;

        setIsSpinning(true);
        setPrize(null);
        setShowModal(false);

        const winIndex = getWeightedRandom();
        const segmentCenter = winIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
        const fullSpins = 5 + Math.floor(Math.random() * 3);
        const targetRotation = fullSpins * 360 + (360 - segmentCenter);

        setRotation(prev => prev + targetRotation);

        recordSpin();
        setSpinsLeft(prev => prev - 1);

        setTimeout(() => {
            setIsSpinning(false);
            const won = PRIZES[winIndex];
            setPrize(won);
            setShowModal(true);

            if (won.value.endsWith('pp')) {
                const ptsValue = parseInt(won.value);
                const current = parseInt(localStorage.getItem('perkly_points') || '0');
                const newTotal = current + ptsValue;
                localStorage.setItem('perkly_points', String(newTotal));
                setTotalPoints(newTotal);
            }
        }, SPIN_DURATION + 300);
    };

    return (
        <div className="flex flex-col items-center">
            {/* Points display */}
            <div className="flex items-center gap-2 mb-8 px-4 py-2 rounded-full badge-balance">
                <Coins className="w-5 h-5 text-yellow-400" />
                <span className="text-sm font-semibold text-white">Баланс: <span className="text-yellow-400">{totalPoints}</span> Perkly Points</span>
            </div>

            {/* Wheel container */}
            <div className="relative mb-8 w-80 h-80">
                {/* Outer glow */}
                <div className={`absolute inset-0 rounded-full ${isSpinning ? 'animate-pulse-neon-wheel-fast' : 'animate-pulse-neon-wheel'}`} />

                {/* Pointer (top center) */}
                <div className="absolute -top-3 left-1/2 -track-x-1/2 z-20">
                    <div className="wheel-pointer" />
                </div>

                {/* Spinning wheel */}
                <div
                    ref={wheelRef}
                    className="w-full h-full rounded-full relative overflow-hidden wheel-inner-glow transition-transform"
                    style={{
                        transform: `rotate(${rotation}deg)`,
                        transitionDuration: isSpinning ? `${SPIN_DURATION}ms` : '0ms',
                        transitionTimingFunction: 'cubic-bezier(0.17, 0.67, 0.12, 0.99)'
                    } as React.CSSProperties}
                >
                    {/* SVG segments */}
                    <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
                        {PRIZES.map((p, i) => {
                            const startAngle = i * SEGMENT_ANGLE;
                            const endAngle = startAngle + SEGMENT_ANGLE;
                            const startRad = (startAngle * Math.PI) / 180;
                            const endRad = (endAngle * Math.PI) / 180;
                            const x1 = 100 + 100 * Math.cos(startRad);
                            const y1 = 100 + 100 * Math.sin(startRad);
                            const x2 = 100 + 100 * Math.cos(endRad);
                            const y2 = 100 + 100 * Math.sin(endRad);
                            const largeArc = 0;

                            const midAngle = ((startAngle + endAngle) / 2 * Math.PI) / 180;
                            const labelR = 65;
                            const lx = 100 + labelR * Math.cos(midAngle);
                            const ly = 100 + labelR * Math.sin(midAngle);
                            const labelAngle = (startAngle + endAngle) / 2 + 90;

                            return (
                                <g key={i}>
                                    <path
                                        d={`M 100 100 L ${x1} ${y1} A 100 100 0 ${largeArc} 1 ${x2} ${y2} Z`}
                                        fill={p.color}
                                        stroke="rgba(0,0,0,0.3)"
                                        strokeWidth="0.5"
                                    />
                                    <text
                                        x={lx}
                                        y={ly}
                                        textAnchor="middle"
                                        dominantBaseline="central"
                                        fill="white"
                                        fontSize="10"
                                        fontWeight="800"
                                        transform={`rotate(${labelAngle}, ${lx}, ${ly})`}
                                        className="drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]"
                                    >
                                        {p.shortLabel}
                                    </text>
                                </g>
                            );
                        })}
                    </svg>

                    {/* Center button */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center wheel-center-bulb">
                            <span className="text-2xl font-black text-[#78230f]/70">P</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Spins left */}
            <div className="text-center mb-6">
                <div className="text-sm text-white/40 mb-2">
                    Осталось попыток сегодня: <span className="text-white font-bold">{spinsLeft}</span> / {DAILY_LIMIT}
                </div>
                <div className="flex gap-1.5 justify-center flex-wrap max-w-[120px]">
                    {Array.from({ length: DAILY_LIMIT }).map((_, i) => (
                        <div
                            key={i}
                            className={`w-2.5 h-2.5 rounded-full transition-all ${
                                i < spinsLeft ? 'bg-primary-gradient shadow-primary-glow' : 'bg-white/10'
                            }`}
                        />
                    ))}
                </div>
            </div>

            {/* Spin button */}
            <div className="flex flex-col gap-2 w-full px-8">
                <button
                    onClick={spin}
                    disabled={isSpinning || spinsLeft <= 0}
                    className={`w-full py-4 rounded-2xl text-white font-bold text-lg cursor-pointer transition-all duration-300 ${
                        isSpinning ? 'bg-white/5 opacity-50 cursor-not-allowed' :
                        spinsLeft <= 0 ? 'bg-white/10 opacity-50 cursor-not-allowed' :
                        'bg-primary-gradient shadow-[0_0_30_rgba(168,85,247,0.3),0_0_60_rgba(168,85,247,0.1)] hover:opacity-90'
                    }`}
                    title={isSpinning ? "Колесо крутится" : spinsLeft <= 0 ? "Приходите завтра" : "Крутить бесплатно"}
                >
                    {isSpinning ? '🎰 Крутится...' : spinsLeft <= 0 ? 'Приходите завтра!' : '🎰 Крутить Бесплатно'}
                </button>

                {spinsLeft <= 3 && !isSpinning && (
                    <button
                        onClick={resetSpins}
                        className="text-[10px] text-white/10 hover:text-white/30 transition-colors uppercase tracking-widest bg-transparent border-0 cursor-pointer pt-4"
                        title="Сбросить попытки (для разработчиков)"
                    >
                        [ Разработчик: Сбросить попытки ]
                    </button>
                )}
            </div>

            {/* Prize history hint */}
            <p className="text-xs text-white/20 mt-4 text-center max-w-xs">
                Каждый день вы получаете {DAILY_LIMIT} бесплатных попыток. Выигранные баллы начисляются автоматически.
            </p>

            {/* ======== PRIZE MODAL ======== */}
            {showModal && prize && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="relative max-w-sm w-full rounded-3xl p-8 text-center bg-[#0a0a0ab2] border border-[#a855f720] shadow-[0_0_60px_rgba(168,85,247,0.15)]">
                        <button 
                            onClick={() => setShowModal(false)} 
                            className="absolute top-4 right-4 text-white/30 hover:text-white transition cursor-pointer bg-transparent border-0"
                            title="Закрыть"
                            aria-label="Закрыть"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="text-6xl mb-4">{prize.icon}</div>

                        <h3 className="text-2xl font-extrabold text-white mb-2">
                            {prize.value === 'retry' ? 'Не повезло!' : 'Поздравляем! 🎉'}
                        </h3>

                        <div className="text-lg font-bold mb-3" style={{ color: prize.color } as React.CSSProperties}>
                            {prize.label}
                        </div>

                        <p className="text-white/50 text-sm mb-6">{prize.description}</p>

                        {prize.value !== 'retry' && (
                            <div 
                                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl mb-6 border"
                                style={{ 
                                    backgroundColor: `${prize.color}15`, 
                                    borderColor: `${prize.color}30` 
                                } as React.CSSProperties}
                            >
                                {prize.value.endsWith('pp') ? (
                                    <Coins className="w-5 h-5 text-yellow-400" />
                                ) : prize.value === 'coffee' ? (
                                    <Coffee className="w-5 h-5 text-green-400" />
                                ) : (
                                    <Ticket className="w-5 h-5 text-purple-400" />
                                )}
                                <span className="font-bold text-white">{prize.label}</span>
                            </div>
                        )}

                        <button
                            onClick={() => setShowModal(false)}
                            className={`w-full py-3 rounded-xl text-white font-semibold cursor-pointer border-0 transition-opacity hover:opacity-90 ${
                                prize.value === 'retry' ? 'bg-white/5 shadow-none' : ''
                            }`}
                            style={prize.value !== 'retry' ? {
                                background: `linear-gradient(135deg, ${prize.color}, ${prize.color}cc)`,
                                boxShadow: `0 0 20px ${prize.color}30`,
                            } as React.CSSProperties : {}}
                        >
                            {prize.value === 'retry' ? 'Закрыть' : 'Забрать приз!'}
                        </button>

                        <p className="text-xs text-white/30 mt-4">
                            Осталось попыток: {spinsLeft}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
