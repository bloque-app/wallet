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
  direction: 'in' | 'out';
  railName?: string;
  reference: string;
  createdAt: string;
  counterparty?: string;
};

const ASSET_KEY_MAP: Record<string, Asset> = {
  COP: 'COP',
  COPM: 'COP',
  DUSD: 'USD',
  USD: 'USD',
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

function toType(
  raw: Pick<RawMovementFields, 'type' | 'railName' | 'direction'>,
): MovementType {
  const rawType = (raw.type ?? '').trim().toLowerCase();
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
export function toDomainMovement(raw: RawMovementFields): Movement | null {
  const asset = toAsset(raw.asset);
  if (!asset) return null;

  return {
    id: [raw.reference, raw.createdAt, raw.amount].join('-'),
    type: toType(raw),
    asset,
    amount: toAmount(raw.amount, raw.asset),
    fee: 0,
    status: toStatus(raw.status),
    createdAt: raw.createdAt,
    reference: raw.reference,
    counterparty: raw.counterparty,
    direction: raw.direction === 'in' ? 'incoming' : 'outgoing',
  };
}
