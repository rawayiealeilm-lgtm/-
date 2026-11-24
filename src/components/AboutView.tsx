import {
  Award,
  BookOpen,
  Clock,
  Heart,
  HeartHandshake,
  LayoutGrid,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type {SiteConfig} from '../types';
import {useI18n} from '../utils/i18n';

export function AboutView({
  siteConfig,
  onGoSupport,
}: {
  siteConfig: SiteConfig;
  onGoSupport: () => void;
}) {
  const {tr, isEn} = useI18n();

  return (
    <div className="space-y-6 pb-8">
      <section className="rounded-3xl bg-gradient-to-br from-[#006a46] via-[#008559] to-[#005235] p-6 sm:p-8 text-white shadow-md space-y-3">
        <span className="text-xs font-semibold text-[#ffdea8]">
          {tr('رسالتنا ومسيرتنا الدعوية', 'Our Mission & Journey')}
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold">
          {isEn ? 'About Mawaedh & Ibar' : siteConfig.aboutTitle}
        </h1>
        <p className="text-sm sm:text-base text-white/90 max-w-3xl leading-relaxed">
          {isEn
            ? 'An authentic, serene digital sanctuary curating trusted scholarly Fatawa, Quranic recitation, Prophetic Adhkar, and timeless wisdom since 2015.'
            : siteConfig.aboutSubtitle}
        </p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <section className="card-3d lg:col-span-7 rounded-3xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-3">
            <div className="icon-3d w-10 h-10 rounded-2xl bg-[#008559] text-white flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0e1d25] dark:text-white">
                {tr('بذرة النور والبداية', 'Seed of Light & Foundation')}
              </h2>
              <p className="text-xs text-[#6e7a71] dark:text-slate-400">
                {tr('أصالة المنطلق وطيب الأثر', 'Authentic roots and lasting impact')}
              </p>
            </div>
          </div>

          <p className="text-sm sm:text-base text-[#3e4a42] dark:text-slate-300 leading-relaxed">
            {isEn ? (
              <>
                <strong className="text-[#006a46] dark:text-[#6cdba6]">Mawaedh & Ibar</strong> began in 2015 as a pure
                faith-based initiative devoted to bringing timeless sermons, wisdom of the righteous predecessors, and
                Quranic reflections closer to hearts everywhere.
              </>
            ) : (
              <>
                انطلقت فكرة <strong className="text-[#006a46] dark:text-[#6cdba6]">«مواعظ وعبر»</strong> في عام
                2015م كمشروع وبذرة دعوية وإيمانية نقية، تهدف لتقريب المواعظ وحِكَم السلف والفوائد القرآنية والتربوية
                لقلوب المسلمين في كل مكان بأسلوب رائق عذب.
              </>
            )}
          </p>

          <div className="bg-[#e8f6ff] dark:bg-[#112921] rounded-2xl p-4.5 flex items-start gap-3">
            <div className="icon-3d w-9 h-9 rounded-xl bg-[#ffdea8] text-[#271900] flex items-center justify-center shrink-0 mt-0.5">
              <Award className="w-5 h-5" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm sm:text-base font-bold text-[#0e1d25] dark:text-white">
                {tr('ارتباطنا بمجموعة الفرسان الدعوية', 'Our Roots with Al-Fursan Dawah Group')}
              </h3>
              <p className="text-sm text-[#3e4a42] dark:text-slate-300 leading-relaxed">
                {isEn
                  ? 'Our outreach started under the blessed Al-Fursan Dawah Group. Through resilient backup channels and modern technology, Mawaedh & Ibar continued uninterrupted—culminating in this comprehensive web & mobile platform.'
                  : 'بدأت المسيرة تحت مظلة «مجموعة الفرسان الدعوية» المباركة؛ والتي توقفت أنشطتها مؤقتاً لظروف خاصة، مع التطلع والعزم الراسخ على معاودة بثها وعطائها الرائد بإذن الله في المستقبل القريب. ومن تلك الروح الثابتة، واصلت منصة «مواعظ وعبر» رسالتها السامية دون انقطاع عبر منصات بديلة، ليتوج هذا المسار بتدشين هذا التطبيق الشامل.'}
              </p>
            </div>
          </div>
        </section>

        <section className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-bold text-[#0e1d25] dark:text-white">
              {tr('ركائز وثوابت رسالتنا', 'Core Pillars of Our Mission')}
            </h2>
            <span className="text-xs font-semibold text-[#006a46] dark:text-[#6cdba6]">
              {tr('قيم راسخة', 'Enduring Values')}
            </span>
          </div>
          {[
            {
              title: tr('الأصالة والتوثيق', 'Authenticity & Verification'),
              body: tr(
                'اعتماد صحيح النقول وأقوال أئمة الهدى والسلف الصالح بتثبت فائق، وعناية تامة بسلامة المنهج.',
                'Grounded strictly in verified Quranic, Prophetic, and trusted scholarly citations.',
              ),
              Icon: BookOpen,
              tone: 'bg-[#006a46]/10 text-[#006a46] dark:text-[#6cdba6]',
            },
            {
              title: tr('الثبات والاستمرار', 'Resilience & Continuity'),
              body: tr(
                'تجاوز العقبات الرقمية وبناء شبكات وقنوات بديلة مرنة تضمن استدامة وصول النور الإيماني.',
                'Flexible backup channels and offline-ready PWA delivery ensure uninterrupted access.',
              ),
              Icon: ShieldCheck,
              tone: 'bg-[#7c5800]/15 text-[#7c5800] dark:text-[#f2be5e]',
            },
            {
              title: tr('النقاء والاحتساب', 'Purity of Intention'),
              body: tr(
                'عمل دعوي تطوعي خالص لوجه الله الكريم، لا نبتغي به جاهاً ولا شهرة، بل صدقةً جارية تنفع الأمة.',
                '100% non-commercial, ad-free ongoing charity dedicated purely for Allah.',
              ),
              Icon: Heart,
              tone: 'bg-[#006389]/10 text-[#006389] dark:text-[#80cfff]',
            },
            {
              title: tr('تصميم عصري ميسّر لتطلعات العصر', 'Modern & Accessible Design'),
              body: isEn
                ? 'Fast, responsive bilingual interface with calm reading modes across desktop and mobile.'
                : siteConfig.modernUxClause,
              Icon: LayoutGrid,
              tone: 'bg-[#006a46]/10 text-[#006a46] dark:text-[#6cdba6]',
            },
          ].map((item) => {
            const Icon = item.Icon;
            return (
              <div
                key={item.title}
                className="card-3d rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-4 shadow-xs flex items-start gap-3.5"
              >
                <div className={`icon-3d w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${item.tone}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#0e1d25] dark:text-white">{item.title}</h3>
                  <p className="text-xs sm:text-sm text-[#3e4a42] dark:text-slate-300 mt-1 leading-relaxed">
                    {item.body}
                  </p>
                </div>
              </div>
            );
          })}
        </section>
      </div>

      <section className="rounded-3xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#0e1d25] dark:text-white">
            {tr('محطات من رحلتنا', 'Key Milestones')}
          </h2>
          <span className="text-xs font-semibold text-[#6e7a71] dark:text-slate-400">
            {tr('2015 - الآن', '2015 – Present')}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[
            {
              year: tr('2015 م · البذرة الأولى', '2015 · The First Seed'),
              badge: tr('١٥', '15'),
              color: 'bg-[#006a46] text-white',
              text: tr(
                'بداية الغرس الدعوي ونشر الفوائد والبطاقات اليومية ضمن منظومة مجموعة الفرسان الدعوية.',
                'Initial Dawah outreach sharing daily wisdom cards under Al-Fursan Dawah Group.',
              ),
            },
            {
              year: tr('2018 - 2021 م · اتساع الروافد', '2018–2021 · Growing Channels'),
              badge: tr('١٨', '18'),
              color: 'bg-[#7c5800] text-white',
              text: tr(
                'التوسع عبر قنوات تيليجرام ويوتيوب وإكس، وإطلاق السلاسل الوعظية المرئية.',
                'Expanded across Telegram, YouTube, and X with structured video & audio series.',
              ),
            },
            {
              year: tr('2023 م · ثبات وتأسيس البدائل', '2023 · Resilient Network'),
              badge: tr('٢٣', '23'),
              color: 'bg-[#006389] text-white',
              text: tr(
                'إعادة هيكلة وتأسيس شبكة القنوات البديلة مع الحفاظ على الأرشيف العلمي كاملاً دون انقطاع.',
                'Built backup broadcasting channels preserving the entire scholarly archive.',
              ),
            },
            {
              year: tr('اليوم · التطبيق الجامع', 'Today · Unified Global Platform'),
              badge: tr('الآن', 'Now'),
              color: 'bg-[#008559] text-white',
              text: tr(
                'إطلاق تطبيق «مواعظ وعبر» الرقمي الموحد للخواطر والتسجيلات الصوتية وفتاوى العلماء.',
                'Launching the bilingual PWA unifying Quran, Adhkar, global Fatawa, and scholarly portals.',
              ),
            },
          ].map((stage) => (
            <div
              key={stage.year}
              className="card-3d rounded-2xl bg-[#e8f6ff] dark:bg-[#112921] p-4 space-y-2.5 flex flex-col justify-between"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${stage.color}`}
                >
                  {stage.badge}
                </span>
                <h3 className="text-sm font-bold text-[#0e1d25] dark:text-white">{stage.year}</h3>
              </div>
              <p className="text-xs sm:text-sm text-[#3e4a42] dark:text-slate-300 leading-relaxed">{stage.text}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <div className="lg:col-span-4 grid grid-cols-2 lg:grid-cols-1 gap-3.5">
          <div className="card-3d rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-5 text-center flex flex-col items-center justify-center">
            <Clock className="w-6 h-6 text-[#006a46] dark:text-[#6cdba6] mb-2" />
            <span className="text-2xl font-bold text-[#006a46] dark:text-[#6cdba6] tabular-nums">
              {tr('+10 أعوام', '10+ Years')}
            </span>
            <span className="text-xs text-[#6e7a71] dark:text-slate-400 mt-1">
              {tr('من البث والتذكير المستمر', 'Continuous beneficial outreach')}
            </span>
          </div>
          <div className="card-3d rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-5 text-center flex flex-col items-center justify-center">
            <Sparkles className="w-6 h-6 text-[#7c5800] dark:text-[#f2be5e] mb-2" />
            <span className="text-xl font-bold text-[#7c5800] dark:text-[#f2be5e]">
              {tr('محتوى موثق', 'Verified Sources')}
            </span>
            <span className="text-xs text-[#6e7a71] dark:text-slate-400 mt-1">
              {tr('مواعظ وتلاوات وفتاوى منتقاة', 'Sermons, Quran, and Fatawa')}
            </span>
          </div>
        </div>

        <section className="card-3d lg:col-span-8 rounded-3xl bg-[#23323b] dark:bg-[#0b231b] text-white p-6 shadow-md flex flex-col justify-between space-y-4">
          <div className="flex items-center gap-3">
            <div className="icon-3d w-11 h-11 rounded-full bg-[#7c5800]/40 text-[#ffdea8] flex items-center justify-center shrink-0">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {tr('كن شريكاً في الأجر واستمرار الرسالة', 'Partner With Us in Spreading Goodness')}
              </h2>
              <p className="text-xs text-slate-300">
                {tr(
                  'نستقبل مقترحاتكم وطلبات التطوع في المراجعة والنشر والتصميم',
                  'We welcome suggestions and volunteers for verification, publishing, and design',
                )}
              </p>
            </div>
          </div>

          <p className="text-sm text-slate-200 leading-relaxed">
            {tr(
              'تبقى منصتنا قائمةً بإذن الله ثم بدعائكم الصالح، ونشر الكلمة الطيبة، ومشاركة فريقنا المتطوع في خدمة المحتوى الإيماني الموثق.',
              'This platform thrives by Allah’s grace, your sincere prayers, and sharing verified beneficial knowledge.',
            )}
          </p>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onGoSupport}
              className="min-h-[48px] px-6 py-2.5 rounded-xl bg-[#ffc968] hover:bg-[#f2be5e] text-[#271900] text-sm font-bold transition-colors"
            >
              {tr('المساهمة والمقترحات والتطوع', 'Contribute, Suggest & Volunteer')}
            </button>
          </div>
        </section>
      </div>

      <p className="text-xs text-[#6e7a71] dark:text-slate-400 text-center pt-1">
        {tr('بإشراف ومتابعة فريق مواعظ وعبر', 'Supervised by Mawaedh & Ibar Team')}
      </p>
    </div>
  );
}

