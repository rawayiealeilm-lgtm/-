import {
  Bookmark,
  BookOpen,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Feather,
  FilePlus2,
  FileText,
  FolderArchive,
  Globe,
  GraduationCap,
  Headphones,
  Play,
  RefreshCw,
  Search,
  Send,
  Share2,
  Sparkles,
  Trash2,
  Type,
  Users,
  X,
  Youtube,
} from 'lucide-react';
import {useCallback, useEffect, useMemo, useState, type ChangeEvent} from 'react';
import {LIBRARY_PDF_BOOKS} from '../data/dawahCards';
import {
  ALILMIA_SECTIONS,
  HAJOURI_LESSONS,
  HAJOURI_LESSON_CATEGORIES,
  SADA_AL_KHAIR_SCHOLARS,
  SADA_SUNNAH_POETS,
  SENIOR_IMAMS_WORKS,
  SHEIKH_STUDENTS_WORKS,
  SH_YAHIA_SECTIONS,
} from '../data/seed';
import type {
  HajouriLessonCategory,
  HajouriLessonItem,
  IndexedPdfBookMeta,
  LibraryFilterType,
  Post,
  ScholarlyHubPayload,
  ScholarlySiteItem,
  SiteConfig,
  TelegramAudioItem,
  YouTubeVideoItem,
} from '../types';
import {useI18n} from '../utils/i18n';
import {openExternalPortal} from '../utils/externalPortal';
import {getItemDownloadCount, useLiveStats} from '../utils/liveStats';
import {
  addPdfBooksToIndexedDb,
  deletePdfBookFromIndexedDb,
  getAllPdfRecordsForSection,
  getPdfBlobFromIndexedDb,
  listPdfBooksFromIndexedDb,
} from '../utils/pdfIndexedDb';
import {resolveFontFamilyCss, resolveFontSizeSpec, useReadingPrefs} from '../utils/readingPrefs';
import {createZipBlob, type ZipEntryInput} from '../utils/zipBuilder';
import {ReadingControlsBar} from './ReadingControlsBar';

type PreviewMedia =
  | {kind: 'youtube'; item: YouTubeVideoItem}
  | {kind: 'telegram'; item: TelegramAudioItem};

