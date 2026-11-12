import { describe, expect, test } from 'bun:test';
import type { Rate } from '~/domain/payments/types';
import { quoteRate } from './rate-quote';

const spei: Rate = {
  sig: 'sig',
  ratio: 0.97995,
  rate: [100000, 97995],
  fromAsset: 'MXN/2',
  toAsset: 'MXNB/2',
  until: '2026-01-01T00:05:00.000Z',
  fee: {
    formula: 'amount_src * (1 - provider_pct - bloque_pct) - provider_fixed',
    components: [
      {
        name: 'provider_pct',
        type: 'percentage',
        value: '1/400',
        percentage: '0.25',
      },
      { name: 'provider_fixed', type: 'fixed', value: '5', amount: '5' },
      {
        name: 'bloque_pct',
        type: 'percentage',
        value: '7/400',
        percentage: '1.75',
      },
    ],
  },
};

describe('quoteRate', () => {
  test('SPEI 1,000 MXN: 2% + 5 MXN', () => {
    expect(quoteRate(spei, '100000')).toEqual({
      netAmount: 975,
      totalFee: 25,
      feePercentage: 2,
      feeFixed: 5,
    });
  });

  test('uses the amount typed, not the reference ratio', () => {
    expect(quoteRate(spei, '10000')?.netAmount).toBe(93);
  });

  test('chained percentages show the effective rate, not their sum', () => {
    const pix: Rate = {
      ...spei,
      fromAsset: 'BRL/2',
      toAsset: 'BRLB/2',
      fee: {
        formula: 'amount_src * (1 - provider_pct) * (1 - bloque_pct)',
        components: [
          {
            name: 'provider_pct',
            type: 'percentage',
            value: '1/50',
            percentage: '2',
          },
          {
            name: 'bloque_pct',
            type: 'percentage',
            value: '1/50',
            percentage: '2',
          },
        ],
      },
    };
    expect(quoteRate(pix, '100000')).toEqual({
      netAmount: 960.4,
      totalFee: 39.6,
      feePercentage: 3.96,
      feeFixed: 0,
    });
  });

  test('returns null when the fees exceed the amount', () => {
    expect(quoteRate(spei, '100')).toBeNull();
  });

  test('returns null without a formula', () => {
    expect(
      quoteRate({ ...spei, fee: { formula: '', components: [] } }, '100000'),
    ).toBeNull();
  });
});
