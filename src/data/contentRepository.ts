import {CLASSIC_DAWAH_CARDS, INITIAL_VISITOR_REVIEWS, LIBRARY_PDF_BOOKS} from './dawahCards';
import {
  ADHKAR_ITEMS,
  ALILMIA_SECTIONS,
  FATWA_SCHOLARS,
  HAJOURI_LESSONS,
  HISN_ITEMS,
  INITIAL_FATAWA,
  INITIAL_MOTHER_OASIS_ITEMS,
  INITIAL_POSTS,
  INITIAL_SOCIAL_LINKS,
  INITIAL_TELEGRAM_AUDIOS,
  INITIAL_TWITTER_QUOTES,
  INITIAL_YOUTUBE_VIDEOS,
  MOTHER_OASIS_SIGNATURE,
  SADA_AL_KHAIR_SCHOLARS,
  SADA_SUNNAH_POETS,
  SENIOR_IMAMS_WORKS,
  SHEIKH_STUDENTS_WORKS,
  SH_YAHIA_SECTIONS,
} from './seed';
import type {DeafMuteVideoItem} from '../types';

export interface DeafMuteVisualCard {
  id: string;
  badge: string;
  title: string;
  visualPoints: string[];
  dhikrOrAyat: string;
  source: string;
}

export const DEAF_MUTE_VISUAL_CARDS: DeafMuteVisualCard[] = [
  {
    id: 'dm_card_tawheed',
    badge: 'التوحيد والعقيدة الميسّرة',
    title: 'أصل الدين: إخلاص العبادة لله وحده',
    visualPoints: [
      '١. نؤمن بأن الله وحده هو الخالق والرازق والمُدبّر.',
      '٢. نصلي وندعو ونستغيث بالله وحده ولا نشرك به أحداً.',
      '٣. نتّبع سنة نبينا محمد ﷺ بالمحبة والعمل الصالح.',
    ],
    dhikrOrAyat: '﴿ قُلْ هُوَ اللَّهُ أَحَدٌ * اللَّهُ الصَّمَدُ ﴾',
    source: 'القرآن الكريم · سورة الإخلاص',
  },
  {
    id: 'dm_card_prayer_light',
    badge: 'نور الصلاة والطمأنينة',
    title: 'الصلاة صلة بين العبد وربه — راحة وطمأنينة للقلب',
    visualPoints: [
      '١. الوضوء الكامل يُطهّر الظاهر ويُزكي القلب.',
      '٢. الخشوع بالقلب والنظر لموضع السجود يملأ النفس سكينة.',
      '٣. الدعاء في السجود مسموع ومستجاب عند الله السميع العليم.',
    ],
    dhikrOrAyat: '«أَقْرَبُ مَا يَكُونُ العَبْدُ مِنْ رَبِّهِ وَهُوَ سَاجِدٌ، فَأَكْثِرُوا الدُّعَاءَ»',
    source: 'رواه مسلم (٤٨٢)',
  },
  {
    id: 'dm_card_morning_dhikr',
    badge: 'الأذكار اليومية الميسّرة',
    title: 'أذكار الصباح والمساء المختصرة — حصن ووقاية',
    visualPoints: [
      '١. آية الكرسي (مرة واحدة صباحاً ومساءً وعند النوم).',
      '٢. الإخلاص والمعوذتان (٣ مرات صباحاً ومساءً).',
      '٣. «سُبْحَانَ اللَّهِ وَبِحَمْدِهِ» (١٠٠ مرة — تحط الخطايا ولو كانت مثل زبد البحر).',
    ],
    dhikrOrAyat: '«أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ»',
    source: 'سورة الرعد (٢٨) وصحيح البخاري ومسلم',
  },
  {
    id: 'dm_card_mercy',
    badge: 'الأخلاق والرفق',
    title: 'الكلمة الطيبة والابتسامة في وجوه الإخوان صدقة',
    visualPoints: [
      '١. الابتسامة الصادقة والبشاشة لغةٌ يفهمها كل قلب.',
      '٢. برّ الوالدين وصلة الرحم والإحسان للناس من أحب الأعمال لله.',
      '٣. الصبر والرضا بقضاء الله يرفع الدرجات ويزيد الإيمان.',
    ],
    dhikrOrAyat: '«تَبَسُّمُكَ فِي وَجْهِ أَخِيكَ لَكَ صَدَقَةٌ»',
    source: 'رواه الترمذي وصححه الألباني',
  },
];

export const INITIAL_DEAF_MUTE_VIDEOS: DeafMuteVideoItem[] = [
  {
    id: 'dm_vid_intro_khutbah',
    title: 'سلسلة خطب ودروس العقيدة والرقائق بلغة الإشارة الميسّرة',
    description:
      'سلسلة مرئية مخصّصة لتقريب أصول التوحيد وأركان الإسلام ومواعظ السلف الصالح لإخواننا الصم والبكم بأسلوب بصري واضح.',
    benefitText:
      'يجري تجهيز الحلقات المرئية بلغة الإشارة بالتنسيق مع قناة المشرف على يوتيوب، لتظهر هنا مع المشغّل المباشر فور النشر بإذن الله.',
    youtubeUrl: '',
    status: 'upcoming',
    category: 'العقيدة والتوحيد',
    managerName: 'المهندس يونس عبدالكريم',
    createdAt: '2026-11-20T09:00:00.000Z',
  },
  {
    id: 'dm_vid_wudu_salah',
    title: 'صفة الوضوء والصلاة النبوية — شرح بصري وإشاري ميسّر',
    description:
      'بيان عملي مصور لأركان الوضوء وواجبات الصلاة وسننها مع نصوص مكتوبة واضحة تسهّل المتابعة والفهم.',
    benefitText:
      'سيتم ربط رابط الفيديو من قناة المشرف على يوتيوب فور انتهاء المونتاج والمراجعة العلمية.',
    youtubeUrl: '',
    status: 'upcoming',
    category: 'الطهارة والصلاة',
    managerName: 'المهندس يونس عبدالكريم',
    createdAt: '2026-11-21T09:00:00.000Z',
  },
  {
    id: 'dm_vid_adhkar_visual',
    title: 'أذكار الصباح والمساء بلغة الإشارة والخط الواضح',
    description:
      'عرض مرئي مريح للأذكار اليومية الثابتة مع بيان فضلها ومعانيها بصياغة واضحة ومباشرة.',
    benefitText:
      'سيُنشر قريباً على القناة ويُضَمّن مشغّله مباشرة في هذه البطاقة.',
    youtubeUrl: '',
    status: 'upcoming',
    category: 'الأذكار والآداب',
    managerName: 'المهندس يونس عبدالكريم',
    createdAt: '2026-11-22T09:00:00.000Z',
  },
];

