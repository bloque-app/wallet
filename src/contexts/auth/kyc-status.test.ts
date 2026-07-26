import { describe, expect, test } from 'bun:test';
import { deriveKycStatus, withTimeout } from './kyc-status';

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
  test('passes through a real, mapped status on success (e.g. rejected)', async () => {
    const status = await deriveKycStatus('urn:test', () =>
      Promise.resolve({ status: 'rejected' as const }),
    );

    expect(status).toBe('rejected');
  });

  test('a 404 confidently maps to not_started', async () => {
    const status = await deriveKycStatus('urn:test', () =>
      Promise.reject({ status: 404 }),
    );

    expect(status).toBe('not_started');
  });

  test('a transient failure (network error, 5xx, timeout) never collapses to not_started', async () => {
    const status = await deriveKycStatus('urn:test', () =>
      Promise.reject(new Error('network blip')),
    );

    // This is the regression this fix targets: an already-approved or
    // already-rejected user must never be silently downgraded to
    // not_started just because a request failed transiently.
    expect(status).toBeUndefined();
    expect(status).not.toBe('not_started');
  });

  test('a 5xx-shaped failure also resolves to undefined, not not_started', async () => {
    const status = await deriveKycStatus('urn:test', () =>
      Promise.reject({ status: 500 }),
    );

    expect(status).toBeUndefined();
  });

  test('a slow dependency times out rather than hanging login indefinitely', async () => {
    const neverSettles = new Promise<{ status: 'approved' }>(() => {});
    const start = Date.now();

    const status = await deriveKycStatus('urn:test', () => neverSettles);

    expect(status).toBeUndefined();
    expect(Date.now() - start).toBeLessThan(6_000);
  });
});
