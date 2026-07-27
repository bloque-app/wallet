import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateCardInput } from '~/domain/accounts/ports';
import { bloqueAccountsRepository } from '~/infra/bloque/accounts-repository';

export function useCreateCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCardInput) =>
      bloqueAccountsRepository.createCard(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  });
}

export function useCardToggleFreeze() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ urn, freeze }: { urn: string; freeze: boolean }) =>
      freeze
        ? bloqueAccountsRepository.freezeCard(urn)
        : bloqueAccountsRepository.activateCard(urn),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  });
}

export function useCardUpdateName() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ urn, name }: { urn: string; name: string }) =>
      bloqueAccountsRepository.updateCardName(urn, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  });
}

export function useCardDetailsUrl() {
  return useMutation({
    mutationFn: (urn: string) =>
      bloqueAccountsRepository.getCardDetailsUrl(urn),
  });
}
