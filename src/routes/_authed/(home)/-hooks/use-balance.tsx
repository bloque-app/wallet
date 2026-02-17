import { useQuery } from '@tanstack/react-query';
import { bloque } from '~/lib/bloque';

export function useBalance() {
  return useQuery({
    queryKey: ['balances'],
    queryFn: async () => bloque.accounts.balances(),
  });
}
