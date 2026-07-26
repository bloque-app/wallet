import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import {
  ArrowLeft,
  ChevronRight,
  CreditCard,
  KeyRound,
  Plus,
  Wallet,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  getProductKindIcon,
  getProductKindLabel,
} from '~/components/account/product-presentation';
import { MovementDetailDrawer } from '~/components/movement-detail-drawer';
import { MovementRow } from '~/components/movement-row';
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
import type { MovementEntry } from '~/domain/accounts/ports';
import type { AssetBalance, Product } from '~/domain/accounts/types';
import { useAccountMovements } from '~/hooks/accounts/use-account-movements';
import { useAccount } from '~/hooks/accounts/use-accounts';
import { useCreateCard } from '~/hooks/accounts/use-cards';
import { useCreatePolygonAccount } from '~/hooks/accounts/use-polygon-account';
import type { Asset, Movement } from '~/lib/formatters';
import { formatCOP, formatKSM, formatUSD } from '~/lib/formatters';
import { cn } from '~/lib/utils';

export const Route = createFileRoute('/_authed/accounts/$urn')({
  component: RouteComponent,
});

const ASSET_LABELS: Record<string, Asset> = {
  COP: 'COP',
  COPM: 'COP',
  DUSD: 'USD',
  USD: 'USD',
  KSM: 'KSM',
};

type AddProductStep = 'closed' | 'pick' | 'card' | 'polygon';

function parseAmount(rawAmount: string, rawAsset: string) {
  const [, precisionStr] = rawAsset.split('/');
  const parsed = Number.parseInt(rawAmount, 10);
  const precision = Number.parseInt(precisionStr, 10);

  if (Number.isNaN(parsed)) return 0;
  if (Number.isNaN(precision)) return parsed;

  return parsed / 10 ** precision;
}

function getAssetLabel(rawAsset: string): Asset | null {
  const [assetKey] = rawAsset.split('/');
  return ASSET_LABELS[assetKey] ?? null;
}

function formatAssetBalance(balance: AssetBalance) {
  const asset = getAssetLabel(balance.asset);
  const amount = parseAmount(balance.current, balance.asset);

  if (asset === 'USD') return formatUSD(amount);
  if (asset === 'KSM') return formatKSM(amount);
  return formatCOP(amount);
}

function toMovement(entry: MovementEntry): Movement | null {
  const asset = getAssetLabel(entry.asset);

  if (!asset) return null;

  const rawType = entry.type?.trim().toLowerCase() ?? '';
  const status = entry.status.toLowerCase();

  let type: Movement['type'] = 'send';

  if (
    rawType.includes('deposit') ||
    rawType.includes('topup') ||
    rawType.includes('pay-in')
  ) {
    type = 'topup';
  } else if (
    rawType.includes('withdraw') ||
    rawType.includes('payout') ||
    rawType.includes('pay-out')
  ) {
    type = 'withdraw';
  } else if (
    rawType.includes('convert') ||
    rawType.includes('swap') ||
    rawType.includes('exchange')
  ) {
    type = 'convert';
  } else if (
    rawType.includes('card') ||
    rawType.includes('payment') ||
    rawType.includes('purchase') ||
    (entry.railName || '').toLowerCase().includes('card')
  ) {
    type = 'card';
  }

  let movementStatus: Movement['status'] = 'failed';

  if (
    status.includes('pending') ||
    status.includes('queued') ||
    status.includes('process')
  ) {
    movementStatus = 'pending';
  } else if (
    status.includes('complete') ||
    status.includes('success') ||
    status.includes('settled') ||
    status.includes('confirm')
  ) {
    movementStatus = 'completed';
  }

  return {
    id: entry.id,
    type,
    asset,
    amount: parseAmount(entry.amount, entry.asset),
    fee: 0,
    status: movementStatus,
    createdAt: entry.createdAt,
    reference: entry.reference,
    counterparty: entry.counterparty,
    direction: entry.direction === 'in' ? 'incoming' : 'outgoing',
  };
}

function getProductLink(
  product: Product,
): { to: string; params?: Record<string, string> } | null {
  if (product.kind === 'card') {
    return { to: '/card/details/$urn', params: { urn: product.urn } };
  }
  if (product.kind === 'breb') {
    return { to: '/breb-keys/manage-keys' };
  }
  return null;
}

