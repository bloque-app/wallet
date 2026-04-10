import { useQuery } from '@tanstack/react-query';
import { bloque } from '~/lib/bloque';
import type { Movement } from '~/lib/mock-data';
import { mapGlobalTransactionToMovement } from '~/lib/transaction-mapper';

export function useGlobalTransactions(limit: number, asset?: string) {
  return useQuery({
    queryKey: ['global-transactions', limit, asset],
    queryFn: async () => {
      const result = await bloque.accounts.transactions({
        limit,
        asset,
      } as never);

      return {
        ...result,
        movements: (result.data ?? [])
          .map(mapGlobalTransactionToMovement)
          .filter((movement): movement is Movement => movement !== null),
      };
    },
  });
}
