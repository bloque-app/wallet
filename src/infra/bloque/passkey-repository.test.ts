import { beforeEach, describe, expect, mock, test } from 'bun:test';
import {
  BloqueAPIError,
  BloqueAuthenticationError,
  BloqueNetworkError,
  BloquePasskeyRegistrationUnavailableError,
  BloqueRateLimitError,
  BloqueReturnUrlNotAllowedError,
  BloqueValidationError,
} from '@bloque/sdk';

const createLinkMock = mock(
  (_params: {
    returnUrl: string;
  }): Promise<{
    url: string;
    expiresIn: string;
  }> =>
    Promise.resolve({
      url: 'https://id.dev-bloque.app/passkey#token=abc',
      expiresIn: '15m',
    }),
);

const bloqueClient = {
  identity: { passkeys: { createLink: createLinkMock } },
};

mock.module('~/lib/bloque', () => ({
  bloque: bloqueClient,
  initBloque: async () => bloqueClient,
}));

const { bloquePasskeyRepository } = await import('./passkey-repository');

const RETURN_URL = 'https://account.dev-bloque.app/passkey?registered=1';

describe('bloquePasskeyRepository.createLink', () => {
  beforeEach(() => createLinkMock.mockClear());

  test('asks the SDK for a link back to the given return URL', async () => {
    const link = await bloquePasskeyRepository.createLink(RETURN_URL);

    expect(createLinkMock).toHaveBeenCalledWith({ returnUrl: RETURN_URL });
    expect(link).toEqual({
      url: 'https://id.dev-bloque.app/passkey#token=abc',
      expiresIn: '15m',
    });
  });

  test.each([
    [
      'a refused return URL',
      new BloqueReturnUrlNotAllowedError('', {
        status: 400,
        code: 'E_RETURN_URL_NOT_ALLOWED',
      }),
      'blocked',
    ],
    [
      'a malformed return URL',
      new BloqueValidationError('', {
        status: 400,
        code: 'E_INVALID_PAYLOAD',
      }),
      'blocked',
    ],
    [
      'a deployment without the identity app',
      new BloquePasskeyRegistrationUnavailableError('', {
        status: 501,
        code: 'E_PASSKEY_REGISTRATION_NOT_SUPPORTED',
      }),
      'blocked',
    ],
    [
      'a retryable outage',
      new BloquePasskeyRegistrationUnavailableError('', {
        status: 503,
        code: 'E_PASSKEY_REGISTRATION_UNAVAILABLE',
      }),
      'unavailable',
    ],
    [
      'an outage that says not to retry',
      new BloquePasskeyRegistrationUnavailableError('', {
        status: 503,
        code: 'E_PASSKEY_REGISTRATION_UNAVAILABLE',
        response: { extra_details: { retryable: false } },
      }),
      'blocked',
    ],
    ['too many links', new BloqueRateLimitError('', {}), 'rate_limited'],
    [
      'a non-session token',
      new BloqueAuthenticationError('', {
        status: 403,
        code: 'E_USER_SESSION_REQUIRED',
      }),
      'session',
    ],
    ['a network failure', new BloqueNetworkError('offline'), 'unavailable'],
    [
      'an unexpected 5xx',
      new BloqueAPIError('', { status: 502 }),
      'unavailable',
    ],
  ] as const)('%s maps to %s', async (_, error, reason) => {
    createLinkMock.mockImplementationOnce(() => Promise.reject(error));

    await expect(
      bloquePasskeyRepository.createLink(RETURN_URL),
    ).rejects.toMatchObject({ name: 'PasskeyRegistrationError', reason });
  });
});
