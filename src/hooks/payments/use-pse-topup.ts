import type { CreatePseOrderParams } from '@bloque/sdk-swap';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateOrderOptions } from '~/domain/payments/ports';
import { bloquePaymentsRepository } from '~/infra/bloque/payments-repository';

/** The list of PSE-participating banks (Colombian bank top-up rail). */
export function usePseBanks() {
  return useQuery({
    queryKey: ['pse-banks'],
    queryFn: () => bloquePaymentsRepository.listPseBanks(),
    staleTime: 5 * 60_000,
  });
}

/** Creates a PSE top-up swap order. Invalidates accounts — balances change. */
export function useCreatePseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      params: CreatePseOrderParams;
      options?: CreateOrderOptions;
    }) => bloquePaymentsRepository.createPseOrder(input.params, input.options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}
