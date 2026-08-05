import type { TosStatus } from '~/domain/tos/types';

/**
 * Query parameter the hosted gate appends to `return_url` on its way back.
 *
 * Its presence means "we have just come back from the gate", whatever the
 * outcome was — accepted, declined, or expired.
 */
export const TOS_RETURN_PARAM = 'tos';

/**
 * Whether to send this user to the hosted Terms of Service gate.
 *
 * Extracted from `__root.tsx` for the same reason `shouldShowKycBanner` was:
 * the interesting part is the set of conditions, and inline conditions in a
 * component are conditions nobody tests.
 *
 * The second clause is load-bearing. Acceptance is recorded by compliance, not
 * by this app, so `tosStatus` here is whatever was resolved at authentication
 * time — it is still `'required'` on the render immediately after the gate
 * sends the user back. Without the `tos` check that stale value would send
 * them straight back to the gate they just completed, forever. The status is
 * re-derived on the next full authentication, which a returning full-page
 * navigation triggers anyway.
 *
 * That also covers declining: someone who backs out lands on the wallet rather
 * than in a redirect loop, and is asked again next time they sign in.
 */
export function shouldStartTosGate(params: {
  tosStatus: TosStatus | undefined;
  /** `window.location.search`, including the leading `?`. */
  search: string;
}): boolean {
  if (params.tosStatus !== 'required') return false;
  return !new URLSearchParams(params.search).has(TOS_RETURN_PARAM);
}
