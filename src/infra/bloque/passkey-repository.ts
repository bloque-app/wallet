import type { PasskeyRepository } from '~/domain/passkey/ports';
import {
  type PasskeyCreationOptions,
  type PasskeyFailureReason,
  type PasskeyRegistration,
  PasskeyRegistrationError,
} from '~/domain/passkey/types';
import { apiFetch } from '~/lib/api-fetch';

/**
 * Adapter for passkey registration, over Origins' session-only routes:
 *
 *   - `POST /api/origins/passkeys/challenge` — register challenge + options.
 *   - `POST /api/origins/passkeys`           — the registration answering it.
 *
 * The SDK has no client for these yet, so this goes through `apiFetch`, which
 * sends the session cookie the same way the SDK does in the browser. Both
 * routes refuse anything but the user's own session (capability tokens such
 * as an operation approval token included).
 */

type ChallengeResponse = {
  challenge: string;
  expires_at: number;
  rp_id: string;
  user: { id: string; name: string; display_name: string };
  pub_key_cred_params: { type: 'public-key'; alg: number }[];
  authenticator_selection: {
    resident_key?: ResidentKeyRequirement;
    user_verification?: UserVerificationRequirement;
  };
  timeout: number;
  attestation: AttestationConveyancePreference;
};

const REASON_BY_CODE: Record<string, PasskeyFailureReason> = {
  E_INVALID_PAYLOAD: 'rejected',
  E_PASSKEY_REGISTRATION_REJECTED: 'rejected',
  E_PASSKEY_NOT_USABLE_FOR_APPROVALS: 'not_usable',
  E_IDENTITY_ACCOUNT_NOT_READY: 'account_not_ready',
  E_INVALID_TOKEN: 'session',
  E_USER_SESSION_REQUIRED: 'session',
};

/**
 * Origins says whether a failure is worth retrying in `extra_details.retryable`.
 * When it says nothing, a 5xx is treated as retryable: the request may or may
 * not have landed, and resending the same one is documented as safe.
 */
async function failureOf(
  response: Response,
): Promise<PasskeyRegistrationError> {
  const body = (await response.json().catch(() => ({}))) as {
    code?: unknown;
    extra_details?: { retryable?: unknown };
  };
  const code = typeof body.code === 'string' ? body.code : undefined;
  if (response.status === 429) {
    return new PasskeyRegistrationError('rate_limited', { code });
  }
  if (response.status === 501) {
    return new PasskeyRegistrationError('blocked', { code });
  }
  const said = body.extra_details?.retryable;
  const retryable = typeof said === 'boolean' ? said : response.status >= 500;
  const reason =
    (code ? REASON_BY_CODE[code] : undefined) ??
    (response.status === 401 || response.status === 403
      ? 'session'
      : 'unavailable');
  if (
    said === false &&
    (reason === 'unavailable' || reason === 'account_not_ready')
  ) {
    return new PasskeyRegistrationError('blocked', { code });
  }
  return new PasskeyRegistrationError(reason, { code, retryable });
}

async function post(path: `/${string}`, body?: unknown): Promise<Response> {
  let response: Response;
  try {
    response = await apiFetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    });
  } catch {
    // Never answered, so it may have landed: resending is safe.
    throw new PasskeyRegistrationError('unavailable', { retryable: true });
  }
  if (!response.ok) throw await failureOf(response);
  return response;
}

function isChallengeResponse(value: unknown): value is ChallengeResponse {
  const v = value as Partial<ChallengeResponse> | null;
  return (
    typeof v?.challenge === 'string' &&
    typeof v.rp_id === 'string' &&
    typeof v.user?.id === 'string' &&
    Array.isArray(v.pub_key_cred_params)
  );
}

async function challenge(): Promise<PasskeyCreationOptions> {
  const response = await post('/api/origins/passkeys/challenge');
  const body: unknown = await response.json().catch(() => null);
  if (!isChallengeResponse(body)) {
    throw new PasskeyRegistrationError('unavailable');
  }
  return {
    challenge: body.challenge,
    expiresAt: body.expires_at,
    rpId: body.rp_id,
    user: {
      id: body.user.id,
      name: body.user.name,
      displayName: body.user.display_name,
    },
    pubKeyCredParams: body.pub_key_cred_params,
    authenticatorSelection: {
      residentKey: body.authenticator_selection?.resident_key,
      userVerification: body.authenticator_selection?.user_verification,
    },
    timeout: body.timeout,
    attestation: body.attestation,
  };
}

async function register(registration: PasskeyRegistration): Promise<void> {
  await post('/api/origins/passkeys', {
    client_data_json: registration.clientDataJson,
    attestation_object: registration.attestationObject,
  });
}

export const bloquePasskeyRepository: PasskeyRepository = {
  challenge,
  register,
};
