import { describe, expect, test } from 'bun:test';
import { calculatePseTopUpQuote } from './topup-fee';

describe('calculatePseTopUpQuote', () => {
  test('uses the selected rate formula instead of duplicated fee constants', () => {
    expect(
      calculatePseTopUpQuote(15_000, {
        formula: '(amount_src - provider_fee) * (1 - service_fee)',
        components: [
          { name: 'provider_fee', value: 3_000 },
          { name: 'service_fee', value: '1/50' },
        ],
      }),
    ).toEqual({ totalFee: 3_240, netAmount: 11_760 });
  });

  test('supports the current PSE rate while execution fees remain out-of-band', () => {
    expect(
      calculatePseTopUpQuote(15_000, {
        formula: 'amount_src',
        components: [],
      }),
    ).toEqual({ totalFee: 2_625, netAmount: 12_375 });
  });

  test('never produces a negative net amount below the provider cost', () => {
    expect(calculatePseTopUpQuote(2_000)).toEqual({
      totalFee: 2_000,
      netAmount: 0,
    });
  });

  test('calculates legacy percentage fees at COP cent precision', () => {
    expect(calculatePseTopUpQuote(5_001)).toEqual({
      totalFee: 2_525.02,
      netAmount: 2_475.98,
    });
  });

  test('accepts backend-compatible leading-decimal literals', () => {
    expect(
      calculatePseTopUpQuote(5_001, {
        formula: 'amount_src * .5',
        components: [],
      }),
    ).toEqual({ totalFee: 2_500.5, netAmount: 2_500.5 });
  });

  test.each([
    [5_001, 2_525.01, 2_475.99],
    [5_003, 2_525.03, 2_477.97],
    [12_345, 2_598.45, 9_746.55],
  ])('matches backend atom truncation for a %i COP formula quote', (gross, fee, net) => {
    expect(
      calculatePseTopUpQuote(gross, {
        formula: '(amount_src - provider_fee) * (1 - service_fee)',
        components: [
          { name: 'provider_fee', value: 2_500 },
          { name: 'service_fee', value: '1/100' },
        ],
      }),
    ).toEqual({ totalFee: fee, netAmount: net });
  });
});
