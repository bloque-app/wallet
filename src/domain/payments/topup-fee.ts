export type GrossAnchoredFeeSummary = {
  providerCost: number;
  serviceFee: number;
  totalFee: number;
  netAmount: number;
};

/** Mirrors swap's gross-anchored fee allocation: fixed provider cost first, then percentage fee. */
export function calculateGrossAnchoredFee(
  grossAmount: number,
  providerCost: number,
  serviceFeePercentage: number,
): GrossAnchoredFeeSummary {
  const amountAfterProvider = Math.max(0, grossAmount - providerCost);
  const serviceFee = Math.floor(
    (amountAfterProvider * serviceFeePercentage) / 100,
  );
  const appliedProviderCost = Math.min(grossAmount, providerCost);
  const totalFee = appliedProviderCost + serviceFee;

  return {
    providerCost: appliedProviderCost,
    serviceFee,
    totalFee,
    netAmount: grossAmount - totalFee,
  };
}
