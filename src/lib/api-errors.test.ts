import { describe, expect, test } from 'bun:test';
import { BloqueAPIError, BloqueNotFoundError } from '@bloque/sdk';
import { isAliasNotFoundError, userFacingErrorMessage } from './api-errors';

describe('isAliasNotFoundError', () => {
  test('matches the SDK not-found error the alias lookup throws', () => {
    expect(
      isAliasNotFoundError(
        new BloqueNotFoundError('E_ALIAS_NOT_FOUND', { status: 404 }),
      ),
    ).toBe(true);
  });

  test('matches by code or message even without a status', () => {
    expect(
      isAliasNotFoundError(
        new BloqueAPIError('x', { code: 'E_ALIAS_NOT_FOUND' }),
      ),
    ).toBe(true);
    expect(isAliasNotFoundError(new Error('E_ALIAS_NOT_FOUND'))).toBe(true);
  });

  test('ignores unrelated errors', () => {
    expect(
      isAliasNotFoundError(new BloqueAPIError('boom', { status: 500 })),
    ).toBe(false);
    expect(isAliasNotFoundError(null)).toBe(false);
    expect(isAliasNotFoundError('E_ALIAS_NOT_FOUND')).toBe(false);
  });
});

describe('userFacingErrorMessage', () => {
  test('hides raw backend codes behind the fallback', () => {
    expect(userFacingErrorMessage(new Error('E_ALIAS_NOT_FOUND'), 'nope')).toBe(
      'nope',
    );
  });

  test('keeps a human message', () => {
    expect(userFacingErrorMessage(new Error('Saldo insuficiente'), 'x')).toBe(
      'Saldo insuficiente',
    );
  });

  test('falls back for non-errors and empty messages', () => {
    expect(userFacingErrorMessage(undefined, 'fb')).toBe('fb');
    expect(userFacingErrorMessage(new Error(''), 'fb')).toBe('fb');
  });
});
