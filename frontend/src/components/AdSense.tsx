'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { ADSENSE_PUBLISHER_ID, isAdSenseEligiblePath } from '@/lib/adsense-config';
import { useConsent } from '@/components/ConsentManager';

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

const READY_EVENT = 'perkly-adsense-ready';

export function AdSenseRuntime() {
  const pathname = usePathname();
  const { ready, preferences } = useConsent();
  const enabled = Boolean(
    ready &&
    preferences.advertising &&
    ADSENSE_PUBLISHER_ID &&
    isAdSenseEligiblePath(pathname),
  );

  if (!enabled || !ADSENSE_PUBLISHER_ID) return null;

  return (
    <Script
      id="perkly-adsense-runtime"
      async
      strategy="afterInteractive"
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUBLISHER_ID}`}
      onReady={() => {
        window.dispatchEvent(new Event(READY_EVENT));
      }}
    />
  );
}

export function AdSenseSlot({
  slot,
  format = 'auto',
  className = '',
}: {
  slot: string;
  format?: 'auto' | 'fluid' | 'rectangle' | 'horizontal' | 'vertical';
  className?: string;
}) {
  const pathname = usePathname();
  const { ready, preferences } = useConsent();
  const initialized = useRef(false);
  const enabled = Boolean(
    ready &&
    preferences.advertising &&
    ADSENSE_PUBLISHER_ID &&
    /^\d+$/.test(slot) &&
    isAdSenseEligiblePath(pathname),
  );

  useEffect(() => {
    if (!enabled || initialized.current) return;

    const requestAd = () => {
      if (initialized.current) return;
      const script = document.getElementById('perkly-adsense-runtime');
      if (!script) return;
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        initialized.current = true;
      } catch {
        // AdSense can retry after its runtime signals readiness.
      }
    };

    requestAd();
    window.addEventListener(READY_EVENT, requestAd);
    return () => window.removeEventListener(READY_EVENT, requestAd);
  }, [enabled]);

  if (!enabled || !ADSENSE_PUBLISHER_ID) return null;

  return (
    <ins
      className={`adsbygoogle ${className}`.trim()}
      style={{ display: 'block' }}
      data-ad-client={ADSENSE_PUBLISHER_ID}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive="true"
    />
  );
}
