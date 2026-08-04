import type { TosGate, TosStatus } from './types';

/**
 * The seam the rest of the app depends on for Terms of Service state.
 * Consumers never call the API directly for this domain — only an adapter
 * (src/infra/) implements it. Plain function-signature type, matching
 * src/domain/kyc/ports.ts.
 */
export type TosRepository = {
  /** Whether this identity still owes an acceptance. */
  getStatus(urn: string): Promise<TosStatus>;
  /**
   * Mints a hosted gate URL to send the user to.
   *
   * Takes no URN: the identity comes from the caller's own session
   * server-side, so this can only ever be started for oneself. `returnUrl`
   * must be on the backend's allowlist or the call is rejected.
   */
  start(returnUrl: string): Promise<TosGate>;
};
