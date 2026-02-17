import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
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
import { useWallet } from '~/lib/wallet-mock';
import { CardsSkeleton } from './-components/cards-skeleton';
import { KycGate } from './-components/kyc-gate';
import { KycStatus } from './-components/kyc-status';
import { KycStepper } from './-components/kyc-stepper';
import {
  useCardDetails,
  useCards,
  useCardToggleFreeze,
} from './-hooks/use-card';

type CardView = 'main' | 'kyc-gate' | 'kyc-stepper' | 'kyc-status';

export const Route = createFileRoute('/_authed/card/')({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading: isLoadingCards } = useCards();
  const cards = data?.accounts ?? [];
  const {
    mutateAsync,
    data: cardDetails,
    isPending: isQuickViewLoading,
  } = useCardDetails();
  const cardDetailsUrl = cardDetails?.detailsUrl ?? null;
  const toggleFreezeMutation = useCardToggleFreeze();

  const { user } = useWallet();
  const [view, setView] = useState<CardView>('main');
  const [pendingAddCard, setPendingAddCard] = useState(false);
  const [pendingCardLabel, setPendingCardLabel] = useState<string | null>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [showCardDetails, setShowCardDetails] = useState(false);

  const kycStatus = user?.kycStatus ?? 'not_started';
  const activeCard = cards.find((c) => c.id === activeCardId) ?? null;

  useEffect(() => {
    if (cards.length === 0) {
      setActiveCardId(null);
      return;
    }

    const selectedCardStillExists = cards.some((c) => c.id === activeCardId);
    if (!selectedCardStillExists) {
      setActiveCardId(cards[0].id);
    }
  }, [cards, activeCardId]);

  const requestCardLabel = () => {
    const defaultLabel =
      cards.length === 0 ? 'Personal' : `Tarjeta ${cards.length + 1}`;
    const label = window.prompt('Nombre de la nueva tarjeta', defaultLabel);
    if (!label?.trim()) return null;
    return label.trim();
  };

  const handleAddCard = () => {
    const label = requestCardLabel();
    if (!label) return;

    if (kycStatus === 'approved') {
      toast.info(
        `Solicitud de creación enviada para "${label}". La tarjeta aparecerá cuando esté lista.`,
      );
    } else {
      setPendingCardLabel(label);
      setPendingAddCard(true);
      setView('kyc-gate');
    }
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
    const action = isFrozen ? 'activar' : 'congelar';

    try {
      await toggleFreezeMutation.mutateAsync({
        cardUrn,
        freeze: !isFrozen,
      });

      await queryClient.invalidateQueries({ queryKey: ['cards'] });

      toast.success(
        `Tarjeta ${isFrozen ? 'activada' : 'congelada'} exitosamente`,
      );
    } catch (error) {
      toast.error(`Error al ${action} la tarjeta`);
      console.error('Error toggling freeze:', error);
    }
  };

  if (view === 'kyc-stepper') {
    return (
      <KycStepper
        onComplete={() => setView('kyc-status')}
        onBack={() => setView('main')}
      />
    );
  }

  if (view === 'kyc-status') {
    return (
      <KycStatus
        status={kycStatus}
        onBack={() => {
          setView('main');
          if (pendingAddCard && kycStatus === 'approved' && pendingCardLabel) {
            toast.info(
              `Solicitud de creación enviada para "${pendingCardLabel}". La tarjeta aparecerá cuando esté lista.`,
            );
          }
          setPendingAddCard(false);
          setPendingCardLabel(null);
        }}
      />
    );
  }

  if (view === 'kyc-gate') {
    return (
      <KycGate
        kycStatus={kycStatus}
        onStartKyc={() => setView('kyc-stepper')}
        onBack={() => {
          setView('main');
          setPendingAddCard(false);
          setPendingCardLabel(null);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        Tarjetas
      </h1>

      {isLoadingCards ? (
        <CardsSkeleton />
      ) : cards.length === 0 ? (
        <CardNoCard onCreateCard={handleAddCard} />
      ) : (
        <>
          <CardList
            cards={cards}
            activeCardId={activeCardId}
            onSelectCard={setActiveCardId}
            onAddCard={handleAddCard}
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

      <Drawer open={showCardDetails} onOpenChange={setShowCardDetails}>
        <DrawerContent className="h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>Detalles de la tarjeta</DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 px-4 pb-6">
            {cardDetailsUrl ? (
              <iframe
                src={cardDetailsUrl}
                title="Detalles de la tarjeta"
                className="h-full w-full rounded-xl border-0"
                sandbox="allow-scripts allow-same-origin"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  No se pudieron cargar los detalles de la tarjeta
                </p>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
