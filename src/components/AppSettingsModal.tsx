import {
  BarChart3,
  Bell,
  BellOff,
  BellRing,
  CalendarDays,
  CheckCircle2,
  Flame,
  Globe,
  Monitor,
  Moon,
  RotateCcw,
  Settings,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import {useEffect, useMemo, useState} from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {ThemeMode} from '../types';
import {
  ADHKAR_STATS_UPDATED_EVENT,
  type WeeklyDayEntry,
  getAdhkarProgressCards,
  getWeeklyAdhkarSummary,
  resetWeeklyAdhkarStats,
} from '../utils/adhkarStats';
import {useI18n} from '../utils/i18n';
import {
  type AdhkarReminderSettings,
  dispatchLocalNotification,
  getNotificationPermission,
  isNotificationSupported,
  requestNotificationPermission,
} from '../utils/notifications';

export type AppSettingsSection = 'settings' | 'weekly-activity';

function WeeklyActivityTooltip({
  active,
  payload,
  isEn,
  formatNumber,
}: {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    color?: string;
    payload?: WeeklyDayEntry;
  }>;
  isEn: boolean;
  formatNumber: (n: number) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const day = payload[0]?.payload;
  const total = day ? day.total : payload.reduce((sum, p) => sum + (p.value || 0), 0);

  return (
    <div
      dir={isEn ? 'ltr' : 'rtl'}
      className="rounded-xl bg-white dark:bg-[#081712] border border-slate-200 dark:border-white/15 px-3.5 py-2.5 shadow-lg text-xs space-y-1.5 min-w-[165px]"
    >
      <p className="font-bold text-[#0e1d25] dark:text-white border-b border-slate-100 dark:border-white/10 pb-1">
        {day?.fullLabel}
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
            {formatNumber(entry.value || 0)}
          </span>
        </div>
      ))}
      <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-100 dark:border-white/10 font-extrabold text-[#006a46] dark:text-[#6cdba6]">
        <span>{isEn ? 'Daily Total' : 'الإجمالي اليومي'}</span>
        <span className="tabular-nums">{formatNumber(total)}</span>
      </div>
    </div>
  );
}

