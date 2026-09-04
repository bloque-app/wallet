import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useAuth } from '~/contexts/auth/auth-context';
import { bloqueComplianceRepository } from '~/infra/bloque/compliance-repository';
import {
  needsFreshVerificationLink,
  verificationStartKey,
} from './verification-policy';

function isNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  return (
    'status' in error &&
    typeof (error as { status?: unknown }).status === 'number' &&
    (error as { status: number }).status === 404
  );
}

/**
 * Owns the whole "get the user into an in-progress KYC verification" policy
 * — this used to live as a component effect in
 * src/routes/_authed/kyc/index.tsx, which made it untestable and
 * unreusable. If `getVerification` 404s (no verification exists yet),
 * resolves without a usable `url`, or resolves as `rejected` (the provider
 * link from a past attempt is spent and its TTL has since expired), this
 * hook fires `startVerification` to mint a fresh link. It's guarded by a
 * ref keyed on urn+status rather than urn alone, so a user rejected more
 * than once still gets a new link minted on each rejection instead of only
 * the first.
 *
 * `refetchOnWindowFocus` covers "user returns from the provider's iframe/tab
 * without a manual reload" — a full realtime completion webhook is out of
 * scope for this pass. That refetch only updates THIS hook's own query
 * cache though, so a `refreshUser()` call below propagates a terminal
 * status (`approved`/`rejected`) into the app-wide `AuthContext.kycStatus`
 * too — otherwise the header banner/card-creation gate would still show
 * stale data until a full reload even after this hook noticed completion.
 */
export function useVerification() {
  const { user, refreshUser } = useAuth();
  const urn = user?.urn;
  const startedForKeyRef = useRef<string | null>(null);
  const syncedStatusRef = useRef<string | null>(null);

  const verificationQuery = useQuery({
    queryKey: ['kyc-verification', urn],
    enabled: !!urn,
    retry: false,
    refetchOnWindowFocus: true,
    queryFn: () => bloqueComplianceRepository.getVerification(urn as string),
  });

  const startVerification = useMutation({
    mutationFn: (targetUrn: string) =>
      bloqueComplianceRepository.startVerification(targetUrn),
  });

  const status = verificationQuery.data?.status;

  const fetchOutcome = verificationQuery.isSuccess
    ? 'success'
    : verificationQuery.isError && isNotFoundError(verificationQuery.error)
      ? 'not-found'
      : 'other-error';

  const shouldStartVerification = needsFreshVerificationLink({
    fetchOutcome,
    status,
    hasUrl: !!verificationQuery.data?.url,
  });

  useEffect(() => {
    if (!urn) return;
    if (!shouldStartVerification) return;
    const key = verificationStartKey(urn, status);
    if (startedForKeyRef.current === key) return;
    startedForKeyRef.current = key;
    startVerification.mutate(urn);
  }, [urn, status, shouldStartVerification, startVerification.mutate]);

  useEffect(() => {
    if (!urn) return;
    if (status !== 'approved' && status !== 'rejected') return;
    const key = `${urn}:${status}`;
    if (syncedStatusRef.current === key) return;
    syncedStatusRef.current = key;
    void refreshUser();
  }, [urn, status, refreshUser]);

  // While a fresh link is being minted (rejected retry or first start), the
  // old/stale `verificationQuery.data.url` must not leak through — it's
  // either absent (not-found path) or a spent, TTL-expired provider link
  // (rejected path).
  const url = shouldStartVerification
    ? (startVerification.data?.url ?? null)
    : (verificationQuery.data?.url ?? null);

  const hasUnhandledGetError =
    verificationQuery.isError && !isNotFoundError(verificationQuery.error);

  const isBootstrapping =
    verificationQuery.isPending ||
    (shouldStartVerification && (startVerification.isPending || !url));

  const isError = hasUnhandledGetError || startVerification.isError;

  return {
    /** The verification the user should complete, once one exists. */
    verification: verificationQuery.data ?? startVerification.data,
    /** The real wire status, once known — `undefined` while still resolving. */
    status,
    /** Convenience accessor — the iframe src once bootstrapping is done. */
    url,
    /** True while resolving the initial GET and/or the auto-started POST. */
    isBootstrapping,
    /** True if either call failed for a reason other than "not started yet". */
    isError,
    hasUser: !!urn,
  };
}
