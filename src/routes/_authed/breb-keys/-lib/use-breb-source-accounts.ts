import { useQueries, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { bloque } from '~/lib/bloque';
import { type BrebAccountItem, listBrebAccounts } from './breb';

export type BrebSourceAccount = BrebAccountItem & { balance: string };

function hasPositiveBalance(balance: string) {
  try {
    return BigInt(balance) > 0n;
  } catch {
    return false;
  }
}

/**
 * Active BRE-B accounts that actually hold a positive balance of `asset`
 * (e.g. 'COPM/2'), so a send flow can offer only accounts a user could
 * plausibly send from instead of silently picking the first active key.
 */
export function useBrebSourceAccounts(asset: string) {
  const accountsQuery = useQuery({
    queryKey: ['breb-accounts'],
    queryFn: listBrebAccounts,
    staleTime: 30_000,
  });

  const activeAccounts = useMemo(
    () =>
      (accountsQuery.data ?? []).filter(
        (account) => account.status === 'active',
      ),
    [accountsQuery.data],
  );

  const balanceQueries = useQueries({
    queries: activeAccounts.map((account) => ({
      queryKey: ['breb-account-balance', account.urn, asset],
      queryFn: async () => {
        const balances = await bloque.accounts.balance(account.urn);
        return balances[asset]?.current ?? '0';
      },
      staleTime: 15_000,
    })),
  });

  const isLoadingBalances = balanceQueries.some((query) => query.isLoading);

  const fundedAccounts = useMemo<BrebSourceAccount[]>(
    () =>
      activeAccounts
        .map((account, index) => ({
          ...account,
          balance: balanceQueries[index]?.data ?? '0',
        }))
        .filter((account) => hasPositiveBalance(account.balance)),
    [activeAccounts, balanceQueries],
  );

  return {
    accountsQuery,
    activeAccounts,
    fundedAccounts,
    isLoadingBalances,
  };
}
