import {BookMarked, BookOpen, Clock, Feather, FileText, Heart, Sparkles} from 'lucide-react';
import {useMemo, useState} from 'react';
import {MOTHER_OASIS_SIGNATURE} from '../data/seed';
import type {MotherOasisChapter, MotherOasisItem, NavTab} from '../types';
import {useI18n} from '../utils/i18n';
import {resolveFontFamilyCss, resolveFontSizeSpec, useReadingPrefs} from '../utils/readingPrefs';
import {ComingSoonState} from './ComingSoonState';

const MOTHER_CHAPTERS: Array<{
  id: 'all' | MotherOasisChapter;
  label: string;
  desc: string;
}> = [
  {id: 'all', label: 'جميع الأبواب', desc: 'عرض كافة المؤلفات والمحاضرات المفرغة والقصص'},
  {
    id: 'books',
    label: 'باب المؤلفات والكتب الدعوية والتربوية',
    desc: 'رسائل وكتب ومقالات تربوية وإيمانية محررة',
  },
  {
    id: 'lectures',
    label: 'باب المحاضرات والدروس المفرغة',
    desc: 'توجيهات ودروس مفرغة نصياً للقراءة والتأمل',
  },
  {
    id: 'stories',
    label: 'باب «قصص وعبر من واقع الحياة»',
    desc: 'مواقف وعبر تربوية صادقة من واقع الحياة',
  },
];

