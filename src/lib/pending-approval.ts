import type { SavedApproval } from '~/domain/approval/types';

/**
 * The operation waiting for the person's approval, kept across the
 * full-page redirect to the identity app. Tab-scoped `sessionStorage`, as
 * the SDK recommends: the approval token must never go in a URL.
 */
const PENDING_APPROVAL_KEY = 'bloque:pending-approval';

export function readPendingApproval(): SavedApproval | null {
  try {
    const raw = sessionStorage.getItem(PENDING_APPROVAL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedApproval>;
    if (
      typeof parsed.operation?.kind === 'string' &&
      typeof parsed.pending?.approvalToken === 'string' &&
      typeof parsed.pending.expiresAt === 'number' &&
      typeof parsed.returnTo === 'string'
    ) {
      return parsed as SavedApproval;
    }
    return null;
  } catch {
    return null;
  }
}

/** False when it could not be saved: the operation could not be resumed. */
export function savePendingApproval(saved: SavedApproval): boolean {
  try {
    sessionStorage.setItem(PENDING_APPROVAL_KEY, JSON.stringify(saved));
    return true;
  } catch {
    return false;
  }
}

export function clearPendingApproval() {
  try {
    sessionStorage.removeItem(PENDING_APPROVAL_KEY);
  } catch {
    // ignore
  }
}
