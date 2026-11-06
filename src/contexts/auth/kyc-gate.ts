import type { VerificationStatus } from '~/domain/kyc/types';

export type KycGateState =
  | 'allowed'
  | 'unconfirmed'
  | 'not_started'
  | 'in_review'
  | 'rejected';

/**
 * What a money-moving flow shows for the user's KYC status.
 *
 * Only `approved` lets the flow render. `undefined` means the status could not
 * be confirmed right now (see `deriveKycStatus`), so it gets its own state with
 * a retry instead of telling a possibly-verified user to verify.
 */
export function kycGateState(
  kycStatus: VerificationStatus | undefined,
): KycGateState {
  switch (kycStatus) {
    case 'approved':
      return 'allowed';
    case undefined:
      return 'unconfirmed';
    case 'awaiting_verification':
      return 'in_review';
    case 'rejected':
      return 'rejected';
    case 'not_started':
      return 'not_started';
  }
}
