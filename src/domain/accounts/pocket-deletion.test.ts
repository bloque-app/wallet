import { describe, expect, test } from 'bun:test';
import {
  isDefaultPocket,
  minorUnitsToMajorInput,
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
  test('separates current funds from pending funds across assets', () => {
    const balances = [
      { asset: 'COPM/2', current: '1250', pending: '0' },
      { asset: 'DUSD/6', current: '0', pending: '250000' },
      { asset: 'BRLB/2', current: '0', pending: '0' },
    ];

    expect(pocketDeletionBalances(balances)).toEqual({
      funded: [balances[0]],
      pending: [balances[1]],
    });
  });
});

describe('minorUnitsToMajorInput', () => {
  test('preserves the exact amount without floating-point conversion', () => {
    expect(minorUnitsToMajorInput('1250', 'COPM/2')).toBe('12.5');
    expect(minorUnitsToMajorInput('1000001', 'DUSD/6')).toBe('1.000001');
    expect(minorUnitsToMajorInput('5', 'BRLB/2')).toBe('0.05');
  });
});
