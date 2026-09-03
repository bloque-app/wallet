import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateExternalUsBankAccountInput } from '~/domain/accounts/ports';
import { bloqueAccountsRepository } from '~/infra/bloque/accounts-repository';

/** Starts the hosted Plaid Link flow for a new external US bank account. */
export function useCreateExternalUsBankAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateExternalUsBankAccountInput) =>
      bloqueAccountsRepository.createExternalUsBankAccount(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}
