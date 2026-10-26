import {
  BloqueAPIError,
  BloqueAuthenticationError,
  BloquePasskeyRegistrationUnavailableError,
  BloqueRateLimitError,
  BloqueReturnUrlNotAllowedError,
  BloqueValidationError,
} from '@bloque/sdk';
import type { PasskeyRepository } from '~/domain/passkey/ports';
import {
  type PasskeyLink,
  PasskeyRegistrationError,
} from '~/domain/passkey/types';
import { initBloque } from '~/lib/bloque';

/**
 * Adapter for passkey registration links, over the SDK's
 * `identity.passkeys.createLink`. The link opens the identity app, which runs
 * the WebAuthn ceremony under its own relying party and sends the person back
 * to `returnUrl`. Only the person's own session can create one.
 */

function failureOf(error: unknown): PasskeyRegistrationError {
  const code = error instanceof BloqueAPIError ? error.code : undefined;
  if (error instanceof BloqueRateLimitError) {
    return new PasskeyRegistrationError('rate_limited', { code });
  }
  if (error instanceof BloqueAuthenticationError) {
    return new PasskeyRegistrationError('session', { code });
  }
  // A `returnUrl` the wallet's origin does not allow: retrying won't fix it.
  if (
    error instanceof BloqueReturnUrlNotAllowedError ||
    error instanceof BloqueValidationError
  ) {
    return new PasskeyRegistrationError('blocked', { code });
  }
  if (
    error instanceof BloquePasskeyRegistrationUnavailableError &&
    !error.retryable
  ) {
    return new PasskeyRegistrationError('blocked', { code });
  }
  return new PasskeyRegistrationError('unavailable', { code });
}

async function createLink(returnUrl: string): Promise<PasskeyLink> {
  try {
    const bloque = await initBloque();
    return await bloque.identity.passkeys.createLink({ returnUrl });
  } catch (error) {
    throw failureOf(error);
  }
}

export const bloquePasskeyRepository: PasskeyRepository = {
  createLink,
};
