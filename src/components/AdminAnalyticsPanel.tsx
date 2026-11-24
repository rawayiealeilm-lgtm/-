import {BarChart3, BookOpen, Eye, Heart, MousePointerClick, RefreshCw, Sparkles} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {AdminMonthlyAnalytics} from '../types';

function ArabicChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{name?: string; value?: number; color?: string}>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      dir="rtl"
      className="rounded-xl bg-white dark:bg-[#081712] border border-slate-200 dark:border-white/15 px-3.5 py-2.5 shadow-lg text-xs space-y-1.5"
    >
      <p className="font-bold text-[#0e1d25] dark:text-white border-b border-slate-100 dark:border-white/10 pb-1">
        {label}
      </p>
      {payload.map((entry, idx) => (
        <div key={`${entry.name || idx}`} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-[#3e4a42] dark:text-slate-300">
            <span
              className="w-2.5 h-2.5 rounded-xs shrink-0"
              style={{backgroundColor: entry.color || '#006a46'}}
            />
            <span>{entry.name}</span>
          </span>
          <span className="font-bold text-[#0e1d25] dark:text-white tabular-nums">
            {(entry.value || 0).toLocaleString('ar-EG')}
          </span>
        </div>
      ))}
    </div>
  );
}

export function AdminAnalyticsPanel({
  authToken,
  refreshKey = 0,
}: {
  authToken: string;
  refreshKey?: number;
}) {
  const [days, setDays] = useState<7 | 14 | 30 | 60>(30);
  const [data, setData] = useState<AdminMonthlyAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!authToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/analytics?days=${days}`, {
        headers: {Authorization: `Bearer ${authToken}`},
      });
      if (!res.ok) {
        throw new Error('تعذر تحميل بيانات الإحصائيات');
      }
      const json = (await res.json()) as AdminMonthlyAnalytics;
      setData(json);
    } catch {
      setError('تعذر الاتصال بالخادم لتحديث الرسوم البيانية الشهرية');
    } finally {
      setLoading(false);
    }
  }, [authToken, days]);

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics, refreshKey]);

  const totalAllInteractions = data
    ? data.totals.sermonsEngagement +
      data.totals.adhkarEngagement +
      data.totals.motherAmens +
      (data.totals.periodVisitors || 0) +
      (data.totals.periodClicks || 0)
    : 0;

  return (
    <div className="space-y-5">
      {/* Header & Time Range Filter */}
      <section className="rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#e8f6ff] dark:bg-[#133126] text-[#006a46] dark:text-[#6cdba6] flex items-center justify-center shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0e1d25] dark:text-white">
                إحصائيات التفاعل الشهرية مع المواعظ والأدعية والأذكار
              </h2>
              <p className="text-xs text-[#6e7a71] dark:text-slate-400">
                بيانات حقيقية مرصودة للمسؤول الأول فقط — تُحدَّث تلقائياً مع قراءة المواعظ والتسبيح
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#f4faff] dark:bg-[#081712] border border-slate-200/80 dark:border-white/10">
              {(
                [
                  {val: 7, label: '٧ أيام'},
                  {val: 14, label: '١٤ يوماً'},
                  {val: 30, label: '٣٠ يوماً'},
                  {val: 60, label: '٦٠ يوماً'},
                ] as const
              ).map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setDays(opt.val)}
                  className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                    days === opt.val
                      ? 'bg-[#006a46] text-white shadow-xs'
                      : 'text-[#3e4a42] dark:text-slate-300 hover:bg-white dark:hover:bg-white/5'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={() => void fetchAnalytics()}
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#e8f6ff] dark:bg-[#133126] text-[#006a46] dark:text-[#6cdba6] text-xs font-bold flex items-center gap-1.5 whitespace-nowrap disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>تحديث</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-[#ffdad6] dark:bg-rose-950/50 text-[#93000a] dark:text-rose-200 px-4 py-3 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* 6 Summary KPIs */}
        {loading && !data ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="h-20 rounded-xl bg-[#f4faff] dark:bg-[#112921] animate-pulse border border-slate-200/60 dark:border-white/10"
              />
            ))}
          </div>
        ) : (
          data && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="rounded-xl bg-[#eefaf3] dark:bg-[#081712] border border-[#006a46]/25 dark:border-white/10 p-3.5 space-y-1">
                <div className="flex items-center justify-between text-xs text-[#3e4a42] dark:text-slate-400">
                  <span>إجمالي الزوار</span>
                  <Eye className="w-3.5 h-3.5 text-[#006a46] dark:text-[#6cdba6]" />
                </div>
                <p className="text-xl font-bold text-[#006a46] dark:text-[#6cdba6] tabular-nums">
                  {(data.totals.visitorsCount || 0).toLocaleString('ar-EG')}
                </p>
                <p className="text-[11px] text-[#6e7a71] dark:text-slate-400 tabular-nums">
                  خلال الفترة: {(data.totals.periodVisitors || 0).toLocaleString('ar-EG')} زيارة
                </p>
              </div>

              <div className="rounded-xl bg-[#f4faff] dark:bg-[#081712] border border-[#006389]/25 dark:border-white/10 p-3.5 space-y-1">
                <div className="flex items-center justify-between text-xs text-[#3e4a42] dark:text-slate-400">
                  <span>إجمالي النقرات</span>
                  <MousePointerClick className="w-3.5 h-3.5 text-[#006389] dark:text-[#80cfff]" />
                </div>
                <p className="text-xl font-bold text-[#006389] dark:text-[#80cfff] tabular-nums">
                  {(data.totals.clicksCount || 0).toLocaleString('ar-EG')}
                </p>
                <p className="text-[11px] text-[#6e7a71] dark:text-slate-400 tabular-nums">
                  خلال الفترة: {(data.totals.periodClicks || 0).toLocaleString('ar-EG')} نقرة
                </p>
              </div>

              <div className="rounded-xl bg-[#f4faff] dark:bg-[#081712] border border-slate-200/70 dark:border-white/10 p-3.5 space-y-1">
                <div className="flex items-center justify-between text-xs text-[#3e4a42] dark:text-slate-400">
                  <span>تفاعل المواعظ</span>
                  <BookOpen className="w-3.5 h-3.5 text-[#006a46] dark:text-[#6cdba6]" />
                </div>
                <p className="text-xl font-bold text-[#006a46] dark:text-[#6cdba6] tabular-nums">
                  {data.totals.sermonsEngagement.toLocaleString('ar-EG')}
                </p>
                <p className="text-[11px] text-[#6e7a71] dark:text-slate-400 tabular-nums">
                  قراءة: {data.totals.sermonReads.toLocaleString('ar-EG')} · مشاركة:{' '}
                  {data.totals.sermonShares.toLocaleString('ar-EG')}
                </p>
              </div>

              <div className="rounded-xl bg-[#fffbf2] dark:bg-[#081712] border border-[#f2be5e]/35 dark:border-white/10 p-3.5 space-y-1">
                <div className="flex items-center justify-between text-xs text-[#3e4a42] dark:text-slate-400">
                  <span>تفاعل الأذكار والأدعية</span>
                  <Sparkles className="w-3.5 h-3.5 text-[#7c5800] dark:text-[#f2be5e]" />
                </div>
                <p className="text-xl font-bold text-[#7c5800] dark:text-[#f2be5e] tabular-nums">
                  {data.totals.adhkarEngagement.toLocaleString('ar-EG')}
                </p>
                <p className="text-[11px] text-[#6e7a71] dark:text-slate-400 tabular-nums">
                  تكرار: {data.totals.adhkarTaps.toLocaleString('ar-EG')} · إتمام:{' '}
                  {data.totals.adhkarCompletions.toLocaleString('ar-EG')}
                </p>
              </div>

              <div className="rounded-xl bg-[#f4faff] dark:bg-[#081712] border border-slate-200/70 dark:border-white/10 p-3.5 space-y-1">
                <div className="flex items-center justify-between text-xs text-[#3e4a42] dark:text-slate-400">
                  <span>الإعجابات والتعليقات</span>
                  <Heart className="w-3.5 h-3.5 text-[#006389] dark:text-[#80cfff]" />
                </div>
                <p className="text-xl font-bold text-[#006389] dark:text-[#80cfff] tabular-nums">
                  {(data.totals.sermonLikes + data.totals.sermonComments).toLocaleString('ar-EG')}
                </p>
                <p className="text-[11px] text-[#6e7a71] dark:text-slate-400 tabular-nums">
                  إعجاب: {data.totals.sermonLikes.toLocaleString('ar-EG')} · تعليق:{' '}
                  {data.totals.sermonComments.toLocaleString('ar-EG')}
                </p>
              </div>

              <div className="rounded-xl bg-[#f4faff] dark:bg-[#081712] border border-slate-200/70 dark:border-white/10 p-3.5 space-y-1">
                <span className="text-xs text-[#3e4a42] dark:text-slate-400 block">
                  تأمينات دعاء الوالدة
                </span>
                <p className="text-xl font-bold text-[#0e1d25] dark:text-white tabular-nums">
                  {data.totals.motherAmens.toLocaleString('ar-EG')}
                </p>
                <p className="text-[11px] text-[#6e7a71] dark:text-slate-400">
                  خلال آخر {days.toLocaleString('ar-EG')} يوماً
                </p>
              </div>
            </div>
          )
        )}
      </section>

      {data && totalAllInteractions === 0 && (
        <div className="rounded-2xl bg-[#fffbf2] dark:bg-[#13221c] border border-[#f2be5e]/40 px-5 py-4 text-xs sm:text-sm text-[#7c5800] dark:text-[#f2be5e]">
          العدادات حالياً في وضع البداية النظيف (٠ تفاعل مرصود). ستظهر المنحنيات والأعمدة البيانية هنا فور بدء
          الزوار في التصفح وقراءة المواعظ وتكرار الأذكار والدعاء.
        </div>
      )}

      {data && (
        <>
          {/* Chart 1: Monthly Area Chart comparing Sermons vs Adhkar */}
          <section className="rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-5 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[#0e1d25] dark:text-white">
                  منحنى التفاعل اليومي خلال الشهر (المواعظ مقابل الأذكار)
                </h3>
                <p className="text-xs text-[#6e7a71] dark:text-slate-400">
                  يقارن إجمالي القراءات والإعجابات والمشاركات للمواعظ مع التسبيح وإتمام الأذكار
                </p>
              </div>
            </div>

            <div className="w-full h-[280px]" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.dailySeries} margin={{top: 10, right: 12, left: 0, bottom: 4}}>
                  <defs>
                    <linearGradient id="sermonsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#006a46" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#006a46" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="adhkarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d99b1e" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#d99b1e" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{fontSize: 11, fill: '#64748b'}}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={22}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{fontSize: 11, fill: '#64748b'}}
                    tickLine={false}
                    axisLine={false}
                    width={36}
                  />
                  <Tooltip content={<ArabicChartTooltip />} />
                  <Legend wrapperStyle={{fontSize: 12, paddingTop: 8}} />
                  <Area
                    type="monotone"
                    dataKey="sermonsTotal"
                    name="تفاعل المواعظ"
                    stroke="#006a46"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#sermonsGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="adhkarTotal"
                    name="تفاعل الأدعية والأذكار"
                    stroke="#d99b1e"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#adhkarGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Visitors & Clicks Daily Trend */}
          <section className="rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-5 shadow-xs space-y-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#0e1d25] dark:text-white">
                حركة الزوار والنقرات اليومية
              </h3>
              <p className="text-xs text-[#6e7a71] dark:text-slate-400">
                تتبع جلسات الزيارة الفريدة وإجمالي النقرات عبر أقسام المنصة خلال الفترة المحددة
              </p>
            </div>

            <div className="w-full h-[250px]" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.dailySeries} margin={{top: 10, right: 12, left: 0, bottom: 4}}>
                  <defs>
                    <linearGradient id="visitorsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#006389" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#006389" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="clicksGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.32} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{fontSize: 11, fill: '#64748b'}}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={22}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{fontSize: 11, fill: '#64748b'}}
                    tickLine={false}
                    axisLine={false}
                    width={36}
                  />
                  <Tooltip content={<ArabicChartTooltip />} />
                  <Legend wrapperStyle={{fontSize: 12, paddingTop: 8}} />
                  <Area
                    type="monotone"
                    dataKey="visitors"
                    name="عدد الزوار"
                    stroke="#006389"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#visitorsGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="clicks"
                    name="عدد النقرات"
                    stroke="#10b981"
                    strokeWidth={2.2}
                    fillOpacity={1}
                    fill="url(#clicksGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Chart 2: Daily Stacked Breakdown Bar Chart */}
          <section className="rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-5 shadow-xs space-y-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#0e1d25] dark:text-white">
                تفصيل أنواع التفاعل اليومي خلال الفترة
              </h3>
              <p className="text-xs text-[#6e7a71] dark:text-slate-400">
                توزيع القراءات والمشاركات والإعجابات والتسبيح عبر أيام الشهر
              </p>
            </div>

            <div className="w-full h-[260px]" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.dailySeries} margin={{top: 10, right: 12, left: 0, bottom: 4}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{fontSize: 11, fill: '#64748b'}}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={22}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{fontSize: 11, fill: '#64748b'}}
                    tickLine={false}
                    axisLine={false}
                    width={36}
                  />
                  <Tooltip content={<ArabicChartTooltip />} />
                  <Legend wrapperStyle={{fontSize: 12, paddingTop: 8}} />
                  <Bar
                    dataKey="sermonReads"
                    name="قراءة مواعظ"
                    stackId="a"
                    fill="#006a46"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="sermonShares"
                    name="نسخ ومشاركة"
                    stackId="a"
                    fill="#006389"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="sermonLikes"
                    name="إعجابات"
                    stackId="a"
                    fill="#10b981"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="adhkarTaps"
                    name="تكرار أذكار"
                    stackId="a"
                    fill="#d99b1e"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Chart 3 & 4: Categories Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <section className="rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-5 shadow-xs space-y-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[#0e1d25] dark:text-white">
                  تفاعل أقسام المواعظ والمحتوى
                </h3>
                <p className="text-xs text-[#6e7a71] dark:text-slate-400">
                  عدد المنشورات وإجمالي التفاعل المرصود لكل تصنيف
                </p>
              </div>
              <div className="w-full h-[250px]" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.sermonCategories}
                    layout="vertical"
                    margin={{top: 6, right: 16, left: 10, bottom: 6}}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{fontSize: 11, fill: '#64748b'}} />
                    <YAxis
                      type="category"
                      dataKey="category"
                      width={96}
                      tick={{fontSize: 11, fill: '#64748b'}}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<ArabicChartTooltip />} />
                    <Legend wrapperStyle={{fontSize: 12}} />
                    <Bar dataKey="count" name="عدد المواعظ" fill="#006389" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="engagement" name="التفاعل" fill="#006a46" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-5 shadow-xs space-y-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[#0e1d25] dark:text-white">
                  تفاعل أقسام الأدعية والأذكار
                </h3>
                <p className="text-xs text-[#6e7a71] dark:text-slate-400">
                  توزيع مرات التلاوة والضغط بين الصباح والمساء والأدعية والمسبحة
                </p>
              </div>
              <div className="w-full h-[250px]" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.adhkarCategories}
                    layout="vertical"
                    margin={{top: 6, right: 16, left: 10, bottom: 6}}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{fontSize: 11, fill: '#64748b'}} />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={120}
                      tick={{fontSize: 11, fill: '#64748b'}}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<ArabicChartTooltip />} />
                    <Bar dataKey="taps" name="مرات التفاعل" fill="#d99b1e" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
