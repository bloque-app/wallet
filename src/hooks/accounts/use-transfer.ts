import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { TransferInput } from '~/domain/accounts/ports';
import { bloqueAccountsRepository } from '~/infra/bloque/accounts-repository';

/** Plain account-to-account ledger transfer (no swap/rate/order involved). */
export function useTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TransferInput) =>
      bloqueAccountsRepository.transfer(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  });
}
