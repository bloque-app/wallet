import { describe, expect, test } from 'bun:test';
import { exceedsBalance } from './balance';

const balances = [{ asset: 'COPM/2', current: '1000000' }];

describe('exceedsBalance', () => {
  test('allows amounts up to the current balance', () => {
    expect(exceedsBalance(balances, 'COPM/2', '1000000')).toBe(false);
    expect(exceedsBalance(balances, 'COPM/2', '999999')).toBe(false);
  });

  test('flags amounts above the current balance', () => {
    expect(exceedsBalance(balances, 'COPM/2', '1000001')).toBe(true);
  });

  test('treats a missing asset as zero balance', () => {
    expect(exceedsBalance(balances, 'DUSD/6', '1')).toBe(true);
    expect(exceedsBalance(undefined, 'COPM/2', '1')).toBe(true);
  });

  test('never flags an empty or invalid amount', () => {
    expect(exceedsBalance(balances, 'COPM/2', '')).toBe(false);
    expect(exceedsBalance(balances, 'COPM/2', '0')).toBe(false);
    expect(exceedsBalance(balances, 'COPM/2', 'abc')).toBe(false);
  });
});