function RouteComponent() {
  const { urn } = Route.useParams();
  const navigate = useNavigate();
  const [selectedAsset, setSelectedAsset] = useState<string>('');
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(
    null,
  );
  const [addProductStep, setAddProductStep] =
    useState<AddProductStep>('closed');
  const [productName, setProductName] = useState('');

  const accountQuery = useAccount(urn);
  const account = accountQuery.data;
  const balances = account?.balances ?? [];

  const createCardMutation = useCreateCard();
  const createPolygonMutation = useCreatePolygonAccount();

  useEffect(() => {
    if (!selectedAsset && balances[0]) {
      setSelectedAsset(balances[0].asset);
    }
  }, [balances, selectedAsset]);

  const movementsAsset = selectedAsset || balances[0]?.asset || 'COPM/2';
  const movementsQuery = useAccountMovements(urn, movementsAsset);

  const movements = useMemo(
    () =>
      (movementsQuery.data?.pages ?? [])
        .flatMap((page) => page.movements)
        .map((entry) => toMovement(entry))
        .filter((movement): movement is Movement => movement !== null),
    [movementsQuery.data?.pages],
  );

  const primaryProduct = account?.products.find(
    (product) => product.urn === account.primaryUrn,
  );
  const associatedProducts =
    account?.products.filter((product) => product.urn !== account.primaryUrn) ??
    [];
  const Icon = getProductKindIcon(primaryProduct?.kind ?? 'other');

  const handlePickProductKind = (kind: 'card' | 'breb' | 'polygon') => {
    if (!account) return;
    if (kind === 'breb') {
      setAddProductStep('closed');
      navigate({
        to: '/breb-keys/manage-keys',
        search: { ledgerId: account.ledgerId },
      });
      return;
    }
    setProductName('');
    setAddProductStep(kind);
  };

  const handleCreateProduct = async () => {
    if (!account) return;
    try {
      if (addProductStep === 'card') {
        await createCardMutation.mutateAsync({
          name: productName.trim() || 'Tarjeta',
          ledgerId: account.ledgerId,
        });
        toast.success('Tarjeta creada exitosamente');
      } else if (addProductStep === 'polygon') {
        await createPolygonMutation.mutateAsync({
          name: productName.trim() || undefined,
          ledgerId: account.ledgerId,
        });
        toast.success('Cuenta Polygon creada');
      }
      setAddProductStep('closed');
    } catch {
      toast.error('No se pudo crear el producto. Intenta de nuevo.');
    }
  };

  const isCreatingProduct =
    createCardMutation.isPending || createPolygonMutation.isPending;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Link
          to="/accounts"
          className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver
        </Link>
        <h1 className="text-xl font-bold tracking-[-0.025em] text-foreground">
          Detalle de cuenta
        </h1>
      </div>

      {accountQuery.isLoading ? (
        <div className="rounded-2xl border border-border/75 bg-card/80 p-4 text-sm text-muted-foreground">
          Cargando cuenta...
        </div>
      ) : !account ? (
        <div className="rounded-2xl border border-border/75 bg-card/80 p-4 text-sm text-muted-foreground">
          No encontramos esta cuenta.
        </div>
      ) : (
        <>
          <section className="rounded-3xl border border-border/75 bg-card/85 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/[0.06]">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-foreground">
                  {account.label}
                </p>
                <p className="text-sm text-muted-foreground">
                  {getProductKindLabel(primaryProduct?.kind ?? 'other')} •{' '}
                  {primaryProduct?.status ?? 'sin estado'}
                </p>
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-3 rounded-3xl border border-border/75 bg-card/85 p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-foreground">
                Balances
              </h2>
            </div>

            {balances.length === 0 || !balances[0] ? (
              <p className="text-sm text-muted-foreground">
                Esta cuenta no tiene balances disponibles.
              </p>
            ) : (
              <>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {balances.map((balance) => {
                    const asset = getAssetLabel(balance.asset);

                    return (
                      <button
                        key={balance.asset}
                        type="button"
                        onClick={() => setSelectedAsset(balance.asset)}
                        className={cn(
                          'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                          selectedAsset === balance.asset
                            ? 'border-foreground bg-foreground text-background'
                            : 'border-border bg-background/70 text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {asset ?? balance.asset}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-border/75 bg-background/70 px-4 py-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Disponible
                    </p>
                    <p className="text-lg font-semibold text-foreground">
                      {formatAssetBalance(
                        balances.find(
                          (balance) => balance.asset === selectedAsset,
                        ) ?? balances[0],
                      )}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </>
            )}
          </section>

          <section className="flex flex-col gap-3 rounded-3xl border border-border/75 bg-card/85 p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-foreground">
                Productos asociados
              </h2>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 rounded-xl px-3 text-xs font-medium"
                onClick={() => setAddProductStep('pick')}
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar producto
              </Button>
            </div>

            {associatedProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Esta cuenta aún no tiene otros productos asociados.
              </p>
            ) : (
              <div className="flex flex-col divide-y divide-border/60">
                {associatedProducts.map((product) => {
                  const ProductIcon = getProductKindIcon(product.kind);
                  const link = getProductLink(product);
                  const content = (
                    <>
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/[0.06]">
                        <ProductIcon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {product.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getProductKindLabel(product.kind)} • {product.status}
                        </p>
                      </div>
                      {link ? (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      ) : null}
                    </>
                  );

                  if (link) {
                    return (
                      <Link
                        key={product.urn}
                        to={link.to}
                        params={link.params}
                        className="flex items-center gap-3 py-3 transition-colors first:pt-0 last:pb-0 hover:bg-muted/40"
                      >
                        {content}
                      </Link>
                    );
                  }

                  return (
                    <div
                      key={product.urn}
                      className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      {content}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-foreground">
                Movimientos
              </h2>
              {selectedAsset ? (
                <span className="text-xs text-muted-foreground">
                  {getAssetLabel(selectedAsset) ?? selectedAsset}
                </span>
              ) : null}
            </div>

            {movementsQuery.isLoading ? (
              <div className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
                Cargando movimientos...
              </div>
            ) : movements.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
                No hay movimientos para esta cuenta.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {movements.map((movement) => (
                  <MovementRow
                    key={movement.id}
                    movement={movement}
                    onClick={() => setSelectedMovement(movement)}
                  />
                ))}

                {movementsQuery.hasNextPage ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-2 h-11 rounded-2xl"
                    onClick={() => movementsQuery.fetchNextPage()}
                    disabled={movementsQuery.isFetchingNextPage}
                  >
                    {movementsQuery.isFetchingNextPage
                      ? 'Cargando...'
                      : 'Ver más'}
                  </Button>
                ) : null}
              </div>
            )}
          </section>
        </>
      )}

      <MovementDetailDrawer
        movement={selectedMovement}
        open={!!selectedMovement}
        onClose={() => setSelectedMovement(null)}
      />

      {/* Add-product drawer: type picker, then (for card/polygon) a name step. Ledger is already known here, so no account picker. */}
      <Drawer
        open={addProductStep !== 'closed'}
        onOpenChange={(open) => !open && setAddProductStep('closed')}
      >
        <DrawerContent>
          {addProductStep === 'pick' ? (
            <>
              <DrawerHeader className="text-left">
                <DrawerTitle className="text-lg font-bold tracking-[-0.025em]">
                  Agregar producto
                </DrawerTitle>
              </DrawerHeader>
              <div className="flex flex-col gap-3 px-5 pb-4">
                {[
                  { kind: 'card' as const, label: 'Tarjeta', icon: CreditCard },
                  {
                    kind: 'breb' as const,
                    label: 'Llave BRE-B',
                    icon: KeyRound,
                  },
                  { kind: 'polygon' as const, label: 'Polygon', icon: Wallet },
                ].map((option) => (
                  <button
                    key={option.kind}
                    type="button"
                    onClick={() => handlePickProductKind(option.kind)}
                    className="flex items-center gap-3 rounded-2xl border border-border/75 bg-background/70 px-4 py-3.5 text-left transition-colors hover:bg-muted/60"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/[0.06]">
                      <option.icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {option.label}
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <DrawerHeader className="text-left">
                <DrawerTitle className="text-lg font-bold tracking-[-0.025em]">
                  {addProductStep === 'card'
                    ? 'Nueva tarjeta'
                    : 'Cuenta Polygon'}
                </DrawerTitle>
              </DrawerHeader>
              <div className="px-5 pb-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="product-name" className="text-sm font-medium">
                    {addProductStep === 'card'
                      ? 'Nombre de la tarjeta'
                      : 'Nombre (opcional)'}
                  </Label>
                  <Input
                    id="product-name"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateProduct();
                    }}
                    placeholder={
                      addProductStep === 'card' ? 'Personal' : 'Principal'
                    }
                    maxLength={40}
                    disabled={isCreatingProduct}
                    className="h-12 rounded-xl"
                  />
                  <p className="text-xs text-muted-foreground">
                    Compartirá el saldo de {account?.label}.
                  </p>
                </div>
              </div>
              <DrawerFooter>
                <Button
                  onClick={handleCreateProduct}
                  disabled={
                    isCreatingProduct ||
                    (addProductStep === 'card' && !productName.trim())
                  }
                  className="h-12 w-full rounded-xl text-sm font-medium"
                >
                  {isCreatingProduct ? 'Creando...' : 'Crear'}
                </Button>
              </DrawerFooter>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
