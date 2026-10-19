/**
 * Domain layer for registering a passkey on the signed-in user's identity.
 *
 * No SDK or React imports here, ever. Adapters (src/infra/) translate the
 * Origins wire shapes into these.
 *
 * Registering again is how a person whose passkey is not registered for
 * operation approvals (`passkey_not_registered` on the approval page) fixes
 * it: the same registration also records the passkey for approvals.
 */

/** What `navigator.credentials.create` needs, as Origins returns it. */
export type PasskeyCreationOptions = {
  /** Base64url. Single use, bound to the caller's identity. */
  challenge: string;
  /** Epoch ms. */
  expiresAt: number;
  /** The passkey must be created for exactly this RP id. */
  rpId: string;
  user: {
    /** Base64url WebAuthn `user.id`. */
    id: string;
    name: string;
    displayName: string;
  };
  pubKeyCredParams: { type: 'public-key'; alg: number }[];
  authenticatorSelection: {
    residentKey?: ResidentKeyRequirement;
    userVerification?: UserVerificationRequirement;
  };
  timeout: number;
  attestation: AttestationConveyancePreference;
};

/** The raw WebAuthn registration Origins verifies, base64url. */
export type PasskeyRegistration = {
  clientDataJson: string;
  attestationObject: string;
};

/**
 * Why a registration did not complete, as the user should be told.
 *
 * - `cancelled`: the user dismissed the browser prompt, or it timed out.
 * - `unsupported_browser`: this browser cannot create passkeys.
 * - `rejected`: the registration was refused; start again.
 * - `not_usable`: registered but cannot approve operations; create a new one.
 * - `account_not_ready`: the account cannot take a passkey yet.
 * - `rate_limited`: too many attempts from this session.
 * - `session`: the session is not valid for this; sign in again.
 * - `unavailable`: a temporary failure; retrying may help.
 */
export type PasskeyFailureReason =
  | 'cancelled'
  | 'unsupported_browser'
  | 'rejected'
  | 'not_usable'
  | 'account_not_ready'
  | 'rate_limited'
  | 'session'
  | 'unavailable';

export class PasskeyRegistrationError extends Error {
  readonly reason: PasskeyFailureReason;
  /** The backend code, when there was one. Never shown to users. */
  readonly code?: string;

  constructor(reason: PasskeyFailureReason, code?: string) {
    super(code ?? reason);
    this.name = 'PasskeyRegistrationError';
    this.reason = reason;
    this.code = code;
  }
}
