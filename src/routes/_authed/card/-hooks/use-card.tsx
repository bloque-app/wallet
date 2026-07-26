import type { CardAccount } from '@bloque/sdk-accounts';
import { useMutation } from '@tanstack/react-query';
import { bloque } from '~/lib/bloque';

export type CardDetailsResponse = CardAccount;

export function useCardDetails() {
  return useMutation({
    mutationFn: async (cardUrn: string) => {
      if (!cardUrn) throw new Error('No card URN provided');
      return bloque.accounts.get(cardUrn) as unknown as CardDetailsResponse;
    },
  });
}
