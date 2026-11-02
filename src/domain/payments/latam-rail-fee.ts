export function calculateLatamRailFee(
  sourceAmount: number,
  destinationAmount: number,
): number {
  if (!Number.isFinite(sourceAmount) || !Number.isFinite(destinationAmount)) {
    return 0;
  }

  return Math.max(
    0,
    Math.round((sourceAmount - destinationAmount) * 100) / 100,
  );
}
