import { useInfiniteQuery } from '@tanstack/react-query';
import { bloque } from '~/lib/bloque';
import type { Movement } from '~/lib/mock-data';
import { mapGlobalTransactionToMovement } from '~/lib/transaction-mapper';

export function useGlobalTransactionsInfinite(
  limit = 10,
  direction?: 'in' | 'out',
) {
  return useInfiniteQuery({
    queryKey: ['global-transactions-infinite', limit, direction],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const result = await bloque.accounts.transactions({
        limit,
        direction,
        next: pageParam,
      });

      return {
        movements: (result.data ?? [])
          .map(mapGlobalTransactionToMovement)
          .filter((movement): movement is Movement => movement !== null),
        pageSize: result.pageSize,
        hasMore: result.hasMore,
        next: result.next,
      };
    },
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.next || undefined : undefined,
  });
}
