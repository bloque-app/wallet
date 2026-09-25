import { describe, expect, test } from 'bun:test';
import { groupIntoAccounts } from './grouping';
import type { Product } from './types';
import {
  hasActiveVirtualAccount,
  isActiveVirtualAccount,
} from './virtual-account';

function product(overrides: Partial<Product> & Pick<Product, 'kind'>): Product {
  const base = {
    urn: 'urn:default',
    ledgerId: undefined,
    status: 'active',
    createdAt: undefined,
    balances: [],
    metadata: undefined,
    label: 'Untitled',
  };

  return { ...base, ...overrides } as Product;
}

describe('isActiveVirtualAccount', () => {
  test('accepts an account anchored by an active pocket', () => {
    const [account] = groupIntoAccounts([
      product({ kind: 'card', urn: 'card-1', ledgerId: 'ledger-a' }),
      product({ kind: 'pocket', urn: 'pocket-1', ledgerId: 'ledger-a' }),
    ]);
    expect(isActiveVirtualAccount(account)).toBe(true);
  });

  test('rejects a ledger with no pocket', () => {
    const [account] = groupIntoAccounts([
      product({ kind: 'card', urn: 'card-1', ledgerId: 'ledger-a' }),
      product({ kind: 'breb', urn: 'breb-1', ledgerId: 'ledger-a' }),
    ]);
    expect(isActiveVirtualAccount(account)).toBe(false);
  });

  test('rejects a pocket that is not active yet', () => {
    const [account] = groupIntoAccounts([
      product({
        kind: 'pocket',
        urn: 'pocket-1',
        ledgerId: 'ledger-a',
        status: 'creation_in_progress',
      }),
    ]);
    expect(isActiveVirtualAccount(account)).toBe(false);
  });
});

describe('hasActiveVirtualAccount', () => {
  test('is true when any account is an active virtual account', () => {
    const accounts = groupIntoAccounts([
      product({ kind: 'card', urn: 'card-1', ledgerId: 'ledger-a' }),
      product({ kind: 'pocket', urn: 'pocket-2', ledgerId: 'ledger-b' }),
    ]);
    expect(hasActiveVirtualAccount(accounts)).toBe(true);
  });

  test('is false with no accounts', () => {
    expect(hasActiveVirtualAccount([])).toBe(false);
  });
});
