import {
  BloqueApprovalExpiredError,
  BloqueApprovalInvalidError,
  BloqueApprovalPendingError,
  BloqueApprovalRequiredError,
  BloqueApprovalUnavailableError,
} from '@bloque/sdk';
import {
  ApprovalFailedError,
  type ApprovalOptions,
  ApprovalRequiredError,
} from '~/domain/approval/types';

/** Where the identity app sends the person back after approving. */
export const APPROVAL_RETURN_PATH = '/approval';

/**
 * The absolute return URL, or none off https (local dev): Origins only
 * accepts https return URLs on an origin the wallet's origin allows, and
 * refuses the whole operation otherwise.
 */
function approvalReturnUrl(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  if (window.location.protocol !== 'https:') return undefined;
  return `${window.location.origin}${APPROVAL_RETURN_PATH}`;
}

/**
 * The SDK's approval options for a gated call: the approval when repeating
 * it, the return URL on the first call.
 */
export function sdkApprovalOptions(options?: ApprovalOptions): {
  approval?: string;
  approvalReturnUrl?: string;
} {
  if (options?.approval) return { approval: options.approval };
  const returnUrl = approvalReturnUrl();
  return returnUrl ? { approvalReturnUrl: returnUrl } : {};
}

/** The SDK's approval errors as domain errors; anything else as is. */
export function toApprovalError(error: unknown): unknown {
  if (error instanceof BloqueApprovalRequiredError) {
    try {
      return new ApprovalRequiredError(error.toPendingApproval());
    } catch {
      // No approval token in the 428: nothing to approve.
      return error;
    }
  }
  if (error instanceof BloqueApprovalPendingError) {
    return new ApprovalFailedError('not_approved', { code: error.code });
  }
  if (error instanceof BloqueApprovalExpiredError) {
    return new ApprovalFailedError('expired', { code: error.code });
  }
  if (error instanceof BloqueApprovalInvalidError) {
    switch (error.reason) {
      case 'passkey_not_registered':
        return new ApprovalFailedError('passkey_not_registered', {
          code: error.code,
        });
      case 'operation_mismatch':
      case 'args_not_approved':
        return new ApprovalFailedError('mismatch', { code: error.code });
      default:
        return new ApprovalFailedError('rejected', { code: error.code });
    }
  }
  if (error instanceof BloqueApprovalUnavailableError) {
    return new ApprovalFailedError('unavailable', { code: error.code });
  }
  return error;
}

/** Runs a gated SDK call, throwing its approval errors as domain errors. */
export async function withApprovalErrors<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    throw toApprovalError(error);
  }
}
