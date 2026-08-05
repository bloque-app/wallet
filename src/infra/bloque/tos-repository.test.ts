import { beforeEach, describe, expect, mock, test } from 'bun:test';

const getStatusMock = mock(
  (): Promise<{ missingRequirements: string[] }> =>
    Promise.resolve({ missingRequirements: [] }),
);
const startMock = mock(
  (): Promise<{ url: string }> =>
    Promise.resolve({ url: 'https://api.example.com/api/tos-gate#token=abc' }),
);

const bloqueClient = {
  compliance: {
    tiers: { getStatus: getStatusMock },
    tosGate: { start: startMock },
  },
};

// Both shapes: the repository awaits `initBloque()` rather than touching the
// `bloque` proxy, because the proxy throws until the SDK handshake has run and
// these calls happen before it does.
mock.module('~/lib/bloque', () => ({
  bloque: bloqueClient,
  initBloque: async () => bloqueClient,
}));

const { bloqueTosRepository } = await import('./tos-repository');

const URN = 'did:bloque:bloque:alice';

describe('bloqueTosRepository.getStatus', () => {
  beforeEach(() => {
    getStatusMock.mockClear();
    startMock.mockClear();
  });

  test('reads acceptance as the ABSENCE of a tos requirement', async () => {
    // There is no positive "accepted" flag on the wire — this is the whole
    // subtlety of the endpoint, so it gets pinned.
    getStatusMock.mockImplementationOnce(() =>
      Promise.resolve({ missingRequirements: [] }),
    );

    expect(await bloqueTosRepository.getStatus(URN)).toBe('accepted');
  });

  test('still counts as accepted when other requirements are outstanding', async () => {
    // KYC and TOS are independent; owing KYC says nothing about the terms.
    getStatusMock.mockImplementationOnce(() =>
      Promise.resolve({
        missingRequirements: ['kyc_basic', 'proof_of_address'],
      }),
    );

    expect(await bloqueTosRepository.getStatus(URN)).toBe('accepted');
  });

  test('requires acceptance when a tos-prefixed key is outstanding', async () => {
    getStatusMock.mockImplementationOnce(() =>
      Promise.resolve({ missingRequirements: ['kyc_basic', 'tos'] }),
    );

    expect(await bloqueTosRepository.getStatus(URN)).toBe('required');
  });

  test('reports unknown — never accepted — when the lookup fails', async () => {
    // Claiming someone accepted terms they may not have is the dangerous
    // direction to be wrong in, so a failure must not read as 'accepted'.
    getStatusMock.mockImplementationOnce(() =>
      Promise.reject(new Error('compliance unreachable')),
    );

    expect(await bloqueTosRepository.getStatus(URN)).toBe('unknown');
  });
});

describe('bloqueTosRepository.start', () => {
  beforeEach(() => {
    startMock.mockClear();
  });

  test('passes the return url through and hands back the gate url', async () => {
    const gate = await bloqueTosRepository.start('https://wallet.test/tos');

    expect(startMock).toHaveBeenCalledWith({
      returnUrl: 'https://wallet.test/tos',
    });
    expect(gate.url).toBe('https://api.example.com/api/tos-gate#token=abc');
  });

  test('propagates a rejection rather than swallowing it', async () => {
    // The likeliest cause is `return_url` not being allowlisted for the
    // origin, which is server-side config — a caller silently getting no gate
    // would be far harder to diagnose than an error.
    startMock.mockImplementationOnce(() =>
      Promise.reject(new Error('E_RETURN_URL_NOT_ALLOWED')),
    );

    await expect(
      bloqueTosRepository.start('https://evil.test/tos'),
    ).rejects.toThrow('E_RETURN_URL_NOT_ALLOWED');
  });
});
