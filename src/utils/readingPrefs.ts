import {useEffect, useState} from 'react';

export type ReadingFontSize = 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
export type ReadingFontFamily = 'naskh' | 'amiri' | 'scheherazade' | 'cairo' | 'ibm';
export type ReadingThemeMode = 'follow' | 'light' | 'dark';

export interface ReadingPrefs {
  fontSize: ReadingFontSize;
  fontFamily: ReadingFontFamily;
  readingTheme: ReadingThemeMode;
  customFontSizePx?: number;
}

const READING_PREFS_KEY = 'mawaedh_reading_prefs_v1';
const READING_PREFS_EVENT = 'mawaedh:reading-prefs-change';

export const MIN_FONT_SIZE_PX = 13;
export const MAX_FONT_SIZE_PX = 28;
export const DEFAULT_FONT_SIZE_PX = 18;

export const DEFAULT_READING_PREFS: ReadingPrefs = {
  fontSize: 'md',
  fontFamily: 'naskh',
  readingTheme: 'follow',
  customFontSizePx: DEFAULT_FONT_SIZE_PX,
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

export function clampFontSizePx(px: number): number {
  if (!Number.isFinite(px)) return DEFAULT_FONT_SIZE_PX;
  return Math.min(MAX_FONT_SIZE_PX, Math.max(MIN_FONT_SIZE_PX, Math.round(px)));
}

export function tierFromPx(px: number): ReadingFontSize {
  if (px <= 16) return 'sm';
  if (px <= 19) return 'md';
  if (px <= 21) return 'lg';
  if (px <= 24) return 'xl';
  return 'xxl';
}

export function resolveFontFamilyCss(family: ReadingFontFamily): string {
  return FONT_FAMILY_OPTIONS.find((f) => f.id === family)?.cssFamily || FONT_FAMILY_OPTIONS[0].cssFamily;
}

export function resolveFontSizeSpec(size: ReadingFontSize) {
  return FONT_SIZE_STEPS.find((s) => s.id === size) || FONT_SIZE_STEPS[1];
}

export function resolveActiveFontSizePx(prefs: ReadingPrefs): number {
  if (typeof prefs.customFontSizePx === 'number' && Number.isFinite(prefs.customFontSizePx)) {
    return clampFontSizePx(prefs.customFontSizePx);
  }
  return resolveFontSizeSpec(prefs.fontSize).pxValue;
}

export function syncRootReadingCssVars(prefs: ReadingPrefs): void {
  if (typeof document === 'undefined') return;
  const px = resolveActiveFontSizePx(prefs);
  const spec = resolveFontSizeSpec(prefs.fontSize);
  const root = document.documentElement;
  root.style.setProperty('--reading-font-size', `${px}px`);
  root.style.setProperty('--reading-line-height', String(spec.lineHeightValue));
  root.style.setProperty('--reading-font-family', resolveFontFamilyCss(prefs.fontFamily));
  const scaledRootPx = Math.min(22, Math.max(12.5, Math.round(((px / DEFAULT_FONT_SIZE_PX) * 16) * 10) / 10));
  root.style.fontSize = `${scaledRootPx}px`;
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
    const customFontSizePx =
      typeof parsed.customFontSizePx === 'number'
        ? clampFontSizePx(parsed.customFontSizePx)
        : resolveFontSizeSpec(validSize).pxValue;
    const resolved = {fontSize: validSize, fontFamily: validFamily, readingTheme: validTheme, customFontSizePx};
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

  const setCustomFontSizePx = (px: number) => {
    const clamped = clampFontSizePx(px);
    updatePrefs({customFontSizePx: clamped, fontSize: tierFromPx(clamped)});
    return clamped;
  };

  const stepFontSize = (direction: 'up' | 'down' | 'reset') => {
    if (direction === 'reset') {
      updatePrefs({fontSize: 'md', customFontSizePx: DEFAULT_FONT_SIZE_PX});
      return 'md' as ReadingFontSize;
    }
    const currentPx = resolveActiveFontSizePx(prefs);
    const nextPx = clampFontSizePx(direction === 'up' ? currentPx + 2 : currentPx - 2);
    const nextSize = tierFromPx(nextPx);
    updatePrefs({fontSize: nextSize, customFontSizePx: nextPx});
    return nextSize;
  };

  return {prefs, activeFontSizePx: resolveActiveFontSizePx(prefs), updatePrefs, setCustomFontSizePx, stepFontSize};
}
