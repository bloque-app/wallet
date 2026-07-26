import { beforeEach, describe, expect, mock, test } from 'bun:test';

type WireStatus = 'awaiting_compliance_verification' | 'approved' | 'rejected';

const getVerificationMock = mock(
  (): Promise<{ status: WireStatus }> =>
    Promise.resolve({ status: 'approved' }),
);

mock.module('~/infra/bloque/compliance-repository', () => ({
  bloqueComplianceRepository: { getVerification: getVerificationMock },
}));

const { deriveKycStatus, withTimeout } = await import('./kyc-status');

describe('withTimeout', () => {
  test('resolves with the underlying value when it settles in time', async () => {
    const result = await withTimeout(Promise.resolve('ok'), 50);
    expect(result).toBe('ok');
  });

  test('rejects if the underlying promise never settles within the deadline', async () => {
    const neverSettles = new Promise<string>(() => {});
    await expect(withTimeout(neverSettles, 10)).rejects.toThrow();
  });
});

describe('deriveKycStatus — the actual bug this refactor fixes', () => {
  beforeEach(() => {
    getVerificationMock.mockClear();
  });

  test('passes through a real, mapped status on success (e.g. rejected)', async () => {
    getVerificationMock.mockImplementationOnce(() =>
      Promise.resolve({ status: 'rejected' as const }),
    );

    const status = await deriveKycStatus('urn:test');

    expect(status).toBe('rejected');
  });

  test('a 404 confidently maps to not_started', async () => {
    getVerificationMock.mockImplementationOnce(() =>
      Promise.reject({ status: 404 }),
    );

    const status = await deriveKycStatus('urn:test');

    expect(status).toBe('not_started');
  });

  test('a transient failure (network error, 5xx, timeout) never collapses to not_started', async () => {
    getVerificationMock.mockImplementationOnce(() =>
      Promise.reject(new Error('network blip')),
    );

    const status = await deriveKycStatus('urn:test');

    // This is the regression this fix targets: an already-approved or
    // already-rejected user must never be silently downgraded to
    // not_started just because a request failed transiently.
    expect(status).toBeUndefined();
    expect(status).not.toBe('not_started');
  });

  test('a 5xx-shaped failure also resolves to undefined, not not_started', async () => {
    getVerificationMock.mockImplementationOnce(() =>
      Promise.reject({ status: 500 }),
    );

    const status = await deriveKycStatus('urn:test');

    expect(status).toBeUndefined();
  });
});
