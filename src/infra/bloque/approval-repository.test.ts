import { beforeEach, describe, expect, mock, test } from 'bun:test';
import {
  BloqueAPIError,
  BloqueApprovalExpiredError,
  BloqueApprovalInvalidError,
  BloqueApprovalPendingError,
} from '@bloque/sdk';
import {
  ApprovalFailedError,
  type PendingApproval,
} from '~/domain/approval/types';

const collectMock = mock((_pending: PendingApproval) =>
  Promise.resolve('approval-1'),
);
const transferMock = mock((_params: unknown, _options?: unknown) =>
  Promise.resolve({ queueId: 'queue-1', status: 'queued', message: 'ok' }),
);
const brebCreateMock = mock((_params: unknown, _options?: unknown) =>
  Promise.resolve({
    order: { id: 'order-1' },
    execution: undefined as unknown,
    requestId: 'req-1',
  }),
);
const cardActivateMock = mock((_urn: string, _options?: unknown) =>
  Promise.resolve({}),
);
const brebDeleteMock = mock((_urn: string, _options?: unknown) =>
  Promise.resolve({ data: { deleted: true }, error: null }),
);
const virtualDeleteMock = mock((_urn: string, _options?: unknown) =>
  Promise.resolve({}),
);

mock.module('~/lib/bloque', () => ({
  bloque: {
    approvals: { collect: collectMock },
    accounts: {
      transfer: transferMock,
      card: { activate: cardActivateMock },
      breb: { deleteKey: brebDeleteMock },
      virtual: { delete: virtualDeleteMock },
    },
    swap: { breb: { create: brebCreateMock } },
  },
}));

const { bloqueApprovalRepository } = await import('./approval-repository');

const PENDING: PendingApproval = {
  approvalToken: 'token-1',
  approvalUrl: 'https://id.dev-bloque.app/approve#token-1',
  expiresAt: Date.now() + 60_000,
};

const BREB_PARAMS = {
  rateSig: 'rate-sig-1',
  amountSrc: '1000000',
  depositInformation: {
    resolutionId: 'resolution-1',
    destinationKey: { keyValue: '3001234567' },
  },
  args: { sourceAccountUrn: 'did:bloque:account:breb:source' },
};

async function failureOf(run: () => Promise<unknown>) {
  try {
    await run();
  } catch (error) {
    return error;
  }
  throw new Error('expected the call to throw');
}

describe('bloqueApprovalRepository.collect', () => {
  beforeEach(() => collectMock.mockClear());

  test('returns the approval the person gave', async () => {
    expect(await bloqueApprovalRepository.collect(PENDING)).toBe('approval-1');
    expect(collectMock).toHaveBeenCalledWith(PENDING);
  });

  test('says not_approved when the person came back without approving', async () => {
    collectMock.mockImplementationOnce(() =>
      Promise.reject(new BloqueApprovalPendingError()),
    );
    const error = await failureOf(() =>
      bloqueApprovalRepository.collect(PENDING),
    );
    expect(error).toBeInstanceOf(ApprovalFailedError);
    expect((error as ApprovalFailedError).reason).toBe('not_approved');
  });

  test('says expired when the approval expired or was already collected', async () => {
    collectMock.mockImplementationOnce(() =>
      Promise.reject(
        new BloqueApprovalExpiredError('', { code: 'E_APPROVAL_EXPIRED' }),
      ),
    );
    const error = await failureOf(() =>
      bloqueApprovalRepository.collect(PENDING),
    );
    expect((error as ApprovalFailedError).reason).toBe('expired');
  });
});

