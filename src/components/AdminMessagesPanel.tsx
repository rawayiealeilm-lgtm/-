import {
  CheckCircle2,
  Clock,
  Copy,
  HandHeart,
  HelpCircle,
  Inbox,
  KeyRound,
  Lightbulb,
  Lock,
  MessageSquare,
  Radio,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  UserPlus,
} from 'lucide-react';
import {useCallback, useEffect, useMemo, useState} from 'react';
import type {
  AdminRole,
  AdminSectionScope,
  MessageInboxStatus,
  SuggestionItem,
  VolunteerItem,
} from '../types';

type MessageCategoryFilter = 'all' | 'proposal' | 'team' | 'contribution' | 'help';
type MessageStatusFilter = 'all' | MessageInboxStatus;

interface UnifiedInboxEntry {
  kind: 'suggestion' | 'volunteer';
  id: string;
  ticketNumber: string;
  category: Exclude<MessageCategoryFilter, 'all'>;
  categoryLabel: string;
  senderName?: string;
  body: string;
  field?: string;
  hours?: string;
  contact?: string;
  visitorWhatsapp?: string;
  whatsappNotifiedAt?: string;
  adminNote?: string;
  source: 'assistant' | 'support_page';
  status: MessageInboxStatus;
  createdAt: string;
}

function classifySuggestionType(type: string): {
  category: Exclude<MessageCategoryFilter, 'all'>;
  label: string;
} {
  switch (type) {
    case 'team_join':
      return {category: 'team', label: 'طلب عمل / تسجيل بالفريق التطوعي'};
    case 'contribution':
      return {category: 'contribution', label: 'رسالة دعم ومساهمة للموقع'};
    case 'help':
      return {category: 'help', label: 'رسالة مراسل واستفسار'};
    case 'preach':
      return {category: 'proposal', label: 'مقترح موعظة ومحتوى'};
    case 'series':
      return {category: 'proposal', label: 'مقترح سلسلة علمية'};
    case 'tech':
      return {category: 'proposal', label: 'مقترح لتطوير الموقع'};
    default:
      return {category: 'proposal', label: 'مقترح تطوير ورسالة زائر'};
  }
}

