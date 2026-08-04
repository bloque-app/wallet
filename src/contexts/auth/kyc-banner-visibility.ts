import type { VerificationStatus } from '~/domain/kyc/types';

/**
 * Whether to show the "finish verifying" banner.
 *
 * Extracted from `__root.tsx` so it can be tested: the condition used to be an
 * inline `kycStatus !== 'approved'`, which shipped a real bug to production —
 * `deriveKycStatus` returns `undefined` for "couldn't confirm right now" (a
 * 5s timeout, a 5xx, a network blip), and `undefined !== 'approved'`, so
 * verified users were told to finish verifying whenever that call was slow.
 *
 * The `undefined` fail-safe is deliberate and right for *gating* a feature —
 * every consumer treats non-`'approved'` as not-yet-verified, so a failed
 * lookup can't unlock anything. It is wrong for a banner: failing closed on a
 * permission check protects the user, failing closed on a nag just tells a
 * verified person something untrue.
 *
 * So: only when we positively know they are unverified. This also suppresses
 * the banner flash on first paint, before the status has resolved.
 */
export function shouldShowKycBanner(
  kycStatus: VerificationStatus | undefined,
): boolean {
  return kycStatus !== undefined && kycStatus !== 'approved';
}
