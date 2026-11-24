import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Copy,
  HandHeart,
  HelpCircle,
  Lightbulb,
  MessageSquarePlus,
  MessageSquareText,
  Radio,
  Send,
  Sparkles,
  Trash2,
  UserPlus,
  Video,
  X,
} from 'lucide-react';
import {useEffect, useRef, useState, type FormEvent} from 'react';
import type {CustomBookItem, LiveSupportMessage, NavTab, SiteConfig} from '../types';
import {useI18n} from '../utils/i18n';
import {listPdfBooksFromIndexedDb} from '../utils/pdfIndexedDb';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  offerLiveConnect?: boolean;
}

type AssistantTab = 'chat' | 'live' | 'submit';
type AssistantSubmissionKind = 'suggestion' | 'team_join' | 'contribution' | 'help';

function isSafeHttpsUrl(raw?: string): boolean {
  if (!raw) return false;
  try {
    const parsed = new URL(raw.trim());
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function AIChatWidget({
  siteConfig,
  activeTab,
  customBooks = [],
  onMessageSubmitted,
  onNotify,
}: {
  siteConfig: SiteConfig;
  activeTab: NavTab;
  customBooks?: CustomBookItem[];
  onMessageSubmitted?: () => void;
  onNotify: (msg: string) => void;
}) {
  const {lang, isEn, tr} = useI18n();
  const [open, setOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<AssistantTab>('chat');

  // AI Chat State
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Live WebSocket Support State
  const [liveSessionId] = useState<string>(() => {
    if (typeof window === 'undefined') return `live_${Date.now().toString(36)}`;
    try {
      const existing = window.sessionStorage.getItem('mawaedh_live_session_id');
      if (existing) return existing;
      const fresh = `live_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      window.sessionStorage.setItem('mawaedh_live_session_id', fresh);
      return fresh;
    } catch {
      return `live_${Date.now().toString(36)}`;
    }
  });
  const [liveVisitorName, setLiveVisitorName] = useState('');
  const [liveMessages, setLiveMessages] = useState<LiveSupportMessage[]>([]);
  const [liveInput, setLiveInput] = useState('');
  const [liveConnected, setLiveConnected] = useState(false);
  const [liveMeetUrl, setLiveMeetUrl] = useState<string | null>(null);
  const liveWsRef = useRef<WebSocket | null>(null);
  const liveScrollRef = useRef<HTMLDivElement>(null);

  // Direct Admin Submission State
  const [subKind, setSubKind] = useState<AssistantSubmissionKind>('suggestion');
  const [senderName, setSenderName] = useState('');
  const [contact, setContact] = useState('');
  const [teamField, setTeamField] = useState('التدقيق اللغوي والشرعي وتخريج الأحاديث');
  const [teamHours, setTeamHours] = useState('2-4');
  const [messageText, setMessageText] = useState('');
  const [submittingForm, setSubmittingForm] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const hasReadingDock = activeTab === 'quran' || activeTab === 'post-detail';

  useEffect(() => {
    if (open && panelTab === 'chat' && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    if (open && panelTab === 'live' && liveScrollRef.current) {
      liveScrollRef.current.scrollTop = liveScrollRef.current.scrollHeight;
    }
  }, [messages, liveMessages, open, loading, panelTab]);

  useEffect(() => {
    if (!open || panelTab !== 'live') {
      if (liveWsRef.current) {
        liveWsRef.current.close();
        liveWsRef.current = null;
      }
      setLiveConnected(false);
      return;
    }

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${window.location.host}/ws/live-support`);
    liveWsRef.current = ws;

    ws.onopen = () => {
      setLiveConnected(true);
      ws.send(
        JSON.stringify({
          type: 'join',
          role: 'visitor',
          sessionId: liveSessionId,
          visitorName: liveVisitorName.trim() || tr('زائر الكريم', 'Guest'),
          topic: 'ai_escalation',
        }),
      );
    };

    ws.onmessage = (ev) => {
      try {
        const pkt = JSON.parse(String(ev.data)) as {
          type?: string;
          messages?: LiveSupportMessage[];
          message?: LiveSupportMessage;
          meetUrl?: string;
          meetInviteUrl?: string;
        };
        if (pkt.type === 'history' && Array.isArray(pkt.messages)) {
          setLiveMessages(pkt.messages);
        } else if (pkt.type === 'message' && pkt.message) {
          setLiveMessages((prev) =>
            prev.some((m) => m.id === pkt.message!.id) ? prev : [...prev, pkt.message!],
          );
        } else if (pkt.type === 'meet_invite' && isSafeHttpsUrl(pkt.meetUrl || pkt.meetInviteUrl)) {
          setLiveMeetUrl((pkt.meetUrl || pkt.meetInviteUrl)!);
        }
        if (isSafeHttpsUrl(pkt.meetInviteUrl)) {
          setLiveMeetUrl(pkt.meetInviteUrl!);
        }
      } catch {
        // Ignore malformed packets
      }
    };

    ws.onclose = () => setLiveConnected(false);
    ws.onerror = () => setLiveConnected(false);

    return () => {
      ws.close();
      liveWsRef.current = null;
    };
  }, [open, panelTab, liveSessionId, liveVisitorName, tr]);

  const sendLiveMessage = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = liveInput.trim();
    if (!trimmed) return;
    if (liveWsRef.current && liveWsRef.current.readyState === WebSocket.OPEN) {
      liveWsRef.current.send(
        JSON.stringify({
          type: 'message',
          sessionId: liveSessionId,
          senderRole: 'visitor',
          senderName: liveVisitorName.trim() || tr('زائر', 'Visitor'),
          text: trimmed,
        }),
      );
      setLiveInput('');
    } else {
      onNotify(tr('الاتصال غير جاهز حالياً، يمكنك إرسال تذكرة من التبويب المجاور.', 'Live connection unavailable; use the ticket form.'));
    }
  };

  const starterPrompts = isEn
    ? [
        'What features and sections are available on this site?',
        'Tell me about Sheikh Al-Hajouri lessons & sh-yahia.net',
        'What does alilmia.com section offer here?',
        'How do I read Quran pages and use night mode?',
      ]
    : [
        'ما أبرز خدمات وأقسام موقع مواعظ وعبر؟',
        'حدثني عن دروس الشيخ يحيى الحجوري وموقع sh-yahia.net',
        'ماذا يضم قسم الشبكة العلمية alilmia.com؟',
        'كيف أتصفح المصحف بالصفحات وأفعل الوضع الليلي؟',
      ];

  const sendMessage = async (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed || loading) return;

    setErrorMsg(null);
    const userMsg: ChatMessage = {
      id: `u_${Date.now().toString(36)}`,
      role: 'user',
      text: trimmed,
    };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setLoading(true);

    try {
      const uploadedBooks = await listPdfBooksFromIndexedDb().catch(() => []);
      const combinedBooks = [
        ...uploadedBooks.map((b) => ({title: b.title, author: b.author, section: b.section})),
        ...customBooks.map((b) => ({title: b.title, author: b.author, section: b.section})),
      ];
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          message: trimmed,
          history: messages.slice(-8).map((m) => ({role: m.role, text: m.text})),
          lang,
          uploadedBooks: combinedBooks,
        }),
      });
      const data = (await res.json()) as {reply?: string; offerLiveConnect?: boolean; error?: string};
      if (!res.ok || !data.reply) {
        throw new Error(
          data.error ||
            tr(
              'تعذر الحصول على إجابة من مساعدك الدعوي حالياً.',
              'Unable to get a response from Mawaedh Guide right now.',
            ),
        );
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `m_${Date.now().toString(36)}`,
          role: 'model',
          text: data.reply!,
          offerLiveConnect: Boolean(data.offerLiveConnect),
        },
      ]);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : tr('حدث خطأ أثناء الاتصال بمساعدك الدعوي.', 'Failed to connect to Mawaedh Guide.');
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitChat = (e: FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  const handleSubmitDirectMessage = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const trimmedText = messageText.trim();
    const trimmedContact = contact.trim();

    if (!trimmedText) {
      setFormError(tr('يرجى كتابة نص الرسالة أو المقترح أولاً.', 'Please write your message first.'));
      return;
    }

    if (subKind === 'team_join' && !trimmedContact) {
      setFormError(
        tr(
          'يرجى كتابة وسيلة التواصل (تيليجرام، واتساب، أو البريد) لنتمكن من التواصل معك.',
          'Please include a contact method (Telegram, WhatsApp, or email) so we can reply.',
        ),
      );
      return;
    }

    setSubmittingForm(true);
    try {
      const isTeamJoin = subKind === 'team_join';
      const endpoint = isTeamJoin ? '/api/volunteers' : '/api/suggestions';
      const payload = isTeamJoin
        ? {
            senderName: senderName.trim() || undefined,
            field: teamField,
            hours: teamHours,
            skills: trimmedText,
            contact: trimmedContact,
            source: 'assistant',
          }
        : {
            type: subKind,
            senderName: senderName.trim() || undefined,
            text: trimmedText,
            contact: trimmedContact || undefined,
            source: 'assistant',
          };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as {error?: string};
        throw new Error(errData.error || tr('تعذر الإرسال حالياً', 'Unable to send right now'));
      }

      setMessageText('');
      setContact('');
      setSenderName('');
      setFormSuccess(true);
      onMessageSubmitted?.();
      onNotify(
        isTeamJoin
          ? tr(
              'تم إرسال طلب انضمامك لفريق الموقع إلى صندوق رسائل المدير بنجاح',
              'Your team membership request has been sent to the Manager inbox',
            )
          : tr(
              'تم إرسال رسالتك إلى صندوق رسائل المدير بنجاح، جزاك الله خيراً',
              'Your message has been sent directly to the Manager inbox',
            ),
      );
    } catch (err) {
      setFormError(err instanceof Error ? err.message : tr('تعذر الإرسال حالياً', 'Unable to send right now'));
    } finally {
      setSubmittingForm(false);
    }
  };

  const copyReply = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      onNotify(tr('تم نسخ إجابة مساعدك الدعوي', 'Response copied to clipboard'));
    } catch {
      onNotify(tr('تعذر النسخ التلقائي', 'Unable to copy automatically'));
    }
  };

  const launcherSideClass = isEn ? 'right-4 lg:right-6' : 'left-4 lg:left-6';
  const launcherBottomClass = hasReadingDock ? 'bottom-[176px] lg:bottom-12' : 'bottom-[112px] lg:bottom-12';

  return (
    <>
      {/* Floating 3D Dawah Guide Button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={tr('فتح مساعد مواعظ وعبر الدعوي', 'Open Mawaedh Dawah Guide')}
        className={`fixed ${launcherSideClass} ${launcherBottomClass} z-40 min-h-[44px] px-3.5 py-2 rounded-2xl bg-gradient-to-br from-[#006a46] via-[#008559] to-[#00574b] text-white border border-[#ffdea8]/40 shadow-[0_12px_28px_-6px_rgba(0,106,70,0.55),inset_0_1px_0_rgba(255,255,255,0.3)] hover:scale-[1.03] active:scale-[0.98] flex items-center gap-2 text-xs sm:text-sm font-bold transition-all cursor-pointer`}
      >
        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-[#ffdea8] text-[#271900] flex items-center justify-center shrink-0">
          <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>
        <span>{tr('مساعدك الدعوي', 'Dawah Guide')}</span>
        <Sparkles className="w-3.5 h-3.5 text-[#ffdea8] shrink-0" />
      </button>

      {/* Interactive Chat & Admin Submission Panel */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-end sm:items-center justify-center px-0 pt-[40px] pb-[40px] sm:p-4 sm:pt-[40px] sm:pb-[40px]"
          onClick={() => setOpen(false)}
        >
          <section
            role="dialog"
            aria-label={tr('مساعد مواعظ وعبر الدعوي', 'Mawaedh Dawah Guide')}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-lg h-full max-h-[calc(100dvh-80px)] sm:h-[620px] rounded-3xl bg-white dark:bg-[#091c15] border border-slate-200/80 dark:border-white/15 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <header className="bg-gradient-to-l from-[#006a46] via-[#007c53] to-[#005235] text-white px-4 pt-3.5 pb-3 space-y-3 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#ffdea8] text-[#271900] flex items-center justify-center shrink-0 icon-3d">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm sm:text-base font-bold truncate">
                      {tr('مساعد مواعظ وعبر · مساعدك الدعوي', 'Mawaedh & Ibar · Your Dawah Guide')}
                    </h2>
                    <p className="text-[11px] text-[#ffdea8] truncate">
                      {tr(
                        `إرشاد فوري + تواصل مباشر مع إدارة ${siteConfig.appName}`,
                        'Instant guidance + direct proposals & team requests to Admin',
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {panelTab === 'chat' && messages.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setMessages([]);
                        setErrorMsg(null);
                      }}
                      title={tr('محادثة جديدة', 'Clear conversation')}
                      aria-label={tr('محادثة جديدة', 'Clear conversation')}
                      className="w-9 h-9 rounded-xl hover:bg-white/15 flex items-center justify-center text-white/85"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label={tr('إغلاق', 'Close')}
                    className="w-9 h-9 rounded-xl hover:bg-white/15 flex items-center justify-center text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Assistant Mode Tabs */}
              <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-black/20">
                <button
                  type="button"
                  onClick={() => setPanelTab('chat')}
                  className={`min-h-[36px] px-2 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-colors ${
                    panelTab === 'chat'
                      ? 'bg-[#ffdea8] text-[#271900] shadow-xs'
                      : 'text-white/90 hover:bg-white/10'
                  }`}
                >
                  <MessageSquareText className="w-3.5 h-3.5 shrink-0" />
                  <span>{tr('مساعدك الدعوي', 'Dawah Guide')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPanelTab('live')}
                  className={`min-h-[36px] px-2 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-colors ${
                    panelTab === 'live'
                      ? 'bg-[#ffdea8] text-[#271900] shadow-xs'
                      : 'text-white/90 hover:bg-white/10'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5 shrink-0" />
                  <span>{tr('التواصل المباشر', 'Direct Chat')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPanelTab('submit');
                    setFormSuccess(false);
                  }}
                  className={`min-h-[36px] px-2 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-colors ${
                    panelTab === 'submit'
                      ? 'bg-[#ffdea8] text-[#271900] shadow-xs'
                      : 'text-white/90 hover:bg-white/10'
                  }`}
                >
                  <MessageSquarePlus className="w-3.5 h-3.5 shrink-0" />
                  <span>{tr('مقترح / عمل', 'Ticket / Team')}</span>
                </button>
              </div>
            </header>

            {panelTab === 'chat' ? (
              <>
                {/* Conversation Scroll Body */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#f4faff] dark:bg-[#06120e]">
                  {messages.length === 0 && (
                    <div className="space-y-3.5">
                      <div className="rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-4 space-y-2 card-3d">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#006a46] dark:text-[#6cdba6]">
                          <MessageSquareText className="w-4 h-4" />
                          <span>{tr('أهلاً بك! كيف أساعدك اليوم؟', 'Welcome! How can I assist you today?')}</span>
                        </div>
                        <p className="text-xs sm:text-sm text-[#3e4a42] dark:text-slate-300 leading-relaxed">
                          {tr(
                            'اسألني عن أي موعظة، أو دروس الشيخ الحجوري، أو الفتاوى، أو القرآن والأذكار، أو روابط الشبكة العلمية وموقع الشيخ يحيى الحجوري.',
                            'Ask me about sermons, Sheikh Al-Hajouri lessons, verified Fatawa, Quran reader, Adhkar, or our integrated portals (sh-yahia.net & alilmia.com).',
                          )}
                        </p>
                      </div>

                      {/* Direct Shortcut to Admin Proposals & Team Join */}
                      <button
                        type="button"
                        onClick={() => {
                          setPanelTab('submit');
                          setFormSuccess(false);
                        }}
                        className="w-full rounded-2xl bg-[#fffbf2] dark:bg-[#16231d] border border-[#f2be5e]/55 p-3.5 text-start flex items-center justify-between gap-3 hover:brightness-98 transition-all"
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-[#ffdea8] text-[#271900] flex items-center justify-center shrink-0">
                            <UserPlus className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-extrabold text-[#7c5800] dark:text-[#ffdea8] block">
                              {tr(
                                'لديك اقتراح أو ترغب بالانضمام لفريق الموقع؟',
                                'Have a suggestion or want to join our team?',
                              )}
                            </span>
                            <span className="text-[11px] text-[#3e4a42] dark:text-slate-300">
                              {tr(
                                'أرسل مقترحك، مساهمتك، أو طلب العضوية ليصل مباشرة إلى صندوق رسائل المدير.',
                                'Send proposals, team applications, or help requests directly to the Manager inbox.',
                              )}
                            </span>
                          </div>
                        </div>
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[#006a46] text-white whitespace-nowrap shrink-0">
                          {tr('إرسال الآن', 'Send')}
                        </span>
                      </button>

                      <div className="space-y-2">
                        <span className="text-[11px] font-bold text-[#6e7a71] dark:text-slate-400 block px-1">
                          {tr('اقتراحات سريعة للبدء:', 'Quick starter questions:')}
                        </span>
                        <div className="grid grid-cols-1 gap-2">
                          {starterPrompts.map((prompt) => (
                            <button
                              key={prompt}
                              type="button"
                              onClick={() => void sendMessage(prompt)}
                              className="text-start min-h-[42px] px-3.5 py-2 rounded-xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 hover:border-[#006a46] text-xs font-semibold text-[#0e1d25] dark:text-slate-200 transition-colors"
                            >
                              {prompt}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {messages.map((msg) => {
                    const isUser = msg.role === 'user';
                    return (
                      <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[88%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed space-y-2 ${
                            isUser
                              ? 'bg-[#006a46] text-white rounded-be-sm'
                              : 'bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 text-[#0e1d25] dark:text-slate-100 rounded-bs-sm shadow-xs'
                          }`}
                        >
                          <div className="whitespace-pre-line">{msg.text}</div>
                          {!isUser && (
                            <div className="pt-1.5 border-t border-slate-100 dark:border-white/10 flex flex-wrap items-center justify-between gap-2">
                              {msg.offerLiveConnect && (
                                <button
                                  type="button"
                                  onClick={() => setPanelTab('live')}
                                  className="px-2.5 py-1 rounded-lg bg-[#eefaf3] dark:bg-[#133126] text-[#006a46] dark:text-[#6cdba6] text-[11px] font-bold hover:brightness-95"
                                >
                                  {tr('فتح نافذة التواصل المباشر ←', 'Continue to Direct Chat')}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => void copyReply(msg.text)}
                                className="text-[11px] font-semibold text-[#006a46] dark:text-[#6cdba6] flex items-center gap-1 hover:underline ms-auto"
                              >
                                <Copy className="w-3 h-3" />
                                <span>{tr('نسخ الإجابة', 'Copy')}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {loading && (
                    <div className="flex justify-start">
                      <div className="rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 px-4 py-3 text-xs font-semibold text-[#006a46] dark:text-[#6cdba6] flex items-center gap-2">
                        <Sparkles className="w-4 h-4 animate-spin" />
                        <span>{tr('جاري البحث وتجهيز الإجابة...', 'Thinking & finding details...')}</span>
                      </div>
                    </div>
                  )}

                  {errorMsg && (
                    <div className="rounded-xl bg-[#ffdad6]/60 dark:bg-rose-950/60 border border-[#ba1a1a]/30 p-3 text-xs text-[#93000a] dark:text-rose-200 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{errorMsg}</span>
                    </div>
                  )}
                </div>

                {/* Chat Composer */}
                <form
                  onSubmit={handleSubmitChat}
                  className="p-3 bg-white dark:bg-[#091c15] border-t border-slate-200/80 dark:border-white/10 flex items-center gap-2 shrink-0"
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={tr('اكتب سؤالك هنا...', 'Ask anything about the site...')}
                    disabled={loading}
                    className="flex-1 min-h-[44px] px-3.5 rounded-xl bg-[#f4faff] dark:bg-[#112921] border border-slate-200/80 dark:border-white/10 text-sm text-[#0e1d25] dark:text-white focus:outline-none focus:border-[#006a46]"
                  />
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    aria-label={tr('إرسال', 'Send')}
                    className="min-w-[44px] min-h-[44px] px-3.5 rounded-xl bg-[#006a46] hover:bg-[#005235] disabled:opacity-45 text-white flex items-center justify-center transition-colors shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </>
            ) : panelTab === 'live' ? (
              <>
                <div className="px-4 py-2.5 bg-[#eefaf3] dark:bg-[#0c211a] border-b border-slate-200/70 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 shrink-0">
                  <input
                    type="text"
                    value={liveVisitorName}
                    onChange={(e) => setLiveVisitorName(e.target.value)}
                    placeholder={tr('اسمك الاختياري...', 'Your name (optional)')}
                    className="min-h-[34px] px-3 rounded-lg bg-white dark:bg-[#081712] border border-slate-200 dark:border-white/10 text-xs flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => setPanelTab('submit')}
                    className="text-[11px] font-bold text-[#006a46] dark:text-[#6cdba6] hover:underline shrink-0"
                  >
                    {tr('أو أرسل تذكرة رسمية ←', 'Or submit a ticket')}
                  </button>
                </div>

                {liveMeetUrl && isSafeHttpsUrl(liveMeetUrl) && (
                  <div className="mx-4 mt-3 rounded-2xl bg-[#006a46] text-white p-3.5 flex items-center justify-between gap-2 shrink-0">
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <Video className="w-4 h-4 text-[#ffdea8] shrink-0" />
                      <span>{tr('دعوة جلسة Google Meet مباشرة جاهزة', 'Direct Google Meet call invite ready')}</span>
                    </div>
                    <a
                      href={liveMeetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-[#ffdea8] text-[#271900] text-xs font-extrabold shrink-0"
                    >
                      {tr('انضمام', 'Join')}
                    </a>
                  </div>
                )}

                <div ref={liveScrollRef} className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-[#f4faff] dark:bg-[#06120e]">
                  {liveMessages.length === 0 ? (
                    <div className="rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-4 text-xs text-[#3e4a42] dark:text-slate-300 leading-relaxed space-y-2">
                      <p className="font-bold text-[#0e1d25] dark:text-white">
                        {tr('قناة التواصل المباشر والاستفسارات', 'Direct Communication Channel')}
                      </p>
                      <p>
                        {tr(
                          'اكتب رسالتك أو استفسارك هنا وسيتم حفظها والرد عليها في أقرب وقت ممكن بإذن الله.',
                          'Write your message or inquiry here and it will be answered as soon as possible.',
                        )}
                      </p>
                      <p className="text-[11px] text-[#6e7a71] dark:text-slate-400">
                        {liveConnected
                          ? tr('القناة النصية جاهزة للإرسال.', 'Text channel ready.')
                          : tr('جاري تجهيز قناة الإرسال...', 'Preparing channel...')}
                      </p>
                    </div>
                  ) : (
                    liveMessages.map((m) => (
                      <div
                        key={m.id}
                        className={`flex ${m.senderRole === 'visitor' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm space-y-1 ${
                            m.senderRole === 'visitor'
                              ? 'bg-[#006a46] text-white'
                              : 'bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 text-[#0e1d25] dark:text-slate-100'
                          }`}
                        >
                          <span className="block text-[10px] font-bold opacity-80">{m.senderName}</span>
                          <p className="whitespace-pre-line">{m.text}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <form
                  onSubmit={sendLiveMessage}
                  className="p-3 bg-white dark:bg-[#091c15] border-t border-slate-200/80 dark:border-white/10 flex items-center gap-2 shrink-0"
                >
                  <input
                    type="text"
                    value={liveInput}
                    onChange={(e) => setLiveInput(e.target.value)}
                    placeholder={tr('اكتب رسالتك المباشرة هنا...', 'Write your direct message...')}
                    className="flex-1 min-h-[44px] px-3.5 rounded-xl bg-[#f4faff] dark:bg-[#112921] border border-slate-200/80 dark:border-white/10 text-sm text-[#0e1d25] dark:text-white focus:outline-none focus:border-[#006a46]"
                  />
                  <button
                    type="submit"
                    disabled={!liveInput.trim()}
                    aria-label={tr('إرسال', 'Send')}
                    className="min-w-[44px] min-h-[44px] px-3.5 rounded-xl bg-[#006a46] hover:bg-[#005235] disabled:opacity-45 text-white flex items-center justify-center shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </>
            ) : (
              /* Direct Submission Form to Manager Inbox */
              <div className="flex-1 overflow-y-auto p-4 bg-[#f4faff] dark:bg-[#06120e] space-y-4">
                {formSuccess ? (
                  <div className="rounded-2xl bg-white dark:bg-[#0d211a] border border-[#006a46]/30 p-6 text-center space-y-4 shadow-xs">
                    <div className="w-12 h-12 rounded-2xl bg-[#eefaf3] dark:bg-[#133126] text-[#006a46] dark:text-[#6cdba6] flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="text-base font-bold text-[#0e1d25] dark:text-white">
                        {tr('وصلت رسالتك إلى المشرفين والمدراء بنجاح', 'Message Delivered Privately')}
                      </h3>
                      <p className="text-xs sm:text-sm text-[#3e4a42] dark:text-slate-300 leading-relaxed">
                        {tr(
                          'جزاك الله خيراً! تظهر رسالتك الآن في قسم رسائل المراسلين والزوار الخاص بالمشرفين والمدراء فقط.',
                          'JazakAllah Khair! Your submission is now visible privately to Supervisors & Managers.',
                        )}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFormSuccess(false)}
                        className="min-h-[42px] px-4 py-2 rounded-xl bg-[#006a46] text-white text-xs font-bold"
                      >
                        {tr('إرسال رسالة أخرى', 'Send Another')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPanelTab('chat')}
                        className="min-h-[42px] px-4 py-2 rounded-xl bg-[#e8f6ff] dark:bg-[#112921] text-[#006a46] dark:text-[#6cdba6] text-xs font-bold"
                      >
                        {tr('العودة إلى مساعدك الدعوي', 'Back to Dawah Guide')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitDirectMessage} className="space-y-3.5">
                    <div className="rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-3.5 text-xs text-[#3e4a42] dark:text-slate-300 leading-relaxed">
                      {tr(
                        'تصل جميع مقترحات تطوير الموقع، وطلبات العمل أو التسجيل في الفريق التطوعي، ورسائل الدعم والمراسلين إلى القسم السري الخاص بالمشرفين والمدراء فقط.',
                        'All site development proposals, work/volunteer team requests, and support messages go directly to the private Supervisors & Managers inbox.',
                      )}
                    </div>

                    {/* Kind Selector */}
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          {id: 'suggestion', label: tr('مقترح تطوير الموقع', 'Site Proposal'), Icon: Lightbulb},
                          {id: 'team_join', label: tr('طلب عمل / فريق تطوعي', 'Work / Volunteer'), Icon: UserPlus},
                          {id: 'contribution', label: tr('رسالة دعم ومبادرة', 'Support / Donation'), Icon: HandHeart},
                          {id: 'help', label: tr('رسالة مراسل / مساعدة', 'Correspondent / Help'), Icon: HelpCircle},
                        ] as const
                      ).map(({id, label, Icon}) => {
                        const active = subKind === id;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => {
                              setSubKind(id);
                              setFormError(null);
                            }}
                            className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                              active
                                ? 'bg-[#006a46] text-white shadow-xs'
                                : 'bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 text-[#3e4a42] dark:text-slate-300'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            <span>{label}</span>
                          </button>
                        );
                      })}
                    </div>

                    <input
                      type="text"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder={tr('الاسم أو اللقب (اختياري)', 'Your name (optional)')}
                      className="w-full min-h-[42px] px-3.5 rounded-xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 text-sm text-[#0e1d25] dark:text-white focus:outline-none focus:border-[#006a46]"
                    />

                    {subKind === 'team_join' && (
                      <div className="space-y-2.5 rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-[#6e7a71] dark:text-slate-400 block">
                            {tr('مجال الانضمام للفريق', 'Team Role / Field')}
                          </label>
                          <select
                            value={teamField}
                            onChange={(e) => setTeamField(e.target.value)}
                            className="w-full min-h-[40px] rounded-xl bg-[#f4faff] dark:bg-[#112921] px-3 text-xs font-semibold text-[#0e1d25] dark:text-white focus:outline-none"
                          >
                            <option value="التدقيق اللغوي والشرعي وتخريج الأحاديث">
                              {tr('التدقيق اللغوي والشرعي وتخريج الأحاديث', 'Proofreading & Hadith Verification')}
                            </option>
                            <option value="إدارة المنصات والنشر اليومي">
                              {tr('إدارة المنصات والنشر اليومي', 'Content Publishing & Channels')}
                            </option>
                            <option value="التصميم الجرافيكي وبطاقات المواعظ">
                              {tr('التصميم الجرافيكي وبطاقات المواعظ', 'Graphic Design & Cards')}
                            </option>
                            <option value="المونتاج والهندسة الصوتية">
                              {tr('المونتاج والهندسة الصوتية', 'Audio & Video Editing')}
                            </option>
                            <option value="البرمجة والتطوير التقني">
                              {tr('البرمجة والتطوير التقني', 'Technical Development')}
                            </option>
                            <option value="الإشراف والرد على استفسارات الأعضاء">
                              {tr('الإشراف والرد على استفسارات الأعضاء', 'Community Moderation & Support')}
                            </option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-[#6e7a71] dark:text-slate-400 block">
                            {tr('الوقت المتاح أسبوعياً', 'Weekly Availability')}
                          </label>
                          <div className="grid grid-cols-3 gap-1.5">
                            {[
                              {id: '2-4', label: tr('٢-٤ ساعات', '2-4 hrs')},
                              {id: '5-8', label: tr('٥-٨ ساعات', '5-8 hrs')},
                              {id: '10+', label: tr('+١٠ ساعات', '10+ hrs')},
                            ].map((h) => (
                              <button
                                key={h.id}
                                type="button"
                                onClick={() => setTeamHours(h.id)}
                                className={`min-h-[36px] rounded-lg text-xs font-bold ${
                                  teamHours === h.id
                                    ? 'bg-[#006a46] text-white'
                                    : 'bg-[#f4faff] dark:bg-[#112921] text-[#3e4a42] dark:text-slate-300'
                                }`}
                              >
                                {h.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <textarea
                      rows={4}
                      required
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder={
                        subKind === 'team_join'
                          ? tr(
                              'اكتب نبذة عن خبرتك ومهاراتك وكيف تحب أن تشارك معنا في فريق الموقع...',
                              'Share your skills, background, and how you would like to serve on the team...',
                            )
                          : subKind === 'contribution'
                            ? tr(
                                'اكتب تفاصيل مساهمتك أو مبادرتك الخيرية...',
                                'Share details of your contribution or initiative...',
                              )
                            : subKind === 'help'
                              ? tr(
                                  'اكتب استفسارك أو المشكلة التي تحتاج مساعدة فيها...',
                                  'Describe how we can help you...',
                                )
                              : tr(
                                  'اكتب مقترحك أو فكرتك لتطوير الموقع أو إضافة مواعظ ومحتوى...',
                                  'Write your suggestion or idea for the platform...',
                                )
                      }
                      className="w-full p-3.5 rounded-xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 text-sm text-[#0e1d25] dark:text-white focus:outline-none focus:border-[#006a46]"
                    />

                    <input
                      type="text"
                      required={subKind === 'team_join'}
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder={
                        subKind === 'team_join'
                          ? tr(
                              'وسيلة التواصل (بريد إلكتروني، تيليجرام، أو واتساب) *',
                              'Contact info (Email, Telegram, or WhatsApp) *',
                            )
                          : tr(
                              'بريد إلكتروني أو معرّف تواصل للرد عليك (اختياري)',
                              'Email or contact handle for reply (optional)',
                            )
                      }
                      className="w-full min-h-[42px] px-3.5 rounded-xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 text-sm text-[#0e1d25] dark:text-white focus:outline-none focus:border-[#006a46]"
                    />

                    {formError && (
                      <div className="rounded-xl bg-[#ffdad6]/60 dark:bg-rose-950/60 border border-[#ba1a1a]/30 p-3 text-xs text-[#93000a] dark:text-rose-200 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{formError}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submittingForm}
                      className="w-full min-h-[46px] rounded-xl bg-[#006a46] hover:bg-[#005235] disabled:opacity-60 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                      <Send className="w-4 h-4" />
                      <span>
                        {submittingForm
                          ? tr('جاري الإرسال للمدير...', 'Sending to Manager...')
                          : subKind === 'team_join'
                            ? tr('إرسال طلب الانضمام للمدير', 'Submit Team Application')
                            : tr('إرسال الرسالة لقسم الرسائل', 'Send to Manager Inbox')}
                      </span>
                    </button>
                  </form>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
