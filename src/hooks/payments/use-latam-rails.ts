import type {
  CreatePixDepositParams,
  CreatePixOrderParams,
  CreateSpeiDepositParams,
  CreateSpeiOrderParams,
} from '@bloque/sdk-swap';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateOrderOptions } from '~/domain/payments/ports';
import { bloquePaymentsRepository } from '~/infra/bloque/payments-repository';

function useRailMutation<T>(
  create: (
    params: T,
    options?: CreateOrderOptions,
  ) => ReturnType<typeof bloquePaymentsRepository.createSpeiOrder>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { params: T; options?: CreateOrderOptions }) =>
      create(input.params, input.options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export const useCreateSpeiDepositOrder = () =>
  useRailMutation<CreateSpeiDepositParams>(
    bloquePaymentsRepository.createSpeiDepositOrder,
  );

export const useCreateSpeiOrder = () =>
  useRailMutation<CreateSpeiOrderParams>(
    bloquePaymentsRepository.createSpeiOrder,
  );

export const useCreatePixDepositOrder = () =>
  useRailMutation<CreatePixDepositParams>(
    bloquePaymentsRepository.createPixDepositOrder,
  );

export const useCreatePixOrder = () =>
  useRailMutation<CreatePixOrderParams>(
    bloquePaymentsRepository.createPixOrder,
  );
