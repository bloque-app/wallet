import type { AssetBalance, Product } from './types';

/** Products that still share the pocket's ledger and must go first. */
export function pocketDeletionBlockers(
  products: Product[],
  pocketUrn: string,
): Product[] {
  return products.filter(
    (product) => product.urn !== pocketUrn && product.status !== 'deleted',
  );
}

export function isDefaultPocket(product: Product): boolean {
  return product.metadata?.default === true;
}

function rawAmountIsNonZero(value: string): boolean {
  try {
    return BigInt(value) !== 0n;
  } catch {
    return false;
  }
}

/**
 * Splits every balance the backend checks before deleting: funds the wallet
 * can move out (`funded`), funds it can't move yet (`unmovable`), and
 * movements still settling (`pending`).
 */
export function pocketDeletionBalances(
  balances: AssetBalance[],
  canMove: (asset: string) => boolean,
) {
  const current = balances.filter((balance) =>
    rawAmountIsNonZero(balance.current),
  );
  return {
    funded: current.filter((balance) => canMove(balance.asset)),
    unmovable: current.filter((balance) => !canMove(balance.asset)),
    pending: balances.filter((balance) => rawAmountIsNonZero(balance.pending)),
  };
}
