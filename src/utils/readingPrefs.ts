import {useEffect, useState} from 'react';

export type ReadingFontSize = 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
export type ReadingFontFamily = 'naskh' | 'amiri' | 'scheherazade' | 'cairo' | 'ibm';
export type ReadingThemeMode = 'follow' | 'light' | 'dark';

export interface ReadingPrefs {
  fontSize: ReadingFontSize;
  fontFamily: ReadingFontFamily;
  readingTheme: ReadingThemeMode;
}

const READING_PREFS_KEY = 'mawaedh_reading_prefs_v1';
const READING_PREFS_EVENT = 'mawaedh:reading-prefs-change';

export const DEFAULT_READING_PREFS: ReadingPrefs = {
  fontSize: 'md',
  fontFamily: 'naskh',
  readingTheme: 'follow',
};

export const FONT_FAMILY_OPTIONS: Array<{
  id: ReadingFontFamily;
  label: string;
  shortLabel: string;
  cssFamily: string;
  sample: string;
}> = [
  {
    id: 'naskh',
    label: 'نسخ مريح (نوتو نسخ)',
    shortLabel: 'نوتو نسخ',
    cssFamily: '"Noto Naskh Arabic", "IBM Plex Sans Arabic", "Traditional Arabic", serif',
    sample: 'بِسْمِ اللَّهِ',
  },
  {
    id: 'amiri',
    label: 'النسخ الكلاسيكي (الأميري)',
    shortLabel: 'الأميري',
    cssFamily: '"Amiri", "Traditional Arabic", Georgia, serif',
    sample: 'بِسْمِ اللَّهِ',
  },
  {
    id: 'scheherazade',
    label: 'الخط القرآني (شهرزاد)',
    shortLabel: 'القرآني',
    cssFamily: '"Scheherazade New", "Amiri", "Traditional Arabic", serif',
    sample: 'بِسْمِ اللَّهِ',
  },
  {
    id: 'cairo',
    label: 'خط واضح وعريض (القاهرة)',
    shortLabel: 'القاهرة',
    cssFamily: '"Cairo", "IBM Plex Sans Arabic", system-ui, sans-serif',
    sample: 'بِسْمِ اللَّهِ',
  },
  {
    id: 'ibm',
    label: 'خط عصري متزن (آي بي إم)',
    shortLabel: 'عصري',
    cssFamily: '"IBM Plex Sans Arabic", "Cairo", system-ui, sans-serif',
    sample: 'بِسْمِ اللَّهِ',
  },
];

export const FONT_SIZE_STEPS: Array<{
  id: ReadingFontSize;
  label: string;
  shortLabel: string;
  pxValue: number;
  lineHeightValue: number;
  bodyClass: string;
  cardExcerptClass: string;
  quranClass: string;
}> = [
  {
    id: 'sm',
    label: 'صغير',
    shortLabel: 'A-',
    pxValue: 15,
    lineHeightValue: 1.75,
    bodyClass: 'text-[15px] leading-[1.75]',
    cardExcerptClass: 'text-[15px] leading-[1.7]',
    quranClass: 'text-lg sm:text-xl leading-[2.1]',
  },
  {
    id: 'md',
    label: 'متوسط (الافتراضي)',
    shortLabel: 'A',
    pxValue: 18,
    lineHeightValue: 1.8,
    bodyClass: 'text-[18px] leading-[1.8]',
    cardExcerptClass: 'text-[18px] leading-[1.8]',
    quranClass: 'text-xl sm:text-2xl leading-[2.3]',
  },
  {
    id: 'lg',
    label: 'كبير',
    shortLabel: 'A+',
    pxValue: 20,
    lineHeightValue: 1.9,
    bodyClass: 'text-[20px] leading-[1.9]',
    cardExcerptClass: 'text-[20px] leading-[1.85]',
    quranClass: 'text-2xl sm:text-3xl leading-[2.35]',
  },
  {
    id: 'xl',
    label: 'كبير جداً',
    shortLabel: 'A++',
    pxValue: 23,
    lineHeightValue: 1.95,
    bodyClass: 'text-[23px] leading-[1.95]',
    cardExcerptClass: 'text-[22px] leading-[1.9]',
    quranClass: 'text-[27px] sm:text-[34px] leading-[2.4]',
  },
  {
    id: 'xxl',
    label: 'واضح جداً (كبار السن)',
    shortLabel: 'A+++',
    pxValue: 26,
    lineHeightValue: 2.05,
    bodyClass: 'text-[26px] leading-[2.05]',
    cardExcerptClass: 'text-[24px] leading-[1.95]',
    quranClass: 'text-[32px] sm:text-[40px] leading-[2.45]',
  },
];

