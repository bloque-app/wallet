import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { CreditCard, LoaderCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { CardActive } from '~/components/card/card-active';
import { CardList } from '~/components/card/card-list';
import { CardNoCard } from '~/components/card/card-no-card';
import { Button } from '~/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '~/components/ui/drawer';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { useAuth } from '~/contexts/auth/auth-context';
import { CardsSkeleton } from './-components/cards-skeleton';
import {
  useCardDetails,
  useCards,
  useCardToggleFreeze,
  useCreateCard,
} from './-hooks/use-card';

export const Route = createFileRoute('/_authed/card/')({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading: isLoadingCards } = useCards();
  const rawCards = (data?.accounts ?? []) as unknown as Array<
    { medium?: string } & NonNullable<typeof data>['accounts'][number]
  >;
  const cards = rawCards.filter(
    (account) => account.medium === undefined || account.medium === 'card',
  );
  const {
    mutateAsync,
    data: cardDetails,
    isPending: isQuickViewLoading,
  } = useCardDetails();
  const cardDetailsUrl = cardDetails?.detailsUrl ?? null;
  const toggleFreezeMutation = useCardToggleFreeze();
  const createCardMutation = useCreateCard();

  const { user } = useAuth();
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [showCardDetails, setShowCardDetails] = useState(false);
  const [showCreateDrawer, setShowCreateDrawer] = useState(false);
  const [cardName, setCardName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const kycStatus =
    user?.kycStatus === 'not_verified' || !user?.kycStatus
      ? 'not_started'
      : user.kycStatus;
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

  const handleAddCard = () => {
    if (kycStatus !== 'approved') {
      navigate({ to: '/kyc' });
      return;
    }
    const defaultName =
      cards.length === 0 ? 'Personal' : `Tarjeta ${cards.length + 1}`;
    setCardName(defaultName);
    setShowCreateDrawer(true);
    setTimeout(() => inputRef.current?.select(), 150);
  };

  const handleCreateCard = async () => {
    if (!cardName.trim()) return;
    try {
      await createCardMutation.mutateAsync(cardName.trim());
      await queryClient.invalidateQueries({ queryKey: ['cards'] });
      setShowCreateDrawer(false);
      toast.success('Tarjeta creada exitosamente');
    } catch {
      toast.error('No se pudo crear la tarjeta. Intenta de nuevo.');
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

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-[-0.025em] text-foreground">
        Tarjetas
      </h1>

      {isLoadingCards ? (
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

      {/* Create card drawer */}
      <Drawer
        open={showCreateDrawer}
        onOpenChange={(open) => {
          if (!createCardMutation.isPending) setShowCreateDrawer(open);
        }}
      >
        <DrawerContent>
          <DrawerHeader className="text-left">
            <div className="mb-1 flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
              <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground/60">
                Nueva tarjeta
              </span>
            </div>
            <DrawerTitle className="text-lg font-bold tracking-[-0.02em]">
              Tarjeta virtual
            </DrawerTitle>
          </DrawerHeader>

          <div className="px-5 pb-2">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="card-name-input"
                  className="text-sm font-medium text-foreground"
                >
                  Nombre de la tarjeta
                </Label>
                <Input
                  id="card-name-input"
                  ref={inputRef}
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateCard();
                  }}
                  placeholder="Personal"
                  maxLength={40}
                  disabled={createCardMutation.isPending}
                  className="h-12 rounded-xl"
                />
                <p className="text-xs text-muted-foreground">
                  Solo tú verás este nombre. Puedes cambiarlo después.
                </p>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/[0.06]">
                  <CreditCard
                    className="h-4 w-4 text-primary"
                    strokeWidth={1.5}
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="text-xs font-medium text-foreground">
                    Tarjeta virtual USD
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Sin costo de emisión · Aceptada en todo el mundo
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DrawerFooter>
            <Button
              onClick={handleCreateCard}
              disabled={!cardName.trim() || createCardMutation.isPending}
              className="h-12 w-full gap-2 rounded-xl text-sm font-medium"
            >
              {createCardMutation.isPending ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Creando tarjeta...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  Crear tarjeta
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowCreateDrawer(false)}
              disabled={createCardMutation.isPending}
              className="h-10 w-full text-sm text-muted-foreground"
            >
              Cancelar
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Card quick-view drawer */}
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
