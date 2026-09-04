import { describe, expect, it } from 'bun:test';
import {
  needsFreshVerificationLink,
  verificationStartKey,
} from './verification-policy';

describe('needsFreshVerificationLink', () => {
  it('mints on a 404 (no verification exists yet)', () => {
    expect(
      needsFreshVerificationLink({
        fetchOutcome: 'not-found',
        status: undefined,
        hasUrl: false,
      }),
    ).toBe(true);
  });

  it('mints when the fetch succeeded but carries no url', () => {
    expect(
      needsFreshVerificationLink({
        fetchOutcome: 'success',
        status: 'awaiting_verification',
        hasUrl: false,
      }),
    ).toBe(true);
  });

  it('mints on rejected even though the fetch returned a url — the actual bug this fixes', () => {
    // A rejected verification's url is a spent, TTL-expired provider link.
    // The old condition only checked `!hasUrl`, so this case (url present,
    // status rejected) never re-triggered startVerification and the wallet
    // handed the dead link straight to the iframe.
    expect(
      needsFreshVerificationLink({
        fetchOutcome: 'success',
        status: 'rejected',
        hasUrl: true,
      }),
    ).toBe(true);
  });

  it('does not mint for a live in-progress verification', () => {
    expect(
      needsFreshVerificationLink({
        fetchOutcome: 'success',
        status: 'awaiting_verification',
        hasUrl: true,
      }),
    ).toBe(false);
  });

  it('does not mint once approved', () => {
    expect(
      needsFreshVerificationLink({
        fetchOutcome: 'success',
        status: 'approved',
        hasUrl: true,
      }),
    ).toBe(false);
  });

  it('does not mint on a transient fetch error (network blip, 5xx) — only a confirmed 404 should', () => {
    expect(
      needsFreshVerificationLink({
        fetchOutcome: 'other-error',
        status: undefined,
        hasUrl: false,
      }),
    ).toBe(false);
  });
});

describe('verificationStartKey', () => {
  it('changes when the status changes for the same urn', () => {
    const first = verificationStartKey('urn:test', 'rejected');
    const second = verificationStartKey('urn:test', 'awaiting_verification');
    expect(first).not.toBe(second);
  });

  it('is stable for the same urn+status pair (guards a single mint per attempt)', () => {
    expect(verificationStartKey('urn:test', 'rejected')).toBe(
      verificationStartKey('urn:test', 'rejected'),
    );
  });
});
