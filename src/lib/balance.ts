interface AssetBalance {
  asset: string;
  current: string;
}

/**
 * True when `amountMinor` (bigint string scaled by the asset precision) is
 * more than the pocket's current balance for `asset`. A pocket without that
 * asset counts as zero balance; an empty or invalid amount never exceeds.
 */
export function exceedsBalance(
  balances: readonly AssetBalance[] | undefined,
  asset: string,
  amountMinor: string,
): boolean {
  if (!amountMinor) return false;
  try {
    const amount = BigInt(amountMinor);
    if (amount <= 0n) return false;
    const balance = balances?.find((entry) => entry.asset === asset);
    return amount > BigInt(balance?.current ?? '0');
  } catch {
    return false;
  }
}