export function MotherOasisView({
  items,
  motherPrayersCount,
  hasPrayedForMother,
  onAmenMother,
  onNavigate,
  isAdmin = false,
  onAdminQuickAdd,
}: {
  items: MotherOasisItem[];
  motherPrayersCount: number;
  hasPrayedForMother: boolean;
  onAmenMother: () => void;
  onNavigate?: (tab: NavTab) => void;
  isAdmin?: boolean;
  onAdminQuickAdd?: () => void;
}) {
  const {formatNumber} = useI18n();
  const {prefs} = useReadingPrefs();
  const fontSpec = resolveFontSizeSpec(prefs.fontSize);
  const [chapter, setChapter] = useState<'all' | MotherOasisChapter>('all');

  const safeItems = useMemo(
    () => (Array.isArray(items) ? items.filter((it) => Boolean(it && typeof it === 'object')) : []),
    [items],
  );

  const filteredItems = useMemo(
    () => (chapter === 'all' ? safeItems : safeItems.filter((it) => it.chapter === chapter)),
    [chapter, safeItems],
  );

  const formatCreatedAt = (value?: string) => {
    try {
      const d = value ? new Date(value) : new Date();
      if (Number.isNaN(d.getTime())) return '';
      return d.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const chapterMeta = (ch: MotherOasisChapter) => {
    if (ch === 'books') return {label: 'المؤلفات والكتب الدعوية والتربوية', Icon: BookOpen};
    if (ch === 'lectures') return {label: 'المحاضرات والدروس المفرغة', Icon: FileText};
    return {label: 'قصص وعبر من واقع الحياة', Icon: BookMarked};
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Quiet Warm Introduction Card */}
      <section className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-[#fffaf2] via-[#fdfbf7] to-[#f4f7f5] dark:from-[#1b1710] dark:via-[#141916] dark:to-[#0c211a] p-6 sm:p-8 shadow-sm space-y-5">
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-extrabold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              <span>واحة دعوية وتربوية هادئة · محتوى نصي محرر فقط</span>
            </p>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-100/95 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 text-xs font-extrabold border border-amber-500/30">
              <Clock className="w-3.5 h-3.5" />
              <span>قريباً بإذن الله · تنزيل متتابع</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0e1d25] dark:text-white leading-snug">
            واحة الداعية الفاضلة أمي: أم محمد إكرام عبده علي
          </h1>
          <p className="text-sm sm:text-base text-[#3e4a42] dark:text-slate-300 max-w-3xl leading-relaxed">
            صفحة مخصصة هادئة ودافئة تجمع بفضل الله ما تيسّر من كتب ورسائل ومواعظ مفرغة وقصص وعبر تربوية بقلم الداعية الفاضلة أم محمد إكرام عبده علي حفظها الله، لتكون علماً نافعاً وأثراً طيباً باقياً.
          </p>
        </div>

        {/* Calm & Encouraging Coming-Soon Progress Banner */}
        <div className="rounded-2xl bg-white/85 dark:bg-[#0c1d17]/90 border border-amber-500/30 p-4 sm:p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-extrabold text-[#7c5800] dark:text-[#ffdea8]">
            <Clock className="w-4 h-4 shrink-0" />
            <span>قريباً جداً بإذن الله · العمل جارٍ على تطوير المحتوى</span>
          </div>
          <p className="text-xs sm:text-sm text-[#3e4a42] dark:text-slate-300 leading-relaxed">
            سيتم تنزيل القصص والمحاضرات والدروس والرسائل التربوية تباعاً في أبواب هذه الواحة المباركة قريباً جداً، والعمل جارٍ حالياً على تفريغ المواد وتنقيحها وتنسيقها؛ وندعو زوارنا الكرام إلى التحلي بالصبر والترقب، سائلين الله أن يكتب القبول والأجر.
          </p>
          <p className="text-xs font-extrabold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 pt-1">
            <Feather className="w-3.5 h-3.5 shrink-0" />
            <span>{MOTHER_OASIS_SIGNATURE}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-amber-500/20">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onAmenMother}
              className={`min-h-[42px] px-4 py-2 rounded-2xl font-extrabold text-xs sm:text-sm flex items-center gap-2 transition-colors ${
                hasPrayedForMother
                  ? 'bg-amber-600 text-white'
                  : 'bg-[#006a46] hover:bg-[#005235] text-white'
              }`}
            >
              <Heart className="w-4 h-4 fill-current" />
              <span>اللهم احفظها وبارك في عمرها (آمين)</span>
            </button>
            <span className="text-xs sm:text-sm font-bold text-[#6e7a71] dark:text-slate-300 tabular-nums">
              أمنَ {formatNumber(motherPrayersCount)} زائر
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && onAdminQuickAdd && (
              <button
                type="button"
                onClick={onAdminQuickAdd}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-[#006a46] hover:bg-[#005235] text-white text-xs font-extrabold transition-colors"
              >
                + إضافة مادة لواحة أمي
              </button>
            )}
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('adhkar')}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-amber-100 dark:bg-amber-900/35 text-amber-900 dark:text-amber-200 text-xs font-bold hover:brightness-95 transition-colors"
              >
                الانتقال إلى «وقفة بر ووفاء» في الأذكار ←
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Organized 3 Chapters Filter */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {MOTHER_CHAPTERS.map((ch) => {
          const active = chapter === ch.id;
          const count =
            ch.id === 'all' ? safeItems.length : safeItems.filter((it) => it.chapter === ch.id).length;
          return (
            <button
              key={ch.id}
              type="button"
              onClick={() => setChapter(ch.id)}
              className={`min-h-[42px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 flex items-center gap-2 transition-colors ${
                active
                  ? 'bg-[#006a46] text-white shadow-sm'
                  : 'bg-white dark:bg-[#0c211a] border border-slate-200/80 dark:border-white/10 text-[#3e4a42] dark:text-slate-300 hover:border-[#006a46]/40'
              }`}
            >
              <span>{ch.label}</span>
              {count === 0 ? (
                <span
                  className={`text-[11px] font-extrabold px-2 py-0.5 rounded-lg ${
                    active ? 'bg-white/20 text-[#ffdea8]' : 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200'
                  }`}
                >
                  قريباً
                </span>
              ) : (
                <span
                  className={`text-xs tabular-nums ${
                    active ? 'text-[#ffdea8]' : 'text-[#006a46] dark:text-[#6cdba6]'
                  }`}
                >
                  ({formatNumber(count)})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Articles / Works Feed */}
      {filteredItems.length === 0 ? (
        <ComingSoonState
          badgeText="قريباً بإذن الله"
          title="سيتم تنزيل القصص والمحاضرات والدروس في هذا الباب قريباً جداً"
          description="العمل جارٍ على تطوير وتفريغ ومراجعة المحتوى العلمي والتربوي ليُعرض هنا بصفاء ووضوح. ندعوكم للتحلي بالصبر والترقب ريثما تكتمل الإضافات."
          encouragementText="تبقى إضافات المشرف متاحة في كل وقت وتُحفظ وتُعتمد تلقائياً في قاعدة البيانات السحابية."
          signature={MOTHER_OASIS_SIGNATURE}
          isAdmin={isAdmin}
          onAdminQuickAdd={onAdminQuickAdd}
          adminAddLabel="+ إضافة مقالة أو درس لهذا الباب"
        />
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => {
            const meta = chapterMeta(item.chapter);
            const Icon = meta.Icon;
            const dateText = formatCreatedAt(item.createdAt);
            return (
              <article
                key={item.id}
                className="rounded-3xl border border-amber-500/20 bg-white dark:bg-[#0c211a] p-5 sm:p-7 shadow-xs space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 font-extrabold text-[#006a46] dark:text-[#6cdba6]">
                    <Icon className="w-4 h-4" />
                    <span>{meta.label}</span>
                  </span>
                  {dateText && (
                    <span className="text-[#6e7a71] dark:text-slate-400 tabular-nums">
                      {dateText}
                    </span>
                  )}
                </div>

                <h2 className="text-lg sm:text-xl font-extrabold text-[#0e1d25] dark:text-white">
                  {item.title}
                </h2>

                <p
                  dir="rtl"
                  style={{fontFamily: resolveFontFamilyCss(prefs.fontFamily)}}
                  className={`${fontSpec.bodyClass} text-[#1d2a22] dark:text-slate-200 whitespace-pre-line`}
                >
                  {item.body}
                </p>

                <div className="pt-3 border-t border-amber-500/15 flex items-center gap-2 text-xs sm:text-sm font-extrabold text-amber-800 dark:text-amber-300">
                  <Feather className="w-4 h-4 shrink-0" />
                  <span>{item.signature || MOTHER_OASIS_SIGNATURE}</span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
