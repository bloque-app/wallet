import { describe, expect, it } from 'bun:test';
import {
  isAliasOfOrigin,
  isIdentityAlreadyExistsError,
  resolveAliasStatus,
} from './alias-origin';

describe('isAliasOfOrigin', () => {
  it('accepts an alias of the wallet origin', () => {
    expect(
      isAliasOfOrigin({ alias: 'a@b.co', origin: '30m', urn: 'x' }, '30m'),
    ).toBe(true);
  });

  it('rejects an alias held by a legacy wallet origin', () => {
    expect(
      isAliasOfOrigin(
        { alias: 'a@b.co', origin: 'bloque-email', urn: 'x' },
        '30m',
      ),
    ).toBe(false);
  });

  it('rejects a result without an origin', () => {
    expect(isAliasOfOrigin({ alias: 'a@b.co' }, '30m')).toBe(false);
    expect(isAliasOfOrigin(null, '30m')).toBe(false);
    expect(isAliasOfOrigin(undefined, '30m')).toBe(false);
  });
});

describe('resolveAliasStatus', () => {
  const fail = (error: unknown) => () => Promise.reject(error);

  it('is registered when the alias is on the wallet origin', async () => {
    expect(
      await resolveAliasStatus(async () => ({ origin: '30m' }), '30m'),
    ).toEqual({ status: 'registered' });
  });

  it('is not registered when a legacy origin holds the alias', async () => {
    expect(
      await resolveAliasStatus(
        async () => ({ origin: 'bloque-whatsapp' }),
        '30m',
      ),
    ).toEqual({ status: 'not_registered' });
  });

  it('is not registered when the alias does not exist', async () => {
    expect(
      await resolveAliasStatus(
        fail({ status: 404, code: 'E_ALIAS_NOT_FOUND' }),
        '30m',
      ),
    ).toEqual({ status: 'not_registered' });
  });

  it('is not registered when the alias is not verified yet', async () => {
    expect(
      await resolveAliasStatus(
        fail({ status: 400, message: 'E_ALIAS_NOT_VERIFIED' }),
        '30m',
      ),
    ).toEqual({ status: 'not_registered' });
  });

  it('rethrows any other failure', async () => {
    const error = { status: 503, message: 'unavailable' };
    await expect(resolveAliasStatus(fail(error), '30m')).rejects.toBe(error);
  });
});

describe('isIdentityAlreadyExistsError', () => {
  it('matches the error code', () => {
    expect(
      isIdentityAlreadyExistsError({ code: 'E_IDENTITY_ALREADY_EXISTS' }),
    ).toBe(true);
    expect(
      isIdentityAlreadyExistsError({ message: 'E_IDENTITY_ALREADY_EXISTS' }),
    ).toBe(true);
  });

  it('ignores other errors, including an unrelated 409', () => {
    expect(
      isIdentityAlreadyExistsError({ status: 409, code: 'E_IDEMPOTENCY' }),
    ).toBe(false);
    expect(isIdentityAlreadyExistsError({ status: 400 })).toBe(false);
    expect(isIdentityAlreadyExistsError(null)).toBe(false);
  });
});
