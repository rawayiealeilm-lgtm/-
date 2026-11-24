import {useCallback, useEffect, useState} from 'react';

export interface LiveStatsState {
  visitors: number;
  views: number;
  downloadsTotal: number;
  interactions: number;
  itemDownloads: Record<string, number>;
  lastVisitedDate: string;
}

const LIVE_STATS_KEY = 'mawaedh_live_stats_v1';
const LIVE_STATS_EVENT = 'mawaedh:live-stats-updated';
const VISIT_SESSION_MARK = 'mawaedh_session_counted_v1';

const DEFAULT_STATS: LiveStatsState = {
  visitors: 4001,
  views: 4285,
  downloadsTotal: 312,
  interactions: 1140,
  itemDownloads: {},
  lastVisitedDate: new Date().toISOString().slice(0, 10),
};

export function loadLiveStats(): LiveStatsState {
  if (typeof window === 'undefined') return DEFAULT_STATS;
  try {
    const raw = window.localStorage.getItem(LIVE_STATS_KEY);
    if (!raw) {
      window.localStorage.setItem(LIVE_STATS_KEY, JSON.stringify(DEFAULT_STATS));
      return DEFAULT_STATS;
    }
    const parsed = JSON.parse(raw) as Partial<LiveStatsState>;
    const normalized: LiveStatsState = {
      visitors: Math.max(4001, Number(parsed.visitors) || 4001),
      views: Math.max(4001, Number(parsed.views) || 4285),
      downloadsTotal: Math.max(0, Number(parsed.downloadsTotal) || 0),
      interactions: Math.max(0, Number(parsed.interactions) || 0),
      itemDownloads:
        parsed.itemDownloads && typeof parsed.itemDownloads === 'object' ? parsed.itemDownloads : {},
      lastVisitedDate:
        typeof parsed.lastVisitedDate === 'string'
          ? parsed.lastVisitedDate
          : new Date().toISOString().slice(0, 10),
    };
    return normalized;
  } catch {
    return DEFAULT_STATS;
  }
}

function persistLiveStats(next: LiveStatsState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LIVE_STATS_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(LIVE_STATS_EVENT, {detail: next}));
  } catch {
    // ignore storage limits
  }
}

export function registerInitialVisit(): void {
  if (typeof window === 'undefined') return;
  try {
    if (window.sessionStorage.getItem(VISIT_SESSION_MARK) === '1') return;
    window.sessionStorage.setItem(VISIT_SESSION_MARK, '1');
    const current = loadLiveStats();
    const next: LiveStatsState = {
      ...current,
      visitors: Math.max(4000, current.visitors) + 1,
      views: current.views + 1,
      lastVisitedDate: new Date().toISOString().slice(0, 10),
    };
    persistLiveStats(next);
  } catch {
    // ignore
  }
}

export function incrementLiveView(): void {
  const current = loadLiveStats();
  const next: LiveStatsState = {
    ...current,
    views: current.views + 1,
    interactions: current.interactions + 1,
  };
  persistLiveStats(next);
}

export function incrementLiveDownload(itemId?: string): void {
  const current = loadLiveStats();
  const nextItemDownloads = {...current.itemDownloads};
  if (itemId) {
    nextItemDownloads[itemId] = (nextItemDownloads[itemId] || 0) + 1;
  }
  const next: LiveStatsState = {
    ...current,
    downloadsTotal: current.downloadsTotal + 1,
    interactions: current.interactions + 1,
    itemDownloads: nextItemDownloads,
  };
  persistLiveStats(next);
}

export function incrementLiveInteraction(): void {
  const current = loadLiveStats();
  const next: LiveStatsState = {
    ...current,
    interactions: current.interactions + 1,
  };
  persistLiveStats(next);
}

export function getItemDownloadCount(stats: LiveStatsState, itemId: string, baseSeed = 14): number {
  return baseSeed + (stats.itemDownloads[itemId] || 0);
}

export function useLiveStats() {
  const [stats, setStats] = useState<LiveStatsState>(() => loadLiveStats());

  useEffect(() => {
    registerInitialVisit();
    setStats(loadLiveStats());

    const onUpdate = (ev: Event) => {
      const custom = ev as CustomEvent<LiveStatsState>;
      if (custom.detail) setStats(custom.detail);
      else setStats(loadLiveStats());
    };
    window.addEventListener(LIVE_STATS_EVENT, onUpdate);
    return () => window.removeEventListener(LIVE_STATS_EVENT, onUpdate);
  }, []);

  const recordView = useCallback(() => {
    incrementLiveView();
  }, []);

  const recordDownload = useCallback((itemId?: string) => {
    incrementLiveDownload(itemId);
  }, []);

  const recordInteraction = useCallback(() => {
    incrementLiveInteraction();
  }, []);

  const engagementRate = Math.min(
    99,
    Math.max(
      24,
      Math.round(((stats.downloadsTotal + stats.interactions) / Math.max(stats.views, 1)) * 100),
    ),
  );

  return {
    stats,
    engagementRate,
    recordView,
    recordDownload,
    recordInteraction,
  };
}
