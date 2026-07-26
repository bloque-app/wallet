import { describe, expect, test } from 'bun:test';
import type { RawMovementFields } from './movements';
import { toDomainMovement } from './movements';

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
