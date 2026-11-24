import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  HandHeart,
  Lock,
  MessageSquareText,
  Play,
  Radio,
  Send,
  Sparkles,
  Sun,
  Users,
  Video,
  Youtube,
} from 'lucide-react';
import {useEffect, useMemo, useRef, useState, type FormEvent} from 'react';
import {DEAF_MUTE_VISUAL_CARDS} from '../data/contentRepository';
import type {
  AdminMeetConfig,
  DeafMuteRoomSnapshot,
  DeafMuteVideoItem,
  LiveSupportMessage,
  LiveSupportSession,
  NavTab,
} from '../types';
import {ComingSoonState} from './ComingSoonState';

function extractYoutubeEmbedId(rawUrl?: string): string | null {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/i,
  ];
  for (const pat of patterns) {
    const m = trimmed.match(pat);
    if (m?.[1]) return m[1];
  }
  return null;
}

function isSafeHttpsUrl(raw?: string): boolean {
  if (!raw) return false;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

const DEFAULT_COMMUNITY_ROOM: DeafMuteRoomSnapshot = {
  onlineCount: 0,
  approvedCount: 0,
  hasPublishedLink: false,
  publishedLinkUrl: '',
  linkTitle: 'لقاء المحادثة المباشرة لفئة الصم والبكم',
  yourStatus: 'none',
  messages: [],
};

export function DeafMuteView({
  videos = [],
  meetConfig,
  isAdmin = false,
  onAdminQuickAdd,
  onNavigate,
  onNotify,
}: {
  videos?: DeafMuteVideoItem[];
  meetConfig?: AdminMeetConfig;
  isAdmin?: boolean;
  onAdminQuickAdd?: () => void;
  onNavigate: (tab: NavTab) => void;
  onNotify?: (msg: string) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'upcoming'>('all');
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  // Live Support 1-to-1 WebSocket state with supervisor
  const [chatOpen, setChatOpen] = useState(false);
  const [visitorName, setVisitorName] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem('mawaedh_dm_display_name_v1') || 'زائر من واحة الصم والبكم';
    }
    return 'زائر من واحة الصم والبكم';
  });
  const [sessionId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('mawaedh_dm_ws_session_v1');
      if (saved) return saved;
      const fresh = `dm_sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      window.localStorage.setItem('mawaedh_dm_ws_session_v1', fresh);
      return fresh;
    }
    return `dm_sess_${Date.now().toString(36)}`;
  });
  const [peerId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('mawaedh_dm_peer_id_v1');
      if (saved) return saved;
      const fresh = `dm_peer_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      window.localStorage.setItem('mawaedh_dm_peer_id_v1', fresh);
      return fresh;
    }
    return `dm_peer_${Date.now().toString(36)}`;
  });

  const [chatMessages, setChatMessages] = useState<LiveSupportMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const [sessionMeetInviteUrl, setSessionMeetInviteUrl] = useState<string>('');
  const wsRef = useRef<WebSocket | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Peer-to-peer Deaf & Mute Community Live Room state (real-time online count + supervisor-gated link & chat)
  const [roomState, setRoomState] = useState<DeafMuteRoomSnapshot>(DEFAULT_COMMUNITY_ROOM);
  const [roomConnected, setRoomConnected] = useState(false);
  const [peerInput, setPeerInput] = useState('');
  const roomWsRef = useRef<WebSocket | null>(null);
  const roomScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && visitorName.trim()) {
      window.localStorage.setItem('mawaedh_dm_display_name_v1', visitorName.trim());
    }
  }, [visitorName]);

  const safeVideos = useMemo(
    () => (Array.isArray(videos) ? videos.filter((v) => Boolean(v && typeof v === 'object')) : []),
    [videos],
  );

  const filteredVideos = useMemo(() => {
    if (statusFilter === 'all') return safeVideos;
    return safeVideos.filter((v) => v.status === statusFilter);
  }, [safeVideos, statusFilter]);

  useEffect(() => {
    if (chatOpen && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, chatOpen]);

  useEffect(() => {
    if (roomScrollRef.current) {
      roomScrollRef.current.scrollTop = roomScrollRef.current.scrollHeight;
    }
  }, [roomState.messages]);

  // Always maintain real-time presence subscription for Deaf & Mute Community Live Room
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/live-support`);
    roomWsRef.current = ws;

    ws.onopen = () => {
      setRoomConnected(true);
      ws.send(
        JSON.stringify({
          type: 'dm_room_subscribe',
          peerId,
        }),
      );
    };

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(String(evt.data || '{}')) as {
          type?: string;
          room?: DeafMuteRoomSnapshot;
        };
        if (data.type === 'dm_room_state' && data.room) {
          setRoomState(data.room);
        }
      } catch {
        // Ignore malformed frame
      }
    };

    ws.onclose = () => setRoomConnected(false);
    ws.onerror = () => setRoomConnected(false);

    return () => {
      ws.close();
      roomWsRef.current = null;
    };
  }, [peerId]);

  // 1-to-1 supervisor text support socket
  useEffect(() => {
    if (!chatOpen || typeof window === 'undefined') return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/live-support`);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      ws.send(
        JSON.stringify({
          type: 'join',
          sessionId,
          role: 'visitor',
          visitorName: visitorName.trim() || 'زائر من واحة الصم والبكم',
          topic: 'deaf_mute',
          isDeafMute: true,
        }),
      );
    };

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(String(evt.data || '{}')) as {
          type?: string;
          session?: LiveSupportSession;
          messages?: LiveSupportMessage[];
          message?: LiveSupportMessage;
          meetInviteUrl?: string;
        };
        if (data.type === 'session_update' && data.session) {
          setChatMessages(Array.isArray(data.session.messages) ? data.session.messages : []);
          if (data.session.meetInviteUrl && isSafeHttpsUrl(data.session.meetInviteUrl)) {
            setSessionMeetInviteUrl(data.session.meetInviteUrl);
          }
        } else if (data.type === 'session_state' && Array.isArray(data.messages)) {
          setChatMessages(data.messages);
          if (data.meetInviteUrl && isSafeHttpsUrl(data.meetInviteUrl)) {
            setSessionMeetInviteUrl(data.meetInviteUrl);
          }
        } else if (data.type === 'new_message' && data.message) {
          setChatMessages((prev) =>
            prev.some((m) => m.id === data.message!.id) ? prev : [...prev, data.message!],
          );
          if (data.message.meetInviteUrl && isSafeHttpsUrl(data.message.meetInviteUrl)) {
            setSessionMeetInviteUrl(data.message.meetInviteUrl);
          }
        } else if (data.type === 'meet_invite' && data.meetInviteUrl && isSafeHttpsUrl(data.meetInviteUrl)) {
          setSessionMeetInviteUrl(data.meetInviteUrl);
        }
      } catch {
        // Ignore malformed frame
      }
    };

    ws.onclose = () => setWsConnected(false);
    ws.onerror = () => setWsConnected(false);

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [chatOpen, sessionId, visitorName]);

  const sendLiveMessage = (e: FormEvent) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      onNotify?.('جاري إعادة الاتصال بخدمة التواصل المباشر، انتظر لحظة...');
      return;
    }
    wsRef.current.send(
      JSON.stringify({
        type: 'message',
        sessionId,
        senderName: visitorName.trim() || 'زائر من واحة الصم والبكم',
        text,
      }),
    );
    setChatInput('');
  };

  const submitRoomJoinRequest = (requestedMode: 'watch' | 'participate') => {
    const cleanName = visitorName.trim();
    if (!cleanName) {
      onNotify?.('يرجى كتابة اسمك أولاً لإرسال الطلب للمسؤول');
      return;
    }
    if (!roomWsRef.current || roomWsRef.current.readyState !== WebSocket.OPEN) {
      onNotify?.('جاري الاتصال بالغرفة المباشرة، حاول بعد لحظة...');
      return;
    }
    roomWsRef.current.send(
      JSON.stringify({
        type: 'dm_room_request',
        peerId,
        visitorName: cleanName,
        requestedMode,
      }),
    );
    onNotify?.(
      requestedMode === 'watch'
        ? 'تم إرسال طلب المشاهدة إلى مسؤول قسم الصم والبكم'
        : 'تم إرسال طلب الانضمام للمحادثة المباشرة إلى مسؤول قسم الصم والبكم',
    );
  };

  const sendPeerCommunityMessage = (rawText?: string) => {
    const text = (rawText ?? peerInput).trim();
    if (!text) return;
    if (!roomWsRef.current || roomWsRef.current.readyState !== WebSocket.OPEN) {
      onNotify?.('جاري إعادة الاتصال بالمحادثة المباشرة...');
      return;
    }
    roomWsRef.current.send(
      JSON.stringify({
        type: 'dm_room_message',
        peerId,
        text,
      }),
    );
    if (rawText === undefined) setPeerInput('');
  };

  // Show Google Meet ONLY if explicitly invited in this Deaf & Mute session or global visibility is 'all_subscribers'
  const effectiveMeetUrl =
    (sessionMeetInviteUrl && isSafeHttpsUrl(sessionMeetInviteUrl) ? sessionMeetInviteUrl : '') ||
    (meetConfig?.visibility === 'all_subscribers' && isSafeHttpsUrl(meetConfig.activeRoomUrl)
      ? meetConfig.activeRoomUrl
      : '');

  const isApprovedRoomMember =
    roomState.yourStatus === 'approved_participant' || roomState.yourStatus === 'approved_viewer';
  const isApprovedParticipant = roomState.yourStatus === 'approved_participant';
  const isPendingApproval =
    roomState.yourStatus === 'pending_watch' || roomState.yourStatus === 'pending_participate';

  return (
    <div className="space-y-6 pb-8">
      {/* Header Banner with Blurred Atmosphere */}
      <section className="relative overflow-hidden rounded-3xl border border-amber-500/35 bg-gradient-to-br from-[#f2fbf7] via-[#fffdf7] to-[#eef7fb] dark:from-[#0c241c] dark:via-[#12261e] dark:to-[#0b1f27] p-6 sm:p-9 shadow-sm text-center">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <img
            src="/assets/deaf-mute-bg.jpg"
            alt=""
            className="w-full h-full object-cover object-center blur-2xl scale-125 opacity-25 dark:opacity-20 saturate-75 select-none"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/70 to-white/85 dark:from-[#071812]/80 dark:via-[#071812]/72 dark:to-[#071812]/88 backdrop-blur-md" />
        </div>

        <div className="relative z-10 space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-[#006a46] text-[#ffdea8] flex items-center justify-center mx-auto shadow-md">
            <HandHeart className="w-8 h-8" />
          </div>

          <div className="space-y-3 max-w-2xl mx-auto">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0e1d25] dark:text-white leading-snug">
              قسم الصم والبكم · واحة القراءة البصرية الميسّرة
            </h1>

            <p className="text-sm sm:text-base font-bold text-[#006a46] dark:text-[#6cdba6] flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>بإدارة المهندس يونس عبدالكريم</span>
            </p>

            <p className="text-sm sm:text-base text-[#222f28] dark:text-slate-200 font-medium leading-[1.85]">
              مساحة علمية ودعوية ميسّرة القراءة لإخواننا وأخواتنا من فئة الصم والبكم؛ تعرض الفوائد والمواعظ والأذكار بصياغة بصرية واضحة، مع شروحات ومرئيات مترجمة بلغة الإشارة من القناة الرسمية على يوتيوب وغرفة تواصل مباشر بإشراف المسؤول.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setChatOpen((v) => !v)}
              className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-[#006a46] hover:bg-[#005235] text-white text-sm font-extrabold flex items-center gap-2 transition-colors shadow-xs"
            >
              <MessageSquareText className="w-4 h-4" />
              <span>{chatOpen ? 'إخفاء مراسلة المشرف' : 'مراسلة مسؤول القسم مباشرة'}</span>
            </button>

            {effectiveMeetUrl && (
              <a
                href={effectiveMeetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-[#7c5800] hover:bg-[#614400] text-white text-sm font-extrabold flex items-center gap-2 transition-colors shadow-xs"
              >
                <Video className="w-4 h-4" />
                <span>دعوة Google Meet الخاصة بك</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            {isAdmin && onAdminQuickAdd && (
              <button
                type="button"
                onClick={onAdminQuickAdd}
                className="min-h-[44px] px-4 py-2.5 rounded-2xl bg-[#ffdea8] hover:bg-[#ffc968] text-[#271900] text-xs sm:text-sm font-extrabold transition-colors"
              >
                + إدارة القسم وإضافة فيديو
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Peer-to-Peer Deaf & Mute Community Live Room (Gated Link + Real-time Connected Count + Supervisor Approval) */}
      <section className="rounded-3xl bg-white dark:bg-[#0c211a] border-2 border-[#006a46]/30 dark:border-[#6cdba6]/25 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 dark:border-white/10 pb-3.5">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Radio className={`w-5 h-5 ${roomConnected ? 'text-emerald-600 animate-pulse' : 'text-slate-400'}`} />
              <h2 className="text-base sm:text-lg font-extrabold text-[#0e1d25] dark:text-white">
                غرفة المحادثة المباشرة بين فئة الصم والبكم
              </h2>
            </div>
            <p className="text-xs text-[#6e7a71] dark:text-slate-400">
              تربط الحاضرين معاً في محادثة مباشرة بإشراف المسؤول، ويُتاح الانضمام أو المشاهدة والرابط المباشر بعد موافقة المشرف.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs font-extrabold tabular-nums">
              <Users className="w-4 h-4 shrink-0" />
              <span>المتصلون الآن: {roomState.onlineCount.toLocaleString('ar-EG')}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f4faff] dark:bg-[#112921] border border-slate-200/80 dark:border-white/10 text-[#0e1d25] dark:text-slate-200 text-xs font-bold tabular-nums">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#006a46] dark:text-[#6cdba6]" />
              <span>المعتمدون: {roomState.approvedCount.toLocaleString('ar-EG')}</span>
            </span>
          </div>
        </div>

        {/* Link Visibility Status Banner */}
        {roomState.hasPublishedLink ? (
          isApprovedRoomMember && isSafeHttpsUrl(roomState.publishedLinkUrl) ? (
            <div className="rounded-2xl bg-gradient-to-r from-[#006a46] to-[#005235] text-white p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold text-[#ffdea8] block">
                  رابط المحادثة المباشرة المعتمد من مسؤول القسم
                </span>
                <p className="text-sm sm:text-base font-extrabold">
                  {roomState.linkTitle || 'لقاء المحادثة المباشرة لفئة الصم والبكم'}
                </p>
              </div>
              <a
                href={roomState.publishedLinkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] px-5 py-2 rounded-xl bg-[#ffdea8] hover:bg-[#ffc968] text-[#271900] text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-colors shrink-0"
              >
                <Video className="w-4 h-4" />
                <span>الدخول إلى رابط المحادثة المباشرة</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ) : (
            <div className="rounded-2xl bg-[#fffbf2] dark:bg-[#171d18] border border-amber-500/35 p-3.5 flex items-center gap-3 text-xs sm:text-sm text-amber-900 dark:text-amber-200 font-bold">
              <Lock className="w-4 h-4 shrink-0 text-amber-700 dark:text-amber-300" />
              <span>
                أرسل مسؤول قسم الصم والبكم رابط المحادثة المباشرة الآن — يظهر لك الرابط القابل للفتح تلقائياً فور موافقة المشرف على طلب المشاهدة أو الانضمام.
              </span>
            </div>
          )
        ) : (
          <div className="rounded-2xl bg-[#f4faff] dark:bg-[#081712] border border-slate-200/70 dark:border-white/10 p-3.5 flex items-center gap-2.5 text-xs text-[#6e7a71] dark:text-slate-400">
            <Clock className="w-4 h-4 shrink-0 text-[#006a46] dark:text-[#6cdba6]" />
            <span>
              رابط المحادثة المرئية مخفي حالياً؛ سيظهر هنا فور إرساله من مسؤول قسم الصم والبكم. يمكنك طلب الانضمام أو المشاهدة للمحادثة النصية المباشرة بين الإخوة الآن.
            </span>
          </div>
        )}

        {/* Approval Flow UI */}
        {!isApprovedRoomMember ? (
          <div className="rounded-2xl bg-[#f8fbf9] dark:bg-[#081712] border border-slate-200/80 dark:border-white/10 p-4 sm:p-5 space-y-4">
            {isPendingApproval ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-extrabold text-[#0e1d25] dark:text-white">
                      {roomState.yourStatus === 'pending_watch'
                        ? 'طلب المشاهدة بانتظار موافقة المشرف'
                        : 'طلب الانضمام للمحادثة بانتظار موافقة المشرف'}
                    </h3>
                    <p className="text-xs text-[#6e7a71] dark:text-slate-400">
                      أبقِ هذه الصفحة مفتوحة؛ بمجرد موافقة المسؤول سيتم ربطك مباشرة مع المتصلين وفتح المحادثة والرابط تلقائياً.
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1.5 rounded-xl bg-amber-100/90 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 text-xs font-extrabold shrink-0">
                  قيد المراجعة الفورية
                </span>
              </div>
            ) : (
              <>
                {roomState.yourStatus === 'rejected' && (
                  <p className="text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/30 border border-rose-500/25 rounded-xl px-3.5 py-2.5">
                    لم تتم الموافقة على الطلب السابق حالياً — يمكنك تحديث اسمك وإعادة إرسال الطلب للمسؤول.
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <label className="sm:col-span-5 space-y-1 block">
                    <span className="text-xs font-bold text-[#3e4a42] dark:text-slate-300">
                      الاسم الظاهر للمشرف والمشاركين
                    </span>
                    <input
                      type="text"
                      value={visitorName}
                      onChange={(e) => setVisitorName(e.target.value)}
                      placeholder="اكتب اسمك أو كنيتك..."
                      className="w-full min-h-[42px] px-3.5 rounded-xl bg-white dark:bg-[#0d211a] border border-slate-200 dark:border-white/15 text-sm font-bold"
                    />
                  </label>

                  <div className="sm:col-span-7 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => submitRoomJoinRequest('participate')}
                      className="flex-1 min-h-[42px] px-4 py-2 rounded-xl bg-[#006a46] hover:bg-[#005235] text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <MessageSquareText className="w-4 h-4 shrink-0" />
                      <span>طلب الانضمام للمحادثة</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => submitRoomJoinRequest('watch')}
                      className="flex-1 min-h-[42px] px-4 py-2 rounded-xl bg-[#e8f6ff] hover:bg-[#d7eefc] dark:bg-[#133126] text-[#006a46] dark:text-[#6cdba6] text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Eye className="w-4 h-4 shrink-0" />
                      <span>طلب المشاهدة فقط</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          /* Approved Live Group Conversation */
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isApprovedParticipant
                    ? 'تمت الموافقة — أنت متصل الآن ويمكنك المحادثة مباشرة مع المشاركين'
                    : 'تمت الموافقة — أنت في وضع المشاهدة المباشرة (قراءة فقط)'}
                </span>
              </span>
              {!isApprovedParticipant && (
                <button
                  type="button"
                  onClick={() => submitRoomJoinRequest('participate')}
                  className="text-xs font-extrabold text-[#006a46] dark:text-[#6cdba6] underline"
                >
                  طلب ترقية للمشاركة الكتابية
                </button>
              )}
            </div>

            <div
              ref={roomScrollRef}
              className="h-64 overflow-y-auto rounded-2xl bg-[#f4faff] dark:bg-[#081712] border border-slate-200/70 dark:border-white/10 p-4 space-y-2.5"
            >
              {roomState.messages.length === 0 ? (
                <p className="text-xs sm:text-sm text-[#6e7a71] dark:text-slate-400 text-center py-10">
                  المحادثة المباشرة مفتوحة الآن للمعتمدين. ابدأ بإلقاء السلام ليظهر مباشرة لجميع المشاركين والمشاهدين.
                </p>
              ) : (
                roomState.messages.map((msg) => {
                  const isMine = msg.senderId === peerId;
                  const isSupervisor = msg.senderRole === 'supervisor';
                  return (
                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm space-y-1 ${
                          isMine
                            ? 'bg-[#006a46] text-white'
                            : isSupervisor
                              ? 'bg-[#fffbf2] dark:bg-[#1a2013] border border-amber-500/40 text-[#0e1d25] dark:text-[#ffdea8]'
                              : 'bg-white dark:bg-[#0d211a] border border-slate-200 dark:border-white/10 text-[#0e1d25] dark:text-white'
                        }`}
                      >
                        <span className="text-[10px] font-extrabold opacity-80 block">
                          {msg.senderName}
                        </span>
                        <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {isApprovedParticipant && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'السلام عليكم ورحمة الله وبركاته',
                    'بارك الله فيكم ونفع بكم',
                    'أحسن الله إليكم',
                    'ممكن توضيح أكثر بلغة الإشارة؟',
                  ].map((quick) => (
                    <button
                      key={quick}
                      type="button"
                      onClick={() => sendPeerCommunityMessage(quick)}
                      className="px-3 py-1 rounded-xl bg-[#eefaf3] dark:bg-[#133126] text-[#006a46] dark:text-[#6cdba6] text-xs font-bold hover:brightness-95 transition-colors"
                    >
                      {quick}
                    </button>
                  ))}
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendPeerCommunityMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={peerInput}
                    onChange={(e) => setPeerInput(e.target.value)}
                    placeholder="اكتب رسالتك للمتصلين في غرفة الصم والبكم..."
                    className="flex-1 min-h-[44px] px-4 rounded-xl bg-[#f4faff] dark:bg-[#081712] border border-slate-200 dark:border-white/10 text-sm focus:outline-none focus:border-[#006a46]"
                  />
                  <button
                    type="submit"
                    disabled={!peerInput.trim()}
                    className="min-h-[44px] px-5 rounded-xl bg-[#006a46] hover:bg-[#005235] disabled:opacity-50 text-white text-xs sm:text-sm font-extrabold flex items-center gap-1.5"
                  >
                    <Send className="w-4 h-4" />
                    <span>إرسال</span>
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Live 1-to-1 Text Chat with Section Supervisor */}
      {chatOpen && (
        <section className="rounded-3xl bg-white dark:bg-[#0c211a] border border-[#006a46]/30 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 dark:border-white/10 pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-[#0e1d25] dark:text-white flex items-center gap-2">
                <MessageSquareText className="w-5 h-5 text-[#006a46] dark:text-[#6cdba6]" />
                <span>مراسلة مباشرة مع مسؤول القسم</span>
              </h2>
              <p className="text-xs text-[#6e7a71] dark:text-slate-400">
                اكتب استفسارك الخاص وسيرد عليك فريق الإشراف كتابياً أو عبر دعوة Meet خاصة.
              </p>
            </div>
            <input
              type="text"
              value={visitorName}
              onChange={(e) => setVisitorName(e.target.value)}
              placeholder="الاسم للتعريف (اختياري)"
              className="min-h-[38px] px-3 rounded-xl bg-[#f4faff] dark:bg-[#081712] border border-slate-200 dark:border-white/10 text-xs font-bold"
            />
          </div>

          <div
            ref={chatScrollRef}
            className="h-56 overflow-y-auto rounded-2xl bg-[#f4faff] dark:bg-[#081712] border border-slate-200/70 dark:border-white/10 p-4 space-y-2.5"
          >
            {chatMessages.length === 0 ? (
              <p className="text-xs sm:text-sm text-[#6e7a71] dark:text-slate-400 text-center py-8">
                أهلاً بك. اكتب رسالتك الخاصة لمسؤول قسم الصم والبكم أدناه.
              </p>
            ) : (
              chatMessages.map((msg) => {
                const isVisitor = msg.senderRole === 'visitor';
                return (
                  <div key={msg.id} className={`flex ${isVisitor ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm space-y-1 ${
                        isVisitor
                          ? 'bg-[#006a46] text-white'
                          : 'bg-white dark:bg-[#0d211a] border border-slate-200 dark:border-white/10 text-[#0e1d25] dark:text-white'
                      }`}
                    >
                      <span className="text-[10px] font-extrabold opacity-80 block">{msg.senderName}</span>
                      <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>
                      {msg.meetInviteUrl && isSafeHttpsUrl(msg.meetInviteUrl) && (
                        <a
                          href={msg.meetInviteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#7c5800] text-white text-xs font-extrabold"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>فتح جلسة Google Meet المخصصة لك</span>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={sendLiveMessage} className="flex items-center gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={wsConnected ? 'اكتب رسالتك الخاصة للمسؤول...' : 'جاري الاتصال...'}
              className="flex-1 min-h-[44px] px-4 rounded-xl bg-[#f4faff] dark:bg-[#081712] border border-slate-200 dark:border-white/10 text-sm focus:outline-none focus:border-[#006a46]"
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="min-h-[44px] px-5 rounded-xl bg-[#006a46] hover:bg-[#005235] disabled:opacity-50 text-white text-xs sm:text-sm font-extrabold flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              <span>إرسال</span>
            </button>
          </form>
        </section>
      )}

      {/* Visual, Easy-to-Read Islamic Guidance Cards */}
      <section className="space-y-3.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base sm:text-lg font-extrabold text-[#0e1d25] dark:text-white">
            بطاقات الفوائد والمواعظ والأذكار الميسّرة بصرياً
          </h2>
          <span className="text-xs font-bold text-[#006a46] dark:text-[#6cdba6]">
            {DEAF_MUTE_VISUAL_CARDS.length.toLocaleString('ar-EG')} بطاقات واضحة
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DEAF_MUTE_VISUAL_CARDS.map((card) => (
            <article
              key={card.id}
              className="rounded-3xl bg-white dark:bg-[#0c211a] border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 shadow-xs space-y-3.5"
            >
              <span className="inline-block px-3 py-1 rounded-xl bg-[#eefaf3] dark:bg-[#133126] text-[#006a46] dark:text-[#6cdba6] text-xs font-extrabold">
                {card.badge}
              </span>
              <h3 className="text-base sm:text-lg font-extrabold text-[#0e1d25] dark:text-white">
                {card.title}
              </h3>
              <ul className="space-y-2">
                {card.visualPoints.map((pt) => (
                  <li
                    key={pt}
                    className="flex items-start gap-2 text-sm text-[#28352e] dark:text-slate-200 leading-relaxed"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#006a46] dark:text-[#6cdba6] shrink-0 mt-1" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
              <div className="rounded-2xl bg-[#fffbf2] dark:bg-[#14201a] border border-amber-500/25 p-3.5 space-y-1">
                <p className="text-sm sm:text-base font-extrabold text-[#0e1d25] dark:text-[#ffdea8]">
                  {card.dhikrOrAyat}
                </p>
                <span className="text-xs font-semibold text-[#7c5800] dark:text-[#f2be5e] block">
                  {card.source}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Sign Language YouTube Channel Videos Section */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <Youtube className="w-5 h-5 text-[#ba1a1a]" />
            <h2 className="text-base sm:text-lg font-extrabold text-[#0e1d25] dark:text-white">
              فيديوهات قناة اليوتيوب المترجمة بلغة الإشارة
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            {(
              [
                {id: 'all', label: `الكل (${safeVideos.length.toLocaleString('ar-EG')})`},
                {id: 'published', label: 'منشورة الآن'},
                {id: 'upcoming', label: 'قريباً بإذن الله'},
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`min-h-[36px] px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                  statusFilter === f.id
                    ? 'bg-[#006a46] text-white'
                    : 'bg-white dark:bg-[#0c211a] border border-slate-200 dark:border-white/10 text-[#3e4a42] dark:text-slate-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filteredVideos.length === 0 ? (
          <ComingSoonState
            badgeText="قريباً بإذن الله"
            title="لا توجد فيديوهات منشورة في هذا التصنيف حالياً"
            description="يقوم المهندس يونس عبدالكريم والإدارة برفع الحلقات المرئية بلغة الإشارة تباعاً من قناة يوتيوب ليتمكن الإخوة والأخوات من مشاهدتها مباشرة داخل هذا القسم."
            isAdmin={isAdmin}
            onAdminQuickAdd={onAdminQuickAdd}
            adminAddLabel="+ إضافة رابط فيديو يوتيوب بلغة الإشارة"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVideos.map((vid) => {
              const ytId = extractYoutubeEmbedId(vid.youtubeUrl);
              const isPlaying = activeVideoId === vid.id && Boolean(ytId);
              return (
                <article
                  key={vid.id}
                  className="rounded-2xl bg-white dark:bg-[#0c211a] border border-slate-200/80 dark:border-white/10 overflow-hidden flex flex-col justify-between shadow-xs"
                >
                  <div>
                    {isPlaying && ytId ? (
                      <div className="aspect-video w-full bg-black">
                        <iframe
                          title={vid.title}
                          src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1`}
                          className="w-full h-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    ) : ytId ? (
                      <button
                        type="button"
                        onClick={() => setActiveVideoId(vid.id)}
                        className="relative w-full aspect-video bg-slate-900 group overflow-hidden block"
                      >
                        <img
                          src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
                          alt={vid.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-[#ba1a1a] text-white flex items-center justify-center shadow-lg">
                            <Play className="w-5 h-5 fill-current" />
                          </div>
                        </div>
                      </button>
                    ) : (
                      <div className="aspect-video w-full bg-gradient-to-br from-[#eefaf3] to-[#fffbf2] dark:from-[#0f2920] dark:to-[#171d18] flex flex-col items-center justify-center p-4 text-center space-y-2">
                        <Clock className="w-7 h-7 text-[#7c5800] dark:text-[#ffdea8]" />
                        <span className="text-xs font-extrabold text-[#7c5800] dark:text-[#ffdea8]">
                          قريباً على قناة اليوتيوب
                        </span>
                      </div>
                    )}

                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2 text-[11px] font-bold">
                        <span className="text-[#006a46] dark:text-[#6cdba6]">{vid.category}</span>
                        <span
                          className={`px-2 py-0.5 rounded-lg ${
                            vid.status === 'published' && ytId
                              ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200'
                              : 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200'
                          }`}
                        >
                          {vid.status === 'published' && ytId ? 'متاح للمشاهدة' : 'قريباً'}
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-extrabold text-[#0e1d25] dark:text-white leading-snug">
                        {vid.title}
                      </h3>
                      <p className="text-xs text-[#3e4a42] dark:text-slate-300 leading-relaxed">
                        {vid.description}
                      </p>
                      {vid.benefitText && (
                        <p className="text-xs text-[#006a46] dark:text-[#6cdba6] bg-[#eefaf3] dark:bg-[#0f261e] rounded-xl p-2.5 leading-relaxed">
                          {vid.benefitText}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="px-4 pb-4 flex items-center justify-between gap-2 text-xs">
                    <span className="text-[#6e7a71] dark:text-slate-400 font-semibold truncate">
                      بإدارة: {vid.managerName || 'المهندس يونس عبدالكريم'}
                    </span>
                    {ytId && (
                      <button
                        type="button"
                        onClick={() => setActiveVideoId(vid.id)}
                        className="px-3 py-1.5 rounded-xl bg-[#006a46] text-white font-bold flex items-center gap-1 shrink-0"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>تشغيل</span>
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Navigation Shortcuts */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-[#006a46] hover:bg-[#005235] text-white text-sm font-bold flex items-center gap-2 transition-colors shadow-xs"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة إلى الرئيسية</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('adhkar')}
          className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-[#e8f6ff] hover:bg-[#d5ecfb] dark:bg-[#133126] text-[#006a46] dark:text-[#6cdba6] text-sm font-bold flex items-center gap-2 transition-colors"
        >
          <Sun className="w-4 h-4" />
          <span>الأذكار والأدعية الجامعة</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('library')}
          className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 text-sm font-bold flex items-center gap-2 transition-colors"
        >
          <BookOpen className="w-4 h-4" />
          <span>المكتبة العلمية</span>
        </button>
      </div>
    </div>
  );
}
