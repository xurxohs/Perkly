'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const STORAGE_KEY = 'perkly-consent-v1';
// Increment whenever the purposes or advertising providers materially change.
const CONSENT_VERSION = 2;

export interface ConsentPreferences {
  analytics: boolean;
  advertising: boolean;
}

interface StoredConsent extends ConsentPreferences {
  version: number;
  updatedAt: string;
}

interface ConsentContextValue {
  ready: boolean;
  hasDecision: boolean;
  preferences: ConsentPreferences;
  openSettings: () => void;
}

const DEFAULT_PREFERENCES: ConsentPreferences = {
  analytics: false,
  advertising: false,
};

const ConsentContext = createContext<ConsentContextValue | null>(null);

function readStoredConsent(): StoredConsent | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<StoredConsent>;
    if (
      parsed.version !== CONSENT_VERSION ||
      typeof parsed.analytics !== 'boolean' ||
      typeof parsed.advertising !== 'boolean'
    ) {
      return null;
    }
    return parsed as StoredConsent;
  } catch {
    return null;
  }
}

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [hasDecision, setHasDecision] = useState(false);
  const [preferences, setPreferences] = useState<ConsentPreferences>(DEFAULT_PREFERENCES);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draft, setDraft] = useState<ConsentPreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const stored = readStoredConsent();
      if (stored) {
        const restored = {
          analytics: stored.analytics,
          advertising: stored.advertising,
        };
        setPreferences(restored);
        setDraft(restored);
        setHasDecision(true);
      }
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const save = useCallback((next: ConsentPreferences) => {
    const stored: StoredConsent = {
      ...next,
      version: CONSENT_VERSION,
      updatedAt: new Date().toISOString(),
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch {
      // Privacy choices still apply for the current session if storage is unavailable.
    }
    setPreferences(next);
    setDraft(next);
    setHasDecision(true);
    setSettingsOpen(false);
    window.dispatchEvent(new CustomEvent('perkly-consent-change', { detail: next }));
  }, []);

  const openSettings = useCallback(() => {
    setDraft(preferences);
    setSettingsOpen(true);
  }, [preferences]);

  useEffect(() => {
    const handleOpenSettings = () => openSettings();
    window.addEventListener('perkly-open-privacy-settings', handleOpenSettings);
    return () => window.removeEventListener('perkly-open-privacy-settings', handleOpenSettings);
  }, [openSettings]);

  const contextValue = useMemo<ConsentContextValue>(() => ({
    ready,
    hasDecision,
    preferences,
    openSettings,
  }), [ready, hasDecision, preferences, openSettings]);

  return (
    <ConsentContext.Provider value={contextValue}>
      {children}

      {ready && !hasDecision && !settingsOpen && (
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="consent-title"
          className="fixed inset-x-4 bottom-4 z-[120] mx-auto max-w-2xl rounded-[24px] border border-white/10 bg-[#17171a]/95 p-5 text-white shadow-2xl backdrop-blur-2xl sm:p-6"
        >
          <h2 id="consent-title" className="text-lg font-bold">Конфиденциальность</h2>
          <p className="mt-2 text-sm leading-6 text-white/60">
            Необходимое хранилище поддерживает вход и безопасность. Аналитику и рекламу мы включаем только с вашего разрешения.
          </p>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => save({ analytics: true, advertising: true })}
              className="h-11 rounded-full border-0 bg-white px-5 text-sm font-bold text-black"
            >
              Разрешить всё
            </button>
            <button
              type="button"
              onClick={() => save(DEFAULT_PREFERENCES)}
              className="h-11 rounded-full border border-white/10 bg-white/5 px-5 text-sm font-semibold text-white"
            >
              Только необходимое
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="h-11 rounded-full border-0 bg-transparent px-5 text-sm font-semibold text-white/65"
            >
              Настроить
            </button>
          </div>
        </section>
      )}

      {ready && settingsOpen && (
        <div className="fixed inset-0 z-[130] flex items-end justify-center bg-black/55 p-4 sm:items-center" role="presentation">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="privacy-settings-title"
            className="w-full max-w-lg rounded-[28px] border border-white/10 bg-[#17171a] p-5 text-white shadow-2xl sm:p-7"
          >
            <h2 id="privacy-settings-title" className="text-xl font-bold">Настройки конфиденциальности</h2>
            <p className="mt-2 text-sm leading-6 text-white/55">Вы можете изменить выбор в любое время.</p>

            <div className="mt-6 space-y-3">
              <ConsentRow
                title="Необходимое"
                description="Вход, безопасность, корзина и выбранная тема. Всегда включено."
                checked
                disabled
                onChange={() => undefined}
              />
              <ConsentRow
                title="Аналитика"
                description="Помогает понять, какие разделы используются, без рекламного профилирования."
                checked={draft.analytics}
                onChange={(checked) => setDraft((current) => ({ ...current, analytics: checked }))}
              />
              <ConsentRow
                title="Реклама"
                description="Разрешает рекламные технологии только на редакционных страницах."
                checked={draft.advertising}
                onChange={(checked) => setDraft((current) => ({ ...current, advertising: checked }))}
              />
            </div>

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => save(draft)}
                className="h-12 flex-1 rounded-full border-0 bg-white px-5 text-sm font-bold text-black"
              >
                Сохранить
              </button>
              {hasDecision && (
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className="h-12 rounded-full border border-white/10 bg-white/5 px-5 text-sm font-semibold text-white"
                >
                  Отмена
                </button>
              )}
            </div>
          </section>
        </div>
      )}

      {ready && hasDecision && !settingsOpen && (
        <button
          type="button"
          onClick={openSettings}
          className="fixed bottom-24 left-4 z-[90] rounded-full border border-white/10 bg-[#17171a]/90 px-3.5 py-2 text-xs font-semibold text-white/65 shadow-lg backdrop-blur-xl md:bottom-4"
        >
          Конфиденциальность
        </button>
      )}
    </ConsentContext.Provider>
  );
}

function ConsentRow({
  title,
  description,
  checked,
  disabled = false,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl bg-white/[0.04] p-4">
      <span>
        <span className="block text-sm font-bold">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-white/45">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-5 w-5 shrink-0 accent-purple-500"
      />
    </label>
  );
}

export function useConsent(): ConsentContextValue {
  const value = useContext(ConsentContext);
  if (!value) throw new Error('useConsent must be used inside ConsentProvider');
  return value;
}
