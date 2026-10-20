import type { PasskeyCreationOptions, PasskeyRegistration } from './types';

/**
 * The seam the rest of the app depends on for passkey registration. Only an
 * adapter (src/infra/) implements it. Plain function-signature type, matching
 * src/domain/tos/ports.ts.
 *
 * Takes no URN: both calls are authorized by the caller's own session, and
 * the identity comes from it server-side, so a passkey can only ever be
 * registered for oneself.
 */
export type PasskeyRepository = {
  /** A register challenge bound to the session's identity. */
  challenge(): Promise<PasskeyCreationOptions>;
  /**
   * Registers the passkey and records it for operation approvals. Throws
   * {@link PasskeyRegistrationError} when it was not.
   */
  register(registration: PasskeyRegistration): Promise<void>;
};
