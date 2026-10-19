import { describe, expect, test } from 'bun:test';
import { calculatePseTopUpQuote } from './topup-fee';

describe('calculatePseTopUpQuote', () => {
  test('uses the selected rate formula instead of duplicated fee constants', () => {
    expect(
      calculatePseTopUpQuote(15_000, {
        formula: '(amount_src - provider_fee) * (1 - service_fee)',
        components: [
          { name: 'provider_fee', value: 3_000 },
          { name: 'service_fee', value: '0.02' },
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
});
