import type { ComplianceRepository } from '~/domain/kyc/ports';
import type { Verification, VerificationStatus } from '~/domain/kyc/types';
import { initBloque } from '~/lib/bloque';

type WireStatus = 'awaiting_compliance_verification' | 'approved' | 'rejected';

type WireVerification = {
  status: WireStatus;
  url?: string;
  completedAt?: string | null;
  documentsStatus?: string;
};

/**
 * The one place that translates the SDK's real wire status into the app's
 * domain status. This is the fix for the bug where `auth-context.tsx` used
 * to derive `kycStatus` from a truthy `metadata.kyc_verified` boolean and
 * could never distinguish "rejected" from "never started" — every wire
 * value is mapped explicitly here, no boolean shortcuts.
 */
function mapStatus(status: WireStatus): VerificationStatus {
  switch (status) {
    case 'approved':
      return 'approved';
    case 'rejected':
      return 'rejected';
    case 'awaiting_compliance_verification':
      return 'awaiting_verification';
    default:
      // Defensive: an unrecognized future wire value shouldn't crash the
      // app — treat it as still-pending rather than silently "approved".
      return 'awaiting_verification';
  }
}

function mapVerification(response: WireVerification): Verification {
  return {
    status: mapStatus(response.status),
    url: response.url,
    completedAt: response.completedAt ?? undefined,
    documentsStatus: response.documentsStatus,
  };
}

/**
 * `initBloque()` rather than the `bloque` proxy, and it fixes a live bug.
 *
 * The proxy throws unless the SDK is already initialized, and initialization
 * is kicked off by an effect in `index.tsx` that only runs once
 * `auth.isAuthenticated` is true. But `deriveKycStatus` is called from
 * `setAuthenticatedUser`, which runs *before* that flips — so on every sign-in
 * and every page load this threw "Bloque SDK is not initialized",
 * `deriveKycStatus` swallowed it and returned `undefined`, and the KYC status
 * was never actually resolved from the wire.
 *
 * That is what made the verification banner look fixed: `shouldShowKycBanner`
 * correctly hides on `undefined`, and `undefined` was all it ever got. The
 * banner now shows again for users who genuinely are unverified.
 *
 * `initBloque()` caches its promise, so awaiting it is idempotent and simply
 * orders this call after the handshake it depends on.
 */
async function getVerification(urn: string): Promise<Verification> {
  const bloque = await initBloque();
  const result = await bloque.compliance.kyc.getVerification({ urn });
  return mapVerification(result);
}

async function startVerification(urn: string): Promise<Verification> {
  // Note: the SDK hardcodes `type`/`accompliceType` to 'kyc'/'person' itself
  // and always returns `completedAt: null` regardless of the real response —
  // callers needing a trustworthy `completedAt` should use `getVerification`.
  const bloque = await initBloque();
  const result = await bloque.compliance.kyc.startVerification({ urn });
  return mapVerification(result);
}

export const bloqueComplianceRepository: ComplianceRepository = {
  getVerification,
  startVerification,
};
