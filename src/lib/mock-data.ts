export type KycStatus = 'not_started' | 'in_review' | 'approved' | 'rejected';
export type LoginMethod = 'email' | 'phone';
export type MovementType = 'topup' | 'withdraw' | 'send' | 'convert' | 'card';
export type MovementStatus = 'completed' | 'pending' | 'failed';
export type Asset = 'COP' | 'USD' | 'KSM';
export type CardStatus = 'none' | 'active' | 'frozen';

export interface User {
  id: string;
  loginMethod: LoginMethod;
  maskedContact: string;
  kycStatus: KycStatus;
  name?: string;
}

export interface WalletBalances {
  COP: number;
  USD: number;
  KSM: number;
}

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

export interface CardData {
  id: string;
  label: string;
  status: CardStatus;
  last4: string;
  frozen: boolean;
  limits: {
    daily: number;
    monthly: number;
  };
  createdAt: string;
}

export interface PolygonAccount {
  id: string;
  label: string;
  address: string;
  balance: number;
}

export const mockUser: User = {
  id: 'usr_001',
  loginMethod: 'email',
  maskedContact: 'j***@gmail.com',
  kycStatus: 'not_started',
  name: 'Juan Pérez',
};

export const mockBalances: WalletBalances = {
  COP: 2_450_000,
  USD: 580.25,
  KSM: 12.4837,
};

export const mockMovements: Movement[] = [
  {
    id: 'mov_001',
    type: 'topup',
    asset: 'COP',
    amount: 500_000,
    fee: 3_500,
    status: 'completed',
    createdAt: '2026-02-10T14:30:00Z',
    reference: 'PSE-20260210-001',
    counterparty: 'Bancolombia',
    direction: 'incoming',
  },
  {
    id: 'mov_002',
    type: 'convert',
    asset: 'USD',
    amount: 120.0,
    fee: 1.2,
    status: 'completed',
    createdAt: '2026-02-09T10:15:00Z',
    reference: 'CNV-20260209-002',
    direction: 'outgoing',
  },
  {
    id: 'mov_003',
    type: 'topup',
    asset: 'COP',
    amount: 1_000_000,
    fee: 3_500,
    status: 'pending',
    createdAt: '2026-02-08T18:45:00Z',
    reference: 'PSE-20260208-003',
    counterparty: 'Davivienda',
    direction: 'incoming',
  },
  {
    id: 'mov_004',
    type: 'send',
    asset: 'KSM',
    amount: 2.5,
    fee: 0.01,
    status: 'completed',
    createdAt: '2026-02-07T09:00:00Z',
    reference: 'SND-20260207-004',
    counterparty: '5GrwvaEF...',
    direction: 'outgoing',
  },
  {
    id: 'mov_005',
    type: 'card',
    asset: 'USD',
    amount: 45.99,
    fee: 0,
    status: 'completed',
    createdAt: '2026-02-06T21:30:00Z',
    reference: 'CRD-20260206-005',
    counterparty: 'Amazon.com',
    direction: 'outgoing',
  },
  {
    id: 'mov_006',
    type: 'topup',
    asset: 'COP',
    amount: 200_000,
    fee: 3_500,
    status: 'failed',
    createdAt: '2026-02-05T12:00:00Z',
    reference: 'PSE-20260205-006',
    counterparty: 'Nequi',
    direction: 'incoming',
  },
  {
    id: 'mov_007',
    type: 'convert',
    asset: 'COP',
    amount: 350_000,
    fee: 2_100,
    status: 'completed',
    createdAt: '2026-02-04T16:20:00Z',
    reference: 'CNV-20260204-007',
    direction: 'incoming',
  },
  {
    id: 'mov_008',
    type: 'withdraw',
    asset: 'COP',
    amount: 150_000,
    fee: 5_000,
    status: 'completed',
    createdAt: '2026-02-03T08:10:00Z',
    reference: 'WTH-20260203-008',
    counterparty: 'Banco de Bogotá',
    direction: 'outgoing',
  },
];

export const mockCard: CardData = {
  id: 'card_000',
  label: 'Sin tarjeta',
  status: 'none',
  last4: '',
  frozen: false,
  limits: {
    daily: 500,
    monthly: 5000,
  },
  createdAt: '',
};

export const mockCards: CardData[] = [
  {
    id: 'card_001',
    label: 'Personal',
    status: 'active',
    last4: '4829',
    frozen: false,
    limits: { daily: 500, monthly: 5000 },
    createdAt: '2026-01-15T10:00:00Z',
  },
  {
    id: 'card_002',
    label: 'Empresa',
    status: 'frozen',
    last4: '7713',
    frozen: true,
    limits: { daily: 1000, monthly: 10000 },
    createdAt: '2026-02-01T14:30:00Z',
  },
];

export const mockPolygonAccounts: PolygonAccount[] = [
  {
    id: 'poly_001',
    label: 'Principal',
    address: '0x1a2B3c4D5e6F7890AbCdEf1234567890aBcDeF01',
    balance: 8.3241,
  },
  {
    id: 'poly_002',
    label: 'Ahorros',
    address: '0xfF9900aaBBccDDee1122334455667788AAbbCCdd',
    balance: 4.1596,
  },
];

export const colombianBanks = [
  'Bancolombia',
  'Banco de Bogotá',
  'Davivienda',
  'BBVA Colombia',
  'Banco de Occidente',
  'Banco Popular',
  'Banco AV Villas',
  'Banco Caja Social',
  'Scotiabank Colpatria',
  'Itaú',
  'Banco Falabella',
  'Nequi',
  'Daviplata',
];

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
