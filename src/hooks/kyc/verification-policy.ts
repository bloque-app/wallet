import type { VerificationStatus } from '~/domain/kyc/types';

/**
 * Decides whether `useVerification` needs to mint a fresh provider link via
 * `startVerification`, instead of showing whatever `getVerification` just
 * returned. True when there's no verification yet (404), the fetched one
 * carries no usable `url`, or the last attempt was `rejected` — a rejected
 * verification's `url` is a spent, TTL-expired provider link, so passing it
 * straight to the iframe is what previously produced Sumsub's "Verification
 * expired" screen on retry instead of a fresh one.
 */
export function needsFreshVerificationLink(params: {
  fetchOutcome: 'success' | 'not-found' | 'other-error';
  status: VerificationStatus | undefined;
  hasUrl: boolean;
}): boolean {
  if (params.fetchOutcome === 'not-found') return true;
  if (params.fetchOutcome !== 'success') return false;
  if (!params.hasUrl) return true;
  return params.status === 'rejected';
}

/**
 * Key for the "already started a mint for this" guard ref. Keyed on
 * urn+status rather than urn alone, so a user who gets rejected more than
 * once still gets a new link minted on each rejection instead of only the
 * very first one.
 */
export function verificationStartKey(
  urn: string,
  status: VerificationStatus | undefined,
): string {
  return `${urn}:${status ?? 'none'}`;
}