/**
 * Separated, protected read-only registry of approved Salafi Ahlus-Sunnah datasets.
 * UI views read from runtime synced state backed by these immutable seeds so
 * future updates never delete, overwrite, or truncate previously approved records.
 */
export const APPROVED_DATASETS = {
  posts: INITIAL_POSTS,
  fatawa: INITIAL_FATAWA,
  fatwaScholars: FATWA_SCHOLARS,
  adhkar: ADHKAR_ITEMS,
  hisn: HISN_ITEMS,
  dawahCards: CLASSIC_DAWAH_CARDS,
  books: LIBRARY_PDF_BOOKS,
  hajouriLessons: HAJOURI_LESSONS,
  seniorImamsWorks: SENIOR_IMAMS_WORKS,
  sheikhStudentsWorks: SHEIKH_STUDENTS_WORKS,
  sadaScholars: SADA_AL_KHAIR_SCHOLARS,
  sadaPoets: SADA_SUNNAH_POETS,
  motherOasisItems: INITIAL_MOTHER_OASIS_ITEMS,
  motherOasisSignature: MOTHER_OASIS_SIGNATURE,
  visitorReviews: INITIAL_VISITOR_REVIEWS,
  socialLinks: INITIAL_SOCIAL_LINKS,
  youtubeVideos: INITIAL_YOUTUBE_VIDEOS,
  telegramAudios: INITIAL_TELEGRAM_AUDIOS,
  twitterQuotes: INITIAL_TWITTER_QUOTES,
  shYahiaSections: SH_YAHIA_SECTIONS,
  alilmiaSections: ALILMIA_SECTIONS,
  deafMuteVisualCards: DEAF_MUTE_VISUAL_CARDS,
  deafMuteVideos: INITIAL_DEAF_MUTE_VIDEOS,
} as const;

export const APPROVED_AFFECTED_SCHOLAR_NAMES: string[] = [
  'الشيخ يحيى بن علي الحجوري',
  'الإمام مقبل بن هادي الوادعي',
  'سماحة الشيخ عبد العزيز بن باز',
  'فضيلة الشيخ محمد بن صالح العثيمين',
  'الإمام محمد ناصر الدين الألباني',
  ...SADA_AL_KHAIR_SCHOLARS.map((s) => s.name),
  ...SADA_SUNNAH_POETS.map((p) => p.name),
];

/**
 * Non-destructive append-only merge by `id`.
 * Keeps every incoming / cloud-added / existing item and appends any missing
 * approved baseline records without overwriting or dropping approved data.
 */
export function appendOnlyMergeById<T extends {id: string}>(
  incoming: T[] | undefined | null,
  approvedSeed: readonly T[],
): T[] {
  const validIncoming = Array.isArray(incoming)
    ? incoming.filter((item): item is T => Boolean(item && typeof item === 'object' && typeof item.id === 'string' && item.id.trim()))
    : [];

  if (validIncoming.length === 0) {
    return [...approvedSeed];
  }

  const seen = new Set<string>();
  const result: T[] = [];

  for (const item of validIncoming) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      result.push(item);
    }
  }

  for (const seedItem of approvedSeed) {
    if (!seen.has(seedItem.id)) {
      seen.add(seedItem.id);
      result.push(seedItem);
    }
  }

  return result;
}

/**
 * Non-destructive cloud-priority merge by `id`.
 * Items from cloud override older local metadata for the same ID while keeping
 * every local-only and approved-seed record intact.
 */
export function mergeCloudAndLocalById<T extends {id: string}>(
  cloudItems: readonly T[],
  localItems: readonly T[],
  approvedSeed: readonly T[] = [],
): T[] {
  const map = new Map<string, T>();

  for (const item of approvedSeed) {
    if (item && item.id) map.set(item.id, item);
  }
  for (const item of localItems) {
    if (item && item.id) {
      const existing = map.get(item.id);
      map.set(item.id, existing ? {...existing, ...item} : item);
    }
  }
  for (const item of cloudItems) {
    if (item && item.id) {
      const existing = map.get(item.id);
      map.set(item.id, existing ? {...existing, ...item} : item);
    }
  }

  // Keep cloud order first (newest additions at top), followed by local-only, then seed
  const orderedIds: string[] = [];
  const added = new Set<string>();
  for (const arr of [cloudItems, localItems, approvedSeed]) {
    for (const item of arr) {
      if (item && item.id && !added.has(item.id)) {
        added.add(item.id);
        orderedIds.push(item.id);
      }
    }
  }

  return orderedIds.map((id) => map.get(id)!).filter(Boolean);
}
