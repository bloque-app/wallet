import type { ExecutionOutcome } from '../payments/types';
import type { ApprovalOperation, PendingApproval } from './types';

/** What an approved operation returned, as the wallet shows it. */
export type ApprovalOutcome =
  | { kind: 'order'; orderId: string; execution: ExecutionOutcome }
  | { kind: 'done' };

/**
 * The seam for operation approvals. Only an adapter (src/infra/) implements
 * it. Plain function-signature type, matching src/domain/passkey/ports.ts.
 */
export type ApprovalRepository = {
  /**
   * The approval the person gave on the identity app, once: it must be used
   * right away. Throws `ApprovalFailedError` with `not_approved` (they came
   * back without approving), `expired` or `unavailable`.
   */
  collect(pending: PendingApproval): Promise<string>;

  /**
   * Repeats the operation with the approval. Throws `ApprovalFailedError`
   * when the approval is refused or the swap rate expired meanwhile.
   */
  run(operation: ApprovalOperation, approval: string): Promise<ApprovalOutcome>;
};
