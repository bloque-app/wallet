import { describe, expect, test } from 'bun:test';
import type { ExecutionHow } from '@bloque/sdk-swap';
import { resolveExecutionOutcome } from './execution';

describe('resolveExecutionOutcome', () => {
  test('returns { kind: "none" } when how is undefined', () => {
    expect(resolveExecutionOutcome(undefined)).toEqual({ kind: 'none' });
  });

  test('maps a redirect how into a redirect outcome', () => {
    const how: ExecutionHow = {
      type: 'REDIRECT',
      url: 'https://pse.example.com/pay/123',
    };

    expect(resolveExecutionOutcome(how)).toEqual({
      kind: 'redirect',
      url: 'https://pse.example.com/pay/123',
    });
  });

  test('maps a BRE-B deposit how into a breb-deposit outcome — the concrete bug this fixes', () => {
    // Before `resolveExecutionOutcome`, every route hand-rolled a duck-typed
    // `'url' in how` check to find a redirect URL. A BREB_DEPOSIT `how` has
    // no `url` at all (it's redirect-less — the payer sends COP via their
    // bank's BRE-B app), so the old check silently returned `undefined` and
    // the UI had nothing to show the user for a paused BRE-B on-ramp.
    const how: ExecutionHow = {
      type: 'BREB_DEPOSIT',
      medium: 'breb',
      keyType: 'ALPHA',
      keyValue: '@bloque-onetime-key',
      amount: '5000000',
      currency: 'COP',
      reference: 'ref-123',
      depositAccountUrn: 'did:bloque:account:virtual:deposit-1',
      depositStatus: 'awaiting',
    };

    expect(resolveExecutionOutcome(how)).toEqual({
      kind: 'breb-deposit',
      keyValue: '@bloque-onetime-key',
      amount: '5000000',
      depositAccountUrn: 'did:bloque:account:virtual:deposit-1',
      depositStatus: 'awaiting',
    });
  });

  test('defaults depositStatus to "awaiting" when the BRE-B deposit how omits it', () => {
    const how: ExecutionHow = {
      type: 'BREB_DEPOSIT',
      medium: 'breb',
      keyType: 'ALPHA',
      keyValue: '@bloque-onetime-key',
      amount: '5000000',
      currency: 'COP',
      reference: 'ref-123',
      depositAccountUrn: 'did:bloque:account:virtual:deposit-1',
    };

    expect(resolveExecutionOutcome(how)).toEqual({
      kind: 'breb-deposit',
      keyValue: '@bloque-onetime-key',
      amount: '5000000',
      depositAccountUrn: 'did:bloque:account:virtual:deposit-1',
      depositStatus: 'awaiting',
    });
  });

  test('surfaces a "partial" deposit status untouched (underpayment top-up)', () => {
    const how: ExecutionHow = {
      type: 'BREB_DEPOSIT',
      medium: 'breb',
      keyType: 'ALPHA',
      keyValue: '@bloque-onetime-key',
      amount: '5000000',
      currency: 'COP',
      reference: 'ref-123',
      depositAccountUrn: 'did:bloque:account:virtual:deposit-1',
      depositStatus: 'partial',
      receivedAmount: '2000000',
      remainingAmount: '3000000',
    };

    expect(resolveExecutionOutcome(how)).toEqual({
      kind: 'breb-deposit',
      keyValue: '@bloque-onetime-key',
      amount: '5000000',
      depositAccountUrn: 'did:bloque:account:virtual:deposit-1',
      depositStatus: 'partial',
    });
  });

  test('returns { kind: "none" } for a how with neither a url nor keyValue', () => {
    const how = { type: 'SOMETHING_ELSE' } as unknown as ExecutionHow;

    expect(resolveExecutionOutcome(how)).toEqual({ kind: 'none' });
  });
});
