import { describe, expect, it } from 'bun:test';
import { shouldStartTosGate } from './tos-gate-redirect';

describe('shouldStartTosGate', () => {
  it('sends someone who still owes an acceptance to the gate', () => {
    expect(shouldStartTosGate({ tosStatus: 'required', search: '' })).toBe(
      true,
    );
  });

  it('leaves someone who has already accepted alone', () => {
    expect(shouldStartTosGate({ tosStatus: 'accepted', search: '' })).toBe(
      false,
    );
  });

  it('does not gate on a status it could not confirm', () => {
    // The opposite call to `shouldShowKycBanner`, and deliberately so: an
    // unconfirmed KYC status hides a feature, but treating an unconfirmed TOS
    // status as "required" would bounce every signed-in user into a gate
    // whenever compliance is slow — including people who accepted long ago.
    expect(shouldStartTosGate({ tosStatus: 'unknown', search: '' })).toBe(
      false,
    );
    expect(shouldStartTosGate({ tosStatus: undefined, search: '' })).toBe(
      false,
    );
  });

  it('does not bounce a returning user straight back into the gate', () => {
    // The redirect loop this guard exists for. `tosStatus` is resolved once at
    // authentication time, so it is still 'required' on the render right after
    // the gate hands the user back — the acceptance lives in compliance, not
    // in this app's state.
    expect(
      shouldStartTosGate({ tosStatus: 'required', search: '?tos=accepted' }),
    ).toBe(false);
  });

  it('also stands down when the gate hands back any other outcome', () => {
    // Declining must not loop either, and the app should not have to enumerate
    // the gate's outcome vocabulary to avoid one — presence of the key is the
    // signal, not its value.
    expect(
      shouldStartTosGate({ tosStatus: 'required', search: '?tos=declined' }),
    ).toBe(false);
    expect(shouldStartTosGate({ tosStatus: 'required', search: '?tos=' })).toBe(
      false,
    );
  });

  it('is not confused by other query parameters', () => {
    expect(
      shouldStartTosGate({ tosStatus: 'required', search: '?redirect=/card' }),
    ).toBe(true);
    // Substring-matching `search` for 'tos' would wrongly match this.
    expect(
      shouldStartTosGate({ tosStatus: 'required', search: '?photos=1' }),
    ).toBe(true);
  });
});
