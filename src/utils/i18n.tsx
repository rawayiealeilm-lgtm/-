import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {Language} from '../types';

const LANG_STORAGE_KEY = 'mawaedh_lang_v1';

interface I18nContextValue {
  lang: Language;
  isEn: boolean;
  setLang: (next: Language) => void;
  toggleLang: () => void;
  tr: (ar: string, en: string) => string;
  formatNumber: (n: number) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function loadInitialLang(): Language {
  if (typeof window === 'undefined') return 'ar';
  try {
    const saved = window.localStorage.getItem(LANG_STORAGE_KEY);
    return saved === 'en' ? 'en' : 'ar';
  } catch {
    return 'ar';
  }
}

export function LanguageProvider({children}: {children: ReactNode}) {
  const [lang, setLangState] = useState<Language>(() => loadInitialLang());

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang === 'en' ? 'en' : 'ar';
      document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl';
      document.title =
        lang === 'en'
          ? 'Mawaedh & Ibar — Timeless Islamic Wisdom & Knowledge'
          : 'مواعظ وعبر — نفحات إيمانية وحكم خالدة';
    }
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // Ignore storage failure
    }
  }, [lang]);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
  }, []);

  const toggleLang = useCallback(() => {
    setLangState((prev) => (prev === 'ar' ? 'en' : 'ar'));
  }, []);

  const tr = useCallback((ar: string, en: string) => (lang === 'en' ? en : ar), [lang]);

  const formatNumber = useCallback(
    (n: number) => n.toLocaleString(lang === 'en' ? 'en-US' : 'ar-EG'),
    [lang],
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      lang,
      isEn: lang === 'en',
      setLang,
      toggleLang,
      tr,
      formatNumber,
    }),
    [lang, setLang, toggleLang, tr, formatNumber],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return {
      lang: 'ar',
      isEn: false,
      setLang: () => undefined,
      toggleLang: () => undefined,
      tr: (ar: string) => ar,
      formatNumber: (n: number) => n.toLocaleString('ar-EG'),
    };
  }
  return ctx;
}
