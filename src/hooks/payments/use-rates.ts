import type { FindRatesParams } from '@bloque/sdk-swap';
import { useQuery } from '@tanstack/react-query';
import { bloquePaymentsRepository } from '~/infra/bloque/payments-repository';

/**
 * Finds exchange rates for a given asset pair/medium combination. `params`
 * is `undefined` while the caller doesn't yet have enough input (amount,
 * source account, etc.) to query — the hook simply stays disabled.
 */
export function useRates(
  params: FindRatesParams | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ['payments-rates', params],
    queryFn: () =>
      bloquePaymentsRepository.findRates(params as FindRatesParams),
    enabled: !!params && (options?.enabled ?? true),
    staleTime: 30_000,
    retry: 1,
  });
}
