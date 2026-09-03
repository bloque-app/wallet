import type { QueryObserverOptions } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { groupIntoAccounts } from '~/domain/accounts/grouping';
import type { Account } from '~/domain/accounts/types';
import { bloqueAccountsRepository } from '~/infra/bloque/accounts-repository';

/**
 * Every ledger the user holds, grouped from their raw products. Pass
 * `refetchInterval` to poll (e.g. while waiting for a linked bank account's
 * Plaid `linkStatus` to leave `pending_link`) — omit it for the normal,
 * one-shot-per-staleness behavior every other caller relies on.
 */
export function useAccounts(options?: {
  refetchInterval?: QueryObserverOptions<Account[]>['refetchInterval'];
}) {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const products = await bloqueAccountsRepository.listProducts();
      return groupIntoAccounts(products);
    },
    staleTime: 30_000,
    refetchInterval: options?.refetchInterval,
  });
}

/** Derives a single Account (by any member product's urn) from the same cache — no extra fetch. */
export function useAccount(urn: string | undefined) {
  const accountsQuery = useAccounts();
  const account = urn
    ? accountsQuery.data?.find((a) => a.products.some((p) => p.urn === urn))
    : undefined;

  return {
    data: account,
    isLoading: accountsQuery.isLoading,
    isSuccess: accountsQuery.isSuccess,
    isError: accountsQuery.isError,
    error: accountsQuery.error,
    refetch: accountsQuery.refetch,
  };
}
