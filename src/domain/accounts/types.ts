/**
 * Domain layer for the Accounts/Products bounded context.
 *
 * No SDK or React imports here, ever — this is what the app's own model of
 * "a user's money" looks like, independent of how `@bloque/sdk-accounts`
 * happens to shape its wire responses today. Adapters (src/infra/) are the
 * only place SDK shapes get translated into these types.
 */

export type AssetBalance = {
  /** e.g. 'COPM/2', 'DUSD/6', 'KSM/12' */
  asset: string;
  current: string;
  pending: string;
};

type ProductBase = {
  urn: string;
  ledgerId?: string;
  status: string;
  label: string;
  createdAt?: string;
  balances: AssetBalance[];
  metadata?: Record<string, unknown>;
};

export type CardProduct = ProductBase & {
  kind: 'card';
  lastFour: string;
  cardType?: string;
  /** Asset the card settles purchase authorizations against, e.g. 'DUSD/6'. */
  preferredAsset?: string;
};

export type BrebKeyProduct = ProductBase & {
  kind: 'breb';
  keyType: string;
  keyValue: string;
  displayName?: string | null;
};

export type PolygonProduct = ProductBase & {
  kind: 'polygon';
  address: string;
  network?: string;
};

/** A named "pocket" — the product that anchors an Account's identity when present. */
export type PocketProduct = ProductBase & {
  kind: 'pocket';
  firstName?: string;
  lastName?: string;
};

export type OtherProduct = ProductBase & {
  kind: 'other';
  /** Raw medium string if the SDK happened to report one (e.g. 'bancolombia', 'us-account'). */
  medium?: string;
};

/**
 * A single financial product a user holds — a card, a BRE-B key, a Polygon
 * address, or a named pocket. Several products can share a `ledgerId`,
 * meaning they draw from the same underlying balance.
 */
export type Product =
  | CardProduct
  | BrebKeyProduct
  | PolygonProduct
  | PocketProduct
  | OtherProduct;

/**
 * A ledger — the unit the wallet's UI is organized around. Groups every
 * product sharing a `ledgerId`. `primaryUrn` points at whichever member
 * anchors the account's label (the pocket, if one exists; otherwise the
 * earliest-created product) — products stay a flat array, the pocket is
 * just a tagged member of it, not a separate field.
 */
export type Account = {
  ledgerId: string;
  label: string;
  primaryUrn: string;
  products: Product[];
  balances: AssetBalance[];
};

export type User = {
  urn: string;
  name: string;
  email?: string;
};