export function AppSettingsModal({
  open,
  initialSection = 'settings',
  onClose,
  appName,
  reminderSettings,
  onChangeReminderSettings,
  themeMode,
  onChangeThemeMode,
  onToggleLanguage,
  onOpenAdhkar,
  onNotify,
}: {
  open: boolean;
  initialSection?: AppSettingsSection;
  onClose: () => void;
  appName: string;
  reminderSettings: AdhkarReminderSettings;
  onChangeReminderSettings: (next: AdhkarReminderSettings) => void;
  themeMode: ThemeMode;
  onChangeThemeMode: (mode: ThemeMode) => void;
  onToggleLanguage: () => void;
  onOpenAdhkar: () => void;
  onNotify: (msg: string) => void;
}) {
  const {isEn, tr, formatNumber} = useI18n();
  const [section, setSection] = useState<AppSettingsSection>(initialSection);
  const [permission, setPermission] = useState(() => getNotificationPermission());
  const [testing, setTesting] = useState(false);
  const [statsVersion, setStatsVersion] = useState(0);
  const [selectedDayIdx, setSelectedDayIdx] = useState(6);

  useEffect(() => {
    if (open) {
      setSection(initialSection);
      setStatsVersion((v) => v + 1);
      setSelectedDayIdx(6);
      setPermission(getNotificationPermission());
    }
  }, [open, initialSection]);

  useEffect(() => {
    const handleUpdate = () => setStatsVersion((v) => v + 1);
    window.addEventListener(ADHKAR_STATS_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(ADHKAR_STATS_UPDATED_EVENT, handleUpdate);
  }, []);

  const weeklySummary = useMemo(() => {
    void statsVersion;
    return getWeeklyAdhkarSummary(isEn);
  }, [isEn, statsVersion]);

  const progressCards = useMemo(() => {
    void statsVersion;
    return getAdhkarProgressCards();
  }, [statsVersion]);

  if (!open) return null;

  const supported = isNotificationSupported();
  const selectedDay = weeklySummary.days[selectedDayIdx] || weeklySummary.days[weeklySummary.days.length - 1];

  const handleToggleMaster = async () => {
    if (!reminderSettings.enabled) {
      if (supported) {
        const result = await requestNotificationPermission();
        setPermission(result);
        if (result === 'denied') {
          onNotify(
            tr(
              'تم حظر الإشعارات في المتصفح؛ فعّل إذن الإشعارات من إعدادات الموقع ثم أعد المحاولة',
              'Browser notifications are blocked; allow notifications in site settings and retry',
            ),
          );
        } else if (result === 'granted') {
          onNotify(
            tr(
              'تم تفعيل الإشعارات المحلية لتذكير أذكار الصباح والمساء',
              'Local Morning & Evening Adhkar notifications enabled',
            ),
          );
        }
      } else {
        onNotify(
          tr(
            'تم حفظ أوقات التذكير وسيتم تنبيهك داخل التطبيق عند حلول الموعد',
            'Reminder times saved; in-app alerts will appear when scheduled',
          ),
        );
      }
      onChangeReminderSettings({...reminderSettings, enabled: true});
    } else {
      onChangeReminderSettings({...reminderSettings, enabled: false});
      onNotify(tr('تم إيقاف تذكير الأذكار المجدول', 'Scheduled Adhkar reminders paused'));
    }
  };

  const handleSendTest = async () => {
    setTesting(true);
    try {
      if (supported && permission !== 'granted') {
        const res = await requestNotificationPermission();
        setPermission(res);
      }
      const title = isEn ? `Adhkar Reminder · ${appName}` : `تذكير الأذكار · ${appName}`;
      const body = isEn
        ? 'Sample local notification: Remember Allah with Morning & Evening Adhkar!'
        : 'إشعار تجريبي: حان وقت الأذكار والأدعية الجامعة (الصباح والمساء).';
      const sentOs = await dispatchLocalNotification({
        title,
        body,
        tag: `mawaedh-test-${Date.now()}`,
        onClickNavigate: onOpenAdhkar,
      });
      if (sentOs) {
        onNotify(tr('تم إرسال إشعار محلي تجريبي بنجاح', 'Test local notification sent'));
      } else {
        onNotify(
          tr(
            'إشعار تجريبي داخل التطبيق (لتلقي إشعارات النظام اسمح بالإشعارات في المتصفح)',
            'In-app test reminder shown (allow browser notifications for OS alerts)',
          ),
        );
      }
    } finally {
      setTesting(false);
    }
  };

  const handleResetWeeklyStats = () => {
    resetWeeklyAdhkarStats();
    setStatsVersion((v) => v + 1);
    onNotify(tr('تم تصفير سجل نشاط الأذكار الأسبوعي', 'Weekly Adhkar activity log cleared'));
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4 pt-[40px] pb-[40px]"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-3xl bg-white dark:bg-[#0c211a] border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 shadow-2xl space-y-5 max-h-[calc(100dvh-96px)] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#006a46] text-white flex items-center justify-center shrink-0">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#0e1d25] dark:text-white">
                {tr('المنبّه الدعوي وإعدادات العرض', 'Reminder & Display Settings')}
              </h2>
              <p className="text-xs text-[#6e7a71] dark:text-slate-400">
                {tr(
                  'تذكير الصباح والمساء، متابعة النشاط الأسبوعي، المظهر واللغة',
                  'Daily reminders, weekly Adhkar activity, theme, and language',
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={tr('إغلاق', 'Close')}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Switcher inside Adhkar Settings */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-[#e8f6ff] dark:bg-[#112921]">
          <button
            type="button"
            onClick={() => setSection('settings')}
            className={`min-h-[42px] px-3 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
              section === 'settings'
                ? 'bg-[#006a46] text-white shadow-sm'
                : 'text-[#3e4a42] dark:text-slate-300 hover:bg-white/60 dark:hover:bg-white/5'
            }`}
          >
            <BellRing className="w-4 h-4 shrink-0" />
            <span>{tr('الإشعارات والإعدادات', 'Reminders & Settings')}</span>
          </button>

          <button
            type="button"
            onClick={() => setSection('weekly-activity')}
            className={`min-h-[42px] px-3 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
              section === 'weekly-activity'
                ? 'bg-[#006a46] text-white shadow-sm'
                : 'text-[#3e4a42] dark:text-slate-300 hover:bg-white/60 dark:hover:bg-white/5'
            }`}
          >
            <BarChart3 className="w-4 h-4 shrink-0" />
            <span>{tr('النشاط الأسبوعي', 'Weekly Activity')}</span>
            {weeklySummary.totalWeek > 0 && (
              <span
                className={`px-2 py-0.5 rounded-lg text-[10px] tabular-nums ${
                  section === 'weekly-activity'
                    ? 'bg-[#ffdea8] text-[#271900]'
                    : 'bg-[#006a46]/15 text-[#006a46] dark:bg-[#6cdba6]/20 dark:text-[#6cdba6]'
                }`}
              >
                {formatNumber(weeklySummary.totalWeek)}
              </span>
            )}
          </button>
        </div>

        {section === 'weekly-activity' ? (
          /* Weekly Adhkar & Tasbeeh Activity Section */
          <div className="space-y-4">
            {/* Permanent Progress Cards (Today, Month, Overall + Hasanat) */}
            <div className="rounded-2xl bg-[#eefaf3] dark:bg-[#0f241c] border border-[#006a46]/25 p-3.5 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-[#006a46] dark:text-[#6cdba6]">
                <span>{tr('إحصائية الأذكار والحسنات الدائمة', 'Permanent Adhkar & Hasanat Stats')}</span>
                <span>«والله يضاعف لمن يشاء»</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-white dark:bg-[#0a1914] p-2.5 text-center border border-slate-200/70 dark:border-white/10">
                  <span className="text-[11px] font-bold text-[#006a46] dark:text-[#6cdba6] block">إنجاز اليوم</span>
                  <span className="text-base font-extrabold text-[#0e1d25] dark:text-white tabular-nums block">
                    {formatNumber(progressCards.todayCount)}
                  </span>
                  <span className="text-[10px] font-semibold text-[#7c5800] dark:text-[#f2be5e] tabular-nums">
                    +{formatNumber(progressCards.todayHasanat)} حسنة
                  </span>
                </div>
                <div className="rounded-xl bg-white dark:bg-[#0a1914] p-2.5 text-center border border-slate-200/70 dark:border-white/10">
                  <span className="text-[11px] font-bold text-[#7c5800] dark:text-[#f2be5e] block">إنجاز هذا الشهر</span>
                  <span className="text-base font-extrabold text-[#0e1d25] dark:text-white tabular-nums block">
                    {formatNumber(progressCards.monthCount)}
                  </span>
                  <span className="text-[10px] font-semibold text-[#006a46] dark:text-[#6cdba6] tabular-nums">
                    +{formatNumber(progressCards.monthHasanat)} حسنة
                  </span>
                </div>
                <div className="rounded-xl bg-[#006a46] text-white p-2.5 text-center">
                  <span className="text-[11px] font-bold text-[#ffdea8] block">الإجمالي العام</span>
                  <span className="text-base font-extrabold tabular-nums block">
                    {formatNumber(progressCards.overallCount)}
                  </span>
                  <span className="text-[10px] font-semibold text-[#ffdea8] tabular-nums">
                    {formatNumber(progressCards.overallHasanat)} حسنة+
                  </span>
                </div>
              </div>
            </div>

            {/* Summary KPI Cards */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="rounded-2xl bg-gradient-to-br from-[#006a46] to-[#005235] text-white p-3.5 space-y-1">
                <div className="flex items-center justify-between text-[11px] text-[#ffdea8] font-bold">
                  <span>{tr('إجمالي الأسبوع', 'Weekly Total')}</span>
                  <Flame className="w-3.5 h-3.5 shrink-0" />
                </div>
                <div className="text-xl sm:text-2xl font-extrabold tabular-nums">
                  {formatNumber(weeklySummary.totalWeek)}
                </div>
                <div className="text-[10px] text-[#e3f3fe]/85 tabular-nums">
                  {tr(
                    `${formatNumber(weeklySummary.activeDaysCount)} من ٧ أيام نشطة`,
                    `${formatNumber(weeklySummary.activeDaysCount)} / 7 active days`,
                  )}
                </div>
              </div>

              <div className="rounded-2xl bg-[#f4faff] dark:bg-[#112921] border border-slate-200/80 dark:border-white/10 p-3.5 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-[#006a46] dark:text-[#6cdba6]">
                  <span>{tr('الأذكار والأدعية', 'Adhkar & Duas')}</span>
                  <Sun className="w-3.5 h-3.5 shrink-0" />
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-[#0e1d25] dark:text-white tabular-nums">
                  {formatNumber(weeklySummary.totalAdhkarWeek)}
                </div>
                <div className="text-[10px] text-[#6e7a71] dark:text-slate-400">
                  {tr('الأذكار والأدعية الجامعة', 'Comprehensive Adhkar')}
                </div>
              </div>

              <div className="rounded-2xl bg-[#fffbf2] dark:bg-[#16231d] border border-[#f2be5e]/45 p-3.5 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-[#7c5800] dark:text-[#f2be5e]">
                  <span>{tr('عداد المسبحة', 'Tasbeeh Counter')}</span>
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-[#0e1d25] dark:text-white tabular-nums">
                  {formatNumber(weeklySummary.totalTasbeehWeek)}
                </div>
                <div className="text-[10px] text-[#6e7a71] dark:text-slate-400">
                  {tr('المسبحة الإلكترونية', 'Electronic Tasbeeh')}
                </div>
              </div>
            </div>

            {/* Daily Activity Interactive Recharts Bar Chart */}
            <section className="rounded-2xl bg-[#f4faff] dark:bg-[#112921] border border-slate-200/80 dark:border-white/10 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-[#0e1d25] dark:text-white flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4 text-[#006a46] dark:text-[#6cdba6]" />
                    <span>{tr('النشاط اليومي خلال آخر ٧ أيام', 'Daily Activity (Last 7 Days)')}</span>
                  </h3>
                  <p className="text-[11px] text-[#6e7a71] dark:text-slate-400 mt-0.5">
                    {tr(
                      'مرّر أو اضغط على أعمدة الرسم البياني لعرض تفصيل الأذكار والمسبحة لكل يوم',
                      'Hover or tap bars to inspect daily Adhkar and Tasbeeh counts',
                    )}
                  </p>
                </div>
              </div>

              <div className="w-full h-[225px]" dir="ltr">
                <ResponsiveContainer width="100%" height={225}>
                  <BarChart
                    data={weeklySummary.days}
                    margin={{top: 10, right: 8, left: -12, bottom: 2}}
                    onClick={(chartState) => {
                      const rawIdx = chartState?.activeTooltipIndex;
                      const idx = typeof rawIdx === 'number' ? rawIdx : Number(rawIdx);
                      if (Number.isInteger(idx) && idx >= 0 && idx < weeklySummary.days.length) {
                        setSelectedDayIdx(idx);
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" vertical={false} />
                    <XAxis
                      dataKey="shortLabel"
                      tick={{fontSize: 11, fill: '#64748b'}}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{fontSize: 11, fill: '#64748b'}}
                      tickLine={false}
                      axisLine={false}
                      width={38}
                    />
                    <Tooltip
                      cursor={{fill: 'rgba(0, 106, 70, 0.08)'}}
                      content={<WeeklyActivityTooltip isEn={isEn} formatNumber={formatNumber} />}
                    />
                    <Legend wrapperStyle={{fontSize: 11, paddingTop: 6}} />
                    <Bar
                      dataKey="adhkar"
                      stackId="daily"
                      name={tr('الأذكار والأدعية الجامعة', 'Adhkar & Duas')}
                      fill="#006a46"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={30}
                    />
                    <Bar
                      dataKey="tasbeeh"
                      stackId="daily"
                      name={tr('عداد المسبحة', 'Tasbeeh Counter')}
                      fill="#d99518"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={30}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Selected Day Breakdown */}
              {selectedDay && (
                <div className="rounded-xl bg-white dark:bg-[#0b1f18] border border-slate-200/80 dark:border-white/10 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="font-bold text-[#0e1d25] dark:text-white">
                    {selectedDay.fullLabel}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 tabular-nums font-semibold">
                    <span className="text-[#006a46] dark:text-[#6cdba6]">
                      {tr('الأذكار:', 'Adhkar:')} {formatNumber(selectedDay.adhkar)}
                    </span>
                    <span className="text-[#7c5800] dark:text-[#f2be5e]">
                      {tr('المسبحة:', 'Tasbeeh:')} {formatNumber(selectedDay.tasbeeh)}
                    </span>
                    <span className="font-extrabold text-[#0e1d25] dark:text-white">
                      {tr('المجموع:', 'Total:')} {formatNumber(selectedDay.total)}
                    </span>
                  </div>
                </div>
              )}

              {weeklySummary.totalWeek === 0 ? (
                <div className="rounded-xl bg-[#fffbf2] dark:bg-[#16231d] border border-[#f2be5e]/40 p-3 text-xs text-[#7c5800] dark:text-[#ffdea8] leading-relaxed">
                  {tr(
                    'لم يتم تسجيل أذكار بعد هذا الأسبوع. ابدأ بالضغط على زر الذكر أو المسبحة الإلكترونية وسيظهر تقدمك اليومي هنا تلقائياً.',
                    'No Adhkar recorded yet this week. Start using the Adhkar or Tasbeeh counters to track your daily progress here.',
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold text-[#3e4a42] dark:text-slate-300">
                  <span>
                    {tr(
                      `المتوسط اليومي: ${formatNumber(weeklySummary.dailyAverage)} ذكراً`,
                      `Daily average: ${formatNumber(weeklySummary.dailyAverage)}`,
                    )}
                  </span>
                  {weeklySummary.bestDay && (
                    <span className="text-[#006a46] dark:text-[#6cdba6]">
                      {tr(
                        `أعلى نشاط: ${weeklySummary.bestDay.shortLabel} (${formatNumber(weeklySummary.bestDay.total)})`,
                        `Best day: ${weeklySummary.bestDay.shortLabel} (${formatNumber(weeklySummary.bestDay.total)})`,
                      )}
                    </span>
                  )}
                </div>
              )}
            </section>

            {/* Weekly Section Footer Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAdhkar();
                }}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-[#006a46] hover:bg-[#005235] text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                <span>{tr('ابدأ الذكر والتسبيح الآن', 'Go to Adhkar & Tasbeeh')}</span>
              </button>

              {weeklySummary.totalWeek > 0 && (
                <button
                  type="button"
                  onClick={handleResetWeeklyStats}
                  className="min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-[#3e4a42] dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{tr('تصفير السجل', 'Clear Log')}</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Existing Settings & Local Notifications Section */
          <>
            {/* Local Notifications Card */}
            <section className="rounded-2xl bg-[#f4faff] dark:bg-[#112921] border border-slate-200/80 dark:border-white/10 p-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#ffdea8] text-[#271900] flex items-center justify-center shrink-0 mt-0.5">
                    {reminderSettings.enabled ? <BellRing className="w-4.5 h-4.5" /> : <BellOff className="w-4.5 h-4.5" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0e1d25] dark:text-white">
                      {tr('الإشعارات المحلية لأذكار الصباح والمساء', 'Local Morning & Evening Adhkar Reminders')}
                    </h3>
                    <p className="text-xs text-[#3e4a42] dark:text-slate-300 mt-0.5 leading-relaxed">
                      {tr(
                        'اختر الأوقات المناسبة لك ليصلك تنبيه تذكيري يومي بقراءة الأذكار.',
                        'Choose your preferred times to receive daily local reminder notifications.',
                      )}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={reminderSettings.enabled}
                  onClick={() => void handleToggleMaster()}
                  className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-colors ${
                    reminderSettings.enabled
                      ? 'bg-[#006a46] text-white'
                      : 'bg-white dark:bg-[#0a1914] border border-slate-200 dark:border-white/15 text-[#3e4a42] dark:text-slate-300'
                  }`}
                >
                  {reminderSettings.enabled ? tr('مفعّل', 'Enabled') : tr('تفعيل', 'Enable')}
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold px-3 py-2 rounded-xl bg-white/80 dark:bg-[#0a1914]">
                <span className="text-[#3e4a42] dark:text-slate-300">
                  {tr('حالة إذن إشعارات المتصفح/الجهاز:', 'Device Notification Permission:')}
                </span>
                <span
                  className={
                    permission === 'granted'
                      ? 'text-[#006a46] dark:text-[#6cdba6] flex items-center gap-1'
                      : permission === 'denied'
                        ? 'text-[#ba1a1a]'
                        : 'text-[#7c5800] dark:text-[#f2be5e]'
                  }
                >
                  {permission === 'granted' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {permission === 'granted'
                    ? tr('مسموح به', 'Granted')
                    : permission === 'denied'
                      ? tr('محظور من المتصفح', 'Blocked')
                      : permission === 'unsupported'
                        ? tr('تنبيه داخل التطبيق فقط', 'In-App Alerts Only')
                        : tr('لم يُطلب بعد', 'Not Requested Yet')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Morning Picker */}
                <div className="rounded-xl bg-white dark:bg-[#0b1f18] border border-slate-200/80 dark:border-white/10 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-bold text-[#0e1d25] dark:text-white flex items-center gap-1.5">
                      <Sun className="w-4 h-4 text-[#b58100]" />
                      <span>{tr('أذكار الصباح', 'Morning Adhkar')}</span>
                    </label>
                    <input
                      type="checkbox"
                      checked={reminderSettings.morningEnabled}
                      onChange={(e) =>
                        onChangeReminderSettings({
                          ...reminderSettings,
                          morningEnabled: e.target.checked,
                        })
                      }
                      aria-label={tr('تفعيل تذكير الصباح', 'Enable Morning Reminder')}
                      className="w-4 h-4 accent-[#006a46] cursor-pointer"
                    />
                  </div>
                  <input
                    type="time"
                    value={reminderSettings.morningTime}
                    disabled={!reminderSettings.morningEnabled}
                    onChange={(e) => {
                      onChangeReminderSettings({
                        ...reminderSettings,
                        morningTime: e.target.value || '06:00',
                        lastMorningNotifiedDate: '',
                      });
                    }}
                    dir="ltr"
                    className="w-full min-h-[40px] px-3 rounded-lg bg-[#f4faff] dark:bg-[#112921] border border-slate-200 dark:border-white/10 text-sm font-bold text-[#0e1d25] dark:text-white disabled:opacity-50"
                  />
                </div>

                {/* Evening Picker */}
                <div className="rounded-xl bg-white dark:bg-[#0b1f18] border border-slate-200/80 dark:border-white/10 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-bold text-[#0e1d25] dark:text-white flex items-center gap-1.5">
                      <Moon className="w-4 h-4 text-[#006389] dark:text-[#80cfff]" />
                      <span>{tr('أذكار المساء', 'Evening Adhkar')}</span>
                    </label>
                    <input
                      type="checkbox"
                      checked={reminderSettings.eveningEnabled}
                      onChange={(e) =>
                        onChangeReminderSettings({
                          ...reminderSettings,
                          eveningEnabled: e.target.checked,
                        })
                      }
                      aria-label={tr('تفعيل تذكير المساء', 'Enable Evening Reminder')}
                      className="w-4 h-4 accent-[#006a46] cursor-pointer"
                    />
                  </div>
                  <input
                    type="time"
                    value={reminderSettings.eveningTime}
                    disabled={!reminderSettings.eveningEnabled}
                    onChange={(e) => {
                      onChangeReminderSettings({
                        ...reminderSettings,
                        eveningTime: e.target.value || '16:30',
                        lastEveningNotifiedDate: '',
                      });
                    }}
                    dir="ltr"
                    className="w-full min-h-[40px] px-3 rounded-lg bg-[#f4faff] dark:bg-[#112921] border border-slate-200 dark:border-white/10 text-sm font-bold text-[#0e1d25] dark:text-white disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={testing}
                  onClick={() => void handleSendTest()}
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-[#ffc968] hover:bg-[#f2be5e] text-[#271900] text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-60"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>{tr('تجربة إشعار الآن', 'Test Notification')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSection('weekly-activity')}
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-white dark:bg-[#0b1f18] border border-slate-200 dark:border-white/10 text-[#006a46] dark:text-[#6cdba6] text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>{tr('عرض النشاط الأسبوعي', 'View Weekly Activity')}</span>
                </button>
              </div>
            </section>

            {/* Appearance & Language */}
            <section className="rounded-2xl bg-[#fffbf2] dark:bg-[#12221c] border border-[#f2be5e]/35 p-4 space-y-3">
              <h3 className="text-xs font-bold text-[#7c5800] dark:text-[#f2be5e]">
                {tr('المظهر ولغة الواجهة', 'Appearance & Language')}
              </h3>

              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    {id: 'system', label: tr('تلقائي', 'Auto'), Icon: Monitor},
                    {id: 'light', label: tr('نهاري', 'Light'), Icon: Sun},
                    {id: 'dark', label: tr('ليلي', 'Dark'), Icon: Moon},
                  ] as const
                ).map(({id, label, Icon}) => {
                  const active = themeMode === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onChangeThemeMode(id)}
                      className={`min-h-[42px] px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                        active
                          ? 'bg-[#006a46] text-white'
                          : 'bg-white dark:bg-[#0a1914] text-[#3e4a42] dark:text-slate-300 border border-slate-200/70 dark:border-white/10'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={onToggleLanguage}
                className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-white dark:bg-[#0a1914] border border-slate-200/80 dark:border-white/10 text-xs font-bold text-[#0e1d25] dark:text-white flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#006a46] dark:text-[#6cdba6]" />
                  <span>{tr('تبديل لغة التطبيق', 'Switch App Language')}</span>
                </span>
                <span className="text-[#006a46] dark:text-[#6cdba6]">{isEn ? 'العربية' : 'English'}</span>
              </button>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
