import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookOpen,
  Bot,
  CheckCircle2,
  Copy,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  Heart,
  MessageCircle,
  Send,
  Share2,
  Sparkles,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import {useMemo, useState, type FormEvent} from 'react';
import {createDefaultTrend} from '../data/seed';
import type {Post, SiteConfig} from '../types';
import {useI18n} from '../utils/i18n';
import {resolveFontFamilyCss, resolveFontSizeSpec, useReadingPrefs} from '../utils/readingPrefs';
import {parseSearchKeywords} from '../utils/search';
import {FloatingReadingBar} from './FloatingReadingBar';
import {HighlightText} from './HighlightText';
import {ReadingControlsBar} from './ReadingControlsBar';

export function PostDetailView({
  post,
  siteConfig,
  isBookmarked,
  isLiked,
  isAdmin = false,
  highlightQuery = '',
  onClearHighlight,
  onBack,
  onToggleBookmark,
  onToggleLike,
  onAddComment,
  onCopySada,
  onShareCard,
  onAdminEditPost,
  onAdminToggleHidePost,
  onAdminDeletePost,
  onAdminAutoPost,
  onAdminUpdateComment,
  onAdminToggleHideComment,
  onAdminDeleteComment,
  onNotify,
}: {
  post: Post;
  siteConfig: SiteConfig;
  isBookmarked: boolean;
  isLiked: boolean;
  isAdmin?: boolean;
  highlightQuery?: string;
  onClearHighlight?: () => void;
  onBack: () => void;
  onToggleBookmark: (id: string) => void;
  onToggleLike: (id: string) => void;
  onAddComment: (postId: string, author: string, text: string) => Promise<void>;
  onCopySada: (post: Post) => void;
  onShareCard: (post: Post) => void;
  onAdminEditPost?: (post: Post) => void;
  onAdminToggleHidePost?: (postId: string) => void;
  onAdminDeletePost?: (postId: string) => void;
  onAdminAutoPost?: (postId: string) => void;
  onAdminUpdateComment?: (postId: string, commentId: string, text: string) => Promise<void>;
  onAdminToggleHideComment?: (postId: string, commentId: string) => Promise<void>;
  onAdminDeleteComment?: (postId: string, commentId: string) => Promise<void>;
  onNotify: (msg: string) => void;
}) {
  const {tr, isEn, formatNumber} = useI18n();
  const highlightKeywords = useMemo(() => parseSearchKeywords(highlightQuery), [highlightQuery]);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [commentAuthor, setCommentAuthor] = useState('');
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [paperMode, setPaperMode] = useState(false);
  const {prefs: readingPrefs, updatePrefs: updateReadingPrefs} = useReadingPrefs();

  const effectiveFontSize = useMemo(() => {
    if (!paperMode) return readingPrefs.fontSize;
    if (readingPrefs.fontSize === 'sm' || readingPrefs.fontSize === 'md') return 'xl';
    return 'xxl';
  }, [paperMode, readingPrefs.fontSize]);

  const bodyFontSpec = resolveFontSizeSpec(effectiveFontSize);
  const activeFontCss = resolveFontFamilyCss(readingPrefs.fontFamily);
  const BackArrow = isEn ? ArrowLeft : ArrowRight;

  const rTheme = readingPrefs.readingTheme;
  const articleSurfaceClass = paperMode
    ? 'bg-[#fbf4e2] text-[#2b2113] border-[#e2d2af] shadow-md'
    : rTheme === 'dark'
      ? 'bg-[#071812] text-[#e6f5ee] border-emerald-900/60'
      : rTheme === 'light'
        ? 'bg-[#fffdf8] text-[#17241e] border-[#e7dec6]'
        : 'bg-white dark:bg-[#0d211a] text-[#0e1d25] dark:text-[#e3f3fe] border-slate-200/80 dark:border-white/10';

  const headingTextClass = paperMode
    ? 'text-[#23190c]'
    : rTheme === 'dark'
      ? 'text-[#f2fbf6]'
      : rTheme === 'light'
        ? 'text-[#0e1d25]'
        : 'text-[#0e1d25] dark:text-white';

  const bodyTextClass = paperMode
    ? 'text-[#2e2314]'
    : rTheme === 'dark'
      ? 'text-[#dceee5]'
      : rTheme === 'light'
        ? 'text-[#1e2d25]'
        : 'text-[#1e2d25] dark:text-slate-200';

  const subCardClass = paperMode
    ? 'bg-[#f2e7cc] text-[#2b2113] border border-[#dfd0ad]'
    : rTheme === 'dark'
      ? 'bg-[#0d241c] text-[#e6f5ee]'
      : rTheme === 'light'
        ? 'bg-[#f4efe1] text-[#1b241f]'
        : 'bg-[#e8f6ff] dark:bg-[#112921] text-[#0e1d25] dark:text-white';

  const togglePaperMode = () => {
    setPaperMode((prev) => {
      const next = !prev;
      onNotify(
        next
          ? tr('تم تفعيل وضع القراءة الورقي وتكبير الخط لراحة العين', 'Paper Reading Mode enabled with larger eye-comfort text')
          : tr('تم إيقاف وضع القراءة الورقي', 'Paper Reading Mode turned off'),
      );
      return next;
    });
  };

  const trend = useMemo(() => {
    if (Array.isArray(post.listeningTrend) && post.listeningTrend.length > 0) {
      return post.listeningTrend;
    }
    return createDefaultTrend(0);
  }, [post.listeningTrend]);

  const weeklyTotal = useMemo(() => trend.reduce((sum, item) => sum + item.listens, 0), [trend]);
  const todayListens = trend[trend.length - 1]?.listens || 0;

  const submitComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      await onAddComment(
        post.id,
        commentAuthor.trim() || tr('زائر كريم', 'Guest'),
        commentText.trim(),
      );
      setCommentText('');
    } finally {
      setSubmittingComment(false);
    }
  };

  const chartPoints = useMemo(() => {
    const width = 560;
    const height = 120;
    const padX = 24;
    const padY = 14;
    const maxVal = Math.max(...trend.map((d) => d.listens), 1);
    const minVal = Math.min(...trend.map((d) => d.listens), 0);
    const range = Math.max(1, maxVal - minVal);
    return trend.map((item, idx) => {
      const x = padX + (idx / Math.max(1, trend.length - 1)) * (width - padX * 2);
      const y = height - padY - ((item.listens - minVal) / range) * (height - padY * 2);
      return {...item, x, y};
    });
  }, [trend]);

  const linePath = useMemo(() => {
    if (chartPoints.length === 0) return '';
    return chartPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }, [chartPoints]);

  const areaPath = useMemo(() => {
    if (chartPoints.length === 0) return '';
    const first = chartPoints[0];
    const last = chartPoints[chartPoints.length - 1];
    return `${linePath} L ${last.x} 120 L ${first.x} 120 Z`;
  }, [chartPoints, linePath]);

  const handleShareText = async () => {
    const full = `${post.title}\n\n${post.body}\n\n— ${post.author} · ${tr('تطبيق مواعظ وعبر', 'Mawaedh & Ibar')}`;
    if (navigator.share) {
      try {
        await navigator.share({title: post.title, text: full});
        return;
      } catch {
        // Ignore
      }
    }
    try {
      await navigator.clipboard.writeText(full);
      onNotify(tr('تم نسخ نص الموعظة بالكامل للمشاركة', 'Full reflection text copied for sharing'));
    } catch {
      onNotify(tr('تم تجهيز الموعظة للمشاركة', 'Reflection ready to share'));
    }
  };

  return (
    <div
      className={`space-y-5 pb-24 max-w-3xl mx-auto transition-colors duration-300 ${
        paperMode ? 'rounded-3xl bg-[#f5ecd7] p-3 sm:p-5 border border-[#e5d6b5]' : ''
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-white dark:bg-[#0d211a] border border-slate-200 dark:border-white/10 text-sm font-semibold flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
        >
          <BackArrow className="w-4 h-4" />
          <span>{tr('العودة', 'Back')}</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={togglePaperMode}
            aria-pressed={paperMode}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors ${
              paperMode
                ? 'bg-[#7c5800] border-[#7c5800] text-white shadow-xs'
                : 'bg-[#fffbf2] dark:bg-[#1a2921] border-[#f2be5e]/60 text-[#7c5800] dark:text-[#ffdea8] hover:bg-[#ffdea8]/60'
            }`}
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <span>{paperMode ? tr('وضع القراءة: مفعّل', 'Reading Mode: On') : tr('وضع القراءة', 'Reading Mode')}</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleBookmark(post.id)}
            aria-label={tr('حفظ الموعظة', 'Bookmark post')}
            className={`min-w-[44px] min-h-[44px] rounded-xl border border-slate-200 dark:border-white/10 flex items-center justify-center ${
              isBookmarked
                ? 'bg-[#ffdea8] text-[#271900]'
                : 'bg-white dark:bg-[#0d211a] text-[#3e4a42] dark:text-slate-200'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => onShareCard(post)}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#006a46] text-white text-sm font-semibold flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>{tr('تصدير بطاقة', 'Export Card')}</span>
          </button>
        </div>
      </div>

      {isAdmin && (
        <div className="rounded-2xl border border-amber-500/35 bg-[#fffbf2] dark:bg-[#171d18] px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-extrabold text-amber-800 dark:text-amber-300">
            شريط تحكم المشرف {post.hidden ? '· (هذا المنشور مخفي عن الزوار حالياً)' : ''}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {onAdminAutoPost && (
              <button
                type="button"
                onClick={() => onAdminAutoPost(post.id)}
                className="min-h-[36px] px-3 py-1.5 rounded-xl bg-[#006a46] hover:bg-[#005235] text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>🤖 نشر آلي الآن</span>
              </button>
            )}
            {onAdminEditPost && (
              <button
                type="button"
                onClick={() => onAdminEditPost(post)}
                className="min-h-[36px] px-3 py-1.5 rounded-xl bg-sky-100 dark:bg-sky-900/40 text-sky-900 dark:text-sky-200 text-xs font-bold flex items-center gap-1"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>تعديل</span>
              </button>
            )}
            {onAdminToggleHidePost && (
              <button
                type="button"
                onClick={() => onAdminToggleHidePost(post.id)}
                className="min-h-[36px] px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center gap-1"
              >
                {post.hidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>{post.hidden ? 'إظهار' : 'إخفاء'}</span>
              </button>
            )}
            {onAdminDeletePost && (
              <button
                type="button"
                onClick={() => onAdminDeletePost(post.id)}
                className="min-h-[36px] px-3 py-1.5 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-200 text-xs font-bold flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف</span>
              </button>
            )}
          </div>
        </div>
      )}

      <article className={`rounded-3xl border p-6 sm:p-8 shadow-sm space-y-6 transition-colors ${articleSurfaceClass}`}>
        <div className="space-y-3" dir="rtl">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#6e7a71] dark:text-slate-400">
            <span className="text-[#006a46] dark:text-[#6cdba6] font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>{post.sourceLabel}</span>
            </span>
            <span aria-hidden="true">·</span>
            <span>{post.category}</span>
            <span aria-hidden="true">·</span>
            <span>{post.publishedAtLabel}</span>
          </div>
          <h1 className={`text-xl sm:text-2xl font-bold leading-relaxed ${headingTextClass}`}>
            <HighlightText text={post.title} keywords={highlightKeywords} />
          </h1>
          <p className="text-sm font-semibold text-[#7c5800] dark:text-[#f2be5e]">{post.author}</p>
          {highlightKeywords.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#fffbf2] dark:bg-[#13221c] border border-[#f2be5e]/45 px-3 py-2 text-xs">
              <span className="font-semibold text-[#7c5800] dark:text-[#ffdea8]">
                {tr(
                  `تسليط الضوء مفعّل لنتائج البحث عن: «${highlightQuery.trim()}»`,
                  `Highlighting search matches for: "${highlightQuery.trim()}"`,
                )}
              </span>
              {onClearHighlight && (
                <button
                  type="button"
                  onClick={onClearHighlight}
                  className="font-bold text-[#006a46] dark:text-[#6cdba6] hover:underline"
                >
                  {tr('إلغاء التظليل', 'Clear Highlight')}
                </button>
              )}
            </div>
          )}
        </div>

        <div className={`rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 ${subCardClass}`}>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onCopySada(post)}
              className="icon-3d w-11 h-11 rounded-xl bg-[#006a46] hover:bg-[#005235] text-white flex items-center justify-center shrink-0 transition-colors"
            >
              <Copy className="w-5 h-5" />
            </button>
            <div>
              <p className={`text-sm font-bold ${headingTextClass}`}>
                {tr('نشر عبر خدمة صدى الخير الدعوية', 'Share via Sada Al-Khair Service')}
              </p>
              <p className="text-xs opacity-75">
                {tr(
                  'نسخ الرسالة بصياغة منسقة وجاهزة لمجموعات الواتساب وتيليجرام',
                  'Copy formatted message ready for WhatsApp & Telegram groups',
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onCopySada(post)}
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#006a46] hover:bg-[#005235] text-white text-xs font-bold flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{tr(siteConfig.sadaBroadcastBtn, 'Copy Formatted')}</span>
            </button>
            {post.youtubeUrl && (
              <a
                href={post.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-white dark:bg-white/10 text-xs font-semibold flex items-center gap-1.5"
              >
                <span>{tr('مشاهدة على يوتيوب', 'Watch on YouTube')}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        <ReadingControlsBar
          compact
          fontSize={readingPrefs.fontSize}
          fontFamily={readingPrefs.fontFamily}
          onChangeFontSize={(fontSize) => updateReadingPrefs({fontSize})}
          onChangeFontFamily={(fontFamily) => updateReadingPrefs({fontFamily})}
          title={tr('تخصيص حجم ونوع خط الموعظة لجميع الأعمار', 'Customize Text Size & Font')}
        />

        <div
          dir="rtl"
          className={`whitespace-pre-line ${bodyTextClass} ${bodyFontSpec.bodyClass} ${
            paperMode ? 'leading-[2.25] tracking-normal' : ''
          }`}
          style={{fontFamily: activeFontCss}}
        >
          <HighlightText text={post.body} keywords={highlightKeywords} />
        </div>

        {/* 7-Day Reading & Reach Trend Chart */}
        <section
          aria-label={tr('مؤشر القراءة والانتشار خلال آخر ٧ أيام', '7-day reading & reach trend')}
          className="rounded-2xl bg-[#f4faff] dark:bg-[#081712] border border-slate-200/80 dark:border-white/10 p-4 sm:p-5 space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#006a46] dark:text-[#6cdba6]" />
              <h2 className="text-sm font-bold text-[#0e1d25] dark:text-white">
                {tr('مؤشر القراءة والانتشار خلال آخر ٧ أيام', '7-Day Reading & Reach Trend')}
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#6e7a71] dark:text-slate-400 tabular-nums">
              <span>{tr('إجمالي الأسبوع:', 'Weekly total:')} {formatNumber(weeklyTotal)}</span>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-[#006a46] dark:text-[#6cdba6]">
                {tr('اليوم:', 'Today:')} {formatNumber(todayListens)}
              </span>
            </div>
          </div>

          <div className="relative" dir="ltr">
            <svg viewBox="0 0 560 142" className="w-full h-36 overflow-visible">
              <defs>
                <linearGradient id="listeningTrendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#008559" stopOpacity="0.32" />
                  <stop offset="95%" stopColor="#008559" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <path d={areaPath} fill="url(#listeningTrendFill)" />
              <path d={linePath} fill="none" stroke="#008559" strokeWidth="2.4" strokeLinejoin="round" />
              {chartPoints.map((pt, idx) => (
                <g key={pt.day}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredIdx === idx ? 5.5 : 3.5}
                    fill={hoveredIdx === idx ? '#ffc968' : '#006a46'}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    className="cursor-pointer transition-all"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  />
                  <text
                    x={pt.x}
                    y={136}
                    textAnchor="middle"
                    fontSize="11"
                    fill="#6e7a71"
                    fontFamily="IBM Plex Sans Arabic, sans-serif"
                  >
                    {pt.day}
                  </text>
                </g>
              ))}
            </svg>
            {hoveredIdx !== null && chartPoints[hoveredIdx] && (
              <div
                dir={isEn ? 'ltr' : 'rtl'}
                className="mt-1 text-center text-xs font-semibold text-[#006a46] dark:text-[#6cdba6] tabular-nums"
              >
                {chartPoints[hoveredIdx].day}: {formatNumber(chartPoints[hoveredIdx].listens)}{' '}
                {tr('قراءة ونشر', 'reads & shares')}
              </div>
            )}
          </div>
        </section>

        <div className="pt-4 border-t border-slate-100 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onToggleLike(post.id)}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors ${
              isLiked
                ? 'bg-[#ffdad6]/50 text-[#ba1a1a]'
                : 'bg-[#e8f6ff] dark:bg-white/10 text-[#0e1d25] dark:text-white'
            }`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            <span className="tabular-nums">
              {tr('إعجاب', 'Like')} ({formatNumber(post.likes)})
            </span>
          </button>

          <button
            type="button"
            onClick={() => void handleShareText()}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#ffdea8] hover:bg-[#ffc968] text-[#271900] text-sm font-bold flex items-center gap-2 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span>{tr('نسخ ومشاركة النص', 'Copy & Share Text')}</span>
          </button>
        </div>
      </article>

      {/* Real Visitor Comments Section */}
      <section className="card-3d rounded-3xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-[#006a46] dark:text-[#6cdba6]" />
            <h2 className="text-base font-bold text-[#0e1d25] dark:text-white">
              {tr('التعليقات والفوائد', 'Reflections & Comments')}
            </h2>
          </div>
          <span className="text-xs font-semibold text-[#6e7a71] dark:text-slate-400 tabular-nums">
            {formatNumber(post.comments?.length ?? post.commentsCount)} {tr('تعليق', 'comments')}
          </span>
        </div>

        <form onSubmit={(e) => void submitComment(e)} className="space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <input
              type="text"
              value={commentAuthor}
              onChange={(e) => setCommentAuthor(e.target.value)}
              placeholder={tr('الاسم (اختياري)', 'Name (optional)')}
              className="min-h-[44px] rounded-xl bg-[#e8f6ff] dark:bg-[#112921] px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#006a46]"
            />
            <input
              type="text"
              required
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={tr('أضف تعليقاً أو دعوة صالحة أو فائدة...', 'Write a kind comment or reflection...')}
              className="sm:col-span-2 min-h-[44px] rounded-xl bg-[#e8f6ff] dark:bg-[#112921] px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#006a46]"
            />
          </div>
          <button
            type="submit"
            disabled={submittingComment}
            className="min-h-[44px] px-5 py-2 rounded-xl bg-[#006a46] hover:bg-[#005235] disabled:opacity-60 text-white text-xs font-bold flex items-center gap-2 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{submittingComment ? tr('جاري النشر...', 'Posting...') : tr('إرسال التعليق', 'Post Comment')}</span>
          </button>
        </form>

        {!post.comments || post.comments.length === 0 ? (
          <p className="text-xs text-[#6e7a71] dark:text-slate-400 py-2">
            {tr(
              'لا توجد تعليقات حتى الآن — كن أول من يشارك تعليقاً نافعاً أو دعوة طيبة.',
              'No comments yet — be the first to share a reflection.',
            )}
          </p>
        ) : (
          <div className="space-y-2.5">
            {post.comments.map((c) => {
              const isEditingThis = editingCommentId === c.id;
              return (
                <div
                  key={c.id}
                  className={`rounded-xl border p-3.5 space-y-2 ${
                    c.hidden
                      ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-400/40'
                      : 'bg-[#f4faff] dark:bg-[#112921] border-slate-200/70 dark:border-white/10'
                  }`}
                >
                  {isAdmin && (
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-slate-200/70 dark:border-white/10 text-[11px]">
                      <span className="font-bold text-amber-700 dark:text-amber-300">
                        إدارة التعليق {c.hidden ? '· (مخفي عن الزوار)' : ''}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {onAdminUpdateComment && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCommentId(c.id);
                              setEditingCommentText(c.text);
                            }}
                            className="px-2 py-1 rounded-lg bg-sky-100 dark:bg-sky-900/40 text-sky-900 dark:text-sky-200 font-bold"
                          >
                            تعديل
                          </button>
                        )}
                        {onAdminToggleHideComment && (
                          <button
                            type="button"
                            onClick={() => void onAdminToggleHideComment(post.id, c.id)}
                            className="px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 font-bold"
                          >
                            {c.hidden ? 'إظهار' : 'إخفاء'}
                          </button>
                        )}
                        {onAdminDeleteComment && (
                          <button
                            type="button"
                            onClick={() => void onAdminDeleteComment(post.id, c.id)}
                            className="px-2 py-1 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-200 font-bold"
                          >
                            حذف
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-[#006a46] dark:text-[#6cdba6]">{c.author}</span>
                    <span className="text-[11px] text-[#6e7a71] dark:text-slate-400">
                      {new Date(c.createdAt).toLocaleDateString(isEn ? 'en-US' : 'ar-EG')}
                    </span>
                  </div>

                  {isEditingThis && onAdminUpdateComment ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editingCommentText}
                        onChange={(e) => setEditingCommentText(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-[#081712] px-3 py-1.5 text-sm"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            await onAdminUpdateComment(post.id, c.id, editingCommentText);
                            setEditingCommentId(null);
                          }}
                          className="px-3 py-1 rounded-lg bg-[#006a46] text-white text-xs font-bold"
                        >
                          حفظ التعديل
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCommentId(null)}
                          className="px-3 py-1 rounded-lg bg-slate-200 dark:bg-white/10 text-xs font-bold"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-[#0e1d25] dark:text-slate-200 leading-relaxed">{c.text}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <FloatingReadingBar
        fontSize={readingPrefs.fontSize}
        fontFamily={readingPrefs.fontFamily}
        readingTheme={readingPrefs.readingTheme}
        onChangeFontSize={(fontSize) => updateReadingPrefs({fontSize})}
        onChangeFontFamily={(fontFamily) => updateReadingPrefs({fontFamily})}
        onChangeReadingTheme={(readingTheme) => updateReadingPrefs({readingTheme})}
        contextLabel={tr('شريط التحكم لقراءة الموعظة', 'Reading Controls')}
      />
    </div>
  );
}

