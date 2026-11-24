import {BookOpen, CheckCircle2, Flame, Sparkles} from 'lucide-react';
import {useI18n} from '../utils/i18n';
import {useLiveStats} from '../utils/liveStats';
import {useReadingPrefs, resolveFontFamilyCss, resolveFontSizeSpec} from '../utils/readingPrefs';
import {WIRD_GOAL_OPTIONS, useDailyWird} from '../utils/wirdStorage';

export function DailyWirdView({
  onOpenQuranAtPage,
  onNotify,
}: {
  onOpenQuranAtPage: (page: number) => void;
  onNotify: (msg: string) => void;
}) {
  const {formatNumber} = useI18n();
  const {prefs} = useReadingPrefs();
  const fontSpec = resolveFontSizeSpec(prefs.fontSize);
  const {recordInteraction} = useLiveStats();
  const {wird, isCompletedToday, progressPct, updateWird, setGoal, markTodayComplete, toggleHabit} =
    useDailyWird();

  const handleComplete = () => {
    markTodayComplete();
    recordInteraction();
    onNotify('تقبل الله وردك اليوم وبارك في تلاوتك وثباتك');
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-emerald-900/15 dark:border-white/10 bg-gradient-to-br from-[#064e3b] to-[#0b3a4b] text-white p-6 shadow-md space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-extrabold flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-emerald-300" />
              <span>الورد اليومي من القرآن الكريم</span>
            </h1>
            <p
              style={{fontFamily: resolveFontFamilyCss(prefs.fontFamily)}}
              className={`${fontSpec.bodyClass} text-emerald-100/90`}
            >
              داوم على وردك اليومي ولو كان يسيراً، فخير الأعمال عند الله أدومها وإن قلّ
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-2.5 text-center border border-white/15">
            <p className="text-[11px] text-emerald-100/80 flex items-center justify-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-300" />
              <span>سلسلة المداومة</span>
            </p>
            <p className="text-xl font-extrabold tabular-nums">
              {formatNumber(wird.streakDays)} يوم
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs sm:text-sm font-bold">
            <span>
              الصفحة الحالية المحفوظة: ص {formatNumber(wird.currentPage)} من ٦٠٤
            </span>
            <span className="tabular-nums">{formatNumber(progressPct)}%</span>
          </div>
          <div className="w-full h-3 rounded-full bg-white/15 overflow-hidden">
            <div
              className="h-full bg-emerald-300 rounded-full transition-all duration-300"
              style={{width: `${progressPct}%`}}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleComplete}
            className={`min-h-[46px] px-5 py-2.5 rounded-2xl font-extrabold text-sm flex items-center gap-2 transition-colors ${
              isCompletedToday
                ? 'bg-emerald-300 text-[#063a2a]'
                : 'bg-white text-[#064e3b] hover:bg-emerald-50'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isCompletedToday ? 'أتممت وردي اليوم ✓' : 'أتممت وردي اليوم ✓'}</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenQuranAtPage(wird.currentPage)}
            className="min-h-[46px] px-5 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-sm flex items-center gap-2 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            <span>متابعة القراءة من ص {formatNumber(wird.currentPage)}</span>
          </button>
        </div>
      </div>

      {/* Goal Selector */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0c211a] p-5 sm:p-6 space-y-4">
        <h2 className="text-base sm:text-lg font-bold text-[#0e1d25] dark:text-white">
          اختر مقدار الورد اليومي المناسب لك
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {WIRD_GOAL_OPTIONS.map((opt) => {
            const active = wird.goalType === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setGoal(opt.id)}
                className={`text-right rounded-2xl p-4 border transition-all ${
                  active
                    ? 'border-[#006a46] bg-[#e9f5ef] dark:bg-emerald-900/30 text-[#0e1d25] dark:text-white'
                    : 'border-slate-200 dark:border-white/10 bg-[#fafcfb] dark:bg-white/5 text-[#0e1d25] dark:text-slate-200 hover:border-[#006a46]/40'
                }`}
              >
                <p className="font-extrabold text-sm">{opt.label}</p>
                <p className="text-xs text-[#6e7a71] dark:text-slate-400 mt-1">{opt.hint}</p>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <label className="space-y-1.5 block">
            <span className="text-xs font-bold text-[#3e4a42] dark:text-slate-300">
              تحديث صفحة التوقف في المصحف (١ — ٦٠٤)
            </span>
            <input
              type="number"
              min={1}
              max={604}
              value={wird.currentPage}
              onChange={(e) =>
                updateWird({currentPage: Math.min(604, Math.max(1, Number(e.target.value) || 1))})
              }
              className="w-full rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#081712] px-3.5 py-2.5 text-sm font-bold tabular-nums"
            />
          </label>

          <label className="space-y-1.5 block">
            <span className="text-xs font-bold text-[#3e4a42] dark:text-slate-300">
              هدف الصفحات اليومي
            </span>
            <input
              type="number"
              min={1}
              max={60}
              value={wird.targetPages}
              onChange={(e) =>
                updateWird({targetPages: Math.min(60, Math.max(1, Number(e.target.value) || 1))})
              }
              className="w-full rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#081712] px-3.5 py-2.5 text-sm font-bold tabular-nums"
            />
          </label>
        </div>
      </div>

      {/* Light Faith Checklist */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0c211a] p-5 sm:p-6 space-y-3">
        <h2 className="text-base sm:text-lg font-bold text-[#0e1d25] dark:text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#006a46] dark:text-[#6cdba6]" />
          <span>سجل المحافظة على الطاعات اليومية</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {key: 'morningEveningAdhkar' as const, label: 'أذكار الصباح والمساء'},
            {key: 'duhaPrayer' as const, label: 'صلاة الضحى (الأوابين)'},
            {key: 'witrPrayer' as const, label: 'قيام الليل وصلاة الوتر'},
          ].map((item) => {
            const checked = wird.habits[item.key];
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => toggleHabit(item.key)}
                className={`rounded-2xl p-4 border flex items-center justify-between gap-3 transition-colors ${
                  checked
                    ? 'border-[#006a46] bg-[#e9f5ef] dark:bg-emerald-900/30 text-[#006a46] dark:text-[#6cdba6]'
                    : 'border-slate-200 dark:border-white/10 bg-[#fafcfb] dark:bg-white/5 text-[#0e1d25] dark:text-slate-200'
                }`}
              >
                <span className="font-bold text-sm">{item.label}</span>
                <CheckCircle2 className={`w-5 h-5 shrink-0 ${checked ? 'opacity-100' : 'opacity-30'}`} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
