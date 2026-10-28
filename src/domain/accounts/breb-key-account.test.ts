import { describe, expect, test } from 'bun:test';
import { brebKeyAccounts } from './breb-key-account';
import type { Account } from './types';

describe('brebKeyAccounts', () => {
  test('keeps the pocket label alongside each BRE-B key', () => {
    const accounts: Account[] = [
      {
        ledgerId: 'ledger-main',
        label: 'Principal',
        primaryUrn: 'pocket-main',
        balances: [],
        products: [
          {
            kind: 'pocket',
            urn: 'pocket-main',
            status: 'active',
            label: 'Principal',
            balances: [],
          },
          {
            kind: 'breb',
            urn: 'key-main',
            status: 'active',
            label: 'BRE-B',
            balances: [],
            keyType: 'ALPHA',
            keyValue: '@principal',
          },
        ],
      },
      {
        ledgerId: 'ledger-savings',
        label: 'Ahorros',
        primaryUrn: 'pocket-savings',
        balances: [],
        products: [
          {
            kind: 'breb',
            urn: 'key-savings',
            status: 'active',
            label: 'BRE-B',
            balances: [],
            keyType: 'ALPHA',
            keyValue: '@ahorros',
          },
        ],
      },
    ];

    expect(brebKeyAccounts(accounts)).toEqual([
      {
        product: expect.objectContaining({ urn: 'key-main' }),
        accountLabel: 'Principal',
      },
      {
        product: expect.objectContaining({ urn: 'key-savings' }),
        accountLabel: 'Ahorros',
      },
    ]);
  });
});
