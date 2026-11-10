/**
 * Shared movement status/type inference for the Accounts/Products bounded
 * context. This is THE ONE place free-text `type`/`railName`/`status`
 * fields (as reported by the various movement/transaction endpoints) get
 * interpreted into the app's domain `Movement` shape (`~/lib/formatters`).
 *
 * Previously this same inference was reimplemented three times —
 * `lib/transaction-mapper.ts`'s `mapGlobalTransactionToMovement`, an inline
 * `toMovement()` in `routes/_authed/accounts/$urn.tsx`, and a
 * `getMovementTitle`/`getStatusLabel`/`getStatusClassName` trio in
 * `routes/_authed/card/details/$urn.tsx` — each with slightly different
 * (and incompletely correct) heuristics. Collapsing them here means every
 * movements list in the app classifies the same raw fields the same way.
 */

import type {
  Asset,
  Movement,
  MovementFee,
  MovementStatus,
  MovementType,
} from '~/lib/formatters';

/**
 * The common shape both the SDK's per-account `Movement` (exposed through
 * this domain's `MovementEntry`) and the global `GlobalTransaction` type can
 * be trivially adapted into via field renames only — no inference happens
 * at the adaptation step, only here in `toDomainMovement`.
 */
export type RawMovementFields = {
  asset: string;
  amount: string;
  status: string;
  type?: string;
  direction: 'in' | 'out' | 'failed';
  railName?: string;
  reference: string;
  createdAt: string;
  counterparty?: string;
  /** The SDK's free-form per-transaction payload. Only ever consulted as a
   * `type` fallback (see `toType`) — the global feed's `type` field is
   * optional and this is where a real type can still be recovered from
   * when it's missing; the per-account feed's `type` is always present, so
   * this stays unused there. */
  details?: Record<string, unknown>;
  /** What the customer paid on the order, in the asset the order delivers. */
  fee?: { amount: string; asset: string };
  /** The order that produced the movement, also on its refund. */
  orderSig?: string;
};

const ASSET_KEY_MAP: Record<string, Asset> = {
  COP: 'COP',
  COPM: 'COP',
  DUSD: 'USD',
  USD: 'USD',
  MXN: 'MXN',
  MXNB: 'MXN',
  BRL: 'BRL',
  BRLB: 'BRL',
  KSM: 'KSM',
};

function toAsset(rawAsset: string): Asset | null {
  const [assetKey] = rawAsset.split('/');
  return ASSET_KEY_MAP[assetKey] ?? null;
}

function toAmount(rawAmount: string, rawAsset: string): number {
  const [, precisionStr] = rawAsset.split('/');
  const precision = Number.parseInt(precisionStr, 10);
  const parsed = Number.parseInt(rawAmount, 10);

  if (Number.isNaN(parsed)) return 0;
  if (Number.isNaN(precision)) return parsed;

  return parsed / 10 ** precision;
}

function toStatus(rawStatus: string): MovementStatus {
  const normalized = rawStatus.trim().toLowerCase();

  if (
    normalized.includes('pending') ||
    normalized.includes('queued') ||
    normalized.includes('process')
  ) {
    return 'pending';
  }

  if (
    normalized.includes('confirm') ||
    normalized.includes('settled') ||
    normalized.includes('success') ||
    normalized.includes('complete')
  ) {
    return 'completed';
  }

  // Covers 'failed', 'cancelled', 'ignored', and anything unrecognized —
  // safer to under-report success than over-report it. (This also fixes a
  // real bug in the old card-details-only status mapper, which treated any
  // status other than the literal strings 'failed'/'pending' as success —
  // silently mislabeling e.g. a 'cancelled' or 'ignored' SDK transaction
  // status as a completed movement.)
  return 'failed';
}

/** Reads `details.type` defensively — it's an SDK free-form
 * `Record<string, unknown>` bag, not a typed field. */
function detailsTypeString(
  details: Record<string, unknown> | undefined,
): string {
  const value = details?.type;
  return typeof value === 'string' ? value : '';
}

function toType(
  raw: Pick<RawMovementFields, 'type' | 'railName' | 'direction' | 'details'>,
): MovementType {
  // Mirrors the deleted transaction-mapper.ts's `transaction.type ||
  // details?.type` fallback: the global feed's `type` is optional and
  // `details` is where a real type can still be recovered from when it's
  // absent — without this, every transaction missing `type` silently
  // degrades straight to the direction-based fallback below instead of
  // whatever richer classification `details` actually carries.
  const rawType = (raw.type || detailsTypeString(raw.details))
    .trim()
    .toLowerCase();
  const rawRail = (raw.railName ?? '').trim().toLowerCase();

  if (
    rawType.includes('pay-in') ||
    rawType.includes('deposit') ||
    rawType.includes('topup') ||
    rawType.includes('cash-in')
  ) {
    return 'topup';
  }

  if (
    rawType.includes('pay-out') ||
    rawType.includes('payout') ||
    rawType.includes('withdraw') ||
    rawType.includes('cash-out')
  ) {
    return 'withdraw';
  }

  if (
    rawType.includes('convert') ||
    rawType.includes('swap') ||
    rawType.includes('exchange')
  ) {
    return 'convert';
  }

  if (
    rawType.includes('card') ||
    rawType.includes('payment') ||
    rawType.includes('purchase') ||
    rawRail.includes('card')
  ) {
    return 'card';
  }

  if (rawType.includes('transfer') || rawType.includes('send')) {
    return 'send';
  }

  // Fallback for free-text `type`/`railName` values that don't match any
  // recognized substring (e.g. an unfamiliar bank-rail label). Every prior
  // implementation of this heuristic defaulted an unrecognized *outbound*
  // movement straight to 'send' — which silently mislabels a real cash-out
  // (an external bank withdrawal) as a P2P transfer. Recognizable internal
  // transfers/BRE-B sends are already tagged 'transfer'/'send' by the
  // ledger and are caught above, so a genuinely unrecognized movement is
  // far more likely an unfamiliar bank rail than a P2P send. Default by
  // direction instead: incoming -> topup, outgoing -> withdraw. This is a
  // deliberate behavior change from the old fallback, not a preservation
  // of it.
  return raw.direction === 'in' ? 'topup' : 'withdraw';
}

