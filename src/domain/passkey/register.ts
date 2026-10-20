import type { PasskeyRepository } from './ports';
import {
  type PasskeyCreationOptions,
  type PasskeyRegistration,
  PasskeyRegistrationError,
} from './types';

/** `navigator.credentials.create`, injected so the flow runs without a browser. */
export type CreateCredential = (
  options: CredentialCreationOptions,
) => Promise<Credential | null>;

/** Delays before each automatic resend of a retryable registration. */
const RESEND_DELAYS_MS = [1_000, 3_000];

/** Shown by the browser while it creates the passkey. */
const RP_NAME = 'Bloque';

export function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

export function bytesToBase64Url(value: ArrayBuffer): string {
  let binary = '';
  for (const byte of new Uint8Array(value)) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function toPublicKeyCreationOptions(
  options: PasskeyCreationOptions,
): PublicKeyCredentialCreationOptions {
  return {
    challenge: base64UrlToBytes(options.challenge),
    rp: { id: options.rpId, name: RP_NAME },
    user: {
      id: base64UrlToBytes(options.user.id),
      name: options.user.name,
      displayName: options.user.displayName,
    },
    pubKeyCredParams: options.pubKeyCredParams,
    authenticatorSelection: options.authenticatorSelection,
    timeout: options.timeout,
    attestation: options.attestation,
  };
}

function isAttestationResponse(
  response: unknown,
): response is AuthenticatorAttestationResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'clientDataJSON' in response &&
    'attestationObject' in response
  );
}

export function toRegistration(
  credential: Credential | null,
): PasskeyRegistration {
  const response =
    credential && 'response' in credential
      ? (credential as PublicKeyCredential).response
      : undefined;
  if (!isAttestationResponse(response)) {
    throw new PasskeyRegistrationError('cancelled');
  }
  return {
    clientDataJson: bytesToBase64Url(response.clientDataJSON),
    attestationObject: bytesToBase64Url(response.attestationObject),
  };
}

/** Maps a `navigator.credentials.create` rejection to what the user is told. */
export function fromCreateError(error: unknown): PasskeyRegistrationError {
  const name =
    typeof error === 'object' && error !== null && 'name' in error
      ? error.name
      : undefined;
  switch (name) {
    // Dismissed, timed out, or no user activation: all look the same.
    case 'NotAllowedError':
    case 'AbortError':
      return new PasskeyRegistrationError('cancelled');
    case 'NotSupportedError':
      return new PasskeyRegistrationError('unsupported_browser');
    case 'InvalidStateError':
      return new PasskeyRegistrationError('rejected');
    default:
      return new PasskeyRegistrationError('unavailable');
  }
}

async function createRegistration(
  repository: PasskeyRepository,
  create: CreateCredential,
): Promise<{ registration: PasskeyRegistration; expiresAt: number }> {
  const options = await repository.challenge();

  let credential: Credential | null;
  try {
    credential = await create({
      publicKey: toPublicKeyCreationOptions(options),
    });
  } catch (error) {
    throw fromCreateError(error);
  }
  return {
    registration: toRegistration(credential),
    expiresAt: options.expiresAt,
  };
}

const isRetryable = (error: unknown) =>
  error instanceof PasskeyRegistrationError && error.retryable;

/** Registers a passkey; rejects with {@link PasskeyRegistrationError}. */
export type PasskeyRegistrar = () => Promise<void>;

/**
 * Challenge → browser ceremony → registration. Each call must start from a
 * user gesture: browsers refuse `create` without user activation.
 *
 * Origins documents a registration that failed with a retryable error as
 * safe to send again unchanged. So a retryable failure is resent as is, a
 * couple of times with a short backoff, and the registration is kept for the
 * next call while its challenge is still valid: retrying never makes the user
 * create a second passkey for a registration that may already have landed.
 * A rate-limited one is kept too, but not resent until the user retries.
 */
export function createPasskeyRegistrar(
  repository: PasskeyRepository,
  create: CreateCredential,
  {
    now = Date.now,
    wait = (ms: number) => new Promise<void>((done) => setTimeout(done, ms)),
  }: { now?: () => number; wait?: (ms: number) => Promise<void> } = {},
): PasskeyRegistrar {
  let pending: { registration: PasskeyRegistration; expiresAt: number } | null =
    null;

  const submit = async (registration: PasskeyRegistration) => {
    for (const delay of [...RESEND_DELAYS_MS, undefined]) {
      try {
        await repository.register(registration);
        return;
      } catch (error) {
        if (delay === undefined || !isRetryable(error)) throw error;
        await wait(delay);
      }
    }
  };

  return async () => {
    if (!pending || now() >= pending.expiresAt) {
      pending = null;
      pending = await createRegistration(repository, create);
    }
    try {
      await submit(pending.registration);
      pending = null;
    } catch (error) {
      const keep =
        isRetryable(error) ||
        (error instanceof PasskeyRegistrationError &&
          error.reason === 'rate_limited');
      if (!keep) pending = null;
      throw error;
    }
  };
}
