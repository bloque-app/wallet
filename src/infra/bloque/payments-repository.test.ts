import { beforeEach, describe, expect, mock, test } from 'bun:test';

const findRatesMock = mock(() => Promise.resolve({ rates: [] as unknown[] }));
const pseCreateMock = mock(() =>
  Promise.resolve({ order: baseOrder(), requestId: 'req-1' }),
);
const bankTransferCreateMock = mock(() =>
  Promise.resolve({ order: baseOrder(), requestId: 'req-2' }),
);
const brebCreateMock = mock(() =>
  Promise.resolve({ order: baseOrder(), requestId: 'req-3' }),
);
const pseBanksMock = mock(() =>
  Promise.resolve({ banks: [{ code: '1', name: 'Bancolombia' }] }),
);

function baseOrder() {
  return {
    id: 'order-1',
    orderSig: 'order-sig-1',
    rateSig: 'rate-sig-1',
    swapSig: 'swap-sig-1',
    taker: 'did:bloque:account:card:taker',
    maker: 'did:bloque:maker',
    fromAsset: 'COP/2',
    toAsset: 'COPM/2',
    fromMedium: 'pse',
    toMedium: 'kusama',
    fromAmount: '1000000',
    toAmount: '1000000',
    at: '2026-01-01T00:00:00.000Z',
    graphId: 'graph-1',
    status: 'pending',
    metadata: { foo: 'bar' },
    webhookUrl: 'https://example.com/webhook',
    failureReason: undefined,
    failureDetails: undefined,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

mock.module('~/lib/bloque', () => ({
  bloque: {
    swap: {
      findRates: findRatesMock,
      pse: {
        banks: pseBanksMock,
        create: pseCreateMock,
      },
      bankTransfer: {
        create: bankTransferCreateMock,
      },
      breb: {
        create: brebCreateMock,
      },
    },
  },
}));

const { bloquePaymentsRepository } = await import('./payments-repository');

describe('bloquePaymentsRepository.findRates', () => {
  beforeEach(() => {
    findRatesMock.mockClear();
  });

  test('maps the SDK rate edge tuple into fromAsset/toAsset, dropping internal-only fields', async () => {
    findRatesMock.mockImplementationOnce(() =>
      Promise.resolve({
        rates: [
          {
            id: 'rate-1',
            sig: 'sig-abc',
            swapSig: 'swap-sig-abc',
            maker: 'did:bloque:maker',
            edge: ['COP/2', 'COPM/2'],
            fee: { at: 1, value: 0, formula: '', components: [] },
            at: '2026-01-01T00:00:00.000Z',
            until: '2026-01-01T00:05:00.000Z',
            fromMediums: ['pse'],
            toMediums: ['kusama'],
            rate: [1000000, 1000000],
            ratio: 1,
            fromLimits: ['0', '0'],
            toLimits: ['0', '0'],
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      }),
    );

    const rates = await bloquePaymentsRepository.findRates({
      fromAsset: 'COP/2',
      toAsset: 'COPM/2',
      fromMediums: ['pse'],
      toMediums: ['kusama'],
      amountSrc: '1000000',
    });

    expect(rates).toEqual([
      {
        sig: 'sig-abc',
        ratio: 1,
        rate: [1000000, 1000000],
        fromAsset: 'COP/2',
        toAsset: 'COPM/2',
        until: '2026-01-01T00:05:00.000Z',
      },
    ]);
    // Internal-only SDK fields must not leak into the domain type.
    expect(rates[0]).not.toHaveProperty('fee');
    expect(rates[0]).not.toHaveProperty('maker');
  });
});

describe('bloquePaymentsRepository order creation — execution outcome mapping', () => {
  beforeEach(() => {
    pseCreateMock.mockClear();
    bankTransferCreateMock.mockClear();
    brebCreateMock.mockClear();
  });

  test('createPseOrder resolves a redirect execution outcome', async () => {
    pseCreateMock.mockImplementationOnce(() =>
      Promise.resolve({
        order: baseOrder(),
        execution: {
          nodeId: 'node-1',
          result: {
            status: 'paused',
            how: { type: 'REDIRECT', url: 'https://pse.example.com/pay' },
          },
        },
        requestId: 'req-1',
      }),
    );

    const result = await bloquePaymentsRepository.createPseOrder({
      rateSig: 'rate-sig-1',
      toMedium: 'kusama',
      amountSrc: '1000000',
      depositInformation: { urn: 'did:bloque:account:virtual:dest' },
      args: {
        bankCode: '1',
        userType: 0,
        customerEmail: 'user@example.com',
        userLegalIdType: 'CC',
        userLegalId: '123',
        // E.164 — the route that builds this (topup/index.tsx) always
        // prepends +57 before it reaches this repository; this fixture
        // documents that shape rather than testing the conversion itself
        // (that's a pure function local to the route, not exercised here).
        customerData: { fullName: 'User', phoneNumber: '+573000000000' },
        redirectUrl: 'https://wallet.example.com/topup',
      },
    });

    expect(result.order.id).toBe('order-1');
    expect(result.execution).toEqual({
      kind: 'redirect',
      url: 'https://pse.example.com/pay',
    });
  });

  test('createBrebOrder resolves a breb-deposit execution outcome — the case previously swallowed', async () => {
    brebCreateMock.mockImplementationOnce(() =>
      Promise.resolve({
        order: baseOrder(),
        execution: {
          nodeId: 'node-1',
          result: {
            status: 'paused',
            how: {
              type: 'BREB_DEPOSIT',
              medium: 'breb',
              keyType: 'ALPHA',
              keyValue: '@one-time-key',
              amount: '5000000',
              currency: 'COP',
              reference: 'ref-1',
              depositAccountUrn: 'did:bloque:account:virtual:deposit',
              depositStatus: 'awaiting',
            },
          },
        },
        requestId: 'req-3',
      }),
    );

    const result = await bloquePaymentsRepository.createBrebOrder({
      rateSig: 'rate-sig-1',
      amountSrc: '5000000',
      depositInformation: {
        resolutionId: 'resolution-1',
        destinationKey: { keyValue: '@one-time-key', keyType: 'ALPHA' },
      },
      args: { sourceAccountUrn: 'did:bloque:account:card:source' },
    });

    expect(result.execution).toEqual({
      kind: 'breb-deposit',
      keyValue: '@one-time-key',
      amount: '5000000',
      depositAccountUrn: 'did:bloque:account:virtual:deposit',
      depositStatus: 'awaiting',
    });
  });

  test('createBankTransferOrder resolves { kind: "none" } when no execution is returned', async () => {
    bankTransferCreateMock.mockImplementationOnce(() =>
      Promise.resolve({ order: baseOrder(), requestId: 'req-2' }),
    );

    const result = await bloquePaymentsRepository.createBankTransferOrder({
      rateSig: 'rate-sig-1',
      toMedium: 'bancolombia',
      amountSrc: '1000000',
      depositInformation: {
        bankAccountType: 'savings',
        bankAccountNumber: '123',
        bankAccountHolderName: 'User',
        bankAccountHolderIdentificationType: 'CC',
        bankAccountHolderIdentificationValue: '123',
      },
      args: { sourceAccountUrn: 'did:bloque:account:card:source' },
    });

    expect(result.execution).toEqual({ kind: 'none' });
  });

  test('maps every SwapOrder field 1:1 into PaymentOrder (unlike the old breb.ts stopgap)', async () => {
    pseCreateMock.mockImplementationOnce(() =>
      Promise.resolve({ order: baseOrder(), requestId: 'req-1' }),
    );

    const result = await bloquePaymentsRepository.createPseOrder({
      rateSig: 'rate-sig-1',
      toMedium: 'kusama',
      amountSrc: '1000000',
      depositInformation: { urn: 'did:bloque:account:virtual:dest' },
      args: {
        bankCode: '1',
        userType: 0,
        customerEmail: 'user@example.com',
        userLegalIdType: 'CC',
        userLegalId: '123',
        // E.164 — the route that builds this (topup/index.tsx) always
        // prepends +57 before it reaches this repository; this fixture
        // documents that shape rather than testing the conversion itself
        // (that's a pure function local to the route, not exercised here).
        customerData: { fullName: 'User', phoneNumber: '+573000000000' },
        redirectUrl: 'https://wallet.example.com/topup',
      },
    });

    expect(result.order).toEqual(baseOrder());
  });
});

describe('bloquePaymentsRepository.listPseBanks', () => {
  test('unwraps the { banks } envelope', async () => {
    const banks = await bloquePaymentsRepository.listPseBanks();
    expect(banks).toEqual([{ code: '1', name: 'Bancolombia' }]);
  });
});
