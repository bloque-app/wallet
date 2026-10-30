import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bloqueAccountsRepository } from '~/infra/bloque/accounts-repository';

export function useDeletePocket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (urn: string) =>
      bloqueAccountsRepository.deleteVirtualAccount(urn),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  });
}
