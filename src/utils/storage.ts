import {DEFAULT_SNAPSHOT, INITIAL_FATAWA, INITIAL_POSTS, INITIAL_SOCIAL_LINKS} from '../data/seed';
import type {BootstrapSnapshot} from '../types';

const SNAPSHOT_KEY = 'mawaedh_snapshot_v4';

export function loadSnapshot(): BootstrapSnapshot {
  if (typeof window === 'undefined') return DEFAULT_SNAPSHOT;
  try {
    try {
      window.localStorage.removeItem('mawaedh_snapshot_v2');
      window.localStorage.removeItem('mawaedh_snapshot_v3');
    } catch {
      // ignore storage quota/access issues
    }
    const raw = window.localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return DEFAULT_SNAPSHOT;
    const parsed = JSON.parse(raw) as Partial<BootstrapSnapshot>;

    const posts = (() => {
      if (!Array.isArray(parsed.posts) || parsed.posts.length === 0) {
        return DEFAULT_SNAPSHOT.posts;
      }
      const existingIds = new Set(parsed.posts.map((p) => p.id));
      const merged = [...parsed.posts];
      for (const seedPost of INITIAL_POSTS) {
        if (!existingIds.has(seedPost.id)) {
          merged.push(seedPost);
        }
      }
      return merged;
    })();

    const fatawa = (() => {
      if (!Array.isArray(parsed.fatawa) || parsed.fatawa.length === 0) {
        return DEFAULT_SNAPSHOT.fatawa;
      }
      const existingIds = new Set(parsed.fatawa.map((f) => f.id));
      const merged = [...parsed.fatawa];
      for (const seedFatwa of INITIAL_FATAWA) {
        if (!existingIds.has(seedFatwa.id)) {
          merged.push(seedFatwa);
        }
      }
      return merged;
    })();

    const socialLinks = (() => {
      if (!Array.isArray(parsed.socialLinks) || parsed.socialLinks.length === 0) {
        return DEFAULT_SNAPSHOT.socialLinks;
      }
      const list = parsed.socialLinks
        .filter((l) => l.id !== 'x_alt')
        .map((l) =>
          l.id === 'x' &&
          (l.handle === '@ax1ax70' ||
            l.url.includes('twitter.com/ax1ax70') ||
            l.url.includes('x.com/ax1ax70') ||
            l.name.includes('تويتر'))
            ? {
                ...l,
                name: 'منصة إكس (X) · الحساب الرسمي',
                handle: '@ax1ax71',
                description:
                  'حساب مواعظ وعبر الرسمي عبر منصة إكس (X) لنشر السلاسل والتغريدات الدعوية الموثقة والتأملات القرآنية.',
                url: 'https://x.com/ax1ax71',
              }
            : l.name.includes('تويتر')
              ? {...l, name: l.name.replace(/تويتر/g, 'منصة إكس (X)')}
              : l,
        );
      for (const seedLink of INITIAL_SOCIAL_LINKS) {
        if ((seedLink.id === 'sh_yahia' || seedLink.id === 'alilmia') && !list.some((x) => x.id === seedLink.id)) {
          list.push(seedLink);
        }
      }
      return list;
    })();

    return {
      posts,
      fatawa,
      socialLinks,
      appIcons: parsed.appIcons ? {...DEFAULT_SNAPSHOT.appIcons, ...parsed.appIcons} : DEFAULT_SNAPSHOT.appIcons,
      siteConfig: parsed.siteConfig
        ? {
            ...DEFAULT_SNAPSHOT.siteConfig,
            ...parsed.siteConfig,
            motherBadge:
              !parsed.siteConfig.motherBadge || parsed.siteConfig.motherBadge.includes('وقفة بر')
                ? DEFAULT_SNAPSHOT.siteConfig.motherBadge
                : parsed.siteConfig.motherBadge,
            navHisn:
              !parsed.siteConfig.navHisn || parsed.siteConfig.navHisn.includes('حصن')
                ? DEFAULT_SNAPSHOT.siteConfig.navHisn
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
                ? DEFAULT_SNAPSHOT.siteConfig.hisnTitle
                : parsed.siteConfig.hisnTitle,
            supportEmail:
              typeof parsed.siteConfig.supportEmail === 'string' && parsed.siteConfig.supportEmail.trim()
                ? parsed.siteConfig.supportEmail.trim()
                : DEFAULT_SNAPSHOT.siteConfig.supportEmail,
          }
        : DEFAULT_SNAPSHOT.siteConfig,
      brandHandle:
        typeof parsed.brandHandle === 'string' && parsed.brandHandle.trim()
          ? parsed.brandHandle
          : DEFAULT_SNAPSHOT.brandHandle,
      motherPrayersCount:
        typeof parsed.motherPrayersCount === 'number'
          ? parsed.motherPrayersCount
          : DEFAULT_SNAPSHOT.motherPrayersCount,
      visitorsCount:
        typeof parsed.visitorsCount === 'number' ? parsed.visitorsCount : DEFAULT_SNAPSHOT.visitorsCount,
      clicksCount: typeof parsed.clicksCount === 'number' ? parsed.clicksCount : DEFAULT_SNAPSHOT.clicksCount,
      nafahatMeta: parsed.nafahatMeta,
      motherOasisItems: Array.isArray(parsed.motherOasisItems) ? parsed.motherOasisItems : DEFAULT_SNAPSHOT.motherOasisItems,
      visitorReviews: Array.isArray(parsed.visitorReviews) ? parsed.visitorReviews : DEFAULT_SNAPSHOT.visitorReviews,
      gesture: parsed.gesture === 'multi_tap' ? 'multi_tap' : 'long_press',
      cachedAt: typeof parsed.cachedAt === 'string' ? parsed.cachedAt : DEFAULT_SNAPSHOT.cachedAt,
    };
  } catch {
    return DEFAULT_SNAPSHOT;
  }
}

export function saveSnapshot(snapshot: BootstrapSnapshot): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore storage quota errors
  }
}

export function getPublicSiteUrl(pathSuffix = '/?tab=home'): string {
  const normalized = pathSuffix.startsWith('/') ? pathSuffix : `/${pathSuffix}`;
  if (typeof window === 'undefined') {
    return `https://ax1ax70.ai.studio${normalized}`;
  }
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('ais-dev-')) {
    return `https://ax1ax70.ai.studio${normalized}`;
  }
  return `${window.location.origin}${normalized}`;
}
