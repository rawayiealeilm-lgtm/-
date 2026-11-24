import 'dotenv/config';
import {GoogleGenAI, ThinkingLevel, Type} from '@google/genai';
import crypto from 'crypto';
import express, {type NextFunction, type Request, type Response} from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import {fileURLToPath} from 'url';
import type {
  AdminGesture,
  AdminMonthlyAnalytics,
  AdminRole,
  AppIcons,
  AutomationSettings,
  CardTheme,
  DailyEngagementBucket,
  FatwaItem,
  FatwaScholarId,
  Language,
  MediaType,
  MessageInboxStatus,
  MonthlyAnalyticsPoint,
  MotherOasisChapter,
  MotherOasisItem,
  NafahatMeta,
  PermanentArchiveItem,
  PoetryAnecdoteItem,
  Post,
  ScholarlyHubPayload,
  ScholarlySiteItem,
  SiteAppearanceConfig,
  SiteConfig,
  SocialLink,
  SuggestionItem,
  TelegramAudioItem,
  TwitterQuoteItem,
  VisitorProfile,
  VisitorReviewItem,
  VisitorTicketSummary,
  VolunteerItem,
  YouTubeVideoItem,
} from './src/types.ts';
import {INITIAL_VISITOR_REVIEWS} from './src/data/dawahCards.ts';
import {
  ADHKAR_CATEGORIES,
  ALILMIA_SECTIONS,
  DEFAULT_APP_ICONS,
  DEFAULT_SITE_CONFIG,
  FATWA_SCHOLARS,
  HAJOURI_LESSONS,
  INITIAL_FATAWA,
  INITIAL_MOTHER_OASIS_ITEMS,
  INITIAL_POSTS,
  INITIAL_SOCIAL_LINKS,
  INITIAL_TELEGRAM_AUDIOS,
  INITIAL_TWITTER_QUOTES,
  INITIAL_YOUTUBE_VIDEOS,
  MOTHER_OASIS_SIGNATURE,
  POETRY_ANECDOTES_ITEMS,
  SADA_AL_KHAIR_SCHOLARS,
  SADA_SUNNAH_POETS,
  SH_YAHIA_SECTIONS,
  createDefaultTrend,
} from './src/data/seed.ts';

interface StoredAccount {
  username: string;
  role: AdminRole;
  passwordHash: string;
}

interface StoredVisitorRecord extends VisitorProfile {
  bookmarks?: string[];
  adhkar?: unknown;
  adhkarLifetime?: unknown;
  wird?: unknown;
}

interface StoreState {
  posts: Post[];
  fatawa: FatwaItem[];
  motherPrayersCount: number;
  visitorsCount: number;
  clicksCount: number;
  lastNafahatDate: string;
  lastNafahatUpdatedAt: string;
  lastNafahatSource: 'ai' | 'manual' | 'seed';
  lastPoetryAiDate: string;
  poetryItems: PoetryAnecdoteItem[];
  permanentArchive: PermanentArchiveItem[];
  motherOasisItems: MotherOasisItem[];
  visitorReviews: VisitorReviewItem[];
  visitorAccounts: Record<string, StoredVisitorRecord>;
  nextTicketSeq: number;
  automationSettings: AutomationSettings;
  siteAppearance: SiteAppearanceConfig;
  brandHandle: string;
  socialLinks: SocialLink[];
  appIcons: AppIcons;
  siteConfig: SiteConfig;
  gesture: AdminGesture;
  authSecret: string;
  accounts: StoredAccount[];
  suggestions: SuggestionItem[];
  volunteers: VolunteerItem[];
  dailyStats: Record<string, DailyEngagementBucket>;
  adhkarCategoryStats: Record<string, number>;
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(`mawaedh_salt_2026:${password}`).digest('hex');
}

function safeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

const DEFAULT_ACCOUNTS: StoredAccount[] = [
  {username: 'moalwbri', role: 'admin', passwordHash: hashPassword('715315541')},
  {username: 'ax1ax70', role: 'editor', passwordHash: hashPassword('123456')},
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, 'data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');

function getInitialPoetryItems(): PoetryAnecdoteItem[] {
  return POETRY_ANECDOTES_ITEMS.map((entry, idx) => ({
    id: entry.id,
    kind: entry.id.startsWith('anecdote') ? 'anecdote' : 'islamic_poetry',
    title: entry.title,
    author: entry.author,
    summary: entry.summary,
    body: entry.body,
    sourceUrl: entry.sourceUrl,
    isAiGenerated: false,
    createdAt: new Date(Date.now() - idx * 3600_000).toISOString(),
  }));
}

const DEFAULT_AUTOMATION_SETTINGS: AutomationSettings = {
  autoPostWebhookUrl: '',
  enabledPlatforms: {
    facebook: true,
    whatsapp: true,
    x: true,
  },
  adminNotifyWebhookUrl: '',
  telegramBotToken: '',
  telegramChatId: '',
  emailJsServiceId: '',
  emailJsTemplateId: '',
  emailJsPublicKey: '',
};

const DEFAULT_SITE_APPEARANCE: SiteAppearanceConfig = {
  backgroundPreset: 'default',
  brightness: 100,
  announcementEnabled: false,
  announcementText: '',
  announcementUrl: '',
  maintenanceMode: false,
};

function getDefaultStore(): StoreState {
  return {
    posts: INITIAL_POSTS,
    fatawa: INITIAL_FATAWA,
    motherPrayersCount: 0,
    visitorsCount: 0,
    clicksCount: 0,
    lastNafahatDate: '',
    lastNafahatUpdatedAt: '',
    lastNafahatSource: 'seed',
    lastPoetryAiDate: '',
    poetryItems: getInitialPoetryItems(),
    permanentArchive: [],
    motherOasisItems: INITIAL_MOTHER_OASIS_ITEMS,
    visitorReviews: INITIAL_VISITOR_REVIEWS,
    visitorAccounts: {},
    nextTicketSeq: 1001,
    automationSettings: DEFAULT_AUTOMATION_SETTINGS,
    siteAppearance: DEFAULT_SITE_APPEARANCE,
    brandHandle: '@ax1ax70',
    socialLinks: INITIAL_SOCIAL_LINKS,
    appIcons: DEFAULT_APP_ICONS,
    siteConfig: DEFAULT_SITE_CONFIG,
    gesture: 'long_press',
    authSecret: crypto.randomBytes(32).toString('hex'),
    accounts: DEFAULT_ACCOUNTS,
    suggestions: [],
    volunteers: [],
    dailyStats: {},
    adhkarCategoryStats: {},
  };
}

function loadStore(): StoreState {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, {recursive: true});
    }
    if (!fs.existsSync(STORE_PATH)) {
      const initial = getDefaultStore();
      fs.writeFileSync(STORE_PATH, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<StoreState>;
    const defaults = getDefaultStore();
    return {
      posts: (() => {
        if (!Array.isArray(parsed.posts) || parsed.posts.length === 0) {
          return defaults.posts;
        }
        const existingIds = new Set(parsed.posts.map((p) => p.id));
        const merged = [...parsed.posts];
        for (const seedPost of INITIAL_POSTS) {
          if (!existingIds.has(seedPost.id)) {
            merged.push(seedPost);
          }
        }
        return merged;
      })(),
      fatawa: (() => {
        if (!Array.isArray(parsed.fatawa) || parsed.fatawa.length === 0) {
          return defaults.fatawa;
        }
        const existingIds = new Set(parsed.fatawa.map((f) => f.id));
        const merged = [...parsed.fatawa];
        for (const seedFatwa of INITIAL_FATAWA) {
          if (!existingIds.has(seedFatwa.id)) {
            merged.push(seedFatwa);
          }
        }
        return merged;
      })(),
      motherPrayersCount:
        typeof parsed.motherPrayersCount === 'number'
          ? parsed.motherPrayersCount
          : defaults.motherPrayersCount,
      visitorsCount:
        typeof parsed.visitorsCount === 'number' ? parsed.visitorsCount : defaults.visitorsCount,
      clicksCount: typeof parsed.clicksCount === 'number' ? parsed.clicksCount : defaults.clicksCount,
      lastNafahatDate: typeof parsed.lastNafahatDate === 'string' ? parsed.lastNafahatDate : '',
      lastNafahatUpdatedAt:
        typeof parsed.lastNafahatUpdatedAt === 'string' ? parsed.lastNafahatUpdatedAt : '',
      lastNafahatSource:
        parsed.lastNafahatSource === 'ai' || parsed.lastNafahatSource === 'manual'
          ? parsed.lastNafahatSource
          : 'seed',
      brandHandle:
        typeof parsed.brandHandle === 'string' && parsed.brandHandle.trim()
          ? parsed.brandHandle
          : defaults.brandHandle,
      socialLinks: (() => {
        const list =
          Array.isArray(parsed.socialLinks) && parsed.socialLinks.length > 0
            ? parsed.socialLinks
                .filter((l) => l.id !== 'x_alt')
                .map((l) =>
                  l.id === 'x' &&
                  (l.handle === '@ax1ax70' ||
                    l.url.includes('twitter.com/ax1ax70') ||
                    l.url.includes('x.com/ax1ax70') ||
                    l.name.includes('تويتر') ||
                    l.description.includes('تويتر'))
                    ? {
                        ...l,
                        name: 'منصة إكس (X) · الحساب الرسمي',
                        handle: '@ax1ax71',
                        description:
                          'حساب مواعظ وعبر الرسمي عبر منصة إكس (X) لنشر السلاسل والتغريدات الدعوية الموثقة والتأملات القرآنية.',
                        url: 'https://x.com/ax1ax71',
                      }
                    : l.name.includes('تويتر') || l.description.includes('تويتر')
                      ? {
                          ...l,
                          name: l.name.replace(/تويتر/g, 'منصة إكس (X)'),
                          description: l.description.replace(/تويتر/g, 'منصة إكس (X)'),
                        }
                      : l,
                )
            : [...defaults.socialLinks];
        for (const seedLink of INITIAL_SOCIAL_LINKS) {
          if ((seedLink.id === 'sh_yahia' || seedLink.id === 'alilmia') && !list.some((x) => x.id === seedLink.id)) {
            list.push(seedLink);
          }
        }
        return list;
      })(),
      appIcons: parsed.appIcons ? {...DEFAULT_APP_ICONS, ...parsed.appIcons} : defaults.appIcons,
      siteConfig: parsed.siteConfig
        ? {
            ...DEFAULT_SITE_CONFIG,
            ...parsed.siteConfig,
            supportEmail:
              typeof parsed.siteConfig.supportEmail === 'string' &&
              parsed.siteConfig.supportEmail.trim() &&
              parsed.siteConfig.supportEmail.trim().toLowerCase() !==
                Buffer.from('cmF3YXlpZWFsZWlsbUBnbWFpbC5jb20=', 'base64').toString()
                ? parsed.siteConfig.supportEmail.trim()
                : DEFAULT_SITE_CONFIG.supportEmail,
            modernUxClause:
              typeof parsed.siteConfig.modernUxClause === 'string' && parsed.siteConfig.modernUxClause.trim()
                ? parsed.siteConfig.modernUxClause.trim()
                : DEFAULT_SITE_CONFIG.modernUxClause,
            motherBadge:
              !parsed.siteConfig.motherBadge || parsed.siteConfig.motherBadge.includes('وقفة بر')
                ? DEFAULT_SITE_CONFIG.motherBadge
                : parsed.siteConfig.motherBadge,
            navHisn:
              !parsed.siteConfig.navHisn || parsed.siteConfig.navHisn.includes('حصن')
                ? DEFAULT_SITE_CONFIG.navHisn
                : parsed.siteConfig.navHisn,
            navAdhkar:
              !parsed.siteConfig.navAdhkar ||
              parsed.siteConfig.navAdhkar === 'الأذكار' ||
              parsed.siteConfig.navAdhkar === 'أدعية وأذكار' ||
              parsed.siteConfig.navAdhkar.includes('حصن')
                ? 'الأذكار والأدعية الجامعة'
                : parsed.siteConfig.navAdhkar,
            hisnTitle:
              !parsed.siteConfig.hisnTitle || parsed.siteConfig.hisnTitle.includes('حصن')
                ? DEFAULT_SITE_CONFIG.hisnTitle
                : parsed.siteConfig.hisnTitle,
          }
        : defaults.siteConfig,
      gesture: parsed.gesture === 'multi_tap' ? 'multi_tap' : 'long_press',
      authSecret:
        typeof parsed.authSecret === 'string' && parsed.authSecret.length >= 16
          ? parsed.authSecret
          : defaults.authSecret,
      accounts:
        Array.isArray(parsed.accounts) && parsed.accounts.length >= 2
          ? parsed.accounts
          : defaults.accounts,
      lastPoetryAiDate: typeof parsed.lastPoetryAiDate === 'string' ? parsed.lastPoetryAiDate : '',
      poetryItems:
        Array.isArray(parsed.poetryItems) && parsed.poetryItems.length > 0
          ? parsed.poetryItems
          : defaults.poetryItems,
      permanentArchive: Array.isArray(parsed.permanentArchive) ? parsed.permanentArchive : [],
      motherOasisItems:
        Array.isArray(parsed.motherOasisItems) && parsed.motherOasisItems.length > 0
          ? parsed.motherOasisItems
          : defaults.motherOasisItems,
      visitorReviews:
        Array.isArray(parsed.visitorReviews) && parsed.visitorReviews.length > 0
          ? parsed.visitorReviews
          : defaults.visitorReviews,
      visitorAccounts:
        parsed.visitorAccounts && typeof parsed.visitorAccounts === 'object'
          ? parsed.visitorAccounts
          : {},
      nextTicketSeq:
        typeof parsed.nextTicketSeq === 'number' && parsed.nextTicketSeq >= 1001
          ? parsed.nextTicketSeq
          : 1001,
      automationSettings: parsed.automationSettings
        ? {
            ...DEFAULT_AUTOMATION_SETTINGS,
            ...parsed.automationSettings,
            enabledPlatforms: {
              ...DEFAULT_AUTOMATION_SETTINGS.enabledPlatforms,
              ...(parsed.automationSettings.enabledPlatforms || {}),
            },
          }
        : DEFAULT_AUTOMATION_SETTINGS,
      siteAppearance: parsed.siteAppearance
        ? {
            ...DEFAULT_SITE_APPEARANCE,
            ...parsed.siteAppearance,
          }
        : DEFAULT_SITE_APPEARANCE,
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      volunteers: Array.isArray(parsed.volunteers) ? parsed.volunteers : [],
      dailyStats:
        parsed.dailyStats && typeof parsed.dailyStats === 'object' ? parsed.dailyStats : {},
      adhkarCategoryStats:
        parsed.adhkarCategoryStats && typeof parsed.adhkarCategoryStats === 'object'
          ? parsed.adhkarCategoryStats
          : {},
    };
  } catch {
    return getDefaultStore();
  }
}

function getDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function createEmptyDailyBucket(date: string): DailyEngagementBucket {
  return {
    date,
    visitors: 0,
    clicks: 0,
    sermonReads: 0,
    sermonLikes: 0,
    sermonComments: 0,
    sermonShares: 0,
    adhkarTaps: 0,
    adhkarCompletions: 0,
    motherAmens: 0,
  };
}

function recordDailyMetric(
  field: keyof Omit<DailyEngagementBucket, 'date'>,
  amount = 1,
  dateKey = getDateKey(),
): void {
  const safeAmount = Math.max(0, Math.min(200, Math.floor(amount)));
  if (safeAmount <= 0) return;
  const bucket = store.dailyStats[dateKey]
    ? {...createEmptyDailyBucket(dateKey), ...store.dailyStats[dateKey]}
    : createEmptyDailyBucket(dateKey);
  bucket[field] = (bucket[field] || 0) + safeAmount;
  store.dailyStats[dateKey] = bucket;

  // Keep up to 90 most recent days to bound JSON size cleanly
  const keys = Object.keys(store.dailyStats).sort();
  if (keys.length > 90) {
    for (const oldKey of keys.slice(0, keys.length - 90)) {
      delete store.dailyStats[oldKey];
    }
  }
}

function saveStore(state: StoreState): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, {recursive: true});
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(state, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to persist store.json:', err);
  }
}

let store = loadStore();

