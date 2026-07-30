'use client';

import { Languages } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

export function LanguageSwitcher({ compact = false, className = '' }: { compact?: boolean; className?: string }) {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      className={`language-switcher inline-flex items-center rounded-full border border-white/10 bg-white/[0.055] p-0.5 backdrop-blur-xl ${className}`}
      role="group"
      aria-label={language === 'ru' ? 'Язык' : 'Til'}
      data-no-translate
    >
      {!compact && <Languages aria-hidden="true" className="ml-1.5 h-3.5 w-3.5 text-current opacity-55" />}
      {(['ru', 'uz'] as const).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => setLanguage(item)}
          aria-pressed={language === item}
          aria-label={item === 'ru' ? 'Русский' : 'O‘zbekcha'}
          className={`min-w-8 rounded-full border-0 px-2 py-1 text-[11px] font-semibold tracking-wide transition-colors ${
            language === item ? 'bg-white text-black shadow-sm' : 'bg-transparent text-current opacity-55 hover:opacity-90'
          }`}
        >
          {item === 'ru' ? 'RU' : 'UZ'}
        </button>
      ))}
    </div>
  );
}
