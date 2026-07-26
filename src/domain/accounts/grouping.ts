import type { Account, Product } from './types';

function ledgerKey(product: Product): string {
  return product.ledgerId ? `ledger:${product.ledgerId}` : `urn:${product.urn}`;
}

/**
 * Collapses products that share a `ledgerId` down to the first occurrence.
 * Products without a `ledgerId` never dedupe against each other or anything
 * else (each keys off its own urn instead).
 */
export function dedupeByLedger(products: Product[]): Product[] {
  const seen = new Set<string>();
  const result: Product[] = [];

  for (const product of products) {
    const key = ledgerKey(product);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(product);
  }

  return result;
}

function createdAtMillis(product: Product): number {
  if (!product.createdAt) return Number.POSITIVE_INFINITY;
  const parsed = Date.parse(product.createdAt);
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
}

/** Pockets anchor an account's identity; otherwise the earliest-created product does. */
function comparePrimary(a: Product, b: Product): number {
  const aIsPocket = a.kind === 'pocket';
  const bIsPocket = b.kind === 'pocket';
  if (aIsPocket !== bIsPocket) return aIsPocket ? -1 : 1;
  return createdAtMillis(a) - createdAtMillis(b);
}

/**
 * Assembles a flat product list into Accounts, one per distinct ledger.
 * Balance/movement history is ledger-level (confirmed live: grouped products
 * return identical balance arrays regardless of which member's urn is
 * queried), so an Account's `label`/`balances` are simply its primary
 * product's — each `Product`'s own `label` is already computed once by the
 * adapter that mapped it from the SDK.
 */
export function groupIntoAccounts(products: Product[]): Account[] {
  const buckets = new Map<string, Product[]>();

  for (const product of products) {
    const key = ledgerKey(product);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.push(product);
    } else {
      buckets.set(key, [product]);
    }
  }

  return Array.from(buckets.values()).map((members) => {
    const [primary] = [...members].sort(comparePrimary);

    return {
      ledgerId: primary.ledgerId ?? primary.urn,
      label: primary.label,
      primaryUrn: primary.urn,
      products: members,
      balances: primary.balances,
    };
  });
}
