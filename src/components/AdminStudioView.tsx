import {
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  CheckCircle2,
  Cloud,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  FileAudio,
  FolderHeart,
  HandHeart,
  Inbox,
  LayoutTemplate,
  Link as LinkIcon,
  LogOut,
  MessageSquare,
  Mic,
  MousePointerClick,
  Palette,
  Plus,
  Radio,
  RefreshCw,
  RotateCcw,
  Scale,
  Send,
  Share2,
  Shield,
  Sparkles,
  Square,
  Trash2,
  Upload,
  UserPlus,
  Video,
  X,
} from 'lucide-react';
import {useCallback, useEffect, useRef, useState, type ChangeEvent} from 'react';
import {
  CARD_THEMES,
  DEFAULT_APP_ICONS,
  DEFAULT_SITE_CONFIG,
  FATWA_CATEGORIES,
  FATWA_SCHOLARS,
  POST_CATEGORIES,
} from '../data/seed';
import type {
  AdminGesture,
  AdminMeetConfig,
  AdminRole,
  AdminSectionScope,
  AppIcons,
  AutomationSettings,
  CardTheme,
  ColorScheme,
  CustomAdhkarItem,
  CustomBookItem,
  DeafMuteVideoItem,
  EmblemVariant,
  FatwaItem,
  FatwaScholarId,
  LiveSupportSession,
  MediaType,
  MeetVisibilityMode,
  MotherOasisChapter,
  MotherOasisItem,
  NafahatMeta,
  Post,
  SiteAppearanceConfig,
  SiteBackgroundPreset,
  SiteConfig,
  SocialLink,
  SuggestionItem,
  VolunteerItem,
} from '../types';
import {
  cloudDeleteCustomAdhkar,
  cloudDeleteCustomBook,
  cloudDeleteDeafMuteVideo,
  cloudDeleteFatwa,
  cloudDeleteMotherOasis,
  cloudDeletePost,
  cloudSaveSiteSettings,
  cloudUpsertCustomAdhkar,
  cloudUpsertCustomBook,
  cloudUpsertDeafMuteVideo,
  cloudUpsertFatwa,
  cloudUpsertMotherOasis,
  cloudUpsertPost,
  isTrustedAdminUser,
  observeFirebaseAdminAuth,
  signInAdminWithGoogle,
  signOutFirebaseAdmin,
} from '../utils/cloudSync';
import {
  DEFAULT_MEET_HOST_EMAIL,
  connectGoogleMeetWithPopup,
  createGoogleMeetSpace,
  getConnectedMeetEmail,
  hasMeetAccessToken,
  initMeetOAuthObserver,
} from '../utils/googleMeetOAuth';
import {
  BrandEmblem,
  COLOR_SCHEME_STYLES,
  EMBLEM_OPTIONS,
  ICON_OPTIONS,
  resolveIcon,
} from './BrandEmblem';
import {AdminAnalyticsPanel} from './AdminAnalyticsPanel';
import {AdminMessagesPanel} from './AdminMessagesPanel';
import {LiveStatsStrip} from './LiveStatsStrip';
import {PWAInstallButton} from './PWAInstallButton';

const ICON_SLOT_LABELS: Array<{key: keyof Omit<AppIcons, 'brandEmblem'>; label: string}> = [
  {key: 'home', label: 'أيقونة تبويب الرئيسية'},
  {key: 'quran', label: 'أيقونة تبويب المصحف'},
  {key: 'hisn', label: 'أيقونة جوامع الأدعية اليومية (فرعي)'},
  {key: 'fatawa', label: 'أيقونة تبويب الفتاوى'},
  {key: 'adhkar', label: 'أيقونة تبويب الأذكار والأدعية الجامعة'},
  {key: 'channels', label: 'أيقونة تبويب المنصات'},
  {key: 'library', label: 'أيقونة الأرشيف والمكتبات'},
  {key: 'bookmarks', label: 'أيقونة تبويب المحفوظات'},
  {key: 'about', label: 'أيقونة تبويب من نحن'},
  {key: 'support', label: 'أيقونة تبويب المجتمع والدعم'},
  {key: 'dailyWisdom', label: 'أيقونة حكمة/موعظة اليوم'},
  {key: 'motherPrayer', label: 'أيقونة بطاقة دعاء الوالدة'},
];

export type AdminStudioTab =
  | 'studio'
  | 'messages'
  | 'mother-oasis'
  | 'deaf-mute'
  | 'adhkar-books'
  | 'live-support'
  | 'analytics'
  | 'fatawa'
  | 'automation'
  | 'appearance'
  | 'page-config'
  | 'links-icons';

const DEFAULT_AUTOMATION_LOCAL: AutomationSettings = {
  autoPostWebhookUrl: '',
  enabledPlatforms: {facebook: true, whatsapp: true, x: true},
  adminNotifyWebhookUrl: '',
  telegramBotToken: '',
  telegramChatId: '',
  emailJsServiceId: '',
  emailJsTemplateId: '',
  emailJsPublicKey: '',
};

const DEFAULT_APPEARANCE_LOCAL: SiteAppearanceConfig = {
  backgroundPreset: 'default',
  brightness: 100,
  announcementEnabled: false,
  announcementText: '',
  announcementUrl: '',
  maintenanceMode: false,
};

