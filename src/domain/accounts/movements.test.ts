import { describe, expect, test } from 'bun:test';
import type { Movement } from '~/lib/formatters';
import type { RawMovementFields } from './movements';
import {
  dedupeGlobalMovements,
  dropUnchargedFees,
  feeCounterpart,
  toDomainMovement,
} from './movements';

function raw(overrides: Partial<RawMovementFields>): RawMovementFields {
  return {
    asset: 'COPM/2',
    amount: '500000',
    status: 'confirmed',
    type: undefined,
    direction: 'in',
    railName: undefined,
    reference: 'ref-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    counterparty: undefined,
    ...overrides,
  };
}

describe('toDomainMovement', () => {
  test('a normal topup (deposit, incoming) maps to type=topup, status=completed', () => {
    const movement = toDomainMovement(
      raw({ type: 'deposit', status: 'confirmed', direction: 'in' }),
    );

    expect(movement).not.toBeNull();
    expect(movement?.type).toBe('topup');
    expect(movement?.status).toBe('completed');
    expect(movement?.direction).toBe('incoming');
    expect(movement?.amount).toBe(5000);
    expect(movement?.asset).toBe('COP');
  });

  test('a normal withdraw (pay-out, outgoing) maps to type=withdraw', () => {
    const movement = toDomainMovement(
      raw({
        type: 'pay-out',
        status: 'settled',
        direction: 'out',
        asset: 'DUSD/6',
        amount: '25000000',
      }),
    );

    expect(movement?.type).toBe('withdraw');
    expect(movement?.status).toBe('completed');
    expect(movement?.direction).toBe('outgoing');
    expect(movement?.asset).toBe('USD');
    expect(movement?.amount).toBe(25);
  });

  test('maps MXNB and BRLB movements to presentable currencies', () => {
    expect(
      toDomainMovement(raw({ asset: 'MXNB/2', amount: '12345' }))?.asset,
    ).toBe('MXN');
    expect(
      toDomainMovement(raw({ asset: 'BRLB/2', amount: '6789' }))?.asset,
    ).toBe('BRL');
  });

  test('a card payment recognized only via railName (no matching `type`) maps to type=card', () => {
    const movement = toDomainMovement(
      raw({
        type: 'purchase-unrelated-transfer', // contains 'transfer', but 'purchase' should win first
        railName: 'card-network',
        direction: 'out',
      }),
    );

    // 'purchase' is checked before 'transfer' in the shared heuristic, so
    // this should classify as card regardless of railName.
    expect(movement?.type).toBe('card');
  });

  test('a card payment recognized purely via railName (type has no useful substring)', () => {
    const movement = toDomainMovement(
      raw({
        type: 'misc-9182',
        railName: 'VisaCardRail',
        direction: 'out',
      }),
    );

    expect(movement?.type).toBe('card');
  });

  test('a convert (swap) maps to type=convert', () => {
    const movement = toDomainMovement(
      raw({ type: 'asset-swap', status: 'success', direction: 'out' }),
    );

    expect(movement?.type).toBe('convert');
    expect(movement?.status).toBe('completed');
  });

  test('a recognized internal transfer maps to type=send', () => {
    const movement = toDomainMovement(
      raw({ type: 'transfer', direction: 'out' }),
    );

    expect(movement?.type).toBe('send');
  });

  test('a pending status (queued) maps to status=pending', () => {
    const movement = toDomainMovement(raw({ status: 'queued' }));
    expect(movement?.status).toBe('pending');
  });

  test('an SDK "cancelled" status degrades to failed, not a false "completed"', () => {
    const movement = toDomainMovement(raw({ status: 'cancelled' }));
    expect(movement?.status).toBe('failed');
  });

  test('an SDK "ignored" status degrades to failed, not a false "completed"', () => {
    const movement = toDomainMovement(raw({ status: 'ignored' }));
    expect(movement?.status).toBe('failed');
  });

  test(
    'the "doesn\'t match any substring" fallback: an outbound bank cash-out ' +
      'whose type/railName carry no recognizable keyword degrades to ' +
      "'withdraw' (not the old buggy 'send' default), since unrecognized " +
      'outbound movements are far more likely an external bank rail than a ' +
      'P2P transfer',
    () => {
      const movement = toDomainMovement(
        raw({
          type: 'bank-rail-code-9931',
          railName: 'unknown-rail',
          direction: 'out',
        }),
      );

      expect(movement?.type).toBe('withdraw');
    },
  );

  test('the same unrecognized-fallback case but inbound degrades to "topup"', () => {
    const movement = toDomainMovement(
      raw({
        type: 'bank-rail-code-9931',
        railName: 'unknown-rail',
        direction: 'in',
      }),
    );

    expect(movement?.type).toBe('topup');
  });

  test('an unsupported/unknown asset returns null (dropped, not mis-rendered)', () => {
    const movement = toDomainMovement(raw({ asset: 'XYZ/8' }));
    expect(movement).toBeNull();
  });

  test('counterparty and reference/id pass through untouched', () => {
    const movement = toDomainMovement(
      raw({ counterparty: 'urn:some:account', reference: 'ref-abc' }),
    );

    expect(movement?.counterparty).toBe('urn:some:account');
    expect(movement?.reference).toBe('ref-abc');
    expect(movement?.id).toBe('ref-abc-2026-01-01T00:00:00.000Z-500000');
  });

  test('a missing `type` field (undefined) still classifies sensibly by direction', () => {
    const incoming = toDomainMovement(
      raw({ type: undefined, direction: 'in' }),
    );
    const outgoing = toDomainMovement(
      raw({ type: undefined, direction: 'out' }),
    );

    expect(incoming?.type).toBe('topup');
    expect(outgoing?.type).toBe('withdraw');
  });

  describe('the details.type fallback (global feed only — GlobalTransaction.type is optional)', () => {
    test('falls back to details.type when the top-level type is missing', () => {
      const movement = toDomainMovement(
        raw({
          type: undefined,
          direction: 'out',
          details: { type: 'cash-out' },
        }),
      );

      // Without the fallback this would silently degrade to the
      // direction-based default ('withdraw', coincidentally the same here —
      // the next case makes the regression actually observable).
      expect(movement?.type).toBe('withdraw');
    });

    test('a details.type fallback that would NOT match the direction default proves the fallback is real', () => {
      const movement = toDomainMovement(
        raw({
          type: undefined,
          direction: 'out',
          details: { type: 'convert' },
        }),
      );

      // The direction-based default for an outbound movement is 'withdraw',
      // not 'convert' — this only passes if details.type was actually read.
      expect(movement?.type).toBe('convert');
    });

    test('the top-level type wins when both are present', () => {
      const movement = toDomainMovement(
        raw({ type: 'deposit', details: { type: 'convert' } }),
      );

      expect(movement?.type).toBe('topup');
    });

    test('a non-string details.type is ignored, not thrown on', () => {
      const movement = toDomainMovement(
        raw({
          type: undefined,
          direction: 'in',
          details: { type: 12345 },
        }),
      );

      expect(movement?.type).toBe('topup');
    });
  });
});

