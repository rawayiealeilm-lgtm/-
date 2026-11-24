export type NavTab =
  | 'splash'
  | 'home'
  | 'quran'
  | 'wird'
  | 'hisn'
  | 'fatawa'
  | 'adhkar'
  | 'library'
  | 'cards'
  | 'mother-oasis'
  | 'poetry'
  | 'archive'
  | 'reviews'
  | 'videos'
  | 'deaf-mute'
  | 'channels'
  | 'bookmarks'
  | 'about-support'
  | 'about'
  | 'support'
  | 'post-detail'
  | 'admin-studio';

export type LibraryFilterType =
  | 'all'
  | 'hajouri'
  | 'imams'
  | 'students'
  | 'poetry'
  | 'scholarly'
  | 'sada'
  | 'telegram'
  | 'youtube';

export type ThemeMode = 'system' | 'light' | 'dark';
export type Language = 'ar' | 'en';
export type CardTheme = 'emerald' | 'azure' | 'gold' | 'midnight';
export type MediaType = 'quote' | 'sada' | 'video' | 'audio';
export type AdminGesture = 'long_press' | 'multi_tap';
export type AdminRole = 'admin' | 'editor' | 'supervisor';
export type AdminSectionScope =
  | 'all'
  | 'posts'
  | 'fatawa'
  | 'mother-oasis'
  | 'deaf-mute'
  | 'adhkar-books'
  | 'live-support';

export type MeetVisibilityMode =
  | 'hidden_admin_only'
  | 'deaf_mute_invited'
  | 'all_subscribers';

export interface AdminMeetConfig {
  visibility: MeetVisibilityMode;
  activeRoomUrl: string;
  roomLabel?: string;
  updatedAt?: string;
}

export interface LiveSupportMessage {
  id: string;
  senderRole: 'visitor' | 'admin' | 'system';
  senderName: string;
  text: string;
  meetInviteUrl?: string;
  createdAt: string;
}

export interface LiveSupportSession {
  id: string;
  visitorName: string;
  topic: 'general' | 'deaf_mute' | 'interview' | 'ai_escalation';
  ticketNumber?: string;
  isDeafMute?: boolean;
  meetInviteUrl?: string;
  status: 'open' | 'closed';
  createdAt: string;
  updatedAt: string;
  messages: LiveSupportMessage[];
}

export type EmblemVariant = 'pinwheel' | 'crescent' | 'dome' | 'star' | 'book';

export type ColorScheme = 'sky' | 'slate' | 'rose' | 'emerald' | 'amber' | 'cyan';

export interface ScholarlySectionLink {
  id: string;
  siteId: 'sh_yahia' | 'alilmia';
  labelAr: string;
  labelEn: string;
  descAr: string;
  descEn: string;
  url: string;
}

export interface ScholarlySiteItem {
  id: string;
  siteId: 'sh_yahia' | 'alilmia';
  siteNameAr: string;
  siteNameEn: string;
  kindLabelAr: string;
  kindLabelEn: string;
  title: string;
  url: string;
}

export interface ScholarlyHubPayload {
  sections: {
    shYahia: ScholarlySectionLink[];
    alilmia: ScholarlySectionLink[];
  };
  liveItems: ScholarlySiteItem[];
  fetchedAt: string;
  source: 'live' | 'cache' | 'seed';
}

export type FatwaScholarId = 'hajouri' | 'wadaei' | 'binbaz' | 'uthaymeen' | 'albani';

export interface ListeningDay {
  day: string;
  listens: number;
}

export interface PostComment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
  hidden?: boolean;
}

export interface Post {
  id: string;
  title: string;
  excerpt: string;
  body: string;
  author: string;
  sourceLabel: string;
  category: string;
  mediaType: MediaType;
  duration?: string;
  durationSeconds?: number;
  platformTag?: string;
  youtubeUrl?: string;
  cardTheme: CardTheme;
  likes: number;
  commentsCount: number;
  comments?: PostComment[];
  publishedAtLabel: string;
  createdAt: string;
  hidden?: boolean;
  syncedPlatforms?: string[];
  listeningTrend?: ListeningDay[];
}

export interface FatwaItem {
  id: string;
  scholarId: FatwaScholarId;
  scholarName: string;
  category: string;
  question: string;
  answer: string;
  source: string;
  featured?: boolean;
  createdAt: string;
}

export interface SavedArchiveFatwa {
  id: string;
  url: string;
  title: string;
  question: string;
  answer?: string;
  siteName: string;
  siteId?: 'sh_yahia' | 'alilmia';
  kindLabel?: string;
  savedAt: string;
}

export interface HisnItem {
  id: string;
  chapter:
    | 'waking_sleep'
    | 'home_clothing'
    | 'mosque_prayer'
    | 'distress_debt'
    | 'travel_nature'
    | 'ruqyah_illness';
  title: string;
  text: string;
  targetCount: number;
  source: string;
  fadl?: string;
}

export interface SocialLink {
  id: string;
  name: string;
  handle: string;
  followers: string;
  description: string;
  url: string;
  iconId: string;
  colorScheme: ColorScheme;
  enabled: boolean;
}

