import {
  BookOpen,
  ClipboardList,
  Eye,
  Globe,
  Heart,
  HeartHandshake,
  MousePointerClick,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import {useCallback, useEffect, useState, type FormEvent} from 'react';
import type {SiteConfig, VisitorProfile, VisitorTicketSummary} from '../types';
import {useI18n} from '../utils/i18n';

export function SupportView({
  siteConfig,
  visitor = null,
  visitorsCount = 0,
  onlineVisitorsCount = 1,
  clicksCount = 0,
  motherPrayersCount = 0,
  onMessageSubmitted,
  onNotify,
}: {
  siteConfig: SiteConfig;
  visitor?: VisitorProfile | null;
  visitorsCount?: number;
  onlineVisitorsCount?: number;
  clicksCount?: number;
  motherPrayersCount?: number;
  onMessageSubmitted?: () => void;
  onNotify: (msg: string) => void;
}) {
  const {tr, isEn, formatNumber} = useI18n();
  const [activeTab, setActiveTab] = useState<'ideas' | 'volunteer' | 'impact'>('ideas');

  // Suggestion state
  const [sugType, setSugType] = useState('preach');
  const [sugName, setSugName] = useState(visitor?.name || '');
  const [sugText, setSugText] = useState('');
  const [sugContact, setSugContact] = useState(visitor?.email || '');
  const [sugWhatsapp, setSugWhatsapp] = useState(visitor?.whatsapp || '');
  const [sugSubmitting, setSugSubmitting] = useState(false);

  // Volunteer / Team Join state
  const [volName, setVolName] = useState(visitor?.name || '');
  const [volField, setVolField] = useState('التدقيق اللغوي والشرعي وتخريج الأحاديث');
  const [volHours, setVolHours] = useState('2-4');
  const [volSkills, setVolSkills] = useState('');
  const [volContact, setVolContact] = useState(visitor?.email || '');
  const [volWhatsapp, setVolWhatsapp] = useState(visitor?.whatsapp || '');
  const [volSubmitting, setVolSubmitting] = useState(false);

  // Ticket tracking board state
  const [lastIssuedTicket, setLastIssuedTicket] = useState<string | null>(null);
  const [ticketQuery, setTicketQuery] = useState('');
  const [tickets, setTickets] = useState<VisitorTicketSummary[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  const loadTickets = useCallback(async (qStr = '') => {
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
      // ignore offline
    } finally {
      setLoadingTickets(false);
    }
  }, [visitor?.id]);

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
        `تم إرسال طلبك بنجاح برقم متابعة ${data.ticketNumber || '#REQ'} مع إشعار فوري صامت للمشرف`,
      );
    } catch {
      onNotify(tr('تعذر إرسال الرسالة حالياً، حاول لاحقاً', 'Unable to send right now. Please try later.'));
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
        `تم تسجيل طلبك برقم متابعة ${data.ticketNumber || '#REQ'} وإبلاغ الإدارة في الخلفية بنجاح`,
      );
    } catch {
      onNotify(tr('تعذر إرسال الطلب حالياً', 'Unable to submit request right now.'));
    } finally {
      setVolSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <section className="rounded-3xl bg-gradient-to-br from-[#006a46] via-[#008559] to-[#006389] p-6 text-white shadow-md">
        <div className="flex items-center gap-2 text-[#ffdea8] text-xs font-semibold">
          <HeartHandshake className="w-4 h-4" />
          <span>{tr('شراكة الأجر والخير والدعم الفني المباشر', 'Reward Partnership, Contribution & Direct Support')}</span>
        </div>
        <h1 className="text-2xl font-bold mt-1">
          {isEn ? 'Support & Direct Assistance' : siteConfig.supportTitle}
        </h1>
        <p className="text-sm text-white/90 mt-1.5 max-w-2xl leading-relaxed">
          {isEn
            ? 'Share beneficial suggestions, volunteer to serve verified Islamic content, or reach our direct support desk.'
            : siteConfig.supportSubtitle}
        </p>
      </section>

      {/* Private In-App Support Notice */}
      <section className="card-3d rounded-2xl bg-[#fffbf2] dark:bg-[#13221c] border border-[#f2be5e]/45 dark:border-[#f2be5e]/25 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="icon-3d w-11 h-11 rounded-2xl bg-[#ffdea8] text-[#271900] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-[#0e1d25] dark:text-white">
              {tr('تواصل آمن مع حفظ خصوصية البيانات', 'Private & Secure Support Desk')}
            </h2>
            <p className="text-xs sm:text-sm text-[#3e4a42] dark:text-slate-300">
              {tr(
                'جميع المقترحات والاستفسارات تُرسل سراً عبر نموذج التذاكر أدناه وتُتابع برقم طلب (#REQ) دون نشر أي بيانات تواصل شخصية.',
                'All inquiries and suggestions are routed securely through our #REQ ticket system with full privacy.',
              )}
            </p>
          </div>
        </div>
      </section>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {[
          {id: 'ideas', label: tr('مقترح تطوير أو رسالة دعم', 'Proposal / Support Msg')},
          {id: 'volunteer', label: tr('طلب عمل أو فريق تطوعي', 'Work / Volunteer Team')},
          {id: 'impact', label: tr('سجل الشفافية والأثر', 'Transparency & Impact')},
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap shrink-0 transition-colors ${
              activeTab === tab.id
                ? 'bg-[#006a46] text-white shadow-sm'
                : 'bg-[#e0f0fb] dark:bg-[#10261e] text-[#3e4a42] dark:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'ideas' && (
        <form
          onSubmit={submitSuggestion}
          className="card-3d rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-6 shadow-xs space-y-4 max-w-2xl"
        >
          <h2 className="text-lg font-bold text-[#0e1d25] dark:text-white">
            {tr('مراسلة المشرفين والمدراء (مقترحات تطوير / دعم / استفسار)', 'Message Supervisors & Admins (Proposals / Support)')}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              {id: 'tech', label: tr('تطوير الموقع', 'Site Dev')},
              {id: 'preach', label: tr('موعظة وفائدة', 'Sermon')},
              {id: 'series', label: tr('سلسلة علمية', 'Series')},
              {id: 'contribution', label: tr('رسالة دعم للموقع', 'Support Site')},
              {id: 'help', label: tr('مراسلة واستفسار', 'Correspondent')},
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
              'اكتب مقترحك، أو مساهمتك، أو استفسارك ليصل مباشرة لقسم الرسائل لدى المدير...',
              'Write your suggestion, contribution, or help request directly to the Manager inbox...',
            )}
            className="w-full rounded-xl bg-[#e8f6ff] dark:bg-[#112921] p-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#006a46]"
          />

          <input
            type="text"
            value={sugContact}
            onChange={(e) => setSugContact(e.target.value)}
            placeholder={tr('البريد الإلكتروني أو المعرّف (اختياري)', 'Email or handle (optional)')}
            className="w-full min-h-[44px] rounded-xl bg-[#e8f6ff] dark:bg-[#112921] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006a46]"
          />

          <input
            type="tel"
            value={sugWhatsapp}
            onChange={(e) => setSugWhatsapp(e.target.value)}
            placeholder="رقم واتساب الزائر لإرسال تحديث حالة طلبك تلقائياً (سري واختياري)"
            className="w-full min-h-[44px] rounded-xl bg-[#e8f6ff] dark:bg-[#112921] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006a46]"
          />

          <button
            type="submit"
            disabled={sugSubmitting}
            className="min-h-[48px] px-6 py-2.5 rounded-xl bg-[#006a46] hover:bg-[#005235] disabled:opacity-60 text-white text-sm font-bold transition-colors"
          >
            {sugSubmitting
              ? tr('جاري الإرسال...', 'Sending...')
              : tr('إرسال المقترح لفريق الإدارة', 'Submit Suggestion')}
          </button>
        </form>
      )}

      {activeTab === 'volunteer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <form
            onSubmit={submitVolunteer}
            className="card-3d lg:col-span-7 rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-6 shadow-xs space-y-4"
          >
            <h2 className="text-lg font-bold text-[#0e1d25] dark:text-white">
              {tr('استمارة طلب العمل أو التسجيل في الفريق التطوعي', 'Work Request & Volunteer Team Registration')}
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
                {tr('مجال المساهمة المفضل', 'Preferred Area of Contribution')}
              </label>
              <select
                value={volField}
                onChange={(e) => setVolField(e.target.value)}
                className="w-full min-h-[44px] rounded-xl bg-[#e8f6ff] dark:bg-[#112921] px-4 py-2 text-sm focus:outline-none"
              >
                <option value="التدقيق اللغوي والشرعي وتخريج الأحاديث">
                  {tr('التدقيق اللغوي والشرعي وتخريج الأحاديث', 'Linguistic, Hadith Verification & Proofreading')}
                </option>
                <option value="التصميم الجرافيكي وبطاقات المواعظ">
                  {tr('التصميم الجرافيكي وبطاقات المواعظ', 'Graphic Design & Wisdom Cards')}
                </option>
                <option value="المونتاج والهندسة الصوتية">
                  {tr('المونتاج والهندسة الصوتية', 'Audio Engineering & Video Editing')}
                </option>
                <option value="إدارة المنصات والنشر اليومي">
                  {tr('إدارة المنصات والنشر اليومي', 'Channel Management & Daily Publishing')}
                </option>
                <option value="البرمجة والتطوير التقني">
                  {tr('البرمجة والتطوير التقني', 'Software & Technical Development')}
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
              placeholder={tr(
                'معرّف تيليجرام أو البريد للتواصل',
                'Telegram handle or email for contact',
              )}
              className="w-full min-h-[44px] rounded-xl bg-[#e8f6ff] dark:bg-[#112921] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006a46]"
            />

            <input
              type="tel"
              value={volWhatsapp}
              onChange={(e) => setVolWhatsapp(e.target.value)}
              placeholder="رقم واتسابك لاستلام تحديثات طلبك فور مراجعته (اختياري وسري)"
              className="w-full min-h-[44px] rounded-xl bg-[#e8f6ff] dark:bg-[#112921] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006a46]"
            />

            <button
              type="submit"
              disabled={volSubmitting}
              className="w-full min-h-[48px] rounded-xl bg-[#006a46] hover:bg-[#005235] disabled:opacity-60 text-white text-sm font-bold transition-colors"
            >
              {volSubmitting
                ? tr('جاري التسجيل...', 'Submitting...')
                : tr('تقديم طلب الانضمام التطوعي', 'Submit Volunteer Application')}
            </button>
          </form>

          <div className="card-3d lg:col-span-5 rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-6 shadow-xs space-y-4">
            <h2 className="text-lg font-bold text-[#0e1d25] dark:text-white">
              {tr('طرق الدعم والمساهمة', 'Ways to Support')}
            </h2>

            <div className="p-4 rounded-xl bg-[#fffbf2] dark:bg-[#171d18] space-y-2">
              <h3 className="text-base font-bold text-[#7c5800] dark:text-[#f2be5e]">
                {tr('١. دعم استمرارية الخوادم والبث', '1. Server & Broadcast Continuity')}
              </h3>
              <p className="text-xs sm:text-sm text-[#3e4a42] dark:text-slate-300 leading-relaxed">
                {tr(
                  'التطبيق مجاني تماماً وخالٍ من الإعلانات. لمن أراد المساهمة أو التطوع أو الاستفسار، يمكنه إرسال رسالة عبر نموذج المقترحات واستلام رقم متابعة فوري.',
                  'The platform is 100% free and ad-free. You may reach administration securely via the ticket form.',
                )}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#e8f6ff] dark:bg-[#112921] space-y-1">
              <h3 className="text-base font-bold text-[#0e1d25] dark:text-white">
                {tr('٢. أخلص لنا بدعوة صالحة', '2. Keep Us in Your Sincere Prayers')}
              </h3>
              <p className="text-sm text-[#3e4a42] dark:text-slate-300">
                {tr(
                  'دعوة صالحة في جوف الليل للقائمين على المحتوى والتقنية بالإخلاص والقبول هي أثمن ما نرجوه منكم.',
                  'A sincere prayer for sincerity and acceptance for everyone maintaining this work is the greatest support we ask for.',
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'impact' && (
        <section className="card-3d rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-6 shadow-xs space-y-5">
          <div>
            <h2 className="text-lg font-bold text-[#006a46] dark:text-[#6cdba6]">
              {tr('سجل الشفافية وإحصائيات المنصة', 'Transparency Ledger & Platform Impact')}
            </h2>
            <p className="text-sm text-[#3e4a42] dark:text-slate-300 mt-1">
              {tr(
                'معايير واضحة وإحصائيات حقيقية مرصودة لخدمة المحتوى الشرعي الموثق دون أي غرض تجاري.',
                'Clear standards and real engagement metrics dedicated purely to verified Islamic knowledge without commercial motive.',
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="card-3d bg-[#f4faff] dark:bg-[#112921] border border-slate-200/70 dark:border-white/10 p-4 rounded-2xl flex items-center gap-3">
              <div className="icon-3d w-11 h-11 rounded-xl bg-[#006a46]/10 text-[#006a46] dark:text-[#6cdba6] flex items-center justify-center shrink-0">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-[#6e7a71] dark:text-slate-400 block">
                  {tr('إجمالي الزوار', 'Total Visitors')}
                </span>
                <span className="text-xl font-bold text-[#006a46] dark:text-[#6cdba6] tabular-nums">
                  {formatNumber(visitorsCount)}
                </span>
              </div>
            </div>

            <div className="card-3d bg-[#eefaf3] dark:bg-[#0d241b] border border-[#008559]/30 dark:border-[#6cdba6]/20 p-4 rounded-2xl flex items-center gap-3">
              <div className="icon-3d w-11 h-11 rounded-xl bg-[#008559]/15 text-[#008559] dark:text-[#6cdba6] flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-[#6e7a71] dark:text-slate-400">
                  {tr('الموجودين الآن في الموقع', 'Currently Online')}
                </span>
                <span className="text-xl font-bold text-[#006a46] dark:text-[#6cdba6] tabular-nums block">
                  {formatNumber(onlineVisitorsCount)}
                </span>
              </div>
            </div>

            <div className="card-3d bg-[#f4faff] dark:bg-[#112921] border border-slate-200/70 dark:border-white/10 p-4 rounded-2xl flex items-center gap-3">
              <div className="icon-3d w-11 h-11 rounded-xl bg-[#006389]/10 text-[#006389] dark:text-[#80cfff] flex items-center justify-center shrink-0">
                <MousePointerClick className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-[#6e7a71] dark:text-slate-400 block">
                  {tr('عدد النقرات والتفاعلات', 'Clicks & Interactions')}
                </span>
                <span className="text-xl font-bold text-[#006389] dark:text-[#80cfff] tabular-nums">
                  {formatNumber(clicksCount)}
                </span>
              </div>
            </div>

            <div className="card-3d bg-[#fffbf2] dark:bg-[#13221c] border border-[#f2be5e]/35 dark:border-white/10 p-4 rounded-2xl flex items-center gap-3">
              <div className="icon-3d w-11 h-11 rounded-xl bg-[#ffdea8] text-[#7c5800] flex items-center justify-center shrink-0">
                <Heart className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-[#6e7a71] dark:text-slate-400 block">
                  {tr('تأمينات دعاء الوالدة', 'Ameens for Mother')}
                </span>
                <span className="text-xl font-bold text-[#7c5800] dark:text-[#f2be5e] tabular-nums">
                  {formatNumber(motherPrayersCount)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                Icon: BookOpen,
                val: tr('منذ ٢٠١٥ م', 'Since 2015'),
                label: tr('عطاء دعوي متواصل بفضل الله', 'Continuous Dawah outreach'),
                color: 'text-[#006a46] dark:text-[#6cdba6]',
              },
              {
                Icon: Sparkles,
                val: tr('١٠٠٪ مجاني', '100% Free'),
                label: tr('خالص لوجه الله بلا إعلانات', 'Dedicated for Allah, ad-free'),
                color: 'text-[#7c5800] dark:text-[#f2be5e]',
              },
              {
                Icon: Globe,
                val: tr('بدون إنترنت', 'Offline Ready'),
                label: tr('يعمل المصحف والأذكار أوفلاين', 'Quran & Adhkar work offline'),
                color: 'text-[#006389] dark:text-[#80cfff]',
              },
              {
                Icon: Users,
                val: tr('مفتوح للجميع', 'Open Access'),
                label: tr('تصفح مباشر وجاهز كتطبيق أندرويد', 'Direct browsing & Android APK ready'),
                color: 'text-[#008559] dark:text-[#6cdba6]',
              },
            ].map((stat) => {
              const Icon = stat.Icon;
              return (
                <div
                  key={stat.label}
                  className="card-3d bg-[#e8f6ff] dark:bg-[#112921] p-4 rounded-2xl text-center flex flex-col items-center"
                >
                  <Icon className={`w-6 h-6 mb-2 ${stat.color}`} />
                  <span className={`text-lg font-bold tabular-nums ${stat.color}`}>{stat.val}</span>
                  <span className="text-xs text-[#3e4a42] dark:text-slate-300 mt-1">{stat.label}</span>
                </div>
              );
            })}
          </div>

          <div className="p-4 rounded-xl bg-[#e0f0fb] dark:bg-[#112921] space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-sm text-[#0e1d25] dark:text-white">
              <ShieldCheck className="w-4 h-4 text-[#006a46] dark:text-[#6cdba6]" />
              <span>{tr('ميثاق النزاهة والتصميم العصري الميسّر', 'Integrity Charter & Modern Reading Design')}</span>
            </div>
            <p className="text-xs sm:text-sm text-[#3e4a42] dark:text-slate-300 leading-relaxed">
              {isEn
                ? 'Committed to authentic sources, effortless mobile and desktop browsing, independent reading ergonomics, and zero ads.'
                : siteConfig.modernUxClause}
            </p>
          </div>
        </section>
      )}

      {/* Always-Visible Ticket Tracking & Privacy Board */}
      <section className="card-3d rounded-3xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-[#0e1d25] dark:text-white flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-[#006a46] dark:text-[#6cdba6]" />
              <span>سجل ومتابعة الطلبات والاقتراحات</span>
            </h2>
            <p className="text-xs text-[#6e7a71] dark:text-slate-400 mt-0.5">
              استعلم برقم الطلب (#REQ-1001) لمتابعة حالة المراجعة والرد الإداري مع حفظ خصوصية البيانات
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
                    <span className={`px-2.5 py-0.5 rounded-lg font-bold ${statusColor}`}>
                      {statusLabel}
                    </span>
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
  );
}