function parseTelegramPostEmbed(rawUrl: string): {embedUrl: string; cleanUrl: string} | null {
  const trimmed = rawUrl.trim();
  const match = trimmed.match(/(?:https?:\/\/)?(?:t\.me|telegram\.me)\/([A-Za-z0-9_]{3,})\/(\d+)/i);
  if (!match) return null;
  const channel = match[1];
  const msgId = match[2];
  return {
    cleanUrl: `https://t.me/${channel}/${msgId}`,
    embedUrl: `https://t.me/${channel}/${msgId}?embed=1&userpic=false`,
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function LibraryView({
  posts,
  youtubeVideos,
  telegramAudios,
  siteConfig,
  bookmarkedIds,
  initialFilter = 'all',
  isAdmin = false,
  isRefreshingFeeds,
  onRefreshFeeds,
  onCopySada,
  onOpenPost,
  onShareCard,
  onToggleBookmark,
  onNotify,
}: {
  posts: Post[];
  youtubeVideos: YouTubeVideoItem[];
  telegramAudios: TelegramAudioItem[];
  siteConfig: SiteConfig;
  bookmarkedIds: string[];
  initialFilter?: LibraryFilterType;
  isAdmin?: boolean;
  isRefreshingFeeds: boolean;
  onRefreshFeeds: () => void;
  onCopySada: (post: Post) => void;
  onOpenPost: (id: string) => void;
  onShareCard: (post: Post) => void;
  onToggleBookmark: (id: string) => void;
  onNotify: (msg: string) => void;
}) {
  const {isEn, tr, formatNumber} = useI18n();
  const {stats, recordDownload} = useLiveStats();
  const [filterType, setFilterType] = useState<LibraryFilterType>(initialFilter);
  const [hajouriCategory, setHajouriCategory] = useState<'all' | HajouriLessonCategory>('all');
  const [query, setQuery] = useState('');
  const [previewMedia, setPreviewMedia] = useState<PreviewMedia | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<HajouriLessonItem | null>(null);
  const [showReadingControls, setShowReadingControls] = useState(false);

  // Sada Al-Khair Scholars (27) + Sunnah Poets (4)
  const [sadaTab, setSadaTab] = useState<'all' | 'scholars' | 'poets'>('all');

  // Inline Telegram Embed Player state (No login required)
  const [expandedAudioIds, setExpandedAudioIds] = useState<Record<string, boolean>>({});
  const [customTgLink, setCustomTgLink] = useState('');
  const [customTgEmbed, setCustomTgEmbed] = useState<{embedUrl: string; cleanUrl: string} | null>(null);

  // IndexedDB Multi-PDF State
  const [uploadedPdfs, setUploadedPdfs] = useState<IndexedPdfBookMeta[]>([]);
  const [pdfSectionAuthor, setPdfSectionAuthor] = useState('');
  const [uploadingSection, setUploadingSection] = useState<IndexedPdfBookMeta['section'] | null>(null);
  const [pdfViewer, setPdfViewer] = useState<{title: string; url: string; fileName: string; isBlob: boolean} | null>(null);

  useEffect(() => {
    setFilterType(initialFilter);
  }, [initialFilter]);

  const refreshUploadedPdfs = useCallback(async () => {
    const list = await listPdfBooksFromIndexedDb();
    setUploadedPdfs(list);
  }, []);

  useEffect(() => {
    void refreshUploadedPdfs();
  }, [refreshUploadedPdfs]);

  useEffect(() => {
    return () => {
      if (pdfViewer?.isBlob && pdfViewer.url) {
        URL.revokeObjectURL(pdfViewer.url);
      }
    };
  }, [pdfViewer]);

  const [scholarlyHub, setScholarlyHub] = useState<ScholarlyHubPayload>({
    sections: {shYahia: SH_YAHIA_SECTIONS, alilmia: ALILMIA_SECTIONS},
    liveItems: [],
    fetchedAt: '',
    source: 'seed',
  });
  const [loadingScholarly, setLoadingScholarly] = useState(false);

  const {prefs: readingPrefs, updatePrefs: updateReadingPrefs} = useReadingPrefs();
  const readingSizeSpec = resolveFontSizeSpec(readingPrefs.fontSize);
  const readingFontCss = resolveFontFamilyCss(readingPrefs.fontFamily);

  const fetchScholarlyHub = useCallback(async (forceRefresh = false) => {
    setLoadingScholarly(true);
    try {
      const res = await fetch(`/api/feeds/scholarly${forceRefresh ? '?refresh=1' : ''}`, {cache: 'no-store'});
      if (!res.ok) return;
      const data = (await res.json()) as ScholarlyHubPayload;
      setScholarlyHub({
        sections: {
          shYahia: data.sections?.shYahia?.length ? data.sections.shYahia : SH_YAHIA_SECTIONS,
          alilmia: data.sections?.alilmia?.length ? data.sections.alilmia : ALILMIA_SECTIONS,
        },
        liveItems: Array.isArray(data.liveItems) ? data.liveItems : [],
        fetchedAt: data.fetchedAt || '',
        source: data.source || 'live',
      });
    } catch {
      // Retain curated sections offline
    } finally {
      setLoadingScholarly(false);
    }
  }, []);

  useEffect(() => {
    void fetchScholarlyHub(false);
  }, [fetchScholarlyHub]);

  const q = query.trim().toLowerCase();

  const filteredPosts = useMemo(() => {
    if (filterType !== 'all' && filterType !== 'sada') return [];
    return posts.filter((post) => {
      return (
        !q ||
        post.title.toLowerCase().includes(q) ||
        post.author.toLowerCase().includes(q) ||
        post.excerpt.toLowerCase().includes(q)
      );
    });
  }, [posts, filterType, q]);

  const filteredVideos = useMemo(() => {
    if (filterType !== 'all' && filterType !== 'youtube') return [];
    return youtubeVideos.filter((v) => !q || v.title.toLowerCase().includes(q));
  }, [youtubeVideos, filterType, q]);

  const filteredAudios = useMemo(() => {
    if (filterType !== 'all' && filterType !== 'telegram') return [];
    return telegramAudios.filter(
      (a) =>
        !q ||
        a.title.toLowerCase().includes(q) ||
        a.speaker.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q),
    );
  }, [telegramAudios, filterType, q]);

  const filteredHajouriLessons = useMemo(() => {
    if (filterType !== 'all' && filterType !== 'hajouri') return [];
    return HAJOURI_LESSONS.filter((lesson) => {
      const matchCat = hajouriCategory === 'all' || lesson.category === hajouriCategory;
      const matchQuery =
        !q ||
        lesson.title.toLowerCase().includes(q) ||
        lesson.bookAuthor.toLowerCase().includes(q) ||
        lesson.categoryLabel.toLowerCase().includes(q) ||
        lesson.summary.toLowerCase().includes(q) ||
        lesson.highlights.some((h) => h.toLowerCase().includes(q));
      return matchCat && matchQuery;
    });
  }, [filterType, hajouriCategory, q]);

  const filteredLiveScholarlyItems = useMemo<ScholarlySiteItem[]>(() => {
    if (filterType !== 'all' && filterType !== 'scholarly') return [];
    return scholarlyHub.liveItems.filter(
      (item) =>
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.siteNameAr.toLowerCase().includes(q) ||
        item.siteNameEn.toLowerCase().includes(q) ||
        item.kindLabelAr.toLowerCase().includes(q),
    );
  }, [scholarlyHub.liveItems, filterType, q]);

  const filteredUploadedPdfs = useMemo(() => {
    return uploadedPdfs.filter((b) => {
      if (filterType === 'hajouri' && b.section !== 'hajouri') return false;
      if (filterType === 'imams' && b.section !== 'imams') return false;
      if (filterType === 'students' && b.section !== 'students') return false;
      return (
        !q ||
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.fileName.toLowerCase().includes(q)
      );
    });
  }, [uploadedPdfs, filterType, q]);

  const filteredSadaProfiles = useMemo(() => {
    const base =
      sadaTab === 'scholars'
        ? SADA_AL_KHAIR_SCHOLARS
        : sadaTab === 'poets'
          ? SADA_SUNNAH_POETS
          : [...SADA_AL_KHAIR_SCHOLARS, ...SADA_SUNNAH_POETS];
    if (!q) return base;
    return base.filter((p) => p.name.toLowerCase().includes(q) || p.title.toLowerCase().includes(q));
  }, [sadaTab, q]);

  const copyExternalMedia = async (title: string, sourceLabel: string, url: string) => {
    const msg = `✨ ${title}\n🎙️ ${sourceLabel}\n\n🔗 ${url}\n\n📚 عبر خدمة صدى الخير الدعوية · مواعظ وعبر`;
    if (navigator.share) {
      try {
        await navigator.share({title, text: msg, url});
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(msg);
      onNotify(tr('تم نسخ الرسالة والرابط للنشر في الواتساب وتيليجرام', 'Message & link copied for sharing'));
    } catch {
      onNotify(tr('تم تجهيز الرابط للمشاركة', 'Link ready to share'));
    }
  };

  const copyHajouriLesson = async (lesson: HajouriLessonItem) => {
    const bullets = lesson.highlights.map((h) => `• ${h}`).join('\n');
    const msg = `📚 *${lesson.title}*\n🎙️ فضيلة الشيخ العلامة يحيى بن علي الحجوري حفظه الله\n📖 المتن/الكتاب: ${lesson.bookAuthor}\n\n${lesson.summary}\n\n${bullets}\n\n🔗 الموقع الرسمي للشيخ: ${lesson.officialUrl}\n📲 عبر خدمة صدى الخير الدعوية · ${siteConfig.appName}`;
    try {
      await navigator.clipboard.writeText(msg);
      onNotify(tr('تم نسخ ملخص الدرس ورابطه للنشر في مجموعات صدى الخير', 'Lesson summary copied for WhatsApp/Telegram'));
    } catch {
      onNotify(tr('تم تجهيز ملخص الدرس للمشاركة', 'Lesson summary ready'));
    }
  };

  const handleUploadPdfFiles = async (
    section: IndexedPdfBookMeta['section'],
    e: ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingSection(section);
    try {
      const added = await addPdfBooksToIndexedDb(section, files, pdfSectionAuthor);
      await refreshUploadedPdfs();
      onNotify(`تم حفظ ${formatNumber(added.length)} ملف PDF في المكتبة العلمية بنجاح`);
    } catch {
      onNotify('تعذر حفظ ملفات PDF في المتصفح');
    } finally {
      setUploadingSection(null);
      e.target.value = '';
    }
  };

  const handleOpenUploadedPdf = async (meta: IndexedPdfBookMeta) => {
    const rec = await getPdfBlobFromIndexedDb(meta.id);
    if (!rec) {
      onNotify('تعذر العثور على ملف PDF المحفوظ');
      return;
    }
    const url = URL.createObjectURL(rec.blob);
    setPdfViewer({title: meta.title, url, fileName: meta.fileName, isBlob: true});
  };

  const handleDownloadUploadedPdf = async (meta: IndexedPdfBookMeta) => {
    const rec = await getPdfBlobFromIndexedDb(meta.id);
    if (!rec) {
      onNotify('تعذر تحميل ملف PDF');
      return;
    }
    const url = URL.createObjectURL(rec.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = meta.fileName || `${meta.title}.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
    recordDownload(meta.id);
    onNotify(`بدأ تحميل: ${meta.title}`);
  };

  const handleDeleteUploadedPdf = async (meta: IndexedPdfBookMeta) => {
    await deletePdfBookFromIndexedDb(meta.id);
    await refreshUploadedPdfs();
    onNotify(`تم حذف كتاب: ${meta.title}`);
  };

  const handleSharePdfBook = async (title: string, author: string) => {
    const msg = `📖 *${title}*\n✍️ ${author}\n\n📚 من المكتبة العلمية في موقع مواعظ وعبر`;
    if (navigator.share) {
      try {
        await navigator.share({title, text: msg});
        return;
      } catch {
        // Fallback
      }
    }
    try {
      await navigator.clipboard.writeText(msg);
      onNotify('تم نسخ بطاقة الكتاب للمشاركة');
    } catch {
      onNotify('تم تجهيز تفاصيل الكتاب');
    }
  };

  const handleDownloadPdf = (book: (typeof LIBRARY_PDF_BOOKS)[number]) => {
    recordDownload(book.id);
    onNotify(`بدأ تحميل كتاب: ${book.title}`);
  };

  const handleDownloadZipArchive = async () => {
    const entries: ZipEntryInput[] = [
      {
        name: 'فهرس-المكتبة-العلمية.txt',
        content: [
          'مكتبة مواعظ وعبر الموثقة',
          '=========================',
          '',
          ...LIBRARY_PDF_BOOKS.map(
            (b, i) => `${i + 1}. ${b.title} — ${b.author}\n   التصنيف: ${b.category}\n   ${b.summary}\n`,
          ),
        ].join('\n'),
      },
      ...SENIOR_IMAMS_WORKS.map((w) => ({
        name: `الأئمة-الكبار/${w.id}.txt`,
        content: `${w.title}\n${w.author}\n\n${w.summary}\n\n${w.body}\n`,
      })),
      ...SHEIKH_STUDENTS_WORKS.map((w) => ({
        name: `مشايخ-وطلاب-الشيخ/${w.id}.txt`,
        content: `${w.title}\n${w.author}\n\n${w.summary}\n\n${w.body}\n`,
      })),
    ];

    // Include uploaded IndexedDB PDFs inside ZIP archive
    for (const sec of ['hajouri', 'imams', 'students'] as const) {
      const recs = await getAllPdfRecordsForSection(sec);
      for (const rec of recs) {
        try {
          const bytes = new Uint8Array(await rec.blob.arrayBuffer());
          entries.push({
            name: `كتب-PDF/${sec}/${rec.fileName}`,
            content: bytes,
          });
        } catch {
          // Skip corrupted blob safely
        }
      }
    }

    const blob = createZipBlob(entries);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mawaedh-scholarly-library.zip';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    recordDownload('zip_scholarly_bundle');
    onNotify('تم تنزيل حزمة المكتبة العلمية (ZIP) بنجاح');
  };

  const handlePlayCustomTelegramLink = () => {
    const parsed = parseTelegramPostEmbed(customTgLink);
    if (!parsed) {
      onNotify('يرجى إدخال رابط منشور أو صوتية تيليجرام عام صحيح مثل: https://t.me/ax1ax70/104574');
      return;
    }
    setCustomTgEmbed(parsed);
  };

  const totalCount =
    posts.length +
    LIBRARY_PDF_BOOKS.length +
    uploadedPdfs.length +
    SENIOR_IMAMS_WORKS.length +
    SHEIKH_STUDENTS_WORKS.length +
    SADA_AL_KHAIR_SCHOLARS.length +
    SADA_SUNNAH_POETS.length +
    youtubeVideos.length +
    telegramAudios.length +
    HAJOURI_LESSONS.length +
    SH_YAHIA_SECTIONS.length +
    ALILMIA_SECTIONS.length;

  return (
    <div className="space-y-6 pb-8">
      {/* Hero Banner */}
      <section className="rounded-2xl bg-gradient-to-br from-[#006a46] via-[#008559] to-[#006389] p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-[#ffdea8] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              <span>
                {tr(
                  'مكتبة الشيخ يحيى الحجوري · الأئمة الكبار · صدى الخير (٢٧ شيخاً + ٤ شعراء) · مشغّل تيليجرام المباشر',
                  'Sada Al-Khair · Scholars, Audio & Scholarly Portals',
                )}
              </span>
            </span>
            <h1 className="text-2xl font-bold">{isEn ? 'Sada Al-Khair & Scholarly Library' : siteConfig.sadaTitle}</h1>
            <p className="text-sm text-white/90 max-w-2xl leading-relaxed">
              {isEn
                ? 'Complete Salafi audio curriculum, YouTube sermons, Telegram embedded player (no login), plus sh-yahia.net & alilmia.com.'
                : siteConfig.sadaSubtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="text-xs bg-white/15 backdrop-blur-md px-4 py-2.5 rounded-xl tabular-nums">
              <span className="font-bold text-base block">{formatNumber(totalCount)}</span>
              <span>{tr('مادة وعالم وبوابة', 'items & scholars')}</span>
            </div>
            <button
              type="button"
              disabled={isRefreshingFeeds || loadingScholarly}
              onClick={() => {
                onRefreshFeeds();
                void fetchScholarlyHub(true);
              }}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#ffdea8] hover:bg-[#ffc968] text-[#271900] text-xs font-bold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 disabled:opacity-70"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshingFeeds || loadingScholarly ? 'animate-spin' : ''}`} />
              <span>
                {isRefreshingFeeds || loadingScholarly
                  ? tr('جاري التحديث...', 'Refreshing...')
                  : tr('تحديث المصادر والقنوات', 'Refresh Live Feeds')}
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {(
            [
              {id: 'all', label: tr(`الكل (${formatNumber(totalCount)})`, `All (${formatNumber(totalCount)})`)},
              {id: 'hajouri', label: tr('مكتبة الشيخ يحيى الحجوري', 'Al-Hajouri Library')},
              {id: 'imams', label: tr('مكتبة الأئمة الكبار', 'Senior Imams')},
              {id: 'students', label: tr('مشايخ وطلاب الشيخ', 'Scholars & Students')},
              {id: 'sada', label: tr('صدى الخير الدعوية', 'Sada Al-Khair (27+4)')},
              {id: 'telegram', label: tr(`صوتيات تيليجرام (${formatNumber(telegramAudios.length)})`, 'Telegram Audio')},
              {id: 'scholarly', label: tr('المواقع العلمية الرسمية', 'Official Portals')},
              {id: 'youtube', label: tr(`مرئيات اليوتيوب (${formatNumber(youtubeVideos.length)})`, 'YouTube')},
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterType(tab.id)}
              className={`min-h-[42px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors ${
                filterType === tab.id
                  ? 'bg-[#006a46] text-white shadow-xs'
                  : 'bg-[#e0f0fb] dark:bg-[#10261e] text-[#3e4a42] dark:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative md:w-72 shrink-0">
          <Search className="w-4 h-4 text-[#6e7a71] absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tr('ابحث في الدروس والكتب والعلماء...', 'Search lessons, PDFs, scholars...')}
            className="w-full min-h-[44px] ps-10 pe-4 rounded-xl bg-white dark:bg-[#0d211a] border border-slate-200 dark:border-white/10 text-sm text-[#0e1d25] dark:text-white focus:outline-none focus:border-[#006a46]"
          />
        </div>
      </div>

      {/* Sheikh Yahya bin Ali Al-Hajouri Featured Curriculum Banner (Prominently at Top) */}
      {(filterType === 'all' || filterType === 'hajouri') && (
        <section className="rounded-3xl bg-gradient-to-br from-[#fffaf0] to-[#fff5df] dark:from-[#16231c] dark:to-[#0f1d17] border border-amber-500/35 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#7c5800] text-white flex items-center justify-center shrink-0 shadow-sm">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-[#0e1d25] dark:text-white">
                  مكتبة وأرشيف فضيلة الشيخ العلامة يحيى بن علي الحجوري حفظه الله
                </h2>
                <p className="text-xs sm:text-sm text-[#3e4a42] dark:text-slate-300 mt-0.5">
                  فهرس علمي شامل لشروحات العقيدة والحديث والفقه والتفسير والسيرة والمصحف المرتل والخطب والمؤلفات
                </p>
              </div>
            </div>

            <a
              href="https://sh-yahia.net"
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[42px] px-4 py-2 rounded-xl bg-[#7c5800] hover:bg-[#614400] text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 self-start md:self-center"
            >
              <span>الأرشيف الرسمي (sh-yahia.net)</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {HAJOURI_LESSON_CATEGORIES.map((cat) => {
              const active = hajouriCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setHajouriCategory(cat.id)}
                  className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-colors ${
                    active
                      ? 'bg-[#006a46] text-white shadow-xs'
                      : 'bg-white dark:bg-[#0b1f18] border border-slate-200/80 dark:border-white/10 text-[#3e4a42] dark:text-slate-300'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {filteredHajouriLessons.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredHajouriLessons.map((lesson) => (
                <article
                  key={lesson.id}
                  className="rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-5 flex flex-col justify-between gap-3.5"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#6e7a71] dark:text-slate-400">
                      <span className="font-bold text-[#7c5800] dark:text-[#f2be5e]">{lesson.categoryLabel}</span>
                      <span>{lesson.scope}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedLesson(lesson)}
                      className="text-start block w-full group space-y-1.5"
                    >
                      <h3
                        dir="rtl"
                        className="text-sm sm:text-base font-bold text-[#0e1d25] dark:text-white group-hover:text-[#006a46] dark:group-hover:text-[#6cdba6] transition-colors"
                        style={{fontFamily: readingFontCss}}
                      >
                        {lesson.title}
                      </h3>
                      <p className="text-xs font-semibold text-[#006a46] dark:text-[#6cdba6]">{lesson.bookAuthor}</p>
                      <p
                        dir="rtl"
                        className={`text-[#3e4a42] dark:text-slate-300 line-clamp-3 ${readingSizeSpec.cardExcerptClass}`}
                        style={{fontFamily: readingFontCss}}
                      >
                        {lesson.summary}
                      </p>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100 dark:border-white/10">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedLesson(lesson)}
                        className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#006a46] hover:bg-[#005235] text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>تفاصيل ومحاور الدرس</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => void copyHajouriLesson(lesson)}
                        className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#e8f6ff] dark:bg-[#133126] text-[#006a46] dark:text-[#6cdba6] text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>نسخ</span>
                      </button>
                    </div>

                    <a
                      href={lesson.officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#fffbf2] dark:bg-white/10 text-[#7c5800] dark:text-[#f2be5e] text-xs font-bold flex items-center gap-1 whitespace-nowrap"
                    >
                      <span>استماع</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* PDF Books Shelf (Curated + Admin Multi-PDF IndexedDB Manager) & ZIP Bundle */}
      {(filterType === 'all' || filterType === 'hajouri' || filterType === 'imams' || filterType === 'students') && (
        <section className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0c211a] p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-[#0e1d25] dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#006a46] dark:text-[#6cdba6]" />
                <span>مكتبة الكتب والرسائل الشرعية (قراءة وتحميل PDF + أرشيف ZIP)</span>
              </h2>
              <p className="text-xs text-[#6e7a71] dark:text-slate-400 mt-0.5">
                كتب ومؤلفات موثقة مع قارئ PDF مباشر داخل المتصفح وحزمة أرشيف ZIP شاملة
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleDownloadZipArchive()}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-[#006a46] hover:bg-[#005235] text-white text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <FolderArchive className="w-4 h-4" />
              <span>تحميل حزمة المكتبة (ZIP)</span>
            </button>
          </div>

          {/* Admin-only Multi-PDF Upload Controls (IndexedDB) */}
          {isAdmin && (
            <div className="rounded-2xl bg-[#f4faff] dark:bg-[#081712] border border-[#006a46]/25 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-[#006a46] dark:text-[#6cdba6] flex items-center gap-1.5">
                  <FilePlus2 className="w-4 h-4" />
                  <span>رفع متعدد لملفات PDF (للمشرف — محفوظة دائماً في المتصفح وتظهر فوراً للزوار)</span>
                </span>
                <input
                  type="text"
                  value={pdfSectionAuthor}
                  onChange={(e) => setPdfSectionAuthor(e.target.value)}
                  placeholder="اسم المؤلف الاختياري للكتب المرفوعة..."
                  className="min-h-[36px] px-3 rounded-xl bg-white dark:bg-[#0d211a] border border-slate-200 dark:border-white/10 text-xs w-full sm:w-64"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(
                  [
                    {sec: 'hajouri', label: '+ إضافة PDF لمكتبة الشيخ الحجوري'},
                    {sec: 'imams', label: '+ إضافة PDF لمكتبة الأئمة الكبار'},
                    {sec: 'students', label: '+ إضافة PDF لمشايخ وطلاب الشيخ'},
                  ] as const
                ).map((item) => (
                  <label
                    key={item.sec}
                    className="min-h-[42px] px-3 py-2 rounded-xl bg-[#006a46] hover:bg-[#005235] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <FilePlus2 className="w-4 h-4 shrink-0" />
                    <span>{uploadingSection === item.sec ? 'جاري الحفظ...' : item.label}</span>
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      multiple
                      onChange={(e) => void handleUploadPdfFiles(item.sec, e)}
                      className="hidden"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Uploaded IndexedDB PDFs Grid */}
          {filteredUploadedPdfs.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-extrabold text-[#7c5800] dark:text-[#ffdea8]">
                الكتب والرسائل المضافة من المكتبة ({formatNumber(filteredUploadedPdfs.length)})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredUploadedPdfs.map((book) => {
                  const dlCount = getItemDownloadCount(stats, book.id, 1);
                  const secLabel =
                    book.section === 'hajouri'
                      ? 'الشيخ يحيى الحجوري'
                      : book.section === 'imams'
                        ? 'الأئمة الكبار'
                        : 'مشايخ وطلاب الشيخ';
                  return (
                    <article
                      key={book.id}
                      className="rounded-2xl border border-amber-500/25 bg-[#fffdf7] dark:bg-[#0a1c15] p-4 flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-[11px] font-bold">
                          <span className="text-[#006a46] dark:text-[#6cdba6]">{secLabel}</span>
                          <span className="text-[#6e7a71] dark:text-slate-400 tabular-nums">
                            PDF · {formatBytes(book.sizeBytes)}
                          </span>
                        </div>
                        <h4 className="text-sm sm:text-base font-extrabold text-[#0e1d25] dark:text-white">
                          {book.title}
                        </h4>
                        <p className="text-xs font-semibold text-[#7c5800] dark:text-[#f2be5e]">{book.author}</p>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/70 dark:border-white/10">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => void handleOpenUploadedPdf(book)}
                            className="min-h-[36px] px-3 rounded-xl bg-[#e8f6ff] dark:bg-[#133126] text-[#006389] dark:text-[#80cfff] text-xs font-bold flex items-center gap-1"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>قراءة</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDownloadUploadedPdf(book)}
                            className="min-h-[36px] px-3 rounded-xl bg-[#006a46] text-white text-xs font-bold flex items-center gap-1"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>تحميل ({formatNumber(dlCount)})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleSharePdfBook(book.title, book.author)}
                            aria-label="مشاركة الكتاب"
                            className="min-w-[36px] min-h-[36px] rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => void handleDeleteUploadedPdf(book)}
                            aria-label={`حذف ${book.title}`}
                            className="min-w-[36px] min-h-[36px] rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {/* Curated LIBRARY_PDF_BOOKS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {LIBRARY_PDF_BOOKS.filter(
              (b) => !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || b.category.toLowerCase().includes(q),
            ).map((book) => {
              const dlCount = getItemDownloadCount(stats, book.id, 24);
              return (
                <article
                  key={book.id}
                  className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-[#fafcfb] dark:bg-[#081712] p-4 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs text-[#006a46] dark:text-[#6cdba6] font-bold">
                      <span>{book.category}</span>
                      <span className="tabular-nums text-[#6e7a71] dark:text-slate-400">
                        {formatNumber(book.pages)} صفحة · {book.sizeLabel}
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-base font-extrabold text-[#0e1d25] dark:text-white">{book.title}</h3>
                    <p className="text-xs font-semibold text-[#7c5800] dark:text-[#f2be5e]">{book.author}</p>
                    <p
                      style={{fontFamily: readingFontCss}}
                      className={`${readingSizeSpec.cardExcerptClass} text-[#3e4a42] dark:text-slate-300`}
                    >
                      {book.summary}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/70 dark:border-white/10">
                    <span className="text-xs text-[#6e7a71] dark:text-slate-400 tabular-nums">
                      التحميلات: {formatNumber(dlCount)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (book.pdfUrl.startsWith('http') && !book.pdfUrl.toLowerCase().endsWith('.pdf')) {
                            openExternalPortal(book.pdfUrl, book.title);
                            return;
                          }
                          setPdfViewer({
                            title: book.title,
                            url: book.pdfUrl,
                            fileName: `${book.id}.pdf`,
                            isBlob: false,
                          });
                        }}
                        className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#e8f6ff] dark:bg-[#133126] text-[#006389] dark:text-[#80cfff] text-xs font-bold flex items-center gap-1"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>قراءة في المكتبة</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSharePdfBook(book.title, book.author)}
                        aria-label="مشاركة الكتاب"
                        className="min-w-[38px] min-h-[38px] rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleDownloadPdf(book);
                          openExternalPortal(book.pdfUrl, book.title);
                        }}
                        className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#006a46] hover:bg-[#005235] text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>المصدر الرسمي</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Senior Imams Library Collection */}
      {(filterType === 'all' || filterType === 'imams') && (
        <section className="space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base sm:text-lg font-extrabold text-[#0e1d25] dark:text-white">
              مكتبة الأئمة الكبار (الوادعي · ابن باز · ابن عثيمين · الألباني رحمهم الله)
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SENIOR_IMAMS_WORKS.map((entry) => (
              <article
                key={entry.id}
                className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0c211a] p-5 space-y-2.5"
              >
                <span className="text-xs font-bold text-[#006a46] dark:text-[#6cdba6]">{entry.category}</span>
                <h3 className="text-base font-extrabold text-[#0e1d25] dark:text-white">{entry.title}</h3>
                <p className="text-xs font-bold text-[#7c5800] dark:text-[#f2be5e]">{entry.author}</p>
                <p
                  style={{fontFamily: readingFontCss}}
                  className={`${readingSizeSpec.bodyClass} text-[#28352e] dark:text-slate-200`}
                >
                  {entry.body}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Sheikh Al-Hajouri Scholars & Students Works */}
      {(filterType === 'all' || filterType === 'students') && (
        <section className="space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base sm:text-lg font-extrabold text-[#0e1d25] dark:text-white">
              مؤلفات مشايخ وطلاب الشيخ يحيى بن علي الحجوري حفظه الله
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SHEIKH_STUDENTS_WORKS.map((entry) => (
              <article
                key={entry.id}
                className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0c211a] p-5 space-y-2.5"
              >
                <span className="text-xs font-bold text-[#006a46] dark:text-[#6cdba6]">{entry.category}</span>
                <h3 className="text-base font-extrabold text-[#0e1d25] dark:text-white">{entry.title}</h3>
                <p className="text-xs font-bold text-[#7c5800] dark:text-[#f2be5e]">{entry.author}</p>
                <p
                  style={{fontFamily: readingFontCss}}
                  className={`${readingSizeSpec.bodyClass} text-[#28352e] dark:text-slate-200`}
                >
                  {entry.body}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Sada Al-Khair Dedicated Directory (All 27 Scholars + 4 Sunnah Poets) */}
      {(filterType === 'all' || filterType === 'sada') && (
        <section className="rounded-3xl border border-emerald-800/20 dark:border-white/10 bg-gradient-to-br from-[#eefaf3] via-white to-[#fffbf2] dark:from-[#0b231b] dark:via-[#0d211a] dark:to-[#141c17] p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-[#0e1d25] dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-[#006a46] dark:text-[#6cdba6]" />
                <span>خدمة صدى الخير الدعوية · دليل المشايخ والشعراء</span>
              </h2>
              <p className="text-xs text-[#3e4a42] dark:text-slate-300 mt-0.5">
                عرض كامل لجميع مشايخ وعلماء صدى الخير (٢٧ عالماً وداعية) وقسم شعراء السنة (٤ شعراء)
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {(
                [
                  {id: 'all', label: `الكل (${formatNumber(SADA_AL_KHAIR_SCHOLARS.length + SADA_SUNNAH_POETS.length)})`},
                  {id: 'scholars', label: `المشايخ والعلماء (${formatNumber(SADA_AL_KHAIR_SCHOLARS.length)})`},
                  {id: 'poets', label: `شعراء السنة (${formatNumber(SADA_SUNNAH_POETS.length)})`},
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSadaTab(t.id)}
                  className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    sadaTab === t.id
                      ? 'bg-[#006a46] text-white'
                      : 'bg-white dark:bg-[#081712] border border-slate-200 dark:border-white/10 text-[#3e4a42] dark:text-slate-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredSadaProfiles.map((prof) => {
              const isPoet = prof.category === 'poet';
              return (
                <div
                  key={prof.id}
                  className={`rounded-2xl border p-4 space-y-1.5 ${
                    isPoet
                      ? 'bg-[#fffaf0] dark:bg-[#161a14] border-amber-500/30'
                      : 'bg-white dark:bg-[#0a1c15] border-slate-200/80 dark:border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[11px] font-extrabold px-2 py-0.5 rounded-lg ${
                        isPoet
                          ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-[#eefaf3] text-[#006a46] dark:bg-emerald-950/60 dark:text-[#6cdba6]'
                      }`}
                    >
                      {isPoet ? 'شعراء السنة' : 'مشايخ صدى الخير'}
                    </span>
                    {isPoet && <Feather className="w-3.5 h-3.5 text-amber-700 dark:text-amber-300" />}
                  </div>
                  <h3 className="text-sm font-extrabold text-[#0e1d25] dark:text-white">{prof.name}</h3>
                  <p className="text-xs text-[#6e7a71] dark:text-slate-400">{prof.title}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Official Integrated Scholarly Portals Hub (sh-yahia.net & alilmia.com) */}
      {(filterType === 'all' || filterType === 'scholarly') && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-[#006a46] dark:text-[#6cdba6]" />
              <h2 className="text-base sm:text-lg font-bold text-[#0e1d25] dark:text-white">
                {tr('البوابات العلمية المفرّغة والمربوطة مباشرة', 'Integrated Official Scholarly Portals')}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => void fetchScholarlyHub(true)}
              disabled={loadingScholarly}
              className="text-xs font-bold text-[#006389] dark:text-[#80cfff] flex items-center gap-1 hover:underline disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingScholarly ? 'animate-spin' : ''}`} />
              <span>{tr('تحديث مباشر', 'Live Sync')}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Portal 1: sh-yahia.net */}
            <div className="rounded-2xl bg-[#fffbf2] dark:bg-[#13221c] border border-[#f2be5e]/45 dark:border-[#f2be5e]/20 p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#7c5800] text-white flex items-center justify-center shrink-0">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-[#0e1d25] dark:text-white">
                      {tr('موقع فضيلة الشيخ يحيى بن علي الحجوري', 'Official Site of Sheikh Yahya Al-Hajouri')}
                    </h3>
                    <p dir="ltr" className="text-xs font-bold text-[#7c5800] dark:text-[#f2be5e]">
                      https://sh-yahia.net/
                    </p>
                  </div>
                </div>
                <a
                  href="https://sh-yahia.net/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[36px] px-3 py-1.5 rounded-xl bg-[#7c5800] hover:bg-[#614400] text-white text-xs font-bold flex items-center gap-1 whitespace-nowrap shrink-0"
                >
                  <span>{tr('فتح', 'Open')}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {scholarlyHub.sections.shYahia.map((sec) => (
                  <a
                    key={sec.id}
                    href={sec.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[42px] px-3 py-2 rounded-xl bg-white dark:bg-[#0b1f18] border border-slate-200/75 dark:border-white/10 hover:border-[#7c5800] text-xs font-semibold text-[#0e1d25] dark:text-slate-200 flex items-center justify-between gap-1.5 transition-colors"
                  >
                    <span className="truncate">{isEn ? sec.labelEn : sec.labelAr}</span>
                    <ExternalLink className="w-3 h-3 text-[#7c5800] dark:text-[#f2be5e] shrink-0" />
                  </a>
                ))}
              </div>
            </div>

            {/* Portal 2: alilmia.com */}
            <div className="rounded-2xl bg-[#e8f6ff] dark:bg-[#112921] border border-[#006389]/25 dark:border-white/10 p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#006389] text-white flex items-center justify-center shrink-0">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-[#0e1d25] dark:text-white">
                      {tr('الموقع الرسمي للشبكة العلمية السلفية', 'Alilmia Salafi Scientific Network')}
                    </h3>
                    <p dir="ltr" className="text-xs font-bold text-[#006389] dark:text-[#80cfff]">
                      https://alilmia.com/
                    </p>
                  </div>
                </div>
                <a
                  href="https://alilmia.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[36px] px-3 py-1.5 rounded-xl bg-[#006389] hover:bg-[#004f6e] text-white text-xs font-bold flex items-center gap-1 whitespace-nowrap shrink-0"
                >
                  <span>{tr('فتح', 'Open')}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {scholarlyHub.sections.alilmia.map((sec) => (
                  <a
                    key={sec.id}
                    href={sec.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[42px] px-3 py-2 rounded-xl bg-white dark:bg-[#0b1f18] border border-slate-200/75 dark:border-white/10 hover:border-[#006389] text-xs font-semibold text-[#0e1d25] dark:text-slate-200 flex items-center justify-between gap-1.5 transition-colors"
                  >
                    <span className="truncate">{isEn ? sec.labelEn : sec.labelAr}</span>
                    <ExternalLink className="w-3 h-3 text-[#006389] dark:text-[#80cfff] shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {filteredLiveScholarlyItems.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs sm:text-sm font-bold text-[#006a46] dark:text-[#6cdba6]">
                {tr(
                  'أحدث الصوتيات والدروس والفتاوى المضافة مباشرة من الموقعين:',
                  'Latest Live Additions from sh-yahia.net & alilmia.com:',
                )}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredLiveScholarlyItems.slice(0, 12).map((item) => (
                  <a
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 hover:border-[#006a46] p-4 flex flex-col justify-between gap-2.5"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-[11px] font-bold">
                        <span className={item.siteId === 'sh_yahia' ? 'text-[#7c5800] dark:text-[#f2be5e]' : 'text-[#006389] dark:text-[#80cfff]'}>
                          {isEn ? item.siteNameEn : item.siteNameAr}
                        </span>
                        <span className="text-[#6e7a71] dark:text-slate-400">
                          {isEn ? item.kindLabelEn : item.kindLabelAr}
                        </span>
                      </div>
                      <h4 dir="rtl" className="text-xs sm:text-sm font-bold text-[#0e1d25] dark:text-white leading-snug line-clamp-2">
                        {item.title}
                      </h4>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-[#006a46] dark:text-[#6cdba6] pt-2 border-t border-slate-100 dark:border-white/10">
                      <span>{tr('فتح المادة في المصدر', 'Open Source Material')}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* 1. Direct Embedded Telegram Audio Clips (@ax1ax70 + Any Public Link — Zero Login Required) */}
      {(filterType === 'all' || filterType === 'telegram') && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Send className="w-5 h-5 text-[#006389] dark:text-[#80cfff]" />
              <h2 className="text-base sm:text-lg font-bold text-[#0e1d25] dark:text-white">
                {tr('المشغّل المباشر لصوتيات تيليجرام (@ax1ax70 — بدون تسجيل دخول)', 'Direct Telegram Audio Player (No Login)')}
              </h2>
            </div>
            <a
              href="https://t.me/ax1ax70"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-[#006389] dark:text-[#80cfff] flex items-center gap-1 hover:underline whitespace-nowrap shrink-0"
            >
              <span>{tr('القناة على تيليجرام', 'Telegram Channel')}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Paste Any Public t.me Audio Link for Immediate Inline Playback */}
          <div className="rounded-2xl bg-[#e8f6ff] dark:bg-[#0e241d] border border-[#006389]/20 p-4 space-y-3">
            <p className="text-xs font-extrabold text-[#006389] dark:text-[#80cfff]">
              شغّل أي رابط منشور أو صوتية عامة من تيليجرام مباشرة داخل الصفحة بدون الحاجة لتطبيق تيليجرام أو تسجيل دخول:
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                dir="ltr"
                value={customTgLink}
                onChange={(e) => setCustomTgLink(e.target.value)}
                placeholder="https://t.me/ax1ax70/104574"
                className="flex-1 min-h-[42px] px-3.5 rounded-xl bg-white dark:bg-[#081712] border border-slate-200 dark:border-white/10 text-xs sm:text-sm"
              />
              <button
                type="button"
                onClick={handlePlayCustomTelegramLink}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-[#006a46] hover:bg-[#005235] text-white text-xs font-bold flex items-center justify-center gap-1.5 shrink-0"
              >
                <Play className="w-3.5 h-3.5" />
                <span>تشغيل فوري هنا</span>
              </button>
            </div>
            {customTgEmbed && (
              <div className="rounded-2xl overflow-hidden bg-white dark:bg-[#081712] border border-slate-200 dark:border-white/10">
                <iframe
                  title="مشغّل تيليجرام المباشر"
                  src={customTgEmbed.embedUrl}
                  className="w-full h-[260px] border-0"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredAudios.map((audio) => {
              const isExpanded = Boolean(expandedAudioIds[audio.id]);
              return (
                <article
                  key={audio.id}
                  className="rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-4 flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedAudioIds((prev) => ({...prev, [audio.id]: !prev[audio.id]}))
                      }
                      aria-label={tr('تشغيل مباشر داخل الصفحة', 'Inline play')}
                      className="w-12 h-12 rounded-2xl bg-[#e8f6ff] dark:bg-[#133126] text-[#006389] dark:text-[#80cfff] hover:bg-[#006a46] hover:text-white flex items-center justify-center shrink-0 transition-colors"
                    >
                      <Headphones className="w-5 h-5" />
                    </button>

                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] font-bold text-[#006a46] dark:text-[#6cdba6]">
                        {audio.category} · {tr('تشغيل مباشر بدون تسجيل', 'Inline Audio')}
                      </span>
                      <h3 dir="rtl" className="text-sm sm:text-base font-bold text-[#0e1d25] dark:text-white leading-snug mt-0.5">
                        {audio.title}
                      </h3>
                      <p className="text-xs text-[#7c5800] dark:text-[#f2be5e] font-semibold mt-1 truncate">
                        {audio.speaker}
                      </p>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="rounded-2xl overflow-hidden bg-[#f4faff] dark:bg-[#081712] border border-slate-200 dark:border-white/10">
                      <iframe
                        title={audio.title}
                        src={audio.embedUrl.includes('userpic=') ? audio.embedUrl : `${audio.embedUrl}&userpic=false`}
                        className="w-full h-[250px] border-0"
                      />
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100 dark:border-white/10">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedAudioIds((prev) => ({...prev, [audio.id]: !prev[audio.id]}))
                        }
                        className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#006a46] hover:bg-[#005235] text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>{isExpanded ? 'إخفاء المشغّل' : 'تشغيل مباشر هنا'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewMedia({kind: 'telegram', item: audio})}
                        className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#e8f6ff] dark:bg-[#133126] text-[#006389] dark:text-[#80cfff] text-xs font-bold flex items-center gap-1"
                      >
                        <span>تكبير</span>
                      </button>
                      <a
                        href={audio.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/10 text-[#3e4a42] dark:text-slate-200 text-xs font-bold flex items-center gap-1"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>تيليجرام</span>
                      </a>
                    </div>

                    <button
                      type="button"
                      onClick={() => void copyExternalMedia(audio.title, audio.speaker, audio.url)}
                      aria-label={tr('نسخ للنشر', 'Copy link')}
                      className="min-w-[40px] min-h-[40px] rounded-xl bg-[#fffbf2] dark:bg-white/10 text-[#7c5800] dark:text-[#f2be5e] flex items-center justify-center"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* 2. YouTube Channel Videos */}
      {filteredVideos.length > 0 && (
        <section className="space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Youtube className="w-5 h-5 text-[#ba1a1a]" />
              <h2 className="text-base sm:text-lg font-bold text-[#0e1d25] dark:text-white">
                {tr('فيديوهات قناة اليوتيوب الرسمية', 'Official YouTube Channel Videos')}
              </h2>
            </div>
            <a
              href="https://www.youtube.com/@%D9%85%D9%88%D8%A7%D8%B9%D8%B8%D9%88%D8%B9%D8%A8%D8%B1-%D9%849%D9%88"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-[#006389] dark:text-[#80cfff] flex items-center gap-1 hover:underline whitespace-nowrap shrink-0"
            >
              <span>{tr('زيارة القناة', 'Visit Channel')}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVideos.map((video) => (
              <article
                key={video.id}
                className="rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <button
                    type="button"
                    onClick={() => setPreviewMedia({kind: 'youtube', item: video})}
                    className="relative w-full aspect-video bg-slate-900 group overflow-hidden block"
                  >
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 flex items-center justify-center transition-colors">
                      <div className="w-12 h-12 rounded-full bg-[#ba1a1a] text-white flex items-center justify-center shadow-lg">
                        <Play className="w-5 h-5 fill-current translate-x-[-1px]" />
                      </div>
                    </div>
                  </button>

                  <div className="p-4 space-y-2">
                    <h3 dir="rtl" className="text-sm font-bold text-[#0e1d25] dark:text-white leading-snug line-clamp-2">
                      {video.title}
                    </h3>
                    <div className="flex items-center justify-between text-[11px] text-[#6e7a71] dark:text-slate-400 tabular-nums">
                      <span>{video.publishedAt}</span>
                      <span>{formatNumber(video.views)} {tr('مشاهدة', 'views')}</span>
                    </div>
                  </div>
                </div>

                <div className="px-4 pb-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewMedia({kind: 'youtube', item: video})}
                    className="flex-1 min-h-[40px] px-3 py-1.5 rounded-xl bg-[#006a46] hover:bg-[#005235] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>{tr('تشغيل المقطع', 'Watch')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void copyExternalMedia(video.title, 'قناة مواعظ وعبر · يوتيوب', video.url)}
                    aria-label={tr('نسخ للنشر', 'Copy link')}
                    className="min-w-[40px] min-h-[40px] rounded-xl bg-[#e8f6ff] dark:bg-[#133126] text-[#006389] dark:text-[#80cfff] flex items-center justify-center"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <a
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={tr('فتح على يوتيوب', 'Open on YouTube')}
                    className="min-w-[40px] min-h-[40px] rounded-xl bg-[#ffdad6]/50 dark:bg-rose-950/50 text-[#93000a] dark:text-rose-300 flex items-center justify-center"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* 3. Sada Al-Khair Da'wah Broadcast Posts */}
      {filteredPosts.length > 0 && (
        <section className="space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#006a46] dark:text-[#6cdba6]" />
              <h2 className="text-base sm:text-lg font-bold text-[#0e1d25] dark:text-white">
                {tr('رسائل وبطاقات صدى الخير الدعوية', 'Sada Al-Khair Da’wah Cards')}
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setShowReadingControls((prev) => !prev)}
              aria-expanded={showReadingControls}
              className={`min-h-[40px] px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                showReadingControls
                  ? 'bg-[#006a46] text-white border-[#006a46]'
                  : 'bg-white dark:bg-[#0d211a] border-slate-200/80 dark:border-white/10 text-[#0e1d25] dark:text-slate-200 hover:border-[#006a46]/50'
              }`}
            >
              <Type className="w-3.5 h-3.5 shrink-0" />
              <span>{tr('حجم ونوع الخط', 'Font & Size')}</span>
            </button>
          </div>

          {showReadingControls && (
            <ReadingControlsBar
              compact
              fontSize={readingPrefs.fontSize}
              fontFamily={readingPrefs.fontFamily}
              onChangeFontSize={(fontSize) => updateReadingPrefs({fontSize})}
              onChangeFontFamily={(fontFamily) => updateReadingPrefs({fontFamily})}
            />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredPosts.map((post) => {
              const isSaved = bookmarkedIds.includes(post.id);
              return (
                <article
                  key={post.id}
                  className="rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-4 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-[#6e7a71] dark:text-slate-400">
                      <span className="font-semibold text-[#006a46] dark:text-[#6cdba6]">{post.sourceLabel}</span>
                      <span>{post.category}</span>
                    </div>
                    <button type="button" onClick={() => onOpenPost(post.id)} className="text-start block w-full">
                      <h3
                        dir="rtl"
                        className="text-sm sm:text-base font-bold text-[#0e1d25] dark:text-white hover:text-[#006a46] dark:hover:text-[#6cdba6] transition-colors"
                        style={{fontFamily: readingFontCss}}
                      >
                        {post.title}
                      </h3>
                      <p
                        dir="rtl"
                        className={`text-[#3e4a42] dark:text-slate-300 mt-1 line-clamp-3 ${readingSizeSpec.cardExcerptClass}`}
                        style={{fontFamily: readingFontCss}}
                      >
                        {post.excerpt}
                      </p>
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100 dark:border-white/10">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onCopySada(post)}
                        className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#006a46] hover:bg-[#005235] text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{isEn ? 'Copy for Sada' : siteConfig.sadaBroadcastBtn}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onShareCard(post)}
                        className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#fffbf2] dark:bg-white/10 text-[#7c5800] dark:text-[#f2be5e] text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{tr('بطاقة', 'Card')}</span>
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggleBookmark(post.id)}
                      aria-label={tr('حفظ', 'Save')}
                      className={`min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center ${
                        isSaved ? 'bg-[#ffdea8] text-[#271900]' : 'bg-[#e8f6ff] dark:bg-white/10 text-[#006389] dark:text-[#80cfff]'
                      }`}
                    >
                      <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Inline PDF Viewer Modal */}
      {pdfViewer && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 pt-[44px]"
          onClick={() => setPdfViewer(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl h-[85vh] rounded-3xl bg-white dark:bg-[#0c211a] p-4 sm:p-5 shadow-2xl flex flex-col gap-3"
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-2.5">
              <h3 className="text-sm sm:text-base font-extrabold text-[#0e1d25] dark:text-white truncate">
                📖 {pdfViewer.title}
              </h3>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={pdfViewer.url}
                  download={pdfViewer.fileName}
                  className="min-h-[36px] px-3 py-1.5 rounded-xl bg-[#006a46] text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تنزيل PDF</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPdfViewer(null)}
                  className="w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <iframe
              title={pdfViewer.title}
              src={pdfViewer.url}
              className="w-full flex-1 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-100"
            />
          </div>
        </div>
      )}

      {/* Embedded YouTube / Telegram Player Modal */}
      {previewMedia && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewMedia(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-3xl bg-white dark:bg-[#0c211a] p-4 sm:p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="text-xs font-bold text-[#006a46] dark:text-[#6cdba6]">
                  {previewMedia.kind === 'youtube'
                    ? tr('مرئيات قناة مواعظ وعبر · يوتيوب', 'Mawaedh YouTube Video')
                    : tr(`صوتيات تيليجرام (@ax1ax70) · ${previewMedia.item.speaker}`, `Telegram Audio · ${previewMedia.item.speaker}`)}
                </span>
                <h3 dir="rtl" className="text-base font-bold text-[#0e1d25] dark:text-white mt-0.5 leading-snug">
                  {previewMedia.item.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewMedia(null)}
                aria-label={tr('إغلاق المشغل', 'Close Player')}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {previewMedia.kind === 'youtube' ? (
              <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black">
                <iframe
                  title={previewMedia.item.title}
                  src={`https://www.youtube-nocookie.com/embed/${previewMedia.item.id}?autoplay=1`}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="w-full min-h-[260px] rounded-2xl overflow-hidden bg-[#f4faff] dark:bg-[#081712] border border-slate-200 dark:border-white/10">
                <iframe
                  title={previewMedia.item.title}
                  src={
                    previewMedia.item.embedUrl.includes('userpic=')
                      ? previewMedia.item.embedUrl
                      : `${previewMedia.item.embedUrl}&userpic=false`
                  }
                  className="w-full h-[300px] border-0"
                />
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() =>
                  void copyExternalMedia(
                    previewMedia.item.title,
                    previewMedia.kind === 'youtube' ? 'قناة مواعظ وعبر · يوتيوب' : previewMedia.item.speaker,
                    previewMedia.item.url,
                  )
                }
                className="min-h-[42px] px-4 py-2 rounded-xl bg-[#e8f6ff] dark:bg-[#133126] text-[#006a46] dark:text-[#6cdba6] text-xs font-bold flex items-center gap-1.5"
              >
                <Copy className="w-4 h-4" />
                <span>{tr('نسخ للنشر في المجموعات', 'Copy for Groups')}</span>
              </button>

              <a
                href={previewMedia.item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[42px] px-4 py-2 rounded-xl bg-[#006a46] hover:bg-[#005235] text-white text-xs font-bold flex items-center gap-1.5"
              >
                <span>
                  {previewMedia.kind === 'youtube'
                    ? tr('فتح في يوتيوب', 'Open on YouTube')
                    : tr('فتح في تيليجرام', 'Open on Telegram')}
                </span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Sheikh Al-Hajouri Lesson Series Detail Modal */}
      {selectedLesson && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedLesson(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-3xl bg-white dark:bg-[#0c211a] p-5 sm:p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-white/10 pb-3">
              <div className="space-y-1 min-w-0">
                <span className="text-xs font-bold text-[#7c5800] dark:text-[#f2be5e] block">
                  {selectedLesson.categoryLabel} · {selectedLesson.scope}
                </span>
                <h3
                  dir="rtl"
                  className="text-base sm:text-lg font-bold text-[#0e1d25] dark:text-white leading-snug"
                  style={{fontFamily: readingFontCss}}
                >
                  {selectedLesson.title}
                </h3>
                <p className="text-xs font-semibold text-[#006a46] dark:text-[#6cdba6]">
                  {selectedLesson.bookAuthor} — شرح فضيلة الشيخ يحيى بن علي الحجوري حفظه الله
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLesson(null)}
                aria-label="إغلاق التفاصيل"
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p
                dir="rtl"
                className={`text-[#0e1d25] dark:text-slate-100 ${readingSizeSpec.bodyClass}`}
                style={{fontFamily: readingFontCss}}
              >
                {selectedLesson.summary}
              </p>

              <div className="rounded-2xl bg-[#f4faff] dark:bg-[#081712] border border-slate-200/70 dark:border-white/10 p-4 space-y-2.5">
                <h4 className="text-xs sm:text-sm font-bold text-[#006a46] dark:text-[#6cdba6]">
                  أبرز المحاور والفوائد العلمية في هذه السلسلة:
                </h4>
                <ul className="space-y-2">
                  {selectedLesson.highlights.map((item) => (
                    <li
                      key={item}
                      dir="rtl"
                      className="flex items-start gap-2 text-xs sm:text-sm text-[#3e4a42] dark:text-slate-300 leading-relaxed"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#006a46] dark:text-[#6cdba6] shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-white/10">
              <button
                type="button"
                onClick={() => void copyHajouriLesson(selectedLesson)}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#e8f6ff] dark:bg-[#133126] text-[#006a46] dark:text-[#6cdba6] text-xs font-bold flex items-center gap-1.5"
              >
                <Copy className="w-4 h-4" />
                <span>نسخ للنشر في صدى الخير</span>
              </button>

              <a
                href={selectedLesson.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#7c5800] hover:bg-[#614400] text-white text-xs font-bold flex items-center gap-1.5"
              >
                <span>الانتقال لأرشيف الشيخ الصوتي والمكتبي</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
