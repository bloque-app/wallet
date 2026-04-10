import type { GlobalTransaction } from '@bloque/sdk';
import type {
  Asset,
  Movement,
  MovementStatus,
  MovementType,
} from './mock-data';

const ASSET_KEY_MAP: Record<string, Asset> = {
  COP: 'COP',
  COPM: 'COP',
  DUSD: 'USD',
  USD: 'USD',
  KSM: 'KSM',
};

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

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

function toStatus(status: string): MovementStatus {
  const normalized = status.toLowerCase();

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

  return 'failed';
}

function toType(transaction: GlobalTransaction): MovementType {
  const details = (
    transaction as GlobalTransaction & {
      details?: { type?: string };
      direction?: string;
      railName?: string;
    }
  ).details;

  const rawType = normalizeText(transaction.type || details?.type);

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
    rawType.includes('withdraw') ||
    rawType.includes('cash-out') ||
    rawType.includes('payout')
  ) {
    return 'withdraw';
  }

  if (rawType.includes('transfer') || rawType.includes('send')) return 'send';
  if (
    rawType.includes('card') ||
    rawType.includes('payment') ||
    rawType.includes('purchase')
  ) {
    return 'card';
  }
  if (
    rawType.includes('convert') ||
    rawType.includes('swap') ||
    rawType.includes('exchange')
  ) {
    return 'convert';
  }

  if (normalizeText(transaction.railName).includes('card')) return 'card';

  // Fallback: evitar clasificar todo como conversión.
  return transaction.direction === 'in' ? 'topup' : 'send';
}

export function mapGlobalTransactionToMovement(
  transaction: GlobalTransaction,
): Movement | null {
  const asset = toAsset(transaction.asset);
  if (!asset) return null;

  const uniqueId = [
    transaction.reference,
    transaction.createdAt,
    transaction.amount,
  ].join('-');

  return {
    id: uniqueId,
    type: toType(transaction),
    asset,
    amount: toAmount(transaction.amount, transaction.asset),
    fee: 0,
    status: toStatus(transaction.status),
    createdAt: transaction.createdAt,
    reference: transaction.reference,
    counterparty:
      transaction.direction === 'in'
        ? transaction.fromAccountId
        : transaction.toAccountId,
    direction: transaction.direction === 'in' ? 'incoming' : 'outgoing',
  };
}
