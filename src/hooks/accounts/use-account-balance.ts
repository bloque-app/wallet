import { useQuery } from '@tanstack/react-query';
import { bloqueAccountsRepository } from '~/infra/bloque/accounts-repository';

export function useAccountBalance(urn: string) {
  return useQuery({
    queryKey: ['account-balance', urn],
    queryFn: () => bloqueAccountsRepository.getBalance(urn),
    enabled: !!urn,
  });
}
