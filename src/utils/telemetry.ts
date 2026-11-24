type InteractionKind = 'click' | 'sermon_read' | 'sermon_share' | 'adhkar_tap' | 'adhkar_complete';

interface QueuedBucket {
  kind: InteractionKind;
  category?: string;
  count: number;
}

const VISIT_SESSION_KEY = 'mawaedh_visit_logged_v1';
const PRESENCE_SID_KEY = 'mawaedh_presence_sid_v1';
const queue = new Map<string, QueuedBucket>();
let flushTimer: number | null = null;
let fallbackSessionId: string | null = null;

export function getPresenceSessionId(): string {
  if (typeof window === 'undefined') return 'ssr';
  try {
    const existing = window.sessionStorage.getItem(PRESENCE_SID_KEY);
    if (existing && existing.trim()) return existing;
    const generated =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `sid_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    window.sessionStorage.setItem(PRESENCE_SID_KEY, generated);
    return generated;
  } catch {
    if (!fallbackSessionId) {
      fallbackSessionId = `sid_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    }
    return fallbackSessionId;
  }
}

function flushTelemetry(): void {
  if (typeof window === 'undefined' || queue.size === 0) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

  const entries = [...queue.values()];
  queue.clear();

  for (const item of entries) {
    fetch('/api/telemetry/interaction', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(item),
      keepalive: true,
    }).catch(() => {
      // Silently ignore offline / transient telemetry errors
    });
  }
}

export function trackInteraction(kind: InteractionKind, category?: string): void {
  if (typeof window === 'undefined') return;
  const key = `${kind}:${category || ''}`;
  const existing = queue.get(key);
  if (existing) {
    existing.count = Math.min(200, existing.count + 1);
  } else {
    queue.set(key, {kind, category, count: 1});
  }

  if (flushTimer !== null) {
    window.clearTimeout(flushTimer);
  }

  // Batch rapid taps/clicks smoothly
  const delayMs = kind === 'adhkar_tap' || kind === 'click' ? 1400 : 250;
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    flushTelemetry();
  }, delayMs);
}

export async function trackVisitorSession(): Promise<{
  visitorsCount?: number;
  clicksCount?: number;
  onlineVisitorsCount?: number;
} | null> {
  if (typeof window === 'undefined') return null;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;
  const sessionId = getPresenceSessionId();
  try {
    if (window.sessionStorage.getItem(VISIT_SESSION_KEY) === '1') {
      return await sendPresenceHeartbeat();
    }
    const res = await fetch('/api/telemetry/visit', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({sessionId}),
    });
    if (!res.ok) return null;
    window.sessionStorage.setItem(VISIT_SESSION_KEY, '1');
    return (await res.json()) as {
      visitorsCount?: number;
      clicksCount?: number;
      onlineVisitorsCount?: number;
    };
  } catch {
    return null;
  }
}

export async function sendPresenceHeartbeat(): Promise<{
  visitorsCount?: number;
  clicksCount?: number;
  onlineVisitorsCount?: number;
} | null> {
  if (typeof window === 'undefined') return null;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;
  try {
    const res = await fetch('/api/telemetry/presence', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({sessionId: getPresenceSessionId()}),
      keepalive: true,
    });
    if (!res.ok) return null;
    return (await res.json()) as {
      visitorsCount?: number;
      clicksCount?: number;
      onlineVisitorsCount?: number;
    };
  } catch {
    return null;
  }
}

export function sendPresenceLeave(): void {
  if (typeof window === 'undefined') return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  const payload = JSON.stringify({sessionId: getPresenceSessionId(), leave: true});
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([payload], {type: 'application/json'});
      navigator.sendBeacon('/api/telemetry/presence', blob);
      return;
    }
  } catch {
    // Fallback to keepalive fetch
  }
  fetch('/api/telemetry/presence', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: payload,
    keepalive: true,
  }).catch(() => undefined);
}

if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushTelemetry();
    }
  });
}
