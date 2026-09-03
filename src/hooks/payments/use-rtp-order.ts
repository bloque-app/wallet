import type { CreateRtpOrderParams } from '@bloque/sdk-swap';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateOrderOptions } from '~/domain/payments/ports';
import { bloquePaymentsRepository } from '~/infra/bloque/payments-repository';

/** Creates an RTP payout swap order (Kusama DUSD -> US bank). Invalidates accounts. */
export function useCreateRtpOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      params: CreateRtpOrderParams;
      options?: CreateOrderOptions;
    }) => bloquePaymentsRepository.createRtpOrder(input.params, input.options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}
