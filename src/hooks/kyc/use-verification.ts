import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useAuth } from '~/contexts/auth/auth-context';
import { bloqueComplianceRepository } from '~/infra/bloque/compliance-repository';

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
 * unreusable. If `getVerification` 404s (no verification exists yet) or
 * resolves without a usable `url`, this hook fires `startVerification`
 * exactly once per urn (guarded by a ref, same as the old component code)
 * and folds the resulting url back into what it returns.
 *
 * `refetchOnWindowFocus` covers "user returns from the provider's iframe/tab
 * without a manual reload" — a full realtime completion webhook is out of
 * scope for this pass.
 */
export function useVerification() {
  const { user } = useAuth();
  const urn = user?.urn;
  const startedForUrnRef = useRef<string | null>(null);

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

  const shouldStartVerification =
    (verificationQuery.isSuccess && !verificationQuery.data?.url) ||
    (verificationQuery.isError && isNotFoundError(verificationQuery.error));

  useEffect(() => {
    if (!urn) return;
    if (!shouldStartVerification) return;
    if (startedForUrnRef.current === urn) return;
    startedForUrnRef.current = urn;
    startVerification.mutate(urn);
  }, [urn, shouldStartVerification, startVerification.mutate]);

  const url =
    verificationQuery.data?.url ?? startVerification.data?.url ?? null;

  const hasUnhandledGetError =
    verificationQuery.isError && !isNotFoundError(verificationQuery.error);

  const isBootstrapping =
    verificationQuery.isPending ||
    (shouldStartVerification && (startVerification.isPending || !url));

  const isError = hasUnhandledGetError || startVerification.isError;

  return {
    /** The verification the user should complete, once one exists. */
    verification: verificationQuery.data ?? startVerification.data,
    /** Convenience accessor — the iframe src once bootstrapping is done. */
    url,
    /** True while resolving the initial GET and/or the auto-started POST. */
    isBootstrapping,
    /** True if either call failed for a reason other than "not started yet". */
    isError,
    hasUser: !!urn,
  };
}
