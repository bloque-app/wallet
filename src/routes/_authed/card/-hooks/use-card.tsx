import { useMutation, useQuery } from '@tanstack/react-query';
import { bloque } from '~/lib/bloque';

export type CardsResponse = Awaited<
  ReturnType<typeof bloque.accounts.card.list>
>;
export function useCards() {
  return useQuery({
    queryKey: ['cards'],
    queryFn: async () => bloque.accounts.card.list(),
  });
}

export type CardDetailsResponse = CardsResponse['accounts'][number];
export function useCardDetails() {
  return useMutation({
    mutationFn: async (cardUrn: string) => {
      if (!cardUrn) throw new Error('No card URN provided');
      return bloque.accounts.get(cardUrn) as unknown as CardDetailsResponse;
    },
  });
}

export function useCardToggleFreeze() {
  return useMutation({
    mutationFn: async ({
      cardUrn,
      freeze,
    }: {
      cardUrn: string;
      freeze: boolean;
    }) => {
      if (!cardUrn) throw new Error('No card URN provided');

      if (freeze) {
        await bloque.accounts.card.freeze(cardUrn);
      } else {
        await bloque.accounts.card.activate(cardUrn);
      }
    },
  });
}

export function useCardUpdateName() {
  return useMutation({
    mutationFn: async ({
      cardUrn,
      name,
    }: {
      cardUrn: string;
      name: string;
    }) => {
      if (!cardUrn) throw new Error('No card URN provided');
      if (!name?.trim()) throw new Error('No card name provided');

      await bloque.accounts.card.updateName(cardUrn, name.trim());
    },
  });
}
