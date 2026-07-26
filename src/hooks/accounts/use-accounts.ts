import { useQuery } from '@tanstack/react-query';
import { groupIntoAccounts } from '~/domain/accounts/grouping';
import { bloqueAccountsRepository } from '~/infra/bloque/accounts-repository';

/** Every ledger the user holds, grouped from their raw products. */
export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const products = await bloqueAccountsRepository.listProducts();
      return groupIntoAccounts(products);
    },
    staleTime: 30_000,
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
