import {Bookmark, BookOpen, Copy, ExternalLink, Scale, Sparkles, Star, Trash2} from 'lucide-react';
import {useState} from 'react';
import type {FatwaItem, Post, SavedArchiveFatwa, SiteConfig} from '../types';
import {useI18n} from '../utils/i18n';

export function BookmarksView({
  posts,
  fatawa = [],
  siteConfig,
  bookmarkedIds,
  bookmarkedFatwaIds = [],
  savedArchiveFatawa = [],
  onToggleBookmark,
  onToggleFatwaBookmark,
  onToggleArchiveFatwaBookmark,
  onOpenPost,
  onCopySada,
  onShareCard,
  onBrowseHome,
  onBrowseFatawa,
  onNotify,
}: {
  posts: Post[];
  fatawa?: FatwaItem[];
  siteConfig: SiteConfig;
  bookmarkedIds: string[];
  bookmarkedFatwaIds?: string[];
  savedArchiveFatawa?: SavedArchiveFatwa[];
  onToggleBookmark: (id: string) => void;
  onToggleFatwaBookmark?: (id: string) => void;
  onToggleArchiveFatwaBookmark?: (item: SavedArchiveFatwa) => void;
  onOpenPost: (id: string) => void;
  onCopySada: (post: Post) => void;
  onShareCard: (post: Post) => void;
  onBrowseHome: () => void;
  onBrowseFatawa?: () => void;
  onNotify?: (msg: string) => void;
}) {
  const {isEn, tr, formatNumber} = useI18n();
  const [filterKind, setFilterKind] = useState<'all' | 'posts' | 'fatawa'>('all');
  const [expandedFatwaIds, setExpandedFatwaIds] = useState<string[]>([]);

  const savedPosts = posts.filter((p) => bookmarkedIds.includes(p.id));
  const savedFatawa = fatawa.filter((f) => bookmarkedFatwaIds.includes(f.id));
  const totalFatawaCount = savedFatawa.length + savedArchiveFatawa.length;
  const totalSaved = savedPosts.length + totalFatawaCount;

  const toggleExpandFatwa = (id: string) => {
    setExpandedFatwaIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const copyFatwa = async (item: FatwaItem) => {
    const formatted = `⚖️ *فتوى شرعية · ${item.scholarName}*\n\n❓ *السؤال:* ${item.question}\n\n✅ *الجواب:* ${item.answer}\n\n📚 المصدر: ${item.source}\n— ${siteConfig.appName}`;
    try {
      await navigator.clipboard.writeText(formatted);
      onNotify?.(tr('تم نسخ الفتوى منسقةً وجاهزة للنشر', 'Fatwa copied cleanly for sharing'));
    } catch {
      onNotify?.(tr('تم تجهيز الفتوى للمشاركة', 'Fatwa ready to share'));
    }
  };

  const copyArchiveFatwa = async (item: SavedArchiveFatwa) => {
    const formatted = `⚖️ *${item.question || item.title}*\n${item.answer ? `\n${item.answer}\n` : ''}\n📚 المصدر: ${item.siteName}\n🔗 ${item.url}\n— ${siteConfig.appName}`;
    try {
      await navigator.clipboard.writeText(formatted);
      onNotify?.(tr('تم نسخ الفتوى منسقةً وجاهزة للنشر', 'Fatwa copied cleanly for sharing'));
    } catch {
      onNotify?.(tr('تم تجهيز الفتوى للمشاركة', 'Fatwa ready to share'));
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <section className="rounded-2xl bg-gradient-to-br from-[#7c5800] via-[#9c7000] to-[#006a46] p-6 text-white shadow-md flex items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-[#ffdea8]">
            {tr('خزانتك الإيمانية الخاصة', 'Your Personal Spiritual Vault')}
          </span>
          <h1 className="text-2xl font-bold mt-1">
            {tr(`${siteConfig.navBookmarks} والمفضلة`, 'Saved & Bookmarks')}
          </h1>
          <p className="text-sm text-white/90 mt-1">
            {tr(
              'مربع واحد يجمع كل المواعظ والقصص والفتاوى المفضلة والمحفوظة للرجوع السريع في أي وقت حتى دون إنترنت',
              'One unified box for all saved reflections, stories, and favorited fatawa anytime, even completely offline',
            )}
          </p>
        </div>
        <div className="text-center bg-white/15 backdrop-blur-md px-4 py-2.5 rounded-xl shrink-0">
          <span className="text-xl font-bold tabular-nums block">{formatNumber(totalSaved)}</span>
          <span className="text-xs">{tr('مادة محفوظة', 'saved items')}</span>
        </div>
      </section>

      {/* Single Unified Bookmarks Box */}
      <section className="rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 space-y-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-white/10 pb-3.5">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-[#7c5800] dark:text-[#f2be5e]" />
            <h2 className="text-base font-bold text-[#0e1d25] dark:text-white">
              {tr('صندوق المحفوظات الموحد', 'Unified Saved Box')} ({formatNumber(totalSaved)})
            </h2>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {(
              [
                {id: 'all', label: tr(`الكل (${formatNumber(totalSaved)})`, `All (${formatNumber(totalSaved)})`)},
                {
                  id: 'posts',
                  label: tr(`المواعظ والقصص (${formatNumber(savedPosts.length)})`, `Sermons (${formatNumber(savedPosts.length)})`),
                },
                {
                  id: 'fatawa',
                  label: tr(`الفتاوى المفضلة (${formatNumber(totalFatawaCount)})`, `Favorited Fatawa (${formatNumber(totalFatawaCount)})`),
                },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setFilterKind(t.id)}
                className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                  filterKind === t.id
                    ? 'bg-[#006a46] text-white'
                    : 'bg-[#e8f6ff] dark:bg-[#112921] text-[#3e4a42] dark:text-slate-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {totalSaved === 0 ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#fffbf2] dark:bg-[#171d18] text-[#7c5800] dark:text-[#f2be5e] flex items-center justify-center mx-auto icon-3d">
              <Bookmark className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#0e1d25] dark:text-white">
                {tr('لا توجد مواد محفوظة بعد', 'No saved items yet')}
              </h3>
              <p className="text-sm text-[#6e7a71] dark:text-slate-400">
                {tr(
                  'اضغط على زر الحفظ في أي موعظة أو قصة أو زر «تمييز كمفضلة وحفظ» في صفحة الفتاوى لإضافتها داخل هذا المربع.',
                  'Tap bookmark on any sermon/story or «Favorite & Save» in Fatawa to save it inside this box.',
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={onBrowseHome}
                className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#006a46] hover:bg-[#005235] text-white text-sm font-bold transition-colors"
              >
                {tr('استكشاف المواعظ', 'Browse Reflections')}
              </button>
              {onBrowseFatawa && (
                <button
                  type="button"
                  onClick={onBrowseFatawa}
                  className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#ffdea8] hover:bg-[#ffc968] text-[#271900] text-sm font-bold transition-colors"
                >
                  {tr('استكشاف الفتاوى', 'Browse Fatawa')}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(filterKind === 'all' || filterKind === 'fatawa') &&
              savedFatawa.map((item) => {
                const isExpanded = expandedFatwaIds.includes(item.id);
                return (
                  <article
                    key={`ft_${item.id}`}
                    className="rounded-2xl bg-[#f4faff] dark:bg-[#112921] border border-[#006a46]/30 dark:border-[#6cdba6]/20 p-4 flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[#006a46] dark:text-[#6cdba6] flex items-center gap-1.5">
                          <Scale className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {item.scholarName} · {item.category}
                          </span>
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-[#ffc968]/40 text-[#7c5800] dark:text-[#ffdea8] text-[11px] font-bold flex items-center gap-1">
                          <Star className="w-3 h-3 fill-current" />
                          <span>{tr('فتوى مفضلة', 'Favorited')}</span>
                        </span>
                      </div>
                      <h3 dir="rtl" className="text-sm sm:text-base font-bold text-[#0e1d25] dark:text-white leading-relaxed">
                        {item.question}
                      </h3>
                      <p
                        dir="rtl"
                        className={`text-xs sm:text-sm text-[#3e4a42] dark:text-slate-300 leading-relaxed ${
                          isExpanded ? 'whitespace-pre-line' : 'line-clamp-3'
                        }`}
                      >
                        {item.answer}
                      </p>
                      <button
                        type="button"
                        onClick={() => toggleExpandFatwa(item.id)}
                        className="text-xs font-bold text-[#006a46] dark:text-[#6cdba6] hover:underline flex items-center gap-1"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>{isExpanded ? tr('طيّ الجواب', 'Show Less') : tr('قراءة الجواب كاملاً', 'Read Full Answer')}</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200/70 dark:border-white/10">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void copyFatwa(item)}
                          className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white dark:bg-[#0d211a] text-[#006a46] dark:text-[#6cdba6] text-xs font-bold flex items-center gap-1.5"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>{tr('نسخ للنشر', 'Copy')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
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
                            })
                          }
                          className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#fffbf2] dark:bg-white/10 text-[#7c5800] dark:text-[#f2be5e] text-xs font-bold flex items-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{isEn ? 'PNG Card' : siteConfig.exportCardBtn}</span>
                        </button>
                      </div>

                      {onToggleFatwaBookmark && (
                        <button
                          type="button"
                          onClick={() => onToggleFatwaBookmark(item.id)}
                          aria-label={tr('إلغاء حفظ الفتوى من المحفوظات', 'Unsave Fatwa Bookmark')}
                          className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#ffdad6]/50 dark:bg-[#93000a]/30 text-[#ba1a1a] dark:text-[#ffb4ab] hover:bg-[#ffdad6] text-xs font-bold flex items-center gap-1.5 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{tr('إلغاء الحفظ', 'Unsave')}</span>
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}

            {(filterKind === 'all' || filterKind === 'fatawa') &&
              savedArchiveFatawa.map((item) => {
                const isExpanded = expandedFatwaIds.includes(`arch_${item.id}`);
                return (
                  <article
                    key={`ft_arch_${item.id}`}
                    className="rounded-2xl bg-[#f4faff] dark:bg-[#112921] border border-[#006389]/30 dark:border-[#80cfff]/20 p-4 flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[#006389] dark:text-[#80cfff] flex items-center gap-1.5">
                          <Scale className="w-3.5 h-3.5 shrink-0" />
                          <span>{item.siteName}</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-[#ffc968]/40 text-[#7c5800] dark:text-[#ffdea8] text-[11px] font-bold flex items-center gap-1">
                          <Star className="w-3 h-3 fill-current" />
                          <span>{tr('فتوى أرشيف مفضلة', 'Archive Favorite')}</span>
                        </span>
                      </div>
                      <h3 dir="rtl" className="text-sm sm:text-base font-bold text-[#0e1d25] dark:text-white leading-relaxed">
                        {item.question || item.title}
                      </h3>
                      {item.answer && (
                        <>
                          <p
                            dir="rtl"
                            className={`text-xs sm:text-sm text-[#3e4a42] dark:text-slate-300 leading-relaxed ${
                              isExpanded ? 'whitespace-pre-line' : 'line-clamp-3'
                            }`}
                          >
                            {item.answer}
                          </p>
                          <button
                            type="button"
                            onClick={() => toggleExpandFatwa(`arch_${item.id}`)}
                            className="text-xs font-bold text-[#006a46] dark:text-[#6cdba6] hover:underline flex items-center gap-1"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>{isExpanded ? tr('طيّ الجواب', 'Show Less') : tr('قراءة الجواب كاملاً', 'Read Full Answer')}</span>
                          </button>
                        </>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200/70 dark:border-white/10">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void copyArchiveFatwa(item)}
                          className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white dark:bg-[#0d211a] text-[#006a46] dark:text-[#6cdba6] text-xs font-bold flex items-center gap-1.5"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>{tr('نسخ للنشر', 'Copy')}</span>
                        </button>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#fffbf2] dark:bg-white/10 text-[#7c5800] dark:text-[#f2be5e] text-xs font-bold flex items-center gap-1.5"
                        >
                          <span>{tr('المصدر الأصلي', 'Source')}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>

                      {onToggleArchiveFatwaBookmark && (
                        <button
                          type="button"
                          onClick={() => onToggleArchiveFatwaBookmark(item)}
                          aria-label={tr('إلغاء حفظ الفتوى من المحفوظات', 'Unsave Archive Fatwa')}
                          className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#ffdad6]/50 dark:bg-[#93000a]/30 text-[#ba1a1a] dark:text-[#ffb4ab] hover:bg-[#ffdad6] text-xs font-bold flex items-center gap-1.5 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{tr('إلغاء الحفظ', 'Unsave')}</span>
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}

            {(filterKind === 'all' || filterKind === 'posts') &&
              savedPosts.map((post) => (
                <article
                  key={`post_${post.id}`}
                  className="rounded-2xl bg-[#fffbf2] dark:bg-[#13221c] border border-[#f2be5e]/35 dark:border-white/10 p-4 flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-[#7c5800] dark:text-[#f2be5e] flex items-center gap-1.5">
                      <Bookmark className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {post.category} · {post.author}
                      </span>
                    </span>
                    <button type="button" onClick={() => onOpenPost(post.id)} className="text-start block w-full">
                      <h3 dir="rtl" className="text-sm sm:text-base font-bold text-[#0e1d25] dark:text-white hover:text-[#006a46] transition-colors">
                        {post.title}
                      </h3>
                      <p dir="rtl" className="text-xs sm:text-sm text-[#3e4a42] dark:text-slate-300 mt-1 line-clamp-2">
                        {post.excerpt}
                      </p>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#f2be5e]/25 dark:border-white/10">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onCopySada(post)}
                        className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white dark:bg-[#0d211a] text-[#006a46] dark:text-[#6cdba6] text-xs font-bold flex items-center gap-1.5"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{isEn ? 'Copy for Sada' : siteConfig.sadaBroadcastBtn}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onShareCard(post)}
                        className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#ffdea8]/60 dark:bg-white/10 text-[#7c5800] dark:text-[#f2be5e] text-xs font-bold flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{isEn ? 'PNG Card' : siteConfig.exportCardBtn}</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleBookmark(post.id)}
                      aria-label={tr('إلغاء الحفظ من المحفوظات', 'Unsave Bookmark')}
                      className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#ffdad6]/50 dark:bg-[#93000a]/30 text-[#ba1a1a] dark:text-[#ffb4ab] hover:bg-[#ffdad6] text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{tr('إلغاء الحفظ', 'Unsave')}</span>
                    </button>
                  </div>
                </article>
              ))}
          </div>
        )}
      </section>
    </div>
  );
}
