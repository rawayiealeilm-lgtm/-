import {ChevronUp, Monitor, Moon, RotateCcw, Sun, Type, X} from 'lucide-react';
import {useState} from 'react';
import {useI18n} from '../utils/i18n';
import {
  DEFAULT_READING_PREFS,
  FONT_FAMILY_OPTIONS,
  FONT_SIZE_STEPS,
  type ReadingFontFamily,
  type ReadingFontSize,
  type ReadingThemeMode,
} from '../utils/readingPrefs';

export function FloatingReadingBar({
  fontSize,
  fontFamily,
  readingTheme,
  onChangeFontSize,
  onChangeFontFamily,
  onChangeReadingTheme,
  allowedFamilies,
  contextLabel,
}: {
  fontSize: ReadingFontSize;
  fontFamily: ReadingFontFamily;
  readingTheme: ReadingThemeMode;
  onChangeFontSize: (size: ReadingFontSize) => void;
  onChangeFontFamily: (family: ReadingFontFamily) => void;
  onChangeReadingTheme: (theme: ReadingThemeMode) => void;
  allowedFamilies?: ReadingFontFamily[];
  contextLabel?: string;
}) {
  const {tr} = useI18n();
  const [expanded, setExpanded] = useState(false);

  const resolvedContextLabel = contextLabel || tr('أدوات القراءة المريحة', 'Reading Controls');

  const families = allowedFamilies
    ? FONT_FAMILY_OPTIONS.filter((f) => allowedFamilies.includes(f.id))
    : FONT_FAMILY_OPTIONS;

  const currentIdx = FONT_SIZE_STEPS.findIndex((s) => s.id === fontSize);
  const activeSizeMeta = FONT_SIZE_STEPS[currentIdx] || FONT_SIZE_STEPS[1];

  const stepDown = () => {
    if (currentIdx > 0) onChangeFontSize(FONT_SIZE_STEPS[currentIdx - 1].id);
  };

  const stepUp = () => {
    if (currentIdx < FONT_SIZE_STEPS.length - 1) onChangeFontSize(FONT_SIZE_STEPS[currentIdx + 1].id);
  };

  const cycleReadingTheme = () => {
    const next: ReadingThemeMode =
      readingTheme === 'follow' ? 'dark' : readingTheme === 'dark' ? 'light' : 'follow';
    onChangeReadingTheme(next);
  };

  const isForcedDark = readingTheme === 'dark';
  const isForcedLight = readingTheme === 'light';

  const dockSurfaceClass = isForcedDark
    ? 'bg-[#071913]/95 text-[#e6f5ee] border-emerald-700/45 shadow-2xl'
    : isForcedLight
      ? 'bg-[#fffdf8]/95 text-[#0e1d25] border-[#d6c9a5] shadow-2xl'
      : 'bg-white/95 dark:bg-[#081a14]/95 text-[#0e1d25] dark:text-[#e3f3fe] border-slate-200/90 dark:border-white/15 shadow-2xl';

  const subtleChipClass = isForcedDark
    ? 'bg-white/10 hover:bg-white/15 text-[#e6f5ee]'
    : isForcedLight
      ? 'bg-[#f4efe1] hover:bg-[#ebe3ce] text-[#1b241f]'
      : 'bg-[#e8f6ff] hover:bg-[#d5ecfb] dark:bg-[#112921] dark:hover:bg-[#16352b] text-[#0e1d25] dark:text-[#e3f3fe]';

  const mutedTextClass = isForcedDark
    ? 'text-emerald-200/75'
    : isForcedLight
      ? 'text-[#5b665f]'
      : 'text-[#6e7a71] dark:text-slate-400';

  const themeBadgeLabel =
    readingTheme === 'dark'
      ? tr('ليلي مستقل', 'Reader Night')
      : readingTheme === 'light'
        ? tr('نهاري مريح', 'Reader Light')
        : tr('تلقائي', 'Auto');

  return (
    <div
      className="fixed bottom-[112px] lg:bottom-12 left-1/2 -translate-x-1/2 z-40 w-[min(94vw,540px)] pointer-events-none"
      aria-label={tr('شريط التحكم العائم للقراءة', 'Floating Reading Bar')}
    >
      <div className="flex flex-col items-center gap-2 pointer-events-auto">
        {expanded && (
          <div
            className={`w-full rounded-2xl border backdrop-blur-xl p-4 space-y-3.5 transition-all ${dockSurfaceClass}`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#006a46] dark:text-[#6cdba6]">
                <Type className="w-4 h-4 shrink-0" />
                <span className={isForcedDark ? 'text-[#6cdba6]' : isForcedLight ? 'text-[#006a46]' : ''}>
                  {resolvedContextLabel}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {(fontSize !== DEFAULT_READING_PREFS.fontSize ||
                  fontFamily !== (families[0]?.id || DEFAULT_READING_PREFS.fontFamily) ||
                  readingTheme !== 'follow') && (
                  <button
                    type="button"
                    onClick={() => {
                      onChangeFontSize(DEFAULT_READING_PREFS.fontSize);
                      onChangeFontFamily(families[0]?.id || DEFAULT_READING_PREFS.fontFamily);
                      onChangeReadingTheme('follow');
                    }}
                    className={`text-[11px] font-bold flex items-center gap-1 px-2 py-1 rounded-lg ${subtleChipClass}`}
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{tr('افتراضي', 'Reset')}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  aria-label={tr('إغلاق الخيارات الموسعة', 'Close reading panel')}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${subtleChipClass}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className={`text-[11px] font-bold block ${mutedTextClass}`}>
                {tr('وضع القراءة المستقل (لا يرتبط بإعدادات النظام)', 'Independent Reading Mode (separate from OS)')}
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    {id: 'follow', label: tr('حسب التطبيق', 'Follow App'), Icon: Monitor},
                    {id: 'light', label: tr('نهاري مريح', 'Reader Light'), Icon: Sun},
                    {id: 'dark', label: tr('ليلي للقراءة', 'Reader Night'), Icon: Moon},
                  ] as const
                ).map(({id, label, Icon}) => {
                  const active = readingTheme === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onChangeReadingTheme(id)}
                      className={`min-h-[40px] px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                        active ? 'bg-[#006a46] text-white shadow-xs' : subtleChipClass
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className={mutedTextClass}>{tr('حجم الخط', 'Font Size')}</span>
                <span className={isForcedDark ? 'text-[#6cdba6]' : 'text-[#006a46] dark:text-[#6cdba6]'}>
                  {activeSizeMeta.label}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {FONT_SIZE_STEPS.map((step) => {
                  const active = fontSize === step.id;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onChangeFontSize(step.id)}
                      className={`min-h-[38px] rounded-xl text-xs font-bold transition-colors ${
                        active ? 'bg-[#006a46] text-white shadow-xs' : subtleChipClass
                      }`}
                    >
                      {step.shortLabel}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className={`text-[11px] font-bold block ${mutedTextClass}`}>
                {tr('نوع الخط العربي', 'Arabic Font Style')}
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {families.map((fam) => {
                  const active = fontFamily === fam.id;
                  return (
                    <button
                      key={fam.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onChangeFontFamily(fam.id)}
                      style={{fontFamily: fam.cssFamily}}
                      className={`min-h-[38px] px-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                        active ? 'bg-[#006a46] text-white shadow-xs' : subtleChipClass
                      }`}
                    >
                      {fam.shortLabel}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div
          className={`w-full sm:w-auto rounded-2xl border backdrop-blur-xl px-2.5 py-2 flex items-center justify-between gap-2 transition-all ${dockSurfaceClass}`}
        >
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={stepDown}
              disabled={currentIdx <= 0}
              aria-label={tr('تصغير الخط', 'Decrease Font Size')}
              className={`min-w-[40px] min-h-[40px] rounded-xl text-xs font-bold disabled:opacity-40 transition-colors ${subtleChipClass}`}
            >
              {tr('أ-', 'A-')}
            </button>
            <span className="px-2 text-xs font-bold whitespace-nowrap tabular-nums">{activeSizeMeta.shortLabel}</span>
            <button
              type="button"
              onClick={stepUp}
              disabled={currentIdx >= FONT_SIZE_STEPS.length - 1}
              aria-label={tr('تكبير الخط', 'Increase Font Size')}
              className={`min-w-[40px] min-h-[40px] rounded-xl text-xs font-bold disabled:opacity-40 transition-colors ${subtleChipClass}`}
            >
              {tr('أ+', 'A+')}
            </button>
          </div>

          <div className="h-5 w-px bg-current opacity-15 shrink-0" aria-hidden="true" />

          <button
            type="button"
            onClick={cycleReadingTheme}
            aria-label={tr('تبديل الوضع الليلي للقراءة بشكل مستقل', 'Toggle independent reading theme')}
            className={`min-h-[40px] px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              readingTheme === 'dark'
                ? 'bg-[#006a46] text-white'
                : readingTheme === 'light'
                  ? 'bg-[#ffdea8] text-[#271900]'
                  : subtleChipClass
            }`}
          >
            {readingTheme === 'dark' ? (
              <Moon className="w-3.5 h-3.5 shrink-0" />
            ) : readingTheme === 'light' ? (
              <Sun className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <Monitor className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>{themeBadgeLabel}</span>
          </button>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className={`min-h-[40px] px-3 rounded-xl text-xs font-bold flex items-center gap-1 whitespace-nowrap transition-colors ${
              expanded ? 'bg-[#006a46] text-white' : subtleChipClass
            }`}
          >
            <Type className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">{tr('الخط والوضع', 'Font & Mode')}</span>
            <ChevronUp className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
}

