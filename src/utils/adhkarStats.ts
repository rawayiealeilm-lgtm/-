import {getLocalDateKey} from './notifications';

export interface DailyAdhkarStat {
  adhkar: number;
  tasbeeh: number;
}

export interface WeeklyDayEntry {
  dateKey: string;
  shortLabel: string;
  fullLabel: string;
  isToday: boolean;
  adhkar: number;
  tasbeeh: number;
  total: number;
}

export interface WeeklyAdhkarSummary {
  days: WeeklyDayEntry[];
  totalWeek: number;
  totalAdhkarWeek: number;
  totalTasbeehWeek: number;
  todayTotal: number;
  dailyAverage: number;
  activeDaysCount: number;
  bestDay: WeeklyDayEntry | null;
  maxDayTotal: number;
}

const STATS_STORAGE_KEY = 'mawaedh_adhkar_weekly_stats_v1';
const LIFETIME_STORAGE_KEY = 'mawaedh_adhkar_lifetime_v1';
const ADHKAR_COUNTS_KEY = 'mawaedh_adhkar_counts_v1';
export const ADHKAR_STATS_UPDATED_EVENT = 'mawaedh:adhkar-stats-updated';

export interface LifetimeAdhkarStore {
  overallCount: number;
  dailyCounts: Record<string, number>;
  monthlyCounts: Record<string, number>;
}

export interface AdhkarProgressCards {
  todayCount: number;
  todayHasanat: number;
  monthCount: number;
  monthHasanat: number;
  overallCount: number;
  overallHasanat: number;
}

function getMonthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function readRawStatsMap(): Record<string, DailyAdhkarStat> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STATS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, Partial<DailyAdhkarStat>>;
    if (!parsed || typeof parsed !== 'object') return {};
    const clean: Record<string, DailyAdhkarStat> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(k) && v && typeof v === 'object') {
        clean[k] = {
          adhkar: typeof v.adhkar === 'number' && v.adhkar > 0 ? Math.floor(v.adhkar) : 0,
          tasbeeh: typeof v.tasbeeh === 'number' && v.tasbeeh > 0 ? Math.floor(v.tasbeeh) : 0,
        };
      }
    }
    return clean;
  } catch {
    return {};
  }
}

function readLifetimeStore(): LifetimeAdhkarStore {
  const empty: LifetimeAdhkarStore = {overallCount: 0, dailyCounts: {}, monthlyCounts: {}};
  if (typeof window === 'undefined') return empty;
  try {
    const raw = window.localStorage.getItem(LIFETIME_STORAGE_KEY);
    if (!raw) {
      // Seed from existing weekly stats if migrating for first time
      const rawMap = readRawStatsMap();
      const seeded: LifetimeAdhkarStore = {overallCount: 0, dailyCounts: {}, monthlyCounts: {}};
      for (const [dayKey, stat] of Object.entries(rawMap)) {
        const sum = stat.adhkar + stat.tasbeeh;
        if (sum > 0) {
          seeded.dailyCounts[dayKey] = sum;
          const mKey = dayKey.slice(0, 7);
          seeded.monthlyCounts[mKey] = (seeded.monthlyCounts[mKey] || 0) + sum;
          seeded.overallCount += sum;
        }
      }
      return seeded;
    }
    const parsed = JSON.parse(raw) as Partial<LifetimeAdhkarStore>;
    const cleanDaily: Record<string, number> = {};
    const cleanMonthly: Record<string, number> = {};
    if (parsed.dailyCounts && typeof parsed.dailyCounts === 'object') {
      for (const [k, v] of Object.entries(parsed.dailyCounts)) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(k) && typeof v === 'number' && v > 0) {
          cleanDaily[k] = Math.floor(v);
        }
      }
    }
    if (parsed.monthlyCounts && typeof parsed.monthlyCounts === 'object') {
      for (const [k, v] of Object.entries(parsed.monthlyCounts)) {
        if (/^\d{4}-\d{2}$/.test(k) && typeof v === 'number' && v > 0) {
          cleanMonthly[k] = Math.floor(v);
        }
      }
    }
    const derivedOverall = Object.values(cleanMonthly).reduce((s, n) => s + n, 0);
    const overallCount =
      typeof parsed.overallCount === 'number' && parsed.overallCount > derivedOverall
        ? Math.floor(parsed.overallCount)
        : derivedOverall;
    return {overallCount, dailyCounts: cleanDaily, monthlyCounts: cleanMonthly};
  } catch {
    return empty;
  }
}

