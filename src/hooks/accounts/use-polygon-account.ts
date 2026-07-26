import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreatePolygonAccountInput } from '~/domain/accounts/ports';
import { bloqueAccountsRepository } from '~/infra/bloque/accounts-repository';

export function useCreatePolygonAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePolygonAccountInput) =>
      bloqueAccountsRepository.createPolygonAccount(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  });
}
