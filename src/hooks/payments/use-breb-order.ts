import type { CreateBrebOrderParams } from '@bloque/sdk-swap';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateOrderOptions } from '~/domain/payments/ports';
import { bloquePaymentsRepository } from '~/infra/bloque/payments-repository';

/** Creates a BRE-B payout swap order. Invalidates accounts. */
export function useCreateBrebOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      params: CreateBrebOrderParams;
      options?: CreateOrderOptions;
    }) => bloquePaymentsRepository.createBrebOrder(input.params, input.options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}
