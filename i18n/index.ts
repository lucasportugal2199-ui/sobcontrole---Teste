import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { Locale, LOCALE_CONFIGS, TranslationDictionary } from './types';

// Import all dictionaries
import pt from './locales/pt';
import en from './locales/en';
import es from './locales/es';
import fr from './locales/fr';
import de from './locales/de';

// Registry of all dictionaries
const DICTIONARIES: Record<Locale, TranslationDictionary> = { pt, en, es, fr, de };

// Month key mapping for getMonthNames()
const MONTH_KEYS = [
  'month.january', 'month.february', 'month.march', 'month.april',
  'month.may', 'month.june', 'month.july', 'month.august',
  'month.september', 'month.october', 'month.november', 'month.december',
];

// ============================================================
// DETECT USER LOCALE
// ============================================================
function detectLocale(): Locale {
  // 1. Check localStorage preference
  try {
    const stored = localStorage.getItem('sobcontrole_locale');
    if (stored && stored in DICTIONARIES) return stored as Locale;
  } catch { /* SSR or no localStorage */ }

  // 2. Check navigator language
  if (typeof navigator !== 'undefined') {
    const lang = (navigator.language || '').toLowerCase();
    if (lang.startsWith('pt')) return 'pt';
    if (lang.startsWith('en')) return 'en';
    if (lang.startsWith('es')) return 'es';
    if (lang.startsWith('fr')) return 'fr';
    if (lang.startsWith('de')) return 'de';
  }

  // 3. Default to Portuguese
  return 'pt';
}

// ============================================================
// TRANSLATION INTERFACE
// ============================================================
export interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  formatCurrency: (value: number) => string;
  formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions) => string;
  monthNames: string[];
  intlLocale: string;
  currency: string;
}

// ============================================================
// CONTEXT
// ============================================================
const I18nContext = createContext<I18nContextValue | null>(null);

// ============================================================
// PROVIDER
// ============================================================
export interface I18nProviderProps {
  children: ReactNode;
  initialLocale?: Locale;
  initialCurrency?: string;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children, initialLocale, initialCurrency }) => {
  const [locale, setLocaleState] = useState<Locale>(initialLocale || detectLocale());
  const [customCurrency, setCustomCurrency] = useState<string | undefined>(initialCurrency);

  const config = LOCALE_CONFIGS[locale];
  const dictionary = DICTIONARIES[locale];
  const currency = customCurrency || config.currency;

  // Persist locale to localStorage
  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem('sobcontrole_locale', newLocale);
      // Update HTML lang attribute
      document.documentElement.lang = LOCALE_CONFIGS[newLocale].intlLocale;
    } catch { /* ignore */ }
  }, []);

  // Translation function with interpolation
  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    let text = dictionary[key];
    if (text === undefined) {
      // Fallback to Portuguese, then to the key itself
      text = pt[key] ?? key;
    }
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        text = text.replace(new RegExp(`\\{\\{${paramKey}\\}\\}`, 'g'), String(paramValue));
      });
    }
    return text;
  }, [dictionary]);

  // Currency formatter
  const formatCurrencyFn = useCallback((value: number): string => {
    return new Intl.NumberFormat(config.intlLocale, {
      style: 'currency',
      currency: currency,
    }).format(value);
  }, [config.intlLocale, currency]);

  // Date formatter
  const formatDate = useCallback((date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
    const d = typeof date === 'string' ? new Date(date + (date.length === 10 ? 'T00:00:00' : '')) : date;
    return d.toLocaleDateString(config.intlLocale, options);
  }, [config.intlLocale]);

  // Month names derived from dictionary
  const monthNames = useMemo(() => MONTH_KEYS.map(k => dictionary[k] || pt[k] || k), [dictionary]);

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    setLocale,
    t,
    formatCurrency: formatCurrencyFn,
    formatDate,
    monthNames,
    intlLocale: config.intlLocale,
    currency,
  }), [locale, setLocale, t, formatCurrencyFn, formatDate, monthNames, config.intlLocale, currency]);

  return React.createElement(I18nContext.Provider, { value }, children);
};

// ============================================================
// HOOK
// ============================================================
export function useTranslation(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useTranslation must be used within an I18nProvider');
  return ctx;
}

// Re-export types for convenience
export type { Locale } from './types';
export { LOCALE_CONFIGS } from './types';
export type { TranslationDictionary, LocaleConfig } from './types';
