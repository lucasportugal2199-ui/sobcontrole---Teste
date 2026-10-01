// Supported locales
export type Locale = 'pt' | 'en' | 'es' | 'fr' | 'de';

// Locale metadata
export interface LocaleConfig {
  code: Locale;
  name: string;        // Native name (e.g. "Português")
  flag: string;        // Emoji flag
  intlLocale: string;  // BCP 47 tag for Intl APIs (e.g. "pt-BR")
  currency: string;    // Default currency code (e.g. "BRL")
  dateFormat: string;  // Hint label (e.g. "dd/mm/aaaa")
}

export const LOCALE_CONFIGS: Record<Locale, LocaleConfig> = {
  pt: { code: 'pt', name: 'Português', flag: '🇧🇷', intlLocale: 'pt-BR', currency: 'BRL', dateFormat: 'dd/mm/aaaa' },
  en: { code: 'en', name: 'English',   flag: '🇺🇸', intlLocale: 'en-US', currency: 'USD', dateFormat: 'mm/dd/yyyy' },
  es: { code: 'es', name: 'Español',   flag: '🇪🇸', intlLocale: 'es-ES', currency: 'EUR', dateFormat: 'dd/mm/aaaa' },
  fr: { code: 'fr', name: 'Français',  flag: '🇫🇷', intlLocale: 'fr-FR', currency: 'EUR', dateFormat: 'jj/mm/aaaa' },
  de: { code: 'de', name: 'Deutsch',   flag: '🇩🇪', intlLocale: 'de-DE', currency: 'EUR', dateFormat: 'TT.MM.JJJJ' },
};

// Translation dictionary shape — flat key-value map for simplicity & performance
export type TranslationDictionary = Record<string, string>;
