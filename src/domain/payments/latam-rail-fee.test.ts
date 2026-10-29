import { describe, expect, test } from 'bun:test';
import { calculateLatamRailFee } from './latam-rail-fee';

describe('calculateLatamRailFee', () => {
  test('derives the PIX fee from the selected quote', () => {
    expect(calculateLatamRailFee(10, 9.6)).toBe(0.4);
  });

  test('derives the SPEI fee from the selected quote', () => {
    expect(calculateLatamRailFee(20, 19.11)).toBe(0.89);
  });

  test('does not display negative or invalid fees', () => {
    expect(calculateLatamRailFee(10, 11)).toBe(0);
    expect(calculateLatamRailFee(Number.NaN, 10)).toBe(0);
  });
});
