import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { CardActive } from '~/components/card/card-active';
import { CardList } from '~/components/card/card-list';
import { CardNoCard } from '~/components/card/card-no-card';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '~/components/ui/drawer';
import { useAuth } from '~/contexts/auth/auth-context';
import type { CardProduct } from '~/domain/accounts/types';
import { useAccounts } from '~/hooks/accounts/use-accounts';
import {
  useCardDetailsUrl,
  useCardToggleFreeze,
} from '~/hooks/accounts/use-cards';
import { CardsSkeleton } from './-components/cards-skeleton';

export const Route = createFileRoute('/_authed/card/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const accountsQuery = useAccounts();
  const cards =
    accountsQuery.data?.flatMap((account) =>
      account.products.filter(
        (product): product is CardProduct => product.kind === 'card',
      ),
    ) ?? [];
  const {
    mutateAsync,
    data: cardDetailsUrl,
    isPending: isQuickViewLoading,
  } = useCardDetailsUrl();
  const toggleFreezeMutation = useCardToggleFreeze();

  const { user } = useAuth();
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [showCardDetails, setShowCardDetails] = useState(false);

  const kycStatus = user?.kycStatus ?? 'not_started';
  const activeCard = cards.find((c) => c.urn === activeCardId) ?? null;

  useEffect(() => {
    if (cards.length === 0) {
      setActiveCardId(null);
      return;
    }

    const selectedCardStillExists = cards.some((c) => c.urn === activeCardId);
    if (!selectedCardStillExists) {
      setActiveCardId(cards[0].urn);
    }
  }, [cards, activeCardId]);

  const handleAddCard = () => {
    if (kycStatus !== 'approved') {
      navigate({ to: '/kyc' });
      return;
    }
    navigate({ to: '/accounts' });
  };

  const handleQuickViewCard = async (cardUrn: string) => {
    try {
      await mutateAsync(cardUrn);
      setShowCardDetails(true);
    } catch (error) {
      console.error('Error fetching card details:', error);
    }
  };

  const handleViewCardDetails = (urn: string) => {
    navigate({
      to: '/card/details/$urn',
      params: { urn },
    });
  };

  const handleFreeze = async (cardUrn: string) => {
    const card = cards.find((c) => c.urn === cardUrn);
    if (!card) return;

    const isFrozen = card.status === 'frozen';

    try {
      await toggleFreezeMutation.mutateAsync({
        urn: cardUrn,
        freeze: !isFrozen,
      });

      toast.success(
        isFrozen
          ? t('card.freeze.activatedToast')
          : t('card.freeze.frozenToast'),
      );
    } catch (error) {
      toast.error(
        isFrozen
          ? t('card.freeze.activateErrorToast')
          : t('card.freeze.freezeErrorToast'),
      );
      console.error('Error toggling freeze:', error);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-[-0.025em] text-foreground">
        {t('card.title')}
      </h1>

      {accountsQuery.isLoading ? (
        <CardsSkeleton />
      ) : cards.length === 0 ? (
        <CardNoCard
          onCreateCard={handleAddCard}
          canCreateCard={kycStatus === 'approved'}
        />
      ) : (
        <>
          <CardList
            cards={cards}
            activeCardId={activeCardId}
            onSelectCard={setActiveCardId}
            onAddCard={handleAddCard}
            canAddCard={kycStatus === 'approved'}
          />

          {activeCard && (
            <CardActive
              card={activeCard}
              onFreeze={handleFreeze}
              onQuickView={handleQuickViewCard}
              onViewDetails={handleViewCardDetails}
              isLoadingQuickView={isQuickViewLoading}
              isLoadingFreeze={toggleFreezeMutation.isPending}
            />
          )}
        </>
      )}

      {/* Card quick-view drawer */}
      <Drawer open={showCardDetails} onOpenChange={setShowCardDetails}>
        <DrawerContent className="h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>{t('card.detailsDrawerTitle')}</DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 px-4 pb-6">
            {cardDetailsUrl ? (
              <iframe
                src={cardDetailsUrl}
                title={t('card.detailsDrawerTitle')}
                className="h-full w-full rounded-xl border-0"
                sandbox="allow-scripts allow-same-origin"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  {t('card.detailsLoadError')}
                </p>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
