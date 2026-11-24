import {useEffect, useState} from 'react';

export type WirdGoalType = 'juz' | 'half_juz' | 'hizb' | 'pages';

export interface DailyWirdState {
  goalType: WirdGoalType;
  targetPages: number;
  currentPage: number;
  pagesReadToday: number;
  streakDays: number;
  completedDate: string | null;
  lastActiveDate: string;
  habits: {
    morningEveningAdhkar: boolean;
    duhaPrayer: boolean;
    witrPrayer: boolean;
  };
}

const WIRD_STORAGE_KEY = 'mawaedh_daily_wird_v1';
const WIRD_EVENT = 'mawaedh:daily-wird-changed';

export const WIRD_GOAL_OPTIONS: Array<{
  id: WirdGoalType;
  label: string;
  defaultPages: number;
  hint: string;
}> = [
  {id: 'juz', label: 'جزء كامل يومياً', defaultPages: 20, hint: '20 صفحة يومياً · ختمة في شهر'},
  {id: 'half_juz', label: 'نصف جزء يومياً', defaultPages: 10, hint: '10 صفحات يومياً · ختمة في شهرين'},
  {id: 'hizb', label: 'حزب واحد (ربعان)', defaultPages: 5, hint: '5 صفحات يومياً · ميسرة ومنتظمة'},
  {id: 'pages', label: 'عدد صفحات مخصص', defaultPages: 4, hint: 'حدّد قدر طاقتك (قليل دائم)'},
];

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function loadDailyWird(): DailyWirdState {
  const today = todayStr();
  const defaults: DailyWirdState = {
    goalType: 'hizb',
    targetPages: 5,
    currentPage: 1,
    pagesReadToday: 0,
    streakDays: 1,
    completedDate: null,
    lastActiveDate: today,
    habits: {
      morningEveningAdhkar: false,
      duhaPrayer: false,
      witrPrayer: false,
    },
  };
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = window.localStorage.getItem(WIRD_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<DailyWirdState>;
    const isNewDay = parsed.lastActiveDate !== today;
    return {
      goalType: parsed.goalType || 'hizb',
      targetPages: Math.max(1, Math.min(60, Number(parsed.targetPages) || 5)),
      currentPage: Math.max(1, Math.min(604, Number(parsed.currentPage) || 1)),
      pagesReadToday: isNewDay ? 0 : Math.max(0, Number(parsed.pagesReadToday) || 0),
      streakDays: Math.max(0, Number(parsed.streakDays) || 1),
      completedDate: parsed.completedDate || null,
      lastActiveDate: today,
      habits: isNewDay
        ? {morningEveningAdhkar: false, duhaPrayer: false, witrPrayer: false}
        : {
            morningEveningAdhkar: Boolean(parsed.habits?.morningEveningAdhkar),
            duhaPrayer: Boolean(parsed.habits?.duhaPrayer),
            witrPrayer: Boolean(parsed.habits?.witrPrayer),
          },
    };
  } catch {
    return defaults;
  }
}

export function saveDailyWird(next: DailyWirdState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(WIRD_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(WIRD_EVENT, {detail: next}));
  } catch {
    // ignore
  }
}

export function useDailyWird() {
  const [wird, setWird] = useState<DailyWirdState>(() => loadDailyWird());

  useEffect(() => {
    const handler = (ev: Event) => {
      const custom = ev as CustomEvent<DailyWirdState>;
      if (custom.detail) setWird(custom.detail);
      else setWird(loadDailyWird());
    };
    window.addEventListener(WIRD_EVENT, handler);
    return () => window.removeEventListener(WIRD_EVENT, handler);
  }, []);

  const updateWird = (updater: Partial<DailyWirdState>) => {
    setWird((prev) => {
      const next: DailyWirdState = {
        ...prev,
        ...updater,
        lastActiveDate: todayStr(),
      };
      saveDailyWird(next);
      return next;
    });
  };

  const setGoal = (goalType: WirdGoalType, customPages?: number) => {
    const meta = WIRD_GOAL_OPTIONS.find((o) => o.id === goalType) || WIRD_GOAL_OPTIONS[2];
    const targetPages = customPages ? Math.max(1, Math.min(60, customPages)) : meta.defaultPages;
    updateWird({goalType, targetPages});
  };

  const markTodayComplete = () => {
    const today = todayStr();
    const alreadyDone = wird.completedDate === today;
    const nextPage = Math.min(604, wird.currentPage + (alreadyDone ? 0 : wird.targetPages));
    updateWird({
      pagesReadToday: wird.targetPages,
      currentPage: nextPage,
      completedDate: today,
      streakDays: alreadyDone ? wird.streakDays : wird.streakDays + 1,
    });
  };

  const toggleHabit = (key: keyof DailyWirdState['habits']) => {
    updateWird({
      habits: {
        ...wird.habits,
        [key]: !wird.habits[key],
      },
    });
  };

  const isCompletedToday = wird.completedDate === todayStr();
  const progressPct = Math.min(
    100,
    Math.round(((isCompletedToday ? wird.targetPages : wird.pagesReadToday) / Math.max(wird.targetPages, 1)) * 100),
  );

  return {
    wird,
    isCompletedToday,
    progressPct,
    updateWird,
    setGoal,
    markTodayComplete,
    toggleHabit,
  };
}
