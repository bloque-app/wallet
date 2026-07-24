import type { LoginMethod } from '~/contexts/auth/types';

const PENDING_LOGIN_KEY = 'bloque:pending-otp-login';

export interface PendingLogin {
  method: LoginMethod;
  contact: string;
  resendAvailableAt: number;
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
      return parsed as PendingLogin;
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
