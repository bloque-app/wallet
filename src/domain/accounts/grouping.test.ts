import { describe, expect, test } from 'bun:test';
import { dedupeByLedger, groupIntoAccounts } from './grouping';
import type { Product } from './types';

function product(overrides: Partial<Product> & Pick<Product, 'kind'>): Product {
  const base = {
    urn: 'did:bloque:account:card:default',
    ledgerId: undefined,
    status: 'active',
    createdAt: undefined,
    balances: [],
    metadata: undefined,
    label: 'Untitled',
  };

  return { ...base, ...overrides } as Product;
}

describe('dedupeByLedger', () => {
  test('collapses products sharing a ledgerId to the first occurrence', () => {
    const products = [
      product({ kind: 'card', urn: 'card-1', ledgerId: 'ledger-a' }),
      product({ kind: 'breb', urn: 'breb-1', ledgerId: 'ledger-a' }),
      product({ kind: 'polygon', urn: 'poly-1', ledgerId: 'ledger-b' }),
    ];

    const result = dedupeByLedger(products);

    expect(result.map((p) => p.urn)).toEqual(['card-1', 'poly-1']);
  });

  test('never dedupes products without a ledgerId against each other', () => {
    const products = [
      product({ kind: 'card', urn: 'card-1', ledgerId: undefined }),
      product({ kind: 'card', urn: 'card-2', ledgerId: undefined }),
    ];

    const result = dedupeByLedger(products);

    expect(result).toHaveLength(2);
  });
});

