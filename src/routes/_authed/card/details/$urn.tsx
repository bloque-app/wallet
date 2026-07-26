import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Lock, Pencil, Unlock } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { MovementDetailDrawer } from '~/components/movement-detail-drawer';
import { MovementRow } from '~/components/movement-row';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import {
  useCardToggleFreeze,
  useCardUpdateName,
} from '~/hooks/accounts/use-cards';
import { formatAmount, formatDate, type Movement } from '~/lib/formatters';
import { cn } from '~/lib/utils';
import { BalanceSkeleton } from './-components/balance-skeleton';
import { CardInfoSkeleton } from './-components/card-info-skeleton';
import { MovementsSkeleton } from './-components/movements-skeleton';
import { MOVEMENT_FILTERS, useCardDetail } from './-hooks/use-card-detail';

export const Route = createFileRoute('/_authed/card/details/$urn')({
  component: RouteComponent,
});

const ASSET_LOGO_MAP: Record<string, string> = {
  COP: '/images/assets/cop.webp',
  USD: '/images/assets/usd.webp',
  KSM: '/images/assets/ksm.webp',
};

function RouteComponent() {
  const { urn } = Route.useParams();
  const queryClient = useQueryClient();
  const {
    isLoadingCard,
    selectedCard,
    cardLabel,
    isLoadingBalance,
    assetList,
    currentAssetKey,
    assetBalance,
    displayAsset,
    showBalances,
    setSelectedAssetKey,
    isLoadingTransactions,
    filteredMovements,
    movementFilter,
    setMovementFilter,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCardDetail(urn);

  const toggleFreezeMutation = useCardToggleFreeze();
  const updateNameMutation = useCardUpdateName();
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [newCardName, setNewCardName] = useState('');
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(
    null,
  );

  const handleToggleFreeze = async () => {
    if (!selectedCard) return;

    const isFrozen = selectedCard.status === 'frozen';
    const action = isFrozen ? 'activar' : 'congelar';

    try {
      await toggleFreezeMutation.mutateAsync({
        urn,
        freeze: !isFrozen,
      });

      await queryClient.invalidateQueries({ queryKey: ['card-detail', urn] });

      toast.success(
        `Tarjeta ${isFrozen ? 'activada' : 'congelada'} exitosamente`,
      );
    } catch (error) {
      toast.error(`Error al ${action} la tarjeta`);
      console.error('Error toggling freeze:', error);
    }
  };

  const handleUpdateName = async () => {
    if (!selectedCard) return;

    setNewCardName(cardLabel);
    setShowRenameDialog(true);
  };

  const handleConfirmUpdateName = async () => {
    if (!selectedCard) return;

    const trimmedName = newCardName.trim();
    if (!trimmedName) return;
    if (trimmedName === cardLabel) {
      setShowRenameDialog(false);
      return;
    }

    try {
      await updateNameMutation.mutateAsync({
        urn,
        name: trimmedName,
      });

      await queryClient.invalidateQueries({ queryKey: ['card-detail', urn] });

      toast.success('Nombre de tarjeta actualizado exitosamente');
      setShowRenameDialog(false);
    } catch (error) {
      toast.error('Error al actualizar el nombre de la tarjeta');
      console.error('Error updating card name:', error);
    }
  };

  if (!isLoadingCard && !selectedCard) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <p className="text-sm text-muted-foreground">
          No encontramos una tarjeta para mostrar.
        </p>
        <Link
          to="/card"
          className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          Volver a tarjetas
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Link
          to="/card"
          className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver
        </Link>
        <h1 className="text-xl font-bold tracking-[-0.025em] text-foreground">
          Detalle de tarjeta
        </h1>
      </div>

      {isLoadingCard ? (
        <CardInfoSkeleton />
      ) : (
        <section className="rounded-3xl border border-border/80 bg-card/80 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {cardLabel}
                </p>
                <p className="text-xs text-muted-foreground">
                  •••• {selectedCard?.lastFour}
                </p>
              </div>
              <button
                type="button"
                onClick={handleUpdateName}
                disabled={updateNameMutation.isPending}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/80 bg-background/70 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                title="Editar nombre"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'rounded-full border px-2.5 py-1 text-[11px] uppercase',
                  selectedCard?.status === 'frozen'
                    ? 'border-border bg-muted text-muted-foreground'
                    : 'border-primary/30 bg-primary/10 text-primary',
                )}
              >
                {selectedCard?.status === 'frozen' ? 'Congelada' : 'Activa'}
              </span>
              <button
                type="button"
                onClick={handleToggleFreeze}
                disabled={toggleFreezeMutation.isPending}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50',
                  selectedCard?.status === 'frozen'
                    ? 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground',
                )}
              >
                {toggleFreezeMutation.isPending ? (
                  'Procesando...'
                ) : selectedCard?.status === 'frozen' ? (
                  <>
                    <Unlock className="h-3.5 w-3.5" />
                    Activar
                  </>
                ) : (
                  <>
                    <Lock className="h-3.5 w-3.5" />
                    Congelar
                  </>
                )}
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-border/75 bg-card/80 p-5">
        <p className="mb-3 text-xs font-medium tracking-wider text-muted-foreground uppercase">
          Monedas de recarga
        </p>
        {isLoadingBalance ? (
          <BalanceSkeleton />
        ) : (
          <>
            <div className="mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {assetList.map((asset) => (
                <button
                  key={asset.sdkKey}
                  type="button"
                  onClick={() => setSelectedAssetKey(asset.sdkKey)}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    currentAssetKey === asset.sdkKey
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background/70 text-muted-foreground hover:text-foreground',
                  )}
                >
                  {ASSET_LOGO_MAP[asset.code] && (
                    <img
                      src={ASSET_LOGO_MAP[asset.code]}
                      alt={`Logo ${asset.code}`}
                      className="h-3.5 w-3.5 rounded-full object-cover"
                    />
                  )}
                  {asset.code}
                </button>
              ))}
            </div>
            <p className="text-3xl font-bold tabular-nums tracking-[-0.025em] text-foreground">
              {showBalances
                ? formatAmount(displayAsset, assetBalance)
                : '••••••'}
            </p>
            <p className="text-xs text-muted-foreground">
              Saldo disponible para recargar en {displayAsset}
            </p>
          </>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
            Movimientos
          </p>
          <p className="text-xs text-muted-foreground">
            {filteredMovements.length} registros
          </p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {MOVEMENT_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setMovementFilter(filter.value)}
              className={cn(
                'shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all',
                movementFilter === filter.value
                  ? 'border-foreground bg-foreground text-background shadow-[0_14px_20px_-18px_color-mix(in_oklch,var(--foreground)_75%,transparent)]'
                  : 'border-border bg-card text-muted-foreground hover:border-foreground hover:text-foreground',
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {isLoadingTransactions ? (
          <MovementsSkeleton />
        ) : filteredMovements.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Sin movimientos para este filtro
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredMovements.map((movement) => (
              <MovementRow
                key={movement.id}
                movement={movement}
                onClick={() => setSelectedMovement(movement)}
              />
            ))}
            {hasNextPage && (
              <button
                type="button"
                onClick={() => fetchNextPage()}
                className="mt-2 w-full rounded-2xl border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-60"
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? 'Cargando...' : 'Ver más'}
              </button>
            )}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border/75 bg-card/75 p-4">
        <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
          Ultima actividad
        </p>
        <p className="mt-1 text-sm text-foreground">
          {filteredMovements[0]?.createdAt
            ? formatDate(filteredMovements[0].createdAt)
            : 'Sin actividad reciente'}
        </p>
      </section>

      <AlertDialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cambiar nombre de tarjeta</AlertDialogTitle>
            <AlertDialogDescription>
              Ingresa el nuevo nombre para tu tarjeta
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="card-name" className="text-sm font-medium">
              Nombre de la tarjeta
            </Label>
            <Input
              id="card-name"
              type="text"
              value={newCardName}
              onChange={(e) => setNewCardName(e.target.value)}
              placeholder="Ej: Personal, Negocios..."
              className="mt-2"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleConfirmUpdateName();
                }
              }}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmUpdateName}
              disabled={updateNameMutation.isPending || !newCardName.trim()}
            >
              {updateNameMutation.isPending ? 'Guardando...' : 'Guardar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MovementDetailDrawer
        movement={selectedMovement}
        open={!!selectedMovement}
        onClose={() => setSelectedMovement(null)}
      />
    </div>
  );
}
