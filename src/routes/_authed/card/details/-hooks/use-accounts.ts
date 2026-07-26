import { useQuery } from '@tanstack/react-query';
import { bloque } from '~/lib/bloque';

export function useBalance(urn: string) {
  return useQuery({
    queryKey: ['balance', urn],
    queryFn: () => bloque.accounts.balance(urn),
    enabled: !!urn,
  });
}