function saveLifetimeStore(data: LifetimeAdhkarStore): void {
  if (typeof window === 'undefined') return;
  try {
    // Prune dailyCounts older than 65 days ONLY in per-day map while NEVER deleting monthlyCounts or overallCount
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 65);
    const cutoffKey = getLocalDateKey(cutoff);
    const recentDaily: Record<string, number> = {};
    for (const [k, v] of Object.entries(data.dailyCounts)) {
      if (k >= cutoffKey && v > 0) {
        recentDaily[k] = v;
      }
    }
    window.localStorage.setItem(
      LIFETIME_STORAGE_KEY,
      JSON.stringify({
        overallCount: data.overallCount,
        dailyCounts: recentDaily,
        monthlyCounts: data.monthlyCounts,
      }),
    );
  } catch {
    // Ignore storage quota issues
  }
}

function saveRawStatsMap(map: Record<string, DailyAdhkarStat>): void {
  if (typeof window === 'undefined') return;
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 35);
    const cutoffKey = getLocalDateKey(cutoff);
    const pruned: Record<string, DailyAdhkarStat> = {};
    for (const [k, v] of Object.entries(map)) {
      if (k >= cutoffKey && (v.adhkar > 0 || v.tasbeeh > 0)) {
        pruned[k] = v;
      }
    }
    window.localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(pruned));
  } catch {
    // Ignore storage quota issues
  }
}

function ensureTodayBaseline(map: Record<string, DailyAdhkarStat>): Record<string, DailyAdhkarStat> {
  if (typeof window === 'undefined') return map;
  const todayKey = getLocalDateKey();
  if (map[todayKey]) return map;

  try {
    const rawTodayAdhkar = window.localStorage.getItem(ADHKAR_COUNTS_KEY);
    if (!rawTodayAdhkar) return map;
    const parsed = JSON.parse(rawTodayAdhkar) as {
      dateKey?: string;
      counts?: Record<string, number>;
      freeTasbeeh?: number;
    };
    if (parsed?.dateKey !== todayKey) return map;

    const adhkarSum = parsed.counts
      ? Object.values(parsed.counts).reduce((sum, val) => sum + (typeof val === 'number' && val > 0 ? val : 0), 0)
      : 0;
    const tasbeehSum = typeof parsed.freeTasbeeh === 'number' && parsed.freeTasbeeh > 0 ? parsed.freeTasbeeh : 0;

    if (adhkarSum > 0 || tasbeehSum > 0) {
      const next = {
        ...map,
        [todayKey]: {adhkar: adhkarSum, tasbeeh: tasbeehSum},
      };
      saveRawStatsMap(next);
      return next;
    }
  } catch {
    // Ignore parse issues
  }
  return map;
}

export function recordDhikrTap(kind: 'adhkar' | 'tasbeeh', amount = 1): void {
  if (typeof window === 'undefined' || amount <= 0) return;
  const todayKey = getLocalDateKey();
  const monthKey = getMonthKey();
  const map = ensureTodayBaseline(readRawStatsMap());
  const current = map[todayKey] || {adhkar: 0, tasbeeh: 0};
  const next: Record<string, DailyAdhkarStat> = {
    ...map,
    [todayKey]: {
      adhkar: current.adhkar + (kind === 'adhkar' ? amount : 0),
      tasbeeh: current.tasbeeh + (kind === 'tasbeeh' ? amount : 0),
    },
  };
  saveRawStatsMap(next);

  const lifetime = readLifetimeStore();
  const nextDaily = Math.max(
    (lifetime.dailyCounts[todayKey] || 0) + amount,
    next[todayKey].adhkar + next[todayKey].tasbeeh,
  );
  const delta = Math.max(amount, nextDaily - (lifetime.dailyCounts[todayKey] || 0));
  const updatedLifetime: LifetimeAdhkarStore = {
    overallCount: lifetime.overallCount + delta,
    dailyCounts: {...lifetime.dailyCounts, [todayKey]: nextDaily},
    monthlyCounts: {
      ...lifetime.monthlyCounts,
      [monthKey]: (lifetime.monthlyCounts[monthKey] || 0) + delta,
    },
  };
  saveLifetimeStore(updatedLifetime);

  window.dispatchEvent(new CustomEvent(ADHKAR_STATS_UPDATED_EVENT));
}

