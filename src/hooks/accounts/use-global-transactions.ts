import { useQuery } from '@tanstack/react-query';
import {
  dedupeGlobalMovements,
  toDomainMovement,
} from '~/domain/accounts/movements';
import { bloqueAccountsRepository } from '~/infra/bloque/accounts-repository';
import type { Movement } from '~/lib/formatters';

/**
 * Home widget's top-N global transactions feed — cross-account, not scoped
 * to a single `urn`. Shares the `['movements', ...]` query-key namespace
 * with `useGlobalTransactionsInfinite`/`useAccountMovements`/
 * `useCardMovements`.
 *
 * Deduped via `dedupeGlobalMovements` (a ledger with N linked accounts
 * reports the same transfer N times) — this can mean fewer than `limit`
 * items are shown when duplicates land in the requested page; that's
 * still strictly correct, just potentially sparse, and preferred over
 * showing the same movement multiple times.
 */
export function useGlobalTransactions(limit: number, asset?: string) {
  return useQuery({
    queryKey: ['movements', 'global', limit, asset],
    queryFn: async () => {
      const page = await bloqueAccountsRepository.getTransactions({
        limit,
        asset,
      });

      return {
        movements: dedupeGlobalMovements(
          page.movements
            .map(toDomainMovement)
            .filter((movement): movement is Movement => movement !== null),
        ),
        hasMore: page.hasMore,
        next: page.next,
      };
    },
  });
}
