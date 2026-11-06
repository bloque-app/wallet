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

  it('does not push a user who never started verification', () => {
    expect(shouldShowKycBanner('not_started')).toBe(false);
  });

  it('shows for a verification already in review or rejected', () => {
    expect(shouldShowKycBanner('awaiting_verification')).toBe(true);
    expect(shouldShowKycBanner('rejected')).toBe(true);
  });
});