export interface AppIcons {
  brandEmblem: EmblemVariant;
  home: string;
  quran: string;
  hisn: string;
  fatawa: string;
  adhkar: string;
  channels: string;
  library: string;
  bookmarks: string;
  about: string;
  support: string;
  dailyWisdom: string;
  motherPrayer: string;
}

export interface SiteConfig {
  appName: string;
  appTagline: string;
  heroBadge: string;
  heroGreeting: string;
  heroWisdomText: string;
  heroWisdomAuthor: string;
  heroPrimaryBtn: string;
  heroCardBtn: string;
  motherBadge: string;
  motherTitle: string;
  motherPrayerText: string;
  motherAmenBtn: string;
  motherShareBtn: string;
  navHome: string;
  navQuran: string;
  navHisn: string;
  navFatawa: string;
  navAdhkar: string;
  navLibrary: string;
  navChannels: string;
  navBookmarks: string;
  navAbout: string;
  navSupport: string;
  sadaTitle: string;
  sadaSubtitle: string;
  sadaBroadcastBtn: string;
  fatawaTitle: string;
  fatawaSubtitle: string;
  hisnTitle: string;
  hisnSubtitle: string;
  channelsTitle: string;
  channelsSubtitle: string;
  aboutTitle: string;
  aboutSubtitle: string;
  supportTitle: string;
  supportSubtitle: string;
  supportEmail: string;
  modernUxClause: string;
  readMoreBtn: string;
  exportCardBtn: string;
}

export interface NafahatMeta {
  lastUpdatedDate: string;
  lastUpdatedAt: string;
  source: 'ai' | 'manual' | 'seed';
}

export interface YouTubeVideoItem {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  publishedAt: string;
  views: number;
}

export interface TelegramAudioItem {
  id: string;
  msgId: string;
  title: string;
  speaker: string;
  url: string;
  embedUrl: string;
  category: string;
}

export interface TwitterQuoteItem {
  id: string;
  text: string;
  handle: string;
  tag: string;
  url: string;
}

export type MessageInboxStatus = 'new' | 'reviewed' | 'resolved';

