'use client';

import { useRef, useState, useEffect } from 'react';

// ===== Squircle path generator (superellipse, n=4) =====
function makeSquirclePath(W: number, H: number, n = 4): string {
  const pow = (v: number, e: number) => Math.sign(v) * Math.pow(Math.abs(v), e);
  const steps = 64;
  const pts: string[] = [];
  for (let q = 0; q < 4; q++) {
    for (let i = 0; i <= steps; i++) {
      const t = (q * Math.PI) / 2 + (i / steps) * (Math.PI / 2);
      const x = W / 2 + (W / 2) * pow(Math.cos(t), 2 / n);
      const y = H / 2 + (H / 2) * pow(Math.sin(t), 2 / n);
      pts.push(`${i === 0 && q === 0 ? 'M' : 'L'} ${x.toFixed(3)} ${y.toFixed(3)}`);
    }
  }
  return pts.join(' ') + ' Z';
}

// ===== Unique ID counter =====
let idCounter = 0;

export interface NewsItem {
  id: string;
  title: string;
  imageUrl: string;
  date: string;
}

export default function NewsCard({
  item,
  index,
}: {
  item: NewsItem;
  index: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [clipId] = useState(() => `squircle-clip-${++idCounter}`);

  const cardHeight = index === 0 ? 300 : 220;

  // Measure container width via ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const squirclePath = width > 0 ? makeSquirclePath(width, cardHeight) : '';

  // Format date
  const formattedDate = (() => {
    try {
      return new Date(item.date).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return item.date;
    }
  })();

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        marginBottom: 16,
        position: 'relative',
        height: cardHeight,
      }}
    >
      {/* Hidden SVG with clipPath definition */}
      {width > 0 && (
        <svg
          style={{ width: 0, height: 0, position: 'absolute' }}
          aria-hidden="true"
        >
          <defs>
            <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
              <path d={squirclePath} />
            </clipPath>
          </defs>
        </svg>
      )}

      {/* Clipped inner container */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          clipPath: width > 0 ? `url(#${clipId})` : undefined,
          overflow: 'hidden',
        }}
      >
        {/* Layer 1: Image (base, not absolute) */}
        {/* Event media can be proxied from approved API sources with dynamic hosts. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imageUrl}
          alt={item.title}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />

        {/* Layer 2: Gradient overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              'linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.45) 60%, rgba(0,0,0,0.75) 100%)',
          }}
        />

        {/* Layer 3: Text content */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: 16,
          }}
        >
          <div
            style={{
              color: '#fff',
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            {item.title}
          </div>
          <div
            style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: 13,
              marginTop: 4,
            }}
          >
            {formattedDate}
          </div>
        </div>
      </div>
    </div>
  );
}
