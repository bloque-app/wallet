import { describe, expect, it } from 'bun:test';
import { kycGateState } from './kyc-gate';

describe('kycGateState', () => {
  it('lets an approved user through', () => {
    expect(kycGateState('approved')).toBe('allowed');
  });

  it('blocks every status that is not approved', () => {
    expect(kycGateState('not_started')).toBe('not_started');
    expect(kycGateState('awaiting_verification')).toBe('in_review');
    expect(kycGateState('rejected')).toBe('rejected');
  });

  it('keeps an unconfirmed status blocked but distinct from not verified', () => {
    expect(kycGateState(undefined)).toBe('unconfirmed');
  });
});
