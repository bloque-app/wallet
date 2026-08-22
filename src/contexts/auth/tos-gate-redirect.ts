import type { TosStatus } from '~/domain/tos/types';

/**
 * Query parameter the hosted gate appends to `return_url` on its way back.
 *
 * Its presence means "we have just come back from the gate", whatever the
 * outcome was — accepted, declined, or expired.
 */
export const TOS_RETURN_PARAM = 'tos';

/** What the app should do about an outstanding Terms of Service acceptance. */
export type TosPrompt =
  /** Nothing owed, or we have just come back from the gate. */
  | 'none'
  /** Send them straight to the hosted gate. */
  | 'redirect'
  /** Ask first, then send them if they agree. */
  | 'dialog';

/**
 * Whether to send this user to the hosted Terms of Service gate, ask them
 * first, or leave them alone.
 *
 * Extracted from `__root.tsx` for the same reason `shouldShowKycBanner` was:
 * the interesting part is the set of conditions, and inline conditions in a
 * component are conditions nobody tests.
 *
 * The `tos` check is load-bearing. Acceptance is recorded by compliance, not by
 * this app, so `tosStatus` here is whatever was last resolved — it is still
 * `'required'` on the render immediately after the gate sends the user back.
 * Without this the stale value would send them straight back to the gate they
 * just completed, forever. That also covers declining: someone who backs out
 * lands on the wallet rather than in a redirect loop.
 *
 * `settled` is what separates the two ways of prompting, and the distinction
 * matters more than it looks. On a page load nothing is in flight, so
 * redirecting immediately costs the user nothing and is the least ceremony. But
 * a session that has been open for a while can become non-compliant underneath
 * the user — a new document version activates, or a grace period lapses — and
 * yanking someone out of a half-filled transfer to a hosted page they did not
 * ask for is a good way to lose their work and their trust. So mid-session we
 * ask, and they choose when to go.
 */
export function tosPromptFor(params: {
  tosStatus: TosStatus | undefined;
  /** `window.location.search`, including the leading `?`. */
  search: string;
  /**
   * Whether a status has already been resolved once during this page load.
   * False on the first resolution, true for any later change.
   */
  settled: boolean;
}): TosPrompt {
  if (params.tosStatus !== 'required') return 'none';
  if (new URLSearchParams(params.search).has(TOS_RETURN_PARAM)) return 'none';
  return params.settled ? 'dialog' : 'redirect';
}
