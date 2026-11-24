import {
  Archive,
  ArrowRight,
  BellRing,
  CheckCircle2,
  ExternalLink,
  Eye,
  Feather,
  Flower2,
  Globe,
  HandHeart,
  Home as HomeIcon,
  Image as ImageIcon,
  Lock,
  LogOut,
  Megaphone,
  Menu,
  Monitor,
  Moon,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Sparkles,
  Star,
  Sun,
  UserCheck,
  Users,
  Video,
  WifiOff,
  Wrench,
  X,
} from 'lucide-react';
import {lazy, Suspense, useCallback, useEffect, useRef, useState, type FormEvent} from 'react';
import type {AdminStudioTab} from './components/AdminStudioView';
import {AIChatWidget} from './components/AIChatWidget';
import {AppSettingsModal, type AppSettingsSection} from './components/AppSettingsModal';
import {BrandEmblem, resolveIcon} from './components/BrandEmblem';
import {CardShareModal} from './components/CardShareModal';
import {HomeView} from './components/HomeView';
import {PWAInstallButton, useOnlineStatus} from './components/PWAInstallButton';
import {SiteFooter} from './components/SiteFooter';
import {SplashScreen} from './components/SplashScreen';
import {VisitorAuthModal} from './components/VisitorAuthModal';
import {INITIAL_DEAF_MUTE_VIDEOS, mergeCloudAndLocalById} from './data/contentRepository';
import {exportAdhkarLifetimePayload} from './utils/adhkarStats';
import {
  fetchAllCloudCollections,
  isTrustedAdminUser,
  observeFirebaseAdminAuth,
  subscribeCloudCollections,
} from './utils/cloudSync';
import {EXTERNAL_PORTAL_OPEN_EVENT, type ExternalPortalPayload} from './utils/externalPortal';
import {useI18n} from './utils/i18n';
import {useLiveStats} from './utils/liveStats';
import {
  type AdhkarReminderSettings,
  checkAndTriggerScheduledReminders,
  loadReminderSettings,
  saveReminderSettings,
} from './utils/notifications';
import {
  DEFAULT_FONT_SIZE_PX,
  MAX_FONT_SIZE_PX,
  MIN_FONT_SIZE_PX,
  useReadingPrefs,
} from './utils/readingPrefs';
import {
  sendPresenceHeartbeat,
  sendPresenceLeave,
  trackInteraction,
  trackVisitorSession,
} from './utils/telemetry';
import {
  DEFAULT_APP_ICONS,
  DEFAULT_SITE_CONFIG,
  INITIAL_FATAWA,
  INITIAL_MOTHER_OASIS_ITEMS,
  INITIAL_POSTS,
  INITIAL_TELEGRAM_AUDIOS,
  INITIAL_TWITTER_QUOTES,
  INITIAL_YOUTUBE_VIDEOS,
} from './data/seed';
import type {
  AdminGesture,
  AdminMeetConfig,
  AdminRole,
  AdminSectionScope,
  AppIcons,
  AutomationSettings,
  CustomAdhkarItem,
  CustomBookItem,
  DeafMuteVideoItem,
  FatwaItem,
  LibraryFilterType,
  MotherOasisItem,
  NafahatMeta,
  NavTab,
  PermanentArchiveItem,
  PoetryAnecdoteItem,
  Post,
  SavedArchiveFatwa,
  SiteAppearanceConfig,
  SiteConfig,
  SocialLink,
  SuggestionItem,
  TelegramAudioItem,
  ThemeMode,
  TwitterQuoteItem,
  VisitorProfile,
  VisitorReviewItem,
  VolunteerItem,
  YouTubeVideoItem,
} from './types';
import {getPublicSiteUrl, loadSnapshot, saveSnapshot} from './utils/storage';

const AboutSupportShareView = lazy(() =>
  import('./components/AboutSupportShareView').then((m) => ({default: m.AboutSupportShareView})),
);
const AdhkarView = lazy(() =>
  import('./components/AdhkarView').then((m) => ({default: m.AdhkarView})),
);
const AdminStudioView = lazy(() =>
  import('./components/AdminStudioView').then((m) => ({default: m.AdminStudioView})),
);
const BookmarksView = lazy(() =>
  import('./components/BookmarksView').then((m) => ({default: m.BookmarksView})),
);
const ChannelsView = lazy(() =>
  import('./components/ChannelsView').then((m) => ({default: m.ChannelsView})),
);
const DailyWirdView = lazy(() =>
  import('./components/DailyWirdView').then((m) => ({default: m.DailyWirdView})),
);
const DawahCardsView = lazy(() =>
  import('./components/DawahCardsView').then((m) => ({default: m.DawahCardsView})),
);
const DeafMuteView = lazy(() =>
  import('./components/DeafMuteView').then((m) => ({default: m.DeafMuteView})),
);
const FatawaView = lazy(() =>
  import('./components/FatawaView').then((m) => ({default: m.FatawaView})),
);
const LibraryView = lazy(() =>
  import('./components/LibraryView').then((m) => ({default: m.LibraryView})),
);
const MotherOasisView = lazy(() =>
  import('./components/MotherOasisView').then((m) => ({default: m.MotherOasisView})),
);
const PoetryOasisView = lazy(() =>
  import('./components/PoetryOasisView').then((m) => ({default: m.PoetryOasisView})),
);
const PostDetailView = lazy(() =>
  import('./components/PostDetailView').then((m) => ({default: m.PostDetailView})),
);
const QuranView = lazy(() =>
  import('./components/QuranView').then((m) => ({default: m.QuranView})),
);
const ReviewsView = lazy(() =>
  import('./components/ReviewsView').then((m) => ({default: m.ReviewsView})),
);

const BOOKMARKS_KEY = 'mawaedh_bookmarks_v1';
const FATWA_BOOKMARKS_KEY = 'mawaedh_fatwa_bookmarks_v1';
const ARCHIVE_FATWA_BOOKMARKS_KEY = 'mawaedh_archive_fatwa_bookmarks_v1';
const LIKES_KEY = 'mawaedh_likes_v1';
const THEME_KEY = 'mawaedh_theme_v1';
const AMEN_KEY = 'mawaedh_amen_v1';
const MEDIA_CACHE_KEY = 'mawaedh_media_feeds_v1';
const SPLASH_SEEN_KEY = 'mawaedh_seen_splash';
const VISITOR_PROFILE_KEY = 'mawaedh_visitor_profile_v1';
const ADMIN_SESSION_KEY = 'mawaedh_admin_session_v1';

const DEFAULT_SITE_APPEARANCE: SiteAppearanceConfig = {
  backgroundPreset: 'default',
  brightness: 100,
  announcementEnabled: false,
  announcementText: '',
  announcementUrl: '',
  maintenanceMode: false,
};

const DEFAULT_AUTOMATION_SETTINGS: AutomationSettings = {
  autoPostWebhookUrl: '',
  enabledPlatforms: {facebook: true, whatsapp: true, x: true},
  adminNotifyWebhookUrl: '',
  telegramBotToken: '',
  telegramChatId: '',
  emailJsServiceId: '',
  emailJsTemplateId: '',
  emailJsPublicKey: '',
};

function loadStoredAdminSession(): {
  token: string;
  username: string;
  role: AdminRole;
  assignedSection?: AdminSectionScope;
} | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      token?: string;
      username?: string;
      role?: AdminRole;
      assignedSection?: AdminSectionScope;
    };
    if (parsed.token && parsed.username) {
      return {
        token: parsed.token,
        username: parsed.username,
        role:
          parsed.role === 'admin'
            ? 'admin'
            : parsed.role === 'supervisor'
              ? 'supervisor'
              : 'editor',
        assignedSection: parsed.assignedSection || 'all',
      };
    }
    return null;
  } catch {
    return null;
  }
}

interface CachedMediaFeeds {
  youtubeVideos: YouTubeVideoItem[];
  telegramAudios: TelegramAudioItem[];
  twitterQuotes: TwitterQuoteItem[];
}

function loadCachedMediaFeeds(): CachedMediaFeeds {
  if (typeof window === 'undefined') {
    return {
      youtubeVideos: INITIAL_YOUTUBE_VIDEOS,
      telegramAudios: INITIAL_TELEGRAM_AUDIOS,
      twitterQuotes: INITIAL_TWITTER_QUOTES,
    };
  }
  try {
    const raw = window.localStorage.getItem(MEDIA_CACHE_KEY);
    if (!raw) {
      return {
        youtubeVideos: INITIAL_YOUTUBE_VIDEOS,
        telegramAudios: INITIAL_TELEGRAM_AUDIOS,
        twitterQuotes: INITIAL_TWITTER_QUOTES,
      };
    }
    const parsed = JSON.parse(raw) as Partial<CachedMediaFeeds>;
    return {
      youtubeVideos:
        Array.isArray(parsed.youtubeVideos) && parsed.youtubeVideos.length > 0
          ? parsed.youtubeVideos
          : INITIAL_YOUTUBE_VIDEOS,
      telegramAudios:
        Array.isArray(parsed.telegramAudios) && parsed.telegramAudios.length > 0
          ? parsed.telegramAudios
          : INITIAL_TELEGRAM_AUDIOS,
      twitterQuotes:
        Array.isArray(parsed.twitterQuotes) && parsed.twitterQuotes.length > 0
          ? parsed.twitterQuotes.map((q) =>
              q.handle === '@ax1ax70' || q.url.includes('twitter.com/ax1ax70') || q.url.includes('x.com/ax1ax70')
                ? {...q, handle: '@ax1ax71', url: 'https://x.com/ax1ax71'}
                : q,
            )
          : INITIAL_TWITTER_QUOTES,
    };
  } catch {
    return {
      youtubeVideos: INITIAL_YOUTUBE_VIDEOS,
      telegramAudios: INITIAL_TELEGRAM_AUDIOS,
      twitterQuotes: INITIAL_TWITTER_QUOTES,
    };
  }
}

function getInitialPostId(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const p = params.get('post')?.trim();
  return p || null;
}

function getInitialTab(): NavTab {
  if (typeof window === 'undefined') return 'splash';
  const params = new URLSearchParams(window.location.search);
  const tabParam = params.get('tab');
  const postParam = params.get('post')?.trim();
  if (tabParam === 'post-detail' && postParam) {
    return 'post-detail';
  }
  if (tabParam === 'hisn') {
    return 'adhkar';
  }
  if (tabParam === 'about' || tabParam === 'support' || tabParam === 'about-support') {
    return 'about-support';
  }
  if (
    tabParam === 'home' ||
    tabParam === 'quran' ||
    tabParam === 'wird' ||
    tabParam === 'fatawa' ||
    tabParam === 'adhkar' ||
    tabParam === 'library' ||
    tabParam === 'cards' ||
    tabParam === 'mother-oasis' ||
    tabParam === 'poetry' ||
    tabParam === 'archive' ||
    tabParam === 'reviews' ||
    tabParam === 'videos' ||
    tabParam === 'deaf-mute' ||
    tabParam === 'channels' ||
    tabParam === 'bookmarks'
  ) {
    return tabParam;
  }
  if (postParam) {
    return 'post-detail';
  }
  try {
    if (window.sessionStorage.getItem(SPLASH_SEEN_KEY) === '1') {
      return 'home';
    }
  } catch {
    // Ignore
  }
  return 'splash';
}

