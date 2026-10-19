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

/** Origins registered the passkey but has not recorded it for approvals yet. */
const ALIAS_NOT_RECORDED = 'E_PASSKEY_ALIAS_NOT_RECORDED';

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
    rp: { id: options.rpId, name: options.rpId },
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

/**
 * Challenge → browser ceremony → registration. Must start from a user
 * gesture: browsers refuse `create` without user activation.
 *
 * A registration that landed but was not recorded for approvals is sent
 * again unchanged, once; Origins treats a repeat as the same registration.
 */
export async function registerPasskey(
  repository: PasskeyRepository,
  create: CreateCredential,
): Promise<void> {
  const options = await repository.challenge();

  let credential: Credential | null;
  try {
    credential = await create({
      publicKey: toPublicKeyCreationOptions(options),
    });
  } catch (error) {
    throw fromCreateError(error);
  }
  const registration = toRegistration(credential);

  try {
    await repository.register(registration);
  } catch (error) {
    if (
      error instanceof PasskeyRegistrationError &&
      error.code === ALIAS_NOT_RECORDED
    ) {
      await repository.register(registration);
      return;
    }
    throw error;
  }
}
