import type { SupportedCardAsset } from '@bloque/sdk-accounts';
import type {
  CreateBankTransferOrderParams,
  CreateBrebOrderParams,
  CreateExternalUsBankOrderParams,
  CreatePixOrderParams,
  CreateRtpOrderParams,
  CreateSpeiOrderParams,
} from '@bloque/sdk-swap';
import type { Asset } from '~/lib/formatters';
import type { CreateCardInput, TransferInput } from '../accounts/ports';

/**
 * Domain layer for operation approvals: operations that move a person's
 * money (or re-enable spending) answer 428 until the person approves them
 * with their passkey on Bloque's identity app.
 *
 * The wallet sends the person there with a full-page redirect and the app
 * sends them back to `/approval`. The operation is saved before leaving, and
 * repeated once with the approval when they come back.
 */

/**
 * An approval waiting for the person, as the SDK's
 * `BloqueApprovalRequiredError.toPendingApproval()` gives it. Plain JSON.
 * `approvalToken` and `approvalUrl` are secrets: never in a URL or a log.
 */
export type PendingApproval = {
  approvalToken: string;
  approvalUrl?: string;
  /** Epoch milliseconds. */
  expiresAt: number;
  summary?: { operation: string; fields: Record<string, unknown> };
};

/**
 * The approval to repeat an operation with, from `approvals.collect`. Unset
 * on the first call.
 */
export type ApprovalOptions = { approval?: string };

/** Thrown by an adapter when an operation needs the person's approval. */
export class ApprovalRequiredError extends Error {
  /**
   * Non-enumerable, as in the SDK's error: it carries the approval token, so
   * it is left out when the error is logged, spread or serialized.
   */
  declare readonly pending: PendingApproval;

  constructor(pending: PendingApproval) {
    super('E_APPROVAL_REQUIRED');
    this.name = 'ApprovalRequiredError';
    Object.defineProperty(this, 'pending', {
      value: pending,
      enumerable: false,
    });
  }
}

/**
 * Why an approved operation did not run, as the person should be told.
 *
 * - `not_approved`: they came back without approving; it can still be
 *   approved until it expires.
 * - `expired`: the approval expired or was already used.
 * - `passkey_not_registered`: their passkey must be registered again.
 * - `rejected`: the passkey signature was refused, or it belongs to someone
 *   else.
 * - `mismatch`: the repeated request differs from what was approved.
 * - `rate_expired`: the swap rate expired while they were approving.
 * - `unavailable`: approvals cannot be checked right now; retrying may help.
 */
export type ApprovalFailureReason =
  | 'not_approved'
  | 'expired'
  | 'passkey_not_registered'
  | 'rejected'
  | 'mismatch'
  | 'rate_expired'
  | 'unavailable';

export class ApprovalFailedError extends Error {
  readonly reason: ApprovalFailureReason;
  /** The backend code, when there was one. Never shown to users. */
  readonly code?: string;

  constructor(reason: ApprovalFailureReason, options: { code?: string } = {}) {
    super(options.code ?? reason);
    this.name = 'ApprovalFailedError';
    this.reason = reason;
    this.code = options.code;
  }
}

/**
 * An operation that may need an approval, with the exact params it was
 * first called with: the repeated request must be identical.
 */
export type ApprovalOperation =
  | { kind: 'transfer'; input: TransferInput }
  | { kind: 'bank-transfer-order'; params: CreateBankTransferOrderParams }
  | { kind: 'breb-order'; params: CreateBrebOrderParams }
  | { kind: 'rtp-order'; params: CreateRtpOrderParams }
  | { kind: 'external-us-bank-order'; params: CreateExternalUsBankOrderParams }
  | { kind: 'spei-order'; params: CreateSpeiOrderParams }
  | { kind: 'pix-order'; params: CreatePixOrderParams }
  | { kind: 'create-card'; input: CreateCardInput }
  | { kind: 'activate-card'; urn: string }
  | { kind: 'delete-breb-key'; urn: string }
  | { kind: 'card-preferred-asset'; urn: string; asset: SupportedCardAsset };

export type ApprovalOperationKind = ApprovalOperation['kind'];

/** What the wallet shows once the operation ran. */
export type ApprovalDisplay = {
  /** Major units, as the flow showed it. */
  amount?: number;
  asset?: Asset;
};

/** Saved before the redirect, read back on `/approval`. */
export type SavedApproval = {
  operation: ApprovalOperation;
  pending: PendingApproval;
  /** In-app path to go back to when done. */
  returnTo: string;
  display?: ApprovalDisplay;
  /**
   * Set once the approval was collected and the operation is being repeated.
   * Found on a later load, the outcome is unknown: it may have run.
   */
  replayStartedAt?: number;
};
