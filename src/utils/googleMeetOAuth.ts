import {GoogleAuthProvider, onAuthStateChanged, signInWithPopup, type User} from 'firebase/auth';
import {auth} from '../firebase';

export const MEET_SCOPES = ['https://www.googleapis.com/auth/meetings.space.created'] as const;
export const DEFAULT_MEET_HOST_EMAIL = 'ax1ax70@gmail.com';

let cachedMeetAccessToken: string | null = null;
let cachedMeetUserEmail: string | null = null;
let isSigningInForMeet = false;

export interface MeetSpaceResult {
  name: string;
  meetingUri: string;
  meetingCode?: string;
}

export function initMeetOAuthObserver(
  onStatusChange: (connected: boolean, user: User | null) => void,
): () => void {
  return onAuthStateChanged(auth, (user) => {
    if (!user) {
      cachedMeetAccessToken = null;
      cachedMeetUserEmail = null;
      onStatusChange(false, null);
      return;
    }
    if (cachedMeetAccessToken) {
      cachedMeetUserEmail = user.email || cachedMeetUserEmail;
      onStatusChange(true, user);
    } else if (!isSigningInForMeet) {
      cachedMeetAccessToken = null;
      cachedMeetUserEmail = null;
      onStatusChange(false, user);
    }
  });
}

export function hasMeetAccessToken(): boolean {
  return Boolean(cachedMeetAccessToken);
}

export function getConnectedMeetEmail(): string | null {
  return cachedMeetAccessToken ? cachedMeetUserEmail || auth.currentUser?.email || null : null;
}

export function clearMeetAccessToken(): void {
  cachedMeetAccessToken = null;
  cachedMeetUserEmail = null;
}

export async function connectGoogleMeetWithPopup(
  loginHint: string = DEFAULT_MEET_HOST_EMAIL,
): Promise<{
  user: User;
  accessToken: string;
}> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'consent select_account',
    ...(loginHint.trim() ? {login_hint: loginHint.trim()} : {}),
  });
  for (const scope of MEET_SCOPES) {
    provider.addScope(scope);
  }

  try {
    isSigningInForMeet = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('تعذر الحصول على رمز صلاحية Google Meet من الجلسة.');
    }
    cachedMeetAccessToken = credential.accessToken;
    cachedMeetUserEmail = result.user.email || loginHint.trim() || null;
    return {user: result.user, accessToken: cachedMeetAccessToken};
  } finally {
    isSigningInForMeet = false;
  }
}

export async function createGoogleMeetSpace(): Promise<MeetSpaceResult> {
  if (!cachedMeetAccessToken) {
    throw new Error('MEET_AUTH_REQUIRED');
  }

  const res = await fetch('https://meet.googleapis.com/v2/spaces', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cachedMeetAccessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  if (res.status === 401 || res.status === 403) {
    cachedMeetAccessToken = null;
    cachedMeetUserEmail = null;
    throw new Error('MEET_AUTH_REQUIRED');
  }

  const data = (await res.json().catch(() => ({}))) as {
    name?: string;
    meetingUri?: string;
    meetingCode?: string;
    error?: {message?: string};
  };

  if (!res.ok || !data.meetingUri) {
    throw new Error(data.error?.message || 'تعذر إنشاء مساحة Google Meet عبر Google API.');
  }

  return {
    name: data.name || '',
    meetingUri: data.meetingUri,
    meetingCode: data.meetingCode,
  };
}
