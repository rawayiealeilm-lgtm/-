import {
  Bookmark,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Copy,
  List,
  Maximize2,
  Minimize2,
  Search,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {Fragment, useCallback, useEffect, useMemo, useState} from 'react';
import type {QuranAyah, QuranSurah} from '../types';
import {useI18n} from '../utils/i18n';
import {
  resolveFontFamilyCss,
  resolveFontSizeSpec,
  useReadingPrefs,
} from '../utils/readingPrefs';
import {FloatingReadingBar} from './FloatingReadingBar';
import {ReadingControlsBar} from './ReadingControlsBar';

const TOTAL_PAGES = 604;
const QURAN_PREF_KEY = 'mawaedh_quran_pref_v1';
const QURAN_BOOKMARKS_KEY = 'mawaedh_quran_bookmarks_v2';

const JUZ_NAMES = (
  'الجزء الأول.الجزء الثاني.الجزء الثالث.الجزء الرابع.الجزء الخامس.الجزء السادس.الجزء السابع.الجزء الثامن.الجزء التاسع.الجزء العاشر.' +
  'الجزء الحادي عشر.الجزء الثاني عشر.الجزء الثالث عشر.الجزء الرابع عشر.الجزء الخامس عشر.الجزء السادس عشر.الجزء السابع عشر.الجزء الثامن عشر.الجزء التاسع عشر.الجزء العشرون.' +
  'الجزء الحادي والعشرون.الجزء الثاني والعشرون.الجزء الثالث والعشرون.الجزء الرابع والعشرون.الجزء الخامس والعشرون.الجزء السادس والعشرون.الجزء السابع والعشرون.الجزء الثامن والعشرون.الجزء التاسع والعشرون.الجزء الثلاثون'
).split('.');

const MUFASSIR_OPTIONS = [
  {id: 'muyassar', label: 'التفسير الميسر'},
  {id: 'saadi', label: 'تفسير السعدي'},
  {id: 'ibn_kathir', label: 'تفسير ابن كثير'},
  {id: 'tabari', label: 'تفسير الطبري'},
  {id: 'baghawi', label: 'تفسير البغوي'},
] as const;

const TAFSIR_LANGS = [
  {id: 'ar', label: 'العربية', dir: 'rtl' as const},
  {id: 'en', label: 'English', dir: 'ltr' as const},
  {id: 'fr', label: 'Français', dir: 'ltr' as const},
  {id: 'ur', label: 'اردو', dir: 'rtl' as const},
  {id: 'id', label: 'Indonesia', dir: 'ltr' as const},
  {id: 'tr', label: 'Türkçe', dir: 'ltr' as const},
  {id: 'es', label: 'Español', dir: 'ltr' as const},
] as const;

type MufassirId = (typeof MUFASSIR_OPTIONS)[number]['id'];
type TafsirLangId = (typeof TAFSIR_LANGS)[number]['id'];

interface QuranBookmarkEntry {
  id: string;
  page: number;
  surahNumber: number;
  surahName: string;
  ayahNumber?: number;
  label: string;
  createdAt: string;
}

interface SearchHit {
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  page: number;
  text: string;
}

let cachedQuranData: QuranSurah[] | null = null;

function toArabicDigits(n: number): string {
  return n.toLocaleString('ar-EG');
}

function normalizeArabic(text: string): string {
  return text
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim();
}

function cleanAyahText(text: string, surahNum: number, ayahNum: number): string {
  const cleaned = text.replace(/^\uFEFF/, '');
  if (surahNum !== 1 && surahNum !== 9 && ayahNum === 1) {
    return cleaned.replace(/^بِ?ّ?سْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ\s*/, '');
  }
  return cleaned;
}

interface QuranPrefs {
  mode: 'page' | 'surah';
  page: number;
  surah: number;
  mufassir: MufassirId;
  tafsirLang: TafsirLangId;
  showInlineTafsir: boolean;
  tafsirZoom: number;
}

function loadQuranPrefs(): QuranPrefs {
  const defaults: QuranPrefs = {
    mode: 'page',
    page: 1,
    surah: 1,
    mufassir: 'muyassar',
    tafsirLang: 'ar',
    showInlineTafsir: false,
    tafsirZoom: 18,
  };
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = window.localStorage.getItem(QURAN_PREF_KEY);
    if (!raw) return defaults;
    const p = JSON.parse(raw) as Partial<QuranPrefs>;
    return {
      mode: p.mode === 'surah' ? 'surah' : 'page',
      page: typeof p.page === 'number' && p.page >= 1 && p.page <= TOTAL_PAGES ? p.page : 1,
      surah: typeof p.surah === 'number' && p.surah >= 1 && p.surah <= 114 ? p.surah : 1,
      mufassir: MUFASSIR_OPTIONS.some((m) => m.id === p.mufassir) ? (p.mufassir as MufassirId) : 'muyassar',
      tafsirLang: TAFSIR_LANGS.some((l) => l.id === p.tafsirLang) ? (p.tafsirLang as TafsirLangId) : 'ar',
      showInlineTafsir: Boolean(p.showInlineTafsir),
      tafsirZoom:
        typeof p.tafsirZoom === 'number' && p.tafsirZoom >= 14 && p.tafsirZoom <= 30 ? p.tafsirZoom : 18,
    };
  } catch {
    return defaults;
  }
}

