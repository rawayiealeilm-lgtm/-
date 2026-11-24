import {
  Award,
  BarChart3,
  BellRing,
  Calendar,
  CheckCircle2,
  Copy,
  Heart,
  RefreshCw,
  RotateCcw,
  Search,
  Share2,
  Sparkles,
  Sun,
  TrendingUp,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {useEffect, useMemo, useState} from 'react';
import {
  ADHKAR_8_CHAPTERS,
  ADHKAR_ITEMS,
  FREE_TASBEEH_PHRASES,
  HISN_ITEMS,
  MOTHER_PRAYERS,
} from '../data/seed';
import type {CustomAdhkarItem, Post, SiteConfig} from '../types';
import {ComingSoonState} from './ComingSoonState';
type AdhkarChapterId = (typeof ADHKAR_8_CHAPTERS)[number]['id'];
import {
  ADHKAR_STATS_UPDATED_EVENT,
  getAdhkarProgressCards,
  recordDhikrTap,
} from '../utils/adhkarStats';
import {useI18n} from '../utils/i18n';
import type {AdhkarReminderSettings} from '../utils/notifications';
import {resolveFontFamilyCss, resolveFontSizeSpec, useReadingPrefs} from '../utils/readingPrefs';
import {getPublicSiteUrl} from '../utils/storage';
import {trackInteraction} from '../utils/telemetry';

const ADHKAR_STORAGE_KEY = 'mawaedh_adhkar_counts_v2';

interface AdhkarState {
  dateKey: string;
  counts: Record<string, number>;
  freeTasbeeh: number;
  freePhraseIdx: number;
  soundEnabled: boolean;
}

interface NormalizedDhikrCard {
  id: string;
  chapterId: AdhkarChapterId;
  title?: string;
  text: string;
  fadl?: string;
  targetCount: number;
  source: string;
}

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function loadAdhkarState(): AdhkarState {
  const today = getTodayKey();
  const defaults: AdhkarState = {
    dateKey: today,
    counts: {},
    freeTasbeeh: 0,
    freePhraseIdx: 0,
    soundEnabled: true,
  };
  if (typeof window === 'undefined') return defaults;
  try {
    const raw =
      window.localStorage.getItem(ADHKAR_STORAGE_KEY) ||
      window.localStorage.getItem('mawaedh_adhkar_counts_v1');
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<AdhkarState>;
    if (parsed.dateKey === today) {
      return {
        dateKey: today,
        counts: parsed.counts && typeof parsed.counts === 'object' ? parsed.counts : {},
        freeTasbeeh: typeof parsed.freeTasbeeh === 'number' ? parsed.freeTasbeeh : 0,
        freePhraseIdx: typeof parsed.freePhraseIdx === 'number' ? parsed.freePhraseIdx : 0,
        soundEnabled: parsed.soundEnabled !== false,
      };
    }
    return {...defaults, soundEnabled: parsed.soundEnabled !== false};
  } catch {
    return defaults;
  }
}

function mapLegacyTo8Chapters(): NormalizedDhikrCard[] {
  const list: NormalizedDhikrCard[] = [];

  for (const item of ADHKAR_ITEMS) {
    let chapterId: AdhkarChapterId = 'ch1_morning_evening';
    if (item.category === 'morning' || item.category === 'evening') {
      chapterId = 'ch1_morning_evening';
    } else if (item.category === 'after_prayer') {
      chapterId = 'ch2_wudu_prayer';
    } else if (item.category === 'sleep') {
      chapterId = 'ch3_sleep_waking';
    } else if (item.category === 'general') {
      chapterId = 'ch7_istighfar_tasbeeh';
    } else if (item.category === 'prophetic_duas' || item.category === 'quran_duas') {
      chapterId = 'ch6_distress_ruqyah';
    } else if (item.category === 'family_muslims_duas') {
      chapterId = 'ch8_birr_wafaa';
    }
    list.push({
      id: `adh_${item.id}`,
      chapterId,
      title: item.category === 'morning' ? 'من أذكار الصباح' : item.category === 'evening' ? 'من أذكار المساء' : undefined,
      text: item.text,
      fadl: item.fadl,
      targetCount: item.targetCount,
      source: item.source,
    });
  }

  for (const h of HISN_ITEMS) {
    let chapterId: AdhkarChapterId = 'ch6_distress_ruqyah';
    if (h.chapter === 'mosque_prayer') chapterId = 'ch2_wudu_prayer';
    else if (h.chapter === 'waking_sleep') chapterId = 'ch3_sleep_waking';
    else if (h.chapter === 'travel_nature') chapterId = 'ch4_home_travel';
    else if (h.chapter === 'home_clothing') chapterId = 'ch5_food_clothing';
    else if (h.chapter === 'distress_debt' || h.chapter === 'ruqyah_illness') {
      chapterId = 'ch6_distress_ruqyah';
    }

    list.push({
      id: `his_${h.id}`,
      chapterId,
      title: h.title,
      text: h.text,
      fadl: h.fadl,
      targetCount: h.targetCount,
      source: h.source,
    });
  }

  return list;
}

export function AdhkarView({
  siteConfig,
  initialSection = 'adhkar',
  customAdhkar = [],
  motherPrayerText,
  motherPrayersCount = 0,
  hasSaidAmen = false,
  onSayAmen,
  reminderSettings,
  onOpenSettings,
  onOpenWeeklyActivity,
  onShareCard,
  onNotify,
}: {
  siteConfig?: SiteConfig;
  initialSection?: 'adhkar' | 'hisn';
  customAdhkar?: CustomAdhkarItem[];
  motherPrayerText?: string;
  motherPrayersCount?: number;
  hasSaidAmen?: boolean;
  onSayAmen?: () => void;
  reminderSettings?: AdhkarReminderSettings;
  onOpenSettings?: () => void;
  onOpenWeeklyActivity?: () => void;
  onShareCard?: (post: Post) => void;
  onNotify: (msg: string) => void;
}) {
  const {tr, formatNumber} = useI18n();
  const {prefs} = useReadingPrefs();
  const fontSpec = resolveFontSizeSpec(prefs.fontSize);
  const readingFontCss = resolveFontFamilyCss(prefs.fontFamily);

  const [state, setState] = useState<AdhkarState>(() => loadAdhkarState());
  const [activeChapter, setActiveChapter] = useState<AdhkarChapterId>(() =>
    initialSection === 'hisn' ? 'ch6_distress_ruqyah' : 'ch1_morning_evening',
  );
  const [query, setQuery] = useState('');
  const [statsVersion, setStatsVersion] = useState(0);
  const [motherPrayerIdx, setMotherPrayerIdx] = useState(0);

  const allItems = useMemo(() => {
    const base = mapLegacyTo8Chapters();
    const extra: NormalizedDhikrCard[] = (Array.isArray(customAdhkar) ? customAdhkar : []).map((c) => {
      const validCh = ADHKAR_8_CHAPTERS.some((ch) => ch.id === c.chapterId)
        ? (c.chapterId as AdhkarChapterId)
        : 'ch1_morning_evening';
      return {
        id: c.id,
        chapterId: validCh,
        title: c.title,
        text: c.text,
        fadl: c.fadl,
        targetCount: Math.max(1, c.targetCount || 1),
        source: c.source || 'إضافات المشرفين السحابية',
      };
    });
    return [...extra, ...base];
  }, [customAdhkar]);

  useEffect(() => {
    if (initialSection === 'hisn') {
      setActiveChapter('ch2_wudu_prayer');
    }
  }, [initialSection]);

  useEffect(() => {
    try {
      window.localStorage.setItem(ADHKAR_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage error
    }
  }, [state]);

  useEffect(() => {
    const onUpdate = () => setStatsVersion((v) => v + 1);
    window.addEventListener(ADHKAR_STATS_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(ADHKAR_STATS_UPDATED_EVENT, onUpdate);
  }, []);

  const progressCards = useMemo(() => {
    void statsVersion;
    return getAdhkarProgressCards();
  }, [statsVersion]);

  const motherPrayersList = useMemo(() => {
    const custom = (motherPrayerText || siteConfig?.motherPrayerText || '').trim();
    if (custom && !MOTHER_PRAYERS.includes(custom)) {
      return [custom, ...MOTHER_PRAYERS];
    }
    return MOTHER_PRAYERS;
  }, [motherPrayerText, siteConfig?.motherPrayerText]);

  const currentMotherPrayer = motherPrayersList[motherPrayerIdx % motherPrayersList.length];

  const playTapFeedback = (isComplete: boolean) => {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(isComplete ? [25, 40, 35] : 12);
      }
      if (!state.soundEnabled) return;
      const AudioCtx =
        window.AudioContext || (window as unknown as {webkitAudioContext?: typeof AudioContext}).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = isComplete ? 660 : 480;
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(isComplete ? 0.05 : 0.025, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + (isComplete ? 0.25 : 0.08));
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.26);
      window.setTimeout(() => {
        ctx.close().catch(() => undefined);
      }, 320);
    } catch {
      // Ignore audio failures
    }
  };

  const trimmedQuery = query.trim().toLowerCase();

  const visibleItems = useMemo(() => {
    if (!trimmedQuery) {
      return allItems.filter((item) => item.chapterId === activeChapter);
    }
    return allItems.filter(
      (item) =>
        (item.title || '').toLowerCase().includes(trimmedQuery) ||
        item.text.toLowerCase().includes(trimmedQuery) ||
        item.source.toLowerCase().includes(trimmedQuery) ||
        (item.fadl || '').toLowerCase().includes(trimmedQuery),
    );
  }, [allItems, activeChapter, trimmedQuery]);

  const chapterProgressMap = useMemo(() => {
    const map: Record<string, {done: number; total: number}> = {};
    for (const ch of ADHKAR_8_CHAPTERS) {
      const items = allItems.filter((i) => i.chapterId === ch.id);
      const done = items.filter((i) => (state.counts[i.id] || 0) >= i.targetCount).length;
      map[ch.id] = {done, total: items.length};
    }
    return map;
  }, [allItems, state.counts]);

  const activeChapterMeta =
    ADHKAR_8_CHAPTERS.find((c) => c.id === activeChapter) || ADHKAR_8_CHAPTERS[0];

  const incrementItem = (item: NormalizedDhikrCard) => {
    const current = state.counts[item.id] || 0;
    if (current >= item.targetCount) {
      onNotify(
        tr(
          `تم إكمال هذا الذكر (${formatNumber(item.targetCount)} / ${formatNumber(item.targetCount)}) — يمكنك التصفير لإعادته`,
          `Completed (${formatNumber(item.targetCount)}x) — tap reset to repeat`,
        ),
      );
      return;
    }
    const next = current + 1;
    const completed = next === item.targetCount;
    playTapFeedback(completed);
    recordDhikrTap('adhkar');
    trackInteraction('adhkar_tap', item.chapterId);
    if (completed) {
      trackInteraction('adhkar_complete', item.chapterId);
    }
    setState((prev) => ({
      ...prev,
      counts: {...prev.counts, [item.id]: next},
    }));
    if (completed) {
      onNotify(
        tr(
          `تقبل الله! اكتمل الذكر (${formatNumber(item.targetCount)} مرات)`,
          `May Allah accept it! Completed (${formatNumber(item.targetCount)}x)`,
        ),
      );
    }
  };

  const resetCurrentChapter = () => {
    setState((prev) => {
      const nextCounts = {...prev.counts};
      for (const item of visibleItems) {
        nextCounts[item.id] = 0;
      }
      return {...prev, counts: nextCounts};
    });
    onNotify(tr(`تم تصفير عدادات ${activeChapterMeta.label}`, `Reset counters for ${activeChapterMeta.label}`));
  };

  const resetAll = () => {
    setState((prev) => ({
      ...prev,
      counts: {},
      freeTasbeeh: 0,
    }));
    onNotify(tr('تم تصفير عدادات اليوم لجميع الأذكار والمسبحة مع حفظ إحصائية الحسنات الدائمة', 'Daily counters reset; lifetime Hasanat kept'));
  };

  const copyDhikr = async (item: NormalizedDhikrCard) => {
    const text = `${item.title ? `${item.title}\n` : ''}${item.text}\n— (${item.source})`;
    try {
      await navigator.clipboard.writeText(text);
      onNotify(tr('تم نسخ الذكر مع تخريجه', 'Dhikr copied with citation'));
    } catch {
      onNotify(tr('تم تجهيز الذكر للنسخ', 'Dhikr ready'));
    }
  };

  const shareMotherPrayer = async () => {
    const appLabel = siteConfig?.appName || 'مواعظ وعبر';
    const siteUrl = getPublicSiteUrl('/?tab=adhkar');
    const msg = `🤲 *دعاء للوالدة حفظها الله*\n\n${currentMotherPrayer}\n\n— الأذكار والأدعية الجامعة · ${appLabel}\n🌐 ${siteUrl}`;
    try {
      await navigator.clipboard.writeText(msg);
      onNotify(tr('جزاك الله خيراً، تم نسخ دعاء الوالدة مع رابط الموقع للمشاركة', 'Mother prayer copied'));
    } catch {
      if (navigator.share) {
        try {
          await navigator.share({title: appLabel, text: msg, url: siteUrl});
        } catch {
          // ignore
        }
      }
    }
  };

  const exportItemCard = (title: string, text: string, source: string, categoryLabel: string, id: string) => {
    if (!onShareCard) return;
    onShareCard({
      id,
      title,
      excerpt: text,
      body: text,
      author: source,
      sourceLabel: categoryLabel,
      category: 'الأذكار والأدعية الجامعة',
      mediaType: 'quote',
      cardTheme: 'emerald',
      likes: 0,
      commentsCount: 0,
      publishedAtLabel: categoryLabel,
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Unified Header Banner */}
      <section className="rounded-2xl bg-gradient-to-br from-[#006a46] via-[#008559] to-[#005235] text-white p-5 sm:p-6 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[#ffdea8] text-xs font-semibold">
              <Sun className="w-4 h-4" />
              <span>
                {tr(
                  'موسوعة الأذكار والأدعية الجامعة والمأثورة عن النبي ﷺ',
                  'Comprehensive Authentic Adhkar & Prophetic Duas',
                )}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold mt-1">
              {tr('الأذكار والأدعية الجامعة', 'Comprehensive Adhkar & Duas')}
            </h1>
            <p className="text-xs sm:text-sm text-[#e3f3fe]/90 mt-1 max-w-2xl leading-relaxed">
              {tr(
                '٨ أبواب منظمة ومفهرسة مع عداد تفاعلي وإحصائية الحسنات الدائمة وباب «وقفة بر ووفاء» للدعاء للوالدين والأهل والمسلمين.',
                '8 organized chapters with interactive Hasanat counter and Birr & Wafaa prayers.',
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
            {onOpenWeeklyActivity && (
              <button
                type="button"
                onClick={onOpenWeeklyActivity}
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
              >
                <BarChart3 className="w-4 h-4 text-[#ffdea8]" />
                <span>{tr('النشاط الأسبوعي', 'Weekly Activity')}</span>
              </button>
            )}
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
                  reminderSettings?.enabled
                    ? 'bg-[#ffc968] text-[#271900]'
                    : 'bg-white/15 hover:bg-white/25 text-white'
                }`}
              >
                <BellRing className="w-4 h-4" />
                <span>
                  {reminderSettings?.enabled
                    ? tr(
                        `تذكير: ${reminderSettings.morningTime} · ${reminderSettings.eveningTime}`,
                        `Reminders: ${reminderSettings.morningTime} · ${reminderSettings.eveningTime}`,
                      )
                    : tr('المنبّه الدعوي', 'Reminders')}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setState((s) => ({...s, soundEnabled: !s.soundEnabled}))}
              className="min-h-[40px] px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              {state.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span>{state.soundEnabled ? tr('النقر مفعل', 'Sound On') : tr('صامت', 'Muted')}</span>
            </button>
            <button
              type="button"
              onClick={resetCurrentChapter}
              className="min-h-[40px] px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{tr('تصفير الباب', 'Reset Chapter')}</span>
            </button>
            <button
              type="button"
              onClick={resetAll}
              className="min-h-[40px] px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-[#ffdea8] text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{tr('تصفير عداد اليوم', 'Reset Day')}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Interactive Hasanat Counter & 3 Permanent Progress Cards (Today | This Month | Overall) */}
      <section className="rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-4 sm:p-5 shadow-xs space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-[#7c5800] dark:text-[#f2be5e]" />
            <h2 className="text-sm sm:text-base font-extrabold text-[#0e1d25] dark:text-white">
              عداد الأذكار وإحصائية الحسنات الدائمة
            </h2>
          </div>
          <span className="text-xs font-bold text-[#006a46] dark:text-[#6cdba6]">
            «مَن جَاءَ بِالْحَسَنَةِ فَلَهُ عَشْرُ أَمْثَالِهَا ۖ وَاللَّهُ يُضَاعِفُ لِمَن يَشَاءُ»
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Card 1: إنجاز اليوم */}
          <div className="rounded-2xl bg-gradient-to-br from-[#eefaf3] to-[#f4faff] dark:from-[#0f2b20] dark:to-[#0c211a] border border-[#006a46]/25 p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-[#006a46] dark:text-[#6cdba6]">
              <span>إنجاز اليوم</span>
              <Sun className="w-4 h-4 shrink-0" />
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-2xl font-extrabold text-[#0e1d25] dark:text-white tabular-nums">
                {formatNumber(progressCards.todayCount)}
              </span>
              <span className="text-xs font-bold text-[#7c5800] dark:text-[#f2be5e] tabular-nums">
                +{formatNumber(progressCards.todayHasanat)} حسنة (حد أدنى)
              </span>
            </div>
            <p className="text-[11px] text-[#3e4a42] dark:text-slate-300">
              تُحسب تلقائياً عند كل ضغطة ذكر أو تسبيح اليوم · والله يضاعف لمن يشاء
            </p>
          </div>

          {/* Card 2: إنجاز هذا الشهر */}
          <div className="rounded-2xl bg-gradient-to-br from-[#fffbf2] to-[#fff7e6] dark:from-[#192117] dark:to-[#131d17] border border-[#f2be5e]/45 p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-[#7c5800] dark:text-[#f2be5e]">
              <span>إنجاز هذا الشهر</span>
              <Calendar className="w-4 h-4 shrink-0" />
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-2xl font-extrabold text-[#0e1d25] dark:text-white tabular-nums">
                {formatNumber(progressCards.monthCount)}
              </span>
              <span className="text-xs font-bold text-[#006a46] dark:text-[#6cdba6] tabular-nums">
                +{formatNumber(progressCards.monthHasanat)} حسنة (حد أدنى)
              </span>
            </div>
            <p className="text-[11px] text-[#3e4a42] dark:text-slate-300">
              رصيد أذكار وتسبيحات الشهر الهجري/الميلادي الحالي دون حذف
            </p>
          </div>

          {/* Card 3: الإجمالي العام */}
          <div className="rounded-2xl bg-gradient-to-br from-[#006a46] to-[#004d33] text-white p-4 space-y-1.5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold text-[#ffdea8]">
              <span>الإجمالي العام (دائم)</span>
              <TrendingUp className="w-4 h-4 shrink-0" />
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-2xl font-extrabold tabular-nums">
                {formatNumber(progressCards.overallCount)}
              </span>
              <span className="text-xs font-extrabold text-[#ffdea8] tabular-nums">
                {formatNumber(progressCards.overallHasanat)} حسنة+
              </span>
            </div>
            <p className="text-[11px] text-emerald-100/90">
              إحصائية دائمة عبر الأشهر والزيارات · «والله يضاعف لمن يشاء»
            </p>
          </div>
        </div>
      </section>

      {/* Instant Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#6e7a71] absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tr('ابحث فوريّاً في جميع الأبواب الثمانية والأدعية الجامعة...', 'Instant search across all 8 chapters...')}
          className="w-full min-h-[46px] ps-10 pe-4 rounded-xl bg-white dark:bg-[#0d211a] border border-slate-200 dark:border-white/10 text-sm text-[#0e1d25] dark:text-white focus:outline-none focus:border-[#006a46]"
        />
      </div>

      {/* 8 Ordered Interactive Chapters */}
      {!trimmedQuery && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {ADHKAR_8_CHAPTERS.map((ch) => {
            const isActive = activeChapter === ch.id;
            const prog = chapterProgressMap[ch.id] || {done: 0, total: 0};
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => setActiveChapter(ch.id)}
                className={`min-h-[48px] px-3.5 py-2.5 rounded-xl text-start transition-all flex items-center justify-between gap-2 border ${
                  isActive
                    ? 'bg-[#006a46] text-white border-[#006a46] shadow-sm'
                    : 'bg-white dark:bg-[#0d211a] border-slate-200/80 dark:border-white/10 text-[#0e1d25] dark:text-slate-200 hover:border-[#006a46]/50'
                }`}
              >
                <span className="text-xs sm:text-[13px] font-bold truncate">{ch.label}</span>
                {prog.total > 0 && (
                  <span
                    className={`text-[11px] font-extrabold tabular-nums shrink-0 ${
                      isActive ? 'text-[#ffdea8]' : 'text-[#006a46] dark:text-[#6cdba6]'
                    }`}
                  >
                    {formatNumber(prog.done)}/{formatNumber(prog.total)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Chapter 8 Special Interactive Cards: Moved Mother Dua Card + Waqfa Birr & Wafaa */}
      {(trimmedQuery || activeChapter === 'ch8_birr_wafaa') && (
        <section className="space-y-4">
          {/* Moved Mother Dua Card (Dedicated strictly to Mother) */}
          <div className="rounded-3xl bg-[#fffbf2] dark:bg-[#13201b] border border-[#f2be5e]/45 dark:border-[#f2be5e]/25 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-extrabold text-[#7c5800] dark:text-[#f2be5e]">
                <Heart className="w-4 h-4 fill-current shrink-0" />
                <span>دعاء مخصص للوالدة حفظها الله (داخل باب «وقفة بر ووفاء»)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#7c5800] dark:text-[#f2be5e] tabular-nums">
                  {formatNumber(motherPrayerIdx + 1)} / {formatNumber(motherPrayersList.length)}
                </span>
                <button
                  type="button"
                  onClick={() => setMotherPrayerIdx((p) => (p + 1) % motherPrayersList.length)}
                  className="min-h-[34px] px-3 py-1 rounded-xl bg-[#ffdea8]/70 hover:bg-[#ffdea8] text-[#271900] text-xs font-bold flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>دعاء آخر للوالدة</span>
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMotherPrayerIdx((p) => (p + 1) % motherPrayersList.length)}
              className="w-full text-start rounded-2xl bg-white/90 dark:bg-[#0c1814] border border-[#f2be5e]/35 p-4 hover:border-[#006a46]/50 transition-colors"
            >
              <p
                dir="rtl"
                style={{fontFamily: readingFontCss}}
                className={`${fontSpec.bodyClass} font-bold text-[#0e1d25] dark:text-[#e3f3fe]`}
              >
                {currentMotherPrayer}
              </p>
            </button>

            <div className="flex flex-wrap items-center justify-between gap-2">
              {onSayAmen && (
                <button
                  type="button"
                  onClick={onSayAmen}
                  disabled={hasSaidAmen}
                  className={`min-h-[42px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors ${
                    hasSaidAmen
                      ? 'bg-[#006a46] text-white cursor-default'
                      : 'bg-[#006a46]/10 hover:bg-[#006a46] text-[#006a46] hover:text-white dark:bg-[#008559]/25 dark:text-[#6cdba6]'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${hasSaidAmen ? 'fill-current' : ''}`} />
                  <span>{hasSaidAmen ? 'تم التأمين — تقبل الله' : siteConfig?.motherAmenBtn || 'آمين — حفظها الله'}</span>
                  <span className="tabular-nums">({formatNumber(motherPrayersCount)})</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => void shareMotherPrayer()}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-[#ffdea8] hover:bg-[#ffc968] text-[#271900] text-xs sm:text-sm font-bold flex items-center gap-1.5"
              >
                <Share2 className="w-4 h-4" />
                <span>{siteConfig?.motherShareBtn || 'مشاركة الدعاء للوالدة'}</span>
              </button>
            </div>
          </div>

          {/* Comprehensive Family, Parents & Muslims Supplication */}
          <div className="rounded-3xl border border-emerald-700/20 bg-gradient-to-br from-[#eefaf3] to-[#f4faff] dark:from-[#0c241c] dark:to-[#0d211a] p-5 sm:p-6 shadow-xs space-y-2.5">
            <span className="text-xs font-extrabold text-[#006a46] dark:text-[#6cdba6]">
              باب «وقفة بر ووفاء»
            </span>
            <h2 className="text-base sm:text-lg font-extrabold text-[#0e1d25] dark:text-white">
              الدعاء الشامل للوالد والأهل والمسلمين
            </h2>
            <p
              dir="rtl"
              style={{fontFamily: readingFontCss}}
              className={`${fontSpec.bodyClass} text-[#1d2a22] dark:text-slate-200`}
            >
              «رَبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا، رَبَّنَا اغْفِرْ لِي وَلِوَالِدَيَّ وَلِلْمُؤْمِنِينَ يَوْمَ يَقُومُ الْحِسَابُ، اللَّهُمَّ بَارِكْ فِي أَهْلِنَا وَذُرِّيَّاتِنَا وَاحْفَظْ بِلَادَ الْمُسْلِمِينَ وَأَلِّفْ بَيْنَ قُلُوبِهِمْ وَانْصُرْ دِينَكَ وَسُنَّةَ نَبِيِّكَ ﷺ».
            </p>
          </div>
        </section>
      )}

      {/* Electronic Free Tasbeeh Inside Chapter 7 (or non-search default quick access) */}
      {!trimmedQuery && (activeChapter === 'ch7_istighfar_tasbeeh' || activeChapter === 'ch1_morning_evening') && (
        <section className="rounded-2xl bg-[#fffbf2] dark:bg-[#13221c] border border-[#f2be5e]/45 dark:border-[#f2be5e]/25 p-4 sm:p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#7c5800] dark:text-[#f2be5e]">
              <Sparkles className="w-4 h-4" />
              <span>{tr('المسبحة الإلكترونية الحرة · تسبيح مفتوح محسوب في الحسنات الدائمة', 'Electronic Free Tasbeeh')}</span>
            </div>
            <div className="flex items-center gap-2">
              <select
                aria-label={tr('اختر صيغة التسبيح', 'Select Tasbeeh phrase')}
                value={state.freePhraseIdx}
                onChange={(e) => setState((s) => ({...s, freePhraseIdx: Number(e.target.value)}))}
                className="min-h-[40px] rounded-xl bg-white dark:bg-[#0a1914] border border-[#f2be5e]/40 px-3 py-1.5 text-xs font-bold text-[#0e1d25] dark:text-white focus:outline-none"
              >
                {FREE_TASBEEH_PHRASES.map((phrase, idx) => (
                  <option key={phrase} value={idx}>
                    {phrase}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setState((s) => ({...s, freeTasbeeh: 0}))}
                aria-label={tr('تصفير المسبحة الحرة', 'Reset Tasbeeh')}
                className="min-w-[40px] min-h-[40px] rounded-xl bg-white dark:bg-[#0a1914] border border-slate-200 dark:border-white/10 text-[#6e7a71] dark:text-slate-300 flex items-center justify-center hover:text-[#ba1a1a]"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const next = state.freeTasbeeh + 1;
              playTapFeedback(next % 33 === 0);
              recordDhikrTap('tasbeeh');
              trackInteraction('adhkar_tap', 'tasbeeh');
              setState((s) => ({...s, freeTasbeeh: next}));
            }}
            className="w-full min-h-[60px] rounded-xl bg-gradient-to-l from-[#7c5800] to-[#b58100] hover:brightness-105 active:scale-[0.99] text-white px-5 py-3 flex items-center justify-between gap-3 transition-all shadow-sm"
          >
            <span dir="rtl" className="text-base sm:text-lg font-bold text-start">
              {FREE_TASBEEH_PHRASES[state.freePhraseIdx] || FREE_TASBEEH_PHRASES[0]}
            </span>
            <span className="text-sm sm:text-base font-bold bg-black/20 px-4 py-1.5 rounded-lg tabular-nums whitespace-nowrap shrink-0">
              {tr(`تم الضغط: ${formatNumber(state.freeTasbeeh)}`, `Count: ${formatNumber(state.freeTasbeeh)}`)}
            </span>
          </button>
        </section>
      )}

      {/* Active Chapter Info Strip */}
      {!trimmedQuery && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#3e4a42] dark:text-slate-300 px-1">
          <div>
            <span className="font-extrabold text-[#006a46] dark:text-[#6cdba6]">{activeChapterMeta.label}: </span>
            <span>{activeChapterMeta.subtitle}</span>
          </div>
          <span className="tabular-nums font-bold">
            {formatNumber(visibleItems.length)} مادة في هذا الباب
          </span>
        </div>
      )}

      {/* Dhikr Cards Grid */}
      {visibleItems.length === 0 ? (
        <ComingSoonState
          badgeText={trimmedQuery ? tr('بحث الأذكار', 'Adhkar Search') : tr('قريباً', 'Coming Soon')}
          title={
            trimmedQuery
              ? tr('لا توجد أذكار أو أدعية مطابقة لعبارة البحث الحالية', 'No Adhkar match your search')
              : tr('لا توجد مواد إضافية في هذا الباب حالياً — قريباً بإذن الله', 'Coming Soon InshaAllah')
          }
          actionLabel={trimmedQuery ? tr('عرض الأبواب الثمانية كاملة', 'Show All 8 Chapters') : undefined}
          onAction={trimmedQuery ? () => setQuery('') : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {visibleItems.map((item, idx) => {
            const count = state.counts[item.id] || 0;
            const remaining = Math.max(0, item.targetCount - count);
            const isDone = count >= item.targetCount;
            const pct = Math.min(100, Math.round((count / item.targetCount) * 100));

            return (
              <article
                key={item.id}
                className={`rounded-2xl border p-5 card-3d space-y-4 transition-colors ${
                  isDone
                    ? 'bg-[#eefaf3] dark:bg-[#0c271c] border-[#006a46]/40 dark:border-[#6cdba6]/30'
                    : 'bg-white dark:bg-[#0d211a] border-slate-200/80 dark:border-white/10'
                }`}
              >
                <div className="flex items-start justify-between gap-2 text-xs text-[#6e7a71] dark:text-slate-400">
                  <div className="space-y-0.5 min-w-0">
                    <span className="font-semibold text-[#006a46] dark:text-[#6cdba6] tabular-nums block">
                      {tr(`الذكر ${formatNumber(idx + 1)}`, `Item ${formatNumber(idx + 1)}`)} · {item.source}
                    </span>
                    {item.title && (
                      <h3 className="text-sm sm:text-base font-extrabold text-[#0e1d25] dark:text-white">
                        {item.title}
                      </h3>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => void copyDhikr(item)}
                      aria-label={tr('نسخ الذكر', 'Copy Dhikr')}
                      className="min-w-[38px] min-h-[38px] rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    {onShareCard && (
                      <button
                        type="button"
                        onClick={() =>
                          exportItemCard(
                            item.title || activeChapterMeta.label,
                            item.text,
                            item.source,
                            'الأذكار والأدعية الجامعة',
                            item.id,
                          )
                        }
                        aria-label={tr('تصدير بطاقة', 'Export PNG Card')}
                        className="min-w-[38px] min-h-[38px] rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 text-[#7c5800] dark:text-[#f2be5e] transition-colors"
                      >
                        <Sparkles className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setState((prev) => ({...prev, counts: {...prev.counts, [item.id]: 0}}))
                      }
                      aria-label={tr('تصفير عداد هذا الذكر', 'Reset item counter')}
                      title={tr('إعادة تصفير العداد', 'Reset counter')}
                      className="min-w-[38px] min-h-[38px] rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p
                  dir="rtl"
                  className={`${fontSpec.bodyClass} font-semibold text-[#0e1d25] dark:text-[#e3f3fe]`}
                  style={{fontFamily: readingFontCss}}
                >
                  {item.text}
                </p>

                {item.fadl && (
                  <p dir="rtl" className="text-xs sm:text-sm text-[#3e4a42] dark:text-slate-300 leading-relaxed">
                    <span className="font-bold text-[#7c5800] dark:text-[#f2be5e]">{tr('الفضل: ', 'Virtue: ')}</span>
                    {item.fadl}
                  </p>
                )}

                <div className="h-1.5 w-full rounded-full bg-[#e0f0fb] dark:bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-200 ${
                      isDone ? 'bg-[#006a46] dark:bg-[#6cdba6]' : 'bg-[#008559]'
                    }`}
                    style={{width: `${pct}%`}}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => incrementItem(item)}
                  className={`w-full min-h-[54px] rounded-xl px-4 py-3 font-bold flex items-center justify-between gap-3 transition-all active:scale-[0.99] ${
                    isDone
                      ? 'bg-[#006a46] text-white'
                      : 'bg-[#e8f6ff] hover:bg-[#d5ecfb] dark:bg-[#133126] dark:hover:bg-[#183d30] text-[#006a46] dark:text-[#6cdba6]'
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm">
                    {isDone ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        <span>{tr('تم إكمال الذكر بحمد الله', 'Completed')}</span>
                      </>
                    ) : (
                      <span>{tr('اضغط هنا للذكر والتسبيح (+١٠ حسنات فأكثر)', 'Tap to Count')}</span>
                    )}
                  </span>

                  <span className="text-xs sm:text-sm tabular-nums whitespace-nowrap shrink-0">
                    {isDone
                      ? tr(
                          `تم الضغط: ${formatNumber(count)} / ${formatNumber(item.targetCount)}`,
                          `Count: ${formatNumber(count)} / ${formatNumber(item.targetCount)}`,
                        )
                      : tr(
                          `ضغطت ${formatNumber(count)} · المتبقي ${formatNumber(remaining)} من ${formatNumber(item.targetCount)}`,
                          `${formatNumber(count)} · ${formatNumber(remaining)} left of ${formatNumber(item.targetCount)}`,
                        )}
                  </span>
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
