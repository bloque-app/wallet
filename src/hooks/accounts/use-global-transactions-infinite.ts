import { useInfiniteQuery } from '@tanstack/react-query';
import { toDomainMovement } from '~/domain/accounts/movements';
import { bloqueAccountsRepository } from '~/infra/bloque/accounts-repository';
import type { Movement } from '~/lib/formatters';

/**
 * The dedicated `/movements` route's infinite global feed. Shares the
 * `['movements', ...]` query-key namespace with `useGlobalTransactions`/
 * `useAccountMovements`/`useCardMovements`.
 */
export function useGlobalTransactionsInfinite(
  limit = 10,
  direction?: 'in' | 'out',
  asset?: string,
) {
  return useInfiniteQuery({
    queryKey: ['movements', 'global-infinite', limit, direction, asset],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const page = await bloqueAccountsRepository.getTransactions({
        limit,
        direction,
        asset,
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
      lastPage.hasMore ? lastPage.next || undefined : undefined,
  });
}
