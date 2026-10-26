/**
 * Domain layer for registering a passkey on the signed-in user's identity.
 *
 * No SDK or React imports here, ever. Adapters (src/infra/) translate the
 * Origins wire shapes into these.
 *
 * Registering again is how a person whose passkey is not registered for
 * operation approvals (`passkey_not_registered` on the approval page) fixes
 * it. The wallet does not run the WebAuthn ceremony itself: passkeys must be
 * created under the relying party of Bloque's identity app (id.bloque.sh),
 * which the wallet's host is not part of. So the wallet asks Origins for a
 * registration link and sends the person there; the app sends them back.
 */

/** A one-time link to the identity app's passkey registration page. */
export type PasskeyLink = {
  /** Absolute https URL. Carries a short-lived token in its fragment. */
  url: string;
  /** How long the link stays valid, as Origins says it (e.g. `15m`). */
  expiresIn: string;
};

/**
 * Why a link could not be created, as the user should be told.
 *
 * - `rate_limited`: too many attempts from this session.
 * - `session`: the session is not valid for this; sign in again.
 * - `unavailable`: a temporary failure; retrying may help.
 * - `blocked`: a failure retrying will not fix; contact support.
 */
export type PasskeyFailureReason =
  | 'rate_limited'
  | 'session'
  | 'unavailable'
  | 'blocked';

export class PasskeyRegistrationError extends Error {
  readonly reason: PasskeyFailureReason;
  /** The backend code, when there was one. Never shown to users. */
  readonly code?: string;

  constructor(reason: PasskeyFailureReason, options: { code?: string } = {}) {
    super(options.code ?? reason);
    this.name = 'PasskeyRegistrationError';
    this.reason = reason;
    this.code = options.code;
  }
}