function signToken(username: string, role: AdminRole): string {
  const payloadObj = {
    u: username,
    r: role,
    // Long-lived session until admin manually signs out
    exp: Date.now() + 365 * 24 * 60 * 60 * 1000,
  };
  const payload = Buffer.from(JSON.stringify(payloadObj), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', store.authSecret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(token: string): {username: string; role: AdminRole} | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payload, sig] = parts;
    const expectedSig = crypto.createHmac('sha256', store.authSecret).update(payload).digest('base64url');
    if (!safeEqualHex(sig, expectedSig)) return null;
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      u?: string;
      r?: AdminRole;
      exp?: number;
    };
    if (!decoded.u || (decoded.r !== 'admin' && decoded.r !== 'editor') || !decoded.exp) return null;
    if (Date.now() > decoded.exp) return null;
    return {username: decoded.u, role: decoded.r};
  } catch {
    return null;
  }
}

interface AuthedRequest extends Request {
  authUser?: {username: string; role: AdminRole};
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const verified = token ? verifyToken(token) : null;
  if (!verified) {
    res.status(401).json({error: 'يلزم تسجيل الدخول كمسؤول أو محرر لإتمام هذا الإجراء'});
    return;
  }
  req.authUser = verified;
  next();
}

function requirePrimaryAdmin(req: AuthedRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.authUser?.role !== 'admin') {
      res.status(403).json({error: 'هذه الصلاحية مخصصة للمسؤول الرئيسي فقط'});
      return;
    }
    next();
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({limit: '25mb'}));

  // Open CORS & APK/PWA packaging compatibility headers
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  // Android TWA / APK Digital Asset Links open endpoint
  app.get('/.well-known/assetlinks.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    const customLinks = process.env.ASSET_LINKS_JSON;
    if (customLinks) {
      try {
        res.json(JSON.parse(customLinks));
        return;
      } catch {
        // Fallback to empty array if malformed
      }
    }
    res.json([]);
  });

  const activePresence = new Map<string, number>();
  const PRESENCE_TTL_MS = 90_000;

  function updateAndCountOnline(opts?: {touchSessionId?: string; removeSessionId?: string}): number {
    const now = Date.now();
    for (const [sid, ts] of activePresence.entries()) {
      if (now - ts > PRESENCE_TTL_MS) {
        activePresence.delete(sid);
      }
    }
    const cleanRemove = opts?.removeSessionId?.trim().slice(0, 80);
    if (cleanRemove) {
      activePresence.delete(cleanRemove);
    }
    const cleanTouch = opts?.touchSessionId?.trim().slice(0, 80);
    if (cleanTouch) {
      activePresence.set(cleanTouch, now);
    }
    return activePresence.size;
  }

  let nafahatSyncInFlight: Promise<{
    updated: boolean;
    heroWisdomText: string;
    heroWisdomAuthor: string;
    siteConfig: SiteConfig;
    nafahatMeta: NafahatMeta;
    post?: Post;
  }> | null = null;

  async function generateDailyNafahatWithAI(opts?: {force?: boolean}): Promise<{
    updated: boolean;
    heroWisdomText: string;
    heroWisdomAuthor: string;
    siteConfig: SiteConfig;
    nafahatMeta: NafahatMeta;
    post?: Post;
  }> {
    const todayKey = getDateKey();
    if (!opts?.force && store.lastNafahatDate === todayKey && store.lastNafahatSource === 'ai') {
      return {
        updated: false,
        heroWisdomText: store.siteConfig.heroWisdomText,
        heroWisdomAuthor: store.siteConfig.heroWisdomAuthor,
        siteConfig: store.siteConfig,
        nafahatMeta: {
          lastUpdatedDate: store.lastNafahatDate,
          lastUpdatedAt: store.lastNafahatUpdatedAt,
          source: store.lastNafahatSource,
        },
      };
    }

    if (nafahatSyncInFlight) {
      return nafahatSyncInFlight;
    }

    nafahatSyncInFlight = (async () => {
      const apiKey = process.env.GEMINI_API_KEY?.trim();
      if (!apiKey) {
        throw new Error('مفتاح الذكاء الاصطناعي (GEMINI_API_KEY) غير متوفر في إعدادات الخادم');
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {headers: {'User-Agent': 'aistudio-build'}},
      });

      const recentTitles = store.posts
        .slice(0, 12)
        .map((p) => p.title)
        .join(' | ');

      const prompt = `أنت عالم ومحرر محتوى دعوي متمكن على منهج أهل السنة والجماعة. أنشئ الإصدار اليومي الشامل لتطبيق «مواعظ وعبر» ليوم ${todayKey}.
الشروط الشرعية والعلمية الصارمة:
1. التزم تماماً بالقرآن الكريم أو صحيح البخاري ومسلم والسنن الثابتة (التي صححها أئمة الحديث كالبخاري ومسلم والألباني والوادعي) أو أقوال أئمة السلف وعلماء السنة الموثوقين (كابن تيمية وابن القيم وابن رجب وابن كثير والذهبي وابن باز وابن عثيمين). يُمنع تماماً ذكر أي حديث ضعيف أو موضوع أو قصة مكذوبة أو بدون سند موثق.
2. أنشئ موعظة البطاقة الرئيسية (wisdomText) مركّزة وبليغة بين علامتي اقتباس «...» (أقل من 185 حرفاً) مع ذكر قائلها/مصدرها بدقة في (wisdomAuthor).
3. أنشئ ٤ مواد يومية متكاملة (dailyItems) تتجدد يومياً وتغطي التصنيفات التالية بتنوّع وتفصيل مفيد:
   - المادة ١ (قصص وعبر): قصة حقيقية موثقة من القرآن الكريم أو الصحيحين أو سير السلف الصالح مع بيان العبرة العملية منها وذكر المصدر الموثوق.
   - المادة ٢ (إيمانيات أو تزكية النفس): موعظة يومية رصينة في تجديد الإيمان وإصلاح القلب والخشوع.
   - المادة ٣ (فقه أو أخلاق): فائدة فقهية ميسّرة أو أدب شرعي نبوي من صحيح السنة.
   - المادة ٤ (خواطر قصيرة أو صدى الخير): رسالة دعوية بليغة جاهزة للنشر عبر خدمة صدى الخير.
4. لا تكرر المواضيع القريبة التالية: ${recentTitles || 'لا يوجد'}.`;

      const dailyConfig = {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            wisdomText: {
              type: Type.STRING,
              description: 'موعظة اليوم المختصرة والعميقة بين علامتي اقتباس «...»',
            },
            wisdomAuthor: {
              type: Type.STRING,
              description: 'مصدر الموعظة أو قائلها بدقة علمية',
            },
            dailyItems: {
              type: Type.ARRAY,
              description: 'أربع مواد يومية موثقة في قصص وعبر والمواعظ والتصنيفات',
              items: {
                type: Type.OBJECT,
                properties: {
                  title: {type: Type.STRING, description: 'عنوان عربي بليغ وواضح'},
                  excerpt: {type: Type.STRING, description: 'خلاصة قصيرة من سطرين'},
                  body: {type: Type.STRING, description: 'نص متكامل من فقرتين إلى أربع فقرات'},
                  category: {
                    type: Type.STRING,
                    description: 'واحد من: قصص وعبر، إيمانيات، تزكية النفس، فقه، أخلاق، خواطر قصيرة، صدى الخير',
                  },
                  sourceReference: {
                    type: Type.STRING,
                    description: 'المصدر الموثوق بدقة مثل: صحيح البخاري أو مدارج السالكين لابن القيم',
                  },
                },
                required: ['title', 'excerpt', 'body', 'category', 'sourceReference'],
              },
            },
          },
          required: ['wisdomText', 'wisdomAuthor', 'dailyItems'],
        },
      };

      let response;
      try {
        response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: prompt,
          config: dailyConfig,
        });
      } catch {
        response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: prompt,
          config: dailyConfig,
        });
      }

      const rawText =
        response.candidates?.[0]?.content?.parts
          ?.filter((part) => typeof part.text === 'string' && !part.thought)
          .map((part) => part.text)
          .join('') || '';

      if (!rawText.trim()) {
        throw new Error('لم تُرجع خدمة الذكاء الاصطناعي نصاً صالحاً للنفحة اليومية');
      }

      const parsed = JSON.parse(rawText) as {
        wisdomText?: string;
        wisdomAuthor?: string;
        dailyItems?: Array<{
          title?: string;
          excerpt?: string;
          body?: string;
          category?: string;
          sourceReference?: string;
        }>;
      };

      const rawWisdom = (parsed.wisdomText || '').trim();
      const wisdomText = rawWisdom.startsWith('«') ? rawWisdom : `«${rawWisdom.replace(/^[«"]|[»"]$/g, '')}»`;
      const wisdomAuthor = (parsed.wisdomAuthor || 'نفحات متجددة · مواعظ وعبر').trim();
      const allowedCats = [
        'قصص وعبر',
        'إيمانيات',
        'تزكية النفس',
        'فقه',
        'أخلاق',
        'خواطر قصيرة',
        'صدى الخير',
      ];

      if (!wisdomText || wisdomText.length < 10) {
        throw new Error('المحتوى الناتج من الذكاء الاصطناعي غير مكتمل');
      }

      const nowIso = new Date().toISOString();
      store.siteConfig = {
        ...store.siteConfig,
        heroWisdomText: wisdomText,
        heroWisdomAuthor: wisdomAuthor,
      };
      store.lastNafahatDate = todayKey;
      store.lastNafahatUpdatedAt = nowIso;
      store.lastNafahatSource = 'ai';

      const themes: CardTheme[] = ['emerald', 'gold', 'azure', 'midnight'];
      const incomingItems = Array.isArray(parsed.dailyItems) ? parsed.dailyItems.slice(0, 6) : [];
      const generatedPosts: Post[] = incomingItems
        .filter((it) => (it.body || '').trim().length > 15 && (it.title || '').trim().length > 4)
        .map((it, idx) => {
          const cat = it.category && allowedCats.includes(it.category.trim()) ? it.category.trim() : 'إيمانيات';
          const ref = (it.sourceReference || wisdomAuthor).trim();
          const postId = idx === 0 ? `ai_nafahat_${todayKey}` : `ai_daily_${todayKey}_${idx}`;
          const postBody = (it.body || '').trim();
          return {
            id: postId,
            title: (it.title || '').trim(),
            excerpt: (it.excerpt || postBody.slice(0, 140)).trim(),
            body: postBody,
            author: ref,
            sourceLabel: cat === 'قصص وعبر' ? 'قصص وعبر · ذكاء اصطناعي موثق' : 'إصدار يومي موثق بالذكاء الاصطناعي',
            category: cat,
            mediaType: cat === 'صدى الخير' ? 'sada' : 'quote',
            platformTag: cat === 'صدى الخير' ? 'صدى الخير' : undefined,
            cardTheme: themes[idx % themes.length],
            likes: 0,
            commentsCount: 0,
            comments: [],
            publishedAtLabel: 'تحديث اليوم',
            createdAt: new Date(Date.now() - idx * 60_000).toISOString(),
            syncedPlatforms: ['telegram', 'x', 'whatsapp', 'instagram'],
            listeningTrend: createDefaultTrend(0),
          };
        });

      for (const genPost of [...generatedPosts].reverse()) {
        const existingIdx = store.posts.findIndex((p) => p.id === genPost.id);
        if (existingIdx >= 0) {
          store.posts[existingIdx] = {
            ...store.posts[existingIdx],
            ...genPost,
            likes: store.posts[existingIdx].likes,
            comments: store.posts[existingIdx].comments,
            commentsCount: store.posts[existingIdx].commentsCount,
            listeningTrend: store.posts[existingIdx].listeningTrend,
          };
        } else {
          store.posts = [genPost, ...store.posts];
        }
      }

      // Keep feed caches aligned with today's refresh
      mediaFeedCache.cacheDate = '';
      scholarlyCache.cacheDate = '';
      liveFatwaArchiveCache.cacheDate = '';

      // Permanently archive AI-generated Nafahat & daily wisdom without deleting past entries
      const archiveAdditions: PermanentArchiveItem[] = [
        {
          id: `arch_wisdom_${todayKey}`,
          title: `نفحة وحكمة يوم ${todayKey}`,
          body: wisdomText,
          excerpt: wisdomText,
          author: wisdomAuthor,
          sectionType: 'wisdom',
          sourceLabel: 'الأرشيف الشامل · النفحة اليومية',
          publishedDate: todayKey,
          createdAt: nowIso,
        },
        ...generatedPosts.map((gp) => ({
          id: `arch_${gp.id}`,
          title: gp.title,
          body: gp.body,
          excerpt: gp.excerpt,
          author: gp.author,
          sectionType: 'nafahat' as const,
          sourceLabel: gp.category,
          publishedDate: todayKey,
          createdAt: gp.createdAt,
        })),
      ];
      const existingArchIds = new Set(store.permanentArchive.map((a) => a.id));
      for (const arch of [...archiveAdditions].reverse()) {
        if (!existingArchIds.has(arch.id)) {
          store.permanentArchive = [arch, ...store.permanentArchive];
          existingArchIds.add(arch.id);
        }
      }

      saveStore(store);

      const primaryDailyPost = generatedPosts[0] || store.posts[0];
      return {
        updated: true,
        heroWisdomText: store.siteConfig.heroWisdomText,
        heroWisdomAuthor: store.siteConfig.heroWisdomAuthor,
        siteConfig: store.siteConfig,
        nafahatMeta: {
          lastUpdatedDate: store.lastNafahatDate,
          lastUpdatedAt: store.lastNafahatUpdatedAt,
          source: store.lastNafahatSource,
        },
        post: primaryDailyPost,
        posts: store.posts,
      };
    })();

    try {
      return await nafahatSyncInFlight;
    } finally {
      nafahatSyncInFlight = null;
    }
  }

  // SSRF-safe external webhook URL validator (blocks private/loopback/link-local hosts)
  function validateExternalWebhookUrl(rawUrl: string): URL | null {
    const trimmed = rawUrl.trim();
    if (!trimmed) return null;
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
      const host = parsed.hostname.toLowerCase();
      if (
        host === 'localhost' ||
        host === '0.0.0.0' ||
        host === '::1' ||
        host.endsWith('.local') ||
        host.endsWith('.internal') ||
        host.startsWith('127.') ||
        host.startsWith('10.') ||
        host.startsWith('192.168.') ||
        host.startsWith('169.254.') ||
        /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
        /^fc00:|^fd00:|^fe80:/i.test(host)
      ) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  async function dispatchSafeWebhook(rawUrl: string, payload: Record<string, unknown>): Promise<boolean> {
    const valid = validateExternalWebhookUrl(rawUrl);
    if (!valid) return false;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(valid.toString(), {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'User-Agent': 'Mawaedh-Bot/1.0'},
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return res.ok;
    } catch {
      return false;
    }
  }

  async function dispatchAdminTicketAlert(summary: string, details: Record<string, unknown>): Promise<void> {
    const cfg = store.automationSettings;
    if (cfg.adminNotifyWebhookUrl) {
      void dispatchSafeWebhook(cfg.adminNotifyWebhookUrl, {event: 'new_ticket', summary, ...details});
    }
    if (cfg.telegramBotToken?.trim() && cfg.telegramChatId?.trim()) {
      const token = cfg.telegramBotToken.trim();
      const chatId = cfg.telegramChatId.trim();
      if (/^\d+:[A-Za-z0-9_-]{20,}$/.test(token)) {
        try {
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({chat_id: chatId, text: summary}),
          });
        } catch {
          // silent background delivery
        }
      }
    }
    if (cfg.emailJsServiceId?.trim() && cfg.emailJsTemplateId?.trim() && cfg.emailJsPublicKey?.trim()) {
      try {
        await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            service_id: cfg.emailJsServiceId.trim(),
            template_id: cfg.emailJsTemplateId.trim(),
            user_id: cfg.emailJsPublicKey.trim(),
            template_params: {message: summary, ...details},
          }),
        });
      } catch {
        // silent background delivery
      }
    }
  }

  let poetrySyncInFlight: Promise<{updated: boolean; item?: PoetryAnecdoteItem; poetryItems: PoetryAnecdoteItem[]}> | null = null;

  async function generatePoetryWithAI(opts?: {force?: boolean; preferredKind?: 'islamic_poetry' | 'anecdote'}): Promise<{
    updated: boolean;
    item?: PoetryAnecdoteItem;
    poetryItems: PoetryAnecdoteItem[];
  }> {
    const todayKey = getDateKey();
    if (!opts?.force && store.lastPoetryAiDate === todayKey) {
      return {updated: false, poetryItems: store.poetryItems};
    }
    if (poetrySyncInFlight) return poetrySyncInFlight;

    poetrySyncInFlight = (async () => {
      const apiKey = process.env.GEMINI_API_KEY?.trim();
      if (!apiKey) {
        throw new Error('مفتاح الذكاء الاصطناعي (GEMINI_API_KEY) غير متوفر');
      }
      const ai = new GoogleGenAI({apiKey, httpOptions: {headers: {'User-Agent': 'aistudio-build'}}});
      const kind = opts?.preferredKind || (store.poetryItems.length % 2 === 0 ? 'anecdote' : 'islamic_poetry');
      const existingTitles = store.poetryItems.slice(0, 12).map((p) => p.title).join(' | ');
      const prompt =
        kind === 'anecdote'
          ? `أنت أديب وباحث في التراث العربي والإسلامي. أنشئ طُرفة أو نادرة عربية تاريخية راقية ومبهجة (من نوادر العرب والبلغاء والقضاة كالشعبي وإياس بن معاوية والأصمعي) للترويح المباح دون كذب أو استهزاء بالدين أو فحش أو أي محاذير شرعية. لا تكرر العناوين التالية: ${existingTitles}.`
          : `أنت أديب وشاعر فصيح على منهج أهل السنة. أنشئ قصيدة أو أبياتاً شعرية إسلامية بليغة وموزونة في الزهد أو الحكمة أو مكارم الأخلاق أو شرف العلم بأسلوب شعري أصيل مع ضبط الكلمات. لا تكرر العناوين التالية: ${existingTitles}.`;

      const schemaConfig = {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {type: Type.STRING, description: 'عنوان أدبي جميل وواضح'},
            author: {type: Type.STRING, description: 'المصدر الأدبي أو القائل الموثق'},
            summary: {type: Type.STRING, description: 'ملخص موجز من سطر واحد'},
            body: {type: Type.STRING, description: 'النص الكامل للأبيات أو الطرفة'},
          },
          required: ['title', 'author', 'summary', 'body'],
        },
      };

      let response;
      try {
        response = await ai.models.generateContent({model: 'gemini-4-hydrogen', contents: prompt, config: schemaConfig});
      } catch {
        response = await ai.models.generateContent({model: 'gemini-3.1-flash-lite', contents: prompt, config: schemaConfig});
      }

      const rawText =
        response.candidates?.[0]?.content?.parts
          ?.filter((part) => typeof part.text === 'string' && !part.thought)
          .map((part) => part.text)
          .join('') || '';
      const parsed = JSON.parse(rawText) as {title?: string; author?: string; summary?: string; body?: string};
      const title = (parsed.title || '').trim();
      const bodyText = (parsed.body || '').trim();
      if (!title || !bodyText) {
        throw new Error('تعذر توليد مادة أدبية مكتملة');
      }

      const nowIso = new Date().toISOString();
      const item: PoetryAnecdoteItem = {
        id: `ai_${kind}_${Date.now().toString(36)}`,
        kind,
        title,
        author: (parsed.author || 'واحة الشعر والطرائف · مواعظ وعبر').trim(),
        summary: (parsed.summary || bodyText.slice(0, 120)).trim(),
        body: bodyText,
        isAiGenerated: true,
        createdAt: nowIso,
      };
      store.poetryItems = [item, ...store.poetryItems];
      store.lastPoetryAiDate = todayKey;

      const archiveItem: PermanentArchiveItem = {
        id: `arch_${item.id}`,
        title: item.title,
        body: item.body,
        excerpt: item.summary,
        author: item.author,
        sectionType: kind === 'anecdote' ? 'anecdote' : 'poetry',
        sourceLabel: kind === 'anecdote' ? 'واحة الشعر والطرائف · نوادر' : 'واحة الشعر والطرائف · شعر إسلامي',
        publishedDate: todayKey,
        createdAt: nowIso,
      };
      store.permanentArchive = [archiveItem, ...store.permanentArchive];
      saveStore(store);
      return {updated: true, item, poetryItems: store.poetryItems};
    })();

    try {
      return await poetrySyncInFlight;
    } finally {
      poetrySyncInFlight = null;
    }
  }

  // Public bootstrap (100% open to all visitors; admin sees hidden items too when authenticated)
  app.get('/api/bootstrap', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
    const isAuthed = Boolean(token && verifyToken(token));

    const visiblePosts = isAuthed
      ? store.posts
      : store.posts
          .filter((p) => !p.hidden)
          .map((p) => ({
            ...p,
            comments: Array.isArray(p.comments) ? p.comments.filter((c) => !c.hidden) : [],
            commentsCount: Array.isArray(p.comments)
              ? p.comments.filter((c) => !c.hidden).length
              : p.commentsCount,
          }));

    const visibleReviews = isAuthed
      ? store.visitorReviews
      : store.visitorReviews.filter((r) => !r.hidden);

    res.json({
      posts: visiblePosts,
      fatawa: store.fatawa,
      gesture: store.gesture,
      motherPrayersCount: store.motherPrayersCount,
      visitorsCount: store.visitorsCount,
      onlineVisitorsCount: updateAndCountOnline(),
      clicksCount: store.clicksCount,
      nafahatMeta: {
        lastUpdatedDate: store.lastNafahatDate || '',
        lastUpdatedAt: store.lastNafahatUpdatedAt || '',
        source: store.lastNafahatSource || 'seed',
      },
      poetryItems: store.poetryItems,
      lastPoetryAiDate: store.lastPoetryAiDate || '',
      permanentArchive: store.permanentArchive,
      motherOasisItems: store.motherOasisItems,
      visitorReviews: visibleReviews,
      siteAppearance: store.siteAppearance,
      brandHandle: store.brandHandle,
      socialLinks: store.socialLinks,
      appIcons: store.appIcons,
      siteConfig: store.siteConfig,
    });
  });

  // Poetry & Anecdotes Oasis routes + Permanent AI Archive
  app.get('/api/poetry', (_req, res) => {
    res.json({poetryItems: store.poetryItems, lastPoetryAiDate: store.lastPoetryAiDate});
  });

  app.post('/api/poetry/daily-sync', async (_req, res) => {
    try {
      const result = await generatePoetryWithAI({force: false});
      res.json(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'تعذر مزامنة واحة الشعر اليومية';
      res.status(503).json({error: msg, poetryItems: store.poetryItems});
    }
  });

  app.post('/api/poetry/generate', async (req, res) => {
    const {kind} = (req.body || {}) as {kind?: 'islamic_poetry' | 'anecdote'};
    try {
      const result = await generatePoetryWithAI({
        force: true,
        preferredKind: kind === 'islamic_poetry' ? 'islamic_poetry' : 'anecdote',
      });
      res.json(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'تعذر توليد طُرفة جديدة بالذكاء الاصطناعي';
      res.status(503).json({error: msg});
    }
  });

  app.get('/api/archive', (_req, res) => {
    res.json({permanentArchive: store.permanentArchive});
  });

  // Visitor Reviews (with Admin Hide/Delete moderation)
  app.get('/api/reviews', (req, res) => {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
    const isAuthed = Boolean(token && verifyToken(token));
    res.json({
      reviews: isAuthed ? store.visitorReviews : store.visitorReviews.filter((r) => !r.hidden),
    });
  });

  app.post('/api/reviews', (req, res) => {
    const {name, rating, comment, role} = req.body as {
      name?: string;
      rating?: number;
      comment?: string;
      role?: string;
    };
    const cleanName = (name || '').trim().slice(0, 60);
    const cleanComment = (comment || '').trim().slice(0, 900);
    const numRating = Math.min(5, Math.max(1, Math.round(Number(rating) || 5)));
    if (!cleanName || !cleanComment) {
      res.status(400).json({error: 'يرجى كتابة الاسم والتعليق'});
      return;
    }
    const item: VisitorReviewItem = {
      id: `rev_${Date.now().toString(36)}`,
      name: cleanName,
      rating: numRating,
      comment: cleanComment,
      role: typeof role === 'string' && role.trim() ? role.trim().slice(0, 60) : 'زائر الموقع',
      hidden: false,
      createdAt: new Date().toISOString(),
    };
    store.visitorReviews = [item, ...store.visitorReviews];
    saveStore(store);
    res.status(201).json({
      review: item,
      reviews: store.visitorReviews.filter((r) => !r.hidden),
    });
  });

  app.patch('/api/admin/reviews/:id/visibility', requireAuth, (req, res) => {
    const {id} = req.params;
    const {hidden} = (req.body || {}) as {hidden?: boolean};
    const idx = store.visitorReviews.findIndex((r) => r.id === id);
    if (idx === -1) {
      res.status(404).json({error: 'التقييم غير موجود'});
      return;
    }
    const nextHidden = typeof hidden === 'boolean' ? hidden : !store.visitorReviews[idx].hidden;
    store.visitorReviews[idx] = {...store.visitorReviews[idx], hidden: nextHidden};
    saveStore(store);
    res.json({reviews: store.visitorReviews});
  });

  app.delete('/api/admin/reviews/:id', requireAuth, (req, res) => {
    const {id} = req.params;
    store.visitorReviews = store.visitorReviews.filter((r) => r.id !== id);
    saveStore(store);
    res.json({reviews: store.visitorReviews});
  });

  // Mother Oasis Routes (STRICTLY TEXT-ONLY — NEVER STORES AUDIO FILES OR RECORDINGS)
  app.get('/api/mother-oasis', (_req, res) => {
    res.json({items: store.motherOasisItems});
  });

  app.post('/api/admin/mother-oasis', requireAuth, (req, res) => {
    const {chapter, title, body} = (req.body || {}) as {
      chapter?: MotherOasisChapter;
      title?: string;
      body?: string;
    };
    const validChapter: MotherOasisChapter =
      chapter === 'lectures' || chapter === 'stories' ? chapter : 'books';
    const cleanTitle = (title || '').trim().slice(0, 140);
    const cleanBody = (body || '').trim().slice(0, 20000);
    if (!cleanTitle || !cleanBody) {
      res.status(400).json({error: 'العنوان والنص مطلوبان للنشر في واحة الداعية الفاضلة'});
      return;
    }
    const item: MotherOasisItem = {
      id: `mo_${validChapter}_${Date.now().toString(36)}`,
      chapter: validChapter,
      title: cleanTitle,
      body: cleanBody,
      signature: MOTHER_OASIS_SIGNATURE,
      createdAt: new Date().toISOString(),
    };
    store.motherOasisItems = [item, ...store.motherOasisItems];
    saveStore(store);
    res.status(201).json({item, items: store.motherOasisItems});
  });

  app.delete('/api/admin/mother-oasis/:id', requireAuth, (req, res) => {
    const {id} = req.params;
    store.motherOasisItems = store.motherOasisItems.filter((it) => it.id !== id);
    saveStore(store);
    res.json({items: store.motherOasisItems});
  });

  app.post('/api/admin/mother-oasis/transcribe', requireAuth, async (req, res) => {
    const {audioBase64, mimeType} = (req.body || {}) as {
      audioBase64?: string;
      mimeType?: string;
    };
    const cleanBase64 = typeof audioBase64 === 'string' ? audioBase64.replace(/^data:[^;]+;base64,/, '').trim() : '';
    const cleanMime = typeof mimeType === 'string' && mimeType.startsWith('audio/') ? mimeType : 'audio/mp3';
    if (!cleanBase64) {
      res.status(400).json({error: 'يرجى اختيار ملف صوتي صالح للتفريغ النصي'});
      return;
    }
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      res.status(503).json({error: 'مفتاح الذكاء الاصطناعي (GEMINI_API_KEY) غير متوفر في الخادم'});
      return;
    }
    try {
      const ai = new GoogleGenAI({apiKey, httpOptions: {headers: {'User-Agent': 'aistudio-build'}}});
      const promptText =
        'فرّغ هذا التسجيل الصوتي إلى نص عربي فصيح واضح ومنظم بعلامات الترقيم والفقرات بدقة تامة دون زيادة أو تعليق منك، واكتب فقط النص المفرغ.';
      const contentsPayload = {
        parts: [
          {inlineData: {mimeType: cleanMime, data: cleanBase64}},
          {text: promptText},
        ],
      };
      let response;
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.5-transcribe',
          contents: contentsPayload,
        });
      } catch {
        response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: contentsPayload,
        });
      }
      const text =
        response.candidates?.[0]?.content?.parts
          ?.filter((p) => typeof p.text === 'string' && !p.thought)
          .map((p) => p.text)
          .join('')
          .trim() ||
        response.text?.trim() ||
        '';
      if (!text) {
        res.status(502).json({error: 'لم يتمكن المحرك من استخراج نص من الملف الصوتي'});
        return;
      }
      // Audio payload was processed strictly in memory and is NEVER saved on disk
      res.json({text});
    } catch {
      res.status(503).json({error: 'تعذر تفريغ الملف الصوتي حالياً، يرجى المحاولة بعد لحظات'});
    }
  });

  app.post('/api/admin/mother-oasis/format', requireAuth, async (req, res) => {
    const {text} = (req.body || {}) as {text?: string};
    const cleanText = typeof text === 'string' ? text.trim().slice(0, 15000) : '';
    if (!cleanText) {
      res.status(400).json({error: 'النص المراد تنسيقه فارغ'});
      return;
    }
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      res.status(503).json({error: 'مفتاح الذكاء الاصطناعي (GEMINI_API_KEY) غير متوفر في الخادم'});
      return;
    }
    try {
      const ai = new GoogleGenAI({apiKey, httpOptions: {headers: {'User-Agent': 'aistudio-build'}}});
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `صحح الأخطاء الإملائية الطفيفة ونظّم علامات الترقيم والفقرات في هذا النص الدعوي العربي مع الحفاظ التام على أسلوب الكاتبة وكلماتها ومعانيها دون حذف أو إضافة أفكار جديدة، وأرجع النص المنسق فقط:\n\n${cleanText}`,
        config: {thinkingConfig: {thinkingLevel: ThinkingLevel.LOW}},
      });
      const formattedText =
        response.candidates?.[0]?.content?.parts
          ?.filter((p) => typeof p.text === 'string' && !p.thought)
          .map((p) => p.text)
          .join('')
          .trim() ||
        response.text?.trim() ||
        cleanText;
      res.json({formattedText});
    } catch {
      res.status(503).json({error: 'تعذر تنسيق النص بالذكاء الاصطناعي حالياً'});
    }
  });

  // Verified Quran Multi-Mufassir & 7-Language Tafsir Proxy
  const tafsirCache = new Map<string, {text: string; editionLabel: string}>();

  app.get('/api/quran/tafsir', async (req, res) => {
    const surah = Number(req.query.surah);
    const ayah = Number(req.query.ayah);
    const mufassir = String(req.query.mufassir || 'muyassar');
    const lang = String(req.query.lang || 'ar');

    if (!Number.isInteger(surah) || surah < 1 || surah > 114 || !Number.isInteger(ayah) || ayah < 1) {
      res.status(400).json({error: 'رقم السورة أو الآية غير صحيح'});
      return;
    }

    const arSlugs: Record<string, {slug: string; label: string}> = {
      muyassar: {slug: 'ar-tafsir-muyassar', label: 'التفسير الميسر'},
      saadi: {slug: 'ar-tafseer-al-saddi', label: 'تفسير السعدي'},
      ibn_kathir: {slug: 'ar-tafsir-ibn-kathir', label: 'تفسير ابن كثير'},
      tabari: {slug: 'ar-tafsir-al-tabari', label: 'تفسير الطبري'},
      baghawi: {slug: 'ar-tafsir-al-baghawi', label: 'تفسير البغوي'},
    };
    const chosenMufassir = arSlugs[mufassir] || arSlugs.muyassar;
    const cacheKey = `${chosenMufassir.slug}:${lang}:${surah}:${ayah}`;
    const cached = tafsirCache.get(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const fetchSpa5kTafsir = async (slug: string): Promise<string | null> => {
      try {
        const url = `https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/${slug}/${surah}/${ayah}.json`;
        const r = await fetch(url, {headers: {'User-Agent': 'Mawaedh-Ibar/1.0'}});
        if (!r.ok) return null;
        const j = (await r.json()) as {text?: string};
        return typeof j.text === 'string' && j.text.trim() ? j.text.trim() : null;
      } catch {
        return null;
      }
    };

    if (lang === 'ar') {
      const arText = await fetchSpa5kTafsir(chosenMufassir.slug);
      if (!arText) {
        res.status(502).json({error: 'تعذر جلب التفسير المعتمد للآية حالياً'});
        return;
      }
      const payload = {text: arText, editionLabel: chosenMufassir.label};
      if (tafsirCache.size >= 800) tafsirCache.clear();
      tafsirCache.set(cacheKey, payload);
      res.json(payload);
      return;
    }

    // Native localized editions map for exact language accuracy
    const localizedDirect: Record<string, {slug: string; label: string}> = {
      'en:ibn_kathir': {slug: 'en-tafisr-ibn-kathir', label: 'Tafsir Ibn Kathir (English)'},
      'en:muyassar': {slug: 'en-tafsir-al-mukhtasar', label: 'Al-Mukhtasar (English)'},
      'ur:saadi': {slug: 'ur-tafsir-as-saadi-urdu', label: 'تفسیر السعدی (اردو)'},
      'ur:ibn_kathir': {slug: 'ur-tafseer-ibn-e-kaseer', label: 'تفسیر ابن کثیر (اردو)'},
      'id:saadi': {slug: 'id-tafsir-as-saadi', label: 'Tafsir As-Saadi (Indonesia)'},
      'tr:saadi': {slug: 'turkish-tafsir-as-saadi-turkish', label: 'Es-Sadi Tefsiri (Türkçe)'},
    };
    const localizedFallbackByLang: Record<string, {slug: string; label: string; langName: string}> = {
      en: {slug: 'en-tafsir-al-mukhtasar', label: 'English', langName: 'English'},
      fr: {slug: 'french-mokhtasar', label: 'Français (Al-Mokhtasar)', langName: 'French'},
      ur: {slug: 'ur-tafsir-as-saadi-urdu', label: 'اردو (تفسیر السعدی)', langName: 'Urdu'},
      id: {slug: 'indonesian-mokhtasar', label: 'Bahasa Indonesia (Al-Mukhtasar)', langName: 'Indonesian'},
      tr: {slug: 'turkish-mokhtasar', label: 'Türkçe (El-Muhtasar)', langName: 'Turkish'},
      es: {slug: 'spanish-mokhtasar', label: 'Español (Al-Mukhtasar)', langName: 'Spanish'},
    };

    const directKey = `${lang}:${mufassir}`;
    if (localizedDirect[directKey]) {
      const directText = await fetchSpa5kTafsir(localizedDirect[directKey].slug);
      if (directText) {
        const payload = {text: directText, editionLabel: localizedDirect[directKey].label};
        if (tafsirCache.size >= 800) tafsirCache.clear();
        tafsirCache.set(cacheKey, payload);
        res.json(payload);
        return;
      }
    }

    const targetLangMeta = localizedFallbackByLang[lang] || localizedFallbackByLang.en;
    const arBaseText = await fetchSpa5kTafsir(chosenMufassir.slug);
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (arBaseText && apiKey) {
      try {
        const ai = new GoogleGenAI({apiKey, httpOptions: {headers: {'User-Agent': 'aistudio-build'}}});
        const trRes = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `Translate this authentic Arabic Quranic Tafsir (${chosenMufassir.label}) faithfully and clearly into ${targetLangMeta.langName}, returning only the translated Tafsir text:\n\n${arBaseText.slice(0, 3500)}`,
          config: {thinkingConfig: {thinkingLevel: ThinkingLevel.LOW}},
        });
        const translated = trRes.text?.trim();
        if (translated) {
          const payload = {
            text: translated,
            editionLabel: `${chosenMufassir.label} · ${targetLangMeta.label}`,
          };
          if (tafsirCache.size >= 800) tafsirCache.clear();
          tafsirCache.set(cacheKey, payload);
          res.json(payload);
          return;
        }
      } catch {
        // Fallback to verified Mokhtasar in target language
      }
    }

    const fallbackText = await fetchSpa5kTafsir(targetLangMeta.slug);
    if (fallbackText) {
      const payload = {text: fallbackText, editionLabel: targetLangMeta.label};
      if (tafsirCache.size >= 800) tafsirCache.clear();
      tafsirCache.set(cacheKey, payload);
      res.json(payload);
      return;
    }

    res.status(502).json({error: 'تعذر جلب التفسير بهذه اللغة حالياً'});
  });

  // Optional Visitor Quick Sign-in (Google / Facebook / Email) + Preferences Sync
  app.post('/api/visitor/auth', (req, res) => {
    const {provider, name, email, whatsapp} = req.body as {
      provider?: 'google' | 'facebook' | 'email';
      name?: string;
      email?: string;
      whatsapp?: string;
    };
    const cleanProvider: VisitorProfile['provider'] =
      provider === 'google' || provider === 'facebook' ? provider : 'email';
    const cleanName = (name || '').trim().slice(0, 60) || (cleanProvider === 'google' ? 'حساب Google' : cleanProvider === 'facebook' ? 'حساب Facebook' : 'زائر مسجّل');
    const cleanEmail = typeof email === 'string' && email.trim() ? email.trim().toLowerCase().slice(0, 120) : undefined;
    const cleanWhatsapp = typeof whatsapp === 'string' && whatsapp.trim() ? whatsapp.trim().slice(0, 40) : undefined;
    const keySeed = cleanEmail || `${cleanProvider}:${cleanName}`;
    const visitorId = `vis_${crypto.createHash('sha1').update(keySeed).digest('hex').slice(0, 12)}`;

    const existing = store.visitorAccounts[visitorId];
    const record: StoredVisitorRecord = {
      id: visitorId,
      provider: cleanProvider,
      name: cleanName,
      email: cleanEmail || existing?.email,
      whatsapp: cleanWhatsapp || existing?.whatsapp,
      createdAt: existing?.createdAt || new Date().toISOString(),
      bookmarks: existing?.bookmarks || [],
      adhkar: existing?.adhkar,
      adhkarLifetime: existing?.adhkarLifetime,
      wird: existing?.wird,
    };
    store.visitorAccounts[visitorId] = record;
    saveStore(store);
    res.json({profile: record});
  });

  app.put('/api/visitor/sync', (req, res) => {
    const {visitorId, bookmarks, adhkar, adhkarLifetime, wird, whatsapp} = req.body as {
      visitorId?: string;
      bookmarks?: string[];
      adhkar?: unknown;
      adhkarLifetime?: unknown;
      wird?: unknown;
      whatsapp?: string;
    };
    if (!visitorId || !store.visitorAccounts[visitorId]) {
      res.status(404).json({error: 'حساب الزائر غير موجود'});
      return;
    }
    const current = store.visitorAccounts[visitorId];
    store.visitorAccounts[visitorId] = {
      ...current,
      ...(Array.isArray(bookmarks) ? {bookmarks} : {}),
      ...(adhkar !== undefined ? {adhkar} : {}),
      ...(adhkarLifetime !== undefined ? {adhkarLifetime} : {}),
      ...(wird !== undefined ? {wird} : {}),
      ...(typeof whatsapp === 'string' ? {whatsapp: whatsapp.trim().slice(0, 40)} : {}),
    };
    saveStore(store);
    res.json({profile: store.visitorAccounts[visitorId]});
  });

  function mapTicketSummary(
    item: SuggestionItem | VolunteerItem,
    kind: 'suggestion' | 'volunteer',
  ): VisitorTicketSummary {
    return {
      id: item.id,
      ticketNumber: item.ticketNumber || `#REQ-${item.id.slice(-4).toUpperCase()}`,
      kind,
      categoryLabel:
        kind === 'volunteer'
          ? `انضمام / تطوع: ${(item as VolunteerItem).field}`
          : (item as SuggestionItem).type === 'join'
            ? 'طلب انضمام للفريق'
            : (item as SuggestionItem).type === 'help'
              ? 'طلب مساعدة'
              : 'اقتراح / مشاركة دعوية',
      senderName: item.senderName,
      text: kind === 'volunteer' ? (item as VolunteerItem).skills : (item as SuggestionItem).text,
      status: item.status || 'new',
      adminNote: item.adminNote,
      whatsappNotifiedAt: item.whatsappNotifiedAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  // Public Ticket Inquiry & Visitor Ticket History (Privacy safe: never leaks admin contact)
  app.get('/api/tickets/track', (req, res) => {
    const q = String(req.query.q || '').trim().toUpperCase().replace(/^#/, '');
    const tickets: VisitorTicketSummary[] = [
      ...store.suggestions.map((s) => mapTicketSummary(s, 'suggestion')),
      ...store.volunteers.map((v) => mapTicketSummary(v, 'volunteer')),
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    if (!q) {
      res.json({tickets: tickets.slice(0, 20)});
      return;
    }
    const matched = tickets.filter((t) =>
      t.ticketNumber.toUpperCase().replace(/^#/, '').includes(q) ||
      t.id.toUpperCase().includes(q),
    );
    res.json({tickets: matched});
  });

  app.get('/api/visitor/:visitorId/tickets', (req, res) => {
    const {visitorId} = req.params;
    const tickets: VisitorTicketSummary[] = [
      ...store.suggestions
        .filter((s) => s.visitorId === visitorId)
        .map((s) => mapTicketSummary(s, 'suggestion')),
      ...store.volunteers
        .filter((v) => v.visitorId === visitorId)
        .map((v) => mapTicketSummary(v, 'volunteer')),
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json({tickets});
  });

  // Auto daily AI sync for «نفحات متجددة» (triggers once per calendar day if stale)
  app.post('/api/nafahat/daily-sync', async (_req, res) => {
    try {
      const result = await generateDailyNafahatWithAI({force: false});
      res.json(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'تعذر تحديث نفحات اليوم بالذكاء الاصطناعي';
      res.status(503).json({error: msg});
    }
  });

  // Admin/Editor manual immediate AI renewal for «نفحات متجددة»
  app.post('/api/admin/nafahat/refresh', requireAuth, async (_req, res) => {
    try {
      const result = await generateDailyNafahatWithAI({force: true});
      res.json(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'تعذر توليد نفحة جديدة عبر الذكاء الاصطناعي';
      res.status(500).json({error: msg});
    }
  });

  let mediaFeedCache: {
    youtubeVideos: YouTubeVideoItem[];
    telegramAudios: TelegramAudioItem[];
    twitterQuotes: TwitterQuoteItem[];
    fetchedAt: number;
    cacheDate: string;
  } = {
    youtubeVideos: INITIAL_YOUTUBE_VIDEOS,
    telegramAudios: INITIAL_TELEGRAM_AUDIOS,
    twitterQuotes: INITIAL_TWITTER_QUOTES,
    fetchedAt: 0,
    cacheDate: '',
  };

  const decodeEntities = (str: string): string =>
    str
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&#39;/g, "'")
      .replace(/&#33;/g, '!')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();

  async function fetchYouTubeChannelVideos(): Promise<YouTubeVideoItem[]> {
    const channelId = 'UCsfQM68Mnr1JTK1OuVWYCLQ';
    const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, {
      headers: {'User-Agent': 'Mozilla/5.0'},
    });
    if (!res.ok) throw new Error(`YT HTTP ${res.status}`);
    const xml = await res.text();
    const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)];
    const parsed: YouTubeVideoItem[] = [];
    for (const m of entries) {
      const e = m[1];
      const id = (e.match(/<yt:videoId>(.*?)<\/yt:videoId>/) || [])[1]?.trim();
      const rawTitle = (e.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';
      const title = decodeEntities(rawTitle);
      const publishedAt = ((e.match(/<published>(.*?)<\/published>/) || [])[1] || '').slice(0, 10);
      const views = Number((e.match(/views="(\d+)"/) || [])[1] || 0);
      if (id && title) {
        parsed.push({
          id,
          title,
          url: `https://www.youtube.com/watch?v=${id}`,
          thumbnail: `https://i4.ytimg.com/vi/${id}/hqdefault.jpg`,
          publishedAt: publishedAt || '2020-01-15',
          views,
        });
      }
    }
    return parsed.length > 0 ? parsed : INITIAL_YOUTUBE_VIDEOS;
  }

  async function fetchTelegramChannelAudios(): Promise<TelegramAudioItem[]> {
    const map = new Map<string, TelegramAudioItem>();
    for (const item of INITIAL_TELEGRAM_AUDIOS) {
      map.set(item.msgId, item);
    }

    const queries = ['تلاوة', 'الشيخ', 'خطبة'];
    for (const q of queries) {
      try {
        const res = await fetch(`https://t.me/s/ax1ax70?q=${encodeURIComponent(q)}`, {
          headers: {'User-Agent': 'Mozilla/5.0'},
        });
        if (!res.ok) continue;
        const html = await res.text();
        const matches = [
          ...html.matchAll(
            /<a class="tgme_widget_message_document_wrap" href="https:\/\/t\.me\/ax1ax70\/(\d+)[^"]*">\s*<div class="tgme_widget_message_document_icon[^"]*audio[^"]*"[^>]*><\/div>\s*<div class="tgme_widget_message_document">\s*<div class="tgme_widget_message_document_title[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<div class="tgme_widget_message_document_extra[^"]*"[^>]*>([\s\S]*?)<\/div>/g,
          ),
        ];
        for (const m of matches) {
          const msgId = m[1];
          const title = decodeEntities(m[2].replace(/<[^>]+>/g, ''));
          const rawSpeaker = decodeEntities(m[3].replace(/<[^>]+>/g, ''));
          if (!msgId || !title) continue;
          const speaker =
            rawSpeaker && rawSpeaker !== '<unknown>' ? rawSpeaker : 'قناة مواعظ وعبر · @ax1ax70';
          const category = title.includes('خطبة')
            ? 'خطب ومحاضرات'
            : title.includes('دعاء')
              ? 'أدعية مختارة'
              : title.includes('سورة') || title.includes('تلاوة') || title.includes('قراءة')
                ? 'تلاوات خاشعة'
                : 'مواعظ ودروس';
          if (!map.has(msgId)) {
            map.set(msgId, {
              id: `tg_${msgId}`,
              msgId,
              title,
              speaker,
              url: `https://t.me/ax1ax70/${msgId}`,
              embedUrl: `https://t.me/ax1ax70/${msgId}?embed=1`,
              category,
            });
          }
        }
      } catch {
        // Ignore transient Telegram query errors and keep accumulated items
      }
    }

    return [...map.values()];
  }

  async function fetchTwitterQuotes(): Promise<TwitterQuoteItem[]> {
    const xLink = store.socialLinks.find((l) => l.id === 'x') || store.socialLinks.find((l) => l.url.includes('twitter.com') || l.url.includes('x.com'));
    const xPrimary = xLink?.url || 'https://twitter.com/ax1ax71';
    const xHandleMatch = xPrimary.match(/(?:twitter\.com|x\.com)\/([A-Za-z0-9_]+)/i);
    const screenName = xHandleMatch?.[1] || 'ax1ax71';
    const baseList: TwitterQuoteItem[] = [];
    try {
      const res = await fetch(`https://syndication.twitter.com/srv/timeline-profile/screen-name/${encodeURIComponent(screenName)}`, {
        headers: {'User-Agent': 'Mozilla/5.0'},
      });
      if (res.ok) {
        const html = await res.text();
        const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
        if (nextDataMatch?.[1]) {
          const parsed = JSON.parse(nextDataMatch[1]) as {
            props?: {pageProps?: {timeline?: {entries?: Array<{content?: {tweet?: {id_str?: string; full_text?: string; text?: string}}}>}}};
          };
          const entries = parsed.props?.pageProps?.timeline?.entries || [];
          for (const entry of entries.slice(0, 6)) {
            const tw = entry.content?.tweet;
            const rawText = (tw?.full_text || tw?.text || '').replace(/https?:\/\/\S+/g, '').trim();
            if (tw?.id_str && rawText.length > 15) {
              baseList.push({
                id: `tw_live_${tw.id_str}`,
                text: rawText,
                handle: `@${screenName}`,
                tag: 'تغريدة مباشرة',
                url: `https://twitter.com/${screenName}/status/${tw.id_str}`,
              });
            }
          }
        }
      }
    } catch {
      // Ignore rate limits or transient network failure and keep curated fallback
    }
    if (baseList.length > 0) return baseList;
    return INITIAL_TWITTER_QUOTES.map((q) => ({
      ...q,
      handle: `@${screenName}`,
      url: xPrimary,
    }));
  }

  // Official YouTube + Telegram + X/Twitter media feeds
  app.get('/api/feeds/media', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const forceRefresh = req.query.refresh === '1';
    const todayKey = getDateKey();
    const isFresh =
      mediaFeedCache.cacheDate === todayKey &&
      Date.now() - mediaFeedCache.fetchedAt < 10 * 60 * 1000;

    if (!forceRefresh && isFresh && mediaFeedCache.fetchedAt > 0) {
      res.json({
        youtubeVideos: mediaFeedCache.youtubeVideos,
        telegramAudios: mediaFeedCache.telegramAudios,
        twitterQuotes: mediaFeedCache.twitterQuotes,
        source: 'cache',
      });
      return;
    }

    try {
      const [ytResult, tgResult, twResult] = await Promise.allSettled([
        fetchYouTubeChannelVideos(),
        fetchTelegramChannelAudios(),
        fetchTwitterQuotes(),
      ]);

      mediaFeedCache = {
        youtubeVideos:
          ytResult.status === 'fulfilled' ? ytResult.value : mediaFeedCache.youtubeVideos,
        telegramAudios:
          tgResult.status === 'fulfilled' ? tgResult.value : mediaFeedCache.telegramAudios,
        twitterQuotes:
          twResult.status === 'fulfilled' ? twResult.value : mediaFeedCache.twitterQuotes,
        fetchedAt: Date.now(),
        cacheDate: todayKey,
      };

      res.json({
        youtubeVideos: mediaFeedCache.youtubeVideos,
        telegramAudios: mediaFeedCache.telegramAudios,
        twitterQuotes: mediaFeedCache.twitterQuotes,
        source: 'live',
      });
    } catch {
      res.json({
        youtubeVideos: INITIAL_YOUTUBE_VIDEOS,
        telegramAudios: INITIAL_TELEGRAM_AUDIOS,
        twitterQuotes: INITIAL_TWITTER_QUOTES,
        source: 'seed',
      });
    }
  });

  let scholarlyCache: {
    liveItems: ScholarlySiteItem[];
    fetchedAt: number;
    fetchedAtIso: string;
    cacheDate: string;
  } = {
    liveItems: [],
    fetchedAt: 0,
    fetchedAtIso: new Date().toISOString(),
    cacheDate: '',
  };

  async function fetchShYahiaLiveItems(): Promise<ScholarlySiteItem[]> {
    const items: ScholarlySiteItem[] = [];
    const seen = new Set<string>();
    const res = await fetch('https://sh-yahia.net/', {
      headers: {'User-Agent': 'Mozilla/5.0'},
    });
    if (!res.ok) throw new Error(`sh-yahia HTTP ${res.status}`);
    const html = await res.text();
    const linkRegex = /<a[^>]+href=["'](show_(sound|fatawa|art|book)_\d+\.html)["'][^>]*>([\s\S]*?)<\/a>/gi;
    for (const m of html.matchAll(linkRegex)) {
      const rel = m[1];
      const kind = m[2]?.toLowerCase() || 'sound';
      const title = decodeEntities(m[3].replace(/<[^>]+>/g, '').replace(/\s+/g, ' '));
      if (!title || title.length < 8 || seen.has(rel)) continue;
      seen.add(rel);
      const kindLabels: Record<string, {ar: string; en: string}> = {
        sound: {ar: 'صوتيات ودرس', en: 'Audio / Lesson'},
        fatawa: {ar: 'فتوى شرعية', en: 'Fatwa'},
        art: {ar: 'مقال وفائدة', en: 'Article'},
        book: {ar: 'كتاب / رسالة', en: 'Book / Treatise'},
      };
      const lbl = kindLabels[kind] || kindLabels.sound;
      items.push({
        id: `sy_live_${rel.replace(/\W+/g, '_')}`,
        siteId: 'sh_yahia',
        siteNameAr: 'موقع الشيخ يحيى الحجوري',
        siteNameEn: 'Sheikh Al-Hajouri Site',
        kindLabelAr: lbl.ar,
        kindLabelEn: lbl.en,
        title: title.slice(0, 140),
        url: `https://sh-yahia.net/${rel}`,
      });
      if (items.length >= 12) break;
    }
    return items;
  }

  async function fetchAlilmiaLiveItems(): Promise<ScholarlySiteItem[]> {
    const items: ScholarlySiteItem[] = [];
    const seen = new Set<string>();
    const res = await fetch('https://alilmia.com/', {
      headers: {'User-Agent': 'Mozilla/5.0'},
    });
    if (!res.ok) throw new Error(`alilmia HTTP ${res.status}`);
    const html = await res.text();
    const linkRegex = /<a[^>]+href=["'](item\.php\?id=\d+[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
    for (const m of html.matchAll(linkRegex)) {
      const rel = decodeEntities(m[1]);
      const title = decodeEntities(m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' '));
      if (!title || title.length < 8 || seen.has(rel)) continue;
      seen.add(rel);
      const kindAr = title.includes('تلاوة') || title.includes('سورة') ? 'تلاوة قرآنية' : title.includes('خطبة') ? 'خطبة منبرية' : 'مادة علمية';
      const kindEn = title.includes('تلاوة') || title.includes('سورة') ? 'Quran Audio' : title.includes('خطبة') ? 'Khutbah' : 'Scholarly Item';
      items.push({
        id: `al_live_${rel.replace(/\W+/g, '_')}`,
        siteId: 'alilmia',
        siteNameAr: 'الشبكة العلمية',
        siteNameEn: 'Alilmia Network',
        kindLabelAr: kindAr,
        kindLabelEn: kindEn,
        title: title.slice(0, 140),
        url: `https://alilmia.com/${rel}`,
      });
      if (items.length >= 12) break;
    }
    return items;
  }

  // Official Scholarly Sites Integration Hub (sh-yahia.net & alilmia.com)
  app.get('/api/feeds/scholarly', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const forceRefresh = req.query.refresh === '1';
    const todayKey = getDateKey();
    const isFresh =
      scholarlyCache.cacheDate === todayKey &&
      Date.now() - scholarlyCache.fetchedAt < 15 * 60 * 1000;

    if (!forceRefresh && isFresh && scholarlyCache.fetchedAt > 0) {
      const payload: ScholarlyHubPayload = {
        sections: {shYahia: SH_YAHIA_SECTIONS, alilmia: ALILMIA_SECTIONS},
        liveItems: scholarlyCache.liveItems,
        fetchedAt: scholarlyCache.fetchedAtIso,
        source: 'cache',
      };
      res.json(payload);
      return;
    }

    const [syRes, alRes] = await Promise.allSettled([
      fetchShYahiaLiveItems(),
      fetchAlilmiaLiveItems(),
    ]);
    const liveItems: ScholarlySiteItem[] = [];
    if (syRes.status === 'fulfilled') liveItems.push(...syRes.value);
    if (alRes.status === 'fulfilled') liveItems.push(...alRes.value);

    const finalItems = liveItems.length > 0 ? liveItems : scholarlyCache.liveItems;
    const fetchedAtIso = new Date().toISOString();
    if (finalItems.length > 0) {
      scholarlyCache = {
        liveItems: finalItems,
        fetchedAt: Date.now(),
        fetchedAtIso,
        cacheDate: todayKey,
      };
    }

    const payload: ScholarlyHubPayload = {
      sections: {shYahia: SH_YAHIA_SECTIONS, alilmia: ALILMIA_SECTIONS},
      liveItems: finalItems,
      fetchedAt: fetchedAtIso,
      source: liveItems.length > 0 ? 'live' : 'seed',
    };
    res.json(payload);
  });

  let liveFatwaArchiveCache: {
    items: ScholarlySiteItem[];
    fetchedAt: number;
    cacheDate: string;
  } = {
    items: [],
    fetchedAt: 0,
    cacheDate: '',
  };

  // Live Scholarly Fatawa Archive Index from sh-yahia.net/fatawa.php & alilmia.com/fatawa.php
  app.get('/api/fatawa/archive', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const forceRefresh = req.query.refresh === '1';
    const todayKey = getDateKey();
    const isFresh =
      liveFatwaArchiveCache.cacheDate === todayKey &&
      Date.now() - liveFatwaArchiveCache.fetchedAt < 20 * 60 * 1000;
    if (!forceRefresh && isFresh && liveFatwaArchiveCache.items.length > 0) {
      res.json({items: liveFatwaArchiveCache.items, source: 'cache'});
      return;
    }

    const collected: ScholarlySiteItem[] = [];
    const seenUrls = new Set<string>();

    const [syRes, alRes] = await Promise.allSettled([
      fetch('https://sh-yahia.net/fatawa.php', {headers: {'User-Agent': 'Mozilla/5.0'}}).then((r) =>
        r.ok ? r.text() : '',
      ),
      fetch('https://alilmia.com/fatawa.php', {headers: {'User-Agent': 'Mozilla/5.0'}}).then((r) =>
        r.ok ? r.text() : '',
      ),
    ]);

    if (syRes.status === 'fulfilled' && syRes.value) {
      const syMatches = [
        ...syRes.value.matchAll(/<a[^>]+href=["'](show_fatawa_\d+\.html)["'][^>]*>([\s\S]*?)<\/a>/gi),
      ];
      for (const m of syMatches) {
        const title = decodeEntities(m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' '));
        const fullUrl = `https://sh-yahia.net/${m[1]}`;
        if (!title || title.length < 10 || seenUrls.has(fullUrl)) continue;
        seenUrls.add(fullUrl);
        collected.push({
          id: `sy_fatwa_${m[1].replace(/\W+/g, '_')}`,
          siteId: 'sh_yahia',
          siteNameAr: 'فتاوى الشيخ يحيى الحجوري · sh-yahia.net',
          siteNameEn: 'Sheikh Al-Hajouri Fatawa',
          kindLabelAr: 'فتوى موثقة',
          kindLabelEn: 'Documented Fatwa',
          title: title.slice(0, 180),
          url: fullUrl,
        });
        if (collected.length >= 45) break;
      }
    }

    if (alRes.status === 'fulfilled' && alRes.value) {
      const alMatches = [
        ...alRes.value.matchAll(/<a[^>]+href=["'](item\.php\?id=\d+[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi),
      ];
      for (const m of alMatches) {
        const rel = decodeEntities(m[1]);
        const title = decodeEntities(m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' '));
        const fullUrl = `https://alilmia.com/${rel}`;
        if (!title || title.length < 10 || seenUrls.has(fullUrl)) continue;
        seenUrls.add(fullUrl);
        collected.push({
          id: `al_fatwa_${rel.replace(/\W+/g, '_')}`,
          siteId: 'alilmia',
          siteNameAr: 'فتاوى الشبكة العلمية · alilmia.com',
          siteNameEn: 'Alilmia Fatawa Archive',
          kindLabelAr: 'فتوى علمية',
          kindLabelEn: 'Scholarly Verdict',
          title: title.slice(0, 180),
          url: fullUrl,
        });
        if (collected.length >= 90) break;
      }
    }

    if (collected.length > 0) {
      liveFatwaArchiveCache = {items: collected, fetchedAt: Date.now(), cacheDate: todayKey};
    }

    res.json({
      items: liveFatwaArchiveCache.items,
      source: collected.length > 0 ? 'live' : 'cache',
    });
  });

  // Read full text of a verified sh-yahia.net fatwa page directly inside the app
  app.get('/api/fatawa/remote', async (req, res) => {
    const rawUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';
    if (
      !rawUrl.startsWith('https://sh-yahia.net/show_fatawa_') &&
      !rawUrl.startsWith('https://alilmia.com/item.php?id=')
    ) {
      res.status(400).json({error: 'رابط الفتوى غير مدعوم'});
      return;
    }

    try {
      const response = await fetch(rawUrl, {headers: {'User-Agent': 'Mozilla/5.0'}});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();

      let question = '';
      let answer = '';
      // Prefer Schema.org FAQ JSON-LD if available (sh-yahia.net)
      const jsonLdMatches = [
        ...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
      ];
      for (const block of jsonLdMatches) {
        try {
          const parsed = JSON.parse(block[1]) as {
            '@type'?: string;
            mainEntity?: Array<{name?: string; acceptedAnswer?: {text?: string}}>;
          };
          if (parsed.mainEntity?.[0]) {
            question = decodeEntities((parsed.mainEntity[0].name || '').replace(/<[^>]+>/g, ' '));
            answer = decodeEntities((parsed.mainEntity[0].acceptedAnswer?.text || '').replace(/<[^>]+>/g, ' '));
            if (answer) break;
          }
        } catch {
          // Ignore malformed JSON-LD blocks
        }
      }

      if (!answer) {
        const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        question = decodeEntities((titleMatch?.[1] || '').replace(/<[^>]+>/g, ' '));
        const stripped = html
          .replace(/<script[\s\S]*?<\/script>/gi, ' ')
          .replace(/<style[\s\S]*?<\/style>/gi, ' ')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        const ansIdx = stripped.indexOf('الجواب');
        answer =
          ansIdx >= 0
            ? stripped.slice(ansIdx, Math.min(stripped.length, ansIdx + 2400))
            : stripped.slice(0, 1200);
      }

      res.json({
        url: rawUrl,
        question: question.trim(),
        answer: answer.trim(),
      });
    } catch {
      res.status(502).json({error: 'تعذر جلب نص الفتوى من الموقع الرسمي حالياً'});
    }
  });

  // Grounded In-App AI Chatbot Assistant (Gemini Server-Side Proxy)
  app.post('/api/ai/assistant', async (req, res) => {
    const body = req.body as {
      message?: string;
      history?: Array<{role?: string; text?: string}>;
      lang?: Language;
      uploadedBooks?: Array<{title?: string; author?: string; section?: string}>;
    };
    const userMessage = typeof body.message === 'string' ? body.message.trim() : '';
    if (!userMessage) {
      res.status(400).json({error: 'يرجى كتابة سؤالك أو استفسارك أولاً'});
      return;
    }
    if (userMessage.length > 1500) {
      res.status(400).json({error: 'النص طويل جداً، يرجى اختصار السؤال إلى أقل من ١٥٠٠ حرف'});
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      res.status(503).json({error: 'مفتاح الذكاء الاصطناعي (GEMINI_API_KEY) غير متوفر في إعدادات الخادم'});
      return;
    }

    const reqLang: Language = body.lang === 'en' ? 'en' : 'ar';
    const postSummaries = store.posts
      .slice(0, 8)
      .map((p) => `- ${p.title} (${p.category} · ${p.author}): ${p.excerpt}`)
      .join('\n');
    const fatwaSummaries = store.fatawa
      .slice(0, 8)
      .map((f) => `- [${f.scholarName}] س: ${f.question} | ج: ${f.answer.slice(0, 140)}...`)
      .join('\n');
    const lessonSummaries = HAJOURI_LESSONS.slice(0, 8)
      .map((l) => `- ${l.title} (${l.categoryLabel})`)
      .join('\n');
    const motherOasisSummaries = store.motherOasisItems
      .slice(0, 8)
      .map((m) => `- [${m.chapter}] ${m.title}: ${m.body.slice(0, 120)}...`)
      .join('\n');
    const uploadedBooksSummary = Array.isArray(body.uploadedBooks) && body.uploadedBooks.length > 0
      ? body.uploadedBooks
          .slice(0, 20)
          .map((b) => `- ${String(b.title || '').trim()} (${String(b.author || 'المكتبة العلمية').trim()})`)
          .join('\n')
      : 'كتب الشيخ يحيى الحجوري والأئمة الكبار ومشايخ دار الحديث داخل قسم المكتبة العلمية';

    const sadaScholarsList = SADA_AL_KHAIR_SCHOLARS.map((s) => s.name).join('، ');
    const poetsList = SADA_SUNNAH_POETS.map((p) => p.name).join('، ');

    const systemInstruction = `You are the smart Islamic & platform assistant inside the "Mawaedh & Ibar" (مواعظ وعبر) web app & PWA (founded 2015).
LANGUAGE RULE: Respond primarily in ${reqLang === 'en' ? 'clear, warm, respectful English (keeping Arabic Quranic/Dua terms where appropriate)' : 'عربية فصحى سلسة ومختصرة ومنظمة بنقاط واضحة'}. Keep replies concise, helpful, easy to scan (use short bullet points, avoid long walls of text), and STRICTLY grounded in Salafi Ahlus-Sunnah methodology and the real sections INSIDE this app:

APPROVED AHLUS-SUNNAH SCHOLARS & SECTIONS:
1. Main Scholars of this Site ONLY:
   - فضيلة الشيخ يحيى بن علي الحجوري حفظه الله (الأولوية والمكتبة الرئيسية)
   - الأئمة الكبار: الإمام مقبل بن هادي الوادعي، سماحة الشيخ عبد العزيز بن باز، فضيلة الشيخ محمد بن صالح العثيمين، الإمام المحدث محمد ناصر الدين الألباني رحمهم الله.
   - مشايخ وعلماء صدى الخير الدعوية في الموقع: ${sadaScholarsList}.
   - شعراء السنة: ${poetsList}.
   - واحة الداعية الفاضلة أمي: أم محمد إكرام عبده علي (أبواب: المؤلفات والكتب الدعوية والتربوية، المحاضرات والدروس المفرغة، قصص وعبر من واقع الحياة).
2. Site Sections:
   - الرئيسية (مواعظ وعبر + اختصارات سريعة + الورد اليومي)
   - المصحف الشريف (١١٤ سورة · ٦٠٤ صفحات بالرسم العثماني + تفسير ٥ أئمة بـ ٧ لغات + وضع القراءة المركزة)
   - الأذكار والأدعية الجامعة (٨ أبواب مرتبة تشمل باب وقفة بر ووفاء + عداد الحسنات وإنجاز اليوم والشهر والإجمالي العام)
   - قسم الصم والبكم (بإدارة المهندس يونس عبدالكريم — قريباً بإذن الله)
   - الفتاوى (فتاوى الشيخ يحيى الحجوري والأئمة الكبار)
   - المكتبة العلمية وصدى الخير (مؤلفات الشيخ يحيى الحجوري، مكتبة الأئمة الكبار، مشايخ وطلاب دار الحديث، مشغل تيليجرام المباشر، وقراء/تحميل ملفات PDF)
   - البطاقات الدعوية، واحة الشعر والطرائف، الأرشيف الشامل الدائم، آراء وتقييمات الزوار، الدعم ومتابعة التذاكر.

UPLOADED & INTERNAL BOOKS INDEX:
${uploadedBooksSummary}

MOTHER OASIS WORKS ON SITE:
${motherOasisSummaries || 'مؤلفات ومحاضرات وقصص الداعية الفاضلة أم محمد إكرام عبده علي'}

RECENT POSTS ON SITE:
${postSummaries}

FEATURED FATAWA ON SITE:
${fatwaSummaries}

SHEIKH AL-HAJOURI LESSON SERIES:
${lessonSummaries}

STRICT GROUNDING & SAFETY RULES (MANDATORY):
1. NEVER quote, recommend, or cite any scholar, preacher, thinker, or group outside authentic Salaf Imams (such as Ibn Taymiyyah, Ibn Al-Qayyim, Ibn Kathir, Al-Bukhari, Muslim) and the approved Salafi scholars listed above. Strictly avoid any partisan or non-Salafi figures.
2. NEVER output ANY external URLs, website domains, HTTP/HTTPS links, or send visitors to external book websites! Always direct the visitor to the relevant section INSIDE this application (such as: «قسم المكتبة العلمية»، «قسم الفتاوى»، «قسم المصحف الشريف والتفسير»، «قسم الأذكار والأدعية الجامعة»، «واحة الداعية الفاضلة أمي»).
3. Never fabricate weak or unauthenticated hadiths.
4. Never mention API keys, admin credentials, or internal code details.`;

    const safeHistory = Array.isArray(body.history)
      ? body.history
          .filter(
            (m) =>
              m &&
              (m.role === 'user' || m.role === 'model') &&
              typeof m.text === 'string' &&
              m.text.trim().length > 0,
          )
          .slice(-8)
          .map((m) => ({
            role: m.role === 'model' ? 'model' : 'user',
            parts: [{text: (m.text || '').trim().slice(0, 1200)}],
          }))
      : [];

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {headers: {'User-Agent': 'aistudio-build'}},
      });

      const contentsPayload = [
        ...safeHistory,
        {role: 'user', parts: [{text: userMessage}]},
      ];

      let response;
      try {
        response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: contentsPayload,
          config: {
            systemInstruction,
            thinkingConfig: {thinkingLevel: ThinkingLevel.LOW},
          },
        });
      } catch {
        response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: contentsPayload,
          config: {
            systemInstruction,
          },
        });
      }

      const replyText =
        response.candidates?.[0]?.content?.parts
          ?.filter((part) => typeof part.text === 'string' && !part.thought)
          .map((part) => part.text)
          .join('')
          .trim() ||
        response.text?.trim() ||
        '';

      if (!replyText) {
        res.status(502).json({
          error:
            reqLang === 'en'
              ? 'No valid response received from the AI assistant. Please rephrase your question.'
              : 'لم يتم استلام رد صالح من المساعد الذكي، حاول إعادة صياغة سؤالك.',
        });
        return;
      }

      res.json({reply: replyText});
    } catch {
      res.status(503).json({
        error:
          reqLang === 'en'
            ? 'The AI assistant is momentarily busy. Please try again in a few seconds.'
            : 'المساعد الذكي مشغول مؤقتاً الآن بسبب ضغط الطلبات، يرجى المحاولة بعد قليل.',
      });
    }
  });

  // Create new post (admin or editor)
  app.post('/api/posts', requireAuth, (req, res) => {
    const body = req.body as {
      title?: string;
      excerpt?: string;
      body?: string;
      author?: string;
      category?: string;
      mediaType?: MediaType;
      youtubeUrl?: string;
      cardTheme?: CardTheme;
      syncedPlatforms?: string[];
    };

    const content = (body.body || '').trim();
    if (!content) {
      res.status(400).json({error: 'نص الموعظة مطلوب'});
      return;
    }

    const mediaType: MediaType =
      body.mediaType === 'sada' || body.mediaType === 'audio' || body.mediaType === 'video'
        ? body.mediaType
        : 'quote';
    const cardTheme: CardTheme =
      body.cardTheme === 'azure' || body.cardTheme === 'gold' || body.cardTheme === 'midnight'
        ? body.cardTheme
        : 'emerald';

    const post: Post = {
      id: `post_${Date.now().toString(36)}`,
      title: (body.title || content.slice(0, 68)).trim(),
      excerpt: (body.excerpt || content.slice(0, 140)).trim(),
      body: content,
      author: (body.author || 'خدمة صدى الخير الدعوية').trim(),
      sourceLabel:
        mediaType === 'sada' || mediaType === 'audio'
          ? 'خدمة صدى الخير الدعوية'
          : mediaType === 'video'
            ? 'مرئيات مختارة'
            : 'نشر مباشر',
      category: (body.category || 'إيمانيات').trim(),
      mediaType,
      platformTag:
        mediaType === 'video' ? 'يوتيوب' : mediaType === 'sada' || mediaType === 'audio' ? 'صدى الخير' : undefined,
      youtubeUrl: body.youtubeUrl?.trim() || undefined,
      cardTheme,
      likes: 0,
      commentsCount: 0,
      comments: [],
      publishedAtLabel: 'الآن',
      createdAt: new Date().toISOString(),
      syncedPlatforms: Array.isArray(body.syncedPlatforms) ? body.syncedPlatforms : ['telegram'],
      listeningTrend: createDefaultTrend(0),
    };

    store.posts = [post, ...store.posts];
    saveStore(store);
    res.status(201).json({post});
  });

  // Update post (admin or editor)
  app.put('/api/posts/:id', requireAuth, (req, res) => {
    const {id} = req.params;
    const idx = store.posts.findIndex((p) => p.id === id);
    if (idx === -1) {
      res.status(404).json({error: 'المنشور غير موجود'});
      return;
    }
    const body = req.body as Partial<Post>;
    const current = store.posts[idx];
    const updated: Post = {
      ...current,
      title: typeof body.title === 'string' && body.title.trim() ? body.title.trim() : current.title,
      excerpt: typeof body.excerpt === 'string' && body.excerpt.trim() ? body.excerpt.trim() : current.excerpt,
      body: typeof body.body === 'string' && body.body.trim() ? body.body.trim() : current.body,
      author: typeof body.author === 'string' && body.author.trim() ? body.author.trim() : current.author,
      category: typeof body.category === 'string' && body.category.trim() ? body.category.trim() : current.category,
      youtubeUrl: typeof body.youtubeUrl === 'string' ? body.youtubeUrl.trim() || undefined : current.youtubeUrl,
    };
    store.posts[idx] = updated;
    saveStore(store);
    res.json({post: updated});
  });

  // Delete post (admin or editor)
  app.delete('/api/posts/:id', requireAuth, (req, res) => {
    const {id} = req.params;
    store.posts = store.posts.filter((p) => p.id !== id);
    saveStore(store);
    res.json({ok: true});
  });

  // Toggle post visibility (hidden/visible)
  app.patch('/api/admin/posts/:id/visibility', requireAuth, (req, res) => {
    const {id} = req.params;
    const {hidden} = req.body as {hidden?: boolean};
    const idx = store.posts.findIndex((p) => p.id === id);
    if (idx === -1) {
      res.status(404).json({error: 'المنشور غير موجود'});
      return;
    }
    const nextHidden = typeof hidden === 'boolean' ? hidden : !store.posts[idx].hidden;
    store.posts[idx] = {...store.posts[idx], hidden: nextHidden};
    saveStore(store);
    res.json({post: store.posts[idx]});
  });

  // Comment moderation: Edit, Toggle visibility, Delete
  app.put('/api/admin/posts/:postId/comments/:commentId', requireAuth, (req, res) => {
    const {postId, commentId} = req.params;
    const {text, author} = req.body as {text?: string; author?: string};
    const idx = store.posts.findIndex((p) => p.id === postId);
    if (idx === -1) {
      res.status(404).json({error: 'المنشور غير موجود'});
      return;
    }
    const current = store.posts[idx];
    const comments = (current.comments || []).map((c) =>
      c.id === commentId
        ? {
            ...c,
            ...(typeof text === 'string' && text.trim() ? {text: text.trim().slice(0, 600)} : {}),
            ...(typeof author === 'string' && author.trim() ? {author: author.trim().slice(0, 40)} : {}),
          }
        : c,
    );
    store.posts[idx] = {...current, comments};
    saveStore(store);
    res.json({post: store.posts[idx]});
  });

  app.patch('/api/admin/posts/:postId/comments/:commentId/visibility', requireAuth, (req, res) => {
    const {postId, commentId} = req.params;
    const {hidden} = req.body as {hidden?: boolean};
    const idx = store.posts.findIndex((p) => p.id === postId);
    if (idx === -1) {
      res.status(404).json({error: 'المنشور غير موجود'});
      return;
    }
    const current = store.posts[idx];
    const comments = (current.comments || []).map((c) =>
      c.id === commentId
        ? {...c, hidden: typeof hidden === 'boolean' ? hidden : !c.hidden}
        : c,
    );
    store.posts[idx] = {...current, comments};
    saveStore(store);
    res.json({post: store.posts[idx]});
  });

  app.delete('/api/admin/posts/:postId/comments/:commentId', requireAuth, (req, res) => {
    const {postId, commentId} = req.params;
    const idx = store.posts.findIndex((p) => p.id === postId);
    if (idx === -1) {
      res.status(404).json({error: 'المنشور غير موجود'});
      return;
    }
    const current = store.posts[idx];
    const comments = (current.comments || []).filter((c) => c.id !== commentId);
    store.posts[idx] = {...current, comments, commentsCount: comments.length};
    saveStore(store);
    res.json({post: store.posts[idx]});
  });

  // Silent Auto-Post Webhook execution (Facebook / WhatsApp / X)
  app.post('/api/admin/auto-post', requireAuth, async (req, res) => {
    const {postId} = req.body as {postId?: string};
    const post = store.posts.find((p) => p.id === postId);
    if (!post) {
      res.status(404).json({error: 'الموعظة غير موجودة'});
      return;
    }
    const webhookUrl = store.automationSettings.autoPostWebhookUrl?.trim() || '';
    if (!webhookUrl) {
      res.status(400).json({error: 'يرجى ضبط رابط Webhook للنشر الآلي في لوحة تحكم المشرف أولاً'});
      return;
    }
    const valid = validateExternalWebhookUrl(webhookUrl);
    if (!valid) {
      res.status(400).json({error: 'رابط Webhook غير صالح أو محظور أمنياً'});
      return;
    }
    const platforms = Object.entries(store.automationSettings.enabledPlatforms)
      .filter(([, enabled]) => enabled)
      .map(([name]) => name);

    const ok = await dispatchSafeWebhook(webhookUrl, {
      event: 'auto_publish_post',
      platforms,
      post: {
        id: post.id,
        title: post.title,
        excerpt: post.excerpt,
        body: post.body,
        author: post.author,
        category: post.category,
        brandHandle: store.brandHandle,
      },
      sentAt: new Date().toISOString(),
    });
    if (!ok) {
      res.status(502).json({error: 'تعذر الاتصال بخادم النشر الآلي (تأكد من جاهزية رابط Webhook)'});
      return;
    }
    res.json({ok: true, platforms});
  });

  // Create Fatwa (admin or editor, restricted to 5 approved scholars)
  app.post('/api/fatawa', requireAuth, (req, res) => {
    const body = req.body as {
      scholarId?: FatwaScholarId;
      category?: string;
      question?: string;
      answer?: string;
      source?: string;
      featured?: boolean;
    };
    const scholar = FATWA_SCHOLARS.find((s) => s.id === body.scholarId) || FATWA_SCHOLARS[0];
    const question = (body.question || '').trim();
    const answer = (body.answer || '').trim();
    if (!question || !answer) {
      res.status(400).json({error: 'نص السؤال والجواب مطلوبان'});
      return;
    }
    const item: FatwaItem = {
      id: `ft_${scholar.id}_${Date.now().toString(36)}`,
      scholarId: scholar.id,
      scholarName:
        scholar.id === 'hajouri'
          ? `${scholar.name} حفظه الله`
          : `${scholar.name} رحمه الله`,
      category: (body.category || 'العقيدة والتوحيد').trim(),
      question,
      answer,
      source: (body.source || `فتاوى ${scholar.name}`).trim(),
      featured: body.featured ?? scholar.id === 'hajouri',
      createdAt: new Date().toISOString(),
    };
    store.fatawa = [item, ...store.fatawa];
    saveStore(store);
    res.status(201).json({fatwa: item});
  });

  // Delete Fatwa (admin or editor)
  app.delete('/api/fatawa/:id', requireAuth, (req, res) => {
    const {id} = req.params;
    store.fatawa = store.fatawa.filter((f) => f.id !== id);
    saveStore(store);
    res.json({ok: true});
  });

  // Like / unlike post
  app.post('/api/posts/:id/like', (req, res) => {
    const {id} = req.params;
    const {liked} = req.body as {liked?: boolean};
    const idx = store.posts.findIndex((p) => p.id === id);
    if (idx === -1) {
      res.status(404).json({error: 'المنشور غير موجود'});
      return;
    }
    const delta = liked ? 1 : -1;
    const current = store.posts[idx];
    const updated: Post = {
      ...current,
      likes: Math.max(0, current.likes + delta),
    };
    store.posts[idx] = updated;
    if (liked) {
      recordDailyMetric('sermonLikes', 1);
    }
    saveStore(store);
    res.json({post: updated});
  });

  // Add real visitor comment on post
  app.post('/api/posts/:id/comments', (req, res) => {
    const {id} = req.params;
    const {author, text} = req.body as {author?: string; text?: string};
    const content = (text || '').trim();
    if (!content) {
      res.status(400).json({error: 'نص التعليق مطلوب'});
      return;
    }
    const idx = store.posts.findIndex((p) => p.id === id);
    if (idx === -1) {
      res.status(404).json({error: 'المنشور غير موجود'});
      return;
    }
    const current = store.posts[idx];
    const existingComments = Array.isArray(current.comments) ? current.comments : [];
    const newComment = {
      id: `cmt_${Date.now().toString(36)}`,
      author: (author || 'زائر كريم').trim().slice(0, 40),
      text: content.slice(0, 600),
      createdAt: new Date().toISOString(),
    };
    const updatedComments = [newComment, ...existingComments];
    const updated: Post = {
      ...current,
      comments: updatedComments,
      commentsCount: updatedComments.length,
    };
    store.posts[idx] = updated;
    recordDailyMetric('sermonComments', 1);
    saveStore(store);
    res.status(201).json({post: updated, comment: newComment});
  });

  // Increment play / listening trend
  app.post('/api/posts/:id/play', (req, res) => {
    const {id} = req.params;
    const idx = store.posts.findIndex((p) => p.id === id);
    if (idx === -1) {
      recordDailyMetric('sermonReads', 1);
      saveStore(store);
      res.json({ok: true});
      return;
    }
    const current = store.posts[idx];
    const trend =
      Array.isArray(current.listeningTrend) && current.listeningTrend.length > 0
        ? current.listeningTrend.map((item, i, arr) =>
            i === arr.length - 1 ? {...item, listens: item.listens + 1} : item,
          )
        : createDefaultTrend(0).map((item, i, arr) => (i === arr.length - 1 ? {...item, listens: 1} : item));
    const updated: Post = {...current, listeningTrend: trend};
    store.posts[idx] = updated;
    recordDailyMetric('sermonReads', 1);
    saveStore(store);
    res.json({post: updated});
  });

  // Mother's prayer Amen counter
  app.post('/api/prayers/mother/amen', (_req, res) => {
    store.motherPrayersCount += 1;
    recordDailyMetric('motherAmens', 1);
    saveStore(store);
    res.json({count: store.motherPrayersCount});
  });

  // Visitor session counter (real browser visits)
  app.post('/api/telemetry/visit', (req, res) => {
    const {sessionId} = (req.body || {}) as {sessionId?: string};
    store.visitorsCount += 1;
    recordDailyMetric('visitors', 1);
    saveStore(store);
    const onlineVisitorsCount = updateAndCountOnline({
      touchSessionId: typeof sessionId === 'string' ? sessionId : undefined,
    });
    res.json({
      visitorsCount: store.visitorsCount,
      clicksCount: store.clicksCount,
      onlineVisitorsCount,
    });
  });

  // Live active visitors presence heartbeat
  app.post('/api/telemetry/presence', (req, res) => {
    const {sessionId, leave} = (req.body || {}) as {sessionId?: string; leave?: boolean};
    const sid = typeof sessionId === 'string' ? sessionId : undefined;
    const onlineVisitorsCount = leave
      ? updateAndCountOnline({removeSessionId: sid})
      : updateAndCountOnline({touchSessionId: sid});
    res.json({
      onlineVisitorsCount,
      visitorsCount: store.visitorsCount,
      clicksCount: store.clicksCount,
    });
  });

  // Public interaction telemetry for monthly admin charts & live click totals
  app.post('/api/telemetry/interaction', (req, res) => {
    const body = req.body as {
      kind?: 'click' | 'sermon_read' | 'sermon_share' | 'adhkar_tap' | 'adhkar_complete';
      count?: number;
      category?: string;
    };
    const amount = typeof body.count === 'number' && Number.isFinite(body.count) ? Math.max(1, Math.min(200, Math.round(body.count))) : 1;
    store.clicksCount += amount;
    recordDailyMetric('clicks', amount);
    switch (body.kind) {
      case 'click':
        break;
      case 'sermon_read':
        recordDailyMetric('sermonReads', amount);
        break;
      case 'sermon_share':
        recordDailyMetric('sermonShares', amount);
        break;
      case 'adhkar_tap':
        recordDailyMetric('adhkarTaps', amount);
        if (typeof body.category === 'string' && body.category.trim()) {
          const catKey = body.category.trim().slice(0, 32);
          store.adhkarCategoryStats[catKey] = (store.adhkarCategoryStats[catKey] || 0) + amount;
        }
        break;
      case 'adhkar_complete':
        recordDailyMetric('adhkarCompletions', amount);
        break;
      default:
        res.status(400).json({error: 'نوع التفاعل غير مدعوم'});
        return;
    }
    saveStore(store);
    res.json({ok: true, clicksCount: store.clicksCount});
  });

  // Visitor suggestions, contribution & help messages (Issues #REQ-xxxx ticket + silent admin alert)
  app.post('/api/suggestions', (req, res) => {
    const {type, senderName, text, contact, visitorWhatsapp, visitorId, source} = req.body as {
      type?: string;
      senderName?: string;
      text?: string;
      contact?: string;
      visitorWhatsapp?: string;
      visitorId?: string;
      source?: string;
    };
    const trimmedText = typeof text === 'string' ? text.trim() : '';
    if (!trimmedText) {
      res.status(400).json({error: 'نص الرسالة أو المقترح مطلوب'});
      return;
    }
    if (trimmedText.length > 2500) {
      res.status(400).json({error: 'النص طويل جداً، يرجى اختصاره إلى أقل من ٢٥٠٠ حرف'});
      return;
    }
    const ticketNumber = `#REQ-${store.nextTicketSeq++}`;
    const nowIso = new Date().toISOString();
    const item: SuggestionItem = {
      id: `sug_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
      ticketNumber,
      visitorId: typeof visitorId === 'string' && visitorId.trim() ? visitorId.trim().slice(0, 60) : undefined,
      visitorWhatsapp:
        typeof visitorWhatsapp === 'string' && visitorWhatsapp.trim()
          ? visitorWhatsapp.trim().slice(0, 40)
          : undefined,
      type: (type || 'preach').trim().slice(0, 40),
      senderName: typeof senderName === 'string' && senderName.trim() ? senderName.trim().slice(0, 80) : undefined,
      text: trimmedText,
      contact: typeof contact === 'string' && contact.trim() ? contact.trim().slice(0, 140) : undefined,
      source: source === 'assistant' ? 'assistant' : 'support_page',
      status: 'new',
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    store.suggestions = [item, ...store.suggestions];
    saveStore(store);
    void dispatchAdminTicketAlert(
      `تذكرة جديدة ${ticketNumber} (${item.type}) من ${item.senderName || 'زائر'}: ${trimmedText.slice(0, 120)}`,
      {ticketNumber, kind: 'suggestion', senderName: item.senderName || 'زائر'},
    );
    res.status(201).json({suggestion: item, ticketNumber});
  });

  // Volunteer & site team membership application (Issues #REQ-xxxx ticket + silent admin alert)
  app.post('/api/volunteers', (req, res) => {
    const {senderName, field, hours, skills, contact, visitorWhatsapp, visitorId, source} = req.body as {
      senderName?: string;
      field?: string;
      hours?: string;
      skills?: string;
      contact?: string;
      visitorWhatsapp?: string;
      visitorId?: string;
      source?: string;
    };
    const trimmedSkills = typeof skills === 'string' ? skills.trim() : '';
    const trimmedContact = typeof contact === 'string' ? contact.trim() : '';
    if (!trimmedSkills || !trimmedContact) {
      res.status(400).json({error: 'يرجى كتابة الخبرات/التفاصيل ووسيلة التواصل'});
      return;
    }
    const ticketNumber = `#REQ-${store.nextTicketSeq++}`;
    const nowIso = new Date().toISOString();
    const item: VolunteerItem = {
      id: `vol_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
      ticketNumber,
      visitorId: typeof visitorId === 'string' && visitorId.trim() ? visitorId.trim().slice(0, 60) : undefined,
      visitorWhatsapp:
        typeof visitorWhatsapp === 'string' && visitorWhatsapp.trim()
          ? visitorWhatsapp.trim().slice(0, 40)
          : undefined,
      senderName: typeof senderName === 'string' && senderName.trim() ? senderName.trim().slice(0, 80) : undefined,
      field: (field || 'التدقيق اللغوي والشرعي').trim().slice(0, 120),
      hours: (hours || '2-4').trim().slice(0, 40),
      skills: trimmedSkills.slice(0, 2500),
      contact: trimmedContact.slice(0, 140),
      source: source === 'assistant' ? 'assistant' : 'support_page',
      status: 'new',
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    store.volunteers = [item, ...store.volunteers];
    saveStore(store);
    void dispatchAdminTicketAlert(
      `طلب انضمام جديد ${ticketNumber} (${item.field}) من ${item.senderName || 'متطوع'}: ${trimmedSkills.slice(0, 120)}`,
      {ticketNumber, kind: 'volunteer', field: item.field},
    );
    res.status(201).json({volunteer: item, ticketNumber});
  });

  // Supervisors (editor) & Managers (admin) ONLY: Correspondents, Visitor Messages, Suggestions & Team/Job Applications
  app.get('/api/admin/messages', requireAuth, (_req, res) => {
    res.json({
      suggestions: store.suggestions,
      volunteers: store.volunteers,
    });
  });

  app.patch('/api/admin/messages/:kind/:id', requireAuth, async (req, res) => {
    const {kind, id} = req.params;
    const {status, adminNote} = req.body as {status?: MessageInboxStatus; adminNote?: string};
    const validStatus: MessageInboxStatus | undefined =
      status === 'new' || status === 'reviewed' || status === 'resolved' ? status : undefined;
    const nowIso = new Date().toISOString();

    if (kind === 'suggestion') {
      const target = store.suggestions.find((s) => s.id === id);
      if (!target) {
        res.status(404).json({error: 'الرسالة غير موجودة'});
        return;
      }
      let whatsappNotifiedAt = target.whatsappNotifiedAt;
      if (target.visitorWhatsapp && validStatus && store.automationSettings.adminNotifyWebhookUrl) {
        const sent = await dispatchSafeWebhook(store.automationSettings.adminNotifyWebhookUrl, {
          event: 'visitor_whatsapp_status_update',
          ticketNumber: target.ticketNumber,
          visitorWhatsapp: target.visitorWhatsapp,
          status: validStatus,
          adminNote: typeof adminNote === 'string' ? adminNote.trim() : target.adminNote,
        });
        if (sent) whatsappNotifiedAt = nowIso;
      }
      store.suggestions = store.suggestions.map((s) =>
        s.id === id
          ? {
              ...s,
              ...(validStatus ? {status: validStatus} : {}),
              ...(typeof adminNote === 'string' ? {adminNote: adminNote.trim().slice(0, 500)} : {}),
              whatsappNotifiedAt,
              updatedAt: nowIso,
            }
          : s,
      );
      saveStore(store);
      res.json({suggestions: store.suggestions, volunteers: store.volunteers});
      return;
    }

    if (kind === 'volunteer') {
      const target = store.volunteers.find((v) => v.id === id);
      if (!target) {
        res.status(404).json({error: 'الطلب غير موجود'});
        return;
      }
      let whatsappNotifiedAt = target.whatsappNotifiedAt;
      if (target.visitorWhatsapp && validStatus && store.automationSettings.adminNotifyWebhookUrl) {
        const sent = await dispatchSafeWebhook(store.automationSettings.adminNotifyWebhookUrl, {
          event: 'visitor_whatsapp_status_update',
          ticketNumber: target.ticketNumber,
          visitorWhatsapp: target.visitorWhatsapp,
          status: validStatus,
          adminNote: typeof adminNote === 'string' ? adminNote.trim() : target.adminNote,
        });
        if (sent) whatsappNotifiedAt = nowIso;
      }
      store.volunteers = store.volunteers.map((v) =>
        v.id === id
          ? {
              ...v,
              ...(validStatus ? {status: validStatus} : {}),
              ...(typeof adminNote === 'string' ? {adminNote: adminNote.trim().slice(0, 500)} : {}),
              whatsappNotifiedAt,
              updatedAt: nowIso,
            }
          : v,
      );
      saveStore(store);
      res.json({suggestions: store.suggestions, volunteers: store.volunteers});
      return;
    }

    res.status(400).json({error: 'نوع رسالة غير صالح'});
  });

  app.delete('/api/admin/messages/:kind/:id', requireAuth, (req, res) => {
    const {kind, id} = req.params;
    if (kind === 'suggestion') {
      store.suggestions = store.suggestions.filter((s) => s.id !== id);
      saveStore(store);
      res.json({suggestions: store.suggestions, volunteers: store.volunteers});
      return;
    }
    if (kind === 'volunteer') {
      store.volunteers = store.volunteers.filter((v) => v.id !== id);
      saveStore(store);
      res.json({suggestions: store.suggestions, volunteers: store.volunteers});
      return;
    }
    res.status(400).json({error: 'نوع رسالة غير صالح'});
  });

  // Persistent Admin Session verification endpoint (never expires until manual logout)
  app.get('/api/admin/session', requireAuth, (req: AuthedRequest, res) => {
    res.json({
      ok: true,
      username: req.authUser?.username,
      role: req.authUser?.role,
      suggestions: store.suggestions,
      volunteers: store.volunteers,
      automationSettings: store.automationSettings,
      siteAppearance: store.siteAppearance,
    });
  });

  // Hidden Admin/Editor Username+Password Login
  app.post('/api/admin/login', (req, res) => {
    const {username, password} = req.body as {username?: string; password?: string};
    const u = (username || '').trim();
    const p = (password || '').trim();
    const account = store.accounts.find((acc) => acc.username === u);
    if (!account || !safeEqualHex(hashPassword(p), account.passwordHash)) {
      res.status(401).json({ok: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة'});
      return;
    }
    const token = signToken(account.username, account.role);
    res.json({
      ok: true,
      token,
      username: account.username,
      role: account.role,
      suggestions: store.suggestions,
      volunteers: store.volunteers,
      automationSettings: store.automationSettings,
      siteAppearance: store.siteAppearance,
    });
  });

  // Primary Admin ONLY: Automation Bot & Notification Webhook settings
  app.get('/api/admin/automation', requirePrimaryAdmin, (_req, res) => {
    res.json({automationSettings: store.automationSettings});
  });

  app.put('/api/admin/automation', requirePrimaryAdmin, (req, res) => {
    const body = req.body as Partial<AutomationSettings>;
    const next: AutomationSettings = {
      autoPostWebhookUrl:
        typeof body.autoPostWebhookUrl === 'string'
          ? body.autoPostWebhookUrl.trim().slice(0, 500)
          : store.automationSettings.autoPostWebhookUrl,
      enabledPlatforms: {
        facebook:
          typeof body.enabledPlatforms?.facebook === 'boolean'
            ? body.enabledPlatforms.facebook
            : store.automationSettings.enabledPlatforms.facebook,
        whatsapp:
          typeof body.enabledPlatforms?.whatsapp === 'boolean'
            ? body.enabledPlatforms.whatsapp
            : store.automationSettings.enabledPlatforms.whatsapp,
        x:
          typeof body.enabledPlatforms?.x === 'boolean'
            ? body.enabledPlatforms.x
            : store.automationSettings.enabledPlatforms.x,
      },
      adminNotifyWebhookUrl:
        typeof body.adminNotifyWebhookUrl === 'string'
          ? body.adminNotifyWebhookUrl.trim().slice(0, 500)
          : store.automationSettings.adminNotifyWebhookUrl,
      telegramBotToken:
        typeof body.telegramBotToken === 'string'
          ? body.telegramBotToken.trim().slice(0, 120)
          : store.automationSettings.telegramBotToken,
      telegramChatId:
        typeof body.telegramChatId === 'string'
          ? body.telegramChatId.trim().slice(0, 80)
          : store.automationSettings.telegramChatId,
      emailJsServiceId:
        typeof body.emailJsServiceId === 'string'
          ? body.emailJsServiceId.trim().slice(0, 80)
          : store.automationSettings.emailJsServiceId,
      emailJsTemplateId:
        typeof body.emailJsTemplateId === 'string'
          ? body.emailJsTemplateId.trim().slice(0, 80)
          : store.automationSettings.emailJsTemplateId,
      emailJsPublicKey:
        typeof body.emailJsPublicKey === 'string'
          ? body.emailJsPublicKey.trim().slice(0, 80)
          : store.automationSettings.emailJsPublicKey,
    };
    store.automationSettings = next;
    saveStore(store);
    res.json({automationSettings: store.automationSettings});
  });

  // Primary Admin ONLY: Appearance Studio, Brightness, Announcement Bar & Maintenance Mode
  app.put('/api/admin/appearance', requirePrimaryAdmin, (req, res) => {
    const body = req.body as Partial<SiteAppearanceConfig>;
    const allowedPresets: SiteAppearanceConfig['backgroundPreset'][] = [
      'default',
      'emerald_mist',
      'warm_parchment',
      'sky_calm',
      'deep_forest',
    ];
    const next: SiteAppearanceConfig = {
      backgroundPreset:
        body.backgroundPreset && allowedPresets.includes(body.backgroundPreset)
          ? body.backgroundPreset
          : store.siteAppearance.backgroundPreset,
      brightness:
        typeof body.brightness === 'number' && Number.isFinite(body.brightness)
          ? Math.min(120, Math.max(70, Math.round(body.brightness)))
          : store.siteAppearance.brightness,
      announcementEnabled:
        typeof body.announcementEnabled === 'boolean'
          ? body.announcementEnabled
          : store.siteAppearance.announcementEnabled,
      announcementText:
        typeof body.announcementText === 'string'
          ? body.announcementText.trim().slice(0, 260)
          : store.siteAppearance.announcementText,
      announcementUrl:
        typeof body.announcementUrl === 'string'
          ? body.announcementUrl.trim().slice(0, 300)
          : store.siteAppearance.announcementUrl,
      maintenanceMode:
        typeof body.maintenanceMode === 'boolean'
          ? body.maintenanceMode
          : store.siteAppearance.maintenanceMode,
    };
    store.siteAppearance = next;
    saveStore(store);
    res.json({siteAppearance: store.siteAppearance});
  });

  // Primary Admin ONLY: Update full site labels, buttons, descriptions
  app.put('/api/admin/site-config', requirePrimaryAdmin, (req, res) => {
    const incoming = req.body as Partial<SiteConfig>;
    const nextConfig: SiteConfig = {...store.siteConfig};
    (Object.keys(DEFAULT_SITE_CONFIG) as Array<keyof SiteConfig>).forEach((key) => {
      const val = incoming[key];
      if (typeof val === 'string') {
        if (key === 'supportEmail') {
          nextConfig[key] = val.trim();
        } else if (val.trim()) {
          nextConfig[key] = val.trim();
        }
      }
    });
    store.siteConfig = nextConfig;
    saveStore(store);
    res.json({siteConfig: store.siteConfig});
  });

  // Primary Admin ONLY: security settings & optional password updates
  app.patch('/api/admin/settings', requirePrimaryAdmin, (req, res) => {
    const {gesture, targetUsername, newPassword} = req.body as {
      gesture?: AdminGesture;
      targetUsername?: string;
      newPassword?: string;
    };
    if (gesture === 'long_press' || gesture === 'multi_tap') {
      store.gesture = gesture;
    }
    if (typeof newPassword === 'string' && newPassword.trim().length >= 4 && targetUsername) {
      store.accounts = store.accounts.map((acc) =>
        acc.username === targetUsername ? {...acc, passwordHash: hashPassword(newPassword.trim())} : acc,
      );
    }
    saveStore(store);
    res.json({gesture: store.gesture});
  });

  // Primary Admin ONLY: customization (brand handle, social links, app icons)
  app.put('/api/admin/customization', requirePrimaryAdmin, (req, res) => {
    const {brandHandle, socialLinks, appIcons} = req.body as {
      brandHandle?: string;
      socialLinks?: SocialLink[];
      appIcons?: AppIcons;
    };
    if (typeof brandHandle === 'string' && brandHandle.trim()) {
      store.brandHandle = brandHandle.trim();
    }
    if (Array.isArray(socialLinks) && socialLinks.length > 0) {
      store.socialLinks = socialLinks;
    }
    if (appIcons) {
      store.appIcons = {...DEFAULT_APP_ICONS, ...appIcons};
    }
    saveStore(store);
    res.json({
      brandHandle: store.brandHandle,
      socialLinks: store.socialLinks,
      appIcons: store.appIcons,
    });
  });

  // Primary Admin ONLY: list & add/remove additional editor/admin accounts for delegation
  app.get('/api/admin/accounts', requirePrimaryAdmin, (_req, res) => {
    res.json({
      accounts: store.accounts.map((acc) => ({username: acc.username, role: acc.role})),
    });
  });

  app.post('/api/admin/accounts', requirePrimaryAdmin, (req, res) => {
    const {username, password, role} = req.body as {
      username?: string;
      password?: string;
      role?: AdminRole;
    };
    const u = (username || '').trim();
    const p = (password || '').trim();
    const r: AdminRole = role === 'admin' ? 'admin' : 'editor';
    if (!u || u.length < 3 || !p || p.length < 4) {
      res.status(400).json({error: 'اسم المستخدم (٣ أحرف فأكثر) وكلمة المرور (٤ أحرف فأكثر) مطلوبان'});
      return;
    }
    const existingIdx = store.accounts.findIndex((a) => a.username === u);
    const nextAcc: StoredAccount = {username: u, role: r, passwordHash: hashPassword(p)};
    if (existingIdx >= 0) {
      store.accounts[existingIdx] = nextAcc;
    } else {
      store.accounts.push(nextAcc);
    }
    saveStore(store);
    res.status(201).json({
      accounts: store.accounts.map((acc) => ({username: acc.username, role: acc.role})),
    });
  });

  app.delete('/api/admin/accounts/:username', requirePrimaryAdmin, (req, res) => {
    const target = req.params.username;
    if (target === 'moalwbri') {
      res.status(400).json({error: 'لا يمكن حذف حساب المسؤول الرئيسي الأساسي'});
      return;
    }
    store.accounts = store.accounts.filter((a) => a.username !== target);
    saveStore(store);
    res.json({
      accounts: store.accounts.map((acc) => ({username: acc.username, role: acc.role})),
    });
  });

  // Primary Admin ONLY: Monthly engagement analytics for Sermons, Adhkar, Visitors & Clicks
  app.get('/api/admin/analytics', requirePrimaryAdmin, (req, res) => {
    const rawDays = Number(req.query.days);
    const days = Number.isFinite(rawDays) && rawDays >= 7 && rawDays <= 60 ? Math.round(rawDays) : 30;
    const today = new Date();
    const dailySeries: MonthlyAnalyticsPoint[] = [];

    const totals = {
      visitorsCount: store.visitorsCount,
      onlineVisitorsCount: updateAndCountOnline(),
      clicksCount: store.clicksCount,
      periodVisitors: 0,
      periodClicks: 0,
      sermonsEngagement: 0,
      adhkarEngagement: 0,
      sermonReads: 0,
      sermonLikes: 0,
      sermonComments: 0,
      sermonShares: 0,
      adhkarTaps: 0,
      adhkarCompletions: 0,
      motherAmens: 0,
    };

    const labelFormatter = new Intl.DateTimeFormat('ar-EG', {day: 'numeric', month: 'short'});

    for (let offset = days - 1; offset >= 0; offset -= 1) {
      const d = new Date(today);
      d.setDate(today.getDate() - offset);
      const dateKey = getDateKey(d);
      const bucket = store.dailyStats[dateKey]
        ? {...createEmptyDailyBucket(dateKey), ...store.dailyStats[dateKey]}
        : createEmptyDailyBucket(dateKey);

      const sermonsTotal =
        bucket.sermonReads + bucket.sermonLikes + bucket.sermonComments + bucket.sermonShares;
      const adhkarTotal = bucket.adhkarTaps + bucket.adhkarCompletions;

      totals.periodVisitors += bucket.visitors;
      totals.periodClicks += bucket.clicks;
      totals.sermonReads += bucket.sermonReads;
      totals.sermonLikes += bucket.sermonLikes;
      totals.sermonComments += bucket.sermonComments;
      totals.sermonShares += bucket.sermonShares;
      totals.adhkarTaps += bucket.adhkarTaps;
      totals.adhkarCompletions += bucket.adhkarCompletions;
      totals.motherAmens += bucket.motherAmens;
      totals.sermonsEngagement += sermonsTotal;
      totals.adhkarEngagement += adhkarTotal;

      dailySeries.push({
        date: dateKey,
        label: labelFormatter.format(d),
        visitors: bucket.visitors,
        clicks: bucket.clicks,
        sermonsTotal,
        adhkarTotal,
        sermonReads: bucket.sermonReads,
        sermonLikes: bucket.sermonLikes,
        sermonComments: bucket.sermonComments,
        sermonShares: bucket.sermonShares,
        adhkarTaps: bucket.adhkarTaps,
        adhkarCompletions: bucket.adhkarCompletions,
        motherAmens: bucket.motherAmens,
      });
    }

    // Reconcile category engagement from real post metrics
    const categoryMap = new Map<string, {category: string; count: number; engagement: number}>();
    for (const p of store.posts) {
      const trendSum = Array.isArray(p.listeningTrend)
        ? p.listeningTrend.reduce((acc, item) => acc + (item.listens || 0), 0)
        : 0;
      const postEng = (p.likes || 0) + (p.commentsCount || 0) + trendSum;
      const prev = categoryMap.get(p.category) || {category: p.category, count: 0, engagement: 0};
      prev.count += 1;
      prev.engagement += postEng;
      categoryMap.set(p.category, prev);
    }
    const sermonCategories = [...categoryMap.values()].sort(
      (a, b) => b.engagement - a.engagement || b.count - a.count,
    );

    const adhkarCategories = [
      ...ADHKAR_CATEGORIES.map((cat) => ({
        id: cat.id,
        label: cat.label,
        taps: store.adhkarCategoryStats[cat.id] || 0,
      })),
      {
        id: 'tasbeeh',
        label: 'المسبحة الإلكترونية الحرة',
        taps: store.adhkarCategoryStats.tasbeeh || 0,
      },
    ];

    const topPosts = [...store.posts]
      .map((p) => {
        const reads = Array.isArray(p.listeningTrend)
          ? p.listeningTrend.reduce((acc, item) => acc + (item.listens || 0), 0)
          : 0;
        return {
          id: p.id,
          title: p.title,
          category: p.category,
          reads,
          likes: p.likes || 0,
          commentsCount: p.commentsCount || 0,
        };
      })
      .sort((a, b) => b.reads + b.likes + b.commentsCount - (a.reads + a.likes + a.commentsCount))
      .slice(0, 5);

    const payload: AdminMonthlyAnalytics = {
      days,
      generatedAt: new Date().toISOString(),
      totals,
      dailySeries,
      sermonCategories,
      adhkarCategories,
      topPosts,
    };

    res.json(payload);
  });

  // Primary Admin ONLY: Reset all likes, comments, reading trends, and Amen/visitor/click counters to 0
  app.post('/api/admin/reset-counters', requirePrimaryAdmin, (_req, res) => {
    store.motherPrayersCount = 0;
    store.visitorsCount = 0;
    store.clicksCount = 0;
    store.dailyStats = {};
    store.adhkarCategoryStats = {};
    store.posts = store.posts.map((p) => ({
      ...p,
      likes: 0,
      commentsCount: 0,
      comments: [],
      listeningTrend: createDefaultTrend(0),
    }));
    saveStore(store);
    res.json({posts: store.posts, motherPrayersCount: store.motherPrayersCount});
  });

  // Primary Admin ONLY: Export & Import full site state JSON for cross-account portability
  app.get('/api/admin/export', requirePrimaryAdmin, (_req, res) => {
    res.json({
      posts: store.posts,
      fatawa: store.fatawa,
      poetryItems: store.poetryItems,
      permanentArchive: store.permanentArchive,
      motherOasisItems: store.motherOasisItems,
      visitorReviews: store.visitorReviews,
      socialLinks: store.socialLinks,
      appIcons: store.appIcons,
      siteConfig: store.siteConfig,
      siteAppearance: store.siteAppearance,
      automationSettings: store.automationSettings,
      brandHandle: store.brandHandle,
      motherPrayersCount: store.motherPrayersCount,
      dailyStats: store.dailyStats,
      adhkarCategoryStats: store.adhkarCategoryStats,
    });
  });

  app.post('/api/admin/import', requirePrimaryAdmin, (req, res) => {
    const data = req.body as Partial<StoreState>;
    if (Array.isArray(data.posts)) store.posts = data.posts;
    if (Array.isArray(data.fatawa)) store.fatawa = data.fatawa;
    if (Array.isArray(data.poetryItems)) store.poetryItems = data.poetryItems;
    if (Array.isArray(data.permanentArchive)) store.permanentArchive = data.permanentArchive;
    if (Array.isArray(data.motherOasisItems)) store.motherOasisItems = data.motherOasisItems;
    if (Array.isArray(data.visitorReviews)) store.visitorReviews = data.visitorReviews;
    if (Array.isArray(data.socialLinks)) store.socialLinks = data.socialLinks;
    if (data.appIcons) store.appIcons = {...DEFAULT_APP_ICONS, ...data.appIcons};
    if (data.siteConfig) store.siteConfig = {...DEFAULT_SITE_CONFIG, ...data.siteConfig};
    if (data.siteAppearance) store.siteAppearance = {...DEFAULT_SITE_APPEARANCE, ...data.siteAppearance};
    if (data.automationSettings) {
      store.automationSettings = {...DEFAULT_AUTOMATION_SETTINGS, ...data.automationSettings};
    }
    if (typeof data.brandHandle === 'string' && data.brandHandle.trim()) {
      store.brandHandle = data.brandHandle.trim();
    }
    if (data.dailyStats && typeof data.dailyStats === 'object') {
      store.dailyStats = data.dailyStats;
    }
    if (data.adhkarCategoryStats && typeof data.adhkarCategoryStats === 'object') {
      store.adhkarCategoryStats = data.adhkarCategoryStats;
    }
    saveStore(store);
    res.json({
      posts: store.posts,
      fatawa: store.fatawa,
      poetryItems: store.poetryItems,
      permanentArchive: store.permanentArchive,
      socialLinks: store.socialLinks,
      appIcons: store.appIcons,
      siteConfig: store.siteConfig,
      siteAppearance: store.siteAppearance,
      brandHandle: store.brandHandle,
    });
  });

  const isProd = process.env.NODE_ENV === 'production';
  const httpServer = http.createServer(app);

  if (!isProd) {
    const {createServer: createViteServer} = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: {server: httpServer},
        ws: {server: httpServer},
        hmr: process.env.DISABLE_HMR === 'true' ? false : {server: httpServer},
        allowedHosts: true,
        watch: process.env.DISABLE_HMR === 'true' ? null : undefined,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(
      express.static(distDir, {
        setHeaders: (res, filePath) => {
          if (
            filePath.endsWith('index.html') ||
            filePath.endsWith('sw.js') ||
            filePath.endsWith('registerSW.js')
          ) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          }
        },
      }),
    );
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Mawaedh & Ibar server listening on http://0.0.0.0:${port}`);
    const runDailyBackgroundCheck = () => {
      const todayKey = getDateKey();
      if (store.lastNafahatDate !== todayKey && process.env.GEMINI_API_KEY?.trim()) {
        void generateDailyNafahatWithAI({force: false}).catch(() => undefined);
      }
      if (store.lastPoetryAiDate !== todayKey && process.env.GEMINI_API_KEY?.trim()) {
        void generatePoetryWithAI({force: false}).catch(() => undefined);
      }
      if (mediaFeedCache.cacheDate && mediaFeedCache.cacheDate !== todayKey) {
        mediaFeedCache.fetchedAt = 0;
        mediaFeedCache.cacheDate = '';
      }
      if (scholarlyCache.cacheDate && scholarlyCache.cacheDate !== todayKey) {
        scholarlyCache.fetchedAt = 0;
        scholarlyCache.cacheDate = '';
      }
      if (liveFatwaArchiveCache.cacheDate && liveFatwaArchiveCache.cacheDate !== todayKey) {
        liveFatwaArchiveCache.fetchedAt = 0;
        liveFatwaArchiveCache.cacheDate = '';
      }
    };
    runDailyBackgroundCheck();
    setInterval(runDailyBackgroundCheck, 30 * 60 * 1000);
  });
}

startServer().catch((err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});
