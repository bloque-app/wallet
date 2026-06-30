export type KycStatus = 'not_started' | 'in_review' | 'approved' | 'rejected';
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
    topup: 'Recarga',
    withdraw: 'Retiro',
    send:
      direction === 'incoming'
        ? 'Transferencia recibida'
        : 'Transferencia enviada',
    convert: 'Conversión',
    card: 'Pago con tarjeta',
  };
  return labels[type];
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
