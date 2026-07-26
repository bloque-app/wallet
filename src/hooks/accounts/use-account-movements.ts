import { useInfiniteQuery } from '@tanstack/react-query';
import { bloqueAccountsRepository } from '~/infra/bloque/accounts-repository';

export function useAccountMovements(urn: string, asset: string) {
  return useInfiniteQuery({
    queryKey: ['account-movements', urn, asset],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      bloqueAccountsRepository.getMovements({
        urn,
        asset,
        limit: 10,
        next: pageParam,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.next : undefined,
    enabled: !!urn && !!asset,
  });
}
