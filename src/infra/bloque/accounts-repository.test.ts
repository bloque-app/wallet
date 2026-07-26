import { beforeEach, describe, expect, mock, test } from 'bun:test';

const listMock = mock(() => Promise.resolve({ accounts: [] as unknown[] }));

mock.module('~/lib/bloque', () => ({
  bloque: {
    accounts: {
      list: listMock,
    },
  },
}));

const { bloqueAccountsRepository } = await import('./accounts-repository');

describe('bloqueAccountsRepository.listProducts — medium duck-typing', () => {
  beforeEach(() => {
    listMock.mockClear();
  });

  test('a BRE-B account (medium tagged explicitly) maps to a breb Product, reading createdAt from nested details', async () => {
    listMock.mockImplementationOnce(() =>
      Promise.resolve({
        accounts: [
          {
            urn: 'did:bloque:account:breb:abc',
            medium: 'breb',
            ledgerId: 'ledger-1',
            status: 'active',
            keyType: 'ALPHA',
            key: '@someone',
            displayName: 'Someone',
            metadata: {},
            details: { created_at: '2026-01-01T00:00:00.000Z' },
            balance: { 'COPM/2': { current: '100', pending: '0' } },
          },
        ],
      }),
    );

    const [product] = await bloqueAccountsRepository.listProducts();

    expect(product?.kind).toBe('breb');
    expect(product?.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(product?.balances).toEqual([
      { asset: 'COPM/2', current: '100', pending: '0' },
    ]);
    if (product?.kind === 'breb') {
      expect(product.keyValue).toBe('@someone');
      expect(product.label).toBe('Someone');
    }
  });

  test('a card account (no medium tag) is recognized by lastFour/cardType shape', async () => {
    listMock.mockImplementationOnce(() =>
      Promise.resolve({
        accounts: [
          {
            urn: 'did:bloque:account:card:xyz',
            ledgerId: 'ledger-2',
            status: 'active',
            createdAt: '2026-02-01T00:00:00.000Z',
            lastFour: '1234',
            cardType: 'VIRTUAL',
            metadata: { card_name: 'My Card' },
          },
        ],
      }),
    );

    const [product] = await bloqueAccountsRepository.listProducts();

    expect(product?.kind).toBe('card');
    expect(product?.label).toBe('My Card');
    if (product?.kind === 'card') {
      expect(product.lastFour).toBe('1234');
    }
  });

  test('falls back to card lastFour label when no name metadata is set', async () => {
    listMock.mockImplementationOnce(() =>
      Promise.resolve({
        accounts: [
          {
            urn: 'did:bloque:account:card:xyz',
            ledgerId: 'ledger-2',
            status: 'active',
            createdAt: '2026-02-01T00:00:00.000Z',
            lastFour: '1234',
            cardType: 'VIRTUAL',
          },
        ],
      }),
    );

    const [product] = await bloqueAccountsRepository.listProducts();

    expect(product?.label).toBe('Tarjeta •• 1234');
  });

  test('a Polygon account is recognized by address/network shape', async () => {
    listMock.mockImplementationOnce(() =>
      Promise.resolve({
        accounts: [
          {
            urn: 'did:bloque:account:polygon:0xabc',
            ledgerId: 'ledger-3',
            status: 'active',
            createdAt: '2026-01-05T00:00:00.000Z',
            address: '0xabc',
            network: 'polygon',
          },
        ],
      }),
    );

    const [product] = await bloqueAccountsRepository.listProducts();

    expect(product?.kind).toBe('polygon');
  });

  test('a pocket without firstName/lastName still falls back to kind "pocket", not "other"', async () => {
    // Regression guard: VirtualAccount.firstName/lastName are typed as
    // always-present but aren't reliably populated in production — the
    // adapter must not require them to classify something as a pocket.
    listMock.mockImplementationOnce(() =>
      Promise.resolve({
        accounts: [
          {
            urn: 'did:bloque:account:virtual:def',
            ledgerId: 'ledger-4',
            status: 'active',
            createdAt: '2026-01-10T00:00:00.000Z',
            metadata: { name: 'Main' },
          },
        ],
      }),
    );

    const [product] = await bloqueAccountsRepository.listProducts();

    expect(product?.kind).toBe('pocket');
    expect(product?.label).toBe('Main');
  });

  test('a Bancolombia-shaped account (referenceCode) maps to "other", not "pocket"', async () => {
    listMock.mockImplementationOnce(() =>
      Promise.resolve({
        accounts: [
          {
            urn: 'did:bloque:account:bancolombia:ghi',
            ledgerId: 'ledger-5',
            status: 'active',
            createdAt: '2026-01-12T00:00:00.000Z',
            referenceCode: 'REF123',
          },
        ],
      }),
    );

    const [product] = await bloqueAccountsRepository.listProducts();

    expect(product?.kind).toBe('other');
  });

  test('maps every account in the list, preserving order', async () => {
    listMock.mockImplementationOnce(() =>
      Promise.resolve({
        accounts: [
          {
            urn: 'urn-1',
            ledgerId: 'ledger-a',
            status: 'active',
            lastFour: '0001',
            cardType: 'VIRTUAL',
          },
          {
            urn: 'urn-2',
            ledgerId: 'ledger-a',
            status: 'active',
            address: '0xdef',
            network: 'polygon',
          },
        ],
      }),
    );

    const products = await bloqueAccountsRepository.listProducts();

    expect(products.map((p) => p.urn)).toEqual(['urn-1', 'urn-2']);
  });
});