describe('bloqueApprovalRepository.run', () => {
  beforeEach(() => {
    transferMock.mockClear();
    brebCreateMock.mockClear();
    cardActivateMock.mockClear();
    brebDeleteMock.mockClear();
    virtualDeleteMock.mockClear();
  });

  test('repeats a transfer once with the exact params and the approval', async () => {
    const input = {
      sourceUrn: 'did:bloque:account:virtual:source',
      destinationUrn: 'did:bloque:account:virtual:dest',
      amount: '1000000',
      asset: 'COPM/2' as const,
      metadata: { reference: 'bloque-friend-1', note: '' },
    };

    const outcome = await bloqueApprovalRepository.run(
      { kind: 'transfer', input },
      'approval-1',
    );

    expect(outcome).toEqual({ kind: 'done' });
    expect(transferMock).toHaveBeenCalledTimes(1);
    expect(transferMock).toHaveBeenCalledWith(input, {
      approval: 'approval-1',
    });
  });

  test('repeats a swap order and returns its outcome', async () => {
    const outcome = await bloqueApprovalRepository.run(
      { kind: 'breb-order', params: BREB_PARAMS },
      'approval-1',
    );

    expect(outcome).toEqual({
      kind: 'order',
      orderId: 'order-1',
      execution: { kind: 'none' },
    });
    expect(brebCreateMock).toHaveBeenCalledTimes(1);
    expect(brebCreateMock).toHaveBeenCalledWith(BREB_PARAMS, {
      approval: 'approval-1',
    });
  });

  test('repeats a card activation with the approval', async () => {
    await bloqueApprovalRepository.run(
      { kind: 'activate-card', urn: 'did:bloque:account:card:1' },
      'approval-1',
    );
    expect(cardActivateMock).toHaveBeenCalledWith('did:bloque:account:card:1', {
      approval: 'approval-1',
    });
  });

  test('repeats a BRE-B key deletion with the approval', async () => {
    await bloqueApprovalRepository.run(
      { kind: 'delete-breb-key', urn: 'did:bloque:account:breb:1' },
      'approval-1',
    );
    expect(brebDeleteMock).toHaveBeenCalledWith(
      { accountUrn: 'did:bloque:account:breb:1' },
      { approval: 'approval-1' },
    );
  });

  test('repeats a pocket deletion with the approval', async () => {
    await bloqueApprovalRepository.run(
      { kind: 'delete-pocket', urn: 'did:bloque:account:virtual:1' },
      'approval-1',
    );
    expect(virtualDeleteMock).toHaveBeenCalledWith(
      'did:bloque:account:virtual:1',
      { approval: 'approval-1' },
    );
  });

  test('says rate_expired when the rate expired while approving', async () => {
    brebCreateMock.mockImplementationOnce(() =>
      Promise.reject(
        new BloqueAPIError('E_RATE_EXPIRED', {
          status: 400,
          code: 'E_RATE_EXPIRED',
        }),
      ),
    );
    const error = await failureOf(() =>
      bloqueApprovalRepository.run(
        { kind: 'breb-order', params: BREB_PARAMS },
        'approval-1',
      ),
    );
    expect(error).toBeInstanceOf(ApprovalFailedError);
    expect((error as ApprovalFailedError).reason).toBe('rate_expired');
  });

  test('says passkey_not_registered when the approval is refused for it', async () => {
    transferMock.mockImplementationOnce(() =>
      Promise.reject(
        new BloqueApprovalInvalidError('', {
          status: 403,
          code: 'E_APPROVAL_INVALID',
          response: { extra_details: { reason: 'passkey_not_registered' } },
        }),
      ),
    );
    const error = await failureOf(() =>
      bloqueApprovalRepository.run(
        {
          kind: 'transfer',
          input: {
            sourceUrn: 'a',
            destinationUrn: 'b',
            amount: '1',
            asset: 'COPM/2',
          },
        },
        'approval-1',
      ),
    );
    expect((error as ApprovalFailedError).reason).toBe(
      'passkey_not_registered',
    );
  });

  test('throws any other failure as is', async () => {
    const original = new Error('network down');
    transferMock.mockImplementationOnce(() => Promise.reject(original));
    const error = await failureOf(() =>
      bloqueApprovalRepository.run(
        {
          kind: 'transfer',
          input: {
            sourceUrn: 'a',
            destinationUrn: 'b',
            amount: '1',
            asset: 'COPM/2',
          },
        },
        'approval-1',
      ),
    );
    expect(error).toBe(original);
  });
});
