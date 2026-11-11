import {
  calculateRateQuote,
  type Fee,
  type FeeComponentType,
} from '@bloque/sdk-swap';
import type { Rate, RateQuote } from '~/domain/payments/types';

type SdkRate = { edge: [string, string]; fee: Fee };

function toSdkRate(rate: Rate & { fee: NonNullable<Rate['fee']> }): SdkRate {
  return {
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
  };
}

/**
 * Effective percentage the rate charges with its fixed fees left out, e.g. 2
 * for SPEI's 2% + 5 MXN and 3.96 for two chained 2% fees. Evaluated on a
 * large reference amount so rounding does not show up in the label.
 */
function effectivePercentage(rate: SdkRate, sourcePrecision: number): number {
  const reference = calculateRateQuote(
    {
      ...rate,
      fee: {
        ...rate.fee,
        components: rate.fee.components.map((component) =>
          component.type === 'fixed' ? { ...component, value: '0' } : component,
        ),
      },
    },
    (10n ** BigInt(sourcePrecision + 6)).toString(),
  );
  if (reference.amountBeforeFees === '0') return 0;
  const percentage =
    (Number(reference.fee) / Number(reference.amountBeforeFees)) * 100;
  return Number(percentage.toFixed(2));
}

/**
 * Quotes `rate` for `amountSrc` (source atoms) with the SDK's exact formula
 * evaluation. Returns null when the rate has no formula or the fees exceed
 * the amount. The fee breakdown is zero when it cannot be derived.
 */
export function quoteRate(rate: Rate, amountSrc: string): RateQuote | null {
  if (!rate.fee?.formula.trim()) return null;
  const sdkRate = toSdkRate({ ...rate, fee: rate.fee });
  let quote: ReturnType<typeof calculateRateQuote>;
  try {
    quote = calculateRateQuote(sdkRate, amountSrc);
  } catch {
    return null;
  }
  const scale = 10 ** Number(rate.toAsset.split('/')[1]);
  const fixed = quote.fees.filter((fee) => fee.type === 'fixed');
  let feePercentage = 0;
  let feeFixed = 0;
  try {
    feePercentage = effectivePercentage(
      sdkRate,
      Number(rate.fromAsset.split('/')[1]),
    );
    feeFixed = Number(
      fixed
        .reduce((total, fee) => total + Number(fee.fixedAmount ?? 0), 0)
        .toFixed(6),
    );
  } catch {
    feePercentage = 0;
    feeFixed = 0;
  }
  return {
    netAmount: Number(quote.amountDst) / scale,
    totalFee: Number(quote.fee) / scale,
    feePercentage,
    feeFixed,
  };
}
