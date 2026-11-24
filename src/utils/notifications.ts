export interface AdhkarReminderSettings {
  enabled: boolean;
  morningEnabled: boolean;
  morningTime: string;
  eveningEnabled: boolean;
  eveningTime: string;
  lastMorningNotifiedDate: string;
  lastEveningNotifiedDate: string;
}

const REMINDER_STORAGE_KEY = 'mawaedh_adhkar_reminders_v1';

export const DEFAULT_REMINDER_SETTINGS: AdhkarReminderSettings = {
  enabled: false,
  morningEnabled: true,
  morningTime: '06:00',
  eveningEnabled: true,
  eveningTime: '16:30',
  lastMorningNotifiedDate: '',
  lastEveningNotifiedDate: '',
};

export function getLocalDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function normalizeTimeString(val: unknown, fallback: string): string {
  if (typeof val !== 'string') return fallback;
  const trimmed = val.trim();
  return /^\d{2}:\d{2}$/.test(trimmed) ? trimmed : fallback;
}

export function loadReminderSettings(): AdhkarReminderSettings {
  if (typeof window === 'undefined') return DEFAULT_REMINDER_SETTINGS;
  try {
    const raw = window.localStorage.getItem(REMINDER_STORAGE_KEY);
    if (!raw) return DEFAULT_REMINDER_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AdhkarReminderSettings>;
    return {
      enabled: Boolean(parsed.enabled),
      morningEnabled: parsed.morningEnabled !== false,
      morningTime: normalizeTimeString(parsed.morningTime, DEFAULT_REMINDER_SETTINGS.morningTime),
      eveningEnabled: parsed.eveningEnabled !== false,
      eveningTime: normalizeTimeString(parsed.eveningTime, DEFAULT_REMINDER_SETTINGS.eveningTime),
      lastMorningNotifiedDate:
        typeof parsed.lastMorningNotifiedDate === 'string' ? parsed.lastMorningNotifiedDate : '',
      lastEveningNotifiedDate:
        typeof parsed.lastEveningNotifiedDate === 'string' ? parsed.lastEveningNotifiedDate : '',
    };
  } catch {
    return DEFAULT_REMINDER_SETTINGS;
  }
}

export function saveReminderSettings(settings: AdhkarReminderSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage errors
  }
}

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return window.Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported';
  if (window.Notification.permission === 'granted') return 'granted';
  try {
    return await window.Notification.requestPermission();
  } catch {
    return window.Notification.permission;
  }
}

export async function dispatchLocalNotification({
  title,
  body,
  tag,
  onClickNavigate,
}: {
  title: string;
  body: string;
  tag: string;
  onClickNavigate?: () => void;
}): Promise<boolean> {
  if (!isNotificationSupported() || window.Notification.permission !== 'granted') {
    return false;
  }

  try {
    if ('serviceWorker' in navigator) {
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 1200)),
      ]);
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(title, {
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag,
          dir: 'rtl',
          lang: 'ar',
          data: {url: '/?tab=adhkar'},
        });
        return true;
      }
    }
  } catch {
    // Fallback to Notification constructor below
  }

  try {
    const notification = new window.Notification(title, {
      body,
      icon: '/pwa-192x192.png',
      tag,
      dir: 'rtl',
      lang: 'ar',
    });
    notification.onclick = () => {
      try {
        window.focus();
        onClickNavigate?.();
        notification.close();
      } catch {
        // Ignore
      }
    };
    return true;
  } catch {
    return false;
  }
}

function parseMinutes(hhmm: string): number {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return -1;
  return h * 60 + m;
}

export async function checkAndTriggerScheduledReminders({
  settings,
  isEn,
  appName,
  onUpdateSettings,
  onOpenAdhkar,
  onInAppNotify,
}: {
  settings: AdhkarReminderSettings;
  isEn: boolean;
  appName: string;
  onUpdateSettings: (next: AdhkarReminderSettings) => void;
  onOpenAdhkar: () => void;
  onInAppNotify: (msg: string) => void;
}): Promise<void> {
  if (!settings.enabled) return;

  const now = new Date();
  const todayKey = getLocalDateKey(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  let updated = settings;
  let changed = false;

  if (settings.morningEnabled && settings.lastMorningNotifiedDate !== todayKey) {
    const targetMinutes = parseMinutes(settings.morningTime);
    if (targetMinutes >= 0 && nowMinutes >= targetMinutes && nowMinutes - targetMinutes <= 15) {
      const title = isEn ? `Morning Adhkar · ${appName}` : `تذكير أذكار الصباح · ${appName}`;
      const body = isEn
        ? 'Time for your Morning Adhkar and comprehensive daily supplications.'
        : 'حان الآن موعد أذكار الصباح والأذكار والأدعية الجامعة؛ حصّن يومك بذكر الله.';
      await dispatchLocalNotification({
        title,
        body,
        tag: `mawaedh-morning-${todayKey}`,
        onClickNavigate: onOpenAdhkar,
      });
      onInAppNotify(body);
      updated = {...updated, lastMorningNotifiedDate: todayKey};
      changed = true;
    }
  }

  if (settings.eveningEnabled && settings.lastEveningNotifiedDate !== todayKey) {
    const targetMinutes = parseMinutes(settings.eveningTime);
    if (targetMinutes >= 0 && nowMinutes >= targetMinutes && nowMinutes - targetMinutes <= 15) {
      const title = isEn ? `Evening Adhkar · ${appName}` : `تذكير أذكار المساء · ${appName}`;
      const body = isEn
        ? 'Time for your Evening Adhkar and protective supplications.'
        : 'حان الآن موعد أذكار المساء والأذكار والأدعية الجامعة؛ بارك الله مساءك بالطاعة والحفظ.';
      await dispatchLocalNotification({
        title,
        body,
        tag: `mawaedh-evening-${todayKey}`,
        onClickNavigate: onOpenAdhkar,
      });
      onInAppNotify(body);
      updated = {...updated, lastEveningNotifiedDate: todayKey};
      changed = true;
    }
  }

  if (changed) {
    onUpdateSettings(updated);
  }
}
