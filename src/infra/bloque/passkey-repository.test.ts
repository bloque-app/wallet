import { beforeEach, describe, expect, mock, test } from 'bun:test';

const apiFetchMock = mock(
  (_path: string, _init?: RequestInit): Promise<Response> =>
    Promise.resolve(Response.json({})),
);

mock.module('~/lib/api-fetch', () => ({ apiFetch: apiFetchMock }));

const { bloquePasskeyRepository } = await import('./passkey-repository');

const CHALLENGE = {
  challenge: 'AQID',
  expires_at: 1_767_225_600_000,
  rp_id: 'dev-bloque.app',
  user: {
    id: 'dXNlci0x',
    name: 'did:bloque:bloque-id:user-1',
    display_name: 'did:bloque:bloque-id:user-1',
  },
  pub_key_cred_params: [{ type: 'public-key', alg: -7 }],
  authenticator_selection: {
    resident_key: 'required',
    user_verification: 'required',
  },
  timeout: 120_000,
  attestation: 'none',
};

const fail = (status: number, body: unknown) =>
  Promise.resolve(Response.json(body, { status }));

describe('bloquePasskeyRepository.challenge', () => {
  beforeEach(() => apiFetchMock.mockClear());

  test('asks for a challenge with the session only, never a token or URN', async () => {
    apiFetchMock.mockImplementationOnce(() =>
      Promise.resolve(Response.json(CHALLENGE)),
    );

    const options = await bloquePasskeyRepository.challenge();

    const [path, init] = apiFetchMock.mock.calls[0];
    expect(path).toBe('/api/origins/passkeys/challenge');
    expect(init?.method).toBe('POST');
    expect(new Headers(init?.headers).has('Authorization')).toBe(false);
    expect(options.rpId).toBe('dev-bloque.app');
    expect(options.user.displayName).toBe('did:bloque:bloque-id:user-1');
    expect(options.authenticatorSelection.userVerification).toBe('required');
  });

  test('a malformed challenge is unavailable', async () => {
    apiFetchMock.mockImplementationOnce(() =>
      Promise.resolve(Response.json({ challenge: 'AQID' })),
    );

    await expect(bloquePasskeyRepository.challenge()).rejects.toMatchObject({
      reason: 'unavailable',
    });
  });

  test('a non-session token reads as a session problem', async () => {
    apiFetchMock.mockImplementationOnce(() =>
      fail(403, { error: true, code: 'E_USER_SESSION_REQUIRED' }),
    );

    await expect(bloquePasskeyRepository.challenge()).rejects.toMatchObject({
      reason: 'session',
      code: 'E_USER_SESSION_REQUIRED',
    });
  });

  test('429 is rate limited, whatever the body says', async () => {
    apiFetchMock.mockImplementationOnce(() =>
      fail(429, { error: true, extra: { code: 'E_RATE_LIMITED' } }),
    );

    await expect(bloquePasskeyRepository.challenge()).rejects.toMatchObject({
      reason: 'rate_limited',
    });
  });

  test('a network failure is unavailable', async () => {
    apiFetchMock.mockImplementationOnce(() =>
      Promise.reject(new TypeError('Failed to fetch')),
    );

    await expect(bloquePasskeyRepository.challenge()).rejects.toMatchObject({
      reason: 'unavailable',
    });
  });
});

describe('bloquePasskeyRepository.register', () => {
  beforeEach(() => apiFetchMock.mockClear());

  test('posts the raw registration in the wire shape', async () => {
    apiFetchMock.mockImplementationOnce(() =>
      Promise.resolve(Response.json({ registered: true })),
    );

    await bloquePasskeyRepository.register({
      clientDataJson: 'Y2Q',
      attestationObject: 'YW8',
    });

    const [path, init] = apiFetchMock.mock.calls[0];
    expect(path).toBe('/api/origins/passkeys');
    expect(JSON.parse(String(init?.body))).toEqual({
      client_data_json: 'Y2Q',
      attestation_object: 'YW8',
    });
  });

  test.each([
    [422, 'E_PASSKEY_REGISTRATION_REJECTED', 'rejected'],
    [409, 'E_PASSKEY_NOT_USABLE_FOR_APPROVALS', 'not_usable'],
    [409, 'E_IDENTITY_ACCOUNT_NOT_READY', 'account_not_ready'],
    [503, 'E_PASSKEY_ALIAS_NOT_RECORDED', 'unavailable'],
    [503, 'E_PASSKEY_REGISTRATION_UNAVAILABLE', 'unavailable'],
    [401, 'E_INVALID_TOKEN', 'session'],
  ])('%i %s maps to %s and keeps the code', async (status, code, reason) => {
    apiFetchMock.mockImplementationOnce(() =>
      fail(status, { error: true, code }),
    );

    await expect(
      bloquePasskeyRepository.register({
        clientDataJson: 'Y2Q',
        attestationObject: 'YW8',
      }),
    ).rejects.toMatchObject({ reason, code });
  });
});
