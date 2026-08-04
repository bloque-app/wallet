import type { TosRepository } from '~/domain/tos/ports';
import type { TosGate, TosStatus } from '~/domain/tos/types';
import { bloque } from '~/lib/bloque';

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

async function getStatus(urn: string): Promise<TosStatus> {
  try {
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
  const result = await bloque.compliance.tosGate.start({ returnUrl });
  return { url: result.url };
}

export const bloqueTosRepository: TosRepository = {
  getStatus,
  start,
};
