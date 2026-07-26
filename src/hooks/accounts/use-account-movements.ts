import { useInfiniteQuery } from '@tanstack/react-query';
import { toDomainMovement } from '~/domain/accounts/movements';
import { bloqueAccountsRepository } from '~/infra/bloque/accounts-repository';
import type { Movement } from '~/lib/formatters';

/**
 * Shares the `['movements', ...]` query-key namespace with
 * `useGlobalTransactions`/`useGlobalTransactionsInfinite`/
 * `useCardMovements`.
 */
export function useAccountMovements(urn: string, asset: string) {
  return useInfiniteQuery({
    queryKey: ['movements', 'account', urn, asset],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const page = await bloqueAccountsRepository.getMovements({
        urn,
        asset,
        limit: 10,
        next: pageParam,
      });

      return {
        movements: page.movements
          .map(toDomainMovement)
          .filter((movement): movement is Movement => movement !== null),
        hasMore: page.hasMore,
        next: page.next,
      };
    },
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.next : undefined,
    enabled: !!urn && !!asset,
  });
}
