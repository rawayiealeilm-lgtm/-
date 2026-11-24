import {
  Award,
  BookOpen,
  ClipboardList,
  Clock,
  Copy,
  Eye,
  Globe,
  Heart,
  HeartHandshake,
  Info,
  LayoutGrid,
  MousePointerClick,
  Search,
  Share2,
  Shield,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import {useCallback, useEffect, useState, type FormEvent} from 'react';
import type {SiteConfig, VisitorProfile, VisitorTicketSummary} from '../types';
import {useI18n} from '../utils/i18n';
import {getPublicSiteUrl} from '../utils/storage';

type UnifiedSubTab = 'about' | 'support' | 'share' | 'disclaimer';

export function AboutSupportShareView({
  siteConfig,
  visitor = null,
  visitorsCount = 0,
  onlineVisitorsCount = 1,
  clicksCount = 0,
  motherPrayersCount = 0,
  initialSubTab = 'about',
  onMessageSubmitted,
  onOpenAdminShield,
  onNotify,
}: {
  siteConfig: SiteConfig;
  visitor?: VisitorProfile | null;
  visitorsCount?: number;
  onlineVisitorsCount?: number;
  clicksCount?: number;
  motherPrayersCount?: number;
  initialSubTab?: UnifiedSubTab;
  onMessageSubmitted?: () => void;
  onOpenAdminShield?: () => void;
  onNotify: (msg: string) => void;
}) {
  const {tr, isEn, formatNumber} = useI18n();
  const [subTab, setSubTab] = useState<UnifiedSubTab>(initialSubTab);

  // Support / Suggestions / Team Join state
  const [supportFormTab, setSupportFormTab] = useState<'ideas' | 'volunteer' | 'impact'>('ideas');
  const [sugType, setSugType] = useState('preach');
  const [sugName, setSugName] = useState(visitor?.name || '');
  const [sugText, setSugText] = useState('');
  const [sugContact, setSugContact] = useState(visitor?.email || '');
  const [sugWhatsapp, setSugWhatsapp] = useState(visitor?.whatsapp || '');
  const [sugSubmitting, setSugSubmitting] = useState(false);

  const [volName, setVolName] = useState(visitor?.name || '');
  const [volField, setVolField] = useState('التدقيق اللغوي والشرعي وتخريج الأحاديث');
  const [volHours, setVolHours] = useState('2-4');
  const [volSkills, setVolSkills] = useState('');
  const [volContact, setVolContact] = useState(visitor?.email || '');
  const [volWhatsapp, setVolWhatsapp] = useState(visitor?.whatsapp || '');
  const [volSubmitting, setVolSubmitting] = useState(false);

  const [lastIssuedTicket, setLastIssuedTicket] = useState<string | null>(null);
  const [ticketQuery, setTicketQuery] = useState('');
  const [tickets, setTickets] = useState<VisitorTicketSummary[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  const loadTickets = useCallback(
    async (qStr = '') => {
      setLoadingTickets(true);
      try {
        const endpoint = qStr.trim()
          ? `/api/tickets/track?q=${encodeURIComponent(qStr.trim())}`
          : visitor?.id
            ? `/api/visitor/${encodeURIComponent(visitor.id)}/tickets`
            : `/api/tickets/track`;
        const res = await fetch(endpoint, {cache: 'no-store'});
        if (res.ok) {
          const data = (await res.json()) as {tickets?: VisitorTicketSummary[]};
          setTickets(Array.isArray(data.tickets) ? data.tickets : []);
        }
      } catch {
        // Ignore offline failure
      } finally {
        setLoadingTickets(false);
      }
    },
    [visitor?.id],
  );

  useEffect(() => {
    void loadTickets('');
  }, [loadTickets]);

  const submitSuggestion = async (e: FormEvent) => {
    e.preventDefault();
    if (!sugText.trim()) return;
    setSugSubmitting(true);
    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          type: sugType,
          senderName: sugName.trim() || undefined,
          text: sugText.trim(),
          contact: sugContact.trim() || undefined,
          visitorWhatsapp: sugWhatsapp.trim() || undefined,
          visitorId: visitor?.id,
          source: 'support_page',
        }),
      });
      const data = (await res.json()) as {ticketNumber?: string};
      if (!res.ok) throw new Error();
      setSugText('');
      if (data.ticketNumber) {
        setLastIssuedTicket(data.ticketNumber);
      }
      onMessageSubmitted?.();
      void loadTickets(ticketQuery);
      onNotify(
        `تم إرسال طلبك بنجاح برقم متابعة ${data.ticketNumber || '#REQ'} مع إشعار فوري للإدارة`,
      );
    } catch {
      onNotify(tr('تعذر إرسال الرسالة حالياً، حاول لاحقاً', 'Unable to send right now.'));
    } finally {
      setSugSubmitting(false);
    }
  };

  const submitVolunteer = async (e: FormEvent) => {
    e.preventDefault();
    if (!volSkills.trim() || !volContact.trim()) {
      onNotify(tr('يرجى كتابة مهاراتك وبيانات التواصل', 'Please enter your skills and contact details.'));
      return;
    }
    setVolSubmitting(true);
    try {
      const res = await fetch('/api/volunteers', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          senderName: volName.trim() || undefined,
          field: volField,
          hours: volHours,
          skills: volSkills.trim(),
          contact: volContact.trim(),
          visitorWhatsapp: volWhatsapp.trim() || undefined,
          visitorId: visitor?.id,
          source: 'support_page',
        }),
      });
      const data = (await res.json()) as {ticketNumber?: string};
      if (!res.ok) throw new Error();
      setVolSkills('');
      if (data.ticketNumber) {
        setLastIssuedTicket(data.ticketNumber);
      }
      onMessageSubmitted?.();
      void loadTickets(ticketQuery);
      onNotify(
        `تم تسجيل طلبك برقم متابعة ${data.ticketNumber || '#REQ'} وإحالته لفريق الإدارة بنجاح`,
      );
    } catch {
      onNotify(tr('تعذر إرسال الطلب حالياً', 'Unable to submit request right now.'));
    } finally {
      setVolSubmitting(false);
    }
  };

  const publicAppUrl = getPublicSiteUrl();
  const shareMessage = `🌿 *${siteConfig.appName}* — ${siteConfig.appTagline}\n\n📖 القرآن الكريم كاملاً · الأذكار والأدعية الجامعة · فتاوى أهل العلم · مكتبة الشيخ يحيى الحجوري والأئمة الكبار · قسم الصم والبكم · واحة الداعية الفاضلة أمي.\n\n🔗 ${publicAppUrl}`;

  const handleShareApp = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: siteConfig.appName,
          text: shareMessage,
          url: publicAppUrl,
        });
        return;
      } catch {
        // Fallback to copy
      }
    }
    try {
      await navigator.clipboard.writeText(shareMessage);
      onNotify(tr('تم نسخ رابط ورسالة التطبيق للمشاركة', 'App link and invitation copied!'));
    } catch {
      onNotify(tr('رابط التطبيق جاهز للمشاركة', 'Link ready to share'));
    }
  };

  const handleCopyLinkOnly = async () => {
    try {
      await navigator.clipboard.writeText(publicAppUrl);
      onNotify(tr('تم نسخ رابط الموقع بنجاح', 'Site URL copied!'));
    } catch {
      onNotify(publicAppUrl);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Unified Header Banner */}
      <section className="rounded-3xl bg-gradient-to-br from-[#006a46] via-[#008559] to-[#005235] p-6 sm:p-8 text-white shadow-md space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#ffdea8]">
          <HeartHandshake className="w-4 h-4 shrink-0" />
          <span>{tr('قسم موحّد · مسيرتنا والدعم والمشاركة والمنهجية', 'Unified Hub · About, Support & Sharing')}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold">
          {tr('عن الموقع والدعم والمشاركة', 'About, Support & Share')}
        </h1>
        <p className="text-sm sm:text-base text-white/90 max-w-3xl leading-relaxed">
          {tr(
            'تعرّف على رسالة منصة «مواعظ وعبر» منذ عام ٢٠١٥م، وأرسل مقترحاتك أو طلبات الانضمام مع متابعة التذاكر (#REQ)، وشارك التطبيق مع أحبتك بخصوصية تامة وأمان.',
            'Learn about Mawaedh & Ibar since 2015, submit proposals or team requests with #REQ ticket tracking, review our scholarly principles, and share the app privately.',
          )}
        </p>

        {/* Sub-section Navigation */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          {(
            [
              {id: 'about', label: tr('من نحن ومسيرتنا', 'About Us'), Icon: Info},
              {id: 'support', label: tr('الدعم والاقتراحات (#REQ)', 'Support & Tickets'), Icon: ClipboardList},
              {id: 'share', label: tr('مشاركة التطبيق', 'Share App'), Icon: Share2},
              {id: 'disclaimer', label: tr('التنويه العلمي والحقوق', 'Disclaimer & Rights'), Icon: ShieldCheck},
            ] as const
          ).map((item) => {
            const Icon = item.Icon;
            const active = subTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSubTab(item.id)}
                className={`min-h-[42px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors ${
                  active
                    ? 'bg-[#ffdea8] text-[#271900] shadow-xs'
                    : 'bg-white/15 hover:bg-white/25 text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Sub-Tab 1: About Us */}
      {subTab === 'about' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <section className="card-3d lg:col-span-7 rounded-3xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-6 shadow-xs space-y-5">
              <div className="flex items-center gap-3">
                <div className="icon-3d w-10 h-10 rounded-2xl bg-[#008559] text-white flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#0e1d25] dark:text-white">
                    {tr('بذرة النور والبداية منذ عام ٢٠١٥م', 'Seed of Light Since 2015')}
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
                    ٢٠١٥م كمشروع وبذرة دعوية وإيمانية نقية، تهدف لتقريب المواعظ وحِكَم السلف والفوائد القرآنية والتربوية
                    لقلوب المسلمين في كل مكان بأسلوب رائق عذب خالٍ من التعصب والحزبية.
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
                      ? 'Our outreach started under the blessed Al-Fursan Dawah Group and continued into this comprehensive platform serving Quran, authentic Adhkar, scholarly Fatawa, and accessible guidance.'
                      : 'بدأت المسيرة تحت مظلة «مجموعة الفرسان الدعوية» المباركة، ومن تلك الروح الثابتة واصلت منصة «مواعظ وعبر» رسالتها عبر شبكة القنوات حتى تكللت بهذا التطبيق الرقمي الجامع والمجاني تماماً لوجه الله تعالى.'}
                  </p>
                </div>
              </div>
            </section>

            <section className="lg:col-span-5 space-y-3">
              {[
                {
                  title: tr('الأصالة والتوثيق العلمي', 'Authenticity & Verification'),
                  body: tr(
                    'اعتماد صحيح النقول وأقوال أئمة الهدى والسلف الصالح بتثبت فائق وعناية بسلامة المنهج.',
                    'Strictly grounded in Quran, authentic Sunnah, and trusted Salafi scholars.',
                  ),
                  Icon: BookOpen,
                  tone: 'bg-[#006a46]/10 text-[#006a46] dark:text-[#6cdba6]',
                },
                {
                  title: tr('الخصوصية التامة والأمان', 'Full Privacy & Trust'),
                  body: tr(
                    'التواصل المباشر وتقديم المقترحات يتم بسرية وأرقام متابعة رسمية (#REQ) دون كشف بيانات شخصية.',
                    'All inquiries use protected request tickets (#REQ) with complete privacy.',
                  ),
                  Icon: ShieldCheck,
                  tone: 'bg-[#7c5800]/15 text-[#7c5800] dark:text-[#f2be5e]',
                },
                {
                  title: tr('النقاء والاحتساب', 'Purity of Intention'),
                  body: tr(
                    'عمل دعوي خالص لوجه الله الكريم بلا إعلانات ولا مقابل مادي، صدقة جارية نافعة بإذن الله.',
                    '100% ad-free non-commercial Dawah platform dedicated purely for Allah.',
                  ),
                  Icon: Heart,
                  tone: 'bg-[#006389]/10 text-[#006389] dark:text-[#80cfff]',
                },
                {
                  title: tr('تصميم عصري وميسّر', 'Modern Accessible UX'),
                  body: isEn ? 'Responsive bilingual PWA supporting offline Quran and Adhkar.' : siteConfig.modernUxClause,
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

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setSubTab('support')}
              className="min-h-[46px] px-6 py-2.5 rounded-2xl bg-[#006a46] hover:bg-[#005235] text-white text-sm font-bold flex items-center gap-2"
            >
              <ClipboardList className="w-4 h-4" />
              <span>{tr('تقديم مقترح أو طلب عمل / متابعة تذكرة', 'Submit Request or Track Ticket')}</span>
            </button>
            <button
              type="button"
              onClick={() => void handleShareApp()}
              className="min-h-[46px] px-6 py-2.5 rounded-2xl bg-[#ffdea8] hover:bg-[#ffc968] text-[#271900] text-sm font-bold flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              <span>{tr('مشاركة التطبيق لنيل الأجر', 'Share App')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Support, Suggestions, Volunteer & #REQ Ticket Tracker */}
      {subTab === 'support' && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {[
              {id: 'ideas', label: tr('مقترح تطوير أو رسالة دعم', 'Proposal / Support Msg')},
              {id: 'volunteer', label: tr('طلب عمل أو فريق تطوعي', 'Work / Volunteer Team')},
              {id: 'impact', label: tr('سجل الشفافية والأثر', 'Transparency & Impact')},
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSupportFormTab(tab.id as typeof supportFormTab)}
                className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  supportFormTab === tab.id
                    ? 'bg-[#006a46] text-white shadow-sm'
                    : 'bg-[#e0f0fb] dark:bg-[#10261e] text-[#3e4a42] dark:text-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {supportFormTab === 'ideas' && (
            <form
              onSubmit={submitSuggestion}
              className="card-3d rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-6 shadow-xs space-y-4 max-w-2xl"
            >
              <h2 className="text-lg font-bold text-[#0e1d25] dark:text-white">
                {tr('إرسال مقترح أو رسالة دعم بسرية تامة', 'Submit a Private Proposal or Support Inquiry')}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  {id: 'tech', label: tr('تطوير الموقع', 'Site Dev')},
                  {id: 'preach', label: tr('موعظة وفائدة', 'Sermon')},
                  {id: 'series', label: tr('سلسلة علمية', 'Series')},
                  {id: 'contribution', label: tr('مبادرة دعم', 'Initiative')},
                  {id: 'help', label: tr('استفسار ومساعدة', 'Help')},
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSugType(t.id)}
                    className={`min-h-[42px] px-2.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                      sugType === t.id
                        ? 'bg-[#006a46] text-white'
                        : 'bg-[#e8f6ff] dark:bg-[#112921] text-[#3e4a42] dark:text-slate-300'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={sugName}
                onChange={(e) => setSugName(e.target.value)}
                placeholder={tr('الاسم أو الكنية (اختياري)', 'Your name (optional)')}
                className="w-full min-h-[44px] rounded-xl bg-[#e8f6ff] dark:bg-[#112921] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006a46]"
              />

              <textarea
                rows={4}
                required
                value={sugText}
                onChange={(e) => setSugText(e.target.value)}
                placeholder={tr(
                  'اكتب مقترحك، أو مساهمتك، أو استفسارك ليصل مباشرة لقسم الرسائل لدى الإدارة...',
                  'Write your suggestion or inquiry...',
                )}
                className="w-full rounded-xl bg-[#e8f6ff] dark:bg-[#112921] p-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#006a46]"
              />

              <input
                type="text"
                value={sugContact}
                onChange={(e) => setSugContact(e.target.value)}
                placeholder={tr('وسيلة تواصل خاصة للرد عليك (اختياري)', 'Contact info for reply (optional)')}
                className="w-full min-h-[44px] rounded-xl bg-[#e8f6ff] dark:bg-[#112921] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006a46]"
              />

              <input
                type="tel"
                value={sugWhatsapp}
                onChange={(e) => setSugWhatsapp(e.target.value)}
                placeholder="رقم واتساب لمتابعة حالة طلبك (سري تماماً واختياري)"
                className="w-full min-h-[44px] rounded-xl bg-[#e8f6ff] dark:bg-[#112921] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006a46]"
              />

              <button
                type="submit"
                disabled={sugSubmitting}
                className="min-h-[48px] px-6 py-2.5 rounded-xl bg-[#006a46] hover:bg-[#005235] disabled:opacity-60 text-white text-sm font-bold transition-colors"
              >
                {sugSubmitting
                  ? tr('جاري الإرسال...', 'Sending...')
                  : tr('إرسال وإصدار رقم متابعة (#REQ)', 'Submit & Get Ticket #REQ')}
              </button>
            </form>
          )}

          {supportFormTab === 'volunteer' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              <form
                onSubmit={submitVolunteer}
                className="card-3d lg:col-span-7 rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-6 shadow-xs space-y-4"
              >
                <h2 className="text-lg font-bold text-[#0e1d25] dark:text-white">
                  {tr('طلب عمل أو الانضمام لفريق التطوير والمحتوى (مع إمكانية المقابلة الأونلاين)', 'Work / Team Application (With Online Interview Option)')}
                </h2>

                <input
                  type="text"
                  value={volName}
                  onChange={(e) => setVolName(e.target.value)}
                  placeholder={tr('الاسم أو الكنية (اختياري)', 'Your name (optional)')}
                  className="w-full min-h-[44px] rounded-xl bg-[#e8f6ff] dark:bg-[#112921] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006a46]"
                />

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#6e7a71] dark:text-slate-400 block">
                    {tr('مجال المساهمة المفضل', 'Preferred Area')}
                  </label>
                  <select
                    value={volField}
                    onChange={(e) => setVolField(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl bg-[#e8f6ff] dark:bg-[#112921] px-4 py-2 text-sm focus:outline-none"
                  >
                    <option value="التدقيق اللغوي والشرعي وتخريج الأحاديث">
                      التدقيق اللغوي والشرعي وتخريج الأحاديث
                    </option>
                    <option value="الإشراف على قسم الصم والبكم ولغة الإشارة">
                      الإشراف على قسم الصم والبكم ولغة الإشارة
                    </option>
                    <option value="التصميم الجرافيكي وبطاقات المواعظ">
                      التصميم الجرافيكي وبطاقات المواعظ
                    </option>
                    <option value="المونتاج والهندسة الصوتية">
                      المونتاج والهندسة الصوتية
                    </option>
                    <option value="إدارة المنصات والنشر اليومي">
                      إدارة المنصات والنشر اليومي
                    </option>
                    <option value="البرمجة والتطوير التقني">
                      البرمجة والتطوير التقني
                    </option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#6e7a71] dark:text-slate-400 block">
                    {tr('الوقت المتاح أسبوعياً', 'Weekly Availability')}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      {id: '2-4', label: tr('٢ - ٤ ساعات', '2 – 4 hrs')},
                      {id: '5-8', label: tr('٥ - ٨ ساعات', '5 – 8 hrs')},
                      {id: '10+', label: tr('+١٠ ساعات', '10+ hrs')},
                    ].map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => setVolHours(h.id)}
                        className={`min-h-[44px] rounded-xl text-xs font-bold ${
                          volHours === h.id
                            ? 'bg-[#006a46] text-white'
                            : 'bg-[#e8f6ff] dark:bg-[#112921] text-[#3e4a42] dark:text-slate-300'
                        }`}
                      >
                        {h.label}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  rows={3}
                  required
                  value={volSkills}
                  onChange={(e) => setVolSkills(e.target.value)}
                  placeholder={tr('اذكر نبذة مختصرة عن خبرتك أو مهاراتك...', 'Briefly share your background or skills...')}
                  className="w-full rounded-xl bg-[#e8f6ff] dark:bg-[#112921] p-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#006a46]"
                />

                <input
                  type="text"
                  required
                  value={volContact}
                  onChange={(e) => setVolContact(e.target.value)}
                  placeholder={tr('وسيلة التواصل الخاصة بك (لترتيب المقابلة واستلام الحساب)', 'Your contact handle for interview & credentials')}
                  className="w-full min-h-[44px] rounded-xl bg-[#e8f6ff] dark:bg-[#112921] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006a46]"
                />

                <input
                  type="tel"
                  value={volWhatsapp}
                  onChange={(e) => setVolWhatsapp(e.target.value)}
                  placeholder="رقم واتسابك لمتابعة حالة الطلب (سري واختياري)"
                  className="w-full min-h-[44px] rounded-xl bg-[#e8f6ff] dark:bg-[#112921] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006a46]"
                />

                <button
                  type="submit"
                  disabled={volSubmitting}
                  className="w-full min-h-[48px] rounded-xl bg-[#006a46] hover:bg-[#005235] disabled:opacity-60 text-white text-sm font-bold transition-colors"
                >
                  {volSubmitting
                    ? tr('جاري التسجيل...', 'Submitting...')
                    : tr('تقديم طلب العمل والمقابلة الشخصية', 'Submit Work & Interview Request')}
                </button>
              </form>

              <div className="card-3d lg:col-span-5 rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-6 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-[#0e1d25] dark:text-white">
                  {tr('آلية المقابلات والتكليف بالعمل', 'Interview & Onboarding Workflow')}
                </h2>
                <div className="p-4 rounded-xl bg-[#fffbf2] dark:bg-[#171d18] space-y-2">
                  <h3 className="text-sm font-bold text-[#7c5800] dark:text-[#f2be5e]">
                    ١. مراجعة الطلب وإصدار تذكرة #REQ
                  </h3>
                  <p className="text-xs sm:text-sm text-[#3e4a42] dark:text-slate-300 leading-relaxed">
                    فور تقديم طلبك يصدر لك رقم متابعة (#REQ-...) لتتابع حالة الطلب ورد الإدارة، وتُجرى المقابلة الشخصية أونلاين عبر الموقع لمن تم قبوله مبدئياً.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[#e8f6ff] dark:bg-[#112921] space-y-2">
                  <h3 className="text-sm font-bold text-[#006389] dark:text-[#80cfff]">
                    ٢. منح اسم مستخدم وكلمة مرور مخصصة
                  </h3>
                  <p className="text-xs sm:text-sm text-[#3e4a42] dark:text-slate-300 leading-relaxed">
                    بعد اجتياز المقابلة يُمنح العضو حساب دخول خاصاً (محرر، مشرف، أو مسؤول عن قسم محدد) للعمل المنظّم ضمن الفريق.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[#eefaf3] dark:bg-[#10251c] space-y-1">
                  <h3 className="text-sm font-bold text-[#006a46] dark:text-[#6cdba6]">
                    ٣. أخلص لنا بدعوة صالحة
                  </h3>
                  <p className="text-xs sm:text-sm text-[#3e4a42] dark:text-slate-300">
                    دعوة صالحة في ظهر الغيب للقائمين على هذا العمل الدعوي بالإخلاص والقبول هي خير ما نرجوه منكم.
                  </p>
                </div>
              </div>
            </div>
          )}

          {supportFormTab === 'impact' && (
            <section className="card-3d rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-6 shadow-xs space-y-5">
              <div>
                <h2 className="text-lg font-bold text-[#006a46] dark:text-[#6cdba6]">
                  {tr('سجل الشفافية وإحصائيات المنصة', 'Transparency Ledger & Platform Impact')}
                </h2>
                <p className="text-sm text-[#3e4a42] dark:text-slate-300 mt-1">
                  {tr(
                    'إحصائيات حقيقية مرصودة لخدمة المحتوى الشرعي الموثق دون أي غرض تجاري.',
                    'Real engagement metrics dedicated purely to verified Islamic knowledge.',
                  )}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-[#f4faff] dark:bg-[#112921] border border-slate-200/70 dark:border-white/10 p-4 rounded-2xl flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#006a46]/10 text-[#006a46] dark:text-[#6cdba6] flex items-center justify-center shrink-0">
                    <Eye className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-[#6e7a71] dark:text-slate-400 block">إجمالي الزوار</span>
                    <span className="text-xl font-bold text-[#006a46] dark:text-[#6cdba6] tabular-nums">
                      {formatNumber(visitorsCount)}
                    </span>
                  </div>
                </div>
                <div className="bg-[#eefaf3] dark:bg-[#0d241b] border border-[#008559]/30 p-4 rounded-2xl flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#008559]/15 text-[#008559] dark:text-[#6cdba6] flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-[#6e7a71] dark:text-slate-400 block">الموجودون الآن</span>
                    <span className="text-xl font-bold text-[#006a46] dark:text-[#6cdba6] tabular-nums">
                      {formatNumber(onlineVisitorsCount)}
                    </span>
                  </div>
                </div>
                <div className="bg-[#f4faff] dark:bg-[#112921] border border-slate-200/70 dark:border-white/10 p-4 rounded-2xl flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#006389]/10 text-[#006389] dark:text-[#80cfff] flex items-center justify-center shrink-0">
                    <MousePointerClick className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-[#6e7a71] dark:text-slate-400 block">التفاعلات</span>
                    <span className="text-xl font-bold text-[#006389] dark:text-[#80cfff] tabular-nums">
                      {formatNumber(clicksCount)}
                    </span>
                  </div>
                </div>
                <div className="bg-[#fffbf2] dark:bg-[#13221c] border border-[#f2be5e]/35 p-4 rounded-2xl flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#ffdea8] text-[#7c5800] flex items-center justify-center shrink-0">
                    <Heart className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-[#6e7a71] dark:text-slate-400 block">تأمينات دعاء الوالدة</span>
                    <span className="text-xl font-bold text-[#7c5800] dark:text-[#f2be5e] tabular-nums">
                      {formatNumber(motherPrayersCount)}
                    </span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Always-Visible Ticket Tracking & Privacy Board */}
          <section className="card-3d rounded-3xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold text-[#0e1d25] dark:text-white flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-[#006a46] dark:text-[#6cdba6]" />
                  <span>سجل ومتابعة الطلبات والاقتراحات (#REQ-...)</span>
                </h2>
                <p className="text-xs text-[#6e7a71] dark:text-slate-400 mt-0.5">
                  استعلم برقم الطلب (مثل REQ-1001) لمتابعة حالة المراجعة والرد الإداري مع حفظ الخصوصية التامة
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void loadTickets(ticketQuery);
                }}
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                <div className="relative flex-1 sm:w-56">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={ticketQuery}
                    onChange={(e) => setTicketQuery(e.target.value)}
                    placeholder="رقم التذكرة مثل REQ-1001"
                    className="w-full min-h-[40px] rounded-xl border border-slate-200 dark:border-white/15 bg-[#f8faf9] dark:bg-[#081712] pr-9 pl-3 text-xs font-bold"
                  />
                </div>
                <button
                  type="submit"
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-[#006a46] text-white text-xs font-bold"
                >
                  استعلام
                </button>
              </form>
            </div>

            {lastIssuedTicket && (
              <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-500/30 p-3.5 text-xs sm:text-sm font-bold text-emerald-900 dark:text-emerald-200">
                تم تسجيل تذكرتك بنجاح! رقم متابعة طلبك هو: <span dir="ltr">{lastIssuedTicket}</span> — احتفظ بهذا الرقم للاستعلام في أي وقت.
              </div>
            )}

            {loadingTickets ? (
              <p className="text-xs text-[#6e7a71] dark:text-slate-400 py-3">جاري تحميل سجل الطلبات...</p>
            ) : tickets.length === 0 ? (
              <p className="text-xs text-[#6e7a71] dark:text-slate-400 py-3">
                لا توجد تذاكر مطابقة للاستعلام حالياً. قدّم مقترحاً أو طلب انضمام أعلاه ليصدر لك رقم تذكرة فوري.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {tickets.map((t) => {
                  const statusLabel =
                    t.status === 'resolved'
                      ? 'تم التنفيذ ✓'
                      : t.status === 'reviewed'
                        ? 'قيد المراجعة'
                        : 'جديد';
                  const statusColor =
                    t.status === 'resolved'
                      ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30'
                      : t.status === 'reviewed'
                        ? 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30'
                        : 'text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-900/30';
                  return (
                    <div
                      key={t.id}
                      className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-[#fafcfb] dark:bg-[#081712] p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span dir="ltr" className="font-extrabold text-[#006a46] dark:text-[#6cdba6] tabular-nums">
                          {t.ticketNumber}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-lg font-bold ${statusColor}`}>{statusLabel}</span>
                      </div>
                      <p className="text-xs font-bold text-[#7c5800] dark:text-[#f2be5e]">{t.categoryLabel}</p>
                      <p className="text-sm text-[#1e2d25] dark:text-slate-200 line-clamp-2">{t.text}</p>
                      {t.adminNote && (
                        <p className="text-xs rounded-xl bg-white dark:bg-[#0c211a] border border-slate-200/70 dark:border-white/10 p-2.5 text-[#0e1d25] dark:text-slate-200">
                          <span className="font-bold text-[#006a46] dark:text-[#6cdba6]">رد الإدارة: </span>
                          {t.adminNote}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Sub-Tab 3: Share Application */}
      {subTab === 'share' && (
        <section className="rounded-3xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-6 sm:p-8 shadow-xs space-y-5 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#006a46]/10 text-[#006a46] dark:text-[#6cdba6] flex items-center justify-center mx-auto">
            <Share2 className="w-8 h-8" />
          </div>
          <div className="space-y-2 max-w-xl mx-auto">
            <h2 className="text-xl font-extrabold text-[#0e1d25] dark:text-white">
              {tr('الدال على الخير كفاعله — شارك التطبيق', 'Share Mawaedh & Ibar')}
            </h2>
            <p className="text-sm text-[#3e4a42] dark:text-slate-300 leading-relaxed">
              {tr(
                'انشر هذا التطبيق بين أهلك وإخوانك ومجموعات الخير ليكون لك بإذن الله صدقة جارية ونوراً متصلاً في نشر كتاب الله وسنة نبيه ﷺ.',
                'Share this app with family and friends so it may be ongoing charity in spreading authentic knowledge.',
              )}
            </p>
          </div>

          <div className="rounded-2xl bg-[#f4faff] dark:bg-[#081712] border border-slate-200/80 dark:border-white/10 p-4 max-w-xl mx-auto text-start space-y-2">
            <span className="text-xs font-bold text-[#006a46] dark:text-[#6cdba6]">نص المشاركة الجاهز:</span>
            <p className="text-xs sm:text-sm text-[#1e2d25] dark:text-slate-200 whitespace-pre-line leading-relaxed">
              {shareMessage}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => void handleShareApp()}
              className="min-h-[48px] px-6 py-2.5 rounded-2xl bg-[#006a46] hover:bg-[#005235] text-white text-sm font-extrabold flex items-center gap-2 shadow-sm"
            >
              <Share2 className="w-4 h-4" />
              <span>{tr('مشاركة التطبيق الآن', 'Share App Now')}</span>
            </button>
            <button
              type="button"
              onClick={() => void handleCopyLinkOnly()}
              className="min-h-[48px] px-6 py-2.5 rounded-2xl bg-[#ffdea8] hover:bg-[#ffc968] text-[#271900] text-sm font-extrabold flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              <span>{tr('نسخ الرابط فقط', 'Copy Link Only')}</span>
            </button>
          </div>
        </section>
      )}

      {/* Sub-Tab 4: Scientific Disclaimer & 2027 Copyright */}
      {subTab === 'disclaimer' && (
        <section className="rounded-3xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-6 sm:p-8 shadow-xs space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#7c5800]/15 text-[#7c5800] dark:text-[#f2be5e] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-[#0e1d25] dark:text-white">
                {tr('التنويه العلمي والمنهجي وحقوق المنصة', 'Scientific Disclaimer & Copyright 2027')}
              </h2>
              <p className="text-xs text-[#6e7a71] dark:text-slate-400">
                {tr('التزام تام بمنهج السلف الصالح وأهل السنة والجماعة', 'Strict Adherence to Authentic Salafi Scholarship')}
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-[#fffbf2] dark:bg-[#13201b] border border-[#f2be5e]/40 p-5 space-y-2.5">
            <p className="text-sm text-[#1e2d25] dark:text-slate-200 leading-loose">
              تعتمد منصة «مواعظ وعبر» في جميع ما تنشره من فتاوى ودروس ومؤلفات وبطاقات وإجابات الذكاء الاصطناعي على الكتاب والسنة بفهم سلف الأمة، وعلى مؤلفات وشروح أئمة أهل السنة والجماعة المعتمدين (الإمام الوادعي، الشيخ ابن باز، الشيخ ابن عثيمين، الإمام الألباني رحمهم الله، وفضيلة الشيخ يحيى بن علي الحجوري ومشايخ وطلبة دار الحديث حفظهم الله)، مع التحري التام لسلامة النصوص والأحاديث والابتعاد المطلق عن أي مناهج حزبية أو مصادر غير موثوقة.
            </p>
            <p className="text-xs text-[#6e7a71] dark:text-slate-400 leading-relaxed">
              تنبيه: المحتوى الموجود في الموقع مخصّص للنفع العام وطلب العلم، وتُتاح مشاركته وطباعته للخير مجاناً مع الحفاظ على أمانة النقل وعزوه لمصادره الصحيحة.
            </p>
          </div>

          <div className="rounded-2xl bg-[#f4faff] dark:bg-[#081712] border border-slate-200/80 dark:border-white/10 p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#0e1d25] dark:text-white">
              <Clock className="w-4 h-4 text-[#006a46] dark:text-[#6cdba6]" />
              <span>جميع الحقوق محفوظة لـ «مواعظ وعبر» © ٢٠٢٧ م · جميع الحقوق محفوظة</span>
            </div>
            {onOpenAdminShield && (
              <button
                type="button"
                onClick={onOpenAdminShield}
                aria-label="Admin Portal"
                className="p-2 rounded-xl text-[#006a46] dark:text-[#6cdba6] hover:bg-emerald-500/10 transition-colors cursor-pointer"
              >
                <Shield className="w-4 h-4" />
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
