import type { CreateExternalUsBankOrderParams } from '@bloque/sdk-swap';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateOrderOptions } from '~/domain/payments/ports';
import { bloquePaymentsRepository } from '~/infra/bloque/payments-repository';

/** Creates an ACH on-ramp swap order (linked US bank -> Kusama DUSD). Invalidates accounts. */
export function useCreateExternalUsBankOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      params: CreateExternalUsBankOrderParams;
      options?: CreateOrderOptions;
    }) =>
      bloquePaymentsRepository.createExternalUsBankOrder(
        input.params,
        input.options,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}