/**
 * Converts a raw movement/transaction record into the app's domain
 * `Movement` shape, or `null` when `asset` isn't one of the assets this
 * app renders (the COP/USD/KSM family) — matching every prior
 * implementation's behavior of dropping unrenderable-asset movements
 * rather than guessing a display unit for them.
 *
 * Accepts anything structurally compatible with `RawMovementFields`
 * (notably the domain `MovementEntry` type, which is `RawMovementFields`
 * plus an `id` field) — callers don't need to build a fresh object.
 */
function toFee(rawFee: RawMovementFields['fee']): MovementFee | undefined {
  if (!rawFee) return undefined;
  const asset = toAsset(rawFee.asset);
  if (!asset) return undefined;
  return { amount: toAmount(rawFee.amount, rawFee.asset), asset };
}

export function toDomainMovement(raw: RawMovementFields): Movement | null {
  const asset = toAsset(raw.asset);
  if (!asset) return null;

  const fee = toFee(raw.fee);
  return {
    id: [raw.reference, raw.createdAt, raw.amount].join('-'),
    type: toType(raw),
    asset,
    amount: toAmount(raw.amount, raw.asset),
    ...(fee && { fee }),
    ...(raw.orderSig && { orderSig: raw.orderSig }),
    // A `failed` direction is a held movement whose operation never settled.
    status: raw.direction === 'failed' ? 'failed' : toStatus(raw.status),
    createdAt: raw.createdAt,
    reference: raw.reference,
    counterparty: raw.counterparty,
    direction: raw.direction === 'in' ? 'incoming' : 'outgoing',
  };
}

/**
 * Keeps each order's fee on one movement of the list, the first one.
 *
 * Every movement of the operation that charged an order carries the same
 * `fee`, so showing it on each would count it several times. It is dropped
 * entirely when the order did not go through: on failed movements (failed
 * direction, or status cancelled/failed/ignored) and when the order has a
 * refund — a movement with the same `orderSig` and no `fee`.
 *
 * Apply it to the whole list being shown (after `dedupeGlobalMovements` on
 * the global feed): an order's movements can land on different pages.
 */
export function settleOrderFees(movements: Movement[]): Movement[] {
  const refunded = new Set<string>();
  for (const movement of movements) {
    if (movement.orderSig && !movement.fee) refunded.add(movement.orderSig);
  }

  const shown = new Set<string>();
  return movements.map((movement) => {
    if (!movement.fee) return movement;

    const order = movement.orderSig;
    const keep =
      movement.status !== 'failed' &&
      !(order && refunded.has(order)) &&
      !(order && shown.has(order));
    if (keep) {
      if (order) shown.add(order);
      return movement;
    }

    const { fee: _dropped, ...rest } = movement;
    return rest;
  });
}

/**
 * The global/cross-account transactions feed returns one row per linked
 * medium on a shared ledger for what is really a single transfer event —
 * confirmed against real production data: a ledger with 5 linked accounts
 * (a pocket, a card, two BRE-B keys, a Polygon address) shows the same
 * topup 5 times, identical amount and timestamp. This is a backend
 * data-shape reality, not something this mapper or any of its three
 * predecessors ever deduplicated. `reference` uniquely identifies the
 * actual transfer event regardless of which linked account leg the API
 * expanded it for, so dedupe on it, keeping the first occurrence
 * (order-preserving — the feed is already newest-first).
 *
 * Only apply this to the global feed. The per-account feed is already
 * scoped to one account, so this class of duplication can't occur there
 * — deduping it too would be harmless but pointless.
 */
export function dedupeGlobalMovements(movements: Movement[]): Movement[] {
  const seen = new Set<string>();
  const result: Movement[] = [];

  for (const movement of movements) {
    if (seen.has(movement.reference)) continue;
    seen.add(movement.reference);
    result.push(movement);
  }

  return result;
}

/**
 * What the other side receives from an outgoing movement: its amount minus
 * the order fee, as in the summary shown before paying. Only when the fee is
 * in the movement's own asset; across assets the amount and the fee cannot
 * be subtracted. `undefined` when there is no fee to subtract.
 */
export function receivedAmount(movement: Movement): number | undefined {
  const { fee } = movement;
  if (!fee || movement.direction !== 'outgoing') return undefined;
  if (fee.asset !== movement.asset) return undefined;
  return Math.max(movement.amount - fee.amount, 0);
}
