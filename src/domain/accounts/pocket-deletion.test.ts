import { describe, expect, test } from 'bun:test';
import {
  isDefaultPocket,
  pocketDeletionBalances,
  pocketDeletionBlockers,
} from './pocket-deletion';
import type { Product } from './types';

function product(overrides: Partial<Product> & Pick<Product, 'kind'>) {
  return {
    urn: 'urn:pocket',
    status: 'active',
    label: 'Pocket',
    balances: [],
    ...overrides,
  } as Product;
}

describe('pocketDeletionBlockers', () => {
  test('lists every other product still on the ledger', () => {
    const pocket = product({ kind: 'pocket' });
    const card = product({ kind: 'card', urn: 'urn:card' });
    const deletedKey = product({
      kind: 'breb',
      urn: 'urn:breb',
      status: 'deleted',
    });

    expect(
      pocketDeletionBlockers([pocket, card, deletedKey], pocket.urn),
    ).toEqual([card]);
  });
});

describe('isDefaultPocket', () => {
  test('reads the default flag from the pocket metadata', () => {
    expect(
      isDefaultPocket(product({ kind: 'pocket', metadata: { default: true } })),
    ).toBe(true);
    expect(isDefaultPocket(product({ kind: 'pocket', metadata: {} }))).toBe(
      false,
    );
  });
});

describe('pocketDeletionBalances', () => {
  test('separates movable, unmovable and pending funds across assets', () => {
    const balances = [
      { asset: 'COPM/2', current: '1250', pending: '0' },
      { asset: 'DUSD/6', current: '250000', pending: '0' },
      { asset: 'KSM/12', current: '0', pending: '10' },
      { asset: 'BRLB/2', current: '0', pending: '0' },
    ];

    expect(
      pocketDeletionBalances(balances, (asset) => asset.startsWith('COPM')),
    ).toEqual({
      funded: [balances[0]],
      unmovable: [balances[1]],
      pending: [balances[2]],
    });
  });
});
