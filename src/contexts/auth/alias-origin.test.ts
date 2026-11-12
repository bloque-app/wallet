import { describe, expect, it } from 'bun:test';
import { isAliasOfOrigin } from './alias-origin';

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
