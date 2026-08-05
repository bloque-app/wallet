import type { TosRepository } from '~/domain/tos/ports';
import type { TosGate, TosStatus } from '~/domain/tos/types';
import { initBloque } from '~/lib/bloque';

/**
 * Adapter for Terms of Service acceptance, over the SDK's compliance clients.
 *
 * Two calls, deliberately separated server-side:
 *
 *   - `tiers.getStatus`   — what does this identity still owe?
 *   - `tosGate.start`     — mint a hosted page for them to satisfy it.
 *
 * `tier-status` returns only the safe flow-start contract, never the live
 * legal URL or the archived document text. Only the hosted gate may embed
 * those, so what a user is shown is always the exact archived version their
 * acceptance is recorded against.
 */

/** Requirement key prefix compliance uses for Level 0 terms acceptance. */
const TOS_REQUIREMENT_PREFIX = 'tos';

/**
 * `initBloque()` rather than the `bloque` proxy, and this is load-bearing.
 *
 * The proxy throws unless the SDK has already been initialized, and
 * initialization is kicked off by an effect in `index.tsx` that only runs once
 * `auth.isAuthenticated` is true. Both status lookups happen inside
 * `setAuthenticatedUser`, which runs *before* that flips — so the proxy throws
 * every time, the catch below turns it into `'unknown'`, and nobody is ever
 * sent to the gate.
 *
 * `initBloque()` caches its promise, so awaiting it here is idempotent and
 * simply orders this call after the handshake it depends on.
 */
async function getStatus(urn: string): Promise<TosStatus> {
  try {
    const bloque = await initBloque();
    const status = await bloque.compliance.tiers.getStatus({ urn });

    // There is no positive "accepted" flag — an absent TOS key in
    // `missingRequirements` is what acceptance looks like.
    const owesTos = status.missingRequirements.some((key) =>
      key.startsWith(TOS_REQUIREMENT_PREFIX),
    );

    return owesTos ? 'required' : 'accepted';
  } catch {
    // Deliberately not 'accepted'. Claiming someone accepted terms they may
    // not have is the dangerous direction to be wrong in; 'unknown' lets the
    // caller decide whether to prompt rather than silently waving them through.
    return 'unknown';
  }
}

async function start(returnUrl: string): Promise<TosGate> {
  const bloque = await initBloque();
  const result = await bloque.compliance.tosGate.start({ returnUrl });
  return { url: result.url };
}

export const bloqueTosRepository: TosRepository = {
  getStatus,
  start,
};
