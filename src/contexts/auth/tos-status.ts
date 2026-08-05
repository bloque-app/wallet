import type { TosStatus } from '~/domain/tos/types';
import { bloqueTosRepository } from '~/infra/bloque/tos-repository';
import { withTimeout } from './kyc-status';

/**
 * Same ceiling, and for the same reason, as `KYC_STATUS_FETCH_TIMEOUT_MS`:
 * this runs on the login path, so without it a hanging compliance service
 * would stall every sign-in for as long as the SDK's retry budget allows.
 */
const TOS_STATUS_FETCH_TIMEOUT_MS = 5_000;

/**
 * Whether this identity still owes an acceptance, resolved at authentication
 * time alongside `deriveKycStatus` so the root route can act on it without
 * fetching per render.
 *
 * The repository already maps its own failures to `'unknown'`; what this adds
 * is the timeout, and the guarantee that a throw here can never take the
 * login flow down with it.
 *
 * `'unknown'` deliberately does *not* send anyone to the gate. This is the
 * opposite call to the one `deriveKycStatus` makes, and the difference is the
 * blast radius: an unconfirmed KYC status hides a feature, whereas treating an
 * unconfirmed TOS status as "required" would bounce every signed-in user out
 * of the wallet and into a gate whenever compliance is slow — including people
 * who accepted months ago. Prompting a day late is recoverable; locking
 * everyone out on a network blip is not.
 *
 * `getStatus` is injectable for the same reason it is on `deriveKycStatus`:
 * `mock.module()` is process-global in bun:test and this module's dependency
 * is mocked for real elsewhere, so a plain default parameter avoids two
 * competing global mocks of one path.
 */
export async function deriveTosStatus(
  urn: string,
  getStatus: (
    urn: string,
  ) => Promise<TosStatus> = bloqueTosRepository.getStatus,
): Promise<TosStatus> {
  try {
    return await withTimeout(getStatus(urn), TOS_STATUS_FETCH_TIMEOUT_MS);
  } catch (error) {
    console.error('Error fetching TOS acceptance status', error);
    return 'unknown';
  }
}
