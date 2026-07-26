import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateBrebKeyInput } from '~/domain/accounts/ports';
import { bloqueAccountsRepository } from '~/infra/bloque/accounts-repository';

export function useCreateBrebKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBrebKeyInput) =>
      bloqueAccountsRepository.createBrebKey(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  });
}

export function useResolveBrebKey() {
  return useMutation({
    mutationFn: (input: { keyType: string; key: string }) =>
      bloqueAccountsRepository.resolveBrebKey(input),
  });
}

export function useDecodeBrebQr() {
  return useMutation({
    mutationFn: (qrCodeData: string) =>
      bloqueAccountsRepository.decodeBrebQr(qrCodeData),
  });
}

export function useSuspendBrebKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (urn: string) => bloqueAccountsRepository.suspendBrebKey(urn),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  });
}

export function useActivateBrebKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (urn: string) => bloqueAccountsRepository.activateBrebKey(urn),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  });
}

export function useDeleteBrebKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (urn: string) => bloqueAccountsRepository.deleteBrebKey(urn),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  });
}