describe('dedupeGlobalMovements', () => {
  function movement(
    reference: string,
    overrides: Partial<Movement> = {},
  ): Movement {
    return {
      id: `${reference}-id`,
      type: 'topup' as const,
      asset: 'COP' as const,
      amount: 94.65,
      status: 'completed' as const,
      createdAt: '2026-07-26T16:51:00.000Z',
      reference,
      counterparty: undefined,
      direction: 'incoming' as const,
      ...overrides,
    };
  }

  test('collapses N rows sharing a reference (one ledger with N linked accounts) to one', () => {
    const movements = [
      movement('ref-1'),
      movement('ref-1'),
      movement('ref-1'),
      movement('ref-1'),
      movement('ref-1'),
    ];

    const result = dedupeGlobalMovements(movements);

    expect(result).toHaveLength(1);
    expect(result[0]?.reference).toBe('ref-1');
  });

  test('keeps the first occurrence and preserves the original order', () => {
    const first = movement('ref-1', { amount: 94.65 });
    const duplicate = movement('ref-1', { amount: 999 });
    const second = movement('ref-2', { amount: 99.66 });

    const result = dedupeGlobalMovements([first, duplicate, second]);

    expect(result.map((m) => m.reference)).toEqual(['ref-1', 'ref-2']);
    expect(result[0]?.amount).toBe(94.65);
  });

  test('two genuinely distinct events, each duplicated across the same 5-member ledger, stay as two', () => {
    const eventA = Array.from({ length: 5 }, () => movement('ref-topup-1'));
    const eventB = Array.from({ length: 5 }, () =>
      movement('ref-topup-2', { amount: 99.66 }),
    );

    const result = dedupeGlobalMovements([...eventA, ...eventB]);

    expect(result).toHaveLength(2);
    expect(result.map((m) => m.reference)).toEqual([
      'ref-topup-1',
      'ref-topup-2',
    ]);
  });

  test('an empty list stays empty', () => {
    expect(dedupeGlobalMovements([])).toEqual([]);
  });
});

