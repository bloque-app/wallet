import type { ExecutionHow } from '@bloque/sdk-swap';
import type { ExecutionOutcome } from './types';

/**
 * Turns a paused swap execution's `how` instructions into a domain-level
 * `ExecutionOutcome`. Replaces every duplicated `getExecutionRedirectUrl`
 * previously hand-rolled in topup/colombian-banks/pay-transfer/pay-transfer-qr.
 *
 * Note on narrowing: the SDK types `ExecutionHow` as
 * `ExecutionHowRedirect | ExecutionHowBrebDeposit`, but `ExecutionHowRedirect.type`
 * is declared as plain `string` (not the literal `'REDIRECT'`), so a bare
 * `how.type === 'BREB_DEPOSIT'` equality check does NOT exclude
 * `ExecutionHowRedirect` from TypeScript's narrowed "true" branch (a `string`
 * field is always compatible with any literal comparison). We narrow on the
 * structural presence of `keyValue` instead, which TypeScript can exclude
 * `ExecutionHowRedirect` from correctly, and only trust the `type` check as
 * a secondary, non-narrowing guard.
 */
export function resolveExecutionOutcome(
  how: ExecutionHow | undefined,
): ExecutionOutcome {
  if (!how) return { kind: 'none' };

  if (how.type === 'BREB_DEPOSIT' && 'keyValue' in how) {
    return {
      kind: 'breb-deposit',
      keyValue: how.keyValue,
      amount: how.amount,
      depositAccountUrn: how.depositAccountUrn,
      depositStatus: how.depositStatus ?? 'awaiting',
    };
  }

  if ('url' in how && typeof how.url === 'string') {
    return { kind: 'redirect', url: how.url };
  }

  return { kind: 'none' };
}
