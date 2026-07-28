'use client';

import Image from 'next/image';
import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

export function OfferGallery({ images, title }: { images: string[]; title: string }) {
    const [active, setActive] = useState(0);
    const [fullscreen, setFullscreen] = useState(false);
    const touchStartX = useRef<number | null>(null);
    const safeImages = images.filter(Boolean);
    const show = useCallback((index: number) => setActive((index + safeImages.length) % safeImages.length), [safeImages.length]);

    useEffect(() => {
        if (!fullscreen) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setFullscreen(false);
            if (event.key === 'ArrowLeft') show(active - 1);
            if (event.key === 'ArrowRight') show(active + 1);
        };
        window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
    }, [fullscreen, active, show]);

    if (!safeImages.length) return null;
    return <>
        <button
            type="button"
            onClick={() => setFullscreen(true)}
            onTouchStart={(event) => { touchStartX.current = event.touches[0]?.clientX ?? null; }}
            onTouchEnd={(event) => {
                if (touchStartX.current == null || safeImages.length < 2) return;
                const delta = event.changedTouches[0].clientX - touchStartX.current;
                if (Math.abs(delta) > 45) show(active + (delta < 0 ? 1 : -1));
                touchStartX.current = null;
            }}
            className="offer-gallery-main"
            aria-label="Открыть галерею"
        >
            <Image src={safeImages[active]} alt={`${title}, фото ${active + 1}`} fill priority className="offer-gallery-image" sizes="(max-width: 768px) 100vw, 48vw" />
            <span className="offer-gallery-expand"><Expand aria-hidden="true" /></span>
            {safeImages.length > 1 && <span className="offer-gallery-count">{active + 1} / {safeImages.length}</span>}
        </button>
        {safeImages.length > 1 && <div className="offer-gallery-thumbs">{safeImages.map((source, index) => <button type="button" key={`${source}-${index}`} onClick={() => setActive(index)} className={active === index ? 'is-active' : ''} aria-label={`Показать фото ${index + 1}`}><Image src={source} alt="" fill sizes="88px" className="object-cover" /></button>)}</div>}
        {fullscreen && <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-[#0A0F24]/95 p-4 backdrop-blur-xl" role="dialog" aria-modal="true"><button onClick={() => setFullscreen(false)} className="absolute right-4 top-4 rounded-full bg-white/10 p-3 text-white" aria-label="Закрыть"><X /></button>{safeImages.length > 1 && <button onClick={() => show(active - 1)} className="absolute left-3 rounded-full bg-white/10 p-3 text-white" aria-label="Предыдущее фото"><ChevronLeft /></button>}<div className="relative h-[85vh] w-[88vw]"><Image src={safeImages[active]} alt={`${title}, фото ${active + 1}`} fill sizes="100vw" className="object-contain" /></div>{safeImages.length > 1 && <button onClick={() => show(active + 1)} className="absolute right-3 rounded-full bg-white/10 p-3 text-white" aria-label="Следующее фото"><ChevronRight /></button>}<span className="absolute bottom-5 text-sm font-semibold text-white/70">{active + 1} из {safeImages.length}</span></div>}
    </>;
}
