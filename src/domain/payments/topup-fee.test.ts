import { describe, expect, test } from 'bun:test';
import {
  calculatePseTopUpQuote,
  calculateRateFeeQuote,
  calculateRateFormulaAmount,
  calculateRateMarketRatio,
} from './topup-fee';

describe('calculateRateFeeQuote', () => {
  test('calculates a fixed-fee payout from the backend formula', () => {
    expect(
      calculateRateFeeQuote(10_000, {
        formula: 'amount_src - provider_fee - bloque_fee',
        components: [
          { name: 'provider_fee', value: 3_500 },
          { name: 'bloque_fee', value: 2_000 },
        ],
      }),
    ).toEqual({ totalFee: 5_500, netAmount: 4_500 });
  });

  test('supports zero-fee quotes without applying a PSE fallback', () => {
    expect(
      calculateRateFeeQuote(10_000, {
        formula: 'amount_src',
        components: [],
      }),
    ).toEqual({ totalFee: 0, netAmount: 10_000 });
  });

  test('uses the quoted ratio for legacy rates without a fee formula', () => {
    expect(
      calculateRateFeeQuote(
        10_000,
        { formula: '', components: [] },
        { fallbackAmount: 9_999 },
      ),
    ).toEqual({ totalFee: 1, netAmount: 9_999 });
  });

  test('does not scale a fixed-fee legacy rate from the tier ratio', () => {
    expect(
      calculateRateFeeQuote(
        10_000,
        {
          formula: '',
          components: [{ name: 'provider_fee', value: 5_500, type: 'fixed' }],
        },
        { fallbackAmount: 9_999 },
      ),
    ).toBeNull();
  });

  test('derives the exchange ratio with fixed and percentage fees neutralized', () => {
    expect(
      calculateRateMarketRatio(10_000, {
        formula:
          '(amount_src * exchange_rate - provider_fee) * (1 - service_fee)',
        components: [
          { name: 'exchange_rate', value: 0.98, type: 'rate' },
          { name: 'provider_fee', value: 5, type: 'fixed' },
          { name: 'service_fee', value: 0.02, type: 'percentage' },
        ],
      }),
    ).toBe(0.98);
  });

  test('handles formulas that divide by the exchange-rate component', () => {
    expect(
      calculateRateMarketRatio(10_000, {
        formula: '(amount_src - provider_fee) / exchange_rate',
        components: [
          { name: 'provider_fee', value: 5, type: 'fixed' },
          { name: 'exchange_rate', value: 2, type: 'rate' },
        ],
      }),
    ).toBe(0.5);
  });

  test('calculates mixed fixed and percentage fees', () => {
    expect(
      calculateRateFeeQuote(20_000, {
        formula: '(amount_src - fixed_fee) * (1 - percentage_fee)',
        components: [
          { name: 'fixed_fee', value: 2_500 },
          { name: 'percentage_fee', value: '1/100' },
        ],
      }),
    ).toEqual({ totalFee: 2_675, netAmount: 17_325 });
  });

  test.each([
    ['', []],
    ['amount_src - unknown_fee', []],
    ['amount_src / zero', [{ name: 'zero', value: 0 }]],
    ['-amount_src', []],
    ['amount_src + 1', []],
  ])('rejects an invalid payout formula: %s', (formula, components) => {
    expect(calculateRateFeeQuote(10_000, { formula, components })).toBeNull();
  });

  test('uses source and destination asset precision for cross-asset quotes', () => {
    expect(
      calculateRateFormulaAmount(
        10.25,
        {
          formula: 'amount_src * exchange_rate',
          components: [{ name: 'exchange_rate', value: '4000.125' }],
        },
        { sourcePrecision: 6, destinationPrecision: 2 },
      ),
    ).toBe(41_001.28);
  });
});

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
