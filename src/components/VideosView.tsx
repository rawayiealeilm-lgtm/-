import {ArrowLeft, ArrowRight, Archive, ExternalLink, Film, Home} from 'lucide-react';
import {useI18n} from '../utils/i18n';

export function VideosView({
  onOpenArchive,
  onBackHome,
}: {
  onOpenArchive: () => void;
  onBackHome: () => void;
}) {
  const {isEn, tr} = useI18n();
  const DirectionalArrow = isEn ? ArrowRight : ArrowLeft;

  return (
    <div className="py-4 sm:py-8 pb-12">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#006a46] via-[#00583a] to-[#003a26] p-8 sm:p-14 text-white shadow-lg border border-[#ffdea8]/20 text-center">
        {/* Subtle inset hairline framing matching brand card harmony */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-3 sm:inset-4 rounded-2xl border border-[#ffdea8]/20"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-4 sm:inset-5 rounded-xl border border-white/10"
        />

        {/* Lightweight orbital background motif */}
        <div
          aria-hidden="true"
          className="hero-3d-stage pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 opacity-15"
        >
          <div className="hero-3d-ring-outer absolute inset-3 rounded-full border border-[#ffdea8]/75" />
          <div className="hero-3d-ring-inner absolute inset-10 rounded-full border border-dashed border-[#6cdba6]/80" />
        </div>

        <div className="relative z-10 max-w-xl mx-auto flex flex-col items-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-[#ffdea8]/15 border border-[#ffdea8]/40 text-[#ffdea8] flex items-center justify-center icon-3d">
            <Film className="w-8 h-8" />
          </div>

          <div className="space-y-2.5">
            <p className="text-xs sm:text-sm font-semibold text-[#ffdea8]">
              {tr('قسم المقاطع المرئية', 'Video Clips Section')}
            </p>
            <h1
              dir="rtl"
              className="text-xl sm:text-2xl md:text-3xl font-extrabold leading-relaxed text-white"
              style={{textWrap: 'balance'}}
            >
              {tr(
                'قريباً بإذن الله.. يجري تجهيز مكتبة المرئيات العلمية والدعوية',
                'Coming Soon, InshaAllah.. Preparing the Scientific & Dawah Video Library',
              )}
            </h1>
            <p className="text-xs sm:text-sm text-[#e3f3fe]/85 leading-relaxed max-w-md mx-auto">
              {tr(
                'نعمل حالياً على فرز وتوثيق المرئيات والدروس المصورة للعلماء والمشايخ لتقديمها في تجربة مشاهدة هادئة ومنظمة.',
                'We are carefully curating and verifying scholarly video lessons and dawah clips for a calm, organized viewing experience.',
              )}
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3 w-full">
            <button
              type="button"
              onClick={onOpenArchive}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#ffc968] hover:bg-[#f2be5e] text-[#271900] text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <Archive className="w-4 h-4 shrink-0" />
              <span>{tr('تصفح الأرشيف الشامل', 'Browse Comprehensive Archive')}</span>
              <DirectionalArrow className="w-4 h-4 shrink-0" />
            </button>

            <a
              href="https://www.youtube.com/@%D9%85%D9%88%D8%A7%D8%B9%D8%B8%D9%88%D8%B9%D8%A8%D8%B1-%D9%849%D9%88"
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <span>{tr('قناة اليوتيوب الرسمية', 'Official YouTube')}</span>
              <ExternalLink className="w-4 h-4 shrink-0" />
            </a>

            <button
              type="button"
              onClick={onBackHome}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-black/20 hover:bg-black/30 text-[#ffdea8] text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <Home className="w-4 h-4 shrink-0" />
              <span>{tr('العودة للرئيسية', 'Back Home')}</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
