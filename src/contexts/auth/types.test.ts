import { describe, expect, test } from 'bun:test';
import { isWalletOriginAlias } from './types';

describe('isWalletOriginAlias', () => {
  test('accepts aliases owned by 30m', () => {
    expect(isWalletOriginAlias({ origin: '30m' })).toBe(true);
  });

  test('rejects aliases owned by legacy origins', () => {
    expect(isWalletOriginAlias({ origin: 'bloque-email' })).toBe(false);
    expect(isWalletOriginAlias({ origin: 'bloque-whatsapp' })).toBe(false);
  });
});
