import type { Verification } from './types';

/**
 * The seam the rest of the app depends on for KYC/compliance data. Consumers
 * never import `bloque` directly for this domain — only an adapter
 * (src/infra/) implements this against the SDK. Plain function-signature
 * type, not a class — matches src/domain/accounts/ports.ts.
 */
export type ComplianceRepository = {
  getVerification(urn: string): Promise<Verification>;
  startVerification(urn: string): Promise<Verification>;
};
