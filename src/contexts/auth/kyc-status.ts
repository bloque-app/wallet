import type { VerificationStatus } from '~/domain/kyc/types';
import { bloqueComplianceRepository } from '~/infra/bloque/compliance-repository';

/** Mirrors the same check in `auth-context.tsx`/`use-verification.ts` — kept
 * local (not shared) so this module has no dependency beyond the compliance
 * repository, which keeps it trivially testable in isolation. */
function isNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  return 'status' in error && (error as { status?: unknown }).status === 404;
}

/** Hard ceiling on how long login/session-refresh will wait on the
 * compliance service before giving up — without this, a slow or hanging
 * dependency could stall every login for as long as the SDK's own internal
 * retry budget allows (up to ~2 minutes: 30s timeout x up to 3 retries). */
const KYC_STATUS_FETCH_TIMEOUT_MS = 5_000;

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * The real fix for the KYC status bug: this used to be
 * `me.metadata.kyc_verified ? 'approved' : 'not_verified'`, a truthy check
 * on an unvalidated boolean that could never distinguish "rejected by the
 * compliance provider" from "never started" — both showed as
 * `not_verified`/`not_started`. `getVerification` is the one SDK call that
 * reports the real wire status, so it's the source of truth here.
 *
 * A 404 confidently means no verification has been started yet — that's a
 * real, known status, so it maps to `'not_started'`. Any OTHER failure
 * (network blip, timeout, 5xx) must NOT be collapsed into that same value —
 * doing so would silently downgrade an already-`approved` or already-
 * `rejected` user back to "never started" on a transient hiccup, which is
 * the same class of bug this function exists to fix, just via a different
 * path. `undefined` means "couldn't confirm right now"; every consumer
 * already treats non-`'approved'` as not-yet-verified, so this fails safe
 * (still gates verification-required features) without asserting a
 * specific, possibly-wrong status.
 */
export async function deriveKycStatus(
  urn: string,
): Promise<VerificationStatus | undefined> {
  try {
    const verification = await withTimeout(
      bloqueComplianceRepository.getVerification(urn),
      KYC_STATUS_FETCH_TIMEOUT_MS,
    );
    return verification.status;
  } catch (error) {
    if (isNotFoundError(error)) {
      return 'not_started';
    }
    console.error('Error fetching KYC verification status', error);
    return undefined;
  }
}