function loadQuranBookmarks(): QuranBookmarkEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(QURAN_BOOKMARKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QuranBookmarkEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

type ActiveDrawer = null | 'index' | 'search' | 'bookmarks' | 'settings';

export function QuranView({
  initialPage,
  onNotify,
}: {
  initialPage?: number;
  onNotify: (msg: string) => void;
}) {
  const {tr, isEn, formatNumber} = useI18n();
  const [surahs, setSurahs] = useState<QuranSurah[] | null>(cachedQuranData);
  const [loading, setLoading] = useState(!cachedQuranData);
  const [error, setError] = useState(false);
  const [prefs, setPrefs] = useState<QuranPrefs>(() => loadQuranPrefs());
  const [bookmarks, setBookmarks] = useState<QuranBookmarkEntry[]>(() => loadQuranBookmarks());
  const {prefs: readingPrefs, updatePrefs: updateReadingPrefs} = useReadingPrefs();

  const [activeDrawer, setActiveDrawer] = useState<ActiveDrawer>(null);
  const [indexSubTab, setIndexSubTab] = useState<'surahs' | 'juz'>('surahs');
  const [surahQuery, setSurahQuery] = useState('');
  const [ayahSearchQuery, setAyahSearchQuery] = useState('');
  const [pageInput, setPageInput] = useState('');
  const [bookmarkNote, setBookmarkNote] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [selectedAyah, setSelectedAyah] = useState<{
    surahNumber: number;
    surahName: string;
    ayahNumber: number;
    page: number;
    text: string;
  } | null>(null);

  const [tafsirOpen, setTafsirOpen] = useState(false);
  const [tafsirLoading, setTafsirLoading] = useState(false);
  const [tafsirText, setTafsirText] = useState('');
  const [tafsirEdition, setTafsirEdition] = useState('');
  const [tafsirError, setTafsirError] = useState<string | null>(null);

  const PrevIcon = isEn ? ChevronLeft : ChevronRight;
  const NextIcon = isEn ? ChevronRight : ChevronLeft;

  const loadQuran = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch('/data/quran-uthmani.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as QuranSurah[];
      cachedQuranData = data;
      setSurahs(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!cachedQuranData) void loadQuran();
  }, []);

  useEffect(() => {
    if (typeof initialPage === 'number' && initialPage >= 1 && initialPage <= TOTAL_PAGES) {
      setPrefs((prev) => ({...prev, mode: 'page', page: initialPage}));
    }
  }, [initialPage]);

  useEffect(() => {
    try {
      window.localStorage.setItem(QURAN_PREF_KEY, JSON.stringify(prefs));
    } catch {
      // Ignore
    }
  }, [prefs]);

  useEffect(() => {
    try {
      window.localStorage.setItem(QURAN_BOOKMARKS_KEY, JSON.stringify(bookmarks));
    } catch {
      // Ignore
    }
  }, [bookmarks]);

  const fetchAyahTafsir = useCallback(
    async (surahNum: number, ayahNum: number, mufassir: MufassirId, lang: TafsirLangId) => {
      setTafsirLoading(true);
      setTafsirError(null);
      try {
        const res = await fetch(
          `/api/quran/tafsir?surah=${surahNum}&ayah=${ayahNum}&mufassir=${encodeURIComponent(mufassir)}&lang=${encodeURIComponent(lang)}`,
        );
        const data = (await res.json()) as {text?: string; editionLabel?: string; error?: string};
        if (!res.ok || !data.text) {
          throw new Error(data.error || 'تعذر جلب التفسير المعتمد لهذه الآية حالياً');
        }
        setTafsirText(data.text);
        setTafsirEdition(data.editionLabel || '');
      } catch (err) {
        setTafsirError(
          err instanceof Error ? err.message : 'تعذر الاتصال بخدمة التفسير الموثقة حالياً',
        );
      } finally {
        setTafsirLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (selectedAyah && (tafsirOpen || prefs.showInlineTafsir)) {
      void fetchAyahTafsir(
        selectedAyah.surahNumber,
        selectedAyah.ayahNumber,
        prefs.mufassir,
        prefs.tafsirLang,
      );
    }
  }, [
    selectedAyah,
    tafsirOpen,
    prefs.showInlineTafsir,
    prefs.mufassir,
    prefs.tafsirLang,
    fetchAyahTafsir,
  ]);

  const juzStartPages = useMemo(() => {
    const map: Record<number, number> = {};
    if (!surahs) return map;
    for (const s of surahs) {
      for (const a of s.ayahs) {
        if (!(a.j in map)) map[a.j] = a.p;
      }
    }
    return map;
  }, [surahs]);

  const pageBlocks = useMemo(() => {
    if (!surahs) return [];
    const blocks: Array<{
      surahNumber: number;
      surahName: string;
      revelationType: string;
      totalAyahs: number;
      startsHere: boolean;
      ayahs: QuranAyah[];
    }> = [];
    for (const s of surahs) {
      const ayahs = s.ayahs.filter((a) => a.p === prefs.page);
      if (ayahs.length > 0) {
        blocks.push({
          surahNumber: s.n,
          surahName: s.name,
          revelationType: s.rev,
          totalAyahs: s.ayahs.length,
          startsHere: ayahs[0].n === 1,
          ayahs,
        });
      }
    }
    return blocks;
  }, [surahs, prefs.page]);

  const activeSurah = useMemo(() => {
    if (!surahs) return null;
    return surahs.find((s) => s.n === prefs.surah) || surahs[0];
  }, [surahs, prefs.surah]);

  const activeJuz = useMemo(() => {
    if (prefs.mode === 'page') return pageBlocks[0]?.ayahs[0]?.j || 1;
    return activeSurah?.ayahs[0]?.j || 1;
  }, [prefs.mode, pageBlocks, activeSurah]);

  const filteredSurahs = useMemo(() => {
    if (!surahs) return [];
    const q = normalizeArabic(surahQuery);
    if (!q) return surahs;
    return surahs.filter(
      (s) => normalizeArabic(s.name).includes(q) || String(s.n).includes(surahQuery.trim()),
    );
  }, [surahs, surahQuery]);

  const ayahSearchHits = useMemo<SearchHit[]>(() => {
    if (!surahs) return [];
    const q = normalizeArabic(ayahSearchQuery);
    if (q.length < 2) return [];
    const hits: SearchHit[] = [];
    for (const s of surahs) {
      for (const a of s.ayahs) {
        const clean = cleanAyahText(a.t, s.n, a.n);
        if (normalizeArabic(clean).includes(q)) {
          hits.push({
            surahNumber: s.n,
            surahName: s.name,
            ayahNumber: a.n,
            page: a.p,
            text: clean,
          });
          if (hits.length >= 40) return hits;
        }
      }
    }
    return hits;
  }, [surahs, ayahSearchQuery]);

  const goToPage = (page: number) => {
    const clamped = Math.max(1, Math.min(TOTAL_PAGES, page));
    setSelectedAyah(null);
    setTafsirOpen(false);
    setPrefs((prev) => ({...prev, mode: 'page', page: clamped}));
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const selectSurah = (surah: QuranSurah) => {
    const startPage = surah.ayahs[0]?.p || 1;
    setSelectedAyah(null);
    setTafsirOpen(false);
    setActiveDrawer(null);
    setPrefs((prev) => ({
      ...prev,
      surah: surah.n,
      page: prev.mode === 'page' ? startPage : prev.page,
    }));
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const addBookmark = (customAyah?: {surahNumber: number; surahName: string; ayahNumber: number; page: number}) => {
    const targetPage = customAyah?.page ?? (prefs.mode === 'page' ? prefs.page : activeSurah?.ayahs[0]?.p || prefs.page);
    const targetSurahNum = customAyah?.surahNumber ?? (prefs.mode === 'page' ? pageBlocks[0]?.surahNumber || 1 : activeSurah?.n || 1);
    const targetSurahName = customAyah?.surahName ?? (prefs.mode === 'page' ? pageBlocks[0]?.surahName || 'القرآن الكريم' : activeSurah?.name || 'القرآن الكريم');
    const entry: QuranBookmarkEntry = {
      id: `qbm_${Date.now().toString(36)}`,
      page: targetPage,
      surahNumber: targetSurahNum,
      surahName: targetSurahName,
      ayahNumber: customAyah?.ayahNumber,
      label:
        bookmarkNote.trim() ||
        (customAyah
          ? `${targetSurahName} · آية ${toArabicDigits(customAyah.ayahNumber)}`
          : `صفحة ${toArabicDigits(targetPage)} · ${targetSurahName}`),
      createdAt: new Date().toISOString(),
    };
    setBookmarks((prev) => [entry, ...prev].slice(0, 30));
    setBookmarkNote('');
    onNotify(`تم حفظ العلامة المرجعية: ${entry.label}`);
  };

  const removeBookmark = (id: string) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
    onNotify('تم حذف العلامة المرجعية');
  };

  const handleAyahClick = (surahNumber: number, surahName: string, ayahNumber: number, page: number, text: string) => {
    setSelectedAyah({surahNumber, surahName, ayahNumber, page, text});
    setTafsirOpen(true);
  };

  const copyAyahAndTafsir = async () => {
    if (!selectedAyah) return;
    const tafsirSection = tafsirText
      ? `\n\n📖 ${tafsirEdition || 'التفسير المعتمد'}:\n${tafsirText}`
      : '';
    const payload = `﴿ ${selectedAyah.text} ﴾\n[${selectedAyah.surahName} - آية ${formatNumber(selectedAyah.ayahNumber)}]${tafsirSection}`;
    try {
      await navigator.clipboard.writeText(payload);
      onNotify(tr('تم نسخ الآية الكريمة مع التفسير المعتمد', 'Ayah & Tafsir copied cleanly'));
    } catch {
      onNotify(tr('تم تجهيز الآية للنسخ', 'Ayah ready to copy'));
    }
  };

  const shareAyahAndTafsir = async () => {
    if (!selectedAyah) return;
    const tafsirSection = tafsirText
      ? `\n\n📖 ${tafsirEdition || 'التفسير'}:\n${tafsirText.slice(0, 400)}`
      : '';
    const text = `﴿ ${selectedAyah.text} ﴾\n[${selectedAyah.surahName} - آية ${toArabicDigits(selectedAyah.ayahNumber)}]${tafsirSection}\n\n📲 عبر موقع مواعظ وعبر`;
    if (navigator.share) {
      try {
        await navigator.share({title: selectedAyah.surahName, text});
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      onNotify('تم نسخ الآية والتفسير للمشاركة في الواتساب والمنصات');
    } catch {
      onNotify('تم تجهيز نص المشاركة');
    }
  };

  const activeQuranFamily =
    readingPrefs.fontFamily === 'ibm' ? 'amiri' : readingPrefs.fontFamily;
  const fontSizeClass = resolveFontSizeSpec(readingPrefs.fontSize).quranClass;
  const activeFontFamily = resolveFontFamilyCss(activeQuranFamily);
  const currentTafsirLangMeta = TAFSIR_LANGS.find((l) => l.id === prefs.tafsirLang) || TAFSIR_LANGS[0];

  const rTheme = readingPrefs.readingTheme;
  const mushafSurfaceClass =
    rTheme === 'dark'
      ? 'bg-[#071611] text-[#eaf5ef] border-emerald-800/60'
      : rTheme === 'light'
        ? 'bg-[#fffdf6] text-[#1b241f] border-[#d6c9a5]'
        : 'bg-[#fffdf6] dark:bg-[#0b1c16] text-[#1b241f] dark:text-[#eef6f2] border-[#dfd3b2] dark:border-white/10';

  const mushafInnerFrameClass =
    rTheme === 'dark'
      ? 'border-emerald-700/35'
      : rTheme === 'light'
        ? 'border-[#e7dec6]'
        : 'border-[#e7dec6] dark:border-white/10';

  const surahBannerClass =
    rTheme === 'dark'
      ? 'bg-gradient-to-l from-[#0d281f] via-[#132419] to-[#0d281f] border-[#f2be5e]/35 text-[#ffdea8]'
      : rTheme === 'light'
        ? 'bg-gradient-to-l from-[#eef7f2] via-[#f7f2e3] to-[#eef7f2] border-[#d6c9a5] text-[#006a46]'
        : 'bg-gradient-to-l from-[#eef7f2] via-[#f7f2e3] to-[#eef7f2] dark:from-[#122d22] dark:via-[#17281e] dark:to-[#122d22] border-[#d6c9a5] dark:border-[#f2be5e]/30 text-[#006a46] dark:text-[#ffdea8]';

  const ayahTextColorClass =
    rTheme === 'dark'
      ? 'text-[#eef7f2]'
      : rTheme === 'light'
        ? 'text-[#1b241f]'
        : 'text-[#1b241f] dark:text-[#eef6f2]';

  const verseNumberClass =
    rTheme === 'dark'
      ? 'text-[#f2be5e]'
      : rTheme === 'light'
        ? 'text-[#7c5800]'
        : 'text-[#7c5800] dark:text-[#f2be5e]';

  const basmalaColorClass =
    rTheme === 'dark'
      ? 'text-[#89f8c1]'
      : rTheme === 'light'
        ? 'text-[#005235]'
        : 'text-[#005235] dark:text-[#89f8c1]';

  const mushafMutedClass =
    rTheme === 'dark'
      ? 'text-emerald-200/75'
      : rTheme === 'light'
        ? 'text-[#6e7a71]'
        : 'text-[#6e7a71] dark:text-slate-400';

  if (loading) {
    return (
      <div className="space-y-4 pb-10">
        <div className="rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-10 text-center space-y-2">
          <BookOpen className="w-8 h-8 text-[#006a46] dark:text-[#6cdba6] mx-auto" />
          <p className="text-base font-bold text-[#0e1d25] dark:text-white">
            {tr('جاري تجهيز المصحف الشريف كاملاً...', 'Loading the complete Noble Quran...')}
          </p>
          <p className="text-xs text-[#6e7a71] dark:text-slate-400">
            {tr('١١٤ سورة · ٦٠٤ صفحات بالرسم العثماني الموثق', '114 Surahs · 604 Uthmani Mushaf Pages')}
          </p>
        </div>
      </div>
    );
  }

  if (error || !surahs) {
    return (
      <div className="rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200 dark:border-white/10 p-8 text-center space-y-4">
        <p className="text-base font-bold text-[#0e1d25] dark:text-white">
          {tr('تعذر تحميل صفحات المصحف الشريف حالياً', 'Unable to load the Noble Quran right now')}
        </p>
        <button
          type="button"
          onClick={() => void loadQuran()}
          className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#006a46] text-white text-sm font-bold"
        >
          {tr('إعادة المحاولة', 'Retry')}
        </button>
      </div>
    );
  }

  const mushafCanvas = (
    <section
      dir="rtl"
      className={`rounded-3xl border-2 p-3 sm:p-5 shadow-md transition-colors ${mushafSurfaceClass}`}
    >
      <div className={`rounded-2xl border p-4 sm:p-7 lg:p-9 space-y-6 ${mushafInnerFrameClass}`}>
        {prefs.mode === 'page' ? (
          <>
            <div className={`pb-3 border-b flex flex-wrap items-center justify-between gap-2 text-xs font-bold tabular-nums ${mushafInnerFrameClass} ${mushafMutedClass}`}>
              <span>{pageBlocks.map((b) => b.surahName).join(' · ') || 'القرآن الكريم'}</span>
              <div className="flex items-center gap-3">
                <span>{JUZ_NAMES[activeJuz - 1]}</span>
                <button
                  type="button"
                  onClick={() => setIsFullscreen((f) => !f)}
                  className="px-2.5 py-1 rounded-lg bg-[#006a46]/10 dark:bg-white/10 text-[#006a46] dark:text-[#6cdba6] font-bold flex items-center gap-1"
                >
                  {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  <span>{isFullscreen ? 'إنهاء التركيز' : 'وضع القراءة المركزة'}</span>
                </button>
              </div>
            </div>

            {pageBlocks.map((block) => (
              <div key={block.surahNumber} className="space-y-5">
                {block.startsHere && (
                  <div className="space-y-4 text-center">
                    <div className={`rounded-2xl border py-3 px-4 flex items-center justify-between ${surahBannerClass}`}>
                      <span className={`text-xs font-semibold ${mushafMutedClass}`}>
                        {block.revelationType}
                      </span>
                      <h2 className="text-xl sm:text-2xl font-bold" style={{fontFamily: activeFontFamily}}>
                        {block.surahName}
                      </h2>
                      <span className={`text-xs font-semibold tabular-nums ${mushafMutedClass}`}>
                        {toArabicDigits(block.totalAyahs)} آية
                      </span>
                    </div>
                    {block.surahNumber !== 1 && block.surahNumber !== 9 && (
                      <p className={`text-xl sm:text-2xl text-center ${basmalaColorClass}`} style={{fontFamily: activeFontFamily}}>
                        بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                      </p>
                    )}
                  </div>
                )}

                <div
                  className={`text-justify leading-[2.1] ${ayahTextColorClass} ${fontSizeClass}`}
                  style={{fontFamily: activeFontFamily}}
                >
                  {block.ayahs.map((ayah) => {
                    const text = cleanAyahText(ayah.t, block.surahNumber, ayah.n);
                    const isSelected =
                      selectedAyah?.surahNumber === block.surahNumber &&
                      selectedAyah?.ayahNumber === ayah.n;
                    return (
                      <Fragment key={`${block.surahNumber}-${ayah.n}`}>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={() => handleAyahClick(block.surahNumber, block.surahName, ayah.n, ayah.p, text)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleAyahClick(block.surahNumber, block.surahName, ayah.n, ayah.p, text);
                            }
                          }}
                          className={`cursor-pointer rounded-md px-0.5 transition-colors ${
                            isSelected
                              ? 'bg-[#ffdea8]/60 dark:bg-[#006a46]/50'
                              : 'hover:bg-[#e8f6ff]/50 dark:hover:bg-white/5'
                          }`}
                        >
                          {text}
                        </span>{' '}
                        <span className={`inline-flex items-center justify-center text-[0.8em] mx-1 select-none tabular-nums ${verseNumberClass}`}>
                          ﴿{toArabicDigits(ayah.n)}﴾
                        </span>{' '}
                      </Fragment>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className={`pt-4 border-t flex items-center justify-between text-xs tabular-nums ${mushafInnerFrameClass} ${mushafMutedClass}`}>
              <span>{JUZ_NAMES[activeJuz - 1]}</span>
              <span className="text-[11px] opacity-80">اضغط على أي آية لعرض تفسيرها بلغات متعددة</span>
              <span className={`font-bold ${basmalaColorClass}`}>
                صفحة {toArabicDigits(prefs.page)} من {toArabicDigits(TOTAL_PAGES)}
              </span>
            </div>
          </>
        ) : (
          activeSurah && (
            <div className="space-y-6">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsFullscreen((f) => !f)}
                  className="px-3 py-1.5 rounded-xl bg-[#006a46]/10 dark:bg-white/10 text-[#006a46] dark:text-[#6cdba6] text-xs font-bold flex items-center gap-1.5"
                >
                  {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  <span>{isFullscreen ? 'إنهاء وضع القراءة المركزة' : 'وضع القراءة المركزة (ملء الشاشة)'}</span>
                </button>
              </div>

              <div className="space-y-4 text-center">
                <div className={`rounded-2xl border py-3.5 px-4 flex items-center justify-between ${surahBannerClass}`}>
                  <span className={`text-xs font-semibold ${mushafMutedClass}`}>{activeSurah.rev}</span>
                  <h2 className="text-2xl font-bold" style={{fontFamily: activeFontFamily}}>
                    {activeSurah.name}
                  </h2>
                  <span className={`text-xs font-semibold tabular-nums ${mushafMutedClass}`}>
                    {toArabicDigits(activeSurah.ayahs.length)} آية
                  </span>
                </div>

                {activeSurah.n !== 1 && activeSurah.n !== 9 && (
                  <p className={`text-xl sm:text-2xl ${basmalaColorClass}`} style={{fontFamily: activeFontFamily}}>
                    بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                  </p>
                )}
              </div>

              <div
                className={`text-justify leading-[2.1] ${ayahTextColorClass} ${fontSizeClass}`}
                style={{fontFamily: activeFontFamily}}
              >
                {activeSurah.ayahs.map((ayah) => {
                  const text = cleanAyahText(ayah.t, activeSurah.n, ayah.n);
                  const isSelected =
                    selectedAyah?.surahNumber === activeSurah.n &&
                    selectedAyah?.ayahNumber === ayah.n;
                  return (
                    <Fragment key={ayah.n}>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={() => handleAyahClick(activeSurah.n, activeSurah.name, ayah.n, ayah.p, text)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleAyahClick(activeSurah.n, activeSurah.name, ayah.n, ayah.p, text);
                          }
                        }}
                        className={`cursor-pointer rounded-md px-0.5 transition-colors ${
                          isSelected
                            ? 'bg-[#ffdea8]/60 dark:bg-[#006a46]/50'
                            : 'hover:bg-[#e8f6ff]/50 dark:hover:bg-white/5'
                        }`}
                      >
                        {text}
                      </span>{' '}
                      <span className={`inline-flex items-center justify-center text-[0.8em] mx-1 select-none tabular-nums ${verseNumberClass}`}>
                        ﴿{toArabicDigits(ayah.n)}﴾
                      </span>{' '}
                    </Fragment>
                  );
                })}
              </div>
            </div>
          )
        )}

        {/* Inline Tafsir Panel Below Canvas When Enabled */}
        {prefs.showInlineTafsir && selectedAyah && (
          <div className="mt-6 rounded-2xl border border-[#006a46]/25 bg-white/90 dark:bg-[#081712]/90 p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-extrabold text-[#006a46] dark:text-[#6cdba6]">
                التفسير الميسّر/المباشر · {selectedAyah.surahName} آية {toArabicDigits(selectedAyah.ayahNumber)}
              </span>
              <span className="text-xs text-[#7c5800] dark:text-[#f2be5e] font-bold">
                {tafsirEdition || MUFASSIR_OPTIONS.find((m) => m.id === prefs.mufassir)?.label}
              </span>
            </div>
            {tafsirLoading ? (
              <p className="text-sm text-[#6e7a71]">جاري تحميل التفسير الموثق...</p>
            ) : tafsirError ? (
              <p className="text-sm text-rose-600">{tafsirError}</p>
            ) : (
              <p
                dir={currentTafsirLangMeta.dir}
                style={{fontSize: `${prefs.tafsirZoom}px`, lineHeight: 1.85}}
                className="text-[#1b241f] dark:text-slate-100 whitespace-pre-line"
              >
                {tafsirText}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );

  return (
    <div className="space-y-5 pb-24">
      {/* Simplified Header with Exact 4 Wide Interactive Buttons + Fullscreen Focus Mode */}
      <section className="rounded-2xl bg-gradient-to-br from-[#006a46] via-[#007c53] to-[#00574b] text-white p-5 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[#ffdea8] text-xs font-semibold">
              <BookOpen className="w-4 h-4" />
              <span>{tr('المصحف الشريف كاملاً · ١١٤ سورة · ٦٠٤ صفحات · تفسير ٥ أئمة بـ ٧ لغات', 'The Noble Quran · 114 Surahs · 604 Pages · Multi-Language Tafsir')}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold mt-1">
              {prefs.mode === 'page'
                ? pageBlocks.map((b) => b.surahName).join(' · ') || tr('المصحف الشريف', 'Noble Quran')
                : activeSurah?.name || tr('المصحف الشريف', 'Noble Quran')}
            </h1>
            <p className="text-xs text-[#e3f3fe]/90 mt-0.5 tabular-nums">
              {isEn ? `Juz ${activeJuz}` : JUZ_NAMES[activeJuz - 1] || `الجزء ${toArabicDigits(activeJuz)}`} ·{' '}
              {prefs.mode === 'page'
                ? tr(`الصفحة ${toArabicDigits(prefs.page)} من ${toArabicDigits(TOTAL_PAGES)}`, `Page ${prefs.page} of ${TOTAL_PAGES}`)
                : tr(`${activeSurah?.rev} · ${toArabicDigits(activeSurah?.ayahs.length || 0)} آية`, `${activeSurah?.rev} · ${activeSurah?.ayahs.length || 0} Ayahs`)}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-[#ffdea8] hover:bg-[#ffc968] text-[#271900] text-xs font-extrabold flex items-center gap-2 self-start sm:self-center shrink-0"
          >
            <Maximize2 className="w-4 h-4" />
            <span>وضع القراءة المركزة (ملء الشاشة)</span>
          </button>
        </div>

        {/* Exact 4 Wide Interactive Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <button
            type="button"
            onClick={() => setActiveDrawer((d) => (d === 'index' ? null : 'index'))}
            className={`min-h-[48px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-between gap-2 transition-colors ${
              activeDrawer === 'index' ? 'bg-white text-[#006a46]' : 'bg-white/15 hover:bg-white/25 text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              <List className="w-4 h-4 shrink-0" />
              <span>السورة والجزء</span>
            </span>
            <span className={activeDrawer === 'index' ? 'text-[#006a46]' : 'text-[#ffdea8]'}>
              {activeDrawer === 'index' ? 'إغلاق' : `${toArabicDigits(114)} سورة`}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDrawer((d) => (d === 'search' ? null : 'search'))}
            className={`min-h-[48px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-between gap-2 transition-colors ${
              activeDrawer === 'search' ? 'bg-white text-[#006a46]' : 'bg-white/15 hover:bg-white/25 text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              <Search className="w-4 h-4 shrink-0" />
              <span>البحث في المصحف</span>
            </span>
            <span className={activeDrawer === 'search' ? 'text-[#006a46]' : 'text-[#ffdea8]'}>
              {activeDrawer === 'search' ? 'إغلاق' : 'آية / صفحة'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDrawer((d) => (d === 'bookmarks' ? null : 'bookmarks'))}
            className={`min-h-[48px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-between gap-2 transition-colors ${
              activeDrawer === 'bookmarks' ? 'bg-white text-[#006a46]' : 'bg-white/15 hover:bg-white/25 text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              <Bookmark className="w-4 h-4 shrink-0" />
              <span>المفضلة والعلامات المرجعية</span>
            </span>
            <span className="tabular-nums text-xs font-extrabold">({formatNumber(bookmarks.length)})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDrawer((d) => (d === 'settings' ? null : 'settings'))}
            className={`min-h-[48px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-between gap-2 transition-colors ${
              activeDrawer === 'settings' ? 'bg-white text-[#006a46]' : 'bg-white/15 hover:bg-white/25 text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 shrink-0" />
              <span>إعدادات القراءة</span>
            </span>
            <span className={activeDrawer === 'settings' ? 'text-[#006a46]' : 'text-[#ffdea8]'}>
              {prefs.mode === 'page' ? 'صفحة' : 'سورة'}
            </span>
          </button>
        </div>
      </section>

      {/* Drawer 1: Surah & Juz Selector */}
      {activeDrawer === 'index' && (
        <section className="rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIndexSubTab('surahs')}
                className={`min-h-[40px] px-4 rounded-xl text-xs font-bold ${
                  indexSubTab === 'surahs'
                    ? 'bg-[#006a46] text-white'
                    : 'bg-[#e8f6ff] dark:bg-[#112921] text-[#3e4a42] dark:text-slate-300'
                }`}
              >
                فهرس السور ({toArabicDigits(114)})
              </button>
              <button
                type="button"
                onClick={() => setIndexSubTab('juz')}
                className={`min-h-[40px] px-4 rounded-xl text-xs font-bold ${
                  indexSubTab === 'juz'
                    ? 'bg-[#006a46] text-white'
                    : 'bg-[#e8f6ff] dark:bg-[#112921] text-[#3e4a42] dark:text-slate-300'
                }`}
              >
                فهرس الأجزاء ({toArabicDigits(30)})
              </button>
            </div>
            {indexSubTab === 'surahs' && (
              <div className="relative sm:w-72 w-full">
                <Search className="w-4 h-4 text-[#6e7a71] absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={surahQuery}
                  onChange={(e) => setSurahQuery(e.target.value)}
                  placeholder="ابحث باسم السورة أو رقمها..."
                  className="w-full min-h-[42px] ps-9 pe-3 rounded-xl bg-[#e8f6ff] dark:bg-[#112921] text-sm focus:outline-none focus:ring-2 focus:ring-[#006a46]"
                />
              </div>
            )}
          </div>

          {indexSubTab === 'surahs' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-80 overflow-y-auto pe-1">
              {filteredSurahs.map((s) => {
                const isCurrent =
                  prefs.mode === 'surah'
                    ? prefs.surah === s.n
                    : pageBlocks.some((b) => b.surahNumber === s.n);
                return (
                  <button
                    key={s.n}
                    type="button"
                    onClick={() => selectSurah(s)}
                    className={`min-h-[54px] p-3 rounded-xl border text-start flex items-center justify-between gap-2 transition-colors ${
                      isCurrent
                        ? 'bg-[#006a46] text-white border-[#006a46]'
                        : 'bg-[#f4faff] dark:bg-[#10261e] border-slate-200/80 dark:border-white/10 hover:border-[#006a46]/50'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate" dir="rtl">{s.name}</p>
                      <p className={`text-[11px] tabular-nums ${isCurrent ? 'text-[#ffdea8]' : 'text-[#6e7a71] dark:text-slate-400'}`}>
                        {s.rev} · {formatNumber(s.ayahs.length)} آية
                      </p>
                    </div>
                    <span className={`text-xs font-bold tabular-nums shrink-0 ${isCurrent ? 'text-white' : 'text-[#006a46] dark:text-[#6cdba6]'}`}>
                      ص {toArabicDigits(s.ayahs[0]?.p || 1)}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 max-h-80 overflow-y-auto pe-1">
              {JUZ_NAMES.map((name, idx) => {
                const juz = idx + 1;
                const startP = juzStartPages[juz] || 1;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      setActiveDrawer(null);
                      goToPage(startP);
                    }}
                    className={`min-h-[50px] p-3 rounded-xl border text-start flex items-center justify-between gap-2 ${
                      activeJuz === juz
                        ? 'bg-[#006a46] text-white border-[#006a46]'
                        : 'bg-[#f4faff] dark:bg-[#10261e] border-slate-200/80 dark:border-white/10'
                    }`}
                  >
                    <span className="text-xs font-bold">{name}</span>
                    <span className="text-[11px] font-bold opacity-85 tabular-nums">ص {toArabicDigits(startP)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Drawer 2: Unified Ayah Text Search & Direct Page Jump */}
      {activeDrawer === 'search' && (
        <section className="rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-4 sm:p-5 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 relative">
              <Search className="w-4 h-4 text-[#6e7a71] absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={ayahSearchQuery}
                onChange={(e) => setAyahSearchQuery(e.target.value)}
                placeholder="ابحث بأي كلمة أو عبارة من القرآن الكريم (بدون تشكيل)..."
                className="w-full min-h-[44px] ps-10 pe-4 rounded-xl bg-[#e8f6ff] dark:bg-[#112921] text-sm focus:outline-none focus:ring-2 focus:ring-[#006a46]"
              />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const num = Number(pageInput);
                if (!Number.isNaN(num) && num >= 1 && num <= TOTAL_PAGES) {
                  setActiveDrawer(null);
                  goToPage(num);
                  setPageInput('');
                }
              }}
              className="flex items-center gap-2"
            >
              <input
                type="number"
                min={1}
                max={TOTAL_PAGES}
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                placeholder={`صفحة (١ - ٦٠٤)`}
                className="flex-1 min-h-[44px] rounded-xl bg-[#e8f6ff] dark:bg-[#112921] px-3 text-center text-sm font-bold tabular-nums focus:outline-none"
              />
              <button
                type="submit"
                className="min-h-[44px] px-4 rounded-xl bg-[#006a46] text-white text-xs font-bold shrink-0"
              >
                انتقال
              </button>
            </form>
          </div>

          {ayahSearchQuery.trim().length >= 2 && (
            <div className="space-y-2 max-h-72 overflow-y-auto pe-1">
              {ayahSearchHits.length === 0 ? (
                <p className="text-xs text-[#6e7a71] dark:text-slate-400">
                  لم يُعثر على نتائج مطابقة في الآيات الكريمة.
                </p>
              ) : (
                ayahSearchHits.map((hit) => (
                  <button
                    key={`${hit.surahNumber}-${hit.ayahNumber}`}
                    type="button"
                    onClick={() => {
                      setActiveDrawer(null);
                      goToPage(hit.page);
                      setSelectedAyah(hit);
                    }}
                    className="w-full text-start p-3 rounded-xl bg-[#f4faff] dark:bg-[#10261e] hover:border-[#006a46] border border-slate-200/70 dark:border-white/10 space-y-1 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-[#006a46] dark:text-[#6cdba6]">
                      <span>{hit.surahName} · آية {toArabicDigits(hit.ayahNumber)}</span>
                      <span>صفحة {toArabicDigits(hit.page)}</span>
                    </div>
                    <p dir="rtl" className="text-sm text-[#0e1d25] dark:text-white leading-relaxed" style={{fontFamily: activeFontFamily}}>
                      {hit.text}
                    </p>
                  </button>
                ))
              )}
            </div>
          )}
        </section>
      )}

      {/* Drawer 3: Bookmarks & Favorites */}
      {activeDrawer === 'bookmarks' && (
        <section className="rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={bookmarkNote}
              onChange={(e) => setBookmarkNote(e.target.value)}
              placeholder="اسم العلامة المرجعية (اختياري، مثل: ورد الفجر)..."
              className="flex-1 min-w-[200px] min-h-[44px] px-3.5 rounded-xl bg-[#e8f6ff] dark:bg-[#112921] text-sm focus:outline-none"
            />
            <button
              type="button"
              onClick={() => addBookmark()}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#ffc968] hover:bg-[#f2be5e] text-[#271900] text-xs font-extrabold flex items-center gap-1.5 shrink-0"
            >
              <Bookmark className="w-4 h-4" />
              <span>حفظ الصفحة الحالية (ص {toArabicDigits(prefs.page)})</span>
            </button>
          </div>

          {bookmarks.length === 0 ? (
            <p className="text-xs sm:text-sm text-[#6e7a71] dark:text-slate-400">
              لا توجد علامات مرجعية محفوظة بعد. احفظ صفحة أو آية للرجوع إليها سريعاً.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto">
              {bookmarks.map((bm) => (
                <div
                  key={bm.id}
                  className="p-3 rounded-xl bg-[#fffbf2] dark:bg-[#112921] border border-amber-500/25 flex items-center justify-between gap-2"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setActiveDrawer(null);
                      goToPage(bm.page);
                    }}
                    className="text-start min-w-0 flex-1"
                  >
                    <p className="text-xs font-extrabold text-[#0e1d25] dark:text-white truncate">{bm.label}</p>
                    <p className="text-[11px] text-[#006a46] dark:text-[#6cdba6] tabular-nums">
                      صفحة {toArabicDigits(bm.page)} · {bm.surahName}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeBookmark(bm.id)}
                    aria-label="حذف العلامة"
                    className="w-8 h-8 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/50 text-rose-600 flex items-center justify-center shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Drawer 4: Reading & Tafsir Settings */}
      {activeDrawer === 'settings' && (
        <section className="rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#eef7f3] dark:bg-[#112921]">
              <button
                type="button"
                onClick={() => setPrefs((p) => ({...p, mode: 'page'}))}
                className={`min-h-[38px] px-4 rounded-lg text-xs font-bold ${
                  prefs.mode === 'page' ? 'bg-[#006a46] text-white' : 'text-[#3e4a42] dark:text-slate-300'
                }`}
              >
                وضع الصفحات (٦٠٤ صفحة)
              </button>
              <button
                type="button"
                onClick={() => {
                  const currentSurah = pageBlocks[0]?.surahNumber || prefs.surah;
                  setPrefs((p) => ({...p, mode: 'surah', surah: currentSurah}));
                }}
                className={`min-h-[38px] px-4 rounded-lg text-xs font-bold ${
                  prefs.mode === 'surah' ? 'bg-[#006a46] text-white' : 'text-[#3e4a42] dark:text-slate-300'
                }`}
              >
                قراءة السورة كاملة
              </button>
            </div>

            <label className="flex items-center gap-2 text-xs font-bold text-[#0e1d25] dark:text-white cursor-pointer">
              <input
                type="checkbox"
                checked={prefs.showInlineTafsir}
                onChange={(e) => setPrefs((p) => ({...p, showInlineTafsir: e.target.checked}))}
                className="w-4 h-4 accent-[#006a46]"
              />
              <span>إظهار التفسير أسفل الآيات مباشرة</span>
            </label>
          </div>

          <ReadingControlsBar
            fontSize={readingPrefs.fontSize}
            fontFamily={activeQuranFamily}
            onChangeFontSize={(fontSize) => updateReadingPrefs({fontSize})}
            onChangeFontFamily={(fontFamily) => updateReadingPrefs({fontFamily})}
            allowedFamilies={['amiri', 'scheherazade', 'naskh', 'cairo']}
            title="تخصيص خط وحجم المصحف الشريف لجميع الأعمار"
          />
        </section>
      )}

      {/* Main Framed Mushaf Surface */}
      {mushafCanvas}

      {/* Bottom Pagination */}
      {prefs.mode === 'page' ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            disabled={prefs.page <= 1}
            onClick={() => goToPage(prefs.page - 1)}
            className="min-h-[48px] px-4 py-2.5 rounded-xl bg-white dark:bg-[#0d211a] border border-slate-200 dark:border-white/10 disabled:opacity-40 text-sm font-bold flex items-center gap-2"
          >
            <PrevIcon className="w-4 h-4" />
            <span>{tr('الصفحة السابقة', 'Previous Page')}</span>
          </button>

          <span className="text-xs font-bold text-[#6e7a71] dark:text-slate-400 tabular-nums">
            صفحة {toArabicDigits(prefs.page)} من {toArabicDigits(TOTAL_PAGES)}
          </span>

          <button
            type="button"
            disabled={prefs.page >= TOTAL_PAGES}
            onClick={() => goToPage(prefs.page + 1)}
            className="min-h-[48px] px-4 py-2.5 rounded-xl bg-[#006a46] hover:bg-[#005235] disabled:opacity-40 text-white text-sm font-bold flex items-center gap-2"
          >
            <span>{tr('الصفحة التالية', 'Next Page')}</span>
            <NextIcon className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={prefs.surah <= 1}
            onClick={() => {
              const prev = surahs.find((s) => s.n === prefs.surah - 1);
              if (prev) selectSurah(prev);
            }}
            className="min-h-[48px] px-4 py-2.5 rounded-xl bg-white dark:bg-[#0d211a] border border-slate-200 dark:border-white/10 disabled:opacity-40 text-sm font-bold flex items-center gap-2"
          >
            <PrevIcon className="w-4 h-4" />
            <span>السورة السابقة</span>
          </button>

          <span className="text-xs font-semibold text-[#6e7a71] dark:text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#006a46] dark:text-[#6cdba6]" />
            <span>سورة {toArabicDigits(prefs.surah)} من {toArabicDigits(114)}</span>
          </span>

          <button
            type="button"
            disabled={prefs.surah >= 114}
            onClick={() => {
              const next = surahs.find((s) => s.n === prefs.surah + 1);
              if (next) selectSurah(next);
            }}
            className="min-h-[48px] px-4 py-2.5 rounded-xl bg-[#006a46] hover:bg-[#005235] disabled:opacity-40 text-white text-sm font-bold flex items-center gap-2"
          >
            <span>السورة التالية</span>
            <NextIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Interactive Verified Multi-Mufassir & 7-Language Tafsir Drawer/Modal */}
      {tafsirOpen && selectedAyah && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 pt-[40px]"
          onClick={() => setTafsirOpen(false)}
        >
          <section
            role="dialog"
            aria-label="التفسير المعتمد للآية"
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-2xl max-h-[85vh] rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#0b1f18] border border-slate-200/80 dark:border-white/15 shadow-2xl flex flex-col overflow-hidden"
          >
            <header className="px-5 py-4 bg-gradient-to-l from-[#006a46] to-[#005235] text-white flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold text-[#ffdea8]">التفسير المعتمد · ٥ أئمة بـ ٧ لغات</p>
                <h3 className="text-base sm:text-lg font-extrabold">
                  {selectedAyah.surahName} — آية {toArabicDigits(selectedAyah.ayahNumber)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setTafsirOpen(false)}
                aria-label="إغلاق التفسير"
                className="w-9 h-9 rounded-full hover:bg-white/15 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
              {/* Ayah Text Box */}
              <div
                dir="rtl"
                style={{fontFamily: activeFontFamily}}
                className="rounded-2xl bg-[#fffdf6] dark:bg-[#071611] border border-[#d6c9a5] dark:border-emerald-800/60 p-4 text-center text-lg sm:text-xl text-[#1b241f] dark:text-[#eef7f2] leading-loose"
              >
                ﴿ {selectedAyah.text} ﴾
              </div>

              {/* 5 Mufassirs Selector */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {MUFASSIR_OPTIONS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPrefs((p) => ({...p, mufassir: m.id}))}
                    className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-colors ${
                      prefs.mufassir === m.id
                        ? 'bg-[#006a46] text-white'
                        : 'bg-[#eef7f3] dark:bg-[#112921] text-[#3e4a42] dark:text-slate-300'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* 7 Languages + Zoom Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {TAFSIR_LANGS.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setPrefs((p) => ({...p, tafsirLang: l.id}))}
                      className={`min-h-[32px] px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                        prefs.tafsirLang === l.id
                          ? 'bg-[#7c5800] text-white'
                          : 'bg-slate-100 dark:bg-white/10 text-[#3e4a42] dark:text-slate-300'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPrefs((p) => ({...p, tafsirZoom: Math.max(14, p.tafsirZoom - 2)}))}
                    aria-label="تصغير خط التفسير"
                    className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/10 flex items-center justify-center"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrefs((p) => ({...p, tafsirZoom: Math.min(30, p.tafsirZoom + 2)}))}
                    aria-label="تكبير خط التفسير"
                    className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/10 flex items-center justify-center"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Tafsir Body */}
              <div className="rounded-2xl bg-[#f4faff] dark:bg-[#081712] border border-slate-200/70 dark:border-white/10 p-4 sm:p-5 space-y-2">
                <p className="text-xs font-extrabold text-[#006a46] dark:text-[#6cdba6]">
                  {tafsirEdition || MUFASSIR_OPTIONS.find((m) => m.id === prefs.mufassir)?.label}
                </p>
                {tafsirLoading ? (
                  <p className="text-sm text-[#6e7a71] py-4 text-center">جاري جلب التفسير المعتمد...</p>
                ) : tafsirError ? (
                  <p className="text-sm text-rose-600">{tafsirError}</p>
                ) : (
                  <p
                    dir={currentTafsirLangMeta.dir}
                    style={{fontSize: `${prefs.tafsirZoom}px`, lineHeight: 1.85}}
                    className="text-[#0e1d25] dark:text-slate-100 whitespace-pre-line"
                  >
                    {tafsirText}
                  </p>
                )}
              </div>
            </div>

            <footer className="px-5 py-3.5 border-t border-slate-200/70 dark:border-white/10 bg-[#fafcfb] dark:bg-[#081712] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void copyAyahAndTafsir()}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#006a46] text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ الآية والتفسير</span>
                </button>
                <button
                  type="button"
                  onClick={() => void shareAyahAndTafsir()}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#e8f6ff] dark:bg-[#112921] text-[#006a46] dark:text-[#6cdba6] text-xs font-bold flex items-center gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>مشاركة</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => addBookmark(selectedAyah)}
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#ffdea8] text-[#271900] text-xs font-bold flex items-center gap-1.5"
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>حفظ الآية في المفضلة</span>
              </button>
            </footer>
          </section>
        </div>
      )}

      {/* Fullscreen Focused Reading Mode Overlay */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-[#fffdf6] dark:bg-[#05100c] overflow-y-auto pt-[44px] pb-24 px-3 sm:px-8">
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-between gap-3 py-2">
              <span className="text-xs font-extrabold text-[#006a46] dark:text-[#6cdba6]">
                وضع القراءة المركزة · {pageBlocks.map((b) => b.surahName).join(' · ')}
              </span>
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="min-h-[40px] px-4 py-1.5 rounded-xl bg-[#006a46] text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Minimize2 className="w-4 h-4" />
                <span>إنهاء القراءة المركزة</span>
              </button>
            </div>
            {mushafCanvas}
          </div>

          <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto rounded-2xl bg-white/95 dark:bg-[#0b1f18]/95 backdrop-blur-md border border-slate-200 dark:border-white/15 shadow-xl px-4 py-2.5 flex items-center justify-between">
            <button
              type="button"
              disabled={prefs.page <= 1}
              onClick={() => goToPage(prefs.page - 1)}
              className="min-h-[40px] px-3 rounded-xl bg-[#eef7f3] dark:bg-[#112921] text-[#006a46] dark:text-[#6cdba6] disabled:opacity-40 text-xs font-bold flex items-center gap-1"
            >
              <PrevIcon className="w-4 h-4" />
              <span>السابقة</span>
            </button>
            <span className="text-xs font-extrabold tabular-nums">
              {toArabicDigits(prefs.page)} / {toArabicDigits(TOTAL_PAGES)}
            </span>
            <button
              type="button"
              disabled={prefs.page >= TOTAL_PAGES}
              onClick={() => goToPage(prefs.page + 1)}
              className="min-h-[40px] px-3 rounded-xl bg-[#006a46] text-white disabled:opacity-40 text-xs font-bold flex items-center gap-1"
            >
              <span>التالية</span>
              <NextIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {!isFullscreen && (
        <FloatingReadingBar
          fontSize={readingPrefs.fontSize}
          fontFamily={activeQuranFamily}
          readingTheme={readingPrefs.readingTheme}
          onChangeFontSize={(fontSize) => updateReadingPrefs({fontSize})}
          onChangeFontFamily={(fontFamily) => updateReadingPrefs({fontFamily})}
          onChangeReadingTheme={(readingTheme) => updateReadingPrefs({readingTheme})}
          allowedFamilies={['amiri', 'scheherazade', 'naskh', 'cairo']}
          contextLabel={tr('شريط التحكم لقراءة المصحف الشريف', 'Quran Reading Controls')}
        />
      )}
    </div>
  );
}
