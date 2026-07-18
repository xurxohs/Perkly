'use client';

import Image from 'next/image';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

export function OfferGallery({ images, title }: { images: string[]; title: string }) {
    const [active, setActive] = useState(0);
    const [fullscreen, setFullscreen] = useState(false);
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
        <button type="button" onClick={() => setFullscreen(true)} className="relative block aspect-[4/3] w-full overflow-hidden rounded-[28px] border border-white/[0.07] bg-white/[0.025]" aria-label="Открыть галерею">
            <Image src={safeImages[active]} alt={`${title}, фото ${active + 1}`} fill priority className="object-contain p-5" sizes="(max-width: 768px) 100vw, 50vw" />
            {safeImages.length > 1 && <span className="absolute bottom-3 right-3 rounded-full bg-black/65 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">{active + 1} / {safeImages.length}</span>}
        </button>
        {safeImages.length > 1 && <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{safeImages.map((source, index) => <button type="button" key={`${source}-${index}`} onClick={() => setActive(index)} className={`relative aspect-[16/10] w-24 shrink-0 overflow-hidden rounded-2xl border ${active === index ? 'border-purple-400' : 'border-white/[0.07]'}`}><Image src={source} alt={`Фото ${index + 1}`} fill sizes="96px" className="object-cover" /></button>)}</div>}
        {fullscreen && <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/95 p-4 backdrop-blur-xl" role="dialog" aria-modal="true"><button onClick={() => setFullscreen(false)} className="absolute right-4 top-4 rounded-full bg-white/10 p-3 text-white" aria-label="Закрыть"><X /></button>{safeImages.length > 1 && <button onClick={() => show(active - 1)} className="absolute left-3 rounded-full bg-white/10 p-3 text-white" aria-label="Предыдущее фото"><ChevronLeft /></button>}<div className="relative h-[85vh] w-[88vw]"><Image src={safeImages[active]} alt={`${title}, фото ${active + 1}`} fill sizes="100vw" className="object-contain" /></div>{safeImages.length > 1 && <button onClick={() => show(active + 1)} className="absolute right-3 rounded-full bg-white/10 p-3 text-white" aria-label="Следующее фото"><ChevronRight /></button>}<span className="absolute bottom-5 text-sm font-semibold text-white/70">{active + 1} из {safeImages.length}</span></div>}
    </>;
}
