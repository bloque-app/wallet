import { useSyncExternalStore } from 'react';
import {
  type Asset,
  type KycStatus,
  mockBalances,
  mockPolygonAccounts,
} from '~/lib/mock-data';

type WalletUser = {
  kycStatus: KycStatus;
};

type PolygonAccount = {
  id: string;
  label: string;
  address: string;
  balance: number;
};

type WalletStore = {
  showBalances: boolean;
  balances: Record<Asset, number>;
  polygonAccounts: PolygonAccount[];
  user: WalletUser;
};

type WalletSnapshot = WalletStore & {
  setShowBalances: (value: boolean) => void;
  addPolygonAccount: (label: string) => void;
  removePolygonAccount: (id: string) => void;
  setKycStatus: (status: KycStatus) => void;
};

const listeners = new Set<() => void>();

const actions = {
  setShowBalances,
  addPolygonAccount,
  removePolygonAccount,
  setKycStatus,
};

let snapshot: WalletSnapshot = {
  showBalances: true,
  balances: {
    COP: mockBalances.COP,
    USD: mockBalances.USD,
    KSM: mockBalances.KSM,
  },
  polygonAccounts: [...mockPolygonAccounts],
  user: {
    kycStatus: 'not_started',
  },
  ...actions,
};

function emitChange() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setShowBalances(value: boolean) {
  snapshot = { ...snapshot, showBalances: value };
  emitChange();
}

function addPolygonAccount(label: string) {
  const trimmed = label.trim();
  if (!trimmed) return;

  const id = `poly_${Date.now()}`;
  const address = `0x${Math.random().toString(16).slice(2).padEnd(40, '0').slice(0, 40)}`;
  const next: PolygonAccount = { id, label: trimmed, address, balance: 0 };

  snapshot = {
    ...snapshot,
    polygonAccounts: [...snapshot.polygonAccounts, next],
  };
  emitChange();
}

function removePolygonAccount(id: string) {
  snapshot = {
    ...snapshot,
    polygonAccounts: snapshot.polygonAccounts.filter(
      (account) => account.id !== id,
    ),
  };
  emitChange();
}

function setKycStatus(status: KycStatus) {
  snapshot = {
    ...snapshot,
    user: { ...snapshot.user, kycStatus: status },
  };
  emitChange();
}

function getSnapshot(): WalletSnapshot {
  return snapshot;
}

export function useWallet() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
