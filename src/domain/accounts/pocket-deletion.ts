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

export function pocketDeletionBalances(balances: AssetBalance[]) {
  return {
    funded: balances.filter((balance) => rawAmountIsNonZero(balance.current)),
    pending: balances.filter((balance) => rawAmountIsNonZero(balance.pending)),
  };
}

export function minorUnitsToMajorInput(
  rawAmount: string,
  rawAsset: string,
): string {
  const [, precisionValue] = rawAsset.split('/');
  const precision = Number.parseInt(precisionValue ?? '', 10);
  if (!/^\d+$/.test(rawAmount) || Number.isNaN(precision) || precision <= 0) {
    return rawAmount;
  }

  const padded = rawAmount.padStart(precision + 1, '0');
  const integer = padded.slice(0, -precision).replace(/^0+(?=\d)/, '');
  const fraction = padded.slice(-precision).replace(/0+$/, '');
  return fraction ? `${integer}.${fraction}` : integer;
}
