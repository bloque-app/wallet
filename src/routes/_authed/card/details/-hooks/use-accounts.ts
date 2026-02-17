import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { bloque } from '~/lib/bloque';

type AccountMovementsParams = Parameters<typeof bloque.accounts.movements>[0];
export function useTransactions(
  urn: string,
  asset: string,
  direction?: 'in' | 'out',
  limit = 10,
) {
  return useInfiniteQuery({
    queryKey: ['transactions', urn, asset, direction],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const result = await bloque.accounts.movements({
        urn,
        asset: asset as AccountMovementsParams['asset'],
        direction,
        limit,
        next: pageParam,
      });

      return {
        transactions: result.data ?? [],
        pageSize: result.pageSize,
        hasMore: result.hasMore,
        next: result.next,
      };
    },
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.next || undefined : undefined,
    enabled: !!urn && !!asset,
  });
}

export function useBalance(urn: string) {
  return useQuery({
    queryKey: ['balance', urn],
    queryFn: () => bloque.accounts.balance(urn),
    enabled: !!urn,
  });
}
