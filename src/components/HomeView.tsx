import {
  Archive,
  ArrowLeft,
  ArrowRight,
  Award,
  Bookmark,
  BookOpen,
  Bot,
  CheckCircle2,
  Clock,
  Copy,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  Feather,
  Flame,
  Flower2,
  Globe,
  GraduationCap,
  HandHeart,
  Hash,
  Heart,
  Image as ImageIcon,
  Library,
  MessageCircle,
  Scale,
  Share2,
  Sparkles,
  Star,
  Sun,
  Trash2,
  Type,
  Video,
  Youtube,
} from 'lucide-react';
import {useMemo, useState} from 'react';
import {ALL_CATEGORIES} from '../data/seed';
import type {
  AppIcons,
  LibraryFilterType,
  NafahatMeta,
  NavTab,
  Post,
  SiteConfig,
  SocialLink,
  TwitterQuoteItem,
} from '../types';
import {useI18n} from '../utils/i18n';
import {getItemDownloadCount, useLiveStats} from '../utils/liveStats';
import {resolveFontFamilyCss, resolveFontSizeSpec, useReadingPrefs} from '../utils/readingPrefs';
import {getPublicSiteUrl} from '../utils/storage';
import {useDailyWird} from '../utils/wirdStorage';
import {COLOR_SCHEME_STYLES, resolveIcon} from './BrandEmblem';
import {Interactive3DCard} from './Interactive3DCard';
import {LiveStatsStrip} from './LiveStatsStrip';
import {ReadingControlsBar} from './ReadingControlsBar';

const CATEGORY_EN_MAP: Record<string, string> = {
  الكل: 'All',
  إيمانيات: 'Faith & Iman',
  فقه: 'Fiqh & Rulings',
  أخلاق: 'Character & Ethics',
  'تزكية النفس': 'Purification of Soul',
  'قصص وعبر': 'Stories & Lessons',
  'خواطر قصيرة': 'Short Reflections',
  'مقاطع مرئية': 'Video Clips',
  'صدى الخير': 'Sada Al-Khair',
};

