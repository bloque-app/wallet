import { createFileRoute, Link } from '@tanstack/react-router';
import { Plus, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
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
import { Separator } from '~/components/ui/separator';
import { useGlobalTransactions } from '~/hooks/use-global-transactions';
import {
  type Asset,
  formatAmount,
  formatKSM,
  formatPolygonAddress,
  type Movement,
} from '~/lib/mock-data';
import { useWallet } from '~/lib/wallet-mock';
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
  COPB: 'COP',
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

function RouteComponent() {
  const { data: balancesData, isLoading: isLoadingBalances } = useBalance();
  const { data: transactionsData, isLoading: isLoadingTransactions } =
    useGlobalTransactions(5);

  const parsedBalances = useMemo(
    () => parseBalances(balancesData as BalancesResponse),
    [balancesData],
  );

  const {
    showBalances,
    polygonAccounts,
    addPolygonAccount,
    removePolygonAccount,
  } = useWallet();
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(
    null,
  );
  const [selectedAsset, setSelectedAsset] = useState<Asset>('COP');
  const [showPolygonAccounts, setShowPolygonAccounts] = useState(false);
  const handleAddPolygonAccount = () => {
    const label = window.prompt('Nombre de la nueva cuenta Polygon', '');
    if (!label?.trim()) return;
    addPolygonAccount(label.trim());
  };

  const assets: Asset[] = ['COP', 'USD', 'KSM'];
  const selectedBalance = parsedBalances[selectedAsset] ?? 0;

  const recentMovements = transactionsData?.movements ?? [];

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
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background/70 text-muted-foreground hover:text-foreground'
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
          <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
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

      <Separator className="my-1" />

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
              {polygonAccounts.map((account, index) => (
                <div key={account.id}>
                  <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <p className="truncate text-sm font-medium text-foreground">
                        {account.label}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {formatPolygonAddress(account.address)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold tabular-nums text-foreground">
                        {formatKSM(account.balance)}
                      </p>
                      <button
                        type="button"
                        onClick={() => removePolygonAccount(account.id)}
                        className="rounded-xl border border-transparent p-1 text-muted-foreground transition-colors hover:border-border hover:text-foreground"
                        aria-label={`Eliminar ${account.label}`}
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                  {index < polygonAccounts.length - 1 && <Separator />}
                </div>
              ))}
              {polygonAccounts.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No tienes cuentas Polygon creadas.
                </div>
              )}
            </div>
          </div>

          <DrawerFooter>
            <Button
              onClick={handleAddPolygonAccount}
              className="h-12 w-full gap-2 rounded-2xl text-sm"
            >
              <Plus className="h-4 w-4" />
              Agregar cuenta
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
