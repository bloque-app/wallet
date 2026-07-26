import type { CreateBankTransferOrderParams } from '@bloque/sdk-swap';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateOrderOptions } from '~/domain/payments/ports';
import { bloquePaymentsRepository } from '~/infra/bloque/payments-repository';

/** Creates a Colombian-bank cash-out swap order. Invalidates accounts. */
export function useCreateBankTransferOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      params: CreateBankTransferOrderParams;
      options?: CreateOrderOptions;
    }) =>
      bloquePaymentsRepository.createBankTransferOrder(
        input.params,
        input.options,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}
