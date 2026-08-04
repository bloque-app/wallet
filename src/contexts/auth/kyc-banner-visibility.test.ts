import { describe, expect, it } from 'bun:test';
import { shouldShowKycBanner } from './kyc-banner-visibility';

describe('shouldShowKycBanner', () => {
  it('does not nag a verified user', () => {
    expect(shouldShowKycBanner('approved')).toBe(false);
  });

  it('stays hidden when the status could not be confirmed', () => {
    // The actual production bug. `deriveKycStatus` returns `undefined` on a
    // timeout (5s), a 5xx or a network blip, and the old inline condition was
    // `kycStatus !== 'approved'` — so every slow compliance call told an
    // approved user to finish verifying.
    expect(shouldShowKycBanner(undefined)).toBe(false);
  });

  it('shows for every status we positively know is unverified', () => {
    expect(shouldShowKycBanner('not_started')).toBe(true);
    expect(shouldShowKycBanner('awaiting_verification')).toBe(true);
    expect(shouldShowKycBanner('rejected')).toBe(true);
  });
});