export default function App() {
  const {isEn, toggleLang, tr, formatNumber} = useI18n();
  const {activeFontSizePx, setCustomFontSizePx, stepFontSize} = useReadingPrefs();
  const {recordView} = useLiveStats();
  const [initialSnapshot] = useState(() => loadSnapshot());
  const [initialMedia] = useState(() => loadCachedMediaFeeds());
  const [storedAdmin] = useState(() => loadStoredAdminSession());
  const isOnline = useOnlineStatus();

  const [activeTab, setActiveTab] = useState<NavTab>(() => getInitialTab());
  const [prevTab, setPrevTab] = useState<NavTab>('home');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(() => getInitialPostId());
  const [quranInitialPage, setQuranInitialPage] = useState<number | undefined>(undefined);
  const [libraryInitialFilter, setLibraryInitialFilter] = useState<LibraryFilterType>('all');

  const [posts, setPosts] = useState<Post[]>(() => initialSnapshot.posts);
  const [fatawa, setFatawa] = useState<FatwaItem[]>(() => initialSnapshot.fatawa);
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(() => initialSnapshot.siteConfig);
  const [isOfflineMode, setIsOfflineMode] = useState(() => !isOnline);
  const [cachedAt, setCachedAt] = useState(() => initialSnapshot.cachedAt);
  const [isSyncing, setIsSyncing] = useState(false);
  const [visitorsCount, setVisitorsCount] = useState(() => initialSnapshot.visitorsCount ?? 0);
  const [onlineVisitorsCount, setOnlineVisitorsCount] = useState(() =>
    Math.max(initialSnapshot.onlineVisitorsCount ?? 1, 1),
  );
  const [clicksCount, setClicksCount] = useState(() => initialSnapshot.clicksCount ?? 0);
  const [nafahatMeta, setNafahatMeta] = useState<NafahatMeta | undefined>(() => initialSnapshot.nafahatMeta);

  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(BOOKMARKS_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  const [bookmarkedFatwaIds, setBookmarkedFatwaIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(FATWA_BOOKMARKS_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  const [savedArchiveFatawa, setSavedArchiveFatawa] = useState<SavedArchiveFatwa[]>(() => {
    try {
      const raw = localStorage.getItem(ARCHIVE_FATWA_BOOKMARKS_KEY);
      return raw ? (JSON.parse(raw) as SavedArchiveFatwa[]) : [];
    } catch {
      return [];
    }
  });

  const [likedIds, setLikedIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(LIKES_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    try {
      const raw = localStorage.getItem(THEME_KEY);
      return raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'light';
    } catch {
      return 'light';
    }
  });

  const [systemPrefersDark, setSystemPrefersDark] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const isDark = themeMode === 'dark' || (themeMode === 'system' && systemPrefersDark);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const [shareModalPost, setShareModalPost] = useState<Post | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [settingsInitialSection, setSettingsInitialSection] = useState<AppSettingsSection>('settings');
  const openSettingsModal = (section: AppSettingsSection = 'settings') => {
    setSettingsInitialSection(section);
    setSettingsModalOpen(true);
  };
  const [adhkarInitialSection, setAdhkarInitialSection] = useState<'adhkar' | 'hisn'>(() => {
    if (typeof window === 'undefined') return 'adhkar';
    const tabParam = new URLSearchParams(window.location.search).get('tab');
    return tabParam === 'hisn' ? 'hisn' : 'adhkar';
  });
  const [reminderSettings, setReminderSettings] = useState<AdhkarReminderSettings>(() =>
    loadReminderSettings(),
  );

  const [motherPrayersCount, setMotherPrayersCount] = useState(() => initialSnapshot.motherPrayersCount);
  const [hasSaidAmen, setHasSaidAmen] = useState(() => {
    try {
      return localStorage.getItem(AMEN_KEY) === '1';
    } catch {
      return false;
    }
  });

  const [youtubeVideos, setYoutubeVideos] = useState<YouTubeVideoItem[]>(() => initialMedia.youtubeVideos);
  const [telegramAudios, setTelegramAudios] = useState<TelegramAudioItem[]>(() => initialMedia.telegramAudios);
  const [twitterQuotes, setTwitterQuotes] = useState<TwitterQuoteItem[]>(() => initialMedia.twitterQuotes);
  const [isRefreshingFeeds, setIsRefreshingFeeds] = useState(false);

  // Hidden Role-Based Admin / Editor Auth State (completely hidden from general visitors)
  // Persistent Admin Session: stays active across reloads until manual logout
  const [gesture, setGesture] = useState<AdminGesture>(() => initialSnapshot.gesture);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [verifyingLogin, setVerifyingLogin] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(() => storedAdmin?.token || null);
  const [adminRole, setAdminRole] = useState<AdminRole>(() => storedAdmin?.role || 'editor');
  const [adminUsername, setAdminUsername] = useState(() => storedAdmin?.username || '');
  const [assignedSection, setAssignedSection] = useState<AdminSectionScope>(
    () => storedAdmin?.assignedSection || 'all',
  );
  const [adminInitialTab, setAdminInitialTab] = useState<AdminStudioTab>('studio');
  const [editingPostForAdmin, setEditingPostForAdmin] = useState<Post | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [volunteers, setVolunteers] = useState<VolunteerItem[]>([]);
  const [automationSettings, setAutomationSettings] = useState<AutomationSettings>(DEFAULT_AUTOMATION_SETTINGS);
  const [siteAppearance, setSiteAppearance] = useState<SiteAppearanceConfig>(
    () => initialSnapshot.siteAppearance || DEFAULT_SITE_APPEARANCE,
  );
  const [poetryItems, setPoetryItems] = useState<PoetryAnecdoteItem[]>(
    () => initialSnapshot.poetryItems || [],
  );
  const [permanentArchive, setPermanentArchive] = useState<PermanentArchiveItem[]>(
    () => initialSnapshot.permanentArchive || [],
  );
  const [visitorReviews, setVisitorReviews] = useState<VisitorReviewItem[]>(
    () => initialSnapshot.visitorReviews || [],
  );
  const [motherOasisItems, setMotherOasisItems] = useState<MotherOasisItem[]>(
    () => initialSnapshot.motherOasisItems || [],
  );
  const [deafMuteVideos, setDeafMuteVideos] = useState<DeafMuteVideoItem[]>(
    () => initialSnapshot.deafMuteVideos || INITIAL_DEAF_MUTE_VIDEOS,
  );
  const [customAdhkar, setCustomAdhkar] = useState<CustomAdhkarItem[]>(
    () => initialSnapshot.customAdhkar || [],
  );
  const [customBooks, setCustomBooks] = useState<CustomBookItem[]>(
    () => initialSnapshot.customBooks || [],
  );
  const [meetConfig, setMeetConfig] = useState<AdminMeetConfig>({
    visibility: 'hidden_admin_only',
    activeRoomUrl: '',
  });
  const [isFirebaseAdmin, setIsFirebaseAdmin] = useState(false);
  const [aboutSubTab, setAboutSubTab] = useState<'about' | 'support' | 'share' | 'disclaimer'>(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('tab') === 'support') {
      return 'support';
    }
    return 'about';
  });
  const [externalPortal, setExternalPortal] = useState<ExternalPortalPayload | null>(null);
  const [visitorProfile, setVisitorProfile] = useState<VisitorProfile | null>(() => {
    try {
      const raw = window.localStorage.getItem(VISITOR_PROFILE_KEY);
      return raw ? (JSON.parse(raw) as VisitorProfile) : null;
    } catch {
      return null;
    }
  });
  const [visitorAuthModalOpen, setVisitorAuthModalOpen] = useState(false);

  const [brandHandle, setBrandHandle] = useState(() => initialSnapshot.brandHandle);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(() => initialSnapshot.socialLinks);
  const [appIcons, setAppIcons] = useState<AppIcons>(() => initialSnapshot.appIcons);

  const longPressTimerRef = useRef<number | null>(null);
  const tapTrackerRef = useRef<{count: number; lastTs: number}>({count: 0, lastTs: 0});
  const prevOnlineRef = useRef(isOnline);
  const dailyNafahatSyncedRef = useRef(false);
  const lastClickTrackedAtRef = useRef(0);

  const finishSplash = useCallback(() => {
    try {
      window.sessionStorage.setItem(SPLASH_SEEN_KEY, '1');
    } catch {
      // Ignore
    }
    setActiveTab('home');
  }, []);

  // System dark mode listener
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemPrefersDark(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Apply dark class to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) root.classList.add('dark');
    else root.classList.remove('dark');
    try {
      localStorage.setItem(THEME_KEY, themeMode);
    } catch {
      // Ignore
    }
  }, [isDark, themeMode]);

  useEffect(() => {
    try {
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarkedIds));
    } catch {
      // Ignore
    }
  }, [bookmarkedIds]);

  useEffect(() => {
    try {
      localStorage.setItem(FATWA_BOOKMARKS_KEY, JSON.stringify(bookmarkedFatwaIds));
    } catch {
      // Ignore
    }
  }, [bookmarkedFatwaIds]);

  useEffect(() => {
    try {
      localStorage.setItem(ARCHIVE_FATWA_BOOKMARKS_KEY, JSON.stringify(savedArchiveFatawa));
    } catch {
      // Ignore
    }
  }, [savedArchiveFatawa]);

  useEffect(() => {
    try {
      localStorage.setItem(LIKES_KEY, JSON.stringify(likedIds));
    } catch {
      // Ignore
    }
  }, [likedIds]);

  const notify = useCallback((msg: string) => {
    setToastMsg(msg);
  }, []);

  useEffect(() => {
    if (!toastMsg) return;
    const t = window.setTimeout(() => setToastMsg(null), 3400);
    return () => window.clearTimeout(t);
  }, [toastMsg]);

  const updateReminderSettings = useCallback((next: AdhkarReminderSettings) => {
    setReminderSettings(next);
    saveReminderSettings(next);
  }, []);

  useEffect(() => {
    const runCheck = () => {
      void checkAndTriggerScheduledReminders({
        settings: reminderSettings,
        isEn,
        appName: isEn ? 'Mawaedh & Ibar' : siteConfig.appName,
        onUpdateSettings: updateReminderSettings,
        onOpenAdhkar: () => {
          setAdhkarInitialSection('adhkar');
          setActiveTab('adhkar');
        },
        onInAppNotify: notify,
      });
    };

    runCheck();
    const intervalId = window.setInterval(runCheck, 30_000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') runCheck();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [reminderSettings, isEn, siteConfig.appName, updateReminderSettings, notify]);

  // Intercept external <a> clicks + custom portal events so visitors always keep a return/home bar
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onOpenPortal = (e: Event) => {
      const ce = e as CustomEvent<ExternalPortalPayload>;
      if (ce.detail?.url) {
        setExternalPortal(ce.detail);
      }
    };
    const onCaptureAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      if (
        anchor.hasAttribute('download') ||
        anchor.dataset.directExternal === 'true' ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }
      const rawHref = anchor.getAttribute('href') || '';
      if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) {
        return;
      }
      try {
        const parsed = new URL(anchor.href, window.location.href);
        if (parsed.origin === window.location.origin) return;
        const lower = parsed.href.toLowerCase();
        if (
          lower.includes('wa.me/') ||
          lower.includes('api.whatsapp.com/') ||
          lower.includes('x.com/intent/') ||
          lower.includes('twitter.com/intent/')
        ) {
          return;
        }
        e.preventDefault();
        setExternalPortal({
          url: parsed.href,
          title: anchor.textContent?.trim() || parsed.hostname,
        });
      } catch {
        // Ignore invalid URLs
      }
    };
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      const nextTab = getInitialTab();
      const postParam = params.get('post')?.trim() || null;
      setSelectedPostId(postParam);
      if (nextTab !== 'splash') {
        setActiveTab(nextTab);
      }
    };
    window.addEventListener(EXTERNAL_PORTAL_OPEN_EVENT, onOpenPortal);
    document.addEventListener('click', onCaptureAnchorClick, true);
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener(EXTERNAL_PORTAL_OPEN_EVENT, onOpenPortal);
      document.removeEventListener('click', onCaptureAnchorClick, true);
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  // Keep browser URL live-updated on navigation and deep-link post opens
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (activeTab === 'splash' || activeTab === 'admin-studio') return;
    try {
      const url = new URL(window.location.href);
      const currentUrlTab = url.searchParams.get('tab');
      const currentUrlPost = url.searchParams.get('post');
      url.searchParams.set('tab', activeTab);
      if (activeTab === 'post-detail' && selectedPostId) {
        url.searchParams.set('post', selectedPostId);
      } else {
        url.searchParams.delete('post');
      }
      if (currentUrlTab !== activeTab || (activeTab === 'post-detail' && currentUrlPost !== selectedPostId)) {
        window.history.pushState({tab: activeTab}, '', `${url.pathname}${url.search}${url.hash}`);
      } else {
        window.history.replaceState({tab: activeTab}, '', `${url.pathname}${url.search}${url.hash}`);
      }
    } catch {
      // Ignore history restriction
    }
  }, [activeTab, selectedPostId]);

  // Register unique browser session visit once and track interactive UI clicks
  useEffect(() => {
    let active = true;
    const applyPresencePayload = (
      res: {visitorsCount?: number; clicksCount?: number; onlineVisitorsCount?: number} | null,
    ) => {
      if (!active || !res) return;
      if (typeof res.visitorsCount === 'number') setVisitorsCount(res.visitorsCount);
      if (typeof res.clicksCount === 'number') setClicksCount(res.clicksCount);
      if (typeof res.onlineVisitorsCount === 'number') {
        setOnlineVisitorsCount(Math.max(1, res.onlineVisitorsCount));
      }
    };

    void trackVisitorSession().then(applyPresencePayload);

    const pulseId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void sendPresenceHeartbeat().then(applyPresencePayload);
      }
    }, 30_000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void sendPresenceHeartbeat().then(applyPresencePayload);
      }
    };

    const handlePageHide = () => {
      sendPresenceLeave();
    };

    const handleGlobalClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (!target.closest('button, a, [role="button"]')) return;
      const now = Date.now();
      if (now - lastClickTrackedAtRef.current < 1200) return;
      lastClickTrackedAtRef.current = now;
      setClicksCount((c) => c + 1);
      trackInteraction('click');
    };

    document.addEventListener('click', handleGlobalClick, {passive: true});
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      active = false;
      window.clearInterval(pulseId);
      document.removeEventListener('click', handleGlobalClick);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, []);

  useEffect(() => {
    saveSnapshot({
      posts,
      fatawa,
      socialLinks,
      appIcons,
      siteConfig,
      brandHandle,
      motherPrayersCount,
      visitorsCount,
      onlineVisitorsCount,
      clicksCount,
      nafahatMeta,
      poetryItems,
      permanentArchive,
      motherOasisItems,
      deafMuteVideos,
      customAdhkar,
      customBooks,
      visitorReviews,
      siteAppearance,
      gesture,
      cachedAt,
    });
  }, [
    posts,
    fatawa,
    socialLinks,
    appIcons,
    siteConfig,
    brandHandle,
    motherPrayersCount,
    visitorsCount,
    onlineVisitorsCount,
    clicksCount,
    nafahatMeta,
    poetryItems,
    permanentArchive,
    motherOasisItems,
    deafMuteVideos,
    customAdhkar,
    customBooks,
    visitorReviews,
    siteAppearance,
    gesture,
    cachedAt,
  ]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        MEDIA_CACHE_KEY,
        JSON.stringify({youtubeVideos, telegramAudios, twitterQuotes}),
      );
    } catch {
      // Ignore storage quota
    }
  }, [youtubeVideos, telegramAudios, twitterQuotes]);

  const getLocalDateKey = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const lastSyncDayRef = useRef<string>(getLocalDateKey());

  const syncDailyNafahatIfNeeded = useCallback(async (meta?: NafahatMeta) => {
    if (dailyNafahatSyncedRef.current) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    const todayKey = getLocalDateKey();
    if (meta?.lastUpdatedDate === todayKey) {
      dailyNafahatSyncedRef.current = true;
      return;
    }
    dailyNafahatSyncedRef.current = true;
    try {
      const res = await fetch('/api/nafahat/daily-sync', {method: 'POST'});
      if (!res.ok) return;
      const data = (await res.json()) as {
        updated?: boolean;
        siteConfig?: SiteConfig;
        post?: Post;
        posts?: Post[];
        nafahatMeta?: NafahatMeta;
      };
      if (data.siteConfig) {
        setSiteConfig({...DEFAULT_SITE_CONFIG, ...data.siteConfig});
      }
      if (Array.isArray(data.posts) && data.posts.length > 0) {
        setPosts(data.posts);
      } else if (data.post) {
        setPosts((prev) => [data.post!, ...prev.filter((p) => p.id !== data.post!.id)]);
      }
      if (data.nafahatMeta) {
        setNafahatMeta(data.nafahatMeta);
      }
    } catch {
      // Keep cached/default Nafahat silently offline or if unavailable
    }
  }, []);

  const syncBootstrap = useCallback(
    async (opts?: {showFeedback?: boolean}) => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setIsOfflineMode(true);
        if (opts?.showFeedback) notify('لا يوجد اتصال بالإنترنت — التصفح يعمل من النسخة المحفوظة محلياً');
        return;
      }
      setIsSyncing(true);
      try {
        const res = await fetch('/api/bootstrap', {
          cache: 'no-store',
          headers: authToken ? {Authorization: `Bearer ${authToken}`} : undefined,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as {
          posts?: Post[];
          fatawa?: FatwaItem[];
          gesture?: AdminGesture;
          motherPrayersCount?: number;
          visitorsCount?: number;
          onlineVisitorsCount?: number;
          clicksCount?: number;
          nafahatMeta?: NafahatMeta;
          poetryItems?: PoetryAnecdoteItem[];
          permanentArchive?: PermanentArchiveItem[];
          motherOasisItems?: MotherOasisItem[];
          deafMuteVideos?: DeafMuteVideoItem[];
          customAdhkar?: CustomAdhkarItem[];
          customBooks?: CustomBookItem[];
          meetConfig?: AdminMeetConfig;
          visitorReviews?: VisitorReviewItem[];
          siteAppearance?: SiteAppearanceConfig;
          brandHandle?: string;
          socialLinks?: SocialLink[];
          appIcons?: AppIcons;
          siteConfig?: SiteConfig;
        };
        if (Array.isArray(data.posts)) {
          setPosts((prev) => mergeCloudAndLocalById(data.posts!, prev, INITIAL_POSTS));
        }
        if (Array.isArray(data.fatawa)) {
          setFatawa((prev) => mergeCloudAndLocalById(data.fatawa!, prev, INITIAL_FATAWA));
        }
        if (data.gesture) setGesture(data.gesture);
        if (typeof data.motherPrayersCount === 'number') setMotherPrayersCount(data.motherPrayersCount);
        if (typeof data.visitorsCount === 'number') setVisitorsCount(data.visitorsCount);
        if (typeof data.onlineVisitorsCount === 'number') {
          setOnlineVisitorsCount(Math.max(1, data.onlineVisitorsCount));
        }
        if (typeof data.clicksCount === 'number') setClicksCount(data.clicksCount);
        if (data.nafahatMeta) setNafahatMeta(data.nafahatMeta);
        if (Array.isArray(data.poetryItems)) setPoetryItems(data.poetryItems);
        if (Array.isArray(data.permanentArchive)) setPermanentArchive(data.permanentArchive);
        if (Array.isArray(data.motherOasisItems)) {
          setMotherOasisItems((prev) =>
            mergeCloudAndLocalById(data.motherOasisItems!, prev, INITIAL_MOTHER_OASIS_ITEMS),
          );
        }
        if (Array.isArray(data.deafMuteVideos)) {
          setDeafMuteVideos((prev) =>
            mergeCloudAndLocalById(data.deafMuteVideos!, prev, INITIAL_DEAF_MUTE_VIDEOS),
          );
        }
        if (Array.isArray(data.customAdhkar)) {
          setCustomAdhkar((prev) => mergeCloudAndLocalById(data.customAdhkar!, prev, []));
        }
        if (Array.isArray(data.customBooks)) {
          setCustomBooks((prev) => mergeCloudAndLocalById(data.customBooks!, prev, []));
        }
        if (data.meetConfig) setMeetConfig(data.meetConfig);
        if (Array.isArray(data.visitorReviews)) setVisitorReviews(data.visitorReviews);
        if (data.siteAppearance) setSiteAppearance({...DEFAULT_SITE_APPEARANCE, ...data.siteAppearance});
        if (typeof data.brandHandle === 'string' && data.brandHandle.trim()) setBrandHandle(data.brandHandle);
        if (Array.isArray(data.socialLinks)) setSocialLinks(data.socialLinks);
        if (data.appIcons) setAppIcons({...DEFAULT_APP_ICONS, ...data.appIcons});
        if (data.siteConfig) setSiteConfig({...DEFAULT_SITE_CONFIG, ...data.siteConfig, supportEmail: ''});
        setCachedAt(new Date().toISOString());
        setIsOfflineMode(false);
        if (opts?.showFeedback) notify('تم الاتصال بالإنترنت وتحديث المحتوى بنجاح');
        void syncDailyNafahatIfNeeded(data.nafahatMeta);
      } catch {
        setIsOfflineMode(true);
        if (opts?.showFeedback) notify('تعذر الاتصال بالخادم — تستمر القراءة بدون إنترنت من النسخة المحفوظة');
      } finally {
        setIsSyncing(false);
      }
    },
    [authToken, notify, syncDailyNafahatIfNeeded],
  );

  useEffect(() => {
    void syncBootstrap();
  }, [syncBootstrap]);

  // Real-time Firebase Firestore Cloud Persistence (cross-device & reinstall safe, append-only)
  useEffect(() => {
    const unsubAuth = observeFirebaseAdminAuth((user) => {
      setIsFirebaseAdmin(isTrustedAdminUser(user));
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    let active = true;
    void fetchAllCloudCollections(isFirebaseAdmin)
      .then((cloud) => {
        if (!active) return;
        if (cloud.posts.length > 0) {
          setPosts((prev) => mergeCloudAndLocalById(cloud.posts, prev, INITIAL_POSTS));
        }
        if (cloud.fatawa.length > 0) {
          setFatawa((prev) => mergeCloudAndLocalById(cloud.fatawa, prev, INITIAL_FATAWA));
        }
        if (cloud.motherOasisItems.length > 0) {
          setMotherOasisItems((prev) =>
            mergeCloudAndLocalById(cloud.motherOasisItems, prev, INITIAL_MOTHER_OASIS_ITEMS),
          );
        }
        if (cloud.deafMuteVideos.length > 0) {
          setDeafMuteVideos((prev) =>
            mergeCloudAndLocalById(cloud.deafMuteVideos, prev, INITIAL_DEAF_MUTE_VIDEOS),
          );
        }
        if (cloud.customAdhkar.length > 0) {
          setCustomAdhkar((prev) => mergeCloudAndLocalById(cloud.customAdhkar, prev, []));
        }
        if (cloud.customBooks.length > 0) {
          setCustomBooks((prev) => mergeCloudAndLocalById(cloud.customBooks, prev, []));
        }
        if (cloud.visitorReviews.length > 0) {
          setVisitorReviews((prev) => mergeCloudAndLocalById(cloud.visitorReviews, prev, []));
        }
      })
      .catch(() => undefined);

    const unsubCloud = subscribeCloudCollections(isFirebaseAdmin, {
      onPosts: (items) => {
        if (items.length > 0) setPosts((prev) => mergeCloudAndLocalById(items, prev, INITIAL_POSTS));
      },
      onFatawa: (items) => {
        if (items.length > 0) setFatawa((prev) => mergeCloudAndLocalById(items, prev, INITIAL_FATAWA));
      },
      onMotherOasis: (items) => {
        if (items.length > 0) {
          setMotherOasisItems((prev) =>
            mergeCloudAndLocalById(items, prev, INITIAL_MOTHER_OASIS_ITEMS),
          );
        }
      },
      onDeafMuteVideos: (items) => {
        if (items.length > 0) {
          setDeafMuteVideos((prev) =>
            mergeCloudAndLocalById(items, prev, INITIAL_DEAF_MUTE_VIDEOS),
          );
        }
      },
      onCustomAdhkar: (items) => {
        if (items.length > 0) setCustomAdhkar((prev) => mergeCloudAndLocalById(items, prev, []));
      },
      onCustomBooks: (items) => {
        if (items.length > 0) setCustomBooks((prev) => mergeCloudAndLocalById(items, prev, []));
      },
    });

    return () => {
      active = false;
      unsubCloud();
    };
  }, [isFirebaseAdmin]);

  // Verify persisted Admin session on startup & restore messages/settings (never auto-expires)
  useEffect(() => {
    if (!authToken) return;
    let active = true;
    void fetch('/api/admin/session', {
      headers: {Authorization: `Bearer ${authToken}`},
      cache: 'no-store',
    })
      .then(async (res) => {
        if (!active) return;
        if (res.status === 401) {
          setAuthToken(null);
          try {
            window.localStorage.removeItem(ADMIN_SESSION_KEY);
          } catch {
            // ignore
          }
          return;
        }
        if (!res.ok) return;
        const data = (await res.json()) as {
          username?: string;
          role?: AdminRole;
          assignedSection?: AdminSectionScope;
          suggestions?: SuggestionItem[];
          volunteers?: VolunteerItem[];
          automationSettings?: AutomationSettings;
          siteAppearance?: SiteAppearanceConfig;
          meetConfig?: AdminMeetConfig;
        };
        if (data.username) setAdminUsername(data.username);
        if (data.role) setAdminRole(data.role);
        if (data.assignedSection) setAssignedSection(data.assignedSection);
        if (Array.isArray(data.suggestions)) setSuggestions(data.suggestions);
        if (Array.isArray(data.volunteers)) setVolunteers(data.volunteers);
        if (data.automationSettings) setAutomationSettings(data.automationSettings);
        if (data.siteAppearance) setSiteAppearance({...DEFAULT_SITE_APPEARANCE, ...data.siteAppearance});
        if (data.meetConfig) setMeetConfig(data.meetConfig);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [authToken]);

  // Sync visitor saved bookmarks/likes when signed in
  useEffect(() => {
    if (!visitorProfile?.id) return;
    try {
      window.localStorage.setItem(VISITOR_PROFILE_KEY, JSON.stringify(visitorProfile));
    } catch {
      // ignore
    }
    void fetch('/api/visitor/sync', {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        visitorId: visitorProfile.id,
        bookmarkedPostIds: bookmarkedIds,
        bookmarkedFatwaIds,
        likedPostIds: likedIds,
        adhkarLifetime: exportAdhkarLifetimePayload(),
      }),
    }).catch(() => undefined);
  }, [visitorProfile, bookmarkedIds, bookmarkedFatwaIds, likedIds]);

  const refreshArchive = useCallback(() => {
    void fetch('/api/archive', {cache: 'no-store'})
      .then((res) => (res.ok ? res.json() : null))
      .then((data: {permanentArchive?: PermanentArchiveItem[]} | null) => {
        if (data && Array.isArray(data.permanentArchive)) {
          setPermanentArchive(data.permanentArchive);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const wasOnline = prevOnlineRef.current;
    prevOnlineRef.current = isOnline;
    if (!isOnline && wasOnline) {
      setIsOfflineMode(true);
      notify('أنت تتصفح الآن بدون إنترنت — المواعظ والمصحف والأذكار والأدعية الجامعة تعمل كاملة');
    } else if (isOnline && !wasOnline) {
      void syncBootstrap({showFeedback: true});
    }
  }, [isOnline, notify, syncBootstrap]);

  const syncMediaFeeds = useCallback(
    async (opts?: {forceRefresh?: boolean; showFeedback?: boolean}) => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        if (opts?.showFeedback) notify('لا يوجد اتصال — يتم عرض المرئيات والصوتيات المحفوظة محلياً');
        return;
      }
      setIsRefreshingFeeds(true);
      try {
        const res = await fetch(`/api/feeds/media${opts?.forceRefresh ? '?refresh=1' : ''}`, {
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as {
          youtubeVideos?: YouTubeVideoItem[];
          telegramAudios?: TelegramAudioItem[];
          twitterQuotes?: TwitterQuoteItem[];
        };
        if (Array.isArray(data.youtubeVideos) && data.youtubeVideos.length > 0) {
          setYoutubeVideos(data.youtubeVideos);
        }
        if (Array.isArray(data.telegramAudios) && data.telegramAudios.length > 0) {
          setTelegramAudios(data.telegramAudios);
        }
        if (Array.isArray(data.twitterQuotes) && data.twitterQuotes.length > 0) {
          setTwitterQuotes(data.twitterQuotes);
        }
        if (opts?.showFeedback) {
          notify('تم تحديث فيديوهات اليوتيوب وصوتيات تيليجرام ومنصة إكس (X) بنجاح');
        }
      } catch {
        if (opts?.showFeedback) {
          notify('تعذر تحديث القنوات حالياً — تستمر المواد المحفوظة بالعمل');
        }
      } finally {
        setIsRefreshingFeeds(false);
      }
    },
    [notify],
  );

  useEffect(() => {
    void syncMediaFeeds();
  }, [syncMediaFeeds]);

  // Auto-sync all daily contents when the calendar day rolls over while app is open or resumed
  useEffect(() => {
    const checkDayRollover = () => {
      if (document.visibilityState !== 'visible') return;
      const currentDay = getLocalDateKey();
      if (currentDay !== lastSyncDayRef.current) {
        lastSyncDayRef.current = currentDay;
        dailyNafahatSyncedRef.current = false;
        void syncBootstrap();
        void syncMediaFeeds({forceRefresh: true});
      }
    };
    document.addEventListener('visibilitychange', checkDayRollover);
    window.addEventListener('focus', checkDayRollover);
    return () => {
      document.removeEventListener('visibilitychange', checkDayRollover);
      window.removeEventListener('focus', checkDayRollover);
    };
  }, [syncBootstrap, syncMediaFeeds]);

  const navigateTo = (tab: NavTab) => {
    setMoreSheetOpen(false);
    recordView();
    if (tab === 'hisn') {
      setAdhkarInitialSection('hisn');
      setActiveTab('adhkar');
    } else if (tab === 'about' || tab === 'about-support') {
      setAboutSubTab('about');
      setActiveTab('about-support');
    } else if (tab === 'support') {
      setAboutSubTab('support');
      setActiveTab('about-support');
    } else {
      if (tab === 'adhkar') setAdhkarInitialSection('adhkar');
      setActiveTab(tab);
    }
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const openPostDetail = (postId: string) => {
    if (activeTab !== 'post-detail') setPrevTab(activeTab);
    setSelectedPostId(postId);
    setActiveTab('post-detail');
    window.scrollTo({top: 0, behavior: 'smooth'});
    recordView();
    trackInteraction('sermon_read');
  };

  const toggleBookmark = (postId: string) => {
    setBookmarkedIds((prev) => {
      const exists = prev.includes(postId);
      notify(
        exists
          ? tr('تمت إزالة الموعظة من المحفوظات', 'Sermon removed from bookmarks')
          : tr('تم حفظ الموعظة في خزانتك الخاصة', 'Sermon saved to bookmarks'),
      );
      return exists ? prev.filter((x) => x !== postId) : [postId, ...prev];
    });
  };

  const toggleFatwaBookmark = (fatwaId: string) => {
    setBookmarkedFatwaIds((prev) => {
      const exists = prev.includes(fatwaId);
      notify(
        exists
          ? tr('تم إلغاء حفظ الفتوى من المفضلة والمحفوظات', 'Fatwa removed from favorites & bookmarks')
          : tr('تم تمييز الفتوى كمفضلة وحفظها في قسم المحفوظات', 'Fatwa marked as favorite & saved to Bookmarks'),
      );
      return exists ? prev.filter((x) => x !== fatwaId) : [fatwaId, ...prev];
    });
  };

  const toggleArchiveFatwaBookmark = (item: SavedArchiveFatwa) => {
    setSavedArchiveFatawa((prev) => {
      const exists = prev.some((x) => x.id === item.id);
      notify(
        exists
          ? tr('تم إلغاء حفظ الفتوى من المفضلة والمحفوظات', 'Fatwa removed from favorites & bookmarks')
          : tr('تم تمييز الفتوى كمفضلة وحفظها في قسم المحفوظات', 'Fatwa marked as favorite & saved to Bookmarks'),
      );
      return exists ? prev.filter((x) => x.id !== item.id) : [item, ...prev];
    });
  };

  const toggleLike = async (postId: string) => {
    const alreadyLiked = likedIds.includes(postId);
    const nextLiked = !alreadyLiked;
    setLikedIds((prev) => (nextLiked ? [...prev, postId] : prev.filter((x) => x !== postId)));
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? {...p, likes: Math.max(0, p.likes + (nextLiked ? 1 : -1))} : p)),
    );
    try {
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({liked: nextLiked}),
      });
      if (res.ok) {
        const data = (await res.json()) as {post?: Post};
        if (data.post) {
          setPosts((prev) => prev.map((p) => (p.id === postId ? data.post! : p)));
        }
      }
    } catch {
      // Offline optimistic state kept
    }
  };

  const handleAddComment = async (postId: string, author: string, text: string) => {
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({author, text}),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as {post: Post};
      setPosts((prev) => prev.map((p) => (p.id === postId ? data.post : p)));
      notify('تمت إضافة تعليقك بنجاح، جزاك الله خيراً');
    } catch {
      notify('تعذر إرسال التعليق أثناء عدم الاتصال بالإنترنت');
    }
  };

  const sayAmen = async () => {
    if (hasSaidAmen) return;
    setHasSaidAmen(true);
    setMotherPrayersCount((c) => c + 1);
    try {
      localStorage.setItem(AMEN_KEY, '1');
    } catch {
      // Ignore
    }
    notify('آمين، تقبل الله دعاءك وحفظ والدتك ووالدينا أجمعين');
    try {
      const res = await fetch('/api/prayers/mother/amen', {method: 'POST'});
      if (res.ok) {
        const data = (await res.json()) as {count?: number};
        if (typeof data.count === 'number') setMotherPrayersCount(data.count);
      }
    } catch {
      // Keep optimistic increment
    }
  };

  const copySadaMessage = async (post: Post) => {
    const shareLink =
      post.id === 'daily_wisdom_featured'
        ? getPublicSiteUrl('/?tab=home')
        : getPublicSiteUrl(`/?post=${encodeURIComponent(post.id)}`);
    const formatted = `✨ *${post.title}*\n\n${post.body}\n\n— ${post.author}\n\n📚 خدمة صدى الخير الدعوية · ${siteConfig.appName} (${brandHandle})\n🌐 رابط الموقع: ${shareLink}\n📲 تيليجرام: https://t.me/ax1ax70${post.youtubeUrl ? `\n🎬 يوتيوب: ${post.youtubeUrl}` : ''}`;

    try {
      await navigator.clipboard.writeText(formatted);
      notify(
        tr(
          'تم نسخ النفحة مع رابط الموقع، جاهزة للمشاركة في الواتساب وتيليجرام',
          'Reflection & site link copied cleanly for WhatsApp and Telegram',
        ),
      );
    } catch {
      if (navigator.share) {
        try {
          await navigator.share({title: post.title, text: formatted, url: shareLink});
        } catch {
          notify(tr('تم تجهيز الرسالة للنشر', 'Message ready to share'));
        }
      } else {
        notify(tr('تم تجهيز الرسالة للنشر', 'Message ready to share'));
      }
    }

    trackInteraction('sermon_share');
    if (post.id !== 'daily_wisdom_featured') {
      void fetch(`/api/posts/${post.id}/play`, {method: 'POST'})
        .then(async (res) => {
          if (!res.ok) return;
          const data = (await res.json()) as {post?: Post};
          if (data.post) {
            setPosts((prev) => prev.map((p) => (p.id === post.id ? data.post! : p)));
          }
        })
        .catch(() => undefined);
    }
  };

  const shareAppLink = async () => {
    const shareUrl =
      activeTab === 'splash' || activeTab === 'admin-studio'
        ? getPublicSiteUrl('/?tab=home')
        : getPublicSiteUrl(`${window.location.pathname}${window.location.search || '/?tab=home'}`.replace('//', '/'));
    const shareData = {
      title: siteConfig.appName,
      text: `${siteConfig.appName} · ${siteConfig.appTagline} (مواعظ، مصحف، الأذكار والأدعية الجامعة، فتاوى وأذكار)\n🌐 ${shareUrl}`,
      url: shareUrl,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // Fallback to clipboard copy
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      notify('تم نسخ رابط المنصة العام — يمكنك إرساله مباشرة للوالدة والجميع');
    } catch {
      notify('انسخ الرابط من المتصفح لمشاركته مباشرة');
    }
  };

  // Hidden Admin/Editor Gesture Handlers (zero buttons visible to visitors)
  const triggerAdminEntry = () => {
    setLoginUsername('');
    setLoginPassword('');
    setLoginError('');
    setLoginModalOpen(true);
  };

  const handleBrandPointerDown = () => {
    if (gesture !== 'long_press') return;
    longPressTimerRef.current = window.setTimeout(() => {
      triggerAdminEntry();
    }, 1800);
  };

  const handleBrandPointerEnd = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleBrandTap = () => {
    if (gesture !== 'multi_tap') return;
    const now = Date.now();
    if (now - tapTrackerRef.current.lastTs > 1500) {
      tapTrackerRef.current = {count: 1, lastTs: now};
    } else {
      tapTrackerRef.current = {count: tapTrackerRef.current.count + 1, lastTs: now};
    }
    if (tapTrackerRef.current.count >= 5) {
      tapTrackerRef.current = {count: 0, lastTs: 0};
      triggerAdminEntry();
    }
  };

  const submitAdminLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!loginUsername.trim() || !loginPassword.trim()) {
      setLoginError('أدخل اسم المستخدم وكلمة المرور');
      return;
    }
    setVerifyingLogin(true);
    setLoginError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          username: loginUsername.trim(),
          password: loginPassword.trim(),
        }),
      });
      if (!res.ok) {
        setLoginError('اسم المستخدم أو كلمة المرور غير صحيحة');
        return;
      }
      const data = (await res.json()) as {
        token: string;
        username: string;
        role: AdminRole;
        assignedSection?: AdminSectionScope;
        suggestions?: SuggestionItem[];
        volunteers?: VolunteerItem[];
        automationSettings?: AutomationSettings;
        siteAppearance?: SiteAppearanceConfig;
        meetConfig?: AdminMeetConfig;
      };
      setAuthToken(data.token);
      setAdminUsername(data.username);
      setAdminRole(data.role);
      const scope = data.assignedSection || 'all';
      setAssignedSection(scope);
      setSuggestions(data.suggestions || []);
      setVolunteers(data.volunteers || []);
      if (data.automationSettings) setAutomationSettings(data.automationSettings);
      if (data.siteAppearance) setSiteAppearance({...DEFAULT_SITE_APPEARANCE, ...data.siteAppearance});
      if (data.meetConfig) setMeetConfig(data.meetConfig);
      try {
        window.localStorage.setItem(
          ADMIN_SESSION_KEY,
          JSON.stringify({token: data.token, username: data.username, role: data.role, assignedSection: scope}),
        );
      } catch {
        // ignore
      }
      setLoginModalOpen(false);
      setAdminInitialTab('studio');
      setActiveTab('admin-studio');
    } catch {
      setLoginError('تعذر الاتصال بالخادم، تأكد من توفر الإنترنت');
    } finally {
      setVerifyingLogin(false);
    }
  };

  const logoutAdmin = () => {
    setAuthToken(null);
    setEditingPostForAdmin(null);
    try {
      window.localStorage.removeItem(ADMIN_SESSION_KEY);
    } catch {
      // ignore
    }
    navigateTo('home');
    notify('تم تسجيل خروج المشرف بنجاح');
  };

  const handleAdminAutoPost = async (postId: string) => {
    if (!authToken) return;
    try {
      const res = await fetch('/api/admin/auto-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({postId}),
      });
      const data = (await res.json()) as {ok?: boolean; error?: string; platforms?: string[]};
      if (!res.ok) {
        notify(data.error || 'تعذر النشر الآلي للموعظة');
        return;
      }
      notify(`تم إرسال الموعظة آلياً (${(data.platforms || []).join(' · ') || 'Webhook'})`);
    } catch {
      notify('تعذر الاتصال بخادم النشر الآلي');
    }
  };

  const handleAdminToggleHidePost = async (postId: string) => {
    if (!authToken) return;
    try {
      const res = await fetch(`/api/admin/posts/${postId}/visibility`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        notify('تعذر تغيير حالة إخفاء الموعظة');
        return;
      }
      const data = (await res.json()) as {post?: Post};
      if (data.post) {
        setPosts((prev) => prev.map((p) => (p.id === postId ? data.post! : p)));
        notify(data.post.hidden ? 'تم إخفاء الموعظة عن الزوار' : 'تم إظهار الموعظة للزوار');
      }
    } catch {
      notify('تعذر الاتصال بالخادم');
    }
  };

  const handleAdminDeletePost = async (postId: string) => {
    if (!authToken) return;
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: {Authorization: `Bearer ${authToken}`},
      });
      if (!res.ok) {
        notify('تعذر حذف الموعظة');
        return;
      }
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      if (selectedPostId === postId) {
        setSelectedPostId(null);
        navigateTo('home');
      }
      notify('تم حذف الموعظة بنجاح');
    } catch {
      notify('تعذر الاتصال بالخادم');
    }
  };

  const handleAdminEditPost = (post: Post) => {
    setEditingPostForAdmin(post);
    setAdminInitialTab('studio');
    setActiveTab('admin-studio');
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const handleAdminUpdateComment = async (postId: string, commentId: string, text: string) => {
    if (!authToken) return;
    const res = await fetch(`/api/admin/posts/${postId}/comments/${commentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({text}),
    });
    if (res.ok) {
      const data = (await res.json()) as {post?: Post};
      if (data.post) setPosts((prev) => prev.map((p) => (p.id === postId ? data.post! : p)));
      notify('تم تعديل التعليق بنجاح');
    }
  };

  const handleAdminToggleHideComment = async (postId: string, commentId: string) => {
    if (!authToken) return;
    const res = await fetch(`/api/admin/posts/${postId}/comments/${commentId}/visibility`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({}),
    });
    if (res.ok) {
      const data = (await res.json()) as {post?: Post};
      if (data.post) setPosts((prev) => prev.map((p) => (p.id === postId ? data.post! : p)));
      notify('تم تحديث حالة ظهور التعليق');
    }
  };

  const handleAdminDeleteComment = async (postId: string, commentId: string) => {
    if (!authToken) return;
    const res = await fetch(`/api/admin/posts/${postId}/comments/${commentId}`, {
      method: 'DELETE',
      headers: {Authorization: `Bearer ${authToken}`},
    });
    if (res.ok) {
      const data = (await res.json()) as {post?: Post};
      if (data.post) setPosts((prev) => prev.map((p) => (p.id === postId ? data.post! : p)));
      notify('تم حذف التعليق');
    }
  };

  const handleSaveAppearance = async (next: SiteAppearanceConfig) => {
    if (!authToken) return;
    const res = await fetch('/api/admin/appearance', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(next),
    });
    if (!res.ok) {
      notify('تعذر حفظ إعدادات المظهر والصيانة');
      return;
    }
    const data = (await res.json()) as {siteAppearance?: SiteAppearanceConfig};
    if (data.siteAppearance) {
      setSiteAppearance({...DEFAULT_SITE_APPEARANCE, ...data.siteAppearance});
    }
    notify('تم حفظ إعدادات المظهر والسطوع والتنبيه العام');
  };

  const handleSaveAutomation = async (next: AutomationSettings) => {
    if (!authToken) return;
    const res = await fetch('/api/admin/automation', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(next),
    });
    if (!res.ok) {
      notify('تعذر حفظ إعدادات البوت والإشعارات الصامتة');
      return;
    }
    const data = (await res.json()) as {automationSettings?: AutomationSettings};
    if (data.automationSettings) {
      setAutomationSettings(data.automationSettings);
    }
    notify('تم حفظ إعدادات النشر الآلي والتنبيه الصامت للمشرف');
  };

  const handleSaveSiteConfig = async (nextConfig: SiteConfig) => {
    if (!authToken) return;
    const res = await fetch('/api/admin/site-config', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(nextConfig),
    });
    if (!res.ok) {
      notify('تعذر حفظ تعديلات الصفحة');
      return;
    }
    const data = (await res.json()) as {siteConfig: SiteConfig};
    setSiteConfig({...DEFAULT_SITE_CONFIG, ...data.siteConfig});
    notify('تم حفظ تعديلات الصفحة والأزرار والمسميات على نفس الرابط العام');
  };

  const handleUpdateSettings = async (
    nextGesture: AdminGesture,
    targetUsername?: string,
    newPassword?: string,
  ) => {
    if (!authToken) return;
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({gesture: nextGesture, targetUsername, newPassword}),
    });
    if (res.ok) {
      setGesture(nextGesture);
    }
  };

  const handleSaveCustomization = async (payload: {
    brandHandle: string;
    socialLinks: SocialLink[];
    appIcons: AppIcons;
  }) => {
    if (!authToken) return;
    const res = await fetch('/api/admin/customization', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      notify('تعذر حفظ التعديلات حالياً');
      return;
    }
    const data = (await res.json()) as {
      brandHandle: string;
      socialLinks: SocialLink[];
      appIcons: AppIcons;
    };
    setBrandHandle(data.brandHandle);
    setSocialLinks(data.socialLinks);
    setAppIcons({...DEFAULT_APP_ICONS, ...data.appIcons});
    notify('تم حفظ الروابط والأيقونات المخصصة بنجاح في التطبيق');
  };

  const handleAdminRefreshNafahat = async (): Promise<{ok: boolean; message: string}> => {
    if (!authToken) {
      return {ok: false, message: 'يلزم تسجيل الدخول كمسؤول أو محرر'};
    }
    try {
      const res = await fetch('/api/admin/nafahat/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      });
      const data = (await res.json()) as {
        error?: string;
        siteConfig?: SiteConfig;
        post?: Post;
        posts?: Post[];
        nafahatMeta?: NafahatMeta;
      };
      if (!res.ok) {
        return {
          ok: false,
          message: data.error || 'تعذر توليد نفحة جديدة بالذكاء الاصطناعي حالياً',
        };
      }
      if (data.siteConfig) {
        setSiteConfig({...DEFAULT_SITE_CONFIG, ...data.siteConfig});
      }
      if (Array.isArray(data.posts) && data.posts.length > 0) {
        setPosts(data.posts);
      } else if (data.post) {
        setPosts((prev) => [data.post!, ...prev.filter((p) => p.id !== data.post!.id)]);
      }
      if (data.nafahatMeta) {
        setNafahatMeta(data.nafahatMeta);
      }
      return {
        ok: true,
        message: 'تم تحديث «نفحات متجددة» والمواعظ والقصص بالذكاء الاصطناعي بنجاح ونشرها في الصفحة الرئيسية',
      };
    } catch {
      return {
        ok: false,
        message: 'تعذر الاتصال بالخادم لتحديث النفحات بالذكاء الاصطناعي',
      };
    }
  };

  const selectedPost = posts.find((p) => p.id === selectedPostId) || null;

  useEffect(() => {
    if (activeTab === 'post-detail' && !selectedPost && !isSyncing) {
      setActiveTab('home');
      setSelectedPostId(null);
    }
  }, [activeTab, selectedPost, isSyncing]);

  if (activeTab === 'splash') {
    return <SplashScreen onFinish={finishSplash} />;
  }

  const primaryNav: Array<{id: NavTab; label: string; Icon: ReturnType<typeof resolveIcon>}> = [
    {id: 'home', label: isEn ? 'Home' : siteConfig.navHome, Icon: resolveIcon(appIcons.home, 'home')},
    {id: 'quran', label: isEn ? 'Quran' : siteConfig.navQuran, Icon: resolveIcon(appIcons.quran, 'bookOpen')},
    {id: 'adhkar', label: isEn ? 'Duas & Adhkar' : 'الأذكار والأدعية الجامعة', Icon: resolveIcon(appIcons.adhkar, 'sun')},
    {id: 'fatawa', label: isEn ? 'Fatawa' : siteConfig.navFatawa, Icon: resolveIcon(appIcons.fatawa, 'scale')},
    {id: 'library', label: isEn ? 'Library & Archive' : siteConfig.navLibrary, Icon: resolveIcon(appIcons.library, 'sparkles')},
    {id: 'channels', label: isEn ? 'Channels' : siteConfig.navChannels, Icon: resolveIcon(appIcons.channels, 'share2')},
  ];

  // Extra quick sections in desktop sidebar and mobile "More" sheet
  const extendedNav: Array<{id: NavTab; label: string; Icon: typeof Flower2}> = [
    {id: 'wird', label: isEn ? 'Daily Wird' : 'الورد اليومي', Icon: Sparkles},
    {id: 'cards', label: isEn ? 'Dawah Cards' : 'البطاقات الدعوية', Icon: ImageIcon},
    {id: 'mother-oasis', label: isEn ? "Mother's Oasis" : 'واحة أمي', Icon: Flower2},
    {id: 'poetry', label: isEn ? 'Poetry & Anecdotes' : 'واحة الشعر والطرائف', Icon: Feather},
    {id: 'archive', label: isEn ? 'Permanent Archive' : 'الأرشيف الشامل', Icon: Archive},
    {id: 'videos', label: isEn ? 'Videos' : 'المقاطع المرئية', Icon: Video},
    {id: 'deaf-mute', label: isEn ? 'Deaf & Mute Oasis' : 'واحة الصم والبكم', Icon: HandHeart},
    {id: 'reviews', label: isEn ? 'Visitor Reviews' : 'آراء الزوار', Icon: Star},
  ];

  // 5 thumb-zone items on mobile: Home, Quran, Adhkar, Fatawa, Library
  const mobileBottomNav = [
    primaryNav[0],
    primaryNav[1],
    primaryNav[2],
    primaryNav[3],
    primaryNav[4],
  ];

  const secondaryNav: Array<{id: NavTab; label: string; Icon: ReturnType<typeof resolveIcon>}> = [
    {
      id: 'about-support',
      label: isEn ? 'About, Support & Share' : 'عن الموقع والدعم والمشاركة',
      Icon: resolveIcon(appIcons.about, 'info'),
    },
  ];

  // Full list of sections rendered right-to-left on mobile horizontal scrollable strip
  const mobileHorizontalSections: Array<{id: NavTab; label: string; Icon: ReturnType<typeof resolveIcon>}> = [
    ...primaryNav,
    ...extendedNav,
    ...secondaryNav,
    {
      id: 'bookmarks',
      label: isEn ? 'Bookmarks' : siteConfig.navBookmarks,
      Icon: resolveIcon(appIcons.bookmarks, 'bookmark'),
    },
  ];

  const applyThemeMode = (mode: ThemeMode) => {
    setThemeMode(mode);
    notify(
      mode === 'system'
        ? tr('تم تفعيل المظهر التلقائي حسب إعدادات نظام التشغيل', 'System theme mode enabled')
        : mode === 'light'
          ? tr('تم التبديل إلى الوضع النهاري', 'Switched to Light Mode')
          : tr('تم التبديل إلى الوضع الليلي', 'Switched to Dark Mode'),
    );
  };

  const cycleThemeMode = () => {
    applyThemeMode(themeMode === 'system' ? 'light' : themeMode === 'light' ? 'dark' : 'system');
  };

  const handleToggleLanguage = () => {
    const nextIsEn = !isEn;
    toggleLang();
    notify(nextIsEn ? 'Switched interface language to English' : 'تم التبديل إلى اللغة العربية');
  };

  const ChannelsIcon = resolveIcon(appIcons.channels, 'share2');
  const BookmarksIcon = resolveIcon(appIcons.bookmarks, 'bookmark');
  const displayAppName = isEn ? 'Mawaedh & Ibar' : siteConfig.appName;

  const presetBgClass =
    siteAppearance.backgroundPreset === 'emerald_mist'
      ? 'bg-[#f2faf6] dark:bg-[#06150f]'
      : siteAppearance.backgroundPreset === 'warm_parchment'
        ? 'bg-[#fbf7ef] dark:bg-[#14110b]'
        : siteAppearance.backgroundPreset === 'sky_calm'
          ? 'bg-[#f3f9fd] dark:bg-[#07131a]'
          : siteAppearance.backgroundPreset === 'deep_forest'
            ? 'bg-[#eef6f1] dark:bg-[#04110b]'
            : 'bg-[#FFFFFF] dark:bg-[#060f0d]';

  const handleOpenSettingsTab = (section: AppSettingsSection = 'settings') => {
    openSettingsModal(section);
  };

  const newTicketsCount =
    suggestions.filter((s) => (s.status || 'new') === 'new').length +
    volunteers.filter((v) => (v.status || 'new') === 'new').length;

  const safeBrightness =
    typeof siteAppearance.brightness === 'number' && Number.isFinite(siteAppearance.brightness)
      ? Math.min(120, Math.max(70, siteAppearance.brightness))
      : 100;

  return (
    <div
      style={safeBrightness !== 100 ? {filter: `brightness(${safeBrightness}%)`} : undefined}
      className={`min-h-[calc(100dvh-80px)] ${presetBgClass} text-[#0e1d25] dark:text-[#e3f3fe] flex flex-col lg:flex-row transition-colors`}
    >
      {/* Android WebView Top Safe Area Shield (40px) */}
      <div
        className={`fixed top-0 left-0 right-0 h-[40px] z-40 ${presetBgClass} pointer-events-none`}
        aria-hidden="true"
      />

      {/* Desktop Direction-Aware Sidebar (Right for Arabic RTL, Left for English LTR) */}
      <aside
        className={`hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:top-[40px] lg:bottom-[40px] z-40 bg-white dark:bg-[#091813] border-slate-200/80 dark:border-white/10 p-4 justify-between overflow-y-auto ${
          isEn ? 'lg:left-0 border-r' : 'lg:right-0 border-l'
        }`}
      >
        <div className="space-y-4">
          <button
            type="button"
            onPointerDown={handleBrandPointerDown}
            onPointerUp={handleBrandPointerEnd}
            onPointerLeave={handleBrandPointerEnd}
            onClick={() => {
              handleBrandTap();
              navigateTo('home');
            }}
            className="flex items-center gap-2.5 w-full text-start select-none px-1"
            title={displayAppName}
          >
            <BrandEmblem className="w-7 h-7 shrink-0" variant={appIcons.brandEmblem} />
            <span className="text-lg font-bold text-[#006a46] dark:text-[#6cdba6] whitespace-nowrap">
              {displayAppName}
            </span>
          </button>

          <nav className="space-y-1" aria-label={tr('التنقل الرئيسي', 'Main Navigation')}>
            {primaryNav.map((item) => {
              const Icon = item.Icon;
              const isCurrent = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.id === 'library') setLibraryInitialFilter('all');
                    navigateTo(item.id);
                  }}
                  className={`w-full min-h-[40px] px-3 py-2 rounded-xl text-[13px] font-semibold flex items-center gap-2.5 transition-colors whitespace-nowrap ${
                    isCurrent
                      ? 'bg-[#006a46] text-white'
                      : 'text-[#3e4a42] dark:text-slate-300 hover:bg-[#e8f6ff] dark:hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}

            <div className="my-2 border-t border-slate-200/70 dark:border-white/10 pt-2 space-y-1">
              {extendedNav.map((item) => {
                const Icon = item.Icon;
                const isCurrent = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigateTo(item.id)}
                    className={`w-full min-h-[38px] px-3 py-1.5 rounded-xl text-[13px] font-semibold flex items-center gap-2.5 transition-colors whitespace-nowrap ${
                      isCurrent
                        ? 'bg-[#006a46] text-white'
                        : 'text-[#3e4a42] dark:text-slate-300 hover:bg-[#e8f6ff] dark:hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="border-t border-slate-200/70 dark:border-white/10 pt-2 space-y-1">
              {secondaryNav.map((item) => {
                const Icon = item.Icon;
                const isCurrent = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigateTo(item.id)}
                    className={`w-full min-h-[38px] px-3 py-1.5 rounded-xl text-[13px] font-semibold flex items-center gap-2.5 transition-colors whitespace-nowrap ${
                      isCurrent
                        ? 'bg-[#006a46] text-white'
                        : 'text-[#3e4a42] dark:text-slate-300 hover:bg-[#e8f6ff] dark:hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>

            <PWAInstallButton
              variant="sidebar"
              onNotify={notify}
              onShareAppLink={() => void shareAppLink()}
            />
          </nav>
        </div>

        <div className="space-y-2.5 pt-4 border-t border-slate-200/80 dark:border-white/10">
          {/* Permanent Admin Return & Logout Box when authenticated */}
          {authToken && (
            <div className="rounded-xl bg-[#071510] text-white p-2.5 space-y-1.5 border border-emerald-800/50">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => navigateTo('admin-studio')}
                  className="text-xs font-extrabold text-emerald-300 hover:text-white flex items-center gap-1.5"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>{tr('لوحة المشرف', 'Admin Studio')}</span>
                </button>
                {newTicketsCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[10px] font-extrabold">
                    {formatNumber(newTicketsCount)}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={logoutAdmin}
                className="w-full min-h-[34px] px-2.5 py-1 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white text-[11px] font-bold flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>🚪 تسجيل خروج المشرف</span>
              </button>
            </div>
          )}

          {/* Optional Visitor Account Button */}
          <button
            type="button"
            onClick={() => setVisitorAuthModalOpen(true)}
            className="w-full min-h-[38px] px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-700/15 text-xs font-bold text-[#006a46] dark:text-[#6cdba6] flex items-center justify-between"
          >
            <span className="flex items-center gap-2 truncate">
              <UserCheck className="w-4 h-4 shrink-0" />
              <span className="truncate">
                {visitorProfile ? visitorProfile.name : tr('دخول الزوار / حسابي', 'Visitor Sign In')}
              </span>
            </span>
          </button>

          {/* Language Switcher in Sidebar */}
          <button
            type="button"
            onClick={handleToggleLanguage}
            className="w-full min-h-[38px] px-3 py-1.5 rounded-xl bg-[#e8f6ff] dark:bg-[#112921] hover:bg-[#d5ecfb] dark:hover:bg-[#16362b] text-xs font-bold text-[#006a46] dark:text-[#6cdba6] flex items-center justify-between transition-colors"
          >
            <span className="flex items-center gap-2">
              <Globe className="w-4 h-4 shrink-0" />
              <span>{tr('اللغة · Language', 'Language · اللغة')}</span>
            </span>
            <span>{isEn ? 'العربية' : 'EN'}</span>
          </button>

          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-[#6e7a71] dark:text-slate-400 block px-1">
              {tr('مظهر التطبيق', 'Appearance')}
            </span>
            <div
              role="group"
              aria-label={tr('اختيار مظهر التطبيق', 'Choose theme mode')}
              className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#e8f6ff] dark:bg-white/10"
            >
              {(
                [
                  {id: 'system', label: tr('تلقائي', 'Auto'), Icon: Monitor},
                  {id: 'light', label: tr('نهاري', 'Light'), Icon: Sun},
                  {id: 'dark', label: tr('ليلي', 'Dark'), Icon: Moon},
                ] as const
              ).map(({id, label, Icon}) => {
                const active = themeMode === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => applyThemeMode(id)}
                    className={`min-h-[36px] px-2 py-1 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 whitespace-nowrap transition-colors ${
                      active
                        ? 'bg-[#006a46] text-white shadow-xs'
                        : 'text-[#3e4a42] dark:text-slate-300 hover:bg-white/60 dark:hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Permanent Button: المنبّه الدعوي والإعدادات */}
          <button
            type="button"
            onClick={() => handleOpenSettingsTab('settings')}
            className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[#fffbf2] dark:bg-[#1a2921] hover:bg-[#ffdea8]/60 border border-[#f2be5e]/35 text-xs font-extrabold text-[#7c5800] dark:text-[#ffdea8] flex items-center justify-between transition-colors"
          >
            <span className="flex items-center gap-2 truncate">
              <BellRing className="w-4 h-4 shrink-0" />
              <span className="truncate">{tr('المنبّه الدعوي والإعدادات', 'Reminder & Settings')}</span>
            </span>
            {reminderSettings.enabled && (
              <span className="w-2 h-2 rounded-full bg-[#008559] shrink-0" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('splash')}
            className="w-full min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-medium text-[#6e7a71] dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-between transition-colors"
          >
            <span>{tr('معاينة شاشة البداية', 'Welcome Screen')}</span>
            <Sparkles className="w-4 h-4" />
          </button>

          {/* Single Unified Bookmarks Box Placed Last */}
          <button
            type="button"
            onClick={() => navigateTo('bookmarks')}
            className={`w-full min-h-[44px] px-3 py-2 rounded-xl border text-xs font-bold flex items-center justify-between transition-colors ${
              activeTab === 'bookmarks'
                ? 'bg-[#006a46] text-white border-[#006a46]'
                : 'bg-[#e8f6ff] dark:bg-[#112921] border-[#006389]/15 dark:border-white/10 text-[#0e1d25] dark:text-[#e3f3fe] hover:bg-[#d9f0ff] dark:hover:bg-[#16362b]'
            }`}
          >
            <span className="flex items-center gap-2">
              <BookmarksIcon
                className={`w-4 h-4 shrink-0 ${
                  activeTab === 'bookmarks' ? 'text-white' : 'text-[#006a46] dark:text-[#6cdba6]'
                }`}
              />
              <span>{tr(siteConfig.navBookmarks, 'Saved Box')}</span>
            </span>
            <span
              className={`px-2 py-0.5 rounded-lg text-[11px] font-extrabold tabular-nums ${
                activeTab === 'bookmarks'
                  ? 'bg-white/20 text-white'
                  : 'bg-white dark:bg-white/10 text-[#006389] dark:text-[#80cfff]'
              }`}
            >
              {formatNumber(bookmarkedIds.length + bookmarkedFatwaIds.length + savedArchiveFatawa.length)}
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-h-[calc(100dvh-80px)] ${isEn ? 'lg:pl-64' : 'lg:pr-64'}`}>
        {/* Top Bar (Sticky) */}
        <header className="sticky top-[40px] z-30 h-14 bg-[#FFFFFF]/95 dark:bg-[#060f0d]/95 backdrop-blur-xl border-b border-slate-200/70 dark:border-white/10 px-3 sm:px-6 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onPointerDown={handleBrandPointerDown}
              onPointerUp={handleBrandPointerEnd}
              onPointerLeave={handleBrandPointerEnd}
              onClick={() => {
                handleBrandTap();
                navigateTo('home');
              }}
              className="lg:hidden flex items-center gap-1.5 select-none shrink-0"
            >
              <BrandEmblem className="w-6 h-6 shrink-0" variant={appIcons.brandEmblem} />
              <span className="text-sm sm:text-base font-bold text-[#006a46] dark:text-[#6cdba6] whitespace-nowrap">
                {displayAppName}
              </span>
            </button>

            <span className="hidden lg:inline text-sm font-bold text-[#0e1d25] dark:text-white whitespace-nowrap truncate">
              {activeTab === 'home' && tr(`${siteConfig.navHome} والنفحات`, 'Home & Daily Reflections')}
              {activeTab === 'quran' && tr('المصحف الشريف (يعمل بدون إنترنت)', 'Noble Quran (Offline Ready)')}
              {activeTab === 'wird' && tr('الورد اليومي من القرآن الكريم', 'Daily Quran Wird')}
              {activeTab === 'hisn' && tr('الأذكار والأدعية الجامعة', 'Comprehensive Adhkar & Duas')}
              {activeTab === 'fatawa' &&
                tr(`${siteConfig.fatawaTitle} · الشيخ يحيى الحجوري وكبار العلماء`, 'Scholars Fatawa · Global Archive')}
              {activeTab === 'adhkar' &&
                tr('الأذكار والأدعية الجامعة', 'Comprehensive Adhkar & Duas')}
              {activeTab === 'library' && tr(siteConfig.sadaTitle, 'Sada Al-Khair & Scholarly Portals')}
              {activeTab === 'cards' && tr('البطاقات الدعوية الكلاسيكية', 'Classic Dawah Cards')}
              {activeTab === 'mother-oasis' && tr('واحة الداعية الفاضلة أمي', "Mother's Oasis")}
              {activeTab === 'poetry' && tr('واحة الشعر والطرائف', 'Poetry & Anecdotes Oasis')}
              {activeTab === 'archive' && tr('الأرشيف الشامل الدائم', 'Permanent AI Archive')}
              {activeTab === 'videos' && tr('المقاطع المرئية والدعوية', 'Video Library')}
              {activeTab === 'deaf-mute' && tr('واحة الصم والبكم · بإدارة م. يونس عبدالكريم', 'Deaf & Mute Oasis')}
              {activeTab === 'reviews' && tr('آراء الزوار وتقييمهم', 'Visitor Reviews')}
              {activeTab === 'channels' && tr(siteConfig.channelsTitle, 'Official Channels & Community')}
              {activeTab === 'bookmarks' && tr(`${siteConfig.navBookmarks} والمفضلة`, 'Saved & Bookmarks')}
              {(activeTab === 'about-support' || activeTab === 'about' || activeTab === 'support') &&
                tr('عن الموقع والدعم والمشاركة', 'About, Support & Share')}
              {activeTab === 'post-detail' && tr('تفاصيل الموعظة', 'Reflection Details')}
              {activeTab === 'admin-studio' &&
                (adminRole === 'admin'
                  ? tr('لوحة المدير والمسؤول الأول', 'Manager & Primary Admin Studio')
                  : tr('لوحة المشرف ومحرر المحتوى', 'Supervisor & Editor Studio'))}
            </span>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {searchOpen && (
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (activeTab !== 'home') setActiveTab('home');
                }}
                placeholder={tr('ابحث في المواعظ...', 'Search sermons...')}
                className="w-24 sm:w-44 min-h-[36px] px-2.5 rounded-xl bg-white dark:bg-[#0d211a] border border-slate-200 dark:border-white/10 text-xs focus:outline-none focus:border-[#006a46]"
              />
            )}

            {/* Global Manual Font Size Controls (Visible on Mobile & Desktop): A+ | px | A- */}
            <div
              role="group"
              aria-label="التحكم اليدوي بحجم الخط"
              className="flex items-center gap-0.5 rounded-xl bg-[#eef7f3] dark:bg-[#112921] border border-emerald-700/15 p-0.5"
            >
              <button
                type="button"
                onClick={() => {
                  stepFontSize('up');
                  notify(`تم تكبير خط التطبيق (${Math.min(MAX_FONT_SIZE_PX, activeFontSizePx + 2)}px)`);
                }}
                title="تكبير خط التطبيق (A+)"
                className="min-h-[28px] px-1.5 sm:px-2 rounded-lg text-[11px] font-extrabold text-[#006a46] dark:text-[#6cdba6] hover:bg-white dark:hover:bg-white/10"
              >
                A+
              </button>
              <button
                type="button"
                onClick={() => openSettingsModal('settings')}
                title="تعديل حجم الخط يدوياً من الإعدادات"
                className={`min-h-[28px] px-1.5 sm:px-2 rounded-lg text-[10px] sm:text-[11px] font-extrabold tabular-nums ${
                  activeFontSizePx === DEFAULT_FONT_SIZE_PX
                    ? 'bg-[#006a46] text-white'
                    : 'bg-amber-100 dark:bg-amber-950/60 text-[#7c5800] dark:text-[#ffdea8]'
                }`}
              >
                {activeFontSizePx}px
              </button>
              <button
                type="button"
                onClick={() => {
                  stepFontSize('down');
                  notify(`تم تصغير خط التطبيق (${Math.max(MIN_FONT_SIZE_PX, activeFontSizePx - 2)}px)`);
                }}
                title="تصغير خط التطبيق (A-)"
                className="min-h-[28px] px-1.5 sm:px-2 rounded-lg text-[11px] font-extrabold text-[#006a46] dark:text-[#6cdba6] hover:bg-white dark:hover:bg-white/10"
              >
                A-
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                if (searchOpen && searchQuery) setSearchQuery('');
                setSearchOpen((v) => !v);
              }}
              aria-label={tr('بحث', 'Search')}
              className="min-w-[34px] min-h-[34px] rounded-full hover:bg-[#e8f6ff] dark:hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              {searchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
            </button>

            {/* Optional Visitor Account Button in Top Bar */}
            <button
              type="button"
              onClick={() => setVisitorAuthModalOpen(true)}
              title={visitorProfile ? visitorProfile.name : 'دخول الزوار / حسابي'}
              className="hidden md:flex min-h-[36px] px-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/35 dark:hover:bg-emerald-900/40 border border-emerald-700/15 text-[#006a46] dark:text-[#6cdba6] text-xs font-bold items-center gap-1.5 whitespace-nowrap"
            >
              <UserCheck className="w-3.5 h-3.5 shrink-0" />
              <span className="max-w-[95px] truncate">
                {visitorProfile ? visitorProfile.name : tr('دخول الزوار / حسابي', 'Account')}
              </span>
            </button>

            {/* Permanent Reminder & Display Settings Button in Top Header */}
            <button
              type="button"
              onClick={() => handleOpenSettingsTab('settings')}
              aria-label="المنبّه الدعوي والإعدادات"
              title="المنبّه الدعوي والإعدادات"
              className="relative min-h-[36px] px-2.5 rounded-xl bg-[#fffbf2] hover:bg-[#ffdea8]/80 dark:bg-[#1a2921] dark:hover:bg-[#23382d] border border-[#f2be5e]/45 text-[#7c5800] dark:text-[#ffdea8] text-xs font-extrabold flex items-center gap-1.5 whitespace-nowrap transition-colors"
            >
              <Settings className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xl:inline">{tr('المنبّه الدعوي والإعدادات', 'Reminder & Settings')}</span>
              {reminderSettings.enabled && (
                <span className="w-2 h-2 rounded-full bg-[#008559] shrink-0" aria-hidden="true" />
              )}
            </button>

            {authToken && activeTab !== 'admin-studio' && (
              <button
                type="button"
                onClick={() => navigateTo('admin-studio')}
                title="العودة للوحة المشرف"
                className="min-h-[36px] px-2.5 rounded-xl bg-[#071510] text-emerald-300 hover:text-white text-xs font-extrabold flex items-center gap-1.5 whitespace-nowrap"
              >
                <Shield className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">{tr('لوحة المشرف', 'Studio')}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleToggleLanguage}
              aria-label={tr('تبديل اللغة إلى الإنجليزية', 'Switch language to Arabic')}
              title={tr('English / العربية', 'العربية / English')}
              className="min-h-[36px] px-2.5 rounded-xl bg-[#eef7f3] hover:bg-[#d8efe5] dark:bg-[#112921] border border-emerald-700/15 text-[#006a46] dark:text-[#6cdba6] text-xs font-extrabold flex items-center gap-1 whitespace-nowrap transition-colors"
            >
              <Globe className="w-3.5 h-3.5 shrink-0" />
              <span>{isEn ? 'عربي' : 'EN'}</span>
            </button>

            {(isOfflineMode || !isOnline) && (
              <button
                type="button"
                onClick={() => void syncBootstrap({showFeedback: true})}
                title={tr('وضع التصفح بدون إنترنت — اضغط للتحديث عند عودة الشبكة', 'Offline mode — tap to sync')}
                className="min-h-[34px] px-2 py-1 rounded-xl bg-[#ffdea8] text-[#271900] text-xs font-bold flex items-center gap-1 whitespace-nowrap"
              >
                <WifiOff className="w-3.5 h-3.5" />
                {isSyncing && <RefreshCw className="w-3 h-3 animate-spin" />}
              </button>
            )}

            <button
              type="button"
              onClick={cycleThemeMode}
              aria-label={tr('تبديل المظهر', 'Cycle theme')}
              title={
                themeMode === 'system'
                  ? tr('المظهر: تلقائي', 'Theme: System')
                  : themeMode === 'light'
                    ? tr('المظهر: نهاري', 'Theme: Light')
                    : tr('المظهر: ليلي', 'Theme: Dark')
              }
              className="hidden sm:flex min-w-[34px] min-h-[34px] rounded-full hover:bg-[#e8f6ff] dark:hover:bg-white/10 items-center justify-center transition-colors"
            >
              {themeMode === 'system' ? (
                <Monitor className="w-4 h-4" />
              ) : themeMode === 'light' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setMoreSheetOpen(true)}
              aria-label={tr('تصفح الأقسام من اليمين', 'Open Right Sections Menu')}
              className="lg:hidden min-w-[36px] min-h-[36px] rounded-full hover:bg-[#e8f6ff] dark:hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Mobile Right-Anchored Horizontal Scrollable Sections Bar */}
        {activeTab !== 'admin-studio' && (
          <nav
            dir={isEn ? 'ltr' : 'rtl'}
            aria-label={tr('تصفح جميع الأقسام', 'Browse All Sections')}
            className="lg:hidden sticky top-[96px] z-25 bg-white/95 dark:bg-[#091813]/95 backdrop-blur-md border-b border-slate-200/70 dark:border-white/10 px-2.5 py-2"
          >
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {mobileHorizontalSections.map((item) => {
                const Icon = item.Icon;
                const isCurrent =
                  activeTab === item.id ||
                  (item.id === 'about-support' &&
                    (activeTab === 'about' || activeTab === 'support' || activeTab === 'about-support'));
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (item.id === 'library') setLibraryInitialFilter('all');
                      navigateTo(item.id);
                    }}
                    className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
                      isCurrent
                        ? 'bg-[#006a46] text-white shadow-xs'
                        : 'bg-[#f4faff] dark:bg-[#112921] text-[#0e1d25] dark:text-slate-200 border border-slate-200/70 dark:border-white/10'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        )}

        {/* Global Top Announcement Banner (Admin Controlled) */}
        {siteAppearance.announcementEnabled && siteAppearance.announcementText && (
          <div className="bg-[#006a46] text-white px-4 py-2 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 text-center">
            <Megaphone className="w-4 h-4 text-amber-300 shrink-0" />
            <span>{siteAppearance.announcementText}</span>
            {siteAppearance.announcementUrl && (
              <a
                href={siteAppearance.announcementUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-amber-200 hover:text-white shrink-0"
              >
                عرض التفاصيل
              </a>
            )}
          </div>
        )}

        {/* Scrollable Content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-6 pb-32 lg:pb-12">
          <div className="max-w-6xl mx-auto">
            {siteAppearance.maintenanceMode && !authToken ? (
              <section className="max-w-xl mx-auto my-12 rounded-3xl bg-white dark:bg-[#0c211a] border border-amber-500/30 p-8 text-center space-y-4 shadow-md">
                <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 flex items-center justify-center mx-auto">
                  <Wrench className="w-7 h-7" />
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#0e1d25] dark:text-white">
                  الموقع في وضع الصيانة والتطوير
                </h1>
                <p className="text-sm text-[#3e4a42] dark:text-slate-300 leading-relaxed">
                  يجري حالياً تحديث المكتبة العلمية والمحتوى الدعوي لتحسين التجربة. سنعود قريباً بإذن الله.
                </p>
                <button
                  type="button"
                  onClick={triggerAdminEntry}
                  className="text-xs font-bold text-[#6e7a71] hover:text-[#006a46] underline"
                >
                  دخول المشرفين
                </button>
              </section>
            ) : (
              <>
                {activeTab === 'home' && (
                  <HomeView
                    posts={posts}
                    twitterQuotes={twitterQuotes}
                    socialLinks={socialLinks}
                    appIcons={appIcons}
                    siteConfig={siteConfig}
                    brandHandle={brandHandle}
                    bookmarkedIds={bookmarkedIds}
                    bookmarkedFatwaCount={bookmarkedFatwaIds.length + savedArchiveFatawa.length}
                    likedIds={likedIds}
                    searchQuery={searchQuery}
                    motherPrayersCount={motherPrayersCount}
                    hasSaidAmen={hasSaidAmen}
                    nafahatMeta={nafahatMeta}
                    isAdmin={Boolean(authToken)}
                    onSayAmen={() => void sayAmen()}
                    onToggleBookmark={toggleBookmark}
                    onToggleLike={(id) => void toggleLike(id)}
                    onCopySada={(post) => void copySadaMessage(post)}
                    onOpenPost={openPostDetail}
                    onShareCard={setShareModalPost}
                    onNavigateTab={(tab) => navigateTo(tab)}
                    onNavigateLibrary={(filter) => {
                      setLibraryInitialFilter(filter);
                      navigateTo('library');
                    }}
                    onNavigateChannels={() => navigateTo('channels')}
                    onNavigateFatawa={() => navigateTo('fatawa')}
                    onNavigateAdhkar={() => {
                      setAdhkarInitialSection('adhkar');
                      navigateTo('adhkar');
                    }}
                    onNavigateBookmarks={() => navigateTo('bookmarks')}
                    onAdminAutoPost={(id) => void handleAdminAutoPost(id)}
                    onAdminEditPost={handleAdminEditPost}
                    onAdminToggleHidePost={(id) => void handleAdminToggleHidePost(id)}
                    onAdminDeletePost={(id) => void handleAdminDeletePost(id)}
                    onNotify={notify}
                  />
                )}

                <Suspense
                  fallback={
                    <div className="rounded-3xl bg-white dark:bg-[#0d211a] border border-slate-200/70 dark:border-white/10 p-10 text-center space-y-2 shadow-xs">
                      <RefreshCw className="w-6 h-6 animate-spin text-[#006a46] dark:text-[#6cdba6] mx-auto" />
                      <p className="text-sm font-bold text-[#006a46] dark:text-[#6cdba6]">
                        {tr('جاري فتح القسم...', 'Loading section...')}
                      </p>
                    </div>
                  }
                >
                {activeTab === 'quran' && (
                  <QuranView initialPage={quranInitialPage} onNotify={notify} />
                )}

                {activeTab === 'wird' && (
                  <DailyWirdView
                    onOpenQuranAtPage={(page) => {
                      setQuranInitialPage(page);
                      navigateTo('quran');
                    }}
                    onNotify={notify}
                  />
                )}

                {activeTab === 'fatawa' && (
                  <FatawaView
                    fatawa={fatawa}
                    siteConfig={siteConfig}
                    bookmarkedFatwaIds={bookmarkedFatwaIds}
                    savedArchiveFatawa={savedArchiveFatawa}
                    onToggleFatwaBookmark={toggleFatwaBookmark}
                    onToggleArchiveFatwaBookmark={toggleArchiveFatwaBookmark}
                    onNavigateBookmarks={() => navigateTo('bookmarks')}
                    onShareCard={setShareModalPost}
                    onNotify={notify}
                  />
                )}

                {activeTab === 'adhkar' && (
                  <AdhkarView
                    siteConfig={siteConfig}
                    initialSection={adhkarInitialSection}
                    motherPrayerText={siteConfig.motherPrayerText}
                    motherPrayersCount={motherPrayersCount}
                    hasSaidAmen={hasSaidAmen}
                    customAdhkar={customAdhkar}
                    onSayAmen={() => void sayAmen()}
                    reminderSettings={reminderSettings}
                    onOpenSettings={() => handleOpenSettingsTab('settings')}
                    onOpenWeeklyActivity={() => handleOpenSettingsTab('weekly-activity')}
                    onShareCard={setShareModalPost}
                    onNotify={notify}
                  />
                )}

                {activeTab === 'library' && (
                  <LibraryView
                    posts={posts}
                    youtubeVideos={youtubeVideos}
                    telegramAudios={telegramAudios}
                    siteConfig={siteConfig}
                    bookmarkedIds={bookmarkedIds}
                    initialFilter={libraryInitialFilter}
                    isAdmin={Boolean(authToken)}
                    customBooks={customBooks}
                    isRefreshingFeeds={isRefreshingFeeds}
                    onRefreshFeeds={() => void syncMediaFeeds({forceRefresh: true, showFeedback: true})}
                    onCopySada={(post) => void copySadaMessage(post)}
                    onOpenPost={openPostDetail}
                    onShareCard={setShareModalPost}
                    onToggleBookmark={toggleBookmark}
                    onNotify={notify}
                  />
                )}

                {activeTab === 'cards' && <DawahCardsView onNotify={notify} />}

                {activeTab === 'mother-oasis' && (
                  <MotherOasisView
                    items={motherOasisItems}
                    motherPrayersCount={motherPrayersCount}
                    hasPrayedForMother={hasSaidAmen}
                    onAmenMother={() => void sayAmen()}
                    onNavigate={navigateTo}
                  />
                )}

                {activeTab === 'poetry' && (
                  <PoetryOasisView
                    poetryItems={poetryItems}
                    permanentArchive={permanentArchive}
                    initialMode="all"
                    onPoetryUpdated={setPoetryItems}
                    onArchiveUpdated={refreshArchive}
                    onNotify={notify}
                  />
                )}

                {activeTab === 'archive' && (
                  <PoetryOasisView
                    poetryItems={poetryItems}
                    permanentArchive={permanentArchive}
                    initialMode="permanent_archive"
                    onPoetryUpdated={setPoetryItems}
                    onArchiveUpdated={refreshArchive}
                    onNotify={notify}
                  />
                )}

                {activeTab === 'videos' && (
                  <section className="max-w-2xl mx-auto my-8 rounded-3xl border border-emerald-800/15 dark:border-white/10 bg-gradient-to-br from-[#f2fbf7] to-[#fffaf0] dark:from-[#0c211a] dark:to-[#17150e] p-8 sm:p-10 text-center space-y-5 shadow-sm">
                    <div className="w-16 h-16 rounded-2xl bg-[#006a46] text-white flex items-center justify-center mx-auto shadow-sm">
                      <Video className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                      <span className="inline-block text-xs font-extrabold text-[#006a46] dark:text-[#6cdba6] bg-[#e2f5ec] dark:bg-emerald-950/60 px-3 py-1 rounded-lg">
                        مكتبة المرئيات العلمية والدعوية
                      </span>
                      <h1 className="text-xl sm:text-2xl font-extrabold text-[#0e1d25] dark:text-white leading-relaxed">
                        قريباً بإذن الله.. يجري تجهيز مكتبة المرئيات العلمية والدعوية
                      </h1>
                      <p className="text-sm text-[#3e4a42] dark:text-slate-300 leading-relaxed max-w-lg mx-auto">
                        نعمل على تنظيم وانتقاء الدروس والخطب والمقاطع المؤثرة لصفوة العلماء والدعاة مع جودة عرض عالية وتصنيف موضوعي ميسّر.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => navigateTo('library')}
                        className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#006a46] hover:bg-[#005235] text-white text-sm font-bold"
                      >
                        تصفح المكتبة والمؤلفات الآن
                      </button>
                      <button
                        type="button"
                        onClick={() => navigateTo('home')}
                        className="min-h-[44px] px-5 py-2.5 rounded-xl bg-white dark:bg-[#081712] border border-slate-200 dark:border-white/10 text-sm font-bold text-[#0e1d25] dark:text-white"
                      >
                        العودة للبوابة الرئيسية
                      </button>
                    </div>
                  </section>
                )}

                {activeTab === 'deaf-mute' && (
                  <DeafMuteView
                    videos={deafMuteVideos}
                    meetConfig={meetConfig}
                    isAdmin={Boolean(authToken)}
                    onAdminQuickAdd={() => {
                      setAdminInitialTab('deaf-mute');
                      setActiveTab('admin-studio');
                    }}
                    onNavigate={navigateTo}
                    onNotify={notify}
                  />
                )}

                {activeTab === 'reviews' && (
                  <ReviewsView
                    reviews={visitorReviews}
                    isAdmin={Boolean(authToken)}
                    authToken={authToken}
                    onReviewsChange={setVisitorReviews}
                    onNotify={notify}
                  />
                )}

                {activeTab === 'channels' && (
                  <ChannelsView
                    socialLinks={socialLinks}
                    siteConfig={siteConfig}
                    onOpenAdminLinks={
                      authToken && adminRole === 'admin'
                        ? () => {
                            setAdminInitialTab('links-icons');
                            setActiveTab('admin-studio');
                          }
                        : undefined
                    }
                    onNotify={notify}
                  />
                )}

                {activeTab === 'bookmarks' && (
                  <BookmarksView
                    posts={posts}
                    fatawa={fatawa}
                    siteConfig={siteConfig}
                    bookmarkedIds={bookmarkedIds}
                    bookmarkedFatwaIds={bookmarkedFatwaIds}
                    savedArchiveFatawa={savedArchiveFatawa}
                    onToggleBookmark={toggleBookmark}
                    onToggleFatwaBookmark={toggleFatwaBookmark}
                    onToggleArchiveFatwaBookmark={toggleArchiveFatwaBookmark}
                    onOpenPost={openPostDetail}
                    onCopySada={(post) => void copySadaMessage(post)}
                    onShareCard={setShareModalPost}
                    onBrowseHome={() => navigateTo('home')}
                    onBrowseFatawa={() => navigateTo('fatawa')}
                    onNotify={notify}
                  />
                )}

                {(activeTab === 'about-support' || activeTab === 'about' || activeTab === 'support') && (
                  <AboutSupportShareView
                    siteConfig={siteConfig}
                    visitor={visitorProfile}
                    visitorsCount={visitorsCount}
                    onlineVisitorsCount={onlineVisitorsCount}
                    clicksCount={clicksCount}
                    motherPrayersCount={motherPrayersCount}
                    initialSubTab={aboutSubTab}
                    onOpenAdminShield={() => (authToken ? navigateTo('admin-studio') : triggerAdminEntry())}
                    onMessageSubmitted={() => {
                      if (authToken) {
                        fetch('/api/admin/messages', {
                          headers: {Authorization: `Bearer ${authToken}`},
                        })
                          .then((res) => (res.ok ? res.json() : null))
                          .then((data: {suggestions?: SuggestionItem[]; volunteers?: VolunteerItem[]} | null) => {
                            if (data) {
                              setSuggestions(data.suggestions || []);
                              setVolunteers(data.volunteers || []);
                            }
                          })
                          .catch(() => undefined);
                      }
                    }}
                    onNotify={notify}
                  />
                )}

                {activeTab === 'post-detail' && selectedPost && (
                  <PostDetailView
                    post={selectedPost}
                    siteConfig={siteConfig}
                    isBookmarked={bookmarkedIds.includes(selectedPost.id)}
                    isLiked={likedIds.includes(selectedPost.id)}
                    isAdmin={Boolean(authToken)}
                    onBack={() => navigateTo(prevTab || 'home')}
                    onToggleBookmark={toggleBookmark}
                    onToggleLike={(id) => void toggleLike(id)}
                    onAddComment={handleAddComment}
                    onCopySada={(post) => void copySadaMessage(post)}
                    onShareCard={setShareModalPost}
                    onAdminEditPost={handleAdminEditPost}
                    onAdminToggleHidePost={(id) => void handleAdminToggleHidePost(id)}
                    onAdminDeletePost={(id) => void handleAdminDeletePost(id)}
                    onAdminAutoPost={(id) => void handleAdminAutoPost(id)}
                    onAdminUpdateComment={handleAdminUpdateComment}
                    onAdminToggleHideComment={handleAdminToggleHideComment}
                    onAdminDeleteComment={handleAdminDeleteComment}
                    onNotify={notify}
                  />
                )}

                {activeTab === 'admin-studio' && authToken && (
                  <AdminStudioView
                    authToken={authToken}
                    adminRole={adminRole}
                    adminUsername={adminUsername}
                    assignedSection={assignedSection}
                    posts={posts}
                    fatawa={fatawa}
                    suggestions={suggestions}
                    volunteers={volunteers}
                    currentGesture={gesture}
                    initialTab={adminInitialTab}
                    initialEditPost={editingPostForAdmin}
                    brandHandle={brandHandle}
                    socialLinks={socialLinks}
                    appIcons={appIcons}
                    siteConfig={siteConfig}
                    siteAppearance={siteAppearance}
                    automationSettings={automationSettings}
                    nafahatMeta={nafahatMeta}
                    visitorsCount={visitorsCount}
                    onlineVisitorsCount={onlineVisitorsCount}
                    clicksCount={clicksCount}
                    onPublishPost={(newPost) => setPosts((prev) => [newPost, ...prev])}
                    onUpdatePost={(updatedPost) => {
                      setPosts((prev) => prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)));
                      setEditingPostForAdmin(null);
                    }}
                    onDeletePost={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
                    onToggleHidePost={(id) => void handleAdminToggleHidePost(id)}
                    onTriggerAutoPost={(id) => void handleAdminAutoPost(id)}
                    onAddFatwa={(newFatwa) => setFatawa((prev) => [newFatwa, ...prev])}
                    onDeleteFatwa={(id) => setFatawa((prev) => prev.filter((f) => f.id !== id))}
                    onSaveSiteConfig={handleSaveSiteConfig}
                    onSaveAppearance={handleSaveAppearance}
                    onSaveAutomation={handleSaveAutomation}
                    onUpdateSettings={handleUpdateSettings}
                    onSaveCustomization={handleSaveCustomization}
                    onRefreshNafahatAI={handleAdminRefreshNafahat}
                    onResetCounters={(resetPosts, nextMotherCount) => {
                      setPosts(resetPosts);
                      setMotherPrayersCount(nextMotherCount);
                      setVisitorsCount(0);
                      setClicksCount(0);
                      setLikedIds([]);
                      setHasSaidAmen(false);
                      try {
                        localStorage.removeItem(AMEN_KEY);
                      } catch {
                        // Ignore
                      }
                    }}
                    onImportState={(payload) => {
                      if (Array.isArray(payload.posts)) setPosts(payload.posts);
                      if (Array.isArray(payload.fatawa)) setFatawa(payload.fatawa);
                      if (Array.isArray(payload.socialLinks)) setSocialLinks(payload.socialLinks);
                      if (payload.appIcons) setAppIcons({...DEFAULT_APP_ICONS, ...payload.appIcons});
                      if (payload.siteConfig) setSiteConfig({...DEFAULT_SITE_CONFIG, ...payload.siteConfig});
                      if (payload.siteAppearance) {
                        setSiteAppearance({...DEFAULT_SITE_APPEARANCE, ...payload.siteAppearance});
                      }
                      if (payload.brandHandle) setBrandHandle(payload.brandHandle);
                    }}
                    onUpdateMessages={(nextSuggestions, nextVolunteers) => {
                      setSuggestions(nextSuggestions);
                      setVolunteers(nextVolunteers);
                    }}
                    motherOasisItems={motherOasisItems}
                    onMotherOasisChange={setMotherOasisItems}
                    deafMuteVideos={deafMuteVideos}
                    onDeafMuteVideosChange={setDeafMuteVideos}
                    customAdhkar={customAdhkar}
                    onCustomAdhkarChange={setCustomAdhkar}
                    customBooks={customBooks}
                    onCustomBooksChange={setCustomBooks}
                    meetConfig={meetConfig}
                    onMeetConfigChange={setMeetConfig}
                    onPreviewSite={() => navigateTo('home')}
                    onExitAdmin={logoutAdmin}
                    onNotify={notify}
                  />
                )}
                </Suspense>
              </>
            )}

            {/* Site Attribution, Online Presence & Official Islamic Disclaimer Footer */}
            {activeTab !== 'admin-studio' && (
              <>
                <div className="mt-10 pt-5 border-t border-slate-200/80 dark:border-white/10">
                  <div className="rounded-2xl bg-white/85 dark:bg-[#091813] border border-slate-200/70 dark:border-white/10 px-5 py-4 text-center space-y-3 shadow-xs">
                    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs font-semibold text-[#006a46] dark:text-[#6cdba6]">
                      <span>{displayAppName}</span>
                      <span aria-hidden="true" className="text-slate-400">·</span>
                      <span dir="ltr">{brandHandle}</span>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <div className="rounded-xl bg-[#f4faff] dark:bg-[#112921] border border-slate-200/70 dark:border-white/10 px-3.5 py-1.5 flex items-center gap-2 text-xs">
                        <Eye className="w-4 h-4 text-[#006a46] dark:text-[#6cdba6] shrink-0" />
                        <span className="text-[#3e4a42] dark:text-slate-300 font-semibold">
                          {tr('زوار الخادم:', 'Server Visits:')}
                        </span>
                        <span className="font-extrabold text-[#006a46] dark:text-[#6cdba6] tabular-nums">
                          {formatNumber(visitorsCount)}
                        </span>
                      </div>

                      <div className="rounded-xl bg-[#eefaf3] dark:bg-[#0d241b] border border-[#008559]/25 dark:border-[#6cdba6]/20 px-3.5 py-1.5 flex items-center gap-2 text-xs">
                        <span
                          className="w-2 h-2 rounded-full bg-[#008559] animate-pulse shrink-0"
                          aria-hidden="true"
                        />
                        <Users className="w-4 h-4 text-[#008559] dark:text-[#6cdba6] shrink-0" />
                        <span className="text-[#3e4a42] dark:text-slate-300 font-semibold">
                          {tr('الموجودين الآن:', 'Online Now:')}
                        </span>
                        <span className="font-extrabold text-[#006a46] dark:text-[#6cdba6] tabular-nums">
                          {formatNumber(onlineVisitorsCount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <SiteFooter
                  onAdminTrigger={() => (authToken ? navigateTo('admin-studio') : triggerAdminEntry())}
                />
              </>
            )}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Tab Bar (5 Thumb-Zone Slots + 40px Android Bottom Safe Area) */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 pb-safe bg-[#FFFFFF]/95 dark:bg-[#091813]/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-white/10"
        aria-label="شريط التنقل السفلي"
      >
        <div className="h-16 grid grid-cols-5 items-center px-1">
          {mobileBottomNav.map((item) => {
            const Icon = item.Icon;
            const isCurrent = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateTo(item.id)}
                className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  isCurrent ? 'text-[#006a46] dark:text-[#6cdba6] font-bold' : 'text-[#3e4a42] dark:text-slate-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] whitespace-nowrap truncate max-w-[68px]">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile Right-Side Sections Drawer (slides from right edge in RTL) */}
      {moreSheetOpen && (
        <div
          dir={isEn ? 'ltr' : 'rtl'}
          className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-start pt-[40px] pb-[40px]"
          onClick={() => setMoreSheetOpen(false)}
        >
          <div
            className="w-[88vw] max-w-sm h-full rounded-e-3xl bg-white dark:bg-[#0b2119] p-5 pb-12 space-y-4 shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-white/10 pb-3">
              <h3 className="text-base font-bold text-[#006a46] dark:text-[#6cdba6]">
                {tr('تصفح الأقسام والإعدادات', 'Sections & Settings')}
              </h3>
              <button
                type="button"
                onClick={() => setMoreSheetOpen(false)}
                aria-label={tr('إغلاق', 'Close')}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Mobile Manual Font Size Controls + Slider */}
              <div className="rounded-2xl bg-[#eef7f3] dark:bg-[#112921] p-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#0e1d25] dark:text-white">
                    تعديل حجم خط التطبيق يدوياً
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-[#006a46] text-white text-[11px] font-extrabold tabular-nums">
                    {activeFontSizePx}px
                  </span>
                </div>
                <input
                  type="range"
                  min={MIN_FONT_SIZE_PX}
                  max={MAX_FONT_SIZE_PX}
                  step={1}
                  value={activeFontSizePx}
                  onChange={(e) => setCustomFontSizePx(Number(e.target.value))}
                  aria-label="تعديل حجم الخط يدوياً"
                  className="w-full accent-[#006a46] cursor-pointer"
                />
                <div className="flex items-center justify-between gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      stepFontSize('up');
                      notify('تم تكبير الخط');
                    }}
                    className="flex-1 min-h-[34px] px-2 rounded-xl bg-white dark:bg-[#091813] text-xs font-extrabold text-[#006a46] dark:text-[#6cdba6]"
                  >
                    A+ تكبير
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      stepFontSize('reset');
                      notify('تم ضبط الخط المتوسط الافتراضي');
                    }}
                    className="flex-1 min-h-[34px] px-2 rounded-xl bg-[#006a46] text-white text-xs font-extrabold"
                  >
                    افتراضي ({DEFAULT_FONT_SIZE_PX}px)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      stepFontSize('down');
                      notify('تم تصغير الخط');
                    }}
                    className="flex-1 min-h-[34px] px-2 rounded-xl bg-white dark:bg-[#091813] text-xs font-extrabold text-[#006a46] dark:text-[#6cdba6]"
                  >
                    A- تصغير
                  </button>
                </div>
              </div>

              {/* Extended Sections Grid in Mobile More */}
              <div className="grid grid-cols-2 gap-2">
                {extendedNav.map((item) => {
                  const Icon = item.Icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigateTo(item.id)}
                      className="min-h-[46px] px-3 py-2.5 rounded-2xl bg-[#f4faff] dark:bg-[#112921] text-xs font-bold flex items-center gap-2 text-[#0e1d25] dark:text-white"
                    >
                      <Icon className="w-4 h-4 text-[#006a46] dark:text-[#6cdba6] shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Visitor Login in Mobile Sheet */}
              <button
                type="button"
                onClick={() => {
                  setMoreSheetOpen(false);
                  setVisitorAuthModalOpen(true);
                }}
                className="w-full min-h-[46px] px-4 py-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-sm font-bold flex items-center justify-between text-[#006a46] dark:text-[#6cdba6]"
              >
                <span className="flex items-center gap-3">
                  <UserCheck className="w-5 h-5" />
                  <span>{visitorProfile ? visitorProfile.name : tr('دخول الزوار / حسابي', 'Visitor Account')}</span>
                </span>
                <span className="text-xs">{visitorProfile ? 'مسجّل' : 'اختياري'}</span>
              </button>

              {authToken && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => navigateTo('admin-studio')}
                    className="min-h-[44px] px-3 rounded-2xl bg-[#071510] text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <Shield className="w-4 h-4" />
                    <span>لوحة المشرف</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMoreSheetOpen(false);
                      logoutAdmin();
                    }}
                    className="min-h-[44px] px-3 rounded-2xl bg-rose-600 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>🚪 خروج المشرف</span>
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  handleToggleLanguage();
                  setMoreSheetOpen(false);
                }}
                className="w-full min-h-[46px] px-4 py-2.5 rounded-2xl bg-[#fffbf2] dark:bg-[#1a2921] border border-[#f2be5e]/45 text-sm font-bold flex items-center justify-between text-[#7c5800] dark:text-[#ffdea8]"
              >
                <span className="flex items-center gap-3">
                  <Globe className="w-5 h-5" />
                  <span>{tr('تغيير لغة الموقع', 'Switch Site Language')}</span>
                </span>
                <span>{isEn ? 'العربية' : 'English'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMoreSheetOpen(false);
                  handleOpenSettingsTab('settings');
                }}
                className="w-full min-h-[46px] px-4 py-2.5 rounded-2xl bg-[#e8f6ff] dark:bg-[#112921] text-sm font-bold flex items-center justify-between text-[#006a46] dark:text-[#6cdba6]"
              >
                <span className="flex items-center gap-3">
                  <BellRing className="w-5 h-5" />
                  <span>{tr('المنبّه الدعوي والإعدادات', 'Reminder & Settings')}</span>
                </span>
                <span className="text-xs">
                  {reminderSettings.enabled ? tr('مفعّل', 'On') : tr('ضبط', 'Configure')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => navigateTo('channels')}
                className="w-full min-h-[46px] px-4 py-2.5 rounded-2xl bg-[#e8f6ff] dark:bg-[#112921] text-sm font-semibold flex items-center gap-3"
              >
                <ChannelsIcon className="w-5 h-5 text-[#006a46] dark:text-[#6cdba6]" />
                <span>{isEn ? 'Official Channels' : siteConfig.navChannels}</span>
              </button>

              {secondaryNav.map((item) => {
                const Icon = item.Icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigateTo(item.id)}
                    className="w-full min-h-[46px] px-4 py-2.5 rounded-2xl bg-[#e8f6ff] dark:bg-[#112921] text-sm font-semibold flex items-center gap-3"
                  >
                    <Icon className="w-5 h-5 text-[#006a46] dark:text-[#6cdba6]" />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              <PWAInstallButton
                variant="box"
                onNotify={notify}
                onShareAppLink={() => void shareAppLink()}
                onAfterAction={() => setMoreSheetOpen(false)}
              />

              <div className="rounded-2xl bg-[#e8f6ff] dark:bg-[#112921] p-3.5 space-y-2">
                <span className="text-xs font-bold text-[#3e4a42] dark:text-slate-300 block">
                  {tr('إعدادات المظهر (تلقائي حسب النظام / نهاري / ليلي)', 'Theme Settings (System / Light / Dark)')}
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      {id: 'system', label: tr('تلقائي', 'Auto'), Icon: Monitor},
                      {id: 'light', label: tr('نهاري', 'Light'), Icon: Sun},
                      {id: 'dark', label: tr('ليلي', 'Dark'), Icon: Moon},
                    ] as const
                  ).map(({id, label, Icon}) => {
                    const active = themeMode === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => applyThemeMode(id)}
                        className={`min-h-[42px] px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                          active
                            ? 'bg-[#006a46] text-white'
                            : 'bg-white dark:bg-[#0a1914] text-[#3e4a42] dark:text-slate-300'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMoreSheetOpen(false);
                  setActiveTab('splash');
                }}
                className="w-full min-h-[46px] px-4 py-2.5 rounded-2xl bg-[#e8f6ff] dark:bg-[#112921] text-sm font-semibold flex items-center gap-3"
              >
                <Sparkles className="w-5 h-5 text-[#7c5800] dark:text-[#f2be5e]" />
                <span>{tr('إعادة عرض شاشة البداية', 'Show Welcome Screen')}</span>
              </button>

              {/* Single Unified Bookmarks Box Placed Last */}
              <button
                type="button"
                onClick={() => navigateTo('bookmarks')}
                className="w-full min-h-[50px] px-4 py-3 rounded-2xl bg-[#f4faff] dark:bg-[#112921] border border-[#006389]/20 dark:border-white/15 text-sm font-bold flex items-center justify-between"
              >
                <span className="flex items-center gap-3">
                  <BookmarksIcon className="w-5 h-5 text-[#006a46] dark:text-[#6cdba6]" />
                  <span>{tr(`${siteConfig.navBookmarks} (مربع المحفوظات الموحد)`, 'Saved & Bookmarks')}</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-lg bg-white dark:bg-white/10 text-xs font-extrabold text-[#006389] dark:text-[#80cfff] tabular-nums">
                  {formatNumber(bookmarkedIds.length + bookmarkedFatwaIds.length + savedArchiveFatawa.length)}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Admin/Editor Username+Password Modal */}
      {loginModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4 pt-[40px] pb-[40px]"
          onClick={() => setLoginModalOpen(false)}
        >
          <form
            onSubmit={(e) => void submitAdminLogin(e)}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#0c211a] p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-[#006a46]/10 text-[#006a46] dark:text-[#6cdba6] flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">{tr('بوابة المشرفين والمدراء', 'Supervisors & Managers Portal')}</h3>
                  <p className="text-xs text-[#6e7a71] dark:text-slate-400">
                    {tr('تسجيل دخول المشرف أو المدير (مخفي عن الزوار)', 'Sign in as Supervisor or Manager')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLoginModalOpen(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                autoFocus
                autoComplete="username"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder={tr('اسم المستخدم', 'Username')}
                className="w-full min-h-[46px] rounded-xl bg-[#e8f6ff] dark:bg-[#112921] px-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#006a46]"
              />
              <input
                type="password"
                autoComplete="current-password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder={tr('كلمة المرور', 'Password')}
                className="w-full min-h-[46px] rounded-xl bg-[#e8f6ff] dark:bg-[#112921] px-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#006a46]"
              />
            </div>

            {loginError && <p className="text-xs text-[#ba1a1a] font-semibold text-center">{loginError}</p>}

            <button
              type="submit"
              disabled={verifyingLogin}
              className="w-full min-h-[48px] rounded-xl bg-[#006a46] hover:bg-[#005235] disabled:opacity-60 text-white font-bold text-sm transition-colors"
            >
              {verifyingLogin ? tr('جاري التحقق...', 'Verifying...') : tr('دخول للوحة التحكم', 'Sign In')}
            </button>
          </form>
        </div>
      )}

      {/* Optional Quick Visitor Account Modal */}
      <VisitorAuthModal
        open={visitorAuthModalOpen}
        visitor={visitorProfile}
        onClose={() => setVisitorAuthModalOpen(false)}
        onSignedIn={(profile) => {
          setVisitorProfile(profile);
          try {
            window.localStorage.setItem(VISITOR_PROFILE_KEY, JSON.stringify(profile));
          } catch {
            // ignore
          }
        }}
        onSignOut={() => {
          setVisitorProfile(null);
          try {
            window.localStorage.removeItem(VISITOR_PROFILE_KEY);
          } catch {
            // ignore
          }
        }}
        onNotify={notify}
      />

      {/* Grounded In-App AI Assistant Chatbot & Direct Admin Inbox Submission */}
      <AIChatWidget
        siteConfig={siteConfig}
        activeTab={activeTab}
        customBooks={customBooks}
        onMessageSubmitted={() => {
          if (authToken) {
            fetch('/api/admin/messages', {
              headers: {Authorization: `Bearer ${authToken}`},
            })
              .then((res) => (res.ok ? res.json() : null))
              .then((data: {suggestions?: SuggestionItem[]; volunteers?: VolunteerItem[]} | null) => {
                if (data) {
                  setSuggestions(data.suggestions || []);
                  setVolunteers(data.volunteers || []);
                }
              })
              .catch(() => undefined);
          }
        }}
        onNotify={notify}
      />

      {/* App Settings, Local Adhkar Notifications & Weekly Activity Modal */}
      <AppSettingsModal
        open={settingsModalOpen}
        initialSection={settingsInitialSection}
        onClose={() => setSettingsModalOpen(false)}
        appName={displayAppName}
        reminderSettings={reminderSettings}
        onChangeReminderSettings={updateReminderSettings}
        themeMode={themeMode}
        onChangeThemeMode={applyThemeMode}
        onToggleLanguage={handleToggleLanguage}
        onOpenAdhkar={() => {
          setAdhkarInitialSection('adhkar');
          navigateTo('adhkar');
        }}
        onNotify={notify}
      />

      {/* Shareable PNG Card Modal */}
      <CardShareModal
        post={shareModalPost}
        brandHandle={brandHandle}
        onClose={() => setShareModalPost(null)}
        onNotify={notify}
      />

      {/* In-App External Site Portal Overlay with Permanent Return & Home Navigation */}
      {externalPortal && (
        <div className="fixed inset-0 z-50 pt-[40px] pb-[40px] bg-white dark:bg-[#060f0d] flex flex-col">
          <div className="bg-[#006a46] text-white px-3 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-md">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setExternalPortal(null)}
                className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-white text-[#006a46] hover:bg-emerald-50 text-xs sm:text-sm font-extrabold flex items-center gap-1.5 shadow-xs"
              >
                <ArrowRight className="w-4 h-4 shrink-0" />
                <span>العودة إلى الموقع</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setExternalPortal(null);
                  navigateTo('home');
                }}
                className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#ffdea8] hover:bg-[#ffc968] text-[#271900] text-xs sm:text-sm font-extrabold flex items-center gap-1.5 shadow-xs"
              >
                <HomeIcon className="w-4 h-4 shrink-0" />
                <span>عودة للرئيسية</span>
              </button>
            </div>

            <div className="flex items-center gap-2 min-w-0 max-w-full">
              <span className="text-xs font-bold text-emerald-100 truncate max-w-[200px] sm:max-w-[320px]">
                {externalPortal.title || externalPortal.url}
              </span>
              <a
                href={externalPortal.url}
                target="_blank"
                rel="noopener noreferrer"
                data-direct-external="true"
                className="min-h-[36px] px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1.5 shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>فتح في المتصفح</span>
              </a>
            </div>
          </div>

          <div className="bg-[#fffbf2] dark:bg-[#112921] border-b border-amber-500/25 px-4 py-1.5 text-[11px] sm:text-xs font-semibold text-[#7c5800] dark:text-[#ffdea8] flex flex-wrap items-center justify-between gap-2">
            <span>
              أنت الآن تتصفح موقعاً خارجياً داخل منصة مواعظ وعبر — يمكنك الضغط على «عودة للرئيسية» في أي لحظة. إذا منع الموقع الخارجي العرض المدمج، اضغط «فتح في المتصفح».
            </span>
          </div>

          <iframe
            src={externalPortal.url}
            title={externalPortal.title || 'موقع خارجي'}
            className="flex-1 w-full border-0 bg-white"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-[116px] lg:bottom-14 left-4 right-4 max-w-md mx-auto z-50 rounded-2xl bg-[#23323b] dark:bg-[#0e2d22] text-white px-4 py-3 shadow-xl flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-[#6cdba6] shrink-0" />
          <span className="text-xs sm:text-sm font-medium flex-1">{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
