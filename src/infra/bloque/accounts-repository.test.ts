import { beforeEach, describe, expect, mock, test } from 'bun:test';

const listMock = mock(() => Promise.resolve({ accounts: [] as unknown[] }));
const transactionsMock = mock(() =>
  Promise.resolve({ data: [] as unknown[], pageSize: 0, hasMore: false }),
);

mock.module('~/lib/bloque', () => ({
  bloque: {
    accounts: {
      list: listMock,
      transactions: transactionsMock,
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

describe('bloqueAccountsRepository.getTransactions — global feed adapter', () => {
  beforeEach(() => {
    transactionsMock.mockClear();
  });

  test('maps GlobalTransaction[] into MovementEntry[], deriving counterparty from direction', async () => {
    transactionsMock.mockImplementationOnce(() =>
      Promise.resolve({
        data: [
          {
            status: 'confirmed',
            amount: '500000',
            asset: 'COPM/2',
            fromAccountId: 'urn:from',
            toAccountId: 'urn:to',
            direction: 'in',
            reference: 'ref-1',
            railName: 'ach',
            details: {},
            createdAt: '2026-01-01T00:00:00.000Z',
            type: 'deposit',
          },
        ],
        pageSize: 1,
        hasMore: true,
        next: 'cursor-2',
      }),
    );

    const page = await bloqueAccountsRepository.getTransactions({
      limit: 10,
      asset: 'COPM/2',
    });

    expect(page.movements).toHaveLength(1);
    expect(page.movements[0]).toMatchObject({
      id: 'ref-1',
      asset: 'COPM/2',
      amount: '500000',
      direction: 'in',
      status: 'confirmed',
      reference: 'ref-1',
      counterparty: 'urn:from',
      railName: 'ach',
      type: 'deposit',
    });
    expect(page.hasMore).toBe(true);
    expect(page.next).toBe('cursor-2');
  });

  test('forwards details onto the MovementEntry so toDomainMovement can fall back to details.type', async () => {
    transactionsMock.mockImplementationOnce(() =>
      Promise.resolve({
        data: [
          {
            status: 'confirmed',
            amount: '500000',
            asset: 'COPM/2',
            fromAccountId: 'urn:from',
            toAccountId: 'urn:to',
            direction: 'out',
            reference: 'ref-3',
            railName: 'ach',
            details: { type: 'cash-out' },
            createdAt: '2026-01-03T00:00:00.000Z',
            // type deliberately omitted — GlobalTransaction.type is optional
          },
        ],
        pageSize: 1,
        hasMore: false,
      }),
    );

    const page = await bloqueAccountsRepository.getTransactions({});

    expect(page.movements[0]?.type).toBeUndefined();
    expect(page.movements[0]?.details).toEqual({ type: 'cash-out' });
  });

  test('derives counterparty from toAccountId for outbound transactions', async () => {
    transactionsMock.mockImplementationOnce(() =>
      Promise.resolve({
        data: [
          {
            status: 'settled',
            amount: '10000',
            asset: 'DUSD/6',
            fromAccountId: 'urn:from',
            toAccountId: 'urn:to',
            direction: 'out',
            reference: 'ref-2',
            railName: 'wire',
            details: {},
            createdAt: '2026-01-02T00:00:00.000Z',
          },
        ],
        pageSize: 1,
        hasMore: false,
      }),
    );

    const page = await bloqueAccountsRepository.getTransactions({});

    expect(page.movements[0]?.counterparty).toBe('urn:to');
    expect(page.hasMore).toBe(false);
  });

  test('passes asset/limit/direction/next through to the SDK call', async () => {
    await bloqueAccountsRepository.getTransactions({
      asset: 'KSM/12',
      limit: 25,
      direction: 'out',
      next: 'cursor-1',
    });

    expect(transactionsMock).toHaveBeenCalledWith({
      asset: 'KSM/12',
      direction: 'out',
      limit: 25,
      next: 'cursor-1',
    });
  });
});
