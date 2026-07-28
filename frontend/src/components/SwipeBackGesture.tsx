'use client';

import { ChevronLeft } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

const EDGE_WIDTH = 30;
const COMMIT_DISTANCE = 96;

export function SwipeBackGesture() {
  const pathname = usePathname();
  const router = useRouter();
  const start = useRef({ x: 0, y: 0, time: 0 });
  const distance = useRef(0);
  const tracking = useRef(false);

  useEffect(() => {
    const root = document.documentElement;
    const reset = () => {
      tracking.current = false;
      distance.current = 0;
      root.classList.remove('swipe-back-active', 'swipe-back-commit');
      root.style.removeProperty('--swipe-back-x');
      root.style.removeProperty('--swipe-back-opacity');
    };

    const onTouchStart = (event: TouchEvent) => {
      if (pathname === '/' || event.touches.length !== 1 || window.innerWidth > 820) return;
      const touch = event.touches[0];
      if (touch.clientX > EDGE_WIDTH) return;
      start.current = { x: touch.clientX, y: touch.clientY, time: performance.now() };
      distance.current = 0;
      tracking.current = true;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!tracking.current || event.touches.length !== 1) return;
      const touch = event.touches[0];
      const dx = Math.max(0, touch.clientX - start.current.x);
      const dy = Math.abs(touch.clientY - start.current.y);
      if (dy > dx && dx < 18) return;
      if (dx < 8) return;
      event.preventDefault();
      distance.current = dx;
      const eased = Math.min(window.innerWidth * .72, dx * .92);
      root.classList.add('swipe-back-active');
      root.style.setProperty('--swipe-back-x', `${eased}px`);
      root.style.setProperty('--swipe-back-opacity', String(Math.min(1, dx / COMMIT_DISTANCE)));
    };

    const onTouchEnd = () => {
      if (!tracking.current) return;
      const elapsed = Math.max(1, performance.now() - start.current.time);
      const velocity = distance.current / elapsed;
      const shouldCommit = distance.current >= COMMIT_DISTANCE || (distance.current > 48 && velocity > .55);
      if (!shouldCommit) {
        root.classList.add('swipe-back-commit');
        root.style.setProperty('--swipe-back-x', '0px');
        root.style.setProperty('--swipe-back-opacity', '0');
        window.setTimeout(reset, 220);
        return;
      }
      root.classList.add('swipe-back-commit');
      root.style.setProperty('--swipe-back-x', '100vw');
      root.style.setProperty('--swipe-back-opacity', '1');
      window.setTimeout(() => {
        if (window.history.length > 1) router.back();
        else router.push('/');
        window.setTimeout(reset, 120);
      }, 170);
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', reset, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', reset);
      reset();
    };
  }, [pathname, router]);

  return <div className="swipe-back-indicator" aria-hidden="true"><ChevronLeft /></div>;
}
