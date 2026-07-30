'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import api from '@/lib/api';
import { useConsent } from '@/components/ConsentManager';

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const { ready, preferences } = useConsent();

  useEffect(() => {
    if (!ready || !preferences.analytics) {
      sessionStorage.removeItem('perkly_session_id');
      return;
    }

    // Generate session ID if missing
    let sessionId = sessionStorage.getItem('perkly_session_id');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('perkly_session_id', sessionId);
    }

    // Fire PAGE_VIEW analytics event
    api.analytics.trackEvent({
      eventType: 'PAGE_VIEW',
      metadata: JSON.stringify({
        url: window.location.href,
        userAgent: navigator.userAgent,
        referrer: document.referrer,
      })
    }).catch((err) => console.error('Analytics tracking failed:', err));
  }, [pathname, preferences.analytics, ready]);

  return null;
}
