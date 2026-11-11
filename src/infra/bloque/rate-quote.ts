import { calculateRateQuote, type FeeComponentType } from '@bloque/sdk-swap';
import type { Rate, RateQuote } from '~/domain/payments/types';

function sum(values: Array<string | undefined>): number {
  const total = values.reduce((acc, value) => acc + Number(value ?? 0), 0);
  return Number(total.toFixed(6));
}

/**
 * Quotes `rate` for `amountSrc` (source atoms) with the SDK's exact formula
 * evaluation. Returns null when the rate has no formula or the fees exceed
 * the amount.
 */
export function quoteRate(rate: Rate, amountSrc: string): RateQuote | null {
  if (!rate.fee?.formula.trim()) return null;
  try {
    const quote = calculateRateQuote(
      {
        edge: [rate.fromAsset, rate.toAsset],
        fee: {
          at: 0,
          value: 0,
          formula: rate.fee.formula,
          components: rate.fee.components.map((component) => ({
            ...component,
            at: 0,
            type: component.type as FeeComponentType,
          })),
        },
      },
      amountSrc,
    );
    const scale = 10 ** Number(rate.toAsset.split('/')[1]);
    return {
      netAmount: Number(quote.amountDst) / scale,
      totalFee: Number(quote.fee) / scale,
      feePercentage: sum(
        quote.fees
          .filter((fee) => fee.type === 'percentage')
          .map((fee) => fee.percentage),
      ),
      feeFixed: sum(
        quote.fees
          .filter((fee) => fee.type === 'fixed')
          .map((fee) => fee.fixedAmount),
      ),
    };
  } catch {
    return null;
  }
}
