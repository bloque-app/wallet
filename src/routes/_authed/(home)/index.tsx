import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { AccountsCarousel } from '~/components/account/accounts-carousel';
import { CreateAccountDrawer } from '~/components/account/create-account-drawer';
import { MovementRow } from '~/components/movement-row';
import { useAccounts } from '~/hooks/accounts/use-accounts';
import { useGlobalTransactions } from '~/hooks/accounts/use-global-transactions';
import { type Asset, formatAmount, type Movement } from '~/lib/formatters';
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

function RouteComponent() {
  const navigate = useNavigate();
  const { data: balancesData, isLoading: isLoadingBalances } = useBalance();
  const { data: transactionsData, isLoading: isLoadingTransactions } =
    useGlobalTransactions(5);
  const accountsQuery = useAccounts();

  const parsedBalances = useMemo(
    () => parseBalances(balancesData as BalancesResponse),
    [balancesData],
  );

  const showBalances = useShowBalances();
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(
    null,
  );
  const [selectedAsset, setSelectedAsset] = useState<Asset>('USD');
  const [showCreateAccount, setShowCreateAccount] = useState(false);

  const accounts = accountsQuery.data ?? [];
  const assets: Asset[] = ['USD', 'COP'];
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
        </div>
      </section>

      <QuickActions />

      <div className="my-1 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
            Cuentas
          </p>
          <Link
            to="/accounts"
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Ver todas
          </Link>
        </div>
        <AccountsCarousel
          accounts={accounts}
          onSelectAccount={(urn) =>
            navigate({ to: '/accounts/$urn', params: { urn } })
          }
          onAddAccount={() => setShowCreateAccount(true)}
        />
      </section>

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

      <CreateAccountDrawer
        open={showCreateAccount}
        onOpenChange={setShowCreateAccount}
      />
    </div>
  );
}
