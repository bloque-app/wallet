import { useInfiniteQuery } from '@tanstack/react-query';
import { toDomainMovement } from '~/domain/accounts/movements';
import { bloqueAccountsRepository } from '~/infra/bloque/accounts-repository';
import type { Movement } from '~/lib/formatters';

/**
 * Card-details movements list — same `getMovements()` port method the
 * per-account detail page already uses (a card is just another account
 * URN), with optional direction filtering for the card-details filter
 * chips. Shares the `['movements', ...]` query-key namespace with
 * `useGlobalTransactions`/`useGlobalTransactionsInfinite`/
 * `useAccountMovements`.
 */
export function useCardMovements(
  urn: string,
  asset: string,
  direction?: 'in' | 'out',
  limit = 10,
) {
  return useInfiniteQuery({
    queryKey: ['movements', 'card', urn, asset, direction],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const page = await bloqueAccountsRepository.getMovements({
        urn,
        asset,
        direction,
        limit,
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
    enabled: !!urn && !!asset,
  });
}
