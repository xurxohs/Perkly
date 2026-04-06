'use client';

import { useEffect } from 'react';
import api from '@/lib/api';

export default function AnalyticsTracker() {
  useEffect(() => {
    // Generate session ID if missing
    let sessionId = sessionStorage.getItem('perkly_session_id');
    if (!sessionId) {
      sessionId = Math.random().toString(36).substring(2, 15);
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
  }, []);

  return null;
}