describe('toDomainMovement — order fee', () => {
  test('maps fee to human units in its own asset, and keeps orderSig', () => {
    const movement = toDomainMovement(
      raw({
        asset: 'DUSD/6',
        amount: '10000000',
        fee: { amount: '50100', asset: 'COPM/2' },
        orderSig: 'sig-1',
      }),
    );

    expect(movement?.fee).toEqual({ amount: 501, asset: 'COP' });
    expect(movement?.orderSig).toBe('sig-1');
  });

  test('no fee or orderSig when the API did not record them', () => {
    const movement = toDomainMovement(raw({}));

    expect(movement).not.toHaveProperty('fee');
    expect(movement).not.toHaveProperty('orderSig');
  });

  test('drops a fee in an asset the app does not render', () => {
    const movement = toDomainMovement(
      raw({ fee: { amount: '1', asset: 'XYZ/2' } }),
    );

    expect(movement).not.toHaveProperty('fee');
  });

  test('a failed direction is a failed outgoing movement', () => {
    const movement = toDomainMovement(
      raw({ direction: 'failed', status: 'pending' }),
    );

    expect(movement?.status).toBe('failed');
    expect(movement?.direction).toBe('outgoing');
  });
});

describe('dropUnchargedFees', () => {
  const FEE = { amount: 501, asset: 'COP' as const };

  function movement(
    reference: string,
    overrides: Partial<Movement> = {},
  ): Movement {
    return {
      id: `${reference}-id`,
      type: 'withdraw',
      asset: 'COP',
      amount: 50_000,
      status: 'completed',
      createdAt: '2026-11-05T00:00:00.000Z',
      reference,
      direction: 'outgoing',
      ...overrides,
    };
  }

  test('every movement of a charged order shows its fee', () => {
    const result = dropUnchargedFees([
      movement('out', { orderSig: 'sig-1', fee: FEE }),
      movement('in', { orderSig: 'sig-1', fee: FEE, direction: 'incoming' }),
    ]);

    expect(result[0]?.fee).toEqual(FEE);
    expect(result[1]?.fee).toEqual(FEE);
  });

  test('keeps the fee of a pending order', () => {
    const result = dropUnchargedFees([
      movement('a', { orderSig: 'sig-1', fee: FEE, status: 'pending' }),
    ]);

    expect(result[0]?.fee).toEqual(FEE);
  });

  test('drops the fee on a failed movement', () => {
    const result = dropUnchargedFees([
      movement('a', { orderSig: 'sig-1', fee: FEE, status: 'failed' }),
    ]);

    expect(result[0]).not.toHaveProperty('fee');
  });

  test('drops the fee of a refunded order', () => {
    const result = dropUnchargedFees([
      movement('refund', { orderSig: 'sig-1', direction: 'incoming' }),
      movement('a', { orderSig: 'sig-1', fee: FEE }),
    ]);

    expect(result.some((m) => m.fee)).toBe(false);
  });

  test('keeps a fee recorded without an order', () => {
    const result = dropUnchargedFees([movement('a', { fee: FEE })]);

    expect(result[0]?.fee).toEqual(FEE);
  });

  test('a refund outside the list cannot drop the fee (direction-filtered views)', () => {
    const result = dropUnchargedFees([
      movement('a', { orderSig: 'sig-1', fee: FEE }),
    ]);

    expect(result[0]?.fee).toEqual(FEE);
  });

  test('a refund only affects its own order', () => {
    const result = dropUnchargedFees([
      movement('a', { orderSig: 'sig-1', fee: FEE }),
      movement('b', { orderSig: 'sig-2', fee: FEE }),
      movement('c', { orderSig: 'sig-2' }),
    ]);

    expect(result[0]?.fee).toEqual(FEE);
    expect(result[1]).not.toHaveProperty('fee');
  });
});

describe('feeCounterpart', () => {
  const SENT: Movement = {
    id: 'm-1',
    type: 'withdraw',
    asset: 'COP',
    amount: 1000,
    status: 'completed',
    createdAt: '2026-11-10T17:47:46.307Z',
    reference: 'ref-1',
    direction: 'outgoing',
    fee: { amount: 501, asset: 'COP' },
  };

  test('outgoing: the recipient receives the amount minus the fee', () => {
    expect(feeCounterpart(SENT)).toEqual({ kind: 'received', amount: 499 });
  });

  test('incoming: the original amount is the net amount plus the fee', () => {
    expect(
      feeCounterpart({
        ...SENT,
        type: 'topup',
        amount: 499,
        direction: 'incoming',
      }),
    ).toEqual({ kind: 'original', amount: 1000 });
  });

  test('nothing without a fee', () => {
    const { fee: _fee, ...noFee } = SENT;
    expect(feeCounterpart(noFee)).toBeUndefined();
  });

  test('not across assets', () => {
    expect(
      feeCounterpart({ ...SENT, asset: 'USD', amount: 10 }),
    ).toBeUndefined();
  });
});
