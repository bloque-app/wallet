import type { PasskeyLink } from './types';

/**
 * The seam the rest of the app depends on for passkey registration. Only an
 * adapter (src/infra/) implements it. Plain function-signature type, matching
 * src/domain/tos/ports.ts.
 *
 * Takes no URN: the link is authorized by the caller's own session, and the
 * identity comes from it server-side, so a passkey can only ever be
 * registered for oneself.
 */
export type PasskeyRepository = {
  /**
   * A link to register a passkey in the identity app, which sends the person
   * back to `returnUrl` once registered. `returnUrl` must be an https URL on
   * an origin the wallet's origin allows. Throws
   * {@link PasskeyRegistrationError} when no link was created.
   */
  createLink(returnUrl: string): Promise<PasskeyLink>;
};
