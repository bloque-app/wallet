import { describe, expect, it } from 'bun:test';
import { tosPromptFor } from './tos-gate-redirect';

/** The common case: a page load, nothing resolved yet. */
const onLoad = { search: '', settled: false };
/** A session that has been open a while and already knows where it stands. */
const midSession = { search: '', settled: true };

describe('tosPromptFor', () => {
  it('redirects someone who still owes an acceptance at sign-in', () => {
    // The behaviour that was there before the dialog existed, and the one that
    // must not change: signing in with terms outstanding goes straight to the
    // hosted gate.
    expect(tosPromptFor({ tosStatus: 'required', ...onLoad })).toBe('redirect');
  });

  it('asks first when the session goes stale underneath the user', () => {
    // A new version activating, or a grace period lapsing, mid-session. They
    // may be halfway through a transfer, so a hosted page appearing unbidden
    // would lose that work.
    expect(tosPromptFor({ tosStatus: 'required', ...midSession })).toBe(
      'dialog',
    );
  });

  it('leaves someone who has already accepted alone', () => {
    expect(tosPromptFor({ tosStatus: 'accepted', ...onLoad })).toBe('none');
    expect(tosPromptFor({ tosStatus: 'accepted', ...midSession })).toBe('none');
  });

  it('does not gate on a status it could not confirm', () => {
    // The opposite call to `shouldShowKycBanner`, and deliberately so: an
    // unconfirmed KYC status hides a feature, but treating an unconfirmed TOS
    // status as "required" would bounce every signed-in user into a gate
    // whenever compliance is slow — including people who accepted long ago.
    // Mid-session it would be worse still: a dialog over their work.
    expect(tosPromptFor({ tosStatus: 'unknown', ...onLoad })).toBe('none');
    expect(tosPromptFor({ tosStatus: 'unknown', ...midSession })).toBe('none');
    expect(tosPromptFor({ tosStatus: undefined, ...onLoad })).toBe('none');
  });

  it('does not bounce a returning user straight back into the gate', () => {
    // The redirect loop this guard exists for. `tosStatus` is resolved once at
    // authentication, so it is still 'required' on the render right after the
    // gate hands the user back — the acceptance lives in compliance, not in
    // this app's state.
    expect(
      tosPromptFor({
        tosStatus: 'required',
        search: '?tos=accepted',
        settled: false,
      }),
    ).toBe('none');
  });

  it('also stands down when the gate hands back any other outcome', () => {
    // Declining must not loop either, and the app should not have to enumerate
    // the gate's outcome vocabulary to avoid one — presence of the key is the
    // signal, not its value.
    for (const search of ['?tos=declined', '?tos=']) {
      expect(
        tosPromptFor({ tosStatus: 'required', search, settled: false }),
      ).toBe('none');
      expect(
        tosPromptFor({ tosStatus: 'required', search, settled: true }),
      ).toBe('none');
    }
  });

  it('is not confused by other query parameters', () => {
    expect(
      tosPromptFor({
        tosStatus: 'required',
        search: '?redirect=/card',
        settled: false,
      }),
    ).toBe('redirect');
    // Substring-matching `search` for 'tos' would wrongly match this.
    expect(
      tosPromptFor({
        tosStatus: 'required',
        search: '?photos=1',
        settled: false,
      }),
    ).toBe('redirect');
  });
});
