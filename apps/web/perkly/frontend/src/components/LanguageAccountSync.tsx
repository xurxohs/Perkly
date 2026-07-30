'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { usersApi } from '@/lib/api';
import { useLanguage } from '@/lib/i18n';

export function LanguageAccountSync() {
  const { user, refreshUser } = useAuth();
  const { language, setLanguage } = useLanguage();
  const hydratedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      hydratedUserId.current = null;
      return;
    }
    if (hydratedUserId.current !== user.id) {
      hydratedUserId.current = user.id;
      if (user.preferredLanguage && user.preferredLanguage !== language) {
        setLanguage(user.preferredLanguage);
      }
      return;
    }
    if (user.preferredLanguage === language) return;
    const timer = window.setTimeout(() => {
      usersApi.updateProfile({ preferredLanguage: language }).then(() => refreshUser()).catch(() => undefined);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [language, refreshUser, setLanguage, user]);

  return null;
}
