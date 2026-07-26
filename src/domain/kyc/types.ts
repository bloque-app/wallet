/**
 * Domain layer for the KYC/Compliance bounded context.
 *
 * No SDK or React imports here, ever — this is what the app's own model of
 * "has this person been identity-verified" looks like, independent of how
 * `@bloque/sdk-compliance` happens to shape its wire responses today.
 * Adapters (src/infra/) are the only place SDK shapes get translated into
 * these types. Mirrors src/domain/accounts/types.ts.
 */

/**
 * The one real verification status. `awaiting_verification` corresponds
 * 1:1 to the SDK's wire `'awaiting_compliance_verification'`; `not_started`
 * has no wire equivalent — it's what a 404 from `getVerification` means
 * (see src/infra/bloque/compliance-repository.ts and the callers that
 * interpret that 404).
 */
export type VerificationStatus =
  | 'not_started'
  | 'awaiting_verification'
  | 'approved'
  | 'rejected';

export type Verification = {
  status: VerificationStatus;
  url?: string;
  completedAt?: string;
  documentsStatus?: string;
};