export function AdminStudioView({
  authToken,
  adminRole,
  adminUsername,
  assignedSection = 'all',
  posts,
  fatawa,
  suggestions,
  volunteers,
  currentGesture,
  initialTab = 'studio',
  initialEditPost = null,
  brandHandle,
  socialLinks,
  appIcons,
  siteConfig,
  siteAppearance = DEFAULT_APPEARANCE_LOCAL,
  automationSettings = DEFAULT_AUTOMATION_LOCAL,
  nafahatMeta,
  visitorsCount = 0,
  onlineVisitorsCount = 1,
  clicksCount = 0,
  onPublishPost,
  onUpdatePost,
  onDeletePost,
  onToggleHidePost,
  onTriggerAutoPost,
  onAddFatwa,
  onDeleteFatwa,
  onSaveSiteConfig,
  onSaveAppearance,
  onSaveAutomation,
  onUpdateSettings,
  onSaveCustomization,
  onRefreshNafahatAI,
  onResetCounters,
  onImportState,
  onUpdateMessages,
  motherOasisItems = [],
  onMotherOasisChange,
  deafMuteVideos = [],
  onDeafMuteVideosChange,
  customAdhkar = [],
  onCustomAdhkarChange,
  customBooks = [],
  onCustomBooksChange,
  meetConfig,
  onMeetConfigChange,
  onPreviewSite,
  onExitAdmin,
  onNotify,
}: {
  authToken: string;
  adminRole: AdminRole;
  adminUsername: string;
  assignedSection?: AdminSectionScope;
  posts: Post[];
  fatawa: FatwaItem[];
  suggestions: SuggestionItem[];
  volunteers: VolunteerItem[];
  currentGesture: AdminGesture;
  initialTab?: AdminStudioTab;
  initialEditPost?: Post | null;
  brandHandle: string;
  socialLinks: SocialLink[];
  appIcons: AppIcons;
  siteConfig: SiteConfig;
  siteAppearance?: SiteAppearanceConfig;
  automationSettings?: AutomationSettings;
  nafahatMeta?: NafahatMeta;
  visitorsCount?: number;
  onlineVisitorsCount?: number;
  clicksCount?: number;
  onPublishPost: (post: Post) => void;
  onUpdatePost: (post: Post) => void;
  onDeletePost: (id: string) => void;
  onToggleHidePost?: (id: string) => void;
  onTriggerAutoPost?: (id: string) => void;
  onAddFatwa: (fatwa: FatwaItem) => void;
  onDeleteFatwa: (id: string) => void;
  onSaveSiteConfig: (config: SiteConfig) => Promise<void>;
  onSaveAppearance?: (appearance: SiteAppearanceConfig) => Promise<void>;
  onSaveAutomation?: (automation: AutomationSettings) => Promise<void>;
  onUpdateSettings: (gesture: AdminGesture, targetUsername?: string, newPassword?: string) => Promise<void>;
  onSaveCustomization: (payload: {
    brandHandle: string;
    socialLinks: SocialLink[];
    appIcons: AppIcons;
  }) => Promise<void>;
  onRefreshNafahatAI?: () => Promise<{ok: boolean; message: string}>;
  onResetCounters: (posts: Post[], motherPrayersCount: number) => void;
  onImportState: (payload: {
    posts?: Post[];
    fatawa?: FatwaItem[];
    socialLinks?: SocialLink[];
    appIcons?: AppIcons;
    siteConfig?: SiteConfig;
    siteAppearance?: SiteAppearanceConfig;
    brandHandle?: string;
  }) => void;
  onUpdateMessages: (suggestions: SuggestionItem[], volunteers: VolunteerItem[]) => void;
  motherOasisItems?: MotherOasisItem[];
  onMotherOasisChange?: (items: MotherOasisItem[]) => void;
  deafMuteVideos?: DeafMuteVideoItem[];
  onDeafMuteVideosChange?: (items: DeafMuteVideoItem[]) => void;
  customAdhkar?: CustomAdhkarItem[];
  onCustomAdhkarChange?: (items: CustomAdhkarItem[]) => void;
  customBooks?: CustomBookItem[];
  onCustomBooksChange?: (items: CustomBookItem[]) => void;
  meetConfig?: AdminMeetConfig;
  onMeetConfigChange?: (cfg: AdminMeetConfig) => void;
  onPreviewSite?: () => void;
  onExitAdmin: () => void;
  onNotify: (msg: string) => void;
}) {
  const isPrimaryAdmin = adminRole === 'admin';

  const safeInitialTab: AdminStudioTab =
    !isPrimaryAdmin &&
    (initialTab === 'analytics' ||
      initialTab === 'page-config' ||
      initialTab === 'links-icons' ||
      initialTab === 'automation' ||
      initialTab === 'appearance')
      ? 'studio'
      : initialTab;

  const [tab, setTab] = useState<AdminStudioTab>(safeInitialTab);

  useEffect(() => {
    if (
      !isPrimaryAdmin &&
      (tab === 'analytics' ||
        tab === 'page-config' ||
        tab === 'links-icons' ||
        tab === 'automation' ||
        tab === 'appearance')
    ) {
      setTab('studio');
    }
  }, [isPrimaryAdmin, tab]);

  // Composer / Post edit state
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState(POST_CATEGORIES[0]);
  const [mediaType, setMediaType] = useState<MediaType>('quote');
  const [body, setBody] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [cardTheme, setCardTheme] = useState<CardTheme>('emerald');
  const [syncedPlatforms, setSyncedPlatforms] = useState<string[]>(() =>
    socialLinks.filter((l) => l.enabled).map((l) => l.id),
  );
  const [publishing, setPublishing] = useState(false);

  // Fatwa composer state
  const [fatwaScholarId, setFatwaScholarId] = useState<FatwaScholarId>('hajouri');
  const [fatwaCategory, setFatwaCategory] = useState(FATWA_CATEGORIES[0]);
  const [fatwaQuestion, setFatwaQuestion] = useState('');
  const [fatwaAnswer, setFatwaAnswer] = useState('');
  const [fatwaSource, setFatwaSource] = useState('');
  const [savingFatwa, setSavingFatwa] = useState(false);

  // Primary Admin: SiteConfig editor
  const [editConfig, setEditConfig] = useState<SiteConfig>(siteConfig);
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    setEditConfig(siteConfig);
  }, [siteConfig]);

  // Primary Admin: Security settings
  const [gesture, setGesture] = useState<AdminGesture>(currentGesture);
  const [targetUser, setTargetUser] = useState<string>(adminUsername);
  const [newPassword, setNewPassword] = useState('');
  const [savingSecurity, setSavingSecurity] = useState(false);

  // Primary Admin: Customization
  const [editHandle, setEditHandle] = useState(brandHandle);
  const [editLinks, setEditLinks] = useState<SocialLink[]>(socialLinks);
  const [editIcons, setEditIcons] = useState<AppIcons>(appIcons);
  const [savingCustom, setSavingCustom] = useState(false);

  // One-click multi-site broadcast dispatch modal/panel
  const [broadcastPost, setBroadcastPost] = useState<Post | null>(null);

  // Primary Admin: Delegated accounts, reset & backup
  const [accounts, setAccounts] = useState<
    Array<{username: string; role: AdminRole; assignedSection?: AdminSectionScope}>
  >([]);
  const [newAccUser, setNewAccUser] = useState('');
  const [newAccPass, setNewAccPass] = useState('');
  const [newAccRole, setNewAccRole] = useState<AdminRole>('editor');
  const [newAccSection, setNewAccSection] = useState<AdminSectionScope>('all');
  const [savingAccount, setSavingAccount] = useState(false);
  const [resettingCounters, setResettingCounters] = useState(false);
  const [analyticsRefreshKey, setAnalyticsRefreshKey] = useState(0);
  const [refreshingAI, setRefreshingAI] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<{ok: boolean; text: string} | null>(null);

  // Firebase Cloud Sync State
  const [cloudUserEmail, setCloudUserEmail] = useState<string | null>(null);
  const [cloudSyncBusy, setCloudSyncBusy] = useState(false);

  // Deaf & Mute Videos Form State
  const [dmTitle, setDmTitle] = useState('');
  const [dmDesc, setDmDesc] = useState('');
  const [dmBenefit, setDmBenefit] = useState('');
  const [dmYoutube, setDmYoutube] = useState('');
  const [dmCategory, setDmCategory] = useState('القرآن والإيمان');
  const [dmStatus, setDmStatus] = useState<'published' | 'upcoming'>('published');
  const [dmSaving, setDmSaving] = useState(false);

  // Custom Adhkar & Books Form State
  const [adhkarChapterId, setAdhkarChapterId] = useState('ch1_morning_evening');
  const [adhkarTitle, setAdhkarTitle] = useState('');
  const [adhkarText, setAdhkarText] = useState('');
  const [adhkarFadl, setAdhkarFadl] = useState('');
  const [adhkarCount, setAdhkarCount] = useState(1);
  const [adhkarSaving, setAdhkarSaving] = useState(false);

  const [bookSection, setBookSection] = useState<CustomBookItem['section']>('hajouri');
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [bookCategory, setBookCategory] = useState('العقيدة والمنهج');
  const [bookSummary, setBookSummary] = useState('');
  const [bookPdfUrl, setBookPdfUrl] = useState('coming_soon');
  const [bookSaving, setBookSaving] = useState(false);

  // Live WebSocket Support Inbox + Hidden Google Meet Config
  const [liveSessions, setLiveSessions] = useState<LiveSupportSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [liveReplyText, setLiveReplyText] = useState('');
  const [customMeetInviteUrl, setCustomMeetInviteUrl] = useState('');
  const [editMeetConfig, setEditMeetConfig] = useState<AdminMeetConfig>(
    meetConfig || {visibility: 'hidden_admin_only', activeRoomUrl: ''},
  );
  const [savingMeetCfg, setSavingMeetCfg] = useState(false);
  const [meetOAuthConnected, setMeetOAuthConnected] = useState(() => hasMeetAccessToken());
  const [meetConnectedEmail, setMeetConnectedEmail] = useState<string | null>(() => getConnectedMeetEmail());
  const [meetConnecting, setMeetConnecting] = useState(false);
  const [creatingMeetRoom, setCreatingMeetRoom] = useState(false);
  const [confirmReplaceMeetRoom, setConfirmReplaceMeetRoom] = useState(false);
  const adminWsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (meetConfig) setEditMeetConfig(meetConfig);
  }, [meetConfig]);

  useEffect(() => {
    const unsub = observeFirebaseAdminAuth((u) => {
      setCloudUserEmail(isTrustedAdminUser(u) ? u?.email || null : null);
    });
    const unsubMeet = initMeetOAuthObserver((connected, u) => {
      setMeetOAuthConnected(connected);
      setMeetConnectedEmail(connected ? u?.email || getConnectedMeetEmail() : null);
    });
    return () => {
      unsub();
      unsubMeet();
    };
  }, []);

  // Primary Admin: Automation & Appearance Studio State
  const [editAutomation, setEditAutomation] = useState<AutomationSettings>(automationSettings);
  const [savingAutomation, setSavingAutomation] = useState(false);
  const [editAppearance, setEditAppearance] = useState<SiteAppearanceConfig>(siteAppearance);
  const [savingAppearance, setSavingAppearance] = useState(false);

  // Mother Oasis Composer + Zero-Audio-Storage Dictation / Transcription State
  const [oasisChapter, setOasisChapter] = useState<MotherOasisChapter>('books');
  const [oasisTitle, setOasisTitle] = useState('');
  const [oasisBody, setOasisBody] = useState('');
  const [oasisListening, setOasisListening] = useState(false);
  const [oasisTranscribing, setOasisTranscribing] = useState(false);
  const [oasisFormatting, setOasisFormatting] = useState(false);
  const [oasisSaving, setOasisSaving] = useState(false);
  const speechRecRef = useRef<{stop: () => void} | null>(null);

  // Quick Ownership Transfer to ax1ax70@gmail.com
  const [transferPassword, setTransferPassword] = useState('');
  const [transferBusy, setTransferBusy] = useState(false);

  useEffect(() => {
    setEditAutomation(automationSettings);
  }, [automationSettings]);

  useEffect(() => {
    setEditAppearance(siteAppearance);
  }, [siteAppearance]);

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authToken}`,
  };

  const loadAccounts = useCallback(async () => {
    if (!isPrimaryAdmin || !authToken) return;
    try {
      const res = await fetch('/api/admin/accounts', {
        headers: {Authorization: `Bearer ${authToken}`},
      });
      if (!res.ok) return;
      const data = (await res.json()) as {accounts?: Array<{username: string; role: AdminRole}>};
      if (Array.isArray(data.accounts)) setAccounts(data.accounts);
    } catch {
      // Ignore offline fetch failure
    }
  }, [isPrimaryAdmin, authToken]);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const resetComposer = () => {
    setEditingPostId(null);
    setTitle('');
    setAuthor('');
    setCategory(POST_CATEGORIES[0]);
    setMediaType('quote');
    setBody('');
    setYoutubeUrl('');
    setCardTheme('emerald');
  };

  const startEditPost = (post: Post) => {
    setTab('studio');
    setEditingPostId(post.id);
    setTitle(post.title);
    setAuthor(post.author);
    setCategory(post.category);
    setMediaType(post.mediaType);
    setBody(post.body);
    setYoutubeUrl(post.youtubeUrl || '');
    setCardTheme(post.cardTheme);
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  useEffect(() => {
    if (initialEditPost) {
      setTab('studio');
      setEditingPostId(initialEditPost.id);
      setTitle(initialEditPost.title);
      setAuthor(initialEditPost.author);
      setCategory(initialEditPost.category);
      setMediaType(initialEditPost.mediaType);
      setBody(initialEditPost.body);
      setYoutubeUrl(initialEditPost.youtubeUrl || '');
      setCardTheme(initialEditPost.cardTheme);
    }
  }, [initialEditPost]);

  const togglePlatform = (id: string) => {
    setSyncedPlatforms((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleAllPlatforms = () => {
    if (syncedPlatforms.length === socialLinks.length) setSyncedPlatforms([]);
    else setSyncedPlatforms(socialLinks.map((l) => l.id));
  };

  const applyTashkeel = () => {
    if (body.trim()) {
      setBody((b) => b.replace(/الله(?![َُِ])/g, 'اللهُ'));
    } else {
      setBody('﴿ إِنَّ هَٰذَا الْقُرْآنَ يَهْدِي لِلَّتِي هِيَ أَقْوَمُ ﴾');
    }
  };

  const appendTag = () => {
    if (!body.includes('#مواعظ_وعبر')) {
      setBody((b) => `${b}${b ? ' ' : ''}#مواعظ_وعبر`);
    }
  };

  const wrapQuotes = () => {
    if (body.trim() && !body.trim().startsWith('«')) {
      setBody((b) => `«${b.trim()}»`);
    }
  };

  const formatBroadcastText = (post: Post) =>
    `✨ *${post.title}*\n\n${post.body}\n\n— ${post.author}\n\n📚 ${siteConfig.appName} (${brandHandle})\n🌐 ${window.location.origin}${post.youtubeUrl ? `\n🎬 ${post.youtubeUrl}` : ''}`;

  const triggerMultiSiteBroadcast = async (post: Post) => {
    const formatted = formatBroadcastText(post);
    try {
      await navigator.clipboard.writeText(formatted);
    } catch {
      // Ignore clipboard restriction
    }
    setBroadcastPost(post);
    onNotify('تم تجهيز ونسخ النص! اختر أي موقع أدناه أو اضغط «مشاركة شاملة» لإرساله فوراً.');
  };

  const saveOrPublishPost = async (broadcastAll = false) => {
    if (!body.trim()) {
      onNotify('يرجى كتابة نص الموعظة قبل الحفظ');
      return;
    }
    setPublishing(true);
    const targetPlatforms = broadcastAll
      ? socialLinks.filter((l) => l.enabled).map((l) => l.id)
      : syncedPlatforms;
    try {
      if (editingPostId && !broadcastAll) {
        const res = await fetch(`/api/posts/${editingPostId}`, {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify({
            title: title.trim() || body.trim().slice(0, 68),
            excerpt: body.trim().slice(0, 140),
            body: body.trim(),
            author: author.trim() || 'مواعظ وعبر',
            category,
            youtubeUrl: youtubeUrl.trim() || undefined,
          }),
        });
        if (!res.ok) throw new Error();
        const data = (await res.json()) as {post: Post};
        onUpdatePost(data.post);
        void cloudUpsertPost(data.post).catch(() => undefined);
        resetComposer();
        onNotify('تم تحديث الموعظة وحفظها في السحابة والرابط العام بنجاح');
      } else {
        if (targetPlatforms.length === 0) {
          onNotify('اختر منصة واحدة على الأقل للبث');
          setPublishing(false);
          return;
        }
        const res = await fetch('/api/posts', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            title: title.trim() || body.trim().slice(0, 68),
            excerpt: body.trim().slice(0, 140),
            body: body.trim(),
            author: author.trim() || 'مواعظ وعبر',
            category,
            mediaType,
            youtubeUrl: youtubeUrl.trim() || undefined,
            cardTheme,
            syncedPlatforms: targetPlatforms,
          }),
        });
        if (!res.ok) throw new Error();
        const data = (await res.json()) as {post: Post};
        onPublishPost(data.post);
        void cloudUpsertPost(data.post).catch(() => undefined);
        resetComposer();
        if (broadcastAll) {
          await triggerMultiSiteBroadcast(data.post);
        } else {
          onNotify(`تم النشر الفوري! ظهرت الموعظة على نفس الرابط وبُثّت لـ ${targetPlatforms.length} منصات.`);
        }
      }
    } catch {
      onNotify('تعذر حفظ المنشور، تأكد من صلاحية الجلسة وحاول مجدداً.');
    } finally {
      setPublishing(false);
    }
  };

  const removePost = async (id: string) => {
    try {
      const res = await fetch(`/api/posts/${id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (!res.ok) throw new Error();
      onDeletePost(id);
      void cloudDeletePost(id).catch(() => undefined);
      if (editingPostId === id) resetComposer();
      onNotify('تم حذف الموعظة بنجاح');
    } catch {
      onNotify('تعذر حذف الموعظة حالياً');
    }
  };

  const submitFatwa = async () => {
    if (!fatwaQuestion.trim() || !fatwaAnswer.trim()) {
      onNotify('يرجى إدخال نص السؤال والجواب');
      return;
    }
    setSavingFatwa(true);
    try {
      const res = await fetch('/api/fatawa', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          scholarId: fatwaScholarId,
          category: fatwaCategory,
          question: fatwaQuestion.trim(),
          answer: fatwaAnswer.trim(),
          source: fatwaSource.trim() || undefined,
          featured: fatwaScholarId === 'hajouri',
        }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as {fatwa: FatwaItem};
      onAddFatwa(data.fatwa);
      void cloudUpsertFatwa(data.fatwa).catch(() => undefined);
      setFatwaQuestion('');
      setFatwaAnswer('');
      setFatwaSource('');
      onNotify('تمت إضافة الفتوى بنجاح وحفظها في السحابة والرابط العام');
    } catch {
      onNotify('تعذر إضافة الفتوى حالياً');
    } finally {
      setSavingFatwa(false);
    }
  };

  const removeFatwa = async (id: string) => {
    try {
      const res = await fetch(`/api/fatawa/${id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (!res.ok) throw new Error();
      onDeleteFatwa(id);
      void cloudDeleteFatwa(id).catch(() => undefined);
      onNotify('تم حذف الفتوى بنجاح');
    } catch {
      onNotify('تعذر حذف الفتوى حالياً');
    }
  };

  const saveConfigChanges = async () => {
    setSavingConfig(true);
    try {
      await onSaveSiteConfig(editConfig);
      void cloudSaveSiteSettings(editConfig, editHandle, editAppearance.maintenanceMode).catch(() => undefined);
    } finally {
      setSavingConfig(false);
    }
  };

  const saveSecurity = async () => {
    setSavingSecurity(true);
    try {
      await onUpdateSettings(gesture, targetUser, newPassword.trim() || undefined);
      setNewPassword('');
      onNotify('تم حفظ إعدادات الأمان بنجاح');
    } finally {
      setSavingSecurity(false);
    }
  };

  const updateLinkField = <K extends keyof SocialLink>(id: string, field: K, value: SocialLink[K]) => {
    setEditLinks((prev) => prev.map((item) => (item.id === id ? {...item, [field]: value} : item)));
  };

  const addNewLink = () => {
    const id = `custom_${Date.now().toString(36)}`;
    setEditLinks((prev) => [
      ...prev,
      {
        id,
        name: 'منصة تواصل جديدة',
        handle: '@ax1ax70',
        followers: 'جديد',
        description: 'وصف مختصر للقناة الرسمية.',
        url: 'https://',
        iconId: 'globe',
        colorScheme: 'emerald',
        enabled: true,
      },
    ]);
  };

  const removeLink = (id: string) => {
    if (editLinks.length <= 1) {
      onNotify('يجب الإبقاء على منصة واحدة على الأقل');
      return;
    }
    setEditLinks((prev) => prev.filter((l) => l.id !== id));
  };

  const saveCustom = async () => {
    setSavingCustom(true);
    try {
      await onSaveCustomization({
        brandHandle: editHandle.trim() || '@ax1ax70',
        socialLinks: editLinks,
        appIcons: editIcons,
      });
    } finally {
      setSavingCustom(false);
    }
  };

  const resetIcons = () => {
    setEditIcons({...DEFAULT_APP_ICONS});
    onNotify('تمت استعادة الأيقونات الافتراضية في المعاينة، اضغط «حفظ التخصيص» للاعتماد.');
  };

  const updateConfigField = (key: keyof SiteConfig, val: string) => {
    setEditConfig((prev) => ({...prev, [key]: val}));
  };

  const addDelegatedAccount = async () => {
    if (newAccUser.trim().length < 3 || newAccPass.trim().length < 4) {
      onNotify('يرجى إدخال اسم مستخدم (٣ أحرف فأكثر) وكلمة مرور (٤ أحرف فأكثر)');
      return;
    }
    setSavingAccount(true);
    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          username: newAccUser.trim(),
          password: newAccPass.trim(),
          role: newAccRole,
          assignedSection: newAccRole === 'admin' ? 'all' : newAccSection,
        }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as {
        accounts: Array<{username: string; role: AdminRole; assignedSection?: AdminSectionScope}>;
      };
      setAccounts(data.accounts);
      setNewAccUser('');
      setNewAccPass('');
      onNotify('تم حفظ الحساب الجديد ويمكن الآن الدخول والتعديل وفق الصلاحية المحددة');
    } catch {
      onNotify('تعذر حفظ الحساب');
    } finally {
      setSavingAccount(false);
    }
  };

  const removeDelegatedAccount = async (username: string) => {
    try {
      const res = await fetch(`/api/admin/accounts/${encodeURIComponent(username)}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as {
        accounts: Array<{username: string; role: AdminRole; assignedSection?: AdminSectionScope}>;
      };
      setAccounts(data.accounts);
      onNotify(`تمت إزالة حساب ${username}`);
    } catch {
      onNotify('لا يمكن حذف هذا الحساب');
    }
  };

  const handleResetAllCounters = async () => {
    setResettingCounters(true);
    try {
      const res = await fetch('/api/admin/reset-counters', {
        method: 'POST',
        headers: authHeaders,
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as {posts: Post[]; motherPrayersCount: number};
      onResetCounters(data.posts, data.motherPrayersCount);
      setAnalyticsRefreshKey((k) => k + 1);
      onNotify('تم تصفير جميع عدادات الإعجابات والتعليقات والدعاء والانتشار إلى ٠');
    } catch {
      onNotify('تعذر تصفير العدادات');
    } finally {
      setResettingCounters(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      const res = await fetch('/api/admin/export', {headers: {Authorization: `Bearer ${authToken}`}});
      if (!res.ok) throw new Error();
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mawaedh-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      onNotify('تم تنزيل نسخة كاملة من بيانات وإعدادات المنصة');
    } catch {
      onNotify('تعذر تصدير النسخة الاحتياطية');
    }
  };

  const handleImportBackup = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const res = await fetch('/api/admin/import', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(parsed),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      onImportState(data);
      onNotify('تم استيراد بيانات المنصة وتطبيقها بنجاح');
    } catch {
      onNotify('ملف النسخة الاحتياطية غير صالح');
    } finally {
      e.target.value = '';
    }
  };

  const previewTheme = CARD_THEMES[cardTheme];
  const previewText = body.trim() || '«مَن أصلحَ سريرتَه فاحَ عَبِيرُ فضلِه، وعبِقتِ القلوبُ بريحِ كرامتِه.»';

  const totalMessagesCount = suggestions.length + volunteers.length;
  const newMessagesCount =
    suggestions.filter((s) => (s.status || 'new') === 'new').length +
    volunteers.filter((v) => (v.status || 'new') === 'new').length;

  const allTabs: Array<{
    id: AdminStudioTab;
    label: string;
    Icon: typeof Send;
    badge?: number;
    scope?: AdminSectionScope;
    primaryOnly?: boolean;
  }> = [
    {id: 'studio', label: 'المواعظ والمنشورات', Icon: Send, scope: 'all'},
    {
      id: 'messages',
      label: 'رسائل وطلبات الزوار',
      Icon: Inbox,
      badge: newMessagesCount > 0 ? newMessagesCount : totalMessagesCount,
      scope: 'all',
    },
    {
      id: 'live-support',
      label: 'الدردشة الحية و Meet',
      Icon: Radio,
      badge: liveSessions.length > 0 ? liveSessions.length : undefined,
      scope: 'deaf-mute',
    },
    {id: 'fatawa', label: 'إدارة الفتاوى', Icon: Scale, scope: 'fatawa'},
    {id: 'mother-oasis', label: 'واحة الداعية أمي', Icon: FolderHeart, scope: 'mother-oasis'},
    {id: 'deaf-mute', label: 'قسم الصم والبكم (فيديو)', Icon: HandHeart, scope: 'deaf-mute'},
    {id: 'adhkar-books', label: 'الأذكار والمكتبات العلمية', Icon: BookOpen, scope: 'adhkar-books'},
    {id: 'analytics', label: 'الإحصائيات الشهرية', Icon: BarChart3, primaryOnly: true},
    {id: 'automation', label: 'بوت النشر الآلي', Icon: Bot, primaryOnly: true},
    {id: 'appearance', label: 'المظهر والسطوع والصيانة', Icon: Palette, primaryOnly: true},
    {id: 'page-config', label: 'المسميات والأزرار', Icon: LayoutTemplate, primaryOnly: true},
    {id: 'links-icons', label: 'الروابط والأيقونات والأمان', Icon: LinkIcon, primaryOnly: true},
  ];

  const visibleTabs = allTabs.filter((t) => {
    if (isPrimaryAdmin) return true;
    if (t.primaryOnly) return false;
    if (!assignedSection || assignedSection === 'all') return true;
    if (t.id === 'studio' || t.id === 'messages' || t.id === 'live-support') return true;
    return t.scope === assignedSection;
  });

  const handleSaveAutomationClick = async () => {
    if (!onSaveAutomation) return;
    setSavingAutomation(true);
    try {
      await onSaveAutomation(editAutomation);
    } finally {
      setSavingAutomation(false);
    }
  };

  const handleSaveAppearanceClick = async () => {
    if (!onSaveAppearance) return;
    setSavingAppearance(true);
    try {
      await onSaveAppearance(editAppearance);
    } finally {
      setSavingAppearance(false);
    }
  };

  const toggleLiveSpeechDictation = () => {
    if (oasisListening && speechRecRef.current) {
      speechRecRef.current.stop();
      speechRecRef.current = null;
      setOasisListening(false);
      return;
    }
    const win = window as unknown as {
      SpeechRecognition?: new () => {
        lang: string;
        continuous: boolean;
        interimResults: boolean;
        onresult: ((e: {results: ArrayLike<ArrayLike<{transcript: string}> & {isFinal?: boolean}>}) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
        start: () => void;
        stop: () => void;
      };
      webkitSpeechRecognition?: new () => {
        lang: string;
        continuous: boolean;
        interimResults: boolean;
        onresult: ((e: {results: ArrayLike<ArrayLike<{transcript: string}> & {isFinal?: boolean}>}) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
        start: () => void;
        stop: () => void;
      };
    };
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRec) {
      onNotify('المتصفح الحالي لا يدعم التفريغ الصوتي الفوري — استخدمي زر رفع التسجيل الجاهز لتحويله لنص.');
      return;
    }
    try {
      const rec = new SpeechRec();
      rec.lang = 'ar-SA';
      rec.continuous = true;
      rec.interimResults = false;
      rec.onresult = (event) => {
        let added = '';
        for (let i = 0; i < event.results.length; i += 1) {
          const res = event.results[i];
          if (res?.isFinal && res[0]?.transcript) {
            added += `${res[0].transcript} `;
          }
        }
        if (added.trim()) {
          setOasisBody((prev) => `${prev ? `${prev.trim()} ` : ''}${added.trim()}`);
        }
      };
      rec.onerror = () => {
        setOasisListening(false);
        speechRecRef.current = null;
        onNotify('تعذر الوصول للميكروفون — تأكد من منح إذن الميكروفون للمتصفح.');
      };
      rec.onend = () => {
        setOasisListening(false);
        speechRecRef.current = null;
      };
      rec.start();
      speechRecRef.current = rec;
      setOasisListening(true);
      onNotify('بدأ الاستماع المباشر باللغة العربية — تحدثي الآن وسيُكتب النص تلقائياً (دون حفظ أي صوت).');
    } catch {
      setOasisListening(false);
      onNotify('تعذر تشغيل الميكروفون حالياً.');
    }
  };

  const handleUploadAudioToText = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      onNotify('الحد الأقصى لحجم التسجيل الصوتي المؤقت للمعالجة ١٥ ميجابايت.');
      return;
    }
    setOasisTranscribing(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('read_failed'));
        reader.readAsDataURL(file);
      });
      const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      const res = await fetch('/api/admin/mother-oasis/transcribe', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          audioBase64: base64,
          mimeType: file.type || 'audio/mp3',
        }),
      });
      const data = (await res.json()) as {text?: string; error?: string};
      if (!res.ok || !data.text) {
        onNotify(data.error || 'تعذر تفريغ التسجيل الصوتي إلى نص حالياً.');
        return;
      }
      setOasisBody((prev) => `${prev ? `${prev}\n\n` : ''}${data.text!.trim()}`);
      onNotify('تم تفريغ التسجيل الصوتي إلى نص عربي محرر بنجاح (ولم يُحفظ أي ملف صوتي).');
    } catch {
      onNotify('تعذر معالجة التسجيل الصوتي حالياً.');
    } finally {
      setOasisTranscribing(false);
    }
  };

  const handleFormatOasisText = async () => {
    if (!oasisBody.trim()) {
      onNotify('اكتبي أو فرّغي النص أولاً قبل التنسيق.');
      return;
    }
    setOasisFormatting(true);
    try {
      const res = await fetch('/api/admin/mother-oasis/format', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({text: oasisBody}),
      });
      const data = (await res.json()) as {formattedText?: string; error?: string};
      if (!res.ok || !data.formattedText) {
        onNotify(data.error || 'تعذر تنسيق النص حالياً.');
        return;
      }
      setOasisBody(data.formattedText);
      onNotify('تم تنسيق النص وتصحيحه إملائياً بفضل الله.');
    } catch {
      onNotify('تعذر الاتصال بالخادم لتنسيق النص.');
    } finally {
      setOasisFormatting(false);
    }
  };

  const handlePublishMotherOasis = async () => {
    if (!oasisTitle.trim() || !oasisBody.trim()) {
      onNotify('يرجى كتابة العنوان والنص أولاً قبل النشر في واحة أمي.');
      return;
    }
    setOasisSaving(true);
    try {
      const res = await fetch('/api/admin/mother-oasis', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          chapter: oasisChapter,
          title: oasisTitle.trim(),
          body: oasisBody.trim(),
        }),
      });
      const data = (await res.json()) as {items?: MotherOasisItem[]; error?: string};
      if (!res.ok || !Array.isArray(data.items)) {
        onNotify(data.error || 'تعذر نشر المادة في واحة الداعية أمي.');
        return;
      }
      const newest = data.items[0];
      if (newest) void cloudUpsertMotherOasis(newest).catch(() => undefined);
      onMotherOasisChange?.(data.items);
      setOasisTitle('');
      setOasisBody('');
      onNotify('تم النشر النصي بنجاح في «واحة الداعية الفاضلة أمي: أم محمد إكرام عبده علي».');
    } catch {
      onNotify('تعذر الاتصال بالخادم لحفظ المادة.');
    } finally {
      setOasisSaving(false);
    }
  };

  const handleDeleteMotherOasisItem = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/mother-oasis/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {Authorization: `Bearer ${authToken}`},
      });
      const data = (await res.json()) as {items?: MotherOasisItem[]; error?: string};
      if (!res.ok || !Array.isArray(data.items)) {
        onNotify(data.error || 'تعذر حذف المادة.');
        return;
      }
      onMotherOasisChange?.(data.items);
      void cloudDeleteMotherOasis(id).catch(() => undefined);
      onNotify('تم حذف المادة من واحة الداعية أمي.');
    } catch {
      onNotify('تعذر الحذف حالياً.');
    }
  };

  const handleSaveDeafMuteVideo = async () => {
    if (!dmTitle.trim() || !dmDesc.trim()) {
      onNotify('يرجى كتابة عنوان الفيديو والوصف أولاً');
      return;
    }
    setDmSaving(true);
    try {
      const res = await fetch('/api/admin/deaf-mute-videos', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          title: dmTitle.trim(),
          description: dmDesc.trim(),
          benefitText: dmBenefit.trim() || undefined,
          youtubeUrl: dmYoutube.trim() || undefined,
          category: dmCategory,
          status: dmStatus,
        }),
      });
      const data = (await res.json()) as {items?: DeafMuteVideoItem[]; created?: DeafMuteVideoItem; error?: string};
      if (!res.ok || !Array.isArray(data.items)) {
        onNotify(data.error || 'تعذر حفظ فيديو قسم الصم والبكم');
        return;
      }
      if (data.created) void cloudUpsertDeafMuteVideo(data.created).catch(() => undefined);
      onDeafMuteVideosChange?.(data.items);
      setDmTitle('');
      setDmDesc('');
      setDmBenefit('');
      setDmYoutube('');
      onNotify('تم حفظ الفيديو في قسم الصم والبكم والسحابة بنجاح');
    } catch {
      onNotify('تعذر الاتصال بالخادم');
    } finally {
      setDmSaving(false);
    }
  };

  const handleDeleteDeafMuteVideo = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/deaf-mute-videos/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {Authorization: `Bearer ${authToken}`},
      });
      const data = (await res.json()) as {items?: DeafMuteVideoItem[]};
      if (res.ok && Array.isArray(data.items)) {
        onDeafMuteVideosChange?.(data.items);
        void cloudDeleteDeafMuteVideo(id).catch(() => undefined);
        onNotify('تم حذف الفيديو من قسم الصم والبكم');
      }
    } catch {
      onNotify('تعذر حذف الفيديو');
    }
  };

  const handleSaveCustomAdhkar = async () => {
    if (!adhkarText.trim()) {
      onNotify('يرجى كتابة نص الذكر أو الدعاء أولاً');
      return;
    }
    setAdhkarSaving(true);
    try {
      const res = await fetch('/api/admin/adhkar', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          chapterId: adhkarChapterId,
          title: adhkarTitle.trim() || undefined,
          text: adhkarText.trim(),
          fadl: adhkarFadl.trim() || undefined,
          targetCount: adhkarCount,
        }),
      });
      const data = (await res.json()) as {items?: CustomAdhkarItem[]; created?: CustomAdhkarItem; error?: string};
      if (!res.ok || !Array.isArray(data.items)) {
        onNotify(data.error || 'تعذر حفظ الذكر');
        return;
      }
      if (data.created) void cloudUpsertCustomAdhkar(data.created).catch(() => undefined);
      onCustomAdhkarChange?.(data.items);
      setAdhkarTitle('');
      setAdhkarText('');
      setAdhkarFadl('');
      setAdhkarCount(1);
      onNotify('تمت إضافة الذكر وحفظه سحابياً بنجاح');
    } catch {
      onNotify('تعذر الاتصال بالخادم');
    } finally {
      setAdhkarSaving(false);
    }
  };

  const handleDeleteCustomAdhkar = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/adhkar/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {Authorization: `Bearer ${authToken}`},
      });
      const data = (await res.json()) as {items?: CustomAdhkarItem[]};
      if (res.ok && Array.isArray(data.items)) {
        onCustomAdhkarChange?.(data.items);
        void cloudDeleteCustomAdhkar(id).catch(() => undefined);
        onNotify('تم حذف الذكر المخصص');
      }
    } catch {
      onNotify('تعذر حذف الذكر');
    }
  };

  const handleSaveCustomBook = async () => {
    if (!bookTitle.trim() || !bookAuthor.trim()) {
      onNotify('يرجى إدخال عنوان الكتاب واسم المؤلف');
      return;
    }
    setBookSaving(true);
    try {
      const res = await fetch('/api/admin/books', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          section: bookSection,
          title: bookTitle.trim(),
          author: bookAuthor.trim(),
          category: bookCategory.trim() || 'كتب علمية',
          summary: bookSummary.trim() || undefined,
          pdfUrl: bookPdfUrl.trim() || 'coming_soon',
        }),
      });
      const data = (await res.json()) as {items?: CustomBookItem[]; created?: CustomBookItem; error?: string};
      if (!res.ok || !Array.isArray(data.items)) {
        onNotify(data.error || 'تعذر حفظ الكتاب');
        return;
      }
      if (data.created) void cloudUpsertCustomBook(data.created).catch(() => undefined);
      onCustomBooksChange?.(data.items);
      setBookTitle('');
      setBookAuthor('');
      setBookSummary('');
      setBookPdfUrl('coming_soon');
      onNotify('تم اعتماد الكتاب وحفظه في السحابة والمكتبة العلمية');
    } catch {
      onNotify('تعذر الاتصال بالخادم');
    } finally {
      setBookSaving(false);
    }
  };

  const handleDeleteCustomBook = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/books/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {Authorization: `Bearer ${authToken}`},
      });
      const data = (await res.json()) as {items?: CustomBookItem[]};
      if (res.ok && Array.isArray(data.items)) {
        onCustomBooksChange?.(data.items);
        void cloudDeleteCustomBook(id).catch(() => undefined);
        onNotify('تم حذف الكتاب من القائمة');
      }
    } catch {
      onNotify('تعذر حذف الكتاب');
    }
  };

  // Real-time Admin WebSocket Connection for Live Support & Interviews
  useEffect(() => {
    if (!authToken) return;
    fetch('/api/admin/live-support', {headers: {Authorization: `Bearer ${authToken}`}})
      .then((r) => (r.ok ? r.json() : null))
      .then((d: {sessions?: LiveSupportSession[]} | null) => {
        if (d?.sessions) setLiveSessions(d.sessions);
      })
      .catch(() => undefined);

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${window.location.host}/ws/live-support`);
    adminWsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({type: 'join', role: 'admin', token: authToken}));
    };

    ws.onmessage = (ev) => {
      try {
        const pkt = JSON.parse(String(ev.data)) as {
          type?: string;
          sessions?: LiveSupportSession[];
          session?: LiveSupportSession;
        };
        if (pkt.type === 'sessions' && Array.isArray(pkt.sessions)) {
          setLiveSessions(pkt.sessions);
        } else if (pkt.type === 'session_update' && pkt.session) {
          setLiveSessions((prev) => [
            pkt.session!,
            ...prev.filter((s) => s.id !== pkt.session!.id),
          ]);
        }
      } catch {
        // Ignore malformed packets
      }
    };

    return () => {
      ws.close();
      adminWsRef.current = null;
    };
  }, [authToken]);

  const sendAdminLiveReply = (sessionId: string) => {
    const trimmed = liveReplyText.trim();
    if (!trimmed) return;
    if (adminWsRef.current && adminWsRef.current.readyState === WebSocket.OPEN) {
      adminWsRef.current.send(
        JSON.stringify({
          type: 'message',
          sessionId,
          senderRole: 'admin',
          senderName: adminUsername,
          text: trimmed,
        }),
      );
      setLiveReplyText('');
    } else {
      onNotify('جارٍ إعادة الاتصال بقناة الدردشة الحية...');
    }
  };

  const sendPrivateMeetInviteToSession = (sessionId: string) => {
    const targetUrl = (customMeetInviteUrl.trim() || editMeetConfig.activeRoomUrl || '').trim();
    if (!targetUrl.startsWith('https://')) {
      onNotify('يرجى إدخال رابط Google Meet يبدأ بـ https:// أولاً');
      return;
    }
    if (adminWsRef.current && adminWsRef.current.readyState === WebSocket.OPEN) {
      adminWsRef.current.send(
        JSON.stringify({
          type: 'meet_invite',
          sessionId,
          meetUrl: targetUrl,
        }),
      );
      setCustomMeetInviteUrl('');
      onNotify('تم إرسال رابط دعوة Google Meet سرّاً لهذه الجلسة فقط');
    }
  };

  const handleSaveMeetVisibilityConfig = async (overrideCfg?: AdminMeetConfig) => {
    const payload = overrideCfg || editMeetConfig;
    setSavingMeetCfg(true);
    try {
      const res = await fetch('/api/admin/meet-config', {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {meetConfig?: AdminMeetConfig; error?: string};
      if (!res.ok || !data.meetConfig) {
        onNotify(data.error || 'تعذر حفظ إعدادات Google Meet');
        return;
      }
      setEditMeetConfig(data.meetConfig);
      onMeetConfigChange?.(data.meetConfig);
      onNotify('تم حفظ إعدادات Google Meet المخفية بنجاح');
    } catch {
      onNotify('تعذر الاتصال بالخادم');
    } finally {
      setSavingMeetCfg(false);
    }
  };

  const handleConnectGoogleMeet = async () => {
    setMeetConnecting(true);
    try {
      const {user} = await connectGoogleMeetWithPopup(DEFAULT_MEET_HOST_EMAIL);
      setMeetOAuthConnected(true);
      setMeetConnectedEmail(user.email || DEFAULT_MEET_HOST_EMAIL);
      if (user.email && user.email.toLowerCase() !== DEFAULT_MEET_HOST_EMAIL) {
        onNotify(`تم الربط بحساب ${user.email} — يُفضل اختيار ${DEFAULT_MEET_HOST_EMAIL} لإنشاء غرف Meet`);
      } else {
        onNotify(`تم ربط Google Meet بنجاح على الحساب ${DEFAULT_MEET_HOST_EMAIL}`);
      }
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'تعذر تسجيل الدخول عبر Google لإنشاء الغرف');
    } finally {
      setMeetConnecting(false);
    }
  };

  const handleCreateMeetSpace = async (target: 'default' | 'session', skipConfirm = false) => {
    if (target === 'default' && editMeetConfig.activeRoomUrl.trim() && !skipConfirm) {
      setConfirmReplaceMeetRoom(true);
      return;
    }
    setConfirmReplaceMeetRoom(false);
    setCreatingMeetRoom(true);
    try {
      if (!hasMeetAccessToken()) {
        const {user} = await connectGoogleMeetWithPopup(DEFAULT_MEET_HOST_EMAIL);
        setMeetOAuthConnected(true);
        setMeetConnectedEmail(user.email || DEFAULT_MEET_HOST_EMAIL);
      }
      const space = await createGoogleMeetSpace();
      if (target === 'session') {
        setCustomMeetInviteUrl(space.meetingUri);
        onNotify(`تم إنشاء غرفة Google Meet خاصة (${space.meetingCode || 'جاهزة'}) — اضغط إرسال دعوة Meet خاصة`);
      } else {
        const nextCfg: AdminMeetConfig = {...editMeetConfig, activeRoomUrl: space.meetingUri};
        setEditMeetConfig(nextCfg);
        await handleSaveMeetVisibilityConfig(nextCfg);
        onNotify(`تم إنشاء وحفظ غرفة Google Meet بنجاح: ${space.meetingUri}`);
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'MEET_AUTH_REQUIRED') {
        setMeetOAuthConnected(false);
        setMeetConnectedEmail(null);
        onNotify(`يرجى تسجيل الدخول بحساب ${DEFAULT_MEET_HOST_EMAIL} أولاً لتفعيل إنشاء غرف Google Meet`);
      } else {
        onNotify(err instanceof Error ? err.message : 'تعذر إنشاء غرفة Google Meet');
      }
    } finally {
      setCreatingMeetRoom(false);
    }
  };

  const handleToggleFirebaseCloud = async () => {
    setCloudSyncBusy(true);
    try {
      if (cloudUserEmail) {
        await signOutFirebaseAdmin();
        onNotify('تم فصل جلسة المزامنة السحابية Firebase');
      } else {
        const u = await signInAdminWithGoogle();
        onNotify(`تم تفعيل المزامنة السحابية لـ ${u.email} — تُحفظ إضافاتك في السحابة دائماً`);
      }
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'تعذر تسجيل الدخول السحابي');
    } finally {
      setCloudSyncBusy(false);
    }
  };

  const handleTransferOwnershipToPersonalEmail = async () => {
    if (transferPassword.trim().length < 4) {
      onNotify('أدخل كلمة مرور قوية (٤ أحرف فأكثر)');
      return;
    }
    setTransferBusy(true);
    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          username: 'ax1ax70@gmail.com',
          password: transferPassword.trim(),
          role: 'admin',
          assignedSection: 'all',
        }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as {
        accounts: Array<{username: string; role: AdminRole; assignedSection?: AdminSectionScope}>;
      };
      setAccounts(data.accounts);
      setTransferPassword('');
      onNotify('تم تفعيل صلاحية الإدارة الكاملة لحساب المشرف بنجاح');
    } catch {
      onNotify('تعذر تفعيل حساب الإدارة حالياً.');
    } finally {
      setTransferBusy(false);
    }
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Top Executive Admin Bar */}
      <section className="rounded-3xl bg-[#071510] text-slate-100 border border-emerald-900/50 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#006a46] text-white flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm sm:text-base font-extrabold text-white">
                {isPrimaryAdmin
                  ? 'لوحة تحكم المشرف العام المستقلة'
                  : adminRole === 'supervisor'
                    ? 'لوحة مشرف القسم المخصصة'
                    : 'لوحة المشرف ومحرر المحتوى'}{' '}
                ({adminUsername})
              </p>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-[#006a46] text-emerald-100">
                {isPrimaryAdmin ? 'مدير · جلسة دائمة' : `${adminRole} · ${assignedSection}`}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              تبقى الجلسة نشطة دائماً دون انتهاء تلقائي حتى الضغط على «تسجيل خروج المشرف».
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={cloudSyncBusy}
            onClick={() => void handleToggleFirebaseCloud()}
            className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
              cloudUserEmail
                ? 'bg-emerald-700 text-white'
                : 'bg-amber-400 text-slate-950 hover:bg-amber-300'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>{cloudUserEmail ? 'مزامنة السحابة مفعّلة' : 'ربط سحابة Firebase'}</span>
          </button>

          {/* Live Ticket Notification Bell */}
          <button
            type="button"
            onClick={() => setTab('messages')}
            className="relative min-h-[42px] px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-2 transition-colors"
            title="إشعارات الطلبات والتذاكر الجديدة"
          >
            <Bell className={`w-4 h-4 ${newMessagesCount > 0 ? 'text-amber-300 animate-pulse' : 'text-emerald-300'}`} />
            <span>التذاكر الجديدة</span>
            {newMessagesCount > 0 && (
              <span className="px-2 py-0.5 rounded-lg bg-amber-400 text-slate-950 text-[11px] font-extrabold tabular-nums">
                {newMessagesCount.toLocaleString('ar-EG')}
              </span>
            )}
          </button>

          {onPreviewSite && (
            <button
              type="button"
              onClick={onPreviewSite}
              className="min-h-[42px] px-3.5 py-2 rounded-xl bg-emerald-800/70 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"
            >
              <Eye className="w-4 h-4" />
              <span>تصفح الموقع كمشرف</span>
            </button>
          )}

          <PWAInstallButton compact onNotify={onNotify} />

          <button
            type="button"
            onClick={onExitAdmin}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs whitespace-nowrap transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>🚪 تسجيل خروج المشرف</span>
          </button>
        </div>
      </section>

      {/* Independent Dark-Sidebar Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <aside className="lg:col-span-3 rounded-3xl bg-[#071510] text-slate-100 border border-emerald-900/40 p-3.5 shadow-md space-y-1.5 lg:sticky lg:top-[104px]">
          <p className="px-2.5 py-1.5 text-[11px] font-extrabold text-emerald-300/80">
            أقسام الإدارة والتحكم
          </p>
          {visibleTabs.map((t) => {
            const Icon = t.Icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-between gap-2 transition-colors ${
                  active
                    ? 'bg-[#006a46] text-white shadow-sm'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{t.label}</span>
                </span>
                {typeof t.badge === 'number' && t.badge > 0 && (
                  <span className="px-2 py-0.5 rounded-lg bg-amber-400 text-slate-950 text-[11px] font-extrabold tabular-nums shrink-0">
                    {t.badge.toLocaleString('ar-EG')}
                  </span>
                )}
              </button>
            );
          })}
        </aside>

        <div className="lg:col-span-9 space-y-5 min-w-0">
          {/* Tab 1: Posts Publishing, Edit/Delete & Inbox */}
          {tab === 'studio' && (
            <>
              <LiveStatsStrip compact />

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  {value: `${posts.length.toLocaleString('ar-EG')}`, label: 'موعظة منشورة', color: 'text-[#006a46] dark:text-[#6cdba6]'},
                  {value: `${fatawa.length.toLocaleString('ar-EG')}`, label: 'فتوى معتمدة', color: 'text-[#7c5800] dark:text-[#f2be5e]'},
                  {value: `${(suggestions.length + volunteers.length).toLocaleString('ar-EG')}`, label: 'تذاكر الزوار', color: 'text-[#006389] dark:text-[#80cfff]'},
                  {value: `${visitorsCount.toLocaleString('ar-EG')}`, label: 'الزوار بالخادم', color: 'text-[#006a46] dark:text-[#6cdba6]', Icon: Eye},
                  {value: `${onlineVisitorsCount.toLocaleString('ar-EG')}`, label: 'الموجودين الآن', color: 'text-[#008559] dark:text-[#6cdba6]', Icon: Eye},
                  {value: `${clicksCount.toLocaleString('ar-EG')}`, label: 'التفاعلات', color: 'text-[#006389] dark:text-[#80cfff]', Icon: MousePointerClick},
                ].map((kpi) => (
                  <div
                    key={kpi.label}
                    className="rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-3.5 text-center"
                  >
                    <span className={`text-lg font-bold tabular-nums block ${kpi.color}`}>{kpi.value}</span>
                    <span className="text-xs text-[#6e7a71] dark:text-slate-400">{kpi.label}</span>
                  </div>
                ))}
              </div>

          {/* AI Daily Nafahat Renewal Bar */}
          {onRefreshNafahatAI && (
            <section className="rounded-2xl bg-[#fffbf2] dark:bg-[#13221c] border border-[#f2be5e]/45 dark:border-[#f2be5e]/25 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-[#7c5800] dark:text-[#f2be5e]">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>نفحات متجددة بالذكاء الاصطناعي (تحديث تلقائي يومي + فوري للمشرفين)</span>
                </div>
                <p className="text-xs text-[#3e4a42] dark:text-slate-300">
                  آخر تحديث: {nafahatMeta?.lastUpdatedDate || 'غير مسجل'} · المصدر:{' '}
                  {nafahatMeta?.source === 'ai'
                    ? 'توليد ذكي موثق'
                    : nafahatMeta?.source === 'manual'
                      ? 'تحرير يدوي'
                      : 'النسخة الافتراضية'}
                </p>
                {aiFeedback && (
                  <p
                    className={`text-xs font-bold pt-0.5 ${
                      aiFeedback.ok ? 'text-[#006a46] dark:text-[#6cdba6]' : 'text-[#ba1a1a] dark:text-rose-300'
                    }`}
                  >
                    {aiFeedback.text}
                  </p>
                )}
              </div>

              <button
                type="button"
                disabled={refreshingAI}
                onClick={async () => {
                  setRefreshingAI(true);
                  setAiFeedback(null);
                  try {
                    const result = await onRefreshNafahatAI();
                    setAiFeedback({ok: result.ok, text: result.message});
                    onNotify(result.message);
                  } finally {
                    setRefreshingAI(false);
                  }
                }}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#006a46] hover:bg-[#005235] disabled:opacity-60 text-white text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 shrink-0 ${refreshingAI ? 'animate-spin' : ''}`} />
                <span>{refreshingAI ? 'جاري التحديث بالذكاء الاصطناعي...' : 'تحديث نفحات متجددة الآن'}</span>
              </button>
            </section>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <section className="lg:col-span-7 rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-bold text-[#0e1d25] dark:text-white">
                  {editingPostId ? 'تعديل الموعظة المحددة' : 'صياغة ونشر موعظة جديدة'}
                </h2>
                <div className="flex items-center gap-2">
                  {editingPostId && (
                    <button
                      type="button"
                      onClick={resetComposer}
                      className="text-xs font-bold text-[#ba1a1a] hover:underline"
                    >
                      إلغاء التعديل
                    </button>
                  )}
                  <span className="text-xs font-semibold text-[#006a46] dark:text-[#6cdba6] tabular-nums">
                    {body.length} حرف
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="عنوان مختصر للموعظة"
                  className="w-full min-h-[44px] rounded-xl bg-[#e8f6ff] dark:bg-[#112921] px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006a46]"
                />
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="المصدر / القائل"
                  className="w-full min-h-[44px] rounded-xl bg-[#e8f6ff] dark:bg-[#112921] px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006a46]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="min-h-[44px] rounded-xl bg-[#e8f6ff] dark:bg-[#112921] px-3.5 py-2 text-sm focus:outline-none"
                >
                  {POST_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <select
                  value={mediaType}
                  onChange={(e) => setMediaType(e.target.value as MediaType)}
                  className="min-h-[44px] rounded-xl bg-[#e8f6ff] dark:bg-[#112921] px-3.5 py-2 text-sm focus:outline-none"
                >
                  <option value="quote">بطاقة اقتباس دعوية</option>
                  <option value="sada">رسالة صدى الخير الدعوية</option>
                  <option value="video">مقطع مرئي (يوتيوب)</option>
                </select>
              </div>

              <textarea
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="اكتب نص الموعظة أو الخاطرة الإيمانية..."
                className="w-full rounded-xl bg-[#e8f6ff] dark:bg-[#112921] p-4 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#006a46]"
              />

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={applyTashkeel}
                  className="min-h-[40px] px-3 py-1.5 rounded-lg bg-[#e0f0fb] dark:bg-[#122d24] text-[#006a46] dark:text-[#6cdba6] text-xs font-semibold flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>اقتراح تشكيل قرآني</span>
                </button>
                <button
                  type="button"
                  onClick={appendTag}
                  className="min-h-[40px] px-3 py-1.5 rounded-lg bg-[#e0f0fb] dark:bg-[#122d24] text-[#006389] dark:text-[#80cfff] text-xs font-semibold"
                >
                  # مواعظ_وعبر
                </button>
                <button
                  type="button"
                  onClick={wrapQuotes}
                  className="min-h-[40px] px-3 py-1.5 rounded-lg bg-[#fffbf2] dark:bg-white/10 text-[#7c5800] dark:text-[#f2be5e] text-xs font-semibold"
                >
                  تضمين علامات اقتباس «»
                </button>
              </div>

              {mediaType === 'video' && (
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="رابط المقطع على يوتيوب (اختياري)"
                  className="w-full min-h-[44px] rounded-xl bg-[#e8f6ff] dark:bg-[#112921] px-3.5 py-2 text-sm focus:outline-none"
                />
              )}

              {!editingPostId && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-[#3e4a42] dark:text-slate-300 block">
                    سمة البطاقة الدعوية
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(Object.keys(CARD_THEMES) as CardTheme[]).map((themeKey) => {
                      const t = CARD_THEMES[themeKey];
                      return (
                        <button
                          key={themeKey}
                          type="button"
                          onClick={() => setCardTheme(themeKey)}
                          className={`min-h-[44px] rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                            cardTheme === themeKey ? 'ring-2 ring-[#006a46] ring-offset-2' : 'opacity-85 hover:opacity-100'
                          }`}
                          style={{
                            background: `linear-gradient(135deg, ${t.bgStart}, ${t.bgEnd})`,
                            color: t.text,
                          }}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={publishing}
                  onClick={() => void saveOrPublishPost(false)}
                  className="min-h-[50px] rounded-2xl bg-gradient-to-l from-[#006a46] to-[#008559] text-white px-4 py-3 shadow-md flex items-center justify-center gap-2 hover:brightness-105 disabled:opacity-60 transition-all"
                >
                  <Send className="w-4 h-4 text-[#ffdea8] shrink-0" />
                  <span className="text-xs sm:text-sm font-bold">
                    {publishing
                      ? 'جاري الحفظ...'
                      : editingPostId
                        ? 'حفظ التعديلات على الرابط'
                        : 'نشر فوري على المنصة'}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={publishing}
                  onClick={() => void saveOrPublishPost(true)}
                  className="min-h-[50px] rounded-2xl bg-gradient-to-l from-[#7c5800] to-[#b58100] text-white px-4 py-3 shadow-md flex items-center justify-center gap-2 hover:brightness-105 disabled:opacity-60 transition-all"
                >
                  <Share2 className="w-4 h-4 text-[#ffdea8] shrink-0" />
                  <span className="text-xs sm:text-sm font-bold">نشر بجميع المواقع بضغطة واحدة</span>
                </button>
              </div>
            </section>

            {/* Live Card Preview */}
            <section className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold text-[#0e1d25] dark:text-white">معاينة البطاقة الدعوية</h3>
                <span className="text-xs text-[#6e7a71] dark:text-slate-400">تتناسق مع واجهة الموقع</span>
              </div>
              <div
                className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-lg p-6 flex flex-col justify-between"
                style={{
                  background: `linear-gradient(145deg, ${previewTheme.bgStart}, ${previewTheme.bgEnd})`,
                  color: previewTheme.text,
                }}
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-4 rounded-xl border border-white/20"
                />
                <div className="relative z-10 flex items-center justify-between">
                  <span
                    className="text-xs font-bold px-3 py-1 rounded-full bg-black/20"
                    style={{color: previewTheme.accent}}
                  >
                    {siteConfig.appName}
                  </span>
                  <Sparkles className="w-5 h-5" style={{color: previewTheme.accent}} />
                </div>

                <div className="relative z-10 text-center my-auto px-3 space-y-3">
                  <p className="text-lg sm:text-xl font-bold leading-relaxed">{previewText}</p>
                  <span className="text-xs sm:text-sm font-semibold block" style={{color: previewTheme.accent}}>
                    {author || siteConfig.appName}
                  </span>
                </div>

                <div className="relative z-10 flex items-center justify-between text-[11px] opacity-80 pt-3 border-t border-white/20">
                  <span>تطبيق {siteConfig.appName}</span>
                  <span dir="ltr">{brandHandle}</span>
                </div>
              </div>
            </section>
          </div>

          {/* One-Click Multi-Site Dispatch Panel */}
          {broadcastPost && (
            <section className="rounded-2xl bg-[#fffbf2] dark:bg-[#13221c] border-2 border-[#ffc968] p-5 shadow-md space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-[#7c5800] dark:text-[#f2be5e]">
                    جاهز للبث المتزامن · تم نسخ النص تلقائياً
                  </span>
                  <h2 className="text-base font-bold text-[#0e1d25] dark:text-white mt-0.5">
                    إرسال «{broadcastPost.title}» إلى جميع المواقع بضغطة واحدة
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setBroadcastPost(null)}
                  aria-label="إغلاق لوحة البث"
                  className="w-9 h-9 rounded-full bg-white dark:bg-[#0b1f18] flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                    `${broadcastPost.title}\n\n${broadcastPost.excerpt}\n#مواعظ_وعبر @ax1ax71`,
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center justify-between gap-2"
                >
                  <span>نشر في منصة إكس (X)</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>

                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent(
                    formatBroadcastText(broadcastPost),
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#006389] text-white text-xs font-bold flex items-center justify-between gap-2"
                >
                  <span>إرسال إلى تيليجرام</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>

                <a
                  href={`https://wa.me/?text=${encodeURIComponent(formatBroadcastText(broadcastPost))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#006a46] text-white text-xs font-bold flex items-center justify-between gap-2"
                >
                  <span>إرسال إلى واتساب</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>

                <button
                  type="button"
                  onClick={async () => {
                    const text = formatBroadcastText(broadcastPost);
                    if (navigator.share) {
                      try {
                        await navigator.share({title: broadcastPost.title, text});
                        return;
                      } catch {
                        // Fallback copy
                      }
                    }
                    await navigator.clipboard.writeText(text);
                    onNotify('تم نسخ النص المنسق للنشر في فيسبوك وإنستغرام ويوتيوب');
                  }}
                  className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#ffc968] text-[#271900] text-xs font-bold flex items-center justify-between gap-2"
                >
                  <span>مشاركة / نسخ لباقي المواقع</span>
                  <Copy className="w-3.5 h-3.5 shrink-0" />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {socialLinks
                  .filter((l) => l.enabled)
                  .map((ch) => (
                    <a
                      key={ch.id}
                      href={ch.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#0b1f18] border border-slate-200 dark:border-white/10 text-xs font-semibold text-[#006a46] dark:text-[#6cdba6] flex items-center gap-1"
                    >
                      <span>{ch.name}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ))}
              </div>
            </section>
          )}

          {/* Manage Existing Posts */}
          <section className="rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-5 shadow-xs space-y-3">
            <h2 className="text-base font-bold text-[#0e1d25] dark:text-white">
              إدارة المواعظ المنشورة ({posts.length.toLocaleString('ar-EG')})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {posts.map((p) => (
                <div
                  key={p.id}
                  className="p-3.5 rounded-xl bg-[#f4faff] dark:bg-[#112921] border border-slate-200/70 dark:border-white/10 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold text-[#006a46] dark:text-[#6cdba6] flex items-center gap-1.5">
                      <span>{p.category} · {p.author}</span>
                      {p.hidden && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 text-[10px]">
                          مخفي
                        </span>
                      )}
                    </span>
                    <h3 className="text-sm font-bold text-[#0e1d25] dark:text-white truncate mt-0.5">{p.title}</h3>
                    <p className="text-xs text-[#6e7a71] dark:text-slate-400 line-clamp-1 mt-0.5">{p.excerpt}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {onTriggerAutoPost && (
                      <button
                        type="button"
                        onClick={() => onTriggerAutoPost(p.id)}
                        aria-label="نشر آلي الآن"
                        title="نشر آلي عبر البوت (فيسبوك/واتساب/X)"
                        className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-[#0b1f18] text-emerald-700 dark:text-emerald-300 flex items-center justify-center"
                      >
                        <Bot className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void triggerMultiSiteBroadcast(p)}
                      aria-label="مشاركة بجميع المواقع"
                      title="نشر بجميع المواقع"
                      className="w-9 h-9 rounded-lg bg-white dark:bg-[#0b1f18] text-[#7c5800] dark:text-[#f2be5e] flex items-center justify-center"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    {onToggleHidePost && (
                      <button
                        type="button"
                        onClick={() => onToggleHidePost(p.id)}
                        aria-label={p.hidden ? 'إظهار' : 'إخفاء'}
                        title={p.hidden ? 'إظهار للزوار' : 'إخفاء عن الزوار'}
                        className="w-9 h-9 rounded-lg bg-white dark:bg-[#0b1f18] text-amber-700 dark:text-amber-300 flex items-center justify-center"
                      >
                        {p.hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => startEditPost(p)}
                      aria-label="تعديل"
                      className="w-9 h-9 rounded-lg bg-white dark:bg-[#0b1f18] text-[#006a46] dark:text-[#6cdba6] flex items-center justify-center"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void removePost(p.id)}
                      aria-label="حذف"
                      className="w-9 h-9 rounded-lg bg-white dark:bg-[#0b1f18] text-[#ba1a1a] flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Synced Destinations + Inbox */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <section className="rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#0e1d25] dark:text-white">وجهات النشر المتزامن</h2>
                <button
                  type="button"
                  onClick={toggleAllPlatforms}
                  className="text-xs font-semibold text-[#006a46] dark:text-[#6cdba6] hover:underline"
                >
                  {syncedPlatforms.length === socialLinks.length ? 'إلغاء تحديد الكل' : 'تفعيل الكل'}
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {socialLinks.map((ch) => {
                  const checked = syncedPlatforms.includes(ch.id);
                  return (
                    <label
                      key={ch.id}
                      className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[#e8f6ff] dark:bg-[#112921] cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-[#0e1d25] dark:text-white truncate">{ch.name}</span>
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#006a46] dark:text-[#6cdba6] shrink-0" />
                        </div>
                        <p className="text-[11px] text-[#6e7a71] dark:text-slate-400 truncate">{ch.handle}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePlatform(ch.id)}
                        className="w-4 h-4 accent-[#006a46] shrink-0"
                      />
                    </label>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-5 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-[#006a46] dark:text-[#6cdba6]" />
                  <h2 className="text-base font-bold text-[#0e1d25] dark:text-white">
                    صندوق رسائل المراسلين والزوار السري ({suggestions.length + volunteers.length})
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setTab('messages')}
                  className="min-h-[36px] px-3 py-1.5 rounded-xl bg-[#006a46] text-white text-xs font-bold"
                >
                  فتح قسم رسائل المراسلين الكامل
                </button>
              </div>

              {suggestions.length === 0 && volunteers.length === 0 ? (
                <p className="text-sm text-[#6e7a71] dark:text-slate-400 py-4">
                  لا توجد رسائل جديدة من المراسلين أو الزوار بعد. ستظهر هنا مقترحات تطوير الموقع وطلبات العمل والتطوع ورسائل الدعم.
                </p>
              ) : (
                <div className="space-y-2.5 max-h-72 overflow-y-auto">
                  {suggestions.slice(0, 5).map((s) => (
                    <div key={s.id} className="p-3 rounded-xl bg-[#e8f6ff] dark:bg-[#112921] text-xs space-y-1">
                      <span className="font-bold text-[#006a46] dark:text-[#6cdba6]">
                        {s.type === 'contribution'
                          ? 'دعم ومساهمة للموقع'
                          : s.type === 'help'
                            ? 'رسالة مراسل واستفسار'
                            : `مقترح تطوير (${s.type === 'preach' ? 'موعظة' : s.type === 'tech' ? 'تقني' : 'تطوير'})`}
                      </span>
                      <p className="text-sm text-[#0e1d25] dark:text-white">{s.text}</p>
                      {s.contact && <span className="text-[#6e7a71] block">تواصل: {s.contact}</span>}
                    </div>
                  ))}
                  {volunteers.slice(0, 5).map((v) => (
                    <div key={v.id} className="p-3 rounded-xl bg-[#fffbf2] dark:bg-[#171d18] text-xs space-y-1">
                      <span className="font-bold text-[#7c5800] dark:text-[#f2be5e]">
                        طلب عمل / تسجيل بالفريق التطوعي · {v.field} ({v.hours} ساعات)
                      </span>
                      <p className="text-sm text-[#0e1d25] dark:text-white">{v.skills}</p>
                      <span className="text-[#6e7a71] block">تواصل: {v.contact}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}

      {/* Correspondents & Visitors Messages Inbox (Hidden from all public visitors; visible ONLY to Supervisors & Managers) */}
      {tab === 'messages' && (
        <AdminMessagesPanel
          authToken={authToken}
          suggestions={suggestions}
          volunteers={volunteers}
          onUpdateMessages={onUpdateMessages}
          onOpenLiveSession={(sid) => {
            setSelectedSessionId(sid);
            setTab('live-support');
          }}
          onNotify={onNotify}
        />
      )}

      {/* Tab 2: Fatawa Management (Both Admin & Editor) */}
      {tab === 'fatawa' && (
        <div className="space-y-5">
          <section className="rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-[#0e1d25] dark:text-white">
              إضافة فتوى جديدة للعلماء الخمسة المعتمدين
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-[#6e7a71] dark:text-slate-400 block mb-1">العالم المفتي</label>
                <select
                  value={fatwaScholarId}
                  onChange={(e) => setFatwaScholarId(e.target.value as FatwaScholarId)}
                  className="w-full min-h-[44px] rounded-xl bg-[#e8f6ff] dark:bg-[#112921] px-3.5 text-sm focus:outline-none"
                >
                  {FATWA_SCHOLARS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.priority ? '(التركيز الأساسي)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-[#6e7a71] dark:text-slate-400 block mb-1">التصنيف</label>
                <select
                  value={fatwaCategory}
                  onChange={(e) => setFatwaCategory(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl bg-[#e8f6ff] dark:bg-[#112921] px-3.5 text-sm focus:outline-none"
                >
                  {FATWA_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <input
              type="text"
              value={fatwaQuestion}
              onChange={(e) => setFatwaQuestion(e.target.value)}
              placeholder="نص السؤال..."
              className="w-full min-h-[44px] rounded-xl bg-[#e8f6ff] dark:bg-[#112921] px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#006a46]"
            />

            <textarea
              rows={4}
              value={fatwaAnswer}
              onChange={(e) => setFatwaAnswer(e.target.value)}
              placeholder="جواب الشيخ الموثق..."
              className="w-full rounded-xl bg-[#e8f6ff] dark:bg-[#112921] p-4 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#006a46]"
            />

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={fatwaSource}
                onChange={(e) => setFatwaSource(e.target.value)}
                placeholder="المصدر / الكتاب أو الدرس (اختياري)"
                className="flex-1 min-h-[44px] rounded-xl bg-[#e8f6ff] dark:bg-[#112921] px-4 text-sm focus:outline-none"
              />
              <button
                type="button"
                disabled={savingFatwa}
                onClick={() => void submitFatwa()}
                className="min-h-[44px] px-6 py-2 rounded-xl bg-[#006a46] hover:bg-[#005235] text-white text-sm font-bold whitespace-nowrap"
              >
                {savingFatwa ? 'جاري الإضافة...' : 'إضافة الفتوى ونشرها'}
              </button>
            </div>
          </section>

          <section className="rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-5 shadow-xs space-y-3">
            <h2 className="text-base font-bold text-[#0e1d25] dark:text-white">
              الفتاوى المنشورة حالياً ({fatawa.length.toLocaleString('ar-EG')})
            </h2>
            <div className="space-y-2.5 max-h-[460px] overflow-y-auto">
              {fatawa.map((ft) => (
                <div
                  key={ft.id}
                  className="p-3.5 rounded-xl bg-[#f4faff] dark:bg-[#112921] border border-slate-200/70 dark:border-white/10 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 space-y-1">
                    <span className="text-xs font-bold text-[#006a46] dark:text-[#6cdba6] block">
                      {ft.scholarName} · {ft.category}
                    </span>
                    <p className="text-sm font-bold text-[#0e1d25] dark:text-white">{ft.question}</p>
                    <p className="text-xs text-[#6e7a71] dark:text-slate-400 line-clamp-2">{ft.answer}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void removeFatwa(ft.id)}
                    aria-label="حذف الفتوى"
                    className="w-9 h-9 rounded-lg bg-white dark:bg-[#0b1f18] text-[#ba1a1a] flex items-center justify-center shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Tab 3: Primary Admin ONLY — Edit Every Button, Label, Hero & Section Text */}
      {tab === 'page-config' && isPrimaryAdmin && (
        <section className="rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[#0e1d25] dark:text-white">
                تعديل مسميات الصفحة والأزرار والوصف الكامل
              </h2>
              <p className="text-xs text-[#6e7a71] dark:text-slate-400 mt-1">
                هذه الصلاحية خاصة بالمسؤول الأول فقط — جميع التعديلات تظهر للجميع على نفس الرابط فوراً.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditConfig({...DEFAULT_SITE_CONFIG});
                  onNotify('تمت استعادة النصوص الافتراضية في المعاينة، اضغط حفظ للاعتماد.');
                }}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#e8f6ff] dark:bg-[#112921] text-xs font-bold flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>النص الافتراضي</span>
              </button>
              <button
                type="button"
                disabled={savingConfig}
                onClick={() => void saveConfigChanges()}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-[#006a46] hover:bg-[#005235] text-white text-xs font-bold"
              >
                {savingConfig ? 'جاري الحفظ...' : 'حفظ تعديلات الصفحة'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {key: 'appName' as const, label: 'اسم التطبيق الرئيسي'},
              {key: 'appTagline' as const, label: 'الوصف المختصر للتطبيق'},
              {key: 'heroBadge' as const, label: 'شارة موعظة اليوم'},
              {key: 'heroGreeting' as const, label: 'تحية الترحيب في الرئيسية'},
              {key: 'heroWisdomText' as const, label: 'نص موعظة اليوم'},
              {key: 'heroWisdomAuthor' as const, label: 'قائل / مصدر موعظة اليوم'},
              {key: 'heroPrimaryBtn' as const, label: 'نص الزر الرئيسي لموعظة اليوم'},
              {key: 'heroCardBtn' as const, label: 'نص زر البطاقة المصورة'},
              {key: 'motherBadge' as const, label: 'شارة بطاقة دعاء الوالدة'},
              {key: 'motherTitle' as const, label: 'عنوان بطاقة دعاء الوالدة'},
              {key: 'motherPrayerText' as const, label: 'النص الأساسي لدعاء الوالدة'},
              {key: 'motherAmenBtn' as const, label: 'نص زر آمين'},
              {key: 'motherShareBtn' as const, label: 'نص زر مشاركة الدعاء'},
              {key: 'sadaBroadcastBtn' as const, label: 'نص زر النشر في البطاقات'},
              {key: 'readMoreBtn' as const, label: 'نص زر القراءة'},
              {key: 'exportCardBtn' as const, label: 'نص زر تصدير البطاقة'},
              {key: 'navHome' as const, label: 'مسمى تبويب الرئيسية'},
              {key: 'navQuran' as const, label: 'مسمى تبويب المصحف'},
              {key: 'navHisn' as const, label: 'مسمى جوامع الأدعية اليومية (الداخلي)'},
              {key: 'navFatawa' as const, label: 'مسمى تبويب الفتاوى'},
              {key: 'navAdhkar' as const, label: 'مسمى تبويب الأذكار والأدعية الجامعة'},
              {key: 'navLibrary' as const, label: 'مسمى تبويب الأرشيف والمكتبات'},
              {key: 'navChannels' as const, label: 'مسمى تبويب المنصات'},
              {key: 'navBookmarks' as const, label: 'مسمى تبويب المحفوظات'},
              {key: 'navAbout' as const, label: 'مسمى صفحة عن الموقع والدعم والمشاركة'},
              {key: 'navSupport' as const, label: 'عنوان متابعة الطلبات والمشاركة'},
              {key: 'sadaTitle' as const, label: 'عنوان صفحة الأرشيف والمكتبات'},
              {key: 'sadaSubtitle' as const, label: 'وصف صفحة الأرشيف والمكتبات'},
              {key: 'fatawaTitle' as const, label: 'عنوان صفحة الفتاوى'},
              {key: 'fatawaSubtitle' as const, label: 'وصف صفحة الفتاوى'},
              {key: 'hisnTitle' as const, label: 'عنوان صفحة الأذكار والأدعية الجامعة'},
              {key: 'hisnSubtitle' as const, label: 'وصف صفحة الأذكار والأدعية الجامعة'},
              {key: 'channelsTitle' as const, label: 'عنوان صفحة القنوات'},
              {key: 'channelsSubtitle' as const, label: 'وصف صفحة القنوات'},
              {key: 'aboutTitle' as const, label: 'عنوان صفحة عن الموقع والدعم والمشاركة'},
              {key: 'aboutSubtitle' as const, label: 'وصف صفحة عن الموقع والدعم والمشاركة'},
              {key: 'supportTitle' as const, label: 'عنوان نافذة الدعم ومتابعة الطلبات'},
              {key: 'supportSubtitle' as const, label: 'وصف نافذة الدعم ومتابعة الطلبات'},
              {key: 'supportEmail' as const, label: 'بريد إداري داخلي (محجوب عن الزوار)'},
              {key: 'modernUxClause' as const, label: 'بند التصميم العصري وسهولة التصفح'},
            ].map((field) => (
              <div key={field.key} className="space-y-1">
                <label className="text-xs font-bold text-[#3e4a42] dark:text-slate-300 block">{field.label}</label>
                {field.key.includes('Subtitle') || field.key.includes('Text') || field.key.includes('Clause') ? (
                  <textarea
                    rows={field.key.includes('Clause') ? 3 : 2}
                    value={editConfig[field.key]}
                    onChange={(e) => updateConfigField(field.key, e.target.value)}
                    className="w-full rounded-xl bg-[#e8f6ff] dark:bg-[#112921] px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006a46]"
                  />
                ) : (
                  <input
                    type={field.key === 'supportEmail' ? 'email' : 'text'}
                    dir={field.key === 'supportEmail' ? 'ltr' : 'rtl'}
                    placeholder={field.key === 'supportEmail' ? 'محجوب تلقائياً عن الزوار' : undefined}
                    value={editConfig[field.key]}
                    onChange={(e) => updateConfigField(field.key, e.target.value)}
                    className="w-full min-h-[42px] rounded-xl bg-[#e8f6ff] dark:bg-[#112921] px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#006a46]"
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tab 4: Primary Admin ONLY — Links, Icons & Security */}
      {tab === 'links-icons' && isPrimaryAdmin && (
        <div className="space-y-6">
          {/* Links Editor */}
          <section className="rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[#0e1d25] dark:text-white">روابط منصات التواصل الخاصة بك</h2>
                <p className="text-xs text-[#6e7a71] dark:text-slate-400 mt-1">
                  عدّل الروابط والمعرفات أو أضف وأخفِ أي منصة بسهولة.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={addNewLink}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#e8f6ff] dark:bg-[#133126] text-[#006a46] dark:text-[#6cdba6] text-xs font-bold flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة منصة</span>
                </button>
                <button
                  type="button"
                  disabled={savingCustom}
                  onClick={() => void saveCustom()}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-[#006a46] hover:bg-[#005235] text-white text-xs font-bold transition-colors"
                >
                  {savingCustom ? 'جاري الحفظ...' : 'حفظ الروابط والأيقونات'}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {editLinks.map((ch) => {
                const Icon = resolveIcon(ch.iconId, 'globe');
                const style = COLOR_SCHEME_STYLES[ch.colorScheme] || COLOR_SCHEME_STYLES.emerald;
                return (
                  <div
                    key={ch.id}
                    className="rounded-2xl bg-[#f4faff] dark:bg-[#112921] border border-slate-200/80 dark:border-white/10 p-4 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${style.badgeClass}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-bold text-[#0e1d25] dark:text-white">{ch.name}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={ch.enabled}
                            onChange={(e) => updateLinkField(ch.id, 'enabled', e.target.checked)}
                            className="w-4 h-4 accent-[#006a46]"
                          />
                          <span>مفعل</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => removeLink(ch.id)}
                          aria-label="حذف المنصة"
                          className="w-9 h-9 rounded-lg text-[#ba1a1a] hover:bg-[#ffdad6]/40 flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <input
                        type="text"
                        value={ch.name}
                        onChange={(e) => updateLinkField(ch.id, 'name', e.target.value)}
                        placeholder="اسم المنصة"
                        className="min-h-[42px] rounded-xl bg-white dark:bg-[#0b1f18] px-3 text-sm focus:outline-none"
                      />
                      <input
                        type="text"
                        value={ch.handle}
                        onChange={(e) => updateLinkField(ch.id, 'handle', e.target.value)}
                        placeholder="المعرف (@handle)"
                        className="min-h-[42px] rounded-xl bg-white dark:bg-[#0b1f18] px-3 text-sm focus:outline-none"
                      />
                      <input
                        type="text"
                        value={ch.followers}
                        onChange={(e) => updateLinkField(ch.id, 'followers', e.target.value)}
                        placeholder="المتابعين"
                        className="min-h-[42px] rounded-xl bg-white dark:bg-[#0b1f18] px-3 text-sm focus:outline-none"
                      />
                      <input
                        type="url"
                        dir="ltr"
                        value={ch.url}
                        onChange={(e) => updateLinkField(ch.id, 'url', e.target.value)}
                        placeholder="https://..."
                        className="min-h-[42px] rounded-xl bg-white dark:bg-[#0b1f18] px-3 text-sm focus:outline-none"
                      />
                      <select
                        value={ch.iconId}
                        onChange={(e) => updateLinkField(ch.id, 'iconId', e.target.value)}
                        className="min-h-[42px] rounded-xl bg-white dark:bg-[#0b1f18] px-3 text-sm focus:outline-none"
                      >
                        {ICON_OPTIONS.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            أيقونة: {opt.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={ch.colorScheme}
                        onChange={(e) => updateLinkField(ch.id, 'colorScheme', e.target.value as ColorScheme)}
                        className="min-h-[42px] rounded-xl bg-white dark:bg-[#0b1f18] px-3 text-sm focus:outline-none"
                      >
                        {(Object.keys(COLOR_SCHEME_STYLES) as ColorScheme[]).map((cs) => (
                          <option key={cs} value={cs}>
                            لون: {COLOR_SCHEME_STYLES[cs].label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <input
                      type="text"
                      value={ch.description}
                      onChange={(e) => updateLinkField(ch.id, 'description', e.target.value)}
                      placeholder="وصف مختصر للقناة..."
                      className="w-full min-h-[42px] rounded-xl bg-white dark:bg-[#0b1f18] px-3 text-sm focus:outline-none"
                    />
                  </div>
                );
              })}
            </div>
          </section>

          {/* Icons & Emblem */}
          <section className="rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[#0e1d25] dark:text-white">تخصيص الشعار وهوية الأيقونات</h2>
                <p className="text-xs text-[#6e7a71] dark:text-slate-400 mt-1">
                  غيّر الشعار الرسمي للتطبيق والمعرف الظاهر في البطاقات وأيقونات التبويبات
                </p>
              </div>
              <button
                type="button"
                onClick={resetIcons}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#e8f6ff] dark:bg-[#112921] text-xs font-bold flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>استعادة الأيقونات</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#3e4a42] dark:text-slate-300 block">
                  معرّف المنصة في البطاقات
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={editHandle}
                  onChange={(e) => setEditHandle(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl bg-[#e8f6ff] dark:bg-[#112921] px-4 text-sm font-semibold focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#3e4a42] dark:text-slate-300 block">شعار التطبيق</label>
                <div className="flex flex-wrap items-center gap-2">
                  {EMBLEM_OPTIONS.map((emb) => {
                    const selected = editIcons.brandEmblem === emb.id;
                    return (
                      <button
                        key={emb.id}
                        type="button"
                        onClick={() => setEditIcons((prev) => ({...prev, brandEmblem: emb.id as EmblemVariant}))}
                        className={`min-h-[44px] px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                          selected
                            ? 'border-[#006a46] bg-[#e8f6ff] dark:bg-[#133126] text-[#006a46] dark:text-[#6cdba6]'
                            : 'border-slate-200 dark:border-white/10'
                        }`}
                      >
                        <BrandEmblem className="w-5 h-5" variant={emb.id} />
                        <span>{emb.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {ICON_SLOT_LABELS.map((slot) => {
                const Icon = resolveIcon(editIcons[slot.key], 'sparkles');
                return (
                  <div
                    key={slot.key}
                    className="rounded-xl bg-[#f4faff] dark:bg-[#112921] p-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-[#006a46]/10 text-[#006a46] dark:text-[#6cdba6] flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold truncate">{slot.label}</span>
                    </div>
                    <select
                      value={editIcons[slot.key]}
                      onChange={(e) => setEditIcons((prev) => ({...prev, [slot.key]: e.target.value}))}
                      className="min-h-[38px] rounded-lg bg-white dark:bg-[#0b1f18] px-2 text-xs font-semibold focus:outline-none"
                    >
                      {ICON_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Security & Gesture */}
          <section className="rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#7c5800] dark:text-[#f2be5e]" />
              <h2 className="text-base font-bold text-[#0e1d25] dark:text-white">
                إعدادات الأمان والإيماءة المخفية للدخول
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center justify-between p-3 rounded-xl bg-[#e8f6ff] dark:bg-[#112921] cursor-pointer">
                <span className="text-sm font-medium">الضغط المطول على شعار التطبيق (ثانيتين)</span>
                <input
                  type="radio"
                  name="adminGesture"
                  checked={gesture === 'long_press'}
                  onChange={() => setGesture('long_press')}
                  className="w-4 h-4 accent-[#006a46]"
                />
              </label>
              <label className="flex items-center justify-between p-3 rounded-xl bg-[#e8f6ff] dark:bg-[#112921] cursor-pointer">
                <span className="text-sm font-medium">٥ نقرات متتالية على اسم «{siteConfig.appName}»</span>
                <input
                  type="radio"
                  name="adminGesture"
                  checked={gesture === 'multi_tap'}
                  onChange={() => setGesture('multi_tap')}
                  className="w-4 h-4 accent-[#006a46]"
                />
              </label>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <select
                value={targetUser}
                onChange={(e) => setTargetUser(e.target.value)}
                className="min-h-[44px] rounded-xl bg-[#e8f6ff] dark:bg-[#112921] px-4 text-sm font-semibold focus:outline-none"
              >
                <option value="moalwbri">تحديث كلمة مرور المسؤول الأول (moalwbri)</option>
                <option value="ax1ax70">تحديث كلمة مرور المحرر (ax1ax70)</option>
              </select>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="كلمة مرور جديدة (اختياري)"
                className="flex-1 min-h-[44px] rounded-xl bg-[#e8f6ff] dark:bg-[#112921] px-4 py-2 text-sm focus:outline-none"
              />
              <button
                type="button"
                disabled={savingSecurity}
                onClick={() => void saveSecurity()}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-[#006a46] text-white text-sm font-bold shrink-0"
              >
                {savingSecurity ? 'حفظ...' : 'حفظ إعدادات الأمان'}
              </button>
            </div>
          </section>

          {/* Delegation & Multi-Account Portability (Primary Admin ONLY) */}
          <section className="rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-5 shadow-xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#006a46] dark:text-[#6cdba6]" />
                <div>
                  <h2 className="text-base font-bold text-[#0e1d25] dark:text-white">
                    تفويض الحسابات وتنسيق التعديل من أي حساب آخر
                  </h2>
                  <p className="text-xs text-[#6e7a71] dark:text-slate-400">
                    أضف مشرفين أو محررين إضافيين، وصدّر أو استورد نسخة المنصة الكاملة عند التطوير من حساب آخر.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={resettingCounters}
                onClick={() => void handleResetAllCounters()}
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#ffdad6]/60 hover:bg-[#ffdad6] text-[#93000a] text-xs font-bold flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{resettingCounters ? 'جاري التصفير...' : 'تصفير الإعجابات والتعليقات والدعاء'}</span>
              </button>
            </div>

            {/* 1-Click Ownership Transfer Card to Personal Gmail ax1ax70@gmail.com */}
            <div className="rounded-2xl bg-gradient-to-br from-[#eefaf4] to-[#fffaf0] dark:from-[#0f2c21] dark:to-[#1a180f] border-2 border-[#006a46]/30 p-4 sm:p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-[#006a46] dark:text-[#6cdba6] flex items-center gap-2">
                    <Shield className="w-4 h-4 shrink-0" />
                    <span>نقل ملكية وصلاحيات الإدارة الكاملة إلى حسابك الشخصي (ax1ax70@gmail.com)</span>
                  </h3>
                  <p className="text-xs text-[#3e4a42] dark:text-slate-300 mt-1 leading-relaxed">
                    أنشئ حساب مدير رئيسي كامل الصلاحيات ببريدك الشخصي <span dir="ltr" className="font-bold">ax1ax70@gmail.com</span> لتسجيل الدخول وإدارة كافة أقسام الموقع مباشرة، مع إمكانية تنزيل نسخة JSON الكاملة لنقلها لأي استضافة أو حساب AI Studio آخر.
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="password"
                  value={transferPassword}
                  onChange={(e) => setTransferPassword(e.target.value)}
                  placeholder="حدد كلمة مرور جديدة لحساب ax1ax70@gmail.com"
                  className="flex-1 min-h-[44px] rounded-xl bg-white dark:bg-[#081712] border border-emerald-700/20 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#006a46]"
                />
                <button
                  type="button"
                  disabled={transferBusy}
                  onClick={() => void handleTransferOwnershipToPersonalEmail()}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-[#006a46] hover:bg-[#005235] disabled:opacity-60 text-white text-xs sm:text-sm font-extrabold whitespace-nowrap"
                >
                  {transferBusy ? 'جاري التفعيل...' : 'تفعيل الإدارة لحساب ax1ax70@gmail.com'}
                </button>
              </div>
            </div>

            {accounts.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {accounts.map((acc) => (
                  <div
                    key={acc.username}
                    className="p-3 rounded-xl bg-[#f4faff] dark:bg-[#112921] flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#0e1d25] dark:text-white truncate">{acc.username}</p>
                      <span className="text-[11px] font-semibold text-[#006a46] dark:text-[#6cdba6]">
                        {acc.role === 'admin'
                          ? 'مدير ومسؤول رئيسي'
                          : acc.role === 'supervisor'
                            ? `مشرف قسم (${acc.assignedSection || 'all'})`
                            : `محرر محتوى (${acc.assignedSection || 'all'})`}
                      </span>
                    </div>
                    {acc.username !== 'moalwbri' && (
                      <button
                        type="button"
                        onClick={() => void removeDelegatedAccount(acc.username)}
                        aria-label={`حذف ${acc.username}`}
                        className="w-8 h-8 rounded-lg bg-white dark:bg-[#0b1f18] text-[#ba1a1a] flex items-center justify-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
              <input
                type="text"
                value={newAccUser}
                onChange={(e) => setNewAccUser(e.target.value)}
                placeholder="اسم مستخدم جديد"
                className="min-h-[44px] rounded-xl bg-[#e8f6ff] dark:bg-[#112921] px-3.5 text-sm focus:outline-none"
              />
              <input
                type="password"
                value={newAccPass}
                onChange={(e) => setNewAccPass(e.target.value)}
                placeholder="كلمة المرور"
                className="min-h-[44px] rounded-xl bg-[#e8f6ff] dark:bg-[#112921] px-3.5 text-sm focus:outline-none"
              />
              <select
                value={newAccRole}
                onChange={(e) => setNewAccRole(e.target.value as AdminRole)}
                className="min-h-[44px] rounded-xl bg-[#e8f6ff] dark:bg-[#112921] px-3 text-sm focus:outline-none"
              >
                <option value="editor">محرر محتوى (Editor)</option>
                <option value="supervisor">مشرف قسم (Supervisor)</option>
                <option value="admin">مدير كامل (Admin)</option>
              </select>
              <select
                value={newAccSection}
                onChange={(e) => setNewAccSection(e.target.value as AdminSectionScope)}
                disabled={newAccRole === 'admin'}
                className="min-h-[44px] rounded-xl bg-[#e8f6ff] dark:bg-[#112921] px-3 text-sm focus:outline-none disabled:opacity-50"
              >
                <option value="all">جميع الأقسام المسموحة</option>
                <option value="mother-oasis">واحة الداعية أمي</option>
                <option value="deaf-mute">قسم الصم والبكم</option>
                <option value="fatawa">الفتاوى</option>
                <option value="library">المكتبات العلمية</option>
                <option value="adhkar">الأذكار والأدعية</option>
                <option value="poetry">الشعر والطرائف</option>
              </select>
              <button
                type="button"
                disabled={savingAccount}
                onClick={() => void addDelegatedAccount()}
                className="min-h-[44px] px-4 rounded-xl bg-[#006a46] hover:bg-[#005235] text-white text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>{savingAccount ? 'جاري الإضافة...' : 'إضافة / تحديث حساب'}</span>
              </button>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-white/10 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void handleExportBackup()}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#e8f6ff] dark:bg-[#133126] text-[#006a46] dark:text-[#6cdba6] text-xs font-bold flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>تصدير نسخة المنصة (JSON)</span>
              </button>

              <label className="min-h-[44px] px-4 py-2 rounded-xl bg-[#fffbf2] dark:bg-white/10 text-[#7c5800] dark:text-[#f2be5e] text-xs font-bold flex items-center gap-2 cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>استيراد نسخة من حساب آخر (JSON)</span>
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={(e) => void handleImportBackup(e)}
                  className="hidden"
                />
              </label>
            </div>
          </section>
        </div>
      )}

      {/* Tab 5 (Primary Admin ONLY): Monthly Recharts Engagement Analytics */}
      {tab === 'analytics' && isPrimaryAdmin && (
        <AdminAnalyticsPanel authToken={authToken} refreshKey={analyticsRefreshKey} />
      )}

      {/* Tab 6 (Primary Admin ONLY): Auto-Poster Bot & Admin Notification Channels */}
      {tab === 'automation' && isPrimaryAdmin && (
        <section className="rounded-3xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-[#0e1d25] dark:text-white flex items-center gap-2">
                <Bot className="w-5 h-5 text-[#006a46] dark:text-[#6cdba6]" />
                <span>🤖 إعدادات بوت النشر الآلي والتنبيهات الصامتة</span>
              </h2>
              <p className="text-xs text-[#6e7a71] dark:text-slate-400 mt-1">
                ربط المنصة بـ Make / Zapier / n8n للنشر التلقائي (فيسبوك، واتساب، منصة X)، وإرسال تنبيهات التذاكر سرياً للمشرف دون كشف رقم الجوال للزوار.
              </p>
            </div>
            <button
              type="button"
              disabled={savingAutomation}
              onClick={() => void handleSaveAutomationClick()}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-[#006a46] hover:bg-[#005235] disabled:opacity-60 text-white text-xs sm:text-sm font-bold"
            >
              {savingAutomation ? 'جاري الحفظ...' : 'حفظ إعدادات البوت والتنبيهات'}
            </button>
          </div>

          <div className="rounded-2xl bg-[#f4faff] dark:bg-[#112921] p-4 sm:p-5 space-y-4">
            <h3 className="text-sm font-extrabold text-[#0e1d25] dark:text-white">
              ١. بوت النشر الآلي (فيسبوك، واتساب، منصة X)
            </h3>
            <label className="space-y-1.5 block">
              <span className="text-xs font-bold text-[#3e4a42] dark:text-slate-300">
                رابط Webhook للنشر الآلي (HTTPS)
              </span>
              <input
                type="url"
                dir="ltr"
                value={editAutomation.autoPostWebhookUrl}
                onChange={(e) => setEditAutomation((prev) => ({...prev, autoPostWebhookUrl: e.target.value}))}
                placeholder="https://hook.eu1.make.com/..."
                className="w-full min-h-[44px] rounded-xl bg-white dark:bg-[#081712] border border-slate-200 dark:border-white/10 px-4 text-sm"
              />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {(
                [
                  {key: 'facebook', label: 'فيسبوك (Facebook Page)'},
                  {key: 'whatsapp', label: 'واتساب (WhatsApp Business)'},
                  {key: 'x', label: 'منصة إكس (X)'},
                ] as const
              ).map((plat) => (
                <label
                  key={plat.key}
                  className="flex items-center justify-between gap-2 p-3 rounded-xl bg-white dark:bg-[#081712] border border-slate-200/80 dark:border-white/10 cursor-pointer"
                >
                  <span className="text-xs font-bold text-[#0e1d25] dark:text-white">{plat.label}</span>
                  <input
                    type="checkbox"
                    checked={editAutomation.enabledPlatforms[plat.key]}
                    onChange={(e) =>
                      setEditAutomation((prev) => ({
                        ...prev,
                        enabledPlatforms: {...prev.enabledPlatforms, [plat.key]: e.target.checked},
                      }))
                    }
                    className="w-4 h-4 accent-[#006a46]"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-[#fffbf2] dark:bg-[#13201b] border border-[#f2be5e]/35 p-4 sm:p-5 space-y-4">
            <h3 className="text-sm font-extrabold text-[#0e1d25] dark:text-white">
              ٢. إشعارات التذاكر الصامتة للمشرف (+ إشعارات واتساب للزائر)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <label className="space-y-1 block md:col-span-2">
                <span className="text-xs font-bold text-[#3e4a42] dark:text-slate-300">
                  رابط Webhook لتنبيهات المشرف وتحديثات الواتساب
                </span>
                <input
                  type="url"
                  dir="ltr"
                  value={editAutomation.adminNotifyWebhookUrl}
                  onChange={(e) => setEditAutomation((prev) => ({...prev, adminNotifyWebhookUrl: e.target.value}))}
                  placeholder="https://hook.eu1.make.com/..."
                  className="w-full min-h-[42px] rounded-xl bg-white dark:bg-[#081712] border border-slate-200 dark:border-white/10 px-3.5 text-sm"
                />
              </label>

              <label className="space-y-1 block">
                <span className="text-xs font-bold text-[#3e4a42] dark:text-slate-300">Telegram Bot Token</span>
                <input
                  type="text"
                  dir="ltr"
                  value={editAutomation.telegramBotToken}
                  onChange={(e) => setEditAutomation((prev) => ({...prev, telegramBotToken: e.target.value}))}
                  placeholder="123456:ABC-DEF..."
                  className="w-full min-h-[42px] rounded-xl bg-white dark:bg-[#081712] border border-slate-200 dark:border-white/10 px-3.5 text-sm"
                />
              </label>

              <label className="space-y-1 block">
                <span className="text-xs font-bold text-[#3e4a42] dark:text-slate-300">Telegram Chat ID</span>
                <input
                  type="text"
                  dir="ltr"
                  value={editAutomation.telegramChatId}
                  onChange={(e) => setEditAutomation((prev) => ({...prev, telegramChatId: e.target.value}))}
                  placeholder="-100..."
                  className="w-full min-h-[42px] rounded-xl bg-white dark:bg-[#081712] border border-slate-200 dark:border-white/10 px-3.5 text-sm"
                />
              </label>

              <label className="space-y-1 block">
                <span className="text-xs font-bold text-[#3e4a42] dark:text-slate-300">EmailJS Service ID</span>
                <input
                  type="text"
                  dir="ltr"
                  value={editAutomation.emailJsServiceId}
                  onChange={(e) => setEditAutomation((prev) => ({...prev, emailJsServiceId: e.target.value}))}
                  placeholder="service_..."
                  className="w-full min-h-[42px] rounded-xl bg-white dark:bg-[#081712] border border-slate-200 dark:border-white/10 px-3.5 text-sm"
                />
              </label>

              <label className="space-y-1 block">
                <span className="text-xs font-bold text-[#3e4a42] dark:text-slate-300">EmailJS Template ID</span>
                <input
                  type="text"
                  dir="ltr"
                  value={editAutomation.emailJsTemplateId}
                  onChange={(e) => setEditAutomation((prev) => ({...prev, emailJsTemplateId: e.target.value}))}
                  placeholder="template_..."
                  className="w-full min-h-[42px] rounded-xl bg-white dark:bg-[#081712] border border-slate-200 dark:border-white/10 px-3.5 text-sm"
                />
              </label>

              <label className="space-y-1 block md:col-span-2">
                <span className="text-xs font-bold text-[#3e4a42] dark:text-slate-300">EmailJS Public Key</span>
                <input
                  type="text"
                  dir="ltr"
                  value={editAutomation.emailJsPublicKey}
                  onChange={(e) => setEditAutomation((prev) => ({...prev, emailJsPublicKey: e.target.value}))}
                  placeholder="public_key..."
                  className="w-full min-h-[42px] rounded-xl bg-white dark:bg-[#081712] border border-slate-200 dark:border-white/10 px-3.5 text-sm"
                />
              </label>
            </div>
          </div>
        </section>
      )}

      {/* Tab 7 (Primary Admin ONLY): Appearance Studio, Brightness Slider, Announcement Bar & Maintenance Mode */}
      {tab === 'appearance' && isPrimaryAdmin && (
        <section className="rounded-3xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-[#0e1d25] dark:text-white flex items-center gap-2">
                <Palette className="w-5 h-5 text-[#006a46] dark:text-[#6cdba6]" />
                <span>🎨 استوديو المظهر والسطوع وشريط الإعلانات ووضع الصيانة</span>
              </h2>
              <p className="text-xs text-[#6e7a71] dark:text-slate-400 mt-1">
                اختر خلفية الموقع الرسمية، اضبط السطوع العام (70% - 120%)، فعّل شريط الإعلانات أو وضع الصيانة السريع.
              </p>
            </div>
            <button
              type="button"
              disabled={savingAppearance}
              onClick={() => void handleSaveAppearanceClick()}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-[#006a46] hover:bg-[#005235] disabled:opacity-60 text-white text-xs sm:text-sm font-bold"
            >
              {savingAppearance ? 'جاري الحفظ...' : 'حفظ إعدادات المظهر والصيانة'}
            </button>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-[#0e1d25] dark:text-white">ثيمات وخلفية الموقع الجاهزة</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {(
                [
                  {id: 'default', label: 'الأبيض النقي', swatch: 'bg-white border-slate-300'},
                  {id: 'emerald_mist', label: 'ضباب زمردي', swatch: 'bg-[#f1faf5] border-emerald-300'},
                  {id: 'warm_parchment', label: 'ورق دافئ', swatch: 'bg-[#fdf8ec] border-amber-300'},
                  {id: 'sky_calm', label: 'سماوي هادئ', swatch: 'bg-[#f0f8ff] border-sky-300'},
                  {id: 'deep_forest', label: 'إطار غابة عميقة', swatch: 'bg-[#081c15] border-emerald-700 text-white'},
                ] as Array<{id: SiteBackgroundPreset; label: string; swatch: string}>
              ).map((preset) => {
                const active = editAppearance.backgroundPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setEditAppearance((prev) => ({...prev, backgroundPreset: preset.id}))}
                    className={`p-3 rounded-2xl border text-xs font-extrabold transition-all ${preset.swatch} ${
                      active ? 'ring-2 ring-[#006a46] ring-offset-2' : 'opacity-85 hover:opacity-100'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl bg-[#f4faff] dark:bg-[#112921] p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span>درجة سطوع العرض العام للموقع</span>
              <span className="tabular-nums text-[#006a46] dark:text-[#6cdba6]">{editAppearance.brightness}%</span>
            </div>
            <input
              type="range"
              min={70}
              max={120}
              step={5}
              value={editAppearance.brightness}
              onChange={(e) => setEditAppearance((prev) => ({...prev, brightness: Number(e.target.value)}))}
              className="w-full accent-[#006a46]"
            />
          </div>

          <div className="rounded-2xl bg-[#fffbf2] dark:bg-[#13201b] border border-[#f2be5e]/35 p-4 space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-bold text-[#0e1d25] dark:text-white">
                تفعيل شريط الإعلانات العلوي في الموقع
              </span>
              <input
                type="checkbox"
                checked={editAppearance.announcementEnabled}
                onChange={(e) =>
                  setEditAppearance((prev) => ({...prev, announcementEnabled: e.target.checked}))
                }
                className="w-5 h-5 accent-[#006a46]"
              />
            </label>
            <input
              type="text"
              value={editAppearance.announcementText}
              onChange={(e) => setEditAppearance((prev) => ({...prev, announcementText: e.target.value}))}
              placeholder="نص الإعلان الهام للزوار (مثال: تم إضافة قسم البطاقات الدعوية الكلاسيكية بحلته الجديدة)..."
              className="w-full min-h-[42px] rounded-xl bg-white dark:bg-[#081712] border border-slate-200 dark:border-white/10 px-3.5 text-sm"
            />
            <input
              type="url"
              dir="ltr"
              value={editAppearance.announcementUrl || ''}
              onChange={(e) => setEditAppearance((prev) => ({...prev, announcementUrl: e.target.value}))}
              placeholder="رابط اختياري عند النقر على الإعلان (https://...)"
              className="w-full min-h-[40px] rounded-xl bg-white dark:bg-[#081712] border border-slate-200 dark:border-white/10 px-3.5 text-xs"
            />
          </div>

          <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-700 dark:text-rose-300 shrink-0" />
              <div>
                <p className="text-sm font-extrabold text-rose-900 dark:text-rose-200">
                  وضع الصيانة السريع (Maintenance Mode)
                </p>
                <p className="text-xs text-rose-800/80 dark:text-rose-300/80">
                  عند التفعيل تظهر رسالة «جاري التطوير والتحسين» للزوار مع بقاء المشرف قادراً على التصفح والتعديل.
                </p>
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={editAppearance.maintenanceMode}
                onChange={(e) => setEditAppearance((prev) => ({...prev, maintenanceMode: e.target.checked}))}
                className="w-5 h-5 accent-rose-600"
              />
              <span>{editAppearance.maintenanceMode ? 'مفعل الآن' : 'معطل'}</span>
            </label>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-white/10 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleExportBackup()}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#e8f6ff] dark:bg-[#133126] text-[#006a46] dark:text-[#6cdba6] text-xs font-bold flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>تصدير نسخة كاملة JSON</span>
            </button>
            <label className="min-h-[44px] px-4 py-2 rounded-xl bg-[#fffbf2] dark:bg-white/10 text-[#7c5800] dark:text-[#f2be5e] text-xs font-bold flex items-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>استيراد نسخة احتياطية JSON</span>
              <input
                type="file"
                accept="application/json,.json"
                onChange={(e) => void handleImportBackup(e)}
                className="hidden"
              />
            </label>
          </div>
        </section>
      )}

      {/* Tab: Mother Oasis Editor & Zero-Audio-Storage Dictation / Transcription */}
      {tab === 'mother-oasis' && (
        <section className="rounded-3xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 shadow-xs space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-extrabold text-[#0e1d25] dark:text-white flex items-center gap-2">
              <FolderHeart className="w-5 h-5 text-[#006a46] dark:text-[#6cdba6]" />
              <span>واحة الداعية الفاضلة أمي: أم محمد إكرام عبده علي</span>
            </h2>
            <p className="text-xs sm:text-sm text-[#3e4a42] dark:text-slate-300 leading-relaxed">
              أداة ميسّرة للنشر النصي الخالص: تحدثي مباشرة أو ارفعي تسجيلاً صوتياً جاهزاً لتحويله فوراً إلى نص عربي محرر — دون حفظ أي ملفات صوتية نهائياً.
            </p>
          </div>

          <div className="rounded-2xl bg-[#fffbf2] dark:bg-[#13221c] border border-[#f2be5e]/45 p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <label className="space-y-1 block">
                <span className="text-xs font-bold text-[#3e4a42] dark:text-slate-300">الباب داخل الواحة</span>
                <select
                  value={oasisChapter}
                  onChange={(e) => setOasisChapter(e.target.value as MotherOasisChapter)}
                  className="w-full min-h-[46px] rounded-xl bg-white dark:bg-[#081712] border border-slate-200 dark:border-white/10 px-4 text-sm font-bold"
                >
                  <option value="books">١. باب المؤلفات والكتب الدعوية والتربوية</option>
                  <option value="lectures">٢. باب المحاضرات والدروس المفرغة</option>
                  <option value="stories">٣. باب «قصص وعبر من واقع الحياة»</option>
                </select>
              </label>

              <label className="space-y-1 block">
                <span className="text-xs font-bold text-[#3e4a42] dark:text-slate-300">عنوان المقال أو الدرس أو القصة</span>
                <input
                  type="text"
                  value={oasisTitle}
                  onChange={(e) => setOasisTitle(e.target.value)}
                  placeholder="مثال: بر الوالدين وصلاح القلوب..."
                  className="w-full min-h-[46px] rounded-xl bg-white dark:bg-[#081712] border border-slate-200 dark:border-white/10 px-4 text-sm font-semibold"
                />
              </label>
            </div>

            {/* 3 Large Clear Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={toggleLiveSpeechDictation}
                className={`min-h-[54px] px-4 py-3 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-colors shadow-xs ${
                  oasisListening
                    ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                    : 'bg-[#006a46] hover:bg-[#005235] text-white'
                }`}
              >
                {oasisListening ? <Square className="w-4 h-4 shrink-0" /> : <Mic className="w-5 h-5 shrink-0" />}
                <span>
                  {oasisListening
                    ? 'إيقاف الاستماع المباشر الآن'
                    : 'تحدثي الآن للتفريغ الفوري (نص فقط)'}
                </span>
              </button>

              <label className="min-h-[54px] px-4 py-3 rounded-2xl bg-[#e8f6ff] hover:bg-[#d5ecfb] dark:bg-[#133126] text-[#006389] dark:text-[#80cfff] text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs">
                <FileAudio className="w-5 h-5 shrink-0" />
                <span>
                  {oasisTranscribing
                    ? 'جاري التفريغ النصي...'
                    : 'رفع تسجيل صوتي جاهز ← نص'}
                </span>
                <input
                  type="file"
                  accept="audio/*"
                  disabled={oasisTranscribing}
                  onChange={(e) => void handleUploadAudioToText(e)}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                disabled={oasisFormatting}
                onClick={() => void handleFormatOasisText()}
                className="min-h-[54px] px-4 py-3 rounded-2xl bg-[#ffdea8] hover:bg-[#f2be5e] text-[#271900] text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-colors shadow-xs"
              >
                <Sparkles className="w-5 h-5 shrink-0" />
                <span>{oasisFormatting ? 'جاري التنسيق...' : 'تنسيق وتصحيح النص تلقائياً'}</span>
              </button>
            </div>

            <textarea
              rows={8}
              value={oasisBody}
              onChange={(e) => setOasisBody(e.target.value)}
              placeholder="اكتبي النص هنا، أو اضغطي زر التحدث / رفع التسجيل ليُفرَّغ نصاً عربياً مضبوطاً دون حفظ أي تسجيل صوتي..."
              className="w-full rounded-2xl bg-white dark:bg-[#081712] border border-slate-200 dark:border-white/10 p-4 text-sm sm:text-base leading-[1.85] focus:outline-none focus:ring-2 focus:ring-[#006a46]"
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-semibold text-[#6e7a71] dark:text-slate-400">
                يُحفظ النص المحرر فقط في قاعدة البيانات ولا يُخزَّن أي مقطع صوتي على الخادم.
              </span>
              <button
                type="button"
                disabled={oasisSaving}
                onClick={() => void handlePublishMotherOasis()}
                className="min-h-[48px] px-6 py-2.5 rounded-2xl bg-[#006a46] hover:bg-[#005235] disabled:opacity-60 text-white text-sm font-extrabold flex items-center gap-2 shadow-sm"
              >
                <Send className="w-4 h-4" />
                <span>{oasisSaving ? 'جاري النشر...' : 'اعتماد ونشر النص في واحة أمي'}</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm sm:text-base font-extrabold text-[#0e1d25] dark:text-white">
              المواد النصية المنشورة في واحة أمي ({motherOasisItems.length.toLocaleString('ar-EG')})
            </h3>
            {motherOasisItems.length === 0 ? (
              <p className="text-xs text-[#6e7a71] dark:text-slate-400">لا توجد مواد منشورة حتى الآن.</p>
            ) : (
              <div className="space-y-2.5">
                {motherOasisItems.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-[#fafcfb] dark:bg-[#081712] p-4 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <span className="text-[11px] font-extrabold text-[#006a46] dark:text-[#6cdba6]">
                        {item.chapter === 'books'
                          ? 'المؤلفات والكتب الدعوية'
                          : item.chapter === 'lectures'
                            ? 'المحاضرات والدروس المفرغة'
                            : 'قصص وعبر من واقع الحياة'}
                      </span>
                      <h4 className="text-sm font-extrabold text-[#0e1d25] dark:text-white">{item.title}</h4>
                      <p className="text-xs text-[#3e4a42] dark:text-slate-300 line-clamp-2">{item.body}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDeleteMotherOasisItem(item.id)}
                      aria-label={`حذف ${item.title}`}
                      className="min-w-[38px] min-h-[38px] rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Tab: Deaf & Mute Videos Manager (Eng. Younis Abdulkarim) */}
      {tab === 'deaf-mute' && (
        <section className="rounded-3xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 shadow-xs space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-extrabold text-[#0e1d25] dark:text-white flex items-center gap-2">
              <HandHeart className="w-5 h-5 text-[#006a46] dark:text-[#6cdba6]" />
              <span>إدارة فيديوهات قناة الصم والبكم (بإشراف م. يونس عبدالكريم)</span>
            </h2>
            <p className="text-xs text-[#6e7a71] dark:text-slate-400">
              أضف روابط فيديوهات يوتيوب الدعوية بلغة الإشارة والترجمة النصية لتظهر مباشرة في قسم الصم والبكم.
            </p>
          </div>

          <div className="rounded-2xl bg-[#f4faff] dark:bg-[#112921] p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={dmTitle}
                onChange={(e) => setDmTitle(e.target.value)}
                placeholder="عنوان الفيديو الدعوي..."
                className="min-h-[42px] rounded-xl bg-white dark:bg-[#081712] border border-slate-200 dark:border-white/10 px-3.5 text-sm"
              />
              <input
                type="url"
                dir="ltr"
                value={dmYoutube}
                onChange={(e) => setDmYoutube(e.target.value)}
                placeholder="https://youtube.com/watch?v=... أو youtu.be/..."
                className="min-h-[42px] rounded-xl bg-white dark:bg-[#081712] border border-slate-200 dark:border-white/10 px-3.5 text-sm"
              />
              <input
                type="text"
                value={dmCategory}
                onChange={(e) => setDmCategory(e.target.value)}
                placeholder="التصنيف (مثال: القرآن والإيمان)"
                className="min-h-[42px] rounded-xl bg-white dark:bg-[#081712] border border-slate-200 dark:border-white/10 px-3.5 text-sm"
              />
              <select
                value={dmStatus}
                onChange={(e) => setDmStatus(e.target.value as 'published' | 'upcoming')}
                className="min-h-[42px] rounded-xl bg-white dark:bg-[#081712] border border-slate-200 dark:border-white/10 px-3.5 text-sm font-bold"
              >
                <option value="published">منشور الآن (مع مشغّل يوتيوب)</option>
                <option value="upcoming">قريباً (قيد التجهيز)</option>
              </select>
            </div>
            <textarea
              rows={2}
              value={dmDesc}
              onChange={(e) => setDmDesc(e.target.value)}
              placeholder="وصف بصري واضح وميسّر للمقطع..."
              className="w-full rounded-xl bg-white dark:bg-[#081712] border border-slate-200 dark:border-white/10 p-3 text-sm"
            />
            <textarea
              rows={2}
              value={dmBenefit}
              onChange={(e) => setDmBenefit(e.target.value)}
              placeholder="الفائدة المكتوبة أو الرسالة المرفقة بلغة واضحة (اختياري)..."
              className="w-full rounded-xl bg-white dark:bg-[#081712] border border-slate-200 dark:border-white/10 p-3 text-sm"
            />
            <button
              type="button"
              disabled={dmSaving}
              onClick={() => void handleSaveDeafMuteVideo()}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-[#006a46] hover:bg-[#005235] disabled:opacity-60 text-white text-xs font-extrabold flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{dmSaving ? 'جاري الحفظ...' : 'إضافة الفيديو لقسم الصم والبكم'}</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {deafMuteVideos.map((v) => (
              <div
                key={v.id}
                className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-[#fafcfb] dark:bg-[#081712] p-4 flex items-center justify-between gap-3"
              >
                <div className="min-w-0 space-y-1">
                  <span className="text-[11px] font-bold text-[#006a46] dark:text-[#6cdba6]">
                    {v.category} · {v.status === 'published' ? 'منشور' : 'قريباً'}
                  </span>
                  <h4 className="text-sm font-extrabold text-[#0e1d25] dark:text-white truncate">{v.title}</h4>
                  <p className="text-xs text-[#6e7a71] dark:text-slate-400 truncate">{v.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDeleteDeafMuteVideo(v.id)}
                  className="min-w-[38px] min-h-[38px] rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tab: Custom Adhkar & Library Cloud Books Manager */}
      {tab === 'adhkar-books' && (
        <div className="space-y-6">
          {/* Adhkar Manager */}
          <section className="rounded-3xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 shadow-xs space-y-4">
            <h2 className="text-lg font-extrabold text-[#0e1d25] dark:text-white">
              إضافة أذكار وأدعية مخصصة (محفوظة سحابياً)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select
                value={adhkarChapterId}
                onChange={(e) => setAdhkarChapterId(e.target.value)}
                className="min-h-[42px] rounded-xl bg-[#e8f6ff] dark:bg-[#112921] px-3 text-xs font-bold"
              >
                <option value="ch1_morning_evening">١. أذكار الصباح والمساء</option>
                <option value="ch2_wudu_prayer">٢. أذكار الوضوء والصلاة والمسجد</option>
                <option value="ch3_sleep_waking">٣. أذكار النوم والاستيقاظ</option>
                <option value="ch4_home_travel">٤. المنزل والسفر وتقلبات الطبيعة</option>
                <option value="ch5_food_social">٥. الطعام والآداب الاجتماعية</option>
                <option value="ch6_distress_ruqyah">٦. الكرب والرقية الشرعية</option>
                <option value="ch7_istighfar_tasbeeh">٧. جوامع الاستغفار والتسبيح</option>
                <option value="ch8_birr_wafaa">٨. وقفة بر ووفاء · الدعاء للوالدة</option>
              </select>
              <input
                type="text"
                value={adhkarTitle}
                onChange={(e) => setAdhkarTitle(e.target.value)}
                placeholder="عنوان الذكر (اختياري)"
                className="min-h-[42px] rounded-xl bg-[#e8f6ff] dark:bg-[#112921] px-3.5 text-sm"
              />
              <input
                type="number"
                min={1}
                max={1000}
                value={adhkarCount}
                onChange={(e) => setAdhkarCount(Math.max(1, Number(e.target.value) || 1))}
                placeholder="العدد"
                className="min-h-[42px] rounded-xl bg-[#e8f6ff] dark:bg-[#112921] px-3.5 text-sm"
              />
            </div>
            <textarea
              rows={3}
              value={adhkarText}
              onChange={(e) => setAdhkarText(e.target.value)}
              placeholder="نص الذكر أو الدعاء..."
              className="w-full rounded-xl bg-[#e8f6ff] dark:bg-[#112921] p-3.5 text-sm"
            />
            <input
              type="text"
              value={adhkarFadl}
              onChange={(e) => setAdhkarFadl(e.target.value)}
              placeholder="فضل الذكر أو التخريج الصحيح (اختياري)..."
              className="w-full min-h-[42px] rounded-xl bg-[#e8f6ff] dark:bg-[#112921] px-3.5 text-sm"
            />
            <button
              type="button"
              disabled={adhkarSaving}
              onClick={() => void handleSaveCustomAdhkar()}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-[#006a46] hover:bg-[#005235] text-white text-xs font-extrabold"
            >
              {adhkarSaving ? 'جاري الحفظ...' : '+ إضافة الذكر إلى الأذكار والأدعية الجامعة'}
            </button>

            {customAdhkar.length > 0 && (
              <div className="space-y-2 pt-2">
                {customAdhkar.map((d) => (
                  <div
                    key={d.id}
                    className="rounded-xl bg-[#f4faff] dark:bg-[#081712] p-3 flex items-center justify-between gap-2"
                  >
                    <p className="text-xs font-bold text-[#0e1d25] dark:text-white line-clamp-1">{d.text}</p>
                    <button
                      type="button"
                      onClick={() => void handleDeleteCustomAdhkar(d.id)}
                      className="text-rose-600 p-1.5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Cloud Library Books Manager */}
          <section className="rounded-3xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 shadow-xs space-y-4">
            <h2 className="text-lg font-extrabold text-[#0e1d25] dark:text-white">
              إضافة كتب ومراجع علمية سحابية للمكتبات
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                value={bookSection}
                onChange={(e) => setBookSection(e.target.value as CustomBookItem['section'])}
                className="min-h-[42px] rounded-xl bg-[#e8f6ff] dark:bg-[#112921] px-3 text-xs font-bold"
              >
                <option value="hajouri">مكتبة الشيخ يحيى بن علي الحجوري</option>
                <option value="imams">مكتبة الأئمة الكبار</option>
                <option value="students">مؤلفات مشايخ وطلاب الشيخ</option>
              </select>
              <input
                type="text"
                value={bookCategory}
                onChange={(e) => setBookCategory(e.target.value)}
                placeholder="التصنيف (مثال: العقيدة والمنهج)"
                className="min-h-[42px] rounded-xl bg-[#e8f6ff] dark:bg-[#112921] px-3.5 text-sm"
              />
              <input
                type="text"
                value={bookTitle}
                onChange={(e) => setBookTitle(e.target.value)}
                placeholder="اسم الكتاب أو الرسالة العلمية..."
                className="min-h-[42px] rounded-xl bg-[#e8f6ff] dark:bg-[#112921] px-3.5 text-sm"
              />
              <input
                type="text"
                value={bookAuthor}
                onChange={(e) => setBookAuthor(e.target.value)}
                placeholder="اسم المؤلف (من علماء أهل السنة المعتمدين)..."
                className="min-h-[42px] rounded-xl bg-[#e8f6ff] dark:bg-[#112921] px-3.5 text-sm"
              />
            </div>
            <input
              type="text"
              dir="ltr"
              value={bookPdfUrl}
              onChange={(e) => setBookPdfUrl(e.target.value)}
              placeholder="coming_soon أو رابط PDF مباشر"
              className="w-full min-h-[42px] rounded-xl bg-[#e8f6ff] dark:bg-[#112921] px-3.5 text-sm"
            />
            <textarea
              rows={2}
              value={bookSummary}
              onChange={(e) => setBookSummary(e.target.value)}
              placeholder="وصف مختصر لمحتوى الكتاب وفوائده..."
              className="w-full rounded-xl bg-[#e8f6ff] dark:bg-[#112921] p-3 text-sm"
            />
            <button
              type="button"
              disabled={bookSaving}
              onClick={() => void handleSaveCustomBook()}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-[#006a46] hover:bg-[#005235] text-white text-xs font-extrabold"
            >
              {bookSaving ? 'جاري الحفظ...' : '+ إضافة الكتاب إلى المكتبة السحابية'}
            </button>

            {customBooks.length > 0 && (
              <div className="space-y-2 pt-2">
                {customBooks.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-xl bg-[#f4faff] dark:bg-[#081712] p-3 flex items-center justify-between gap-2"
                  >
                    <div>
                      <p className="text-xs font-extrabold text-[#0e1d25] dark:text-white">{b.title}</p>
                      <span className="text-[11px] text-[#6e7a71] dark:text-slate-400">{b.author}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDeleteCustomBook(b.id)}
                      className="text-rose-600 p-1.5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Tab: Live Support Chat Inbox & Hidden Google Meet Controls */}
      {tab === 'live-support' && (
        <div className="space-y-6">
          {/* Hidden Google Meet Configuration */}
          <section className="rounded-3xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold text-[#0e1d25] dark:text-white flex items-center gap-2">
                  <Video className="w-5 h-5 text-[#006a46] dark:text-[#6cdba6]" />
                  <span>إعدادات Google Meet المخفية (للصم والبكم والمقابلات)</span>
                </h2>
                <p className="text-xs text-[#6e7a71] dark:text-slate-400 mt-0.5">
                  تبقى غرفة Google Meet مخفية تماماً عن عامة المشتركين ما لم يُختر إظهارها للجميع، أو تُرسل كدعوة خاصة داخل جلسة الصم والبكم أو المقابلات.
                </p>
                <p className="text-[11px] font-bold text-[#006a46] dark:text-[#6cdba6] mt-1">
                  الحساب المعتمد لاستضافة Meet:{' '}
                  <span dir="ltr">{meetConnectedEmail || DEFAULT_MEET_HOST_EMAIL}</span>
                  {meetOAuthConnected &&
                    meetConnectedEmail &&
                    meetConnectedEmail.toLowerCase() !== DEFAULT_MEET_HOST_EMAIL && (
                      <button
                        type="button"
                        onClick={() => void handleConnectGoogleMeet()}
                        className="ms-2 underline text-amber-700 dark:text-amber-300"
                      >
                        تبديل إلى {DEFAULT_MEET_HOST_EMAIL}
                      </button>
                    )}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {!meetOAuthConnected ? (
                  <button
                    type="button"
                    disabled={meetConnecting}
                    onClick={() => void handleConnectGoogleMeet()}
                    className="min-h-[42px] px-4 py-2 rounded-xl bg-white dark:bg-[#112921] border border-slate-300 dark:border-white/20 text-[#1f1f1f] dark:text-white text-xs font-bold flex items-center gap-2.5 shadow-xs hover:bg-slate-50 dark:hover:bg-[#17362b] transition-colors"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                      />
                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                      />
                    </svg>
                    <span>
                      {meetConnecting
                        ? 'جاري الربط...'
                        : `Sign in with Google · ربط ${DEFAULT_MEET_HOST_EMAIL}`}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={creatingMeetRoom}
                    onClick={() => void handleCreateMeetSpace('default')}
                    className="min-h-[42px] px-4 py-2 rounded-xl bg-[#006389] hover:bg-[#005272] text-white text-xs font-extrabold flex items-center gap-1.5 transition-colors"
                  >
                    <Video className="w-4 h-4 shrink-0" />
                    <span>{creatingMeetRoom ? 'جاري الإنشاء...' : 'إنشاء غرفة Google Meet تلقائياً'}</span>
                  </button>
                )}
                <button
                  type="button"
                  disabled={savingMeetCfg}
                  onClick={() => void handleSaveMeetVisibilityConfig()}
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-[#006a46] text-white text-xs font-extrabold"
                >
                  {savingMeetCfg ? 'جاري الحفظ...' : 'حفظ إعدادات Meet'}
                </button>
              </div>
            </div>

            {confirmReplaceMeetRoom && (
              <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/35 border border-amber-500/40 p-3.5 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  يوجد رابط غرفة Google Meet محفوظ حالياً. هل تريد إنشاء غرفة جديدة واستبدال الرابط الافتراضي؟
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleCreateMeetSpace('default', true)}
                    className="min-h-[34px] px-3 rounded-lg bg-amber-700 text-white text-xs font-extrabold"
                  >
                    تأكيد إنشاء غرفة جديدة
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReplaceMeetRoom(false)}
                    className="min-h-[34px] px-3 rounded-lg bg-white dark:bg-[#0d211a] text-xs font-bold border border-slate-200 dark:border-white/15"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="space-y-1 block">
                <span className="text-xs font-bold text-[#3e4a42] dark:text-slate-300">حالة الظهور للمشتركين</span>
                <select
                  value={editMeetConfig.visibility}
                  onChange={(e) =>
                    setEditMeetConfig((prev) => ({
                      ...prev,
                      visibility: e.target.value as MeetVisibilityMode,
                    }))
                  }
                  className="w-full min-h-[42px] rounded-xl bg-[#e8f6ff] dark:bg-[#112921] px-3 text-xs font-bold"
                >
                  <option value="hidden_admin_only">مخفي عن المشتركين (للمشرفين والدعوات الخاصة فقط)</option>
                  <option value="deaf_mute_invited">متاح لدعوات فئة الصم والبكم والمقابلات</option>
                  <option value="all_subscribers">مدمج ومفتوح لجميع المشتركين</option>
                </select>
              </label>

              <label className="space-y-1 block">
                <span className="text-xs font-bold text-[#3e4a42] dark:text-slate-300">رابط غرفة Google Meet الافتراضي</span>
                <input
                  type="url"
                  dir="ltr"
                  value={editMeetConfig.activeRoomUrl}
                  onChange={(e) =>
                    setEditMeetConfig((prev) => ({...prev, activeRoomUrl: e.target.value}))
                  }
                  placeholder="https://meet.google.com/xxx-xxxx-xxx"
                  className="w-full min-h-[42px] rounded-xl bg-[#e8f6ff] dark:bg-[#112921] px-3.5 text-sm"
                />
              </label>
            </div>
          </section>

          {/* Live WebSocket Sessions */}
          <section className="rounded-3xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 shadow-xs space-y-4">
            <h2 className="text-base sm:text-lg font-extrabold text-[#0e1d25] dark:text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-[#006a46] dark:text-[#6cdba6]" />
              <span>جلسات الدردشة الحية المباشرة ({liveSessions.length.toLocaleString('ar-EG')})</span>
            </h2>

            {liveSessions.length === 0 ? (
              <p className="text-xs text-[#6e7a71] dark:text-slate-400">
                لا توجد جلسات دردشة نشطة الآن. ستظهر هنا فوراً عند مراسلة أي زائر أو مستفيد من قسم الصم والبكم أو متقدم للمقابلة.
              </p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-4 space-y-2 max-h-[380px] overflow-y-auto">
                  {liveSessions.map((sess) => {
                    const active = (selectedSessionId || liveSessions[0]?.id) === sess.id;
                    return (
                      <button
                        key={sess.id}
                        type="button"
                        onClick={() => setSelectedSessionId(sess.id)}
                        className={`w-full text-start rounded-2xl p-3 border transition-colors ${
                          active
                            ? 'bg-[#006a46] text-white border-[#006a46]'
                            : 'bg-[#f4faff] dark:bg-[#112921] border-slate-200/70 dark:border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-xs font-extrabold">
                          <span className="truncate">{sess.visitorName}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-black/15">
                            {sess.topic === 'deaf_mute'
                              ? 'الصم والبكم'
                              : sess.topic === 'interview'
                                ? 'مقابلة'
                                : 'تواصل مباشر'}
                          </span>
                        </div>
                        <p className="text-[11px] opacity-80 truncate mt-1">
                          {sess.messages[sess.messages.length - 1]?.text || 'بانتظار الرسالة...'}
                        </p>
                      </button>
                    );
                  })}
                </div>

                <div className="lg:col-span-8 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-[#f8fbf9] dark:bg-[#081712] p-4 space-y-3">
                  {(() => {
                    const currentSess =
                      liveSessions.find((s) => s.id === (selectedSessionId || liveSessions[0]?.id)) ||
                      liveSessions[0];
                    if (!currentSess) return null;
                    return (
                      <>
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 dark:border-white/10 pb-2.5">
                          <span className="text-sm font-extrabold text-[#0e1d25] dark:text-white">
                            {currentSess.visitorName} ({currentSess.id})
                          </span>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <input
                              type="url"
                              dir="ltr"
                              value={customMeetInviteUrl}
                              onChange={(e) => setCustomMeetInviteUrl(e.target.value)}
                              placeholder={editMeetConfig.activeRoomUrl || 'https://meet.google.com/...'}
                              className="min-h-[34px] rounded-lg bg-white dark:bg-[#0d211a] border border-slate-200 dark:border-white/10 px-2.5 text-xs w-44"
                            />
                            {meetOAuthConnected && (
                              <button
                                type="button"
                                disabled={creatingMeetRoom}
                                onClick={() => void handleCreateMeetSpace('session', true)}
                                className="min-h-[34px] px-2.5 rounded-lg bg-[#006389] text-white text-[11px] font-bold flex items-center gap-1 shrink-0"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>توليد غرفة جديدة</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => sendPrivateMeetInviteToSession(currentSess.id)}
                              className="min-h-[34px] px-3 rounded-lg bg-[#7c5800] text-white text-[11px] font-bold flex items-center gap-1 shrink-0"
                            >
                              <Video className="w-3.5 h-3.5" />
                              <span>إرسال دعوة Meet خاصة</span>
                            </button>
                          </div>
                        </div>

                        <div className="h-[220px] overflow-y-auto space-y-2 p-2">
                          {currentSess.messages.map((m) => (
                            <div
                              key={m.id}
                              className={`flex ${m.senderRole === 'admin' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${
                                  m.senderRole === 'admin'
                                    ? 'bg-[#006a46] text-white'
                                    : 'bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10'
                                }`}
                              >
                                <span className="block text-[10px] font-bold opacity-80">{m.senderName}</span>
                                <p>{m.text}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={liveReplyText}
                            onChange={(e) => setLiveReplyText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                sendAdminLiveReply(currentSess.id);
                              }
                            }}
                            placeholder="اكتب رد المشرف المباشر..."
                            className="flex-1 min-h-[40px] rounded-xl bg-white dark:bg-[#0d211a] border border-slate-200 dark:border-white/10 px-3 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => sendAdminLiveReply(currentSess.id)}
                            className="min-h-[40px] px-4 rounded-xl bg-[#006a46] text-white text-xs font-bold"
                          >
                            إرسال الرد
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </section>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}
