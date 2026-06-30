import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { LoaderCircle, Plus, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { MovementRow } from '~/components/movement-row';
import { Button } from '~/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '~/components/ui/drawer';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { useGlobalTransactions } from '~/hooks/use-global-transactions';
import { bloque } from '~/lib/bloque';
import {
  type Asset,
  formatAmount,
  formatKSM,
  formatPolygonAddress,
  type Movement,
} from '~/lib/formatters';
import { useShowBalances } from '~/lib/show-balances';
import { MovementDetailDrawer } from '../../../components/movement-detail-drawer';
import { BalanceToggle } from './-components/currency-balance-card';
import { QuickActions } from './-components/quick-actions';
import { useBalance } from './-hooks/use-balance';

export const Route = createFileRoute('/_authed/(home)/')({
  component: RouteComponent,
});

type BalanceData = {
  current: string;
  pending: string;
  in?: string;
  out?: string;
};

type BalancesResponse = Record<string, BalanceData>;

const ASSET_KEY_MAP: Record<string, Asset> = {
  COPM: 'COP',
  DUSD: 'USD',
  KSM: 'KSM',
};

const ASSET_LOGO_MAP: Record<Asset, string> = {
  COP: '/images/assets/cop.webp',
  USD: '/images/assets/usd.webp',
  KSM: '/images/assets/ksm.webp',
};

function parseBalances(
  balances: BalancesResponse | undefined,
): Record<Asset, number> {
  const parsed: Record<Asset, number> = { COP: 0, USD: 0, KSM: 0 };

  if (!balances) return parsed;

  for (const [key, value] of Object.entries(balances)) {
    const [assetKey, precisionStr] = key.split('/');
    const precision = Number.parseInt(precisionStr, 10);
    const mappedAsset = ASSET_KEY_MAP[assetKey];

    if (mappedAsset && !Number.isNaN(precision)) {
      const rawValue = Number.parseInt(value.current, 10);
      parsed[mappedAsset] = rawValue / 10 ** precision;
    }
  }

  return parsed;
}

function getKsmBalance(
  balance:
    | Record<
        string,
        { current: string; pending: string; in: string; out: string }
      >
    | undefined,
): number {
  if (!balance) return 0;
  for (const [key, value] of Object.entries(balance)) {
    const [assetKey, precisionStr] = key.split('/');
    if (assetKey === 'KSM') {
      const precision = Number.parseInt(precisionStr, 10);
      return (
        Number.parseInt(value.current, 10) /
        10 ** (Number.isNaN(precision) ? 0 : precision)
      );
    }
  }
  return 0;
}

function RouteComponent() {
  const queryClient = useQueryClient();
  const { data: balancesData, isLoading: isLoadingBalances } = useBalance();
  const { data: transactionsData, isLoading: isLoadingTransactions } =
    useGlobalTransactions(5);
  const { data: polygonData, isLoading: isLoadingPolygon } = useQuery({
    queryKey: ['polygon-accounts'],
    queryFn: () => bloque.accounts.polygon.list(),
  });
  const createPolygonMutation = useMutation({
    mutationFn: (name: string) =>
      bloque.accounts.polygon.create(name ? { name } : {}),
  });

  const parsedBalances = useMemo(
    () => parseBalances(balancesData as BalancesResponse),
    [balancesData],
  );

  const showBalances = useShowBalances();
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(
    null,
  );
  const [selectedAsset, setSelectedAsset] = useState<Asset>('COP');
  const [showPolygonAccounts, setShowPolygonAccounts] = useState(false);
  const [showCreatePolygon, setShowCreatePolygon] = useState(false);
  const [polygonName, setPolygonName] = useState('');
  const polygonNameRef = useRef<HTMLInputElement>(null);

  const polygonAccounts = polygonData?.accounts ?? [];

  const assets: Asset[] = ['COP', 'USD', 'KSM'];
  const selectedBalance = parsedBalances[selectedAsset] ?? 0;

  const recentMovements = transactionsData?.movements ?? [];

  const handleCreatePolygon = async () => {
    try {
      await createPolygonMutation.mutateAsync(polygonName.trim());
      await queryClient.invalidateQueries({ queryKey: ['polygon-accounts'] });
      setShowCreatePolygon(false);
      setPolygonName('');
      toast.success('Cuenta Polygon creada');
    } catch {
      toast.error('Error al crear la cuenta Polygon');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl border border-border/75 bg-card/80 p-5 shadow-[0_18px_36px_-34px_color-mix(in_oklch,var(--foreground)_40%,transparent)] dark:shadow-[0_18px_36px_-34px_rgb(0_0_0_/_0.75)]">
        <div className="mb-4 flex gap-2">
          {assets.map((asset) => {
            const isActive = selectedAsset === asset;
            return (
              <button
                key={asset}
                type="button"
                onClick={() => setSelectedAsset(asset)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : 'border-border/60 bg-background/70 text-muted-foreground hover:text-foreground'
                }`}
              >
                <img
                  src={ASSET_LOGO_MAP[asset]}
                  alt={`Logo ${asset}`}
                  className="h-3.5 w-3.5 rounded-full object-cover"
                />
                {asset}
              </button>
            );
          })}
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
              Saldo disponible
            </p>
            <BalanceToggle />
          </div>
          <p className="text-3xl font-bold tabular-nums tracking-[-0.025em] text-foreground">
            {isLoadingBalances
              ? '...'
              : showBalances
                ? formatAmount(selectedAsset, selectedBalance)
                : '••••••'}
          </p>
          <p className="text-xs text-muted-foreground">{selectedAsset}</p>
          {selectedAsset === 'KSM' && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowPolygonAccounts(true)}
                className="rounded-full border border-border px-2.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              >
                Ver detalles
              </button>
            </div>
          )}
        </div>
      </section>

      <QuickActions />

      <div className="my-1 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
            Movimientos recientes
          </p>
          <Link
            to="/movements"
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Ver más
          </Link>
        </div>
        {isLoadingTransactions ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-8">
            <p className="text-sm text-muted-foreground">
              Cargando movimientos...
            </p>
          </div>
        ) : recentMovements.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-8">
            <p className="text-sm text-muted-foreground">Sin movimientos</p>
            <p className="text-xs text-muted-foreground">
              Realiza tu primera recarga para comenzar
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {recentMovements.map((m) => (
              <MovementRow
                key={m.id}
                movement={m}
                onClick={() => setSelectedMovement(m)}
              />
            ))}
          </div>
        )}
      </section>

      <MovementDetailDrawer
        movement={selectedMovement}
        open={!!selectedMovement}
        onClose={() => setSelectedMovement(null)}
      />

      {/* Polygon accounts drawer */}
      <Drawer
        open={showPolygonAccounts}
        onOpenChange={(nextOpen) => !nextOpen && setShowPolygonAccounts(false)}
      >
        <DrawerContent>
          <DrawerHeader className="text-left">
            <div className="flex items-center justify-between">
              <DrawerTitle className="text-lg font-bold text-foreground">
                Cuentas Polygon
              </DrawerTitle>
              <DrawerClose asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-xl"
                  aria-label="Cerrar"
                >
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </div>
            <DrawerDescription>
              Administra tus cuentas con saldo en KSM.
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-5 pb-2">
            <div className="flex flex-col overflow-hidden rounded-2xl border border-border/85 bg-card/75">
              {isLoadingPolygon ? (
                <div className="flex items-center justify-center px-4 py-6">
                  <LoaderCircle className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : polygonAccounts.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No tienes cuentas Polygon creadas.
                </div>
              ) : (
                polygonAccounts.map((account, index) => (
                  <div key={account.id}>
                    <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <p className="truncate text-sm font-medium text-foreground">
                          {account.metadata?.name ||
                            formatPolygonAddress(account.address)}
                        </p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {formatPolygonAddress(account.address)}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                        {formatKSM(
                          getKsmBalance(
                            account.balance as Parameters<
                              typeof getKsmBalance
                            >[0],
                          ),
                        )}
                      </p>
                    </div>
                    {index < polygonAccounts.length - 1 && (
                      <div className="h-px w-full bg-border/50" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <DrawerFooter>
            <Button
              onClick={() => {
                setPolygonName('');
                setShowCreatePolygon(true);
                setTimeout(() => polygonNameRef.current?.focus(), 150);
              }}
              className="h-12 w-full gap-2 rounded-2xl text-sm"
            >
              <Plus className="h-4 w-4" />
              Agregar cuenta
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Create polygon account drawer */}
      <Drawer
        open={showCreatePolygon}
        onOpenChange={(open) => {
          if (!createPolygonMutation.isPending) setShowCreatePolygon(open);
        }}
      >
        <DrawerContent>
          <DrawerHeader className="text-left">
            <div className="mb-1 flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
              <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground/60">
                Nueva cuenta
              </span>
            </div>
            <DrawerTitle className="text-lg font-bold tracking-[-0.02em]">
              Cuenta Polygon
            </DrawerTitle>
          </DrawerHeader>

          <div className="px-5 pb-2">
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="polygon-name-input"
                className="text-sm font-medium text-foreground"
              >
                Nombre (opcional)
              </Label>
              <Input
                id="polygon-name-input"
                ref={polygonNameRef}
                value={polygonName}
                onChange={(e) => setPolygonName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreatePolygon();
                }}
                placeholder="Principal"
                maxLength={40}
                disabled={createPolygonMutation.isPending}
                className="h-12 rounded-xl"
              />
              <p className="text-xs text-muted-foreground">
                Se creará una nueva wallet en la red Polygon.
              </p>
            </div>
          </div>

          <DrawerFooter>
            <Button
              onClick={handleCreatePolygon}
              disabled={createPolygonMutation.isPending}
              className="h-12 w-full gap-2 rounded-xl text-sm font-medium"
            >
              {createPolygonMutation.isPending ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Crear cuenta
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowCreatePolygon(false)}
              disabled={createPolygonMutation.isPending}
              className="h-10 w-full text-sm text-muted-foreground"
            >
              Cancelar
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
