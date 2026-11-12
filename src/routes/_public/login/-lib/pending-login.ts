import type { LoginMethod, OnboardingProfile } from '~/contexts/auth/types';

const PENDING_LOGIN_KEY = 'bloque:pending-otp-login';

export interface PendingLogin {
  method: LoginMethod;
  contact: string;
  resendAvailableAt: number;
  /** Set while signing up, so a reload still registers instead of signing in. */
  profile?: OnboardingProfile;
}

export function readPendingLogin(): PendingLogin | null {
  try {
    const raw = sessionStorage.getItem(PENDING_LOGIN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingLogin>;
    if (
      (parsed.method === 'email' || parsed.method === 'phone') &&
      typeof parsed.contact === 'string' &&
      typeof parsed.resendAvailableAt === 'number'
    ) {
      const { method, contact, resendAvailableAt, profile } = parsed;
      return isProfile(profile)
        ? { method, contact, resendAvailableAt, profile }
        : { method, contact, resendAvailableAt };
    }
    return null;
  } catch {
    return null;
  }
}

export function savePendingLogin(data: PendingLogin) {
  try {
    sessionStorage.setItem(PENDING_LOGIN_KEY, JSON.stringify(data));
  } catch {
    // sessionStorage unavailable (private mode, etc.) - resume across relaunch just won't work
  }
}

export function clearPendingLogin() {
  try {
    sessionStorage.removeItem(PENDING_LOGIN_KEY);
  } catch {
    // ignore
  }
}

function isProfile(value: unknown): value is OnboardingProfile {
  if (!value || typeof value !== 'object') return false;
  const { firstName, lastName } = value as Partial<OnboardingProfile>;
  return typeof firstName === 'string' && typeof lastName === 'string';
}
