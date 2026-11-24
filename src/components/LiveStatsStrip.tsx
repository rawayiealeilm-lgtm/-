import {Activity, Download, Eye, Users} from 'lucide-react';
import {useI18n} from '../utils/i18n';
import {useLiveStats} from '../utils/liveStats';

export function LiveStatsStrip({compact = false}: {compact?: boolean}) {
  const {formatNumber} = useI18n();
  const {stats, engagementRate} = useLiveStats();

  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (engagementRate / 100) * circumference;

  if (compact) {
    return (
      <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0c211a] p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-[#0e1d25] dark:text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#006a46] dark:text-[#6cdba6]" />
            <span>الإحصائيات الحية الدائمة</span>
          </h3>
          <span className="text-xs font-bold text-[#006a46] dark:text-[#6cdba6] tabular-nums">
            معدل التفاعل {formatNumber(engagementRate)}%
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2.5 text-center">
          <div className="rounded-xl bg-[#f4f7f5] dark:bg-white/5 p-2.5">
            <p className="text-[11px] text-[#6e7a71] dark:text-slate-400">الزوار التراكمي</p>
            <p className="text-base font-extrabold text-[#006a46] dark:text-[#6cdba6] tabular-nums">
              {formatNumber(stats.visitors)}
            </p>
          </div>
          <div className="rounded-xl bg-[#f4f7f5] dark:bg-white/5 p-2.5">
            <p className="text-[11px] text-[#6e7a71] dark:text-slate-400">إجمالي المشاهدات</p>
            <p className="text-base font-extrabold text-[#004f87] dark:text-[#9bd0fd] tabular-nums">
              {formatNumber(stats.views)}
            </p>
          </div>
          <div className="rounded-xl bg-[#f4f7f5] dark:bg-white/5 p-2.5">
            <p className="text-[11px] text-[#6e7a71] dark:text-slate-400">التحميلات</p>
            <p className="text-base font-extrabold text-[#b45309] dark:text-[#fbbf24] tabular-nums">
              {formatNumber(stats.downloadsTotal)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section
      aria-label="لوحة الإحصائيات الحية"
      className="rounded-3xl border border-emerald-900/15 dark:border-white/10 bg-gradient-to-br from-[#072a1e] via-[#0b3b2a] to-[#082438] text-white p-5 sm:p-6 shadow-md space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-300" />
            <span>لوحة الإحصائيات الإبداعية الحية</span>
          </h2>
          <p className="text-xs text-emerald-100/80 mt-0.5">
            أرقام محفوظة بشكل دائم تعكس حركة القراءة والتحميل والانتفاع بالموقع
          </p>
        </div>
        <span className="text-xs font-semibold text-emerald-200">
          العداد التراكمي الموثق (من ٤٠٠١ فأعلى)
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-white/10 backdrop-blur-sm p-4 border border-white/10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/25 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-emerald-200" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-emerald-100/80">زوار الموقع التراكمي</p>
            <p className="text-xl sm:text-2xl font-extrabold tabular-nums">
              {formatNumber(stats.visitors)}
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-white/10 backdrop-blur-sm p-4 border border-white/10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-sky-500/25 flex items-center justify-center shrink-0">
            <Eye className="w-5 h-5 text-sky-200" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-emerald-100/80">إجمالي المشاهدات</p>
            <p className="text-xl sm:text-2xl font-extrabold tabular-nums">
              {formatNumber(stats.views)}
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-white/10 backdrop-blur-sm p-4 border border-white/10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/25 flex items-center justify-center shrink-0">
            <Download className="w-5 h-5 text-amber-200" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-emerald-100/80">إجمالي التحميلات</p>
            <p className="text-xl sm:text-2xl font-extrabold tabular-nums">
              {formatNumber(stats.downloadsTotal)}
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-white/10 backdrop-blur-sm p-4 border border-white/10 flex items-center gap-3">
          <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
            <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
              <circle
                cx="24"
                cy="24"
                r={radius}
                stroke="rgba(255,255,255,0.18)"
                strokeWidth="4.5"
                fill="none"
              />
              <circle
                cx="24"
                cy="24"
                r={radius}
                stroke="#6ee7b7"
                strokeWidth="4.5"
                strokeLinecap="round"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
              />
            </svg>
            <span className="absolute text-[11px] font-extrabold tabular-nums text-emerald-200">
              {formatNumber(engagementRate)}%
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-emerald-100/80">نسبة التفاعل والنقر</p>
            <div className="w-full h-1.5 rounded-full bg-white/15 mt-1.5 overflow-hidden">
              <div
                className="h-full bg-emerald-300 rounded-full transition-all"
                style={{width: `${engagementRate}%`}}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