export interface SuggestionItem {
  id: string;
  ticketNumber?: string;
  visitorId?: string;
  visitorWhatsapp?: string;
  whatsappNotifiedAt?: string;
  type: string;
  senderName?: string;
  text: string;
  contact?: string;
  source?: 'assistant' | 'support_page';
  status?: MessageInboxStatus;
  adminNote?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface VolunteerItem {
  id: string;
  ticketNumber?: string;
  visitorId?: string;
  visitorWhatsapp?: string;
  whatsappNotifiedAt?: string;
  senderName?: string;
  field: string;
  hours: string;
  skills: string;
  contact: string;
  source?: 'assistant' | 'support_page';
  status?: MessageInboxStatus;
  adminNote?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PdfBookItem {
  id: string;
  title: string;
  author: string;
  category: string;
  pages: number;
  sizeLabel: string;
  summary: string;
  pdfUrl: string;
}

export interface ClassicDawahCardLine {
  text: string;
  color: '#111827' | '#1E3A8A' | '#991B1B' | '#065F46' | '#B45309';
}

export interface ClassicDawahCard {
  id: string;
  speakerLine: string;
  lines: ClassicDawahCardLine[];
  source: string;
  category: string;
}

export interface PoetryAnecdoteItem {
  id: string;
  kind: 'islamic_poetry' | 'anecdote';
  title: string;
  author: string;
  summary: string;
  body: string;
  sourceUrl?: string;
  isAiGenerated?: boolean;
  createdAt: string;
}

export interface PermanentArchiveItem {
  id: string;
  title: string;
  body: string;
  excerpt: string;
  author: string;
  sectionType: 'nafahat' | 'wisdom' | 'poetry' | 'anecdote' | 'sermon';
  sourceLabel: string;
  publishedDate: string;
  createdAt: string;
}

export interface VisitorProfile {
  id: string;
  provider: 'google' | 'facebook' | 'email';
  name: string;
  email?: string;
  whatsapp?: string;
  createdAt: string;
}

export interface VisitorTicketSummary {
  id: string;
  ticketNumber: string;
  kind: 'suggestion' | 'volunteer';
  categoryLabel: string;
  senderName?: string;
  text: string;
  status: MessageInboxStatus;
  adminNote?: string;
  whatsappNotifiedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface VisitorReviewItem {
  id: string;
  name: string;
  rating: number;
  comment: string;
  role?: string;
  hidden?: boolean;
  createdAt: string;
}

export type MotherOasisChapter = 'books' | 'lectures' | 'stories';

export interface MotherOasisItem {
  id: string;
  chapter: MotherOasisChapter;
  title: string;
  body: string;
  signature: string;
  createdAt: string;
}

export interface SadaScholarProfile {
  id: string;
  name: string;
  title: string;
  category: 'scholar' | 'poet';
}

export interface IndexedPdfBookMeta {
  id: string;
  section: 'hajouri' | 'imams' | 'students';
  title: string;
  author: string;
  fileName: string;
  sizeBytes: number;
  createdAt: string;
}

export interface AutomationSettings {
  autoPostWebhookUrl: string;
  enabledPlatforms: {
    facebook: boolean;
    whatsapp: boolean;
    x: boolean;
  };
  adminNotifyWebhookUrl: string;
  telegramBotToken: string;
  telegramChatId: string;
  emailJsServiceId: string;
  emailJsTemplateId: string;
  emailJsPublicKey: string;
}

export type SiteBackgroundPreset =
  | 'default'
  | 'emerald_mist'
  | 'warm_parchment'
  | 'sky_calm'
  | 'deep_forest';

export interface SiteAppearanceConfig {
  backgroundPreset: SiteBackgroundPreset;
  brightness: number;
  announcementEnabled: boolean;
  announcementText: string;
  announcementUrl?: string;
  maintenanceMode: boolean;
}

export interface DeafMuteVideoItem {
  id: string;
  title: string;
  description: string;
  benefitText?: string;
  youtubeUrl?: string;
  status: 'published' | 'upcoming';
  category: string;
  managerName: string;
  createdAt: string;
}

export interface CustomAdhkarItem {
  id: string;
  chapterId: string;
  title?: string;
  text: string;
  fadl?: string;
  targetCount: number;
  source: string;
  createdAt?: string;
}

export interface CustomBookItem {
  id: string;
  section: 'hajouri' | 'imams' | 'students';
  title: string;
  author: string;
  category: string;
  summary?: string;
  pdfUrl: string;
  pages?: number;
  sizeLabel?: string;
  createdAt?: string;
}

export interface BootstrapSnapshot {
  posts: Post[];
  fatawa: FatwaItem[];
  socialLinks: SocialLink[];
  appIcons: AppIcons;
  siteConfig: SiteConfig;
  brandHandle: string;
  motherPrayersCount: number;
  visitorsCount: number;
  onlineVisitorsCount?: number;
  clicksCount: number;
  nafahatMeta?: NafahatMeta;
  poetryItems?: PoetryAnecdoteItem[];
  lastPoetryAiDate?: string;
  permanentArchive?: PermanentArchiveItem[];
  motherOasisItems?: MotherOasisItem[];
  visitorReviews?: VisitorReviewItem[];
  deafMuteVideos?: DeafMuteVideoItem[];
  customAdhkar?: CustomAdhkarItem[];
  customBooks?: CustomBookItem[];
  siteAppearance?: SiteAppearanceConfig;
  meetConfig?: AdminMeetConfig;
  gesture: AdminGesture;
  cachedAt: string;
}

export interface QuranAyah {
  n: number;
  t: string;
  j: number;
  p: number;
  s: boolean;
}

export interface QuranSurah {
  n: number;
  name: string;
  rev: string;
  ayahs: QuranAyah[];
}

export interface AdhkarItem {
  id: string;
  category:
    | 'morning'
    | 'evening'
    | 'prophetic_duas'
    | 'quran_duas'
    | 'family_muslims_duas'
    | 'after_prayer'
    | 'sleep'
    | 'general';
  text: string;
  targetCount: number;
  source: string;
  fadl?: string;
}

export interface DailyEngagementBucket {
  date: string;
  visitors: number;
  clicks: number;
  sermonReads: number;
  sermonLikes: number;
  sermonComments: number;
  sermonShares: number;
  adhkarTaps: number;
  adhkarCompletions: number;
  motherAmens: number;
}

export interface MonthlyAnalyticsPoint {
  date: string;
  label: string;
  visitors: number;
  clicks: number;
  sermonsTotal: number;
  adhkarTotal: number;
  sermonReads: number;
  sermonLikes: number;
  sermonComments: number;
  sermonShares: number;
  adhkarTaps: number;
  adhkarCompletions: number;
  motherAmens: number;
}

export interface AdminMonthlyAnalytics {
  days: number;
  generatedAt: string;
  totals: {
    visitorsCount: number;
    onlineVisitorsCount?: number;
    clicksCount: number;
    periodVisitors: number;
    periodClicks: number;
    sermonsEngagement: number;
    adhkarEngagement: number;
    sermonReads: number;
    sermonLikes: number;
    sermonComments: number;
    sermonShares: number;
    adhkarTaps: number;
    adhkarCompletions: number;
    motherAmens: number;
  };
  dailySeries: MonthlyAnalyticsPoint[];
  sermonCategories: Array<{category: string; count: number; engagement: number}>;
  adhkarCategories: Array<{id: string; label: string; taps: number}>;
  topPosts: Array<{
    id: string;
    title: string;
    category: string;
    reads: number;
    likes: number;
    commentsCount: number;
  }>;
}

export type HajouriLessonCategory =
  | 'aqeedah'
  | 'hadith'
  | 'fiqh'
  | 'tafsir'
  | 'seerah_lang'
  | 'archive';

export interface HajouriLessonItem {
  id: string;
  title: string;
  bookAuthor: string;
  category: HajouriLessonCategory;
  categoryLabel: string;
  scope: string;
  summary: string;
  highlights: string[];
  officialUrl: string;
}