export function getAdhkarProgressCards(): AdhkarProgressCards {
  const todayKey = getLocalDateKey();
  const monthKey = getMonthKey();
  const map = ensureTodayBaseline(readRawStatsMap());
  const lifetime = readLifetimeStore();

  const todayMapSum = (map[todayKey]?.adhkar || 0) + (map[todayKey]?.tasbeeh || 0);
  const todayCount = Math.max(todayMapSum, lifetime.dailyCounts[todayKey] || 0);
  const monthCount = Math.max(todayCount, lifetime.monthlyCounts[monthKey] || 0);
  const overallCount = Math.max(monthCount, lifetime.overallCount || 0);

  return {
    todayCount,
    todayHasanat: todayCount * 10,
    monthCount,
    monthHasanat: monthCount * 10,
    overallCount,
    overallHasanat: overallCount * 10,
  };
}

export function exportAdhkarLifetimePayload(): LifetimeAdhkarStore {
  return readLifetimeStore();
}

export function mergeAdhkarLifetimePayload(remote: unknown): void {
  if (typeof window === 'undefined' || !remote || typeof remote !== 'object') return;
  const r = remote as Partial<LifetimeAdhkarStore>;
  const local = readLifetimeStore();
  const mergedDaily = {...local.dailyCounts};
  const mergedMonthly = {...local.monthlyCounts};

  if (r.dailyCounts && typeof r.dailyCounts === 'object') {
    for (const [k, v] of Object.entries(r.dailyCounts)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(k) && typeof v === 'number' && v > 0) {
        mergedDaily[k] = Math.max(mergedDaily[k] || 0, Math.floor(v));
      }
    }
  }
  if (r.monthlyCounts && typeof r.monthlyCounts === 'object') {
    for (const [k, v] of Object.entries(r.monthlyCounts)) {
      if (/^\d{4}-\d{2}$/.test(k) && typeof v === 'number' && v > 0) {
        mergedMonthly[k] = Math.max(mergedMonthly[k] || 0, Math.floor(v));
      }
    }
  }
  const mergedOverall = Math.max(
    local.overallCount,
    typeof r.overallCount === 'number' ? Math.floor(r.overallCount) : 0,
    Object.values(mergedMonthly).reduce((s, n) => s + n, 0),
  );
  saveLifetimeStore({
    overallCount: mergedOverall,
    dailyCounts: mergedDaily,
    monthlyCounts: mergedMonthly,
  });
  window.dispatchEvent(new CustomEvent(ADHKAR_STATS_UPDATED_EVENT));
}

export function resetWeeklyAdhkarStats(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STATS_STORAGE_KEY);
  } catch {
    // Ignore
  }
  window.dispatchEvent(new CustomEvent(ADHKAR_STATS_UPDATED_EVENT));
}

export function getWeeklyAdhkarSummary(isEn: boolean): WeeklyAdhkarSummary {
  const map = ensureTodayBaseline(readRawStatsMap());
  const todayKey = getLocalDateKey();

  const shortFmt = new Intl.DateTimeFormat(isEn ? 'en-US' : 'ar-EG', {weekday: 'short'});
  const fullFmt = new Intl.DateTimeFormat(isEn ? 'en-US' : 'ar-EG', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const days: WeeklyDayEntry[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - offset);
    const dateKey = getLocalDateKey(d);
    const stat = map[dateKey] || {adhkar: 0, tasbeeh: 0};
    const total = stat.adhkar + stat.tasbeeh;
    days.push({
      dateKey,
      shortLabel: offset === 0 ? (isEn ? 'Today' : 'اليوم') : shortFmt.format(d),
      fullLabel: fullFmt.format(d),
      isToday: dateKey === todayKey,
      adhkar: stat.adhkar,
      tasbeeh: stat.tasbeeh,
      total,
    });
  }

  let totalAdhkarWeek = 0;
  let totalTasbeehWeek = 0;
  let activeDaysCount = 0;
  let maxDayTotal = 1;
  let bestDay: WeeklyDayEntry | null = null;

  for (const day of days) {
    totalAdhkarWeek += day.adhkar;
    totalTasbeehWeek += day.tasbeeh;
    if (day.total > 0) activeDaysCount += 1;
    if (day.total > maxDayTotal) maxDayTotal = day.total;
    if (day.total > 0 && (!bestDay || day.total > bestDay.total)) {
      bestDay = day;
    }
  }

  const totalWeek = totalAdhkarWeek + totalTasbeehWeek;
  const todayTotal = days[days.length - 1]?.total || 0;

  return {
    days,
    totalWeek,
    totalAdhkarWeek,
    totalTasbeehWeek,
    todayTotal,
    dailyAverage: Math.round(totalWeek / 7),
    activeDaysCount,
    bestDay,
    maxDayTotal,
  };
}