describe('groupIntoAccounts', () => {
  test('groups products by ledgerId, one Account per distinct ledger', () => {
    const products: Product[] = [
      product({
        kind: 'pocket',
        urn: 'pocket-1',
        ledgerId: 'ledger-main',
        createdAt: '2026-01-01T00:00:00.000Z',
        label: 'Main',
      }),
      product({
        kind: 'card',
        urn: 'card-1',
        ledgerId: 'ledger-main',
        createdAt: '2026-02-01T00:00:00.000Z',
        label: 'Debit Card',
      }),
      product({
        kind: 'breb',
        urn: 'breb-1',
        ledgerId: 'ledger-other',
        createdAt: '2026-01-15T00:00:00.000Z',
        label: '@someone',
      }),
    ];

    const accounts = groupIntoAccounts(products);

    expect(accounts).toHaveLength(2);
    const main = accounts.find((a) => a.ledgerId === 'ledger-main');
    expect(main?.products.map((p) => p.urn).sort()).toEqual([
      'card-1',
      'pocket-1',
    ]);
  });

  test('picks the pocket as primary even when a card was created earlier', () => {
    const products: Product[] = [
      product({
        kind: 'card',
        urn: 'card-1',
        ledgerId: 'ledger-a',
        createdAt: '2020-01-01T00:00:00.000Z',
        label: 'Old Card',
      }),
      product({
        kind: 'pocket',
        urn: 'pocket-1',
        ledgerId: 'ledger-a',
        createdAt: '2026-01-01T00:00:00.000Z',
        label: 'Main',
      }),
    ];

    const [account] = groupIntoAccounts(products);

    expect(account?.primaryUrn).toBe('pocket-1');
    expect(account?.label).toBe('Main');
  });

  test('falls back to the earliest-created product when no pocket exists', () => {
    const products: Product[] = [
      product({
        kind: 'card',
        urn: 'card-2',
        ledgerId: 'ledger-a',
        createdAt: '2026-03-01T00:00:00.000Z',
        label: 'Newer Card',
      }),
      product({
        kind: 'breb',
        urn: 'breb-1',
        ledgerId: 'ledger-a',
        createdAt: '2026-01-01T00:00:00.000Z',
        label: '@first',
      }),
    ];

    const [account] = groupIntoAccounts(products);

    expect(account?.primaryUrn).toBe('breb-1');
  });

  test('a ledger with only a pocket and no other products produces a single-member Account', () => {
    const products: Product[] = [
      product({
        kind: 'pocket',
        urn: 'pocket-lonely',
        ledgerId: 'ledger-empty',
        label: 'Lonely Pocket',
      }),
    ];

    const accounts = groupIntoAccounts(products);

    expect(accounts).toHaveLength(1);
    expect(accounts[0]?.products).toHaveLength(1);
    expect(accounts[0]?.primaryUrn).toBe('pocket-lonely');
  });

  test('Account.balances mirrors the primary product balances (ledger-level, no summing)', () => {
    const sharedBalances = [
      { asset: 'COPM/2', current: '500000', pending: '0' },
    ];
    const products: Product[] = [
      product({
        kind: 'pocket',
        urn: 'pocket-1',
        ledgerId: 'ledger-a',
        createdAt: '2026-01-01T00:00:00.000Z',
        balances: sharedBalances,
      }),
      product({
        kind: 'card',
        urn: 'card-1',
        ledgerId: 'ledger-a',
        createdAt: '2026-02-01T00:00:00.000Z',
        balances: sharedBalances,
      }),
    ];

    const [account] = groupIntoAccounts(products);

    expect(account?.balances).toEqual(sharedBalances);
  });

  test('reproduces the real production shape: 4 groups from Main/PawHaus/Bloque/orphan-pocket data', () => {
    const mkBalances = (asset: string, current: string) => [
      { asset, current, pending: '0' },
    ];

    const products: Product[] = [
      product({
        kind: 'polygon',
        urn: 'polygon-main',
        ledgerId: 'ledger-main',
        createdAt: '2026-03-11T19:23:16.412Z',
        balances: mkBalances('COPM/2', '500000'),
      }),
      product({
        kind: 'pocket',
        urn: 'pocket-main',
        ledgerId: 'ledger-main',
        createdAt: '2026-03-11T19:22:29.689Z',
        label: 'Main',
        balances: mkBalances('COPM/2', '500000'),
      }),
      product({
        kind: 'card',
        urn: 'card-main',
        ledgerId: 'ledger-main',
        createdAt: '2026-04-20T18:21:30.527Z',
        label: 'Debit Card',
        balances: mkBalances('COPM/2', '500000'),
      }),
      product({
        kind: 'breb',
        urn: 'breb-main-1',
        ledgerId: 'ledger-main',
        createdAt: '2026-07-24T20:30:47.711Z',
      }),
      product({
        kind: 'breb',
        urn: 'breb-main-2',
        ledgerId: 'ledger-main',
        createdAt: '2026-07-24T21:38:02.599Z',
      }),
      product({
        kind: 'pocket',
        urn: 'pocket-pawhaus',
        ledgerId: 'ledger-pawhaus',
        createdAt: '2026-07-24T21:37:59.900Z',
        label: 'PawHaus',
      }),
      product({
        kind: 'card',
        urn: 'card-pawhaus-1',
        ledgerId: 'ledger-pawhaus',
        createdAt: '2026-07-25T23:09:39.484Z',
        label: 'PawHaus',
      }),
      product({
        kind: 'card',
        urn: 'card-pawhaus-2',
        ledgerId: 'ledger-pawhaus',
        createdAt: '2026-07-25T23:09:41.211Z',
        label: 'PawHaus',
      }),
      product({
        kind: 'breb',
        urn: 'breb-pawhaus',
        ledgerId: 'ledger-pawhaus',
        createdAt: '2026-07-24T21:38:54.923Z',
        label: 'PawHaus',
      }),
      product({
        kind: 'pocket',
        urn: 'pocket-bloque',
        ledgerId: 'ledger-bloque',
        createdAt: '2026-04-27T18:21:05.215Z',
        label: 'Bloque',
      }),
      product({
        kind: 'card',
        urn: 'card-bloque',
        ledgerId: 'ledger-bloque',
        createdAt: '2026-04-27T18:21:16.865Z',
        label: 'Bloque Subscriptions',
      }),
      product({
        kind: 'pocket',
        urn: 'pocket-orphan',
        ledgerId: 'ledger-orphan',
        createdAt: '2026-07-24T21:38:00.012Z',
        label: 'PawHaus',
      }),
    ];

    const accounts = groupIntoAccounts(products);

    expect(accounts).toHaveLength(4);

    const main = accounts.find((a) => a.ledgerId === 'ledger-main');
    expect(main?.products).toHaveLength(5);
    expect(main?.primaryUrn).toBe('pocket-main');

    const pawhaus = accounts.find((a) => a.ledgerId === 'ledger-pawhaus');
    expect(pawhaus?.products).toHaveLength(4);

    const bloque = accounts.find((a) => a.ledgerId === 'ledger-bloque');
    expect(bloque?.products).toHaveLength(2);

    const orphan = accounts.find((a) => a.ledgerId === 'ledger-orphan');
    expect(orphan?.products).toHaveLength(1);
  });
});