export function resolveFontFamilyCss(family: ReadingFontFamily): string {
  return FONT_FAMILY_OPTIONS.find((f) => f.id === family)?.cssFamily || FONT_FAMILY_OPTIONS[0].cssFamily;
}

export function resolveFontSizeSpec(size: ReadingFontSize) {
  return FONT_SIZE_STEPS.find((s) => s.id === size) || FONT_SIZE_STEPS[1];
}

export function syncRootReadingCssVars(prefs: ReadingPrefs): void {
  if (typeof document === 'undefined') return;
  const spec = resolveFontSizeSpec(prefs.fontSize);
  const root = document.documentElement;
  root.style.setProperty('--reading-font-size', `${spec.pxValue}px`);
  root.style.setProperty('--reading-line-height', String(spec.lineHeightValue));
  root.style.setProperty('--reading-font-family', resolveFontFamilyCss(prefs.fontFamily));
}

export function loadReadingPrefs(): ReadingPrefs {
  if (typeof window === 'undefined') return DEFAULT_READING_PREFS;
  try {
    const raw = window.localStorage.getItem(READING_PREFS_KEY);
    if (!raw) {
      syncRootReadingCssVars(DEFAULT_READING_PREFS);
      return DEFAULT_READING_PREFS;
    }
    const parsed = JSON.parse(raw) as Partial<ReadingPrefs>;
    const validSize = FONT_SIZE_STEPS.some((s) => s.id === parsed.fontSize)
      ? (parsed.fontSize as ReadingFontSize)
      : DEFAULT_READING_PREFS.fontSize;
    const validFamily = FONT_FAMILY_OPTIONS.some((f) => f.id === parsed.fontFamily)
      ? (parsed.fontFamily as ReadingFontFamily)
      : DEFAULT_READING_PREFS.fontFamily;
    const validTheme: ReadingThemeMode =
      parsed.readingTheme === 'light' || parsed.readingTheme === 'dark' || parsed.readingTheme === 'follow'
        ? parsed.readingTheme
        : DEFAULT_READING_PREFS.readingTheme;
    const resolved = {fontSize: validSize, fontFamily: validFamily, readingTheme: validTheme};
    syncRootReadingCssVars(resolved);
    return resolved;
  } catch {
    return DEFAULT_READING_PREFS;
  }
}

export function saveReadingPrefs(prefs: ReadingPrefs): void {
  if (typeof window === 'undefined') return;
  syncRootReadingCssVars(prefs);
  try {
    window.localStorage.setItem(READING_PREFS_KEY, JSON.stringify(prefs));
    window.dispatchEvent(new CustomEvent(READING_PREFS_EVENT, {detail: prefs}));
  } catch {
    // Ignore storage quota errors
  }
}

export function useReadingPrefs() {
  const [prefs, setPrefs] = useState<ReadingPrefs>(() => loadReadingPrefs());

  useEffect(() => {
    syncRootReadingCssVars(prefs);
  }, [prefs]);

  useEffect(() => {
    const handler = (ev: Event) => {
      const custom = ev as CustomEvent<ReadingPrefs>;
      if (custom.detail) setPrefs(custom.detail);
    };
    window.addEventListener(READING_PREFS_EVENT, handler);
    return () => window.removeEventListener(READING_PREFS_EVENT, handler);
  }, []);

  const updatePrefs = (updater: Partial<ReadingPrefs>) => {
    setPrefs((prev) => {
      const next = {...prev, ...updater};
      saveReadingPrefs(next);
      return next;
    });
  };

  const stepFontSize = (direction: 'up' | 'down' | 'reset') => {
    const order: ReadingFontSize[] = ['sm', 'md', 'lg', 'xl', 'xxl'];
    if (direction === 'reset') {
      updatePrefs({fontSize: 'md'});
      return 'md' as ReadingFontSize;
    }
    const idx = order.indexOf(prefs.fontSize);
    const nextIdx =
      direction === 'up' ? Math.min(order.length - 1, idx + 1) : Math.max(0, idx - 1);
    const nextSize = order[nextIdx];
    updatePrefs({fontSize: nextSize});
    return nextSize;
  };

  return {prefs, updatePrefs, stepFontSize};
}