export function AdminMessagesPanel({
  authToken,
  suggestions,
  volunteers,
  onUpdateMessages,
  onOpenLiveSession,
  onNotify,
}: {
  authToken: string;
  suggestions: SuggestionItem[];
  volunteers: VolunteerItem[];
  onUpdateMessages: (suggestions: SuggestionItem[], volunteers: VolunteerItem[]) => void;
  onOpenLiveSession?: (sessionId: string) => void;
  onNotify: (msg: string) => void;
}) {
  const [categoryFilter, setCategoryFilter] = useState<MessageCategoryFilter>('all');
  const [statusFilter, setStatusFilter] = useState<MessageStatusFilter>('all');
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [interviewTargetId, setInterviewTargetId] = useState<string | null>(null);
  const [issueRole, setIssueRole] = useState<AdminRole>('editor');
  const [issueSection, setIssueSection] = useState<AdminSectionScope>('all');
  const [issueUsername, setIssueUsername] = useState('');
  const [issuePassword, setIssuePassword] = useState('');
  const [issuedCredentials, setIssuedCredentials] = useState<
    Record<string, {username: string; tempPassword: string; role: AdminRole; assignedSection: AdminSectionScope}>
  >({});

  const refreshMessages = useCallback(
    async (silent = false) => {
      if (!authToken) return;
      setRefreshing(true);
      try {
        const res = await fetch('/api/admin/messages', {
          headers: {Authorization: `Bearer ${authToken}`},
        });
        if (!res.ok) throw new Error();
        const data = (await res.json()) as {
          suggestions?: SuggestionItem[];
          volunteers?: VolunteerItem[];
        };
        onUpdateMessages(data.suggestions || [], data.volunteers || []);
        if (!silent) {
          onNotify('تم تحديث صندوق الرسائل والمقترحات');
        }
      } catch {
        if (!silent) {
          onNotify('تعذر تحديث الرسائل من الخادم');
        }
      } finally {
        setRefreshing(false);
      }
    },
    [authToken, onNotify, onUpdateMessages],
  );

  useEffect(() => {
    void refreshMessages(true);
  }, [refreshMessages]);

  const entries = useMemo<UnifiedInboxEntry[]>(() => {
    const sugEntries: UnifiedInboxEntry[] = suggestions.map((s) => {
      const meta = classifySuggestionType(s.type);
      return {
        kind: 'suggestion',
        id: s.id,
        ticketNumber: s.ticketNumber || `#REQ-${s.id.slice(-4).toUpperCase()}`,
        category: meta.category,
        categoryLabel: meta.label,
        senderName: s.senderName,
        body: s.text,
        contact: s.contact,
        visitorWhatsapp: s.visitorWhatsapp,
        whatsappNotifiedAt: s.whatsappNotifiedAt,
        adminNote: s.adminNote,
        source: s.source === 'assistant' ? 'assistant' : 'support_page',
        status: s.status || 'new',
        createdAt: s.createdAt,
      };
    });

    const volEntries: UnifiedInboxEntry[] = volunteers.map((v) => ({
      kind: 'volunteer',
      id: v.id,
      ticketNumber: v.ticketNumber || `#REQ-${v.id.slice(-4).toUpperCase()}`,
      category: 'team',
      categoryLabel: 'طلب عمل / انضمام للفريق التطوعي',
      senderName: v.senderName,
      body: v.skills,
      field: v.field,
      hours: v.hours,
      contact: v.contact,
      visitorWhatsapp: v.visitorWhatsapp,
      whatsappNotifiedAt: v.whatsappNotifiedAt,
      adminNote: v.adminNote,
      source: v.source === 'assistant' ? 'assistant' : 'support_page',
      status: v.status || 'new',
      createdAt: v.createdAt,
    }));

    return [...sugEntries, ...volEntries].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [suggestions, volunteers]);

  const counts = useMemo(() => {
    const c = {all: entries.length, proposal: 0, team: 0, contribution: 0, help: 0, newCount: 0};
    for (const item of entries) {
      c[item.category] += 1;
      if (item.status === 'new') c.newCount += 1;
    }
    return c;
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((item) => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (!q) return true;
      return (
        item.ticketNumber.toLowerCase().includes(q) ||
        item.body.toLowerCase().includes(q) ||
        item.categoryLabel.toLowerCase().includes(q) ||
        (item.senderName || '').toLowerCase().includes(q) ||
        (item.contact || '').toLowerCase().includes(q) ||
        (item.field || '').toLowerCase().includes(q)
      );
    });
  }, [entries, categoryFilter, statusFilter, query]);

  const handleUpdateStatus = async (
    entry: UnifiedInboxEntry,
    nextStatus: MessageInboxStatus,
    noteOverride?: string,
  ) => {
    const key = `${entry.kind}:${entry.id}`;
    setBusyKey(key);
    try {
      const res = await fetch(`/api/admin/messages/${entry.kind}/${entry.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          status: nextStatus,
          adminNote: noteOverride !== undefined ? noteOverride : noteDrafts[key] ?? entry.adminNote,
        }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as {
        suggestions?: SuggestionItem[];
        volunteers?: VolunteerItem[];
      };
      onUpdateMessages(data.suggestions || [], data.volunteers || []);
      onNotify(
        entry.visitorWhatsapp
          ? `تم تحديث حالة التذكرة ${entry.ticketNumber} وإرسال إشعار التحديث لرقم الزائر`
          : `تم تحديث التذكرة ${entry.ticketNumber} بنجاح`,
      );
    } catch {
      onNotify('تعذر تحديث حالة الرسالة');
    } finally {
      setBusyKey(null);
    }
  };

  const handleSaveAdminNote = async (entry: UnifiedInboxEntry) => {
    const key = `${entry.kind}:${entry.id}`;
    const draft = (noteDrafts[key] ?? entry.adminNote ?? '').trim();
    setBusyKey(key);
    try {
      const res = await fetch(`/api/admin/messages/${entry.kind}/${entry.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({adminNote: draft}),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as {
        suggestions?: SuggestionItem[];
        volunteers?: VolunteerItem[];
      };
      onUpdateMessages(data.suggestions || [], data.volunteers || []);
      onNotify(`تم حفظ رد الإدارة للتذكرة ${entry.ticketNumber}`);
    } catch {
      onNotify('تعذر حفظ الملاحظة الإدارية');
    } finally {
      setBusyKey(null);
    }
  };

  const handleDeleteEntry = async (entry: UnifiedInboxEntry) => {
    const key = `${entry.kind}:${entry.id}`;
    setBusyKey(key);
    try {
      const res = await fetch(`/api/admin/messages/${entry.kind}/${entry.id}`, {
        method: 'DELETE',
        headers: {Authorization: `Bearer ${authToken}`},
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as {
        suggestions?: SuggestionItem[];
        volunteers?: VolunteerItem[];
      };
      onUpdateMessages(data.suggestions || [], data.volunteers || []);
      onNotify('تم حذف الرسالة من الصندوق');
    } catch {
      onNotify('تعذر حذف الرسالة');
    } finally {
      setBusyKey(null);
    }
  };

  const copyContact = async (contactText: string) => {
    try {
      await navigator.clipboard.writeText(contactText);
      onNotify(`تم نسخ: ${contactText}`);
    } catch {
      onNotify(contactText);
    }
  };

  const handleAcceptAndIssueTeamAccount = async (entry: UnifiedInboxEntry) => {
    const key = `${entry.kind}:${entry.id}`;
    setBusyKey(key);
    try {
      const res = await fetch('/api/admin/interviews/accept-issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          entryKind: entry.kind,
          entryId: entry.id,
          senderName: entry.senderName,
          role: issueRole,
          assignedSection: issueSection,
          username: issueUsername.trim() || undefined,
          password: issuePassword.trim() || undefined,
        }),
      });
      const data = (await res.json()) as {
        username?: string;
        tempPassword?: string;
        role?: AdminRole;
        assignedSection?: AdminSectionScope;
        suggestions?: SuggestionItem[];
        volunteers?: VolunteerItem[];
        error?: string;
      };
      if (!res.ok || !data.username || !data.tempPassword) {
        onNotify(data.error || 'تعذر إصدار حساب عضو الفريق حالياً');
        return;
      }
      setIssuedCredentials((prev) => ({
        ...prev,
        [key]: {
          username: data.username!,
          tempPassword: data.tempPassword!,
          role: data.role || issueRole,
          assignedSection: data.assignedSection || issueSection,
        },
      }));
      if (data.suggestions && data.volunteers) {
        onUpdateMessages(data.suggestions, data.volunteers);
      }
      setInterviewTargetId(null);
      setIssueUsername('');
      setIssuePassword('');
      onNotify(`تم قبول الطلب وإصدار حساب (${data.username}) بنجاح`);
    } catch {
      onNotify('تعذر الاتصال بالخادم لإصدار الحساب');
    } finally {
      setBusyKey(null);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Intl.DateTimeFormat('ar-EG', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <section className="rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#006a46] text-white flex items-center justify-center shrink-0">
              <Inbox className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-[#0e1d25] dark:text-white flex items-center gap-2">
                  <span>قسم رسائل المراسلين والزوار</span>
                  {counts.newCount > 0 && (
                    <span className="px-2.5 py-0.5 rounded-lg bg-[#ffc968] text-[#271900] text-xs font-extrabold tabular-nums">
                      {counts.newCount.toLocaleString('ar-EG')} جديد
                    </span>
                  )}
                </h2>
                <span className="px-2.5 py-0.5 rounded-lg bg-[#eefaf3] dark:bg-[#133126] border border-[#006a46]/25 text-[#006a46] dark:text-[#6cdba6] text-[11px] font-bold inline-flex items-center gap-1">
                  <Lock className="w-3 h-3 shrink-0" />
                  <span>مخفي عن الجميع · خاص بالمشرفين والمدراء فقط</span>
                </span>
              </div>
              <p className="text-xs text-[#6e7a71] dark:text-slate-400 mt-1">
                تظهر هنا سرياً للمشرفين والمسؤولين جميع رسائل المراسلين والزوار: مقترحات تطوير الموقع، طلبات العمل أو التسجيل في الفريق التطوعي، ورسائل الدعم والمساعدة.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={refreshing}
            onClick={() => void refreshMessages(false)}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-[#e8f6ff] hover:bg-[#d5ecfb] dark:bg-[#112921] text-[#006a46] dark:text-[#6cdba6] text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'جاري التحديث...' : 'تحديث الصندوق'}</span>
          </button>
        </div>

        {/* Category Summary Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {(
            [
              {id: 'all', label: 'كل الرسائل', count: counts.all, Icon: MessageSquare},
              {id: 'proposal', label: 'مقترحات تطوير الموقع', count: counts.proposal, Icon: Lightbulb},
              {id: 'team', label: 'العمل والفريق التطوعي', count: counts.team, Icon: UserPlus},
              {id: 'contribution', label: 'رسائل الدعم والمساهمة', count: counts.contribution, Icon: HandHeart},
              {id: 'help', label: 'رسائل المراسلين والمساعدة', count: counts.help, Icon: HelpCircle},
            ] as const
          ).map(({id, label, count, Icon}) => {
            const active = categoryFilter === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setCategoryFilter(id)}
                className={`p-3 rounded-xl border text-start transition-all ${
                  active
                    ? 'bg-[#006a46] text-white border-[#006a46] shadow-xs'
                    : 'bg-[#f4faff] dark:bg-[#112921] border-slate-200/70 dark:border-white/10 text-[#0e1d25] dark:text-white hover:border-[#006a46]/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      active ? 'text-[#ffdea8]' : 'text-[#006a46] dark:text-[#6cdba6]'
                    }`}
                  />
                  <span className="text-lg font-extrabold tabular-nums">{count.toLocaleString('ar-EG')}</span>
                </div>
                <span
                  className={`text-[11px] font-bold block mt-1 ${
                    active ? 'text-[#e3f3fe]' : 'text-[#6e7a71] dark:text-slate-400'
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search + Status Filter */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between pt-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#6e7a71] absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث بالاسم، نص الرسالة، المهارات، أو وسيلة التواصل..."
              className="w-full min-h-[42px] ps-10 pe-4 rounded-xl bg-[#f4faff] dark:bg-[#112921] border border-slate-200/80 dark:border-white/10 text-sm text-[#0e1d25] dark:text-white focus:outline-none focus:border-[#006a46]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {(
              [
                {id: 'all', label: 'كل الحالات'},
                {id: 'new', label: 'جديد'},
                {id: 'reviewed', label: 'قيد المراجعة'},
                {id: 'resolved', label: 'تمت المعالجة'},
              ] as const
            ).map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-colors ${
                  statusFilter === st.id
                    ? 'bg-[#7c5800] text-white'
                    : 'bg-[#f4faff] dark:bg-[#112921] text-[#3e4a42] dark:text-slate-300'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Entries List */}
      {filteredEntries.length === 0 ? (
        <section className="rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-10 text-center space-y-2">
          <Inbox className="w-8 h-8 text-[#006a46] dark:text-[#6cdba6] mx-auto opacity-75" />
          <p className="text-sm font-bold text-[#0e1d25] dark:text-white">
            لا توجد رسائل مطابقة في هذا التصنيف حالياً
          </p>
          <p className="text-xs text-[#6e7a71] dark:text-slate-400">
            ستظهر هنا تلقائياً جميع المقترحات وطلبات الانضمام لفريق الموقع ورسائل المساهمة والمساعدة الواردة من الزوار.
          </p>
        </section>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map((entry) => {
            const busy = busyKey === `${entry.kind}:${entry.id}`;
            const statusColor =
              entry.status === 'resolved'
                ? 'bg-[#eefaf3] text-[#006a46] dark:bg-[#133126] dark:text-[#6cdba6]'
                : entry.status === 'reviewed'
                  ? 'bg-[#e8f6ff] text-[#006389] dark:bg-[#0e2a38] dark:text-[#80cfff]'
                  : 'bg-[#ffdea8] text-[#271900]';
            const statusLabel =
              entry.status === 'resolved' ? 'تمت المعالجة' : entry.status === 'reviewed' ? 'قيد المراجعة' : 'جديد';

            const catTone =
              entry.category === 'team'
                ? 'text-[#7c5800] dark:text-[#f2be5e]'
                : entry.category === 'help'
                  ? 'text-[#006389] dark:text-[#80cfff]'
                  : 'text-[#006a46] dark:text-[#6cdba6]';

            return (
              <article
                key={`${entry.kind}_${entry.id}`}
                className="rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-4 sm:p-5 shadow-xs space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span
                      dir="ltr"
                      className="px-2.5 py-0.5 rounded-lg bg-[#006a46] text-white text-[11px] font-extrabold tabular-nums"
                    >
                      {entry.ticketNumber}
                    </span>
                    <span className={`font-extrabold flex items-center gap-1 ${catTone}`}>
                      {entry.category === 'team' ? (
                        <UserPlus className="w-3.5 h-3.5" />
                      ) : entry.category === 'contribution' ? (
                        <HandHeart className="w-3.5 h-3.5" />
                      ) : entry.category === 'help' ? (
                        <HelpCircle className="w-3.5 h-3.5" />
                      ) : (
                        <Lightbulb className="w-3.5 h-3.5" />
                      )}
                      <span>{entry.categoryLabel}</span>
                    </span>

                    <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold ${statusColor}`}>
                      {statusLabel}
                    </span>

                    {entry.visitorWhatsapp && (
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 text-[11px] font-bold">
                        واتساب متابعة: {entry.visitorWhatsapp}
                      </span>
                    )}

                    <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/10 text-[11px] font-semibold text-[#3e4a42] dark:text-slate-300 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#006a46] dark:text-[#6cdba6]" />
                      {entry.source === 'assistant' ? 'عبر مساعد مواعظ وعبر' : 'من صفحة الدعم'}
                    </span>
                  </div>

                  <span className="text-[11px] text-[#6e7a71] dark:text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDate(entry.createdAt)}
                  </span>
                </div>

                {/* Team Metadata if Volunteer / Join Request */}
                {entry.field && (
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#7c5800] dark:text-[#f2be5e] bg-[#fffbf2] dark:bg-[#171d18] px-3 py-2 rounded-xl">
                    <span>المجال المطلوب: {entry.field}</span>
                    {entry.hours && <span>· التفرغ الأسبوعي: {entry.hours} ساعات</span>}
                  </div>
                )}

                {entry.senderName && (
                  <p className="text-xs font-bold text-[#0e1d25] dark:text-white">
                    المرسل: <span className="text-[#006a46] dark:text-[#6cdba6]">{entry.senderName}</span>
                  </p>
                )}

                <p className="text-sm text-[#0e1d25] dark:text-[#e3f3fe] leading-relaxed whitespace-pre-line">
                  {entry.body}
                </p>

                {/* Admin Response / Note visible in Visitor Ticket Tracker */}
                <div className="rounded-xl bg-[#f4faff] dark:bg-[#112921] p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    value={noteDrafts[`${entry.kind}:${entry.id}`] ?? entry.adminNote ?? ''}
                    onChange={(e) =>
                      setNoteDrafts((prev) => ({...prev, [`${entry.kind}:${entry.id}`]: e.target.value}))
                    }
                    placeholder="اكتب رداً أو ملاحظة للزائر (تظهر في سجل متابعة الطلبات)..."
                    className="flex-1 min-h-[38px] rounded-lg bg-white dark:bg-[#0b1f18] border border-slate-200 dark:border-white/10 px-3 text-xs focus:outline-none focus:border-[#006a46]"
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleSaveAdminNote(entry)}
                    className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-[#006a46] hover:bg-[#005235] disabled:opacity-60 text-white text-xs font-bold whitespace-nowrap"
                  >
                    حفظ الرد
                  </button>
                </div>

                {/* Online Interview & Scoped Account Issuance for Team / Development Applicants */}
                {entry.category === 'team' && (
                  <div className="rounded-xl bg-[#fffbf2] dark:bg-[#13221c] border border-[#f2be5e]/45 p-3 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-extrabold text-[#7c5800] dark:text-[#ffdea8]">
                        <KeyRound className="w-4 h-4 shrink-0" />
                        <span>المقابلة الشخصية أونلاين وإصدار حساب محرر / مشرف</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {onOpenLiveSession && (
                          <button
                            type="button"
                            onClick={() => onOpenLiveSession(`interview_${entry.id}`)}
                            className="min-h-[34px] px-3 py-1 rounded-lg bg-[#006389] text-white text-[11px] font-bold flex items-center gap-1"
                          >
                            <Radio className="w-3.5 h-3.5" />
                            <span>بدء مقابلة أونلاين</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            const k = `${entry.kind}:${entry.id}`;
                            setInterviewTargetId(interviewTargetId === k ? null : k);
                          }}
                          className="min-h-[34px] px-3 py-1 rounded-lg bg-[#006a46] text-white text-[11px] font-bold flex items-center gap-1"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>قبول وإصدار اسم مستخدم وكلمة مرور</span>
                        </button>
                      </div>
                    </div>

                    {interviewTargetId === `${entry.kind}:${entry.id}` && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-2 border-t border-amber-500/20">
                        <select
                          value={issueRole}
                          onChange={(e) => setIssueRole(e.target.value as AdminRole)}
                          className="min-h-[38px] rounded-lg bg-white dark:bg-[#081712] border border-slate-200 dark:border-white/10 px-2.5 text-xs font-bold"
                        >
                          <option value="editor">محرر محتوى (Editor)</option>
                          <option value="supervisor">مشرف قسم (Supervisor)</option>
                          <option value="admin">مسؤول كامل (Admin)</option>
                        </select>
                        <select
                          value={issueSection}
                          onChange={(e) => setIssueSection(e.target.value as AdminSectionScope)}
                          className="min-h-[38px] rounded-lg bg-white dark:bg-[#081712] border border-slate-200 dark:border-white/10 px-2.5 text-xs font-bold"
                        >
                          <option value="all">جميع الأقسام المسموحة</option>
                          <option value="mother-oasis">واحة الداعية أمي</option>
                          <option value="deaf-mute">قسم الصم والبكم</option>
                          <option value="fatawa">الفتاوى</option>
                          <option value="library">المكتبات العلمية</option>
                          <option value="adhkar">الأذكار والأدعية</option>
                          <option value="poetry">واحة الشعر والطرائف</option>
                        </select>
                        <input
                          type="text"
                          value={issueUsername}
                          onChange={(e) => setIssueUsername(e.target.value)}
                          placeholder="اسم مستخدم (أو يولَّد تلقائياً)"
                          className="min-h-[38px] rounded-lg bg-white dark:bg-[#081712] border border-slate-200 dark:border-white/10 px-2.5 text-xs"
                        />
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={issuePassword}
                            onChange={(e) => setIssuePassword(e.target.value)}
                            placeholder="كلمة مرور مؤقتة (اختياري)"
                            className="flex-1 min-h-[38px] rounded-lg bg-white dark:bg-[#081712] border border-slate-200 dark:border-white/10 px-2.5 text-xs"
                          />
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleAcceptAndIssueTeamAccount(entry)}
                            className="min-h-[38px] px-3 rounded-lg bg-[#7c5800] text-white text-xs font-bold shrink-0"
                          >
                            اعتماد
                          </button>
                        </div>
                      </div>
                    )}

                    {issuedCredentials[`${entry.kind}:${entry.id}`] && (() => {
                      const cred = issuedCredentials[`${entry.kind}:${entry.id}`];
                      const shareCredText = `تم قبولكم في فريق مواعظ وعبر:\nاسم المستخدم: ${cred.username}\nكلمة المرور المؤقتة: ${cred.tempPassword}\nالدور: ${cred.role} · القسم: ${cred.assignedSection}`;
                      return (
                        <div className="rounded-lg bg-white dark:bg-[#081712] border border-emerald-600/30 p-2.5 text-xs flex flex-wrap items-center justify-between gap-2">
                          <div className="space-y-0.5">
                            <span className="font-extrabold text-[#006a46] dark:text-[#6cdba6] block">
                              بيانات الدخول الصادرة للمقبول:
                            </span>
                            <span dir="ltr" className="font-mono font-bold text-[#0e1d25] dark:text-white select-all">
                              {cred.username} / {cred.tempPassword}
                            </span>
                            <span className="text-[11px] text-[#6e7a71] dark:text-slate-400 ms-2">
                              ({cred.role} · {cred.assignedSection})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => void copyContact(shareCredText)}
                            className="min-h-[32px] px-2.5 rounded-lg bg-[#006a46] text-white text-[11px] font-bold flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" />
                            <span>نسخ البيانات</span>
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-white/10">
                  {entry.contact ? (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-[#6e7a71] dark:text-slate-400 font-semibold">التواصل:</span>
                      <span dir="ltr" className="font-bold text-[#006a46] dark:text-[#6cdba6] select-all">
                        {entry.contact}
                      </span>
                      <button
                        type="button"
                        onClick={() => void copyContact(entry.contact!)}
                        className="px-2 py-1 rounded-lg bg-[#e8f6ff] dark:bg-[#112921] text-[#006a46] dark:text-[#6cdba6] font-bold flex items-center gap-1 hover:brightness-95"
                      >
                        <Copy className="w-3 h-3" />
                        <span>نسخ</span>
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] text-[#6e7a71] dark:text-slate-500">
                      بدون وسيلة تواصل مرفقة
                    </span>
                  )}

                  <div className="flex flex-wrap items-center gap-1.5">
                    {(
                      [
                        {id: 'new', label: 'جديد'},
                        {id: 'reviewed', label: 'قيد المراجعة'},
                        {id: 'resolved', label: 'تمت المعالجة'},
                      ] as const
                    ).map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        disabled={busy || entry.status === st.id}
                        onClick={() => void handleUpdateStatus(entry, st.id)}
                        className={`min-h-[32px] px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                          entry.status === st.id
                            ? 'bg-[#006a46] text-white'
                            : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-[#3e4a42] dark:text-slate-300'
                        }`}
                      >
                        {entry.status === st.id && <CheckCircle2 className="w-3 h-3 inline me-1" />}
                        {st.label}
                      </button>
                    ))}

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleDeleteEntry(entry)}
                      aria-label="حذف الرسالة"
                      className="min-h-[32px] px-2.5 py-1 rounded-lg bg-[#ffdad6]/60 hover:bg-[#ffdad6] dark:bg-rose-950/60 text-[#ba1a1a] dark:text-rose-200 text-[11px] font-bold flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
