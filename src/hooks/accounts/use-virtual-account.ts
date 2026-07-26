import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateVirtualAccountInput } from '~/domain/accounts/ports';
import { bloqueAccountsRepository } from '~/infra/bloque/accounts-repository';

export function useCreateVirtualAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateVirtualAccountInput) =>
      bloqueAccountsRepository.createVirtualAccount(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  });
}
