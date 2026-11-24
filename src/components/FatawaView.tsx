import {
  Award,
  Bookmark,
  BookOpen,
  Copy,
  ExternalLink,
  Globe,
  RefreshCw,
  Scale,
  Search,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {FATWA_CATEGORIES, FATWA_SCHOLARS} from '../data/seed';
import type {
  FatwaItem,
  FatwaScholarId,
  Post,
  SavedArchiveFatwa,
  ScholarlySiteItem,
  SiteConfig,
} from '../types';
import {useI18n} from '../utils/i18n';
import {resolveFontFamilyCss, resolveFontSizeSpec, useReadingPrefs} from '../utils/readingPrefs';
import {getPublicSiteUrl} from '../utils/storage';
import {ComingSoonState} from './ComingSoonState';

const SCHOLAR_EN_MAP: Record<FatwaScholarId, string> = {
  hajouri: 'Sheikh Yahya Al-Hajouri',
  wadaei: 'Imam Muqbil Al-Wadaei',
  binbaz: 'Sheikh Ibn Baz',
  uthaymeen: 'Sheikh Ibn Uthaymeen',
  albani: 'Imam Al-Albani',
};

const CAT_EN_MAP: Record<string, string> = {
  الكل: 'All',
  العقيدة: 'Creed',
  'الصلاة والطهارة': 'Prayer & Purification',
  'طلب العلم والمنهج': 'Knowledge & Methodology',
  'الأسرة والبر': 'Family & Parents',
  'المعاملات والأخلاق': 'Dealings & Manners',
  'الصيام والزكاة والحج': 'Fasting, Zakah & Hajj',
};

const LOCAL_FATWA_BOOKMARKS_KEY = 'mawaedh_fatwa_bookmarks_v1';
const LOCAL_ARCHIVE_FATWA_BOOKMARKS_KEY = 'mawaedh_archive_fatwa_bookmarks_v1';

export function FatawaView({
  fatawa,
  siteConfig,
  bookmarkedFatwaIds,
  savedArchiveFatawa,
  onToggleFatwaBookmark,
  onToggleArchiveFatwaBookmark,
  onNavigateBookmarks,
  onShareCard,
  onNotify,
}: {
  fatawa: FatwaItem[];
  siteConfig: SiteConfig;
  bookmarkedFatwaIds?: string[];
  savedArchiveFatawa?: SavedArchiveFatwa[];
  onToggleFatwaBookmark?: (id: string) => void;
  onToggleArchiveFatwaBookmark?: (item: SavedArchiveFatwa) => void;
  onNavigateBookmarks?: () => void;
  onShareCard: (post: Post) => void;
  onNotify: (msg: string) => void;
}) {
  const {isEn, tr, formatNumber} = useI18n();
  const {prefs} = useReadingPrefs();
  const fontSpec = resolveFontSizeSpec(prefs.fontSize);
  const [viewMode, setViewMode] = useState<'local' | 'archive' | 'favorites'>('local');
  const [selectedScholar, setSelectedScholar] = useState<'all' | FatwaScholarId>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [query, setQuery] = useState('');
  const [internalBookmarks, setInternalBookmarks] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(LOCAL_FATWA_BOOKMARKS_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });
  const [internalArchiveBookmarks, setInternalArchiveBookmarks] = useState<SavedArchiveFatwa[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(LOCAL_ARCHIVE_FATWA_BOOKMARKS_KEY);
      return raw ? (JSON.parse(raw) as SavedArchiveFatwa[]) : [];
    } catch {
      return [];
    }
  });

  const activeBookmarks = bookmarkedFatwaIds ?? internalBookmarks;
  const activeArchiveBookmarks = savedArchiveFatawa ?? internalArchiveBookmarks;

  const handleToggleBookmark = (fatwaId: string) => {
    if (onToggleFatwaBookmark) {
      onToggleFatwaBookmark(fatwaId);
      return;
    }
    setInternalBookmarks((prev) => {
      const exists = prev.includes(fatwaId);
      const next = exists ? prev.filter((x) => x !== fatwaId) : [fatwaId, ...prev];
      try {
        window.localStorage.setItem(LOCAL_FATWA_BOOKMARKS_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage error
      }
      onNotify(
        exists
          ? tr('تم إلغاء حفظ الفتوى من المفضلة والمحفوظات', 'Fatwa removed from favorites & bookmarks')
          : tr('تم تمييز الفتوى كمفضلة وحفظها في قسم المحفوظات', 'Fatwa marked as favorite & saved to Bookmarks'),
      );
      return next;
    });
  };

  const handleToggleArchiveBookmark = (item: SavedArchiveFatwa) => {
    if (onToggleArchiveFatwaBookmark) {
      onToggleArchiveFatwaBookmark(item);
      return;
    }
    setInternalArchiveBookmarks((prev) => {
      const exists = prev.some((x) => x.id === item.id);
      const next = exists ? prev.filter((x) => x.id !== item.id) : [item, ...prev];
      try {
        window.localStorage.setItem(LOCAL_ARCHIVE_FATWA_BOOKMARKS_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage error
      }
      onNotify(
        exists
          ? tr('تم إلغاء حفظ الفتوى من المفضلة والمحفوظات', 'Fatwa removed from favorites & bookmarks')
          : tr('تم تمييز الفتوى كمفضلة وحفظها في قسم المحفوظات', 'Fatwa marked as favorite & saved to Bookmarks'),
      );
      return next;
    });
  };

  // Worldwide Live Archive state (sh-yahia.net & alilmia.com)
  const [archiveItems, setArchiveItems] = useState<ScholarlySiteItem[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveSiteFilter, setArchiveSiteFilter] = useState<'all' | 'sh_yahia' | 'alilmia'>('all');
  const [remoteFatwa, setRemoteFatwa] = useState<{
    id: string;
    url: string;
    title: string;
    question: string;
    answer: string;
    siteName: string;
    siteId?: 'sh_yahia' | 'alilmia';
  } | null>(null);
  const [remoteLoading, setRemoteLoading] = useState(false);

  const loadArchive = useCallback(async (forceRefresh = false) => {
    setArchiveLoading(true);
    try {
      const res = await fetch(`/api/fatawa/archive${forceRefresh ? '?refresh=1' : ''}`, {cache: 'no-store'});
      if (!res.ok) return;
      const data = (await res.json()) as {items?: ScholarlySiteItem[]};
      if (Array.isArray(data.items)) {
        setArchiveItems(data.items);
      }
    } catch {
      // Keep cached archive items
    } finally {
      setArchiveLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadArchive(false);
  }, [loadArchive]);

  const openRemoteFatwa = async (item: {
    id: string;
    url: string;
    title: string;
    siteName: string;
    siteId?: 'sh_yahia' | 'alilmia';
    cachedAnswer?: string;
  }) => {
    setRemoteLoading(true);
    setRemoteFatwa({
      id: item.id,
      url: item.url,
      title: item.title,
      question: item.title,
      answer: item.cachedAnswer || '',
      siteName: item.siteName,
      siteId: item.siteId,
    });
    try {
      const res = await fetch(`/api/fatawa/remote?url=${encodeURIComponent(item.url)}`, {cache: 'no-store'});
      const data = (await res.json()) as {question?: string; answer?: string; error?: string};
      if (!res.ok) {
        throw new Error(data.error || 'Error');
      }
      setRemoteFatwa({
        id: item.id,
        url: item.url,
        title: item.title,
        question: data.question || item.title,
        answer:
          data.answer ||
          item.cachedAnswer ||
          tr('لم يتوفر نص مفصل، يمكنك فتح الرابط الأصلي أدناه.', 'Open original source link below.'),
        siteName: item.siteName,
        siteId: item.siteId,
      });
    } catch {
      setRemoteFatwa({
        id: item.id,
        url: item.url,
        title: item.title,
        question: item.title,
        answer:
          item.cachedAnswer ||
          tr(
            'تعذر استخلاص النص تلقائياً — يمكنك قراءة الفتوى مباشرة على الموقع الرسمي عبر الزر أدناه.',
            'Unable to fetch full text right now — use the official link button below to read directly.',
          ),
        siteName: item.siteName,
        siteId: item.siteId,
      });
    } finally {
      setRemoteLoading(false);
    }
  };

  const sortedFatawa = useMemo(() => {
    const priorityOrder: Record<FatwaScholarId, number> = {
      hajouri: 0,
      wadaei: 1,
      binbaz: 2,
      uthaymeen: 3,
      albani: 4,
    };
    return [...fatawa].sort((a, b) => {
      const diff = (priorityOrder[a.scholarId] ?? 9) - (priorityOrder[b.scholarId] ?? 9);
      if (diff !== 0) return diff;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [fatawa]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sortedFatawa.filter((item) => {
      const matchScholar = selectedScholar === 'all' || item.scholarId === selectedScholar;
      const matchCat = selectedCategory === 'الكل' || item.category === selectedCategory;
      const matchQuery =
        !q ||
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        item.scholarName.toLowerCase().includes(q) ||
        item.source.toLowerCase().includes(q);
      return matchScholar && matchCat && matchQuery;
    });
  }, [sortedFatawa, selectedScholar, selectedCategory, query]);

  const filteredArchive = useMemo(() => {
    const q = query.trim().toLowerCase();
    return archiveItems.filter((item) => {
      const matchSite = archiveSiteFilter === 'all' || item.siteId === archiveSiteFilter;
      const matchQuery =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.siteNameAr.toLowerCase().includes(q) ||
        item.siteNameEn.toLowerCase().includes(q);
      return matchSite && matchQuery;
    });
  }, [archiveItems, archiveSiteFilter, query]);

  const hajouriCount = useMemo(
    () => fatawa.filter((f) => f.scholarId === 'hajouri').length,
    [fatawa],
  );

  const favoriteFatawa = useMemo(() => {
    const q = query.trim().toLowerCase();
    const idSet = new Set(activeBookmarks);
    return sortedFatawa.filter((item) => {
      if (!idSet.has(item.id)) return false;
      if (!q) return true;
      return (
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        item.scholarName.toLowerCase().includes(q) ||
        item.source.toLowerCase().includes(q)
      );
    });
  }, [sortedFatawa, activeBookmarks, query]);

  const favoriteArchiveFatawa = useMemo(() => {
    const q = query.trim().toLowerCase();
    return activeArchiveBookmarks.filter((item) => {
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.question.toLowerCase().includes(q) ||
        (item.answer || '').toLowerCase().includes(q) ||
        item.siteName.toLowerCase().includes(q)
      );
    });
  }, [activeArchiveBookmarks, query]);

  const savedLocalCount = useMemo(
    () => fatawa.filter((f) => activeBookmarks.includes(f.id)).length,
    [fatawa, activeBookmarks],
  );
  const savedCount = savedLocalCount + activeArchiveBookmarks.length;

  const copyFatwa = async (item: FatwaItem) => {
    const fatawaUrl = getPublicSiteUrl('/?tab=fatawa');
    const formatted = `⚖️ *فتوى شرعية · ${item.scholarName}*\n\n❓ *السؤال:* ${item.question}\n\n✅ *الجواب:* ${item.answer}\n\n📚 المصدر: ${item.source}\n🌐 رابط الموقع: ${fatawaUrl}\n— ${siteConfig.appName}`;
    try {
      await navigator.clipboard.writeText(formatted);
      onNotify(tr('تم نسخ الفتوى مع رابط الموقع وجاهزة للنشر', 'Fatwa & site link copied cleanly for sharing'));
    } catch {
      onNotify(tr('تم تجهيز الفتوى للمشاركة', 'Fatwa ready to share'));
    }
  };

  const exportFatwaCard = (item: FatwaItem) => {
    onShareCard({
      id: item.id,
      title: item.question,
      excerpt: item.answer,
      body: item.answer,
      author: item.scholarName,
      sourceLabel: item.source,
      category: item.category,
      mediaType: 'quote',
      cardTheme: item.scholarId === 'hajouri' ? 'emerald' : 'gold',
      likes: 0,
      commentsCount: 0,
      publishedAtLabel: item.category,
      createdAt: item.createdAt,
    });
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Main Header */}
      <section className="rounded-2xl bg-gradient-to-br from-[#006a46] via-[#007a52] to-[#004f35] text-white p-5 sm:p-6 shadow-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-[#ffdea8] text-xs font-semibold">
              <Scale className="w-4 h-4" />
              <span>{tr('فتاوى أهل العلم والسنة · موسوعة عالمية موثقة', 'Global Scholars Fatawa Encyclopedia')}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold">
              {isEn ? 'Verified Fatawa of Major Scholars' : siteConfig.fatawaTitle}
            </h1>
            <p className="text-xs sm:text-sm text-white/90 max-w-2xl leading-relaxed">
              {isEn
                ? 'Comprehensive documented rulings prioritizing Sheikh Yahya bin Ali Al-Hajouri alongside Al-Wadaei, Ibn Baz, Ibn Uthaymeen, and Al-Albani — plus direct live archive reading.'
                : siteConfig.fatawaSubtitle}
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center">
            <div className="text-xs bg-white/15 backdrop-blur-md px-4 py-2.5 rounded-xl tabular-nums">
              <span className="font-bold text-base block">{formatNumber(fatawa.length)}</span>
              <span>{tr('فتوى مصنفة', 'Indexed Fatawa')}</span>
            </div>
            <button
              type="button"
              onClick={() => setViewMode('favorites')}
              className="text-xs bg-white/15 hover:bg-white/25 backdrop-blur-md px-4 py-2.5 rounded-xl tabular-nums text-start transition-colors"
            >
              <span className="font-bold text-base block">{formatNumber(savedCount)}</span>
              <span>{tr('في المفضلة', 'Bookmarked')}</span>
            </button>
            {archiveItems.length > 0 && (
              <div className="text-xs bg-[#ffdea8] text-[#271900] px-4 py-2.5 rounded-xl tabular-nums">
                <span className="font-bold text-base block">+{formatNumber(archiveItems.length)}</span>
                <span className="font-semibold">{tr('أرشيف مباشر', 'Live Archive')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Mode Switcher: Offline Verified Encyclopedia vs. Favorites vs. Live Worldwide Archive */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/15">
          <button
            type="button"
            onClick={() => setViewMode('local')}
            className={`min-h-[42px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors ${
              viewMode === 'local'
                ? 'bg-[#ffdea8] text-[#271900]'
                : 'bg-white/15 hover:bg-white/25 text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>
              {tr(`الموسوعة الشاملة (${formatNumber(fatawa.length)})`, `Verified Encyclopedia (${formatNumber(fatawa.length)})`)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('favorites')}
            className={`min-h-[42px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors ${
              viewMode === 'favorites'
                ? 'bg-[#ffdea8] text-[#271900]'
                : 'bg-white/15 hover:bg-white/25 text-white'
            }`}
          >
            <Star className={`w-4 h-4 ${savedCount > 0 ? 'fill-current' : ''}`} />
            <span>
              {tr(`الفتاوى المفضلة (${formatNumber(savedCount)})`, `Favorites (${formatNumber(savedCount)})`)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('archive')}
            className={`min-h-[42px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors ${
              viewMode === 'archive'
                ? 'bg-[#ffdea8] text-[#271900]'
                : 'bg-white/15 hover:bg-white/25 text-white'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>
              {tr(
                `أرشيف الفتاوى المباشر (${formatNumber(archiveItems.length)})`,
                `Live Global Archive (${formatNumber(archiveItems.length)})`,
              )}
            </span>
          </button>

          <div className="flex flex-wrap items-center gap-2 ms-auto">
            {onNavigateBookmarks && (
              <button
                type="button"
                onClick={onNavigateBookmarks}
                className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>{tr('قسم المحفوظات', 'Bookmarks Section')}</span>
              </button>
            )}
            <a
              href="https://sh-yahia.net/send_q.php"
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <span>{tr('أرسل فتوى / سؤال للشيخ', 'Submit Question')}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </section>

      {viewMode === 'local' ? (
        <>
          {/* Spotlight Card: Sheikh Yahya bin Ali Al-Hajouri */}
          <section className="rounded-2xl bg-gradient-to-l from-[#fffbf2] to-[#eefaf3] dark:from-[#0f261e] dark:to-[#13241c] border border-[#006a46]/35 dark:border-[#6cdba6]/30 p-5 card-3d flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#006a46] text-[#ffdea8] flex items-center justify-center shrink-0 icon-3d">
                <Star className="w-6 h-6 fill-current" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                  <span className="text-[#006a46] dark:text-[#6cdba6]">
                    {tr('محور الفتاوى الأساسي', 'Primary Fatawa Focus')}
                  </span>
                  <span aria-hidden="true" className="text-slate-400">·</span>
                  <span className="text-[#7c5800] dark:text-[#f2be5e] tabular-nums">
                    {formatNumber(hajouriCount)} {tr('فتاوى وتوجيهات موثقة', 'documented rulings')}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-[#0e1d25] dark:text-white">
                  {tr(
                    'فضيلة الشيخ العلامة يحيى بن علي الحجوري حفظه الله',
                    'Sheikh Yahya bin Ali Al-Hajouri (May Allah preserve him)',
                  )}
                </h2>
                <p className="text-xs sm:text-sm text-[#3e4a42] dark:text-slate-300 leading-relaxed">
                  {tr(
                    'عناية شاملة بفتاوى الشيخ يحيى بن علي الحجوري حفظه الله في العقيدة والمنهج والطهارة والصلاة والأسرة والزكاة والمعاملات، مع فتاوى الأئمة الوادعي وابن باز وابن عثيمين والألباني رحمهم الله.',
                    'Comprehensive coverage of Creed, Worship, Family, Seeking Knowledge, Zakah & Hajj from Sheikh Al-Hajouri, Imam Al-Wadaei, Ibn Baz, Ibn Uthaymeen & Al-Albani.',
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedScholar(selectedScholar === 'hajouri' ? 'all' : 'hajouri')}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 transition-colors ${
                selectedScholar === 'hajouri'
                  ? 'bg-[#7c5800] text-white'
                  : 'bg-[#006a46] hover:bg-[#005235] text-white'
              }`}
            >
              {selectedScholar === 'hajouri'
                ? tr('عرض جميع المشايخ', 'Show All Five Scholars')
                : tr('عرض فتاوى الشيخ الحجوري', 'Filter Sheikh Al-Hajouri')}
            </button>
          </section>

          {/* Scholar Filter Strip */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              <button
                type="button"
                onClick={() => setSelectedScholar('all')}
                className={`min-h-[42px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 transition-colors ${
                  selectedScholar === 'all'
                    ? 'bg-[#006a46] text-white shadow-xs'
                    : 'bg-[#e0f0fb] dark:bg-[#10261e] text-[#3e4a42] dark:text-slate-300'
                }`}
              >
                {tr('جميع العلماء الخمسة', 'All 5 Scholars')} ({formatNumber(fatawa.length)})
              </button>

              {FATWA_SCHOLARS.map((scholar) => {
                const count = fatawa.filter((f) => f.scholarId === scholar.id).length;
                const isSelected = selectedScholar === scholar.id;
                return (
                  <button
                    key={scholar.id}
                    type="button"
                    onClick={() => setSelectedScholar(scholar.id)}
                    className={`min-h-[42px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors ${
                      isSelected
                        ? 'bg-[#006a46] text-white shadow-xs'
                        : scholar.priority
                          ? 'bg-[#ffdea8] dark:bg-[#2a2109] text-[#271900] dark:text-[#ffdea8]'
                          : 'bg-[#e0f0fb] dark:bg-[#10261e] text-[#3e4a42] dark:text-slate-300'
                    }`}
                  >
                    {scholar.priority && <Award className="w-3.5 h-3.5 shrink-0" />}
                    <span>{isEn ? SCHOLAR_EN_MAP[scholar.id] : scholar.name}</span>
                    <span className="opacity-80 tabular-nums">({formatNumber(count)})</span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                {['الكل', ...FATWA_CATEGORIES].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                      selectedCategory === cat
                        ? 'bg-[#006389] text-white'
                        : 'bg-white dark:bg-[#0d211a] border border-slate-200 dark:border-white/10 text-[#3e4a42] dark:text-slate-300'
                    }`}
                  >
                    {isEn ? CAT_EN_MAP[cat] || cat : cat}
                  </button>
                ))}
              </div>

              <div className="relative md:w-72 shrink-0">
                <Search className="w-4 h-4 text-[#6e7a71] absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={tr('ابحث في الأسئلة والفتاوى...', 'Search questions & answers...')}
                  className="w-full min-h-[42px] ps-10 pe-4 rounded-xl bg-white dark:bg-[#0d211a] border border-slate-200 dark:border-white/10 text-sm text-[#0e1d25] dark:text-white focus:outline-none focus:border-[#006a46]"
                />
              </div>
            </div>
          </div>

          {/* Local Fatwa Cards */}
          {filtered.length === 0 ? (
            <ComingSoonState
              badgeText={tr('مكتبة الفتاوى', 'Fatawa Library')}
              title={tr('قريباً بإذن الله.. لا توجد فتاوى مطابقة حالياً', 'Coming Soon — No Matching Fatawa')}
              description={tr(
                'يمكنك إزالة الفلاتر لعرض جميع الفتاوى المعتمدة، أو ترقّب إضافة المزيد من الفتاوى الشرعية قريباً.',
                'Reset filters to view all verified fatawa, or check back soon for new scholarly additions.',
              )}
              actionLabel={tr('عرض جميع الفتاوى', 'Show All Fatawa')}
              onAction={() => {
                setSelectedScholar('all');
                setSelectedCategory('الكل');
                setQuery('');
              }}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filtered.map((item) => {
                const isHajouri = item.scholarId === 'hajouri';
                const isBookmarked = activeBookmarks.includes(item.id);
                return (
                  <article
                    key={item.id}
                    className={`rounded-2xl border p-5 sm:p-6 card-3d space-y-4 ${
                      isBookmarked
                        ? 'bg-[#fffdf7] dark:bg-[#11251d] border-[#f2be5e] dark:border-[#f2be5e]/60'
                        : isHajouri
                          ? 'bg-white dark:bg-[#0d211a] border-[#006a46]/45 dark:border-[#6cdba6]/35'
                          : 'bg-white dark:bg-[#0d211a] border-slate-200/80 dark:border-white/10'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                        <span
                          className={
                            isHajouri
                              ? 'text-[#006a46] dark:text-[#6cdba6]'
                              : 'text-[#006389] dark:text-[#80cfff]'
                          }
                        >
                          {isEn ? SCHOLAR_EN_MAP[item.scholarId] : item.scholarName}
                        </span>
                        <span aria-hidden="true" className="text-slate-400">·</span>
                        <span className="text-[#7c5800] dark:text-[#f2be5e]">
                          {isEn ? CAT_EN_MAP[item.category] || item.category : item.category}
                        </span>
                        {isBookmarked && (
                          <span className="px-2 py-0.5 rounded-lg bg-[#ffc968]/35 text-[#7c5800] dark:text-[#ffdea8] text-[11px] flex items-center gap-1">
                            <Star className="w-3 h-3 fill-current" />
                            <span>{tr('مفضلة ومحفوظة', 'Favorited & Saved')}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleBookmark(item.id)}
                          aria-label={
                            isBookmarked
                              ? tr('إلغاء حفظ الفتوى من المفضلة والمحفوظات', 'Remove fatwa from favorites & bookmarks')
                              : tr('تمييز الفتوى كمفضلة وحفظها في المحفوظات', 'Mark fatwa as favorite & save to Bookmarks')
                          }
                          aria-pressed={isBookmarked}
                          className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                            isBookmarked
                              ? 'bg-[#ffc968] hover:bg-[#ffdad6] text-[#271900] hover:text-[#ba1a1a] shadow-xs'
                              : 'bg-slate-100 dark:bg-white/10 text-[#3e4a42] dark:text-slate-200 hover:bg-[#ffdea8]/70 hover:text-[#271900]'
                          }`}
                        >
                          <Star className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
                          <span>
                            {isBookmarked
                              ? tr('مفضلة · إلغاء الحفظ', 'Saved · Unsave')
                              : tr('تمييز كمفضلة وحفظ', 'Favorite & Save')}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void copyFatwa(item)}
                          className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#e8f6ff] dark:bg-[#133126] text-[#006a46] dark:text-[#6cdba6] text-xs font-bold flex items-center gap-1.5"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>{tr('نسخ للنشر', 'Copy')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => exportFatwaCard(item)}
                          className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#fffbf2] dark:bg-white/10 text-[#7c5800] dark:text-[#f2be5e] text-xs font-bold flex items-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{isEn ? 'PNG Card' : siteConfig.exportCardBtn}</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {/* Question tonal container without left/right thick border stripe */}
                      <div className="p-4 rounded-xl bg-[#f4faff] dark:bg-[#112921] border border-slate-200/70 dark:border-white/10">
                        <span className="text-xs font-bold text-[#006a46] dark:text-[#6cdba6] block mb-1">
                          {tr('السؤال:', 'Question:')}
                        </span>
                        <h2
                          dir="rtl"
                          style={{fontFamily: resolveFontFamilyCss(prefs.fontFamily)}}
                          className={`${fontSpec.bodyClass} font-bold text-[#0e1d25] dark:text-white`}
                        >
                          {item.question}
                        </h2>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-xs font-bold text-[#7c5800] dark:text-[#f2be5e] flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>{tr('الجواب:', 'Answer:')}</span>
                        </span>
                        <p
                          dir="rtl"
                          style={{fontFamily: resolveFontFamilyCss(prefs.fontFamily)}}
                          className={`${fontSpec.bodyClass} text-[#1e2d25] dark:text-slate-200`}
                        >
                          {item.answer}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-[#6e7a71] dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-white/10">
                      {tr('المصدر:', 'Source:')} {item.source}
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </>
      ) : viewMode === 'favorites' ? (
        <section className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl bg-[#fffbf2] dark:bg-[#12251d] border border-[#f2be5e]/40 p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#ffc968] text-[#271900] flex items-center justify-center shrink-0 icon-3d">
                <Star className="w-5 h-5 fill-current" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#0e1d25] dark:text-white">
                  {tr('مفضلتي من الفتاوى الشرعية', 'My Favorited Fatawa')}
                </h2>
                <p className="text-xs text-[#3e4a42] dark:text-slate-300">
                  {tr(
                    'جميع الفتاوى المميّزة كمفضلة تُحفظ تلقائياً في قسم المحفوظات للرجوع السريع في أي وقت مع إمكانية إلغاء الحفظ.',
                    'All favorited rulings are saved in Bookmarks for fast offline access anytime and can be unsaved whenever needed.',
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="relative sm:w-56">
                <Search className="w-4 h-4 text-[#6e7a71] absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={tr('ابحث في المفضلة...', 'Search favorites...')}
                  className="w-full min-h-[40px] ps-10 pe-4 rounded-xl bg-white dark:bg-[#0d211a] border border-slate-200 dark:border-white/10 text-sm text-[#0e1d25] dark:text-white focus:outline-none focus:border-[#006a46]"
                />
              </div>

              {onNavigateBookmarks && (
                <button
                  type="button"
                  onClick={onNavigateBookmarks}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#006a46] hover:bg-[#005235] text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>{tr('فتح قسم المحفوظات', 'Open Bookmarks')}</span>
                </button>
              )}
            </div>
          </div>

          {favoriteFatawa.length === 0 && favoriteArchiveFatawa.length === 0 ? (
            <div className="rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-10 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#fffbf2] dark:bg-[#171d18] text-[#7c5800] dark:text-[#f2be5e] flex items-center justify-center mx-auto icon-3d">
                <Star className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-bold text-[#0e1d25] dark:text-white">
                  {savedCount === 0
                    ? tr('قائمة مفضلة الفتاوى فارغة حالياً', 'Your Fatawa favorites list is empty')
                    : tr('لا توجد فتاوى مفضلة مطابقة للبحث', 'No favorited fatawa match your search')}
                </p>
                <p className="text-xs sm:text-sm text-[#6e7a71] dark:text-slate-400">
                  {savedCount === 0
                    ? tr(
                        'اضغط على زر «تمييز كمفضلة وحفظ» بجانب أي فتوى في الموسوعة أو الأرشيف لإضافتها هنا وفي قسم المحفوظات.',
                        'Tap «Favorite & Save» on any ruling in the Encyclopedia or Archive to save it here and in Bookmarks.',
                      )
                    : tr('جرّب مسح كلمة البحث لعرض جميع الفتاوى المحفوظة.', 'Clear search to view all saved fatawa.')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (savedCount === 0) {
                    setViewMode('local');
                  } else {
                    setQuery('');
                  }
                }}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-[#006a46] hover:bg-[#005235] text-white text-sm font-bold transition-colors"
              >
                {savedCount === 0 ? tr('تصفح موسوعة الفتاوى', 'Browse Encyclopedia') : tr('عرض كل المحفوظات', 'Show All Saved')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {favoriteFatawa.map((item) => {
                const isHajouri = item.scholarId === 'hajouri';
                return (
                  <article
                    key={item.id}
                    className={`rounded-2xl border p-5 sm:p-6 card-3d space-y-4 ${
                      isHajouri
                        ? 'bg-white dark:bg-[#0d211a] border-[#006a46]/45 dark:border-[#6cdba6]/35'
                        : 'bg-white dark:bg-[#0d211a] border-slate-200/80 dark:border-white/10'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <span
                          className={
                            isHajouri
                              ? 'text-[#006a46] dark:text-[#6cdba6]'
                              : 'text-[#006389] dark:text-[#80cfff]'
                          }
                        >
                          {isEn ? SCHOLAR_EN_MAP[item.scholarId] : item.scholarName}
                        </span>
                        <span aria-hidden="true" className="text-slate-400">·</span>
                        <span className="text-[#7c5800] dark:text-[#f2be5e]">
                          {isEn ? CAT_EN_MAP[item.category] || item.category : item.category}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleBookmark(item.id)}
                          aria-label={tr('إلغاء حفظ الفتوى من المفضلة والمحفوظات', 'Unsave fatwa from favorites & bookmarks')}
                          aria-pressed
                          className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#ffc968] text-[#271900] text-xs font-bold flex items-center gap-1.5 shadow-xs hover:bg-[#ffdad6] hover:text-[#ba1a1a] transition-colors"
                        >
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span>{tr('إلغاء الحفظ', 'Unsave')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void copyFatwa(item)}
                          className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#e8f6ff] dark:bg-[#133126] text-[#006a46] dark:text-[#6cdba6] text-xs font-bold flex items-center gap-1.5"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>{tr('نسخ للنشر', 'Copy')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => exportFatwaCard(item)}
                          className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#fffbf2] dark:bg-white/10 text-[#7c5800] dark:text-[#f2be5e] text-xs font-bold flex items-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{isEn ? 'PNG Card' : siteConfig.exportCardBtn}</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="p-4 rounded-xl bg-[#f4faff] dark:bg-[#112921] border border-slate-200/70 dark:border-white/10">
                        <span className="text-xs font-bold text-[#006a46] dark:text-[#6cdba6] block mb-1">
                          {tr('السؤال:', 'Question:')}
                        </span>
                        <h2 dir="rtl" className="text-base font-bold text-[#0e1d25] dark:text-white leading-relaxed">
                          {item.question}
                        </h2>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-xs font-bold text-[#7c5800] dark:text-[#f2be5e] flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>{tr('الجواب:', 'Answer:')}</span>
                        </span>
                        <p dir="rtl" className="text-sm sm:text-base text-[#1e2d25] dark:text-slate-200 leading-loose">
                          {item.answer}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-[#6e7a71] dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-white/10">
                      {tr('المصدر:', 'Source:')} {item.source}
                    </p>
                  </article>
                );
              })}

              {favoriteArchiveFatawa.map((item) => (
                <article
                  key={`arch_fav_${item.id}`}
                  className="rounded-2xl border border-[#f2be5e] dark:border-[#f2be5e]/50 bg-[#fffdf7] dark:bg-[#0d211a] p-5 sm:p-6 card-3d space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <Globe className="w-3.5 h-3.5 text-[#006a46] dark:text-[#6cdba6]" />
                      <span className="text-[#006a46] dark:text-[#6cdba6]">{item.siteName}</span>
                      {item.kindLabel && (
                        <>
                          <span aria-hidden="true" className="text-slate-400">·</span>
                          <span className="text-[#7c5800] dark:text-[#f2be5e]">{item.kindLabel}</span>
                        </>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleArchiveBookmark(item)}
                        className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#ffc968] text-[#271900] text-xs font-bold flex items-center gap-1.5 shadow-xs hover:bg-[#ffdad6] hover:text-[#ba1a1a] transition-colors"
                      >
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>{tr('إلغاء الحفظ', 'Unsave')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void openRemoteFatwa({
                            id: item.id,
                            url: item.url,
                            title: item.title,
                            siteName: item.siteName,
                            siteId: item.siteId,
                            cachedAnswer: item.answer,
                          })
                        }
                        className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#006a46] text-white text-xs font-bold flex items-center gap-1.5"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>{tr('قراءة الفتوى', 'Read Ruling')}</span>
                      </button>
                    </div>
                  </div>

                  <h3 dir="rtl" className="text-base font-bold text-[#0e1d25] dark:text-white leading-relaxed">
                    {item.question || item.title}
                  </h3>

                  {item.answer && (
                    <p dir="rtl" className="text-sm text-[#1e2d25] dark:text-slate-200 leading-relaxed line-clamp-4">
                      {item.answer}
                    </p>
                  )}

                  <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-xs">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#006389] dark:text-[#80cfff] font-bold flex items-center gap-1 hover:underline"
                    >
                      <span>{tr('المصدر الأصلي', 'Original Source')}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : (
        /* Live Global Archive View (sh-yahia.net/fatawa.php + alilmia.com/fatawa.php) */
        <section className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {(
                [
                  {id: 'all', label: tr(`الكل (${formatNumber(archiveItems.length)})`, `All Sources (${formatNumber(archiveItems.length)})`)},
                  {id: 'sh_yahia', label: tr('فتاوى الشيخ يحيى الحجوري (sh-yahia.net)', 'Sheikh Al-Hajouri (sh-yahia.net)')},
                  {id: 'alilmia', label: tr('الشبكة العلمية (alilmia.com)', 'Alilmia Archive (alilmia.com)')},
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setArchiveSiteFilter(tab.id)}
                  className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-colors ${
                    archiveSiteFilter === tab.id
                      ? 'bg-[#006a46] text-white'
                      : 'bg-white dark:bg-[#0d211a] border border-slate-200 dark:border-white/10 text-[#3e4a42] dark:text-slate-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}

              <button
                type="button"
                disabled={archiveLoading}
                onClick={() => void loadArchive(true)}
                className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#ffdea8] text-[#271900] text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${archiveLoading ? 'animate-spin' : ''}`} />
                <span>{tr('تحديث الأرشيف', 'Sync Archive')}</span>
              </button>
            </div>

            <div className="relative md:w-72 shrink-0">
              <Search className="w-4 h-4 text-[#6e7a71] absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tr('ابحث في الأرشيف المباشر...', 'Search live archive...')}
                className="w-full min-h-[42px] ps-10 pe-4 rounded-xl bg-white dark:bg-[#0d211a] border border-slate-200 dark:border-white/10 text-sm text-[#0e1d25] dark:text-white focus:outline-none focus:border-[#006a46]"
              />
            </div>
          </div>

          {archiveLoading && archiveItems.length === 0 ? (
            <div className="rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-10 text-center space-y-2">
              <RefreshCw className="w-7 h-7 text-[#006a46] dark:text-[#6cdba6] animate-spin mx-auto" />
              <p className="text-sm font-bold text-[#0e1d25] dark:text-white">
                {tr('جاري جلب فهرس الفتاوى المباشر من sh-yahia.net و alilmia.com...', 'Fetching live Fatawa index...')}
              </p>
            </div>
          ) : filteredArchive.length === 0 ? (
            <ComingSoonState
              badgeText={tr('الأرشيف المباشر', 'Live Archive')}
              title={tr('قريباً — لا توجد نتائج مطابقة في الأرشيف المباشر', 'No Archive Matches Right Now')}
              description={tr(
                'جرّب البحث بكلمة أخرى أو تصفّح أرشيف الفتاوى الأصلي مباشرة.',
                'Try another search term or browse the original official fatawa archive.',
              )}
              actionLabel={tr('مسح البحث', 'Clear Search')}
              onAction={() => setQuery('')}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredArchive.map((item) => {
                const isArchiveSaved = activeArchiveBookmarks.some((x) => x.id === item.id);
                const archivePayload: SavedArchiveFatwa = {
                  id: item.id,
                  url: item.url,
                  title: item.title,
                  question: item.title,
                  siteName: isEn ? item.siteNameEn : item.siteNameAr,
                  siteId: item.siteId,
                  kindLabel: isEn ? item.kindLabelEn : item.kindLabelAr,
                  savedAt: new Date().toISOString(),
                };
                return (
                  <article
                    key={item.id}
                    className={`rounded-2xl border p-5 card-3d flex flex-col justify-between gap-3 ${
                      isArchiveSaved
                        ? 'bg-[#fffdf7] dark:bg-[#11251d] border-[#f2be5e] dark:border-[#f2be5e]/50'
                        : 'bg-white dark:bg-[#0d211a] border-slate-200/80 dark:border-white/10'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-xs font-bold">
                        <span className={item.siteId === 'sh_yahia' ? 'text-[#006a46] dark:text-[#6cdba6]' : 'text-[#006389] dark:text-[#80cfff]'}>
                          {isEn ? item.siteNameEn : item.siteNameAr}
                        </span>
                        <span className="text-[#7c5800] dark:text-[#f2be5e]">
                          {isEn ? item.kindLabelEn : item.kindLabelAr}
                        </span>
                      </div>
                      <h3 dir="rtl" className="text-sm sm:text-base font-bold text-[#0e1d25] dark:text-white leading-relaxed">
                        {item.title}
                      </h3>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100 dark:border-white/10">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            void openRemoteFatwa({
                              id: item.id,
                              url: item.url,
                              title: item.title,
                              siteName: isEn ? item.siteNameEn : item.siteNameAr,
                              siteId: item.siteId,
                            })
                          }
                          className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#006a46] hover:bg-[#005235] text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>{tr('قراءة الفتوى', 'Read Ruling')}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleArchiveBookmark(archivePayload)}
                          aria-pressed={isArchiveSaved}
                          className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                            isArchiveSaved
                              ? 'bg-[#ffc968] hover:bg-[#ffdad6] text-[#271900] hover:text-[#ba1a1a]'
                              : 'bg-slate-100 dark:bg-white/10 text-[#3e4a42] dark:text-slate-200 hover:bg-[#ffdea8]/70 hover:text-[#271900]'
                          }`}
                        >
                          <Star className={`w-3.5 h-3.5 ${isArchiveSaved ? 'fill-current' : ''}`} />
                          <span>
                            {isArchiveSaved ? tr('مفضلة · إلغاء الحفظ', 'Saved · Unsave') : tr('مفضلة وحفظ', 'Favorite')}
                          </span>
                        </button>
                      </div>

                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#e8f6ff] dark:bg-[#133126] text-[#006389] dark:text-[#80cfff] text-xs font-bold flex items-center gap-1"
                      >
                        <span>{tr('المصدر الأصلي', 'Source')}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Remote Fatwa Inline Reader Modal */}
      {remoteFatwa && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setRemoteFatwa(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-3xl bg-white dark:bg-[#0c211a] p-5 sm:p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-white/10 pb-3">
              <div className="min-w-0 space-y-1">
                <span className="text-xs font-bold text-[#006a46] dark:text-[#6cdba6] block">
                  {remoteFatwa.siteName}
                </span>
                <h3 dir="rtl" className="text-base sm:text-lg font-bold text-[#0e1d25] dark:text-white leading-snug">
                  {remoteFatwa.question}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRemoteFatwa(null)}
                aria-label={tr('إغلاق', 'Close')}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {remoteLoading ? (
              <div className="py-10 text-center space-y-2">
                <RefreshCw className="w-6 h-6 text-[#006a46] animate-spin mx-auto" />
                <p className="text-xs font-bold text-[#6e7a71] dark:text-slate-400">
                  {tr('جاري جلب نص الفتوى من الموقع الرسمي...', 'Fetching official ruling text...')}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div dir="rtl" className="rounded-2xl bg-[#f4faff] dark:bg-[#081712] border border-slate-200/70 dark:border-white/10 p-4 text-sm sm:text-base text-[#0e1d25] dark:text-slate-200 leading-loose whitespace-pre-line">
                  {remoteFatwa.answer}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-white/10">
              <div className="flex flex-wrap items-center gap-2">
                {(() => {
                  const isModalSaved = activeArchiveBookmarks.some((x) => x.id === remoteFatwa.id);
                  return (
                    <button
                      type="button"
                      onClick={() =>
                        handleToggleArchiveBookmark({
                          id: remoteFatwa.id,
                          url: remoteFatwa.url,
                          title: remoteFatwa.title,
                          question: remoteFatwa.question,
                          answer: remoteFatwa.answer || undefined,
                          siteName: remoteFatwa.siteName,
                          siteId: remoteFatwa.siteId,
                          savedAt: new Date().toISOString(),
                        })
                      }
                      aria-pressed={isModalSaved}
                      className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                        isModalSaved
                          ? 'bg-[#ffc968] hover:bg-[#ffdad6] text-[#271900] hover:text-[#ba1a1a]'
                          : 'bg-slate-100 dark:bg-white/10 text-[#3e4a42] dark:text-slate-200 hover:bg-[#ffdea8]/70 hover:text-[#271900]'
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 ${isModalSaved ? 'fill-current' : ''}`} />
                      <span>
                        {isModalSaved
                          ? tr('مفضلة · إلغاء الحفظ', 'Saved · Unsave')
                          : tr('تمييز كمفضلة وحفظ', 'Favorite & Save')}
                      </span>
                    </button>
                  );
                })()}
                <button
                  type="button"
                  disabled={remoteLoading || !remoteFatwa.answer}
                  onClick={async () => {
                    const txt = `⚖️ *${remoteFatwa.question}*\n\n${remoteFatwa.answer}\n\n🔗 ${remoteFatwa.url}`;
                    try {
                      await navigator.clipboard.writeText(txt);
                      onNotify(tr('تم نسخ الفتوى للمشاركة', 'Fatwa copied'));
                    } catch {
                      onNotify(tr('تعذر النسخ', 'Unable to copy'));
                    }
                  }}
                  className="min-h-[42px] px-3.5 py-2 rounded-xl bg-[#e8f6ff] dark:bg-[#133126] text-[#006a46] dark:text-[#6cdba6] text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{tr('نسخ الفتوى', 'Copy')}</span>
                </button>
                <button
                  type="button"
                  disabled={remoteLoading || !remoteFatwa.answer}
                  onClick={() =>
                    onShareCard({
                      id: `remote_${Date.now()}`,
                      title: remoteFatwa.question,
                      excerpt: remoteFatwa.answer.slice(0, 260),
                      body: remoteFatwa.answer,
                      author: remoteFatwa.siteName,
                      sourceLabel: remoteFatwa.siteName,
                      category: 'فتوى موثقة',
                      mediaType: 'quote',
                      cardTheme: 'emerald',
                      likes: 0,
                      commentsCount: 0,
                      publishedAtLabel: 'الآن',
                      createdAt: new Date().toISOString(),
                    })
                  }
                  className="min-h-[42px] px-3.5 py-2 rounded-xl bg-[#fffbf2] dark:bg-white/10 text-[#7c5800] dark:text-[#f2be5e] text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{tr('تصدير بطاقة', 'PNG Card')}</span>
                </button>
              </div>

              <a
                href={remoteFatwa.url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[42px] px-4 py-2 rounded-xl bg-[#006a46] text-white text-xs font-bold flex items-center gap-1.5"
              >
                <span>{tr('فتح الصفحة الأصلية', 'Open Original Page')}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
