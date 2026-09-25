import { USD_ENABLED } from '~/config/features';
import i18n from '~/i18n/config';

export type LoginMethod = 'email' | 'phone';
export type MovementType = 'topup' | 'withdraw' | 'send' | 'convert' | 'card';
export type MovementStatus = 'completed' | 'pending' | 'failed';
export type Asset = 'COP' | 'USD' | 'KSM';
export type CardStatus = 'none' | 'active' | 'frozen';

export interface Movement {
  id: string;
  type: MovementType;
  asset: Asset;
  amount: number;
  fee: number;
  status: MovementStatus;
  createdAt: string;
  reference: string;
  counterparty?: string;
  direction: 'incoming' | 'outgoing';
}

export function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatKSM(amount: number): string {
  return `${amount.toFixed(4)} KSM`;
}

export function formatAmount(asset: Asset, amount: number): string {
  switch (asset) {
    case 'COP':
      return formatCOP(amount);
    case 'USD':
      return formatUSD(amount);
    case 'KSM':
      return formatKSM(amount);
  }
}

/**
 * Balance chip display order/filter for any list of `{ asset }` records
 * (raw ledger balances, movement rows, etc.): KSM is hidden entirely — not
 * a balance this app surfaces to users — and USD is sorted first among
 * whatever remains. Uses a stable sort, so non-USD assets keep their
 * original (ledger-reported) relative order.
 */
export function sortBalancesForDisplay<T extends { asset: string }>(
  balances: T[],
  primary: 'USD' | 'COP' = USD_ENABLED ? 'USD' : 'COP',
): T[] {
  return balances
    .filter((balance) => !balance.asset.startsWith('KSM'))
    .sort((a, b) => {
      const aIsUsd = isUsdAsset(a.asset);
      const bIsUsd = isUsdAsset(b.asset);
      if (aIsUsd === bIsUsd) return 0;
      return aIsUsd === (primary === 'USD') ? -1 : 1;
    });
}

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

export function formatFullDate(dateStr: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

export function getMovementLabel(
  type: MovementType,
  direction?: Movement['direction'],
): string {
  const labels: Record<MovementType, string> = {
    topup: i18n.t('movements.types.topup'),
    withdraw: i18n.t('movements.types.withdraw'),
    send:
      direction === 'incoming'
        ? i18n.t('movements.types.sendIncoming')
        : i18n.t('movements.types.sendOutgoing'),
    convert: i18n.t('movements.types.convert'),
    card: i18n.t('movements.types.card'),
  };
  return labels[type];
}

export function getAssetPrecision(assetWithPrecision: string): number {
  const [, precisionStr] = assetWithPrecision.split('/');
  const parsed = Number.parseInt(precisionStr ?? '0', 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function formatPolygonAddress(addr: string): string {
  if (addr.length < 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function generateRandomPolygonAddress(): string {
  const hex = '0123456789abcdef';
  let addr = '0x';
  for (let i = 0; i < 40; i++) {
    addr += hex[Math.floor(Math.random() * 16)];
  }
  return addr;
}

/** True for USD-denominated SDK assets, e.g. 'DUSD/6' or 'USD/2'. */
export function isUsdAsset(sdkAsset: string): boolean {
  const [code] = sdkAsset.split('/');
  return code === 'DUSD' || code === 'USD';
}