export function HomeView({
  posts,
  twitterQuotes,
  socialLinks,
  appIcons,
  siteConfig,
  brandHandle,
  bookmarkedIds,
  bookmarkedFatwaCount = 0,
  likedIds,
  searchQuery,
  motherPrayersCount,
  hasSaidAmen,
  nafahatMeta,
  isAdmin = false,
  onSayAmen,
  onToggleBookmark,
  onToggleLike,
  onCopySada,
  onOpenPost,
  onShareCard,
  onNavigateTab,
  onNavigateLibrary,
  onNavigateChannels,
  onNavigateFatawa,
  onNavigateAdhkar,
  onNavigateBookmarks,
  onAdminAutoPost,
  onAdminEditPost,
  onAdminToggleHidePost,
  onAdminDeletePost,
  onNotify,
}: {
  posts: Post[];
  twitterQuotes: TwitterQuoteItem[];
  socialLinks: SocialLink[];
  appIcons: AppIcons;
  siteConfig: SiteConfig;
  brandHandle: string;
  bookmarkedIds: string[];
  bookmarkedFatwaCount?: number;
  likedIds: string[];
  searchQuery: string;
  motherPrayersCount: number;
  hasSaidAmen: boolean;
  nafahatMeta?: NafahatMeta;
  isAdmin?: boolean;
  onSayAmen: () => void;
  onToggleBookmark: (id: string) => void;
  onToggleLike: (id: string) => void;
  onCopySada: (post: Post) => void;
  onOpenPost: (id: string) => void;
  onShareCard: (post: Post) => void;
  onNavigateTab: (tab: NavTab) => void;
  onNavigateLibrary: (filter: LibraryFilterType) => void;
  onNavigateChannels: () => void;
  onNavigateFatawa: () => void;
  onNavigateAdhkar: () => void;
  onNavigateBookmarks?: () => void;
  onAdminAutoPost?: (postId: string) => void;
  onAdminEditPost?: (post: Post) => void;
  onAdminToggleHidePost?: (postId: string) => void;
  onAdminDeletePost?: (postId: string) => void;
  onNotify: (msg: string) => void;
}) {
  const {isEn, tr, formatNumber} = useI18n();
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [showReadingBar, setShowReadingBar] = useState(false);
  const {prefs: readingPrefs, updatePrefs: updateReadingPrefs} = useReadingPrefs();
  const {stats: liveStats, recordInteraction} = useLiveStats();
  const {wird, isCompletedToday, progressPct, markTodayComplete} = useDailyWird();

  const readingSizeSpec = resolveFontSizeSpec(readingPrefs.fontSize);
  const readingFontCss = resolveFontFamilyCss(readingPrefs.fontFamily);
  const DirectionalArrow = isEn ? ArrowRight : ArrowLeft;

  const searchedPosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.excerpt.toLowerCase().includes(q) ||
        p.author.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q),
    );
  }, [posts, searchQuery]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of ALL_CATEGORIES) counts[cat] = 0;
    counts['الكل'] = searchedPosts.length;
    for (const p of searchedPosts) {
      if (p.category in counts) counts[p.category] += 1;
    }
    return counts;
  }, [searchedPosts]);

  const filteredPosts = useMemo(() => {
    if (selectedCategory === 'الكل') return searchedPosts;
    return searchedPosts.filter((p) => p.category === selectedCategory);
  }, [searchedPosts, selectedCategory]);

  // Show only the latest 3 sermons on Home so the main page stays crisp and never bloated
  const latestThreePosts = useMemo(() => filteredPosts.slice(0, 3), [filteredPosts]);

  const dailyWisdomPost: Post = {
    id: 'daily_wisdom_featured',
    title: siteConfig.heroWisdomText.replace(/^[«"]|[»"]$/g, ''),
    excerpt: siteConfig.heroWisdomText,
    body: siteConfig.heroWisdomText,
    author: siteConfig.heroWisdomAuthor,
    sourceLabel: 'موعظة اليوم',
    category: 'صدى الخير',
    mediaType: 'sada',
    cardTheme: 'emerald',
    likes: 0,
    commentsCount: 0,
    publishedAtLabel: 'اليوم',
    createdAt: new Date().toISOString(),
  };

  const DailyIcon = resolveIcon(appIcons.dailyWisdom, 'sparkles');
  const activeChannels = socialLinks.filter((l) => l.enabled).slice(0, 4);
  const primaryXChannel =
    socialLinks.find((l) => l.id === 'x' && l.enabled) ||
    socialLinks.find((l) => l.url.includes('twitter.com') || l.url.includes('x.com'));
  const primaryXLink = primaryXChannel?.url || 'https://x.com/ax1ax71';
  const primaryXHandle = primaryXChannel?.handle || '@ax1ax71';

  const shareText = async (text: string, fallbackMsg: string, shareUrl?: string) => {
    let copied = false;
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch {
      // Clipboard may require direct gesture fallback
    }
    if (navigator.share) {
      try {
        await navigator.share(
          shareUrl ? {title: siteConfig.appName, text, url: shareUrl} : {title: siteConfig.appName, text},
        );
        if (copied) onNotify(fallbackMsg);
        return;
      } catch {
        // User cancelled or share unsupported
      }
    }
    onNotify(fallbackMsg);
  };

  const quickShortcuts: Array<{
    id: string;
    label: string;
    sublabel: string;
    Icon: typeof BookOpen;
    toneClass: string;
    onClick: () => void;
  }> = [
    {
      id: 'quran',
      label: tr('المصحف الشريف', 'Noble Quran'),
      sublabel: tr('تصفح بالصفحات والسور', 'Pages & Surahs'),
      Icon: BookOpen,
      toneClass: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300',
      onClick: () => onNavigateTab('quran'),
    },
    {
      id: 'wird',
      label: tr('الورد اليومي', 'Daily Wird'),
      sublabel: tr(`ص ${formatNumber(wird.currentPage)} من ٦٠٤`, `Page ${wird.currentPage}`),
      Icon: Flame,
      toneClass: 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300',
      onClick: () => onNavigateTab('wird'),
    },
    {
      id: 'adhkar',
      label: tr('الأذكار والأدعية الجامعة', 'Adhkar & Duas'),
      sublabel: tr('الصباح والمساء والتحصينات', 'Morning, Evening & Duas'),
      Icon: Sun,
      toneClass: 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300',
      onClick: onNavigateAdhkar,
    },
    {
      id: 'fatawa',
      label: tr('الفتاوى', 'Fatawa'),
      sublabel: tr('الشيخ الحجوري وكبار العلماء', 'Verified Scholars'),
      Icon: Scale,
      toneClass: 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300',
      onClick: onNavigateFatawa,
    },
    {
      id: 'mother-oasis',
      label: tr('واحة الداعية الفاضلة أمي', 'Mother Oasis'),
      sublabel: tr('أم محمد إكرام عبده علي', 'Um Muhammad Ikram'),
      Icon: Heart,
      toneClass: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300',
      onClick: () => onNavigateTab('mother-oasis'),
    },
    {
      id: 'cards',
      label: tr('البطاقات الدعوية الكلاسيكية', 'Classic Dawah Cards'),
      sublabel: tr('تصميم أبيض نقي PNG', 'Clean Square PNG Cards'),
      Icon: ImageIcon,
      toneClass: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300',
      onClick: () => onNavigateTab('cards'),
    },
    {
      id: 'lib-hajouri',
      label: tr('مكتبة الشيخ يحيى الحجوري', 'Sheikh Al-Hajouri Library'),
      sublabel: tr('الشروح والدروس والكتب PDF', 'Lessons & PDF Books'),
      Icon: GraduationCap,
      toneClass: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300',
      onClick: () => onNavigateLibrary('hajouri'),
    },
    {
      id: 'lib-imams',
      label: tr('مكتبة الأئمة الكبار', 'Senior Imams Library'),
      sublabel: tr('الوادعي، ابن باز، العثيمين، الألباني', 'Imams Works & Archive'),
      Icon: Award,
      toneClass: 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300',
      onClick: () => onNavigateLibrary('imams'),
    },
    {
      id: 'lib-students',
      label: tr('مؤلفات مشايخ وطلاب الشيخ يحيى', 'Students & Scholars Works'),
      sublabel: tr('دماج ومركز دار الحديث', 'Dammaj & Scholarly Books'),
      Icon: Library,
      toneClass: 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300',
      onClick: () => onNavigateLibrary('students'),
    },
    {
      id: 'poetry',
      label: tr('واحة الشعر والطرائف', 'Poetry & Anecdotes'),
      sublabel: tr('شعر إسلامي ونوادر العرب', 'Clean Arabic Literature'),
      Icon: Feather,
      toneClass: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300',
      onClick: () => onNavigateTab('poetry'),
    },
    {
      id: 'archive',
      label: tr('الأرشيف الشامل', 'Permanent Archive'),
      sublabel: tr('كل ما نُشر وحُفظ دون حذف', 'All Saved Daily Items'),
      Icon: Archive,
      toneClass: 'bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-200',
      onClick: () => onNavigateTab('archive'),
    },
    {
      id: 'videos',
      label: tr('المقاطع المرئية', 'Video Clips'),
      sublabel: tr('قريباً بإذن الله', 'Launching Soon'),
      Icon: Video,
      toneClass: 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300',
      onClick: () => onNavigateTab('videos'),
    },
    {
      id: 'reviews',
      label: tr('آراء وتقييمات الزوار', 'Visitor Reviews'),
      sublabel: tr('تجارب وانطباعات القرّاء', 'Community Feedback'),
      Icon: Star,
      toneClass: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300',
      onClick: () => onNavigateTab('reviews'),
    },
    {
      id: 'deaf-mute',
      label: tr('قسم الصم والبكم', 'Deaf & Mute Section'),
      sublabel: tr('بإدارة م. يونس عبدالكريم', 'By Eng. Younis Abdulkarim'),
      Icon: HandHeart,
      toneClass: 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300',
      onClick: () => onNavigateTab('deaf-mute'),
    },
    {
      id: 'about-support',
      label: tr('عن الموقع والدعم والمشاركة', 'About, Support & Share'),
      sublabel: tr('الرسالة، الاقتراحات والتذاكر، مشاركة التطبيق', 'Mission, Proposals & Sharing'),
      Icon: Sparkles,
      toneClass: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300',
      onClick: () => onNavigateTab('about-support'),
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Row 1: Compact Top Strip — (1) Wisdom of the Day + (2) Compact Daily Wird + (3) Mother's Oasis Gateway */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
        {/* 1) Wisdom / Story of the Day Card */}
        <Interactive3DCard className="lg:col-span-5" intensity={3.5}>
          <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#006a46] via-[#00583a] to-[#003e29] p-4 text-white shadow-md flex flex-col justify-between gap-2.5 h-full">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-2 rounded-xl border border-[#ffdea8]/20"
            />
            <div className="relative z-10 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[#ffdea8] text-[11px] font-bold min-w-0">
                <DailyIcon className="w-3.5 h-3.5 shrink-0" />
                <h1 className="text-[11px] font-bold truncate">
                  {isEn ? 'Wisdom & Story of the Day' : siteConfig.heroBadge}
                </h1>
              </div>
              <span className="text-[10px] font-semibold text-[#ffdea8]/90 whitespace-nowrap shrink-0 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{nafahatMeta?.source === 'ai' ? nafahatMeta.lastUpdatedDate : tr('تحديث يومي', 'Daily')}</span>
              </span>
            </div>

            <div className="relative z-10 py-1 text-center space-y-1">
              <p
                dir="rtl"
                className="font-bold leading-[1.8] text-white"
                style={{
                  fontFamily: readingFontCss,
                  fontSize: 'var(--reading-font-size, 18px)',
                  textWrap: 'balance',
                }}
              >
                {siteConfig.heroWisdomText}
              </p>
              <span className="text-[11px] font-semibold text-[#ffdea8] block">{siteConfig.heroWisdomAuthor}</span>
            </div>

            <div className="relative z-10 pt-2 border-t border-[#ffdea8]/20 flex flex-wrap items-center justify-between gap-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onCopySada(dailyWisdomPost)}
                  className="min-h-[34px] flex items-center gap-1.5 bg-[#ffc968] hover:bg-[#f2be5e] text-[#271900] px-2.5 py-1 rounded-lg text-[11px] font-bold shadow-xs transition-colors whitespace-nowrap shrink-0"
                >
                  <Copy className="w-3.5 h-3.5 shrink-0" />
                  <span>{isEn ? 'Copy' : siteConfig.heroPrimaryBtn}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onShareCard(dailyWisdomPost)}
                  className="min-h-[34px] px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 flex items-center gap-1 text-white text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>{isEn ? 'PNG Card' : siteConfig.heroCardBtn}</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  const siteUrl = getPublicSiteUrl('/?tab=home');
                  const payload = `✨ *حكمة وقصة اليوم*\n\n${siteConfig.heroWisdomText}\n— ${siteConfig.heroWisdomAuthor}\n\n🌿 ${siteConfig.appName}\n🌐 ${siteUrl}`;
                  void shareText(payload, tr('تم نسخ حكمة اليوم مع رابط الموقع', 'Copied daily wisdom'), siteUrl);
                }}
                aria-label={tr('مشاركة حكمة اليوم', 'Share daily wisdom')}
                className="min-w-[34px] min-h-[34px] rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </section>
        </Interactive3DCard>

        {/* 2) Compact Synced Daily Wird Card */}
        <section className="lg:col-span-3 rounded-2xl bg-gradient-to-br from-[#064e3b] to-[#0a3644] text-white p-4 shadow-md flex flex-col justify-between gap-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs text-emerald-200 font-bold">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>{tr('الورد اليومي', 'Daily Wird')}</span>
              </span>
              <span className="flex items-center gap-1 text-amber-300 tabular-nums">
                <Flame className="w-3.5 h-3.5" />
                <span>{formatNumber(wird.streakDays)} ي</span>
              </span>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-extrabold">
                {tr(`صفحة التوقف: ${formatNumber(wird.currentPage)} / ٦٠٤`, `Page ${wird.currentPage} / 604`)}
              </p>
              <div className="w-full h-2 rounded-full bg-white/15 overflow-hidden">
                <div
                  className="h-full bg-emerald-300 rounded-full transition-all"
                  style={{width: `${progressPct}%`}}
                />
              </div>
              <p className="text-[11px] text-emerald-100/80">
                {isCompletedToday
                  ? tr('ما شاء الله! تم إتمام ورد اليوم ✓', 'Completed for today ✓')
                  : tr(`الهدف اليومي: ${formatNumber(wird.targetPages)} صفحات`, `Daily target: ${wird.targetPages} pages`)}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => {
                markTodayComplete();
                recordInteraction();
                onNotify('بارك الله فيك! تم تسجيل إتمام وردك اليومي');
              }}
              className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors ${
                isCompletedToday
                  ? 'bg-emerald-300 text-[#063a2a]'
                  : 'bg-white text-[#064e3b] hover:bg-emerald-50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{tr('أتممت وردي اليوم ✓', 'Complete Today ✓')}</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('wird')}
              className="min-h-[34px] px-3 py-1 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center justify-center gap-1 transition-colors"
            >
              <span>{tr('فتح صفحة الورد اليومي', 'Open Daily Wird')}</span>
              <DirectionalArrow className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>

        {/* 3) Mother's Oasis & Quick Access to Birr & Wafaa Adhkar */}
        <section className="lg:col-span-4 rounded-2xl bg-[#fffbf2] dark:bg-[#13201b] border border-[#f2be5e]/45 dark:border-[#f2be5e]/20 p-4 card-3d flex flex-col justify-between gap-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs text-[#7c5800] dark:text-[#f2be5e] font-bold">
              <span className="flex items-center gap-1.5">
                <Flower2 className="w-4 h-4 shrink-0" />
                <span>{tr('واحة الداعية الفاضلة أمي', 'Mother Dawah Oasis')}</span>
              </span>
              <span className="tabular-nums text-[11px] flex items-center gap-1">
                <Heart className="w-3 h-3 fill-current" />
                <span>{formatNumber(motherPrayersCount)} آمين</span>
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-extrabold text-[#0e1d25] dark:text-white leading-snug">
              أم محمد إكرام عبده علي حفظها الله
            </h2>
            <p className="text-xs sm:text-sm text-[#3e4a42] dark:text-slate-300 leading-relaxed">
              تآليفها وخواطرها، دروسها ومواعظها، وقصصها التربوية الإيمانية؛ ونُقل دعاؤها الخاص وباب «وقفة بر ووفاء» داخل قسم الأذكار والأدعية الجامعة.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => onNavigateTab('mother-oasis')}
              className="flex-1 min-h-[38px] px-3 py-1.5 rounded-xl bg-[#006a46] hover:bg-[#005235] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Flower2 className="w-3.5 h-3.5 shrink-0" />
              <span>دخول واحة أمي</span>
            </button>
            <button
              type="button"
              onClick={onNavigateAdhkar}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#ffdea8] hover:bg-[#ffc968] text-[#271900] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Heart className="w-3.5 h-3.5 shrink-0" />
              <span>دعاء الوالدة بالأذكار</span>
            </button>
          </div>
        </section>
      </div>

      {/* Row 2: Quick Access Gateway Grid (شبكة الاختصارات السريعة للأقسام) */}
      <section aria-label={tr('شبكة الاختصارات السريعة للأقسام', 'Quick Access Gateway Grid')} className="space-y-3">
        <div className="flex items-center justify-between gap-2 px-1">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-[#0e1d25] dark:text-white">
              {tr('بوابة الأقسام والاختصارات السريعة', 'Quick Access Sections')}
            </h2>
            <p className="text-xs text-[#6e7a71] dark:text-slate-400">
              {tr('وصول مباشر لأي قسم في الموقع بضغطة واحدة', 'Open any section directly in one tap')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {quickShortcuts.map((item) => {
            const Icon = item.Icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                className="group rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 hover:border-[#006a46]/60 p-3.5 shadow-xs hover:shadow-md transition-all text-start flex items-start gap-3"
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${item.toneClass}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs sm:text-sm font-extrabold text-[#0e1d25] dark:text-white leading-snug line-clamp-2 group-hover:text-[#006a46] dark:group-hover:text-[#6cdba6] transition-colors">
                    {item.label}
                  </h3>
                  <p className="text-[11px] text-[#6e7a71] dark:text-slate-400 truncate mt-0.5">
                    {item.sublabel}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Scholarly Scientific Portals Strip (sh-yahia.net & alilmia.com) */}
      <div id="home-portals" className="scroll-mt-28 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <a
          href="https://sh-yahia.net/"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-2xl bg-[#fffbf2] dark:bg-[#13221c] border border-[#f2be5e]/45 dark:border-[#f2be5e]/20 p-4 card-3d flex items-center justify-between gap-3 group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#7c5800] text-white flex items-center justify-center shrink-0 icon-3d">
              <Globe className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-[#0e1d25] dark:text-white truncate">
                {tr('الموقع الرسمي للشيخ يحيى بن علي الحجوري', 'Official Site of Sheikh Yahya Al-Hajouri')}
              </h3>
              <p dir="ltr" className="text-[11px] font-semibold text-[#7c5800] dark:text-[#f2be5e] truncate">
                sh-yahia.net
              </p>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-[#7c5800] dark:text-[#f2be5e] shrink-0" />
        </a>

        <a
          href="https://alilmia.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-2xl bg-[#e8f6ff] dark:bg-[#112921] border border-[#006389]/25 dark:border-white/10 p-4 card-3d flex items-center justify-between gap-3 group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#006389] text-white flex items-center justify-center shrink-0 icon-3d">
              <Globe className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-[#0e1d25] dark:text-white truncate">
                {tr('الشبكة العلمية · دروس وفتاوى وتلاوات ولغات', 'Alilmia Scientific Network · Worldwide Archive')}
              </h3>
              <p dir="ltr" className="text-[11px] font-semibold text-[#006389] dark:text-[#80cfff] truncate">
                alilmia.com
              </p>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-[#006389] dark:text-[#80cfff] shrink-0" />
        </a>
      </div>

      {/* Row 3: Daily Sermons — Latest 3 Only + Prominent Archive Link */}
      <div id="home-sermons" className="scroll-mt-28 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-[#0e1d25] dark:text-[#e3f3fe]">
              {tr('أحدث المواعظ اليومية والنفحات', 'Latest Daily Sermons & Reflections')}
            </h2>
            <p className="text-xs text-[#6e7a71] dark:text-slate-400 mt-0.5">
              {tr(
                'عرض أحدث ٣ مواعظ لصفحة رئيسية خفيفة ومرتبة — وتصفح البقية من الأرشيف الشامل',
                'Showing the latest 3 sermons to keep Home clean — browse the rest in the Archive',
              )}
            </p>
          </div>
          <div className="flex items-center gap-2.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setShowReadingBar((v) => !v)}
              aria-expanded={showReadingBar}
              className={`min-h-[36px] px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                showReadingBar
                  ? 'bg-[#006a46] text-white'
                  : 'bg-[#e8f6ff] dark:bg-[#133126] text-[#006a46] dark:text-[#6cdba6]'
              }`}
            >
              <Type className="w-3.5 h-3.5 shrink-0" />
              <span>{tr('تخصيص الخط', 'Typography')}</span>
            </button>
          </div>
        </div>

        {showReadingBar && (
          <ReadingControlsBar
            compact
            fontSize={readingPrefs.fontSize}
            fontFamily={readingPrefs.fontFamily}
            onChangeFontSize={(fontSize) => updateReadingPrefs({fontSize})}
            onChangeFontFamily={(fontFamily) => updateReadingPrefs({fontFamily})}
            title={tr('حجم ونوع خط المواعظ', 'Sermon Typography Preferences')}
          />
        )}

        <div
          role="group"
          aria-label={tr('تصفية المواعظ حسب التصنيف', 'Filter reflections by category')}
          className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1"
        >
          {ALL_CATEGORIES.map((category) => {
            const isSelected = selectedCategory === category;
            const count = categoryCounts[category] ?? 0;
            const label = isEn ? CATEGORY_EN_MAP[category] || category : category;
            return (
              <button
                key={category}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedCategory(category)}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors ${
                  isSelected
                    ? 'bg-[#006a46] text-white shadow-sm'
                    : 'bg-[#e0f0fb] dark:bg-[#10261e] text-[#3e4a42] dark:text-slate-300 hover:bg-[#d0e8f8] dark:hover:bg-[#143227]'
                }`}
              >
                <span>{label}</span>
                <span
                  className={`text-xs tabular-nums ${
                    isSelected ? 'text-[#ffdea8]' : 'text-[#006389] dark:text-[#80cfff] opacity-80'
                  }`}
                >
                  ({formatNumber(count)})
                </span>
              </button>
            );
          })}
        </div>

        {latestThreePosts.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-8 text-center space-y-3">
            {selectedCategory === 'مقاطع مرئية' ? (
              <p className="text-base font-bold text-[#0e1d25] dark:text-white">
                {tr(
                  'قريباً بإذن الله.. يجري تجهيز مكتبة المرئيات العلمية والدعوية',
                  'Coming soon, in sha Allah — Preparing the Video Library',
                )}
              </p>
            ) : (
              <p className="text-base font-bold text-[#0e1d25] dark:text-white">
                {tr('لا توجد نتائج مطابقة لبحثك أو هذا التصنيف حالياً', 'No matching sermons found')}
              </p>
            )}
            <button
              type="button"
              onClick={() => setSelectedCategory('الكل')}
              className="min-h-[42px] px-5 py-2 rounded-xl bg-[#006a46] text-white text-sm font-bold"
            >
              {tr('عرض أحدث المواعظ', 'Show Latest Sermons')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {latestThreePosts.map((post) => {
              const isBookmarked = bookmarkedIds.includes(post.id);
              const isLiked = likedIds.includes(post.id);
              const cardDlCount = getItemDownloadCount(liveStats, `post_card_${post.id}`, 8);

              return (
                <article
                  key={post.id}
                  className={`rounded-2xl bg-white dark:bg-[#0d211a] border p-5 card-3d flex flex-col justify-between space-y-4 hover:border-[#006a46]/45 ${
                    post.hidden
                      ? 'border-amber-400/70 bg-amber-50/40 dark:bg-amber-950/20'
                      : 'border-slate-200/80 dark:border-white/10'
                  }`}
                >
                  {/* Admin-Only Moderation Bar Above Each Card */}
                  {isAdmin && (
                    <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2 border-b border-dashed border-slate-200 dark:border-white/15">
                      <span className="text-[10px] font-extrabold text-[#006a46] dark:text-[#6cdba6]">
                        {post.hidden ? 'مخفي عن الزوار' : 'تحكم المشرف'}
                      </span>
                      <div className="flex flex-wrap items-center gap-1">
                        {onAdminAutoPost && (
                          <button
                            type="button"
                            onClick={() => onAdminAutoPost(post.id)}
                            title="نشر آلي الآن"
                            className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 text-[11px] font-bold flex items-center gap-1"
                          >
                            <Bot className="w-3 h-3" />
                            <span>نشر آلي</span>
                          </button>
                        )}
                        {onAdminEditPost && (
                          <button
                            type="button"
                            onClick={() => onAdminEditPost(post)}
                            aria-label="تعديل الموعظة"
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/10 text-[#0e1d25] dark:text-white"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onAdminToggleHidePost && (
                          <button
                            type="button"
                            onClick={() => onAdminToggleHidePost(post.id)}
                            aria-label={post.hidden ? 'إظهار للزوار' : 'إخفاء عن الزوار'}
                            className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200"
                          >
                            {post.hidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        {onAdminDeletePost && (
                          <button
                            type="button"
                            onClick={() => onAdminDeletePost(post.id)}
                            aria-label="حذف الموعظة"
                            className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-200"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 text-xs text-[#6e7a71] dark:text-slate-400">
                      <span className="text-[#006a46] dark:text-[#6cdba6] font-semibold flex items-center gap-1 truncate">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{post.sourceLabel}</span>
                      </span>
                      <span className="whitespace-nowrap shrink-0">
                        {isEn ? CATEGORY_EN_MAP[post.category] || post.category : post.category} ·{' '}
                        {post.publishedAtLabel}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenPost(post.id)}
                      className="text-start block w-full group space-y-2"
                    >
                      <h3
                        dir="rtl"
                        className="text-base sm:text-lg font-bold text-[#0e1d25] dark:text-white leading-snug group-hover:text-[#006a46] dark:group-hover:text-[#6cdba6] transition-colors"
                        style={{fontFamily: readingFontCss, textWrap: 'balance'}}
                      >
                        {post.title}
                      </h3>
                      <p
                        dir="rtl"
                        className={`text-[#3e4a42] dark:text-slate-300 line-clamp-3 ${readingSizeSpec.cardExcerptClass}`}
                        style={{fontFamily: readingFontCss}}
                      >
                        {post.excerpt}
                      </p>
                    </button>

                    <div className="flex items-center justify-between gap-2 text-xs text-[#7c5800] dark:text-[#f2be5e] font-semibold">
                      <span>{post.author}</span>
                      {post.platformTag && (
                        <span className="text-[#006389] dark:text-[#80cfff] tabular-nums">{post.platformTag}</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-white/10">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onCopySada(post)}
                        className="flex-1 min-h-[40px] px-3 py-1.5 rounded-xl bg-[#e8f6ff] dark:bg-[#133126] text-[#006a46] dark:text-[#6cdba6] hover:bg-[#d5ecfb] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                      >
                        <Copy className="w-3.5 h-3.5 shrink-0" />
                        <span>{isEn ? 'Copy' : siteConfig.sadaBroadcastBtn}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenPost(post.id)}
                        className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#f4faff] dark:bg-white/5 text-[#0e1d25] dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0"
                      >
                        <BookOpen className="w-3.5 h-3.5 shrink-0" />
                        <span>{isEn ? 'Read' : siteConfig.readMoreBtn}</span>
                      </button>
                      {post.youtubeUrl && (
                        <a
                          href={post.youtubeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={tr('مشاهدة على يوتيوب', 'Watch on YouTube')}
                          className="min-w-[40px] min-h-[40px] rounded-xl bg-[#ffdad6]/60 dark:bg-rose-950/50 text-[#93000a] dark:text-rose-300 flex items-center justify-center shrink-0"
                        >
                          <Youtube className="w-4 h-4" />
                        </a>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-[#6e7a71] dark:text-slate-400">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onToggleLike(post.id)}
                          className={`min-h-[38px] px-2 flex items-center gap-1 ${
                            isLiked ? 'text-[#ba1a1a]' : 'hover:text-[#0e1d25] dark:hover:text-white'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                          <span className="tabular-nums">{formatNumber(post.likes)}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenPost(post.id)}
                          className="min-h-[38px] px-2 flex items-center gap-1 hover:text-[#0e1d25] dark:hover:text-white"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span className="tabular-nums">{formatNumber(post.commentsCount)}</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onToggleBookmark(post.id)}
                          aria-label={tr('حفظ', 'Bookmark')}
                          className={`min-w-[38px] min-h-[38px] rounded-full flex items-center justify-center ${
                            isBookmarked ? 'text-[#7c5800] dark:text-[#f2be5e]' : ''
                          }`}
                        >
                          <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onShareCard(post)}
                          className="min-h-[38px] px-2.5 rounded-xl bg-[#f3f6f4] dark:bg-white/10 hover:text-[#006a46] dark:hover:text-[#6cdba6] text-[11px] font-bold flex items-center gap-1 whitespace-nowrap"
                        >
                          <Sparkles className="w-3.5 h-3.5 shrink-0" />
                          <span>{isEn ? 'PNG Card' : siteConfig.exportCardBtn}</span>
                          <span className="text-[10px] opacity-75 tabular-nums">
                            ({formatNumber(cardDlCount)})
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Prominent Button to Browse All Sermons & Permanent Archive */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => onNavigateLibrary('all')}
            className="min-h-[48px] px-6 py-3 rounded-2xl bg-[#006a46] hover:bg-[#005235] text-white font-extrabold text-sm shadow-sm flex items-center gap-2 transition-colors"
          >
            <span>تصفح جميع المواعظ والأرشيف ←</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('archive')}
            className="min-h-[48px] px-5 py-3 rounded-2xl bg-[#fffbf2] dark:bg-[#13221c] border border-[#f2be5e]/50 text-[#7c5800] dark:text-[#f2be5e] font-bold text-sm flex items-center gap-2 transition-colors"
          >
            <Archive className="w-4 h-4" />
            <span>{tr('الأرشيف الشامل الدائم', 'Permanent AI Archive')}</span>
          </button>
        </div>
      </div>

      {/* X Platform Phrases Section */}
      {twitterQuotes.length > 0 && (
        <section className="rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-white/10 text-white flex items-center justify-center shrink-0 icon-3d">
                <Hash className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#0e1d25] dark:text-white">
                  {tr('عبارات ومنشورات من حسابنا على منصة إكس (X)', 'Official X Platform Quotes')}
                </h2>
                <p className="text-xs text-[#6e7a71] dark:text-slate-400">
                  {tr(
                    `اضغط على أي عبارة للانتقال مباشرة إلى صفحتنا الرسمية (${primaryXHandle})`,
                    `Tap any quote to open our official X account (${primaryXHandle})`,
                  )}
                </p>
              </div>
            </div>
            <a
              href={primaryXLink}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white/15 dark:hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
            >
              <span>{tr('زيارة صفحتنا على منصة إكس (X)', 'Visit Official X Page')}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {twitterQuotes.slice(0, 3).map((tw) => (
              <a
                key={tw.id}
                href={tw.url || primaryXLink}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-2xl bg-[#f4faff] dark:bg-[#112921] border border-slate-200/70 dark:border-white/10 hover:border-[#006a46] p-4 card-3d flex flex-col justify-between gap-3 text-start"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="font-bold text-[#006a46] dark:text-[#6cdba6]">{tw.tag}</span>
                    <span dir="ltr" className="text-[#6e7a71] dark:text-slate-400 font-semibold">
                      {tw.handle}
                    </span>
                  </div>
                  <p
                    dir="rtl"
                    className="text-sm text-[#0e1d25] dark:text-slate-200 leading-[1.8] font-medium group-hover:text-[#006a46] dark:group-hover:text-[#6cdba6] transition-colors"
                  >
                    «{tw.text}»
                  </p>
                </div>
                <div className="flex items-center justify-between text-[11px] font-bold text-[#006389] dark:text-[#80cfff] pt-2 border-t border-slate-200/60 dark:border-white/10">
                  <span>{tr('فتح المنشور في منصة إكس (X)', 'Open on X')}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Official Channels Quick Strip */}
      {activeChannels.length > 0 && (
        <section className="rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-[#0e1d25] dark:text-white">
                {tr('منصات البث الرسمية', 'Official Broadcast Channels')}
              </h2>
              <p className="text-xs text-[#6e7a71] dark:text-slate-400">
                {tr(
                  'تابع البث المتزامن لمواعظ وعبر على حساباتنا الموثقة',
                  'Follow synchronized broadcasts across our verified platforms',
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={onNavigateChannels}
              className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#e8f6ff] dark:bg-[#133126] text-[#006a46] dark:text-[#6cdba6] text-xs font-bold whitespace-nowrap shrink-0"
            >
              {tr('كل المنصات', 'All Channels')}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {activeChannels.map((ch) => {
              const Icon = resolveIcon(ch.iconId, 'globe');
              const style = COLOR_SCHEME_STYLES[ch.colorScheme] || COLOR_SCHEME_STYLES.emerald;
              return (
                <a
                  key={ch.id}
                  href={ch.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3.5 rounded-xl bg-[#f4faff] dark:bg-[#112921] hover:border-[#006a46]/40 border border-transparent card-3d flex items-center gap-3"
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 icon-3d ${style.badgeClass}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#0e1d25] dark:text-white truncate">{ch.name}</p>
                    <p className="text-[11px] text-[#6e7a71] dark:text-slate-400 truncate mt-0.5" dir="ltr">
                      {ch.handle}
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        </section>
      )}

      {/* Unified Saved / Bookmarks Box */}
      {onNavigateBookmarks && (
        <section
          id="home-bookmarks-box"
          className="rounded-2xl bg-[#fffbf2] dark:bg-[#13221c] border border-[#f2be5e]/45 dark:border-[#f2be5e]/20 p-5 card-3d flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-[#7c5800] text-white flex items-center justify-center shrink-0 icon-3d">
              <Bookmark className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-[#0e1d25] dark:text-white">
                {tr(siteConfig.navBookmarks, 'Saved & Bookmarks')}
              </h2>
              <p className="text-xs sm:text-sm text-[#3e4a42] dark:text-slate-300 mt-0.5">
                {tr(
                  `مربع واحد يجمع جميع المواعظ والفتاوى المحفوظة (${formatNumber(bookmarkedIds.length + bookmarkedFatwaCount)} مادة متاحة بدون إنترنت)`,
                  `One unified box for all saved sermons & fatawa (${formatNumber(bookmarkedIds.length + bookmarkedFatwaCount)} items offline)`,
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onNavigateBookmarks}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#7c5800] hover:bg-[#614400] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 whitespace-nowrap shrink-0 transition-colors"
          >
            <Bookmark className="w-4 h-4 shrink-0" />
            <span>
              {tr('فتح المحفوظات', 'Open Saved')} ({formatNumber(bookmarkedIds.length + bookmarkedFatwaCount)})
            </span>
          </button>
        </section>
      )}

      {/* Row 4: Live Creative Statistics Strip (Starts at 4001+ & persists permanently) */}
      <LiveStatsStrip />
    </div>
  );
}
