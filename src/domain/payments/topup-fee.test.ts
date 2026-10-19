import { describe, expect, test } from 'bun:test';
import { calculateGrossAnchoredFee } from './topup-fee';

describe('calculateGrossAnchoredFee', () => {
  test('deducts the fixed provider cost before calculating the percentage fee', () => {
    expect(calculateGrossAnchoredFee(15_000, 2_500, 1)).toEqual({
      providerCost: 2_500,
      serviceFee: 125,
      totalFee: 2_625,
      netAmount: 12_375,
    });
  });

  test('never produces a negative net amount below the provider cost', () => {
    expect(calculateGrossAnchoredFee(2_000, 2_500, 1)).toEqual({
      providerCost: 2_000,
      serviceFee: 0,
      totalFee: 2_000,
      netAmount: 0,
    });
  });
});
