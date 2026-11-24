import {RotateCcw, Type} from 'lucide-react';
import {useI18n} from '../utils/i18n';
import {
  DEFAULT_READING_PREFS,
  FONT_FAMILY_OPTIONS,
  FONT_SIZE_STEPS,
  type ReadingFontFamily,
  type ReadingFontSize,
} from '../utils/readingPrefs';

export function ReadingControlsBar({
  fontSize,
  fontFamily,
  onChangeFontSize,
  onChangeFontFamily,
  allowedFamilies,
  compact = false,
  title,
}: {
  fontSize: ReadingFontSize;
  fontFamily: ReadingFontFamily;
  onChangeFontSize: (size: ReadingFontSize) => void;
  onChangeFontFamily: (family: ReadingFontFamily) => void;
  allowedFamilies?: ReadingFontFamily[];
  compact?: boolean;
  title?: string;
}) {
  const {tr} = useI18n();
  const resolvedTitle = title || tr('تخصيص خط وحجم القراءة لجميع الأعمار', 'Customize Reading Font & Size');
  const families = allowedFamilies
    ? FONT_FAMILY_OPTIONS.filter((f) => allowedFamilies.includes(f.id))
    : FONT_FAMILY_OPTIONS;

  const activeSizeMeta = FONT_SIZE_STEPS.find((s) => s.id === fontSize) || FONT_SIZE_STEPS[1];
  const currentIdx = FONT_SIZE_STEPS.findIndex((s) => s.id === fontSize);

  const stepDown = () => {
    if (currentIdx > 0) onChangeFontSize(FONT_SIZE_STEPS[currentIdx - 1].id);
  };

  const stepUp = () => {
    if (currentIdx < FONT_SIZE_STEPS.length - 1) onChangeFontSize(FONT_SIZE_STEPS[currentIdx + 1].id);
  };

  return (
    <div
      className={`rounded-2xl bg-[#f4faff] dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 ${
        compact ? 'p-3.5 space-y-3' : 'p-4 sm:p-5 space-y-3.5'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#006a46] dark:text-[#6cdba6]">
          <Type className="w-4 h-4 shrink-0" />
          <span>{resolvedTitle}</span>
        </div>

        {(fontSize !== DEFAULT_READING_PREFS.fontSize || fontFamily !== families[0]?.id) && (
          <button
            type="button"
            onClick={() => {
              onChangeFontSize(DEFAULT_READING_PREFS.fontSize);
              onChangeFontFamily(families[0]?.id || DEFAULT_READING_PREFS.fontFamily);
            }}
            className="text-xs font-semibold text-[#6e7a71] dark:text-slate-400 hover:text-[#006a46] dark:hover:text-[#6cdba6] flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{tr('افتراضي', 'Reset')}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
        {/* Font Size 5-Step Control */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-[#3e4a42] dark:text-slate-300">
            <span>{tr('حجم الخط', 'Font Size')}</span>
            <span className="text-[#006a46] dark:text-[#6cdba6]">{activeSizeMeta.label}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white dark:bg-[#112921] border border-slate-200/70 dark:border-white/10 rounded-xl p-1">
            <button
              type="button"
              onClick={stepDown}
              disabled={currentIdx <= 0}
              aria-label={tr('تصغير الخط', 'Decrease Font Size')}
              className="min-w-[40px] min-h-[38px] rounded-lg bg-[#e8f6ff] dark:bg-white/10 text-[#0e1d25] dark:text-white text-xs font-bold disabled:opacity-40 transition-colors"
            >
              {tr('أ-', 'A-')}
            </button>

            <div className="flex-1 grid grid-cols-5 gap-1">
              {FONT_SIZE_STEPS.map((step) => {
                const active = fontSize === step.id;
                return (
                  <button
                    key={step.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onChangeFontSize(step.id)}
                    title={step.label}
                    className={`min-h-[38px] rounded-lg text-[11px] font-bold transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-[#006a46] text-white shadow-xs'
                        : 'text-[#3e4a42] dark:text-slate-300 hover:bg-[#e8f6ff] dark:hover:bg-white/5'
                    }`}
                  >
                    {step.shortLabel}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={stepUp}
              disabled={currentIdx >= FONT_SIZE_STEPS.length - 1}
              aria-label={tr('تكبير الخط', 'Increase Font Size')}
              className="min-w-[40px] min-h-[38px] rounded-lg bg-[#e8f6ff] dark:bg-white/10 text-[#0e1d25] dark:text-white text-xs font-bold disabled:opacity-40 transition-colors"
            >
              {tr('أ+', 'A+')}
            </button>
          </div>
        </div>

        {/* Font Family Selector */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-[#3e4a42] dark:text-slate-300 block">
            {tr('نوع الخط العربي', 'Arabic Font Style')}
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar bg-white dark:bg-[#112921] border border-slate-200/70 dark:border-white/10 rounded-xl p-1">
            {families.map((fam) => {
              const active = fontFamily === fam.id;
              return (
                <button
                  key={fam.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChangeFontFamily(fam.id)}
                  style={{fontFamily: fam.cssFamily}}
                  className={`flex-1 min-h-[38px] px-2.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                    active
                      ? 'bg-[#006a46] text-white shadow-xs'
                      : 'text-[#3e4a42] dark:text-slate-300 hover:bg-[#e8f6ff] dark:hover:bg-white/5'
                  }`}
                >
                  {fam.shortLabel}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
