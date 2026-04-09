import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import {
  ArrowLeft,
  ChevronRight,
  CreditCard,
  Landmark,
  Wallet,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { MovementDetailDrawer } from '~/components/movement-detail-drawer';
import { MovementRow } from '~/components/movement-row';
import { Button } from '~/components/ui/button';
import { bloque } from '~/lib/bloque';
import type { Asset, Movement } from '~/lib/mock-data';
import { cn } from '~/lib/utils';

export const Route = createFileRoute('/_authed/accounts/$urn')({
  component: RouteComponent,
});

type AccountDetails = Awaited<ReturnType<typeof bloque.accounts.get>> & {
  metadata?: Record<string, unknown>;
  medium?: string;
  status?: string;
  ledgerId?: string;
  urn: string;
};

type MovementParams = Parameters<typeof bloque.accounts.movements>[0];

type BalanceEntry = {
  asset: string;
  available: string;
};

const ASSET_LABELS: Record<string, Asset> = {
  COP: 'COP',
  COPB: 'COP',
  COPM: 'COP',
  DUSD: 'USD',
  USD: 'USD',
  KSM: 'KSM',
};

function getMediumLabel(medium?: string) {
  switch (medium) {
    case 'card':
      return 'Tarjeta';
    case 'virtual':
      return 'Virtual';
    case 'breb':
      return 'BRE-B';
    case 'polygon':
      return 'Polygon';
    case 'bancolombia':
      return 'Bancolombia';
    case 'us-account':
      return 'US Account';
    default:
      return medium ?? 'Cuenta';
  }
}

function getMediumIcon(medium?: string) {
  switch (medium) {
    case 'card':
      return CreditCard;
    case 'polygon':
      return Wallet;
    default:
      return Landmark;
  }
}

function normalizeAssetKey(rawAsset: string) {
  if (rawAsset === 'COPB/6') {
    return 'COPM/2';
  }

  return rawAsset;
}

function parseAmount(rawAmount: string, rawAsset: string) {
  const [, precisionStr] = normalizeAssetKey(rawAsset).split('/');
  const parsed = Number.parseInt(rawAmount, 10);
  const precision = Number.parseInt(precisionStr, 10);

  if (Number.isNaN(parsed)) return 0;
  if (Number.isNaN(precision)) return parsed;

  return parsed / 10 ** precision;
}

function getAssetLabel(rawAsset: string): Asset | null {
  const [assetKey] = normalizeAssetKey(rawAsset).split('/');
  return ASSET_LABELS[assetKey] ?? null;
}

function formatBalance(balance: BalanceEntry) {
  const asset = getAssetLabel(balance.asset);
  const amount = parseAmount(balance.available, balance.asset);

  if (asset === 'COP') {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  if (asset === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  return `${amount.toFixed(4)} KSM`;
}

function normalizeBalances(rawBalance: unknown): BalanceEntry[] {
  if (!rawBalance || typeof rawBalance !== 'object') {
    return [];
  }

  const entries = Object.entries(rawBalance as Record<string, unknown>);

  return entries.flatMap(([asset, value]) => {
    if (typeof value === 'string') {
      return [{ asset, available: value }];
    }

    if (!value || typeof value !== 'object') {
      return [];
    }

    const candidate = value as Record<string, unknown>;
    const available =
      typeof candidate.available === 'string'
        ? candidate.available
        : typeof candidate.free === 'string'
          ? candidate.free
          : typeof candidate.total === 'string'
            ? candidate.total
            : null;

    return available ? [{ asset, available }] : [];
  });
}

function toMovement(transaction: {
  reference: string;
  createdAt: string;
  amount: string;
  asset: string;
  status: string;
  direction?: string;
  type?: string;
  railName?: string;
  fromAccountId?: string;
  toAccountId?: string;
  details?: { type?: string };
}): Movement | null {
  const asset = getAssetLabel(transaction.asset);

  if (!asset) return null;

  const rawType = (transaction.type || transaction.details?.type || '')
    .trim()
    .toLowerCase();
  const status = transaction.status.toLowerCase();

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
    (transaction.railName || '').toLowerCase().includes('card')
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
    id: [transaction.reference, transaction.createdAt, transaction.amount].join(
      '-',
    ),
    type,
    asset,
    amount: parseAmount(transaction.amount, transaction.asset),
    fee: 0,
    status: movementStatus,
    createdAt: transaction.createdAt,
    reference: transaction.reference,
    counterparty:
      transaction.direction === 'in'
        ? transaction.fromAccountId
        : transaction.toAccountId,
    direction: transaction.direction === 'in' ? 'incoming' : 'outgoing',
  };
}

function RouteComponent() {
  const { urn } = Route.useParams();
  const [selectedAsset, setSelectedAsset] = useState<string>('');
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(
    null,
  );

  const accountQuery = useQuery({
    queryKey: ['account', urn],
    queryFn: async () => bloque.accounts.get(urn) as Promise<AccountDetails>,
    enabled: !!urn,
  });

  const balanceQuery = useQuery({
    queryKey: ['account-balance', urn],
    queryFn: async () => bloque.accounts.balance(urn),
    enabled: !!urn,
  });

  const balances = useMemo(
    () => normalizeBalances(balanceQuery.data),
    [balanceQuery.data],
  );

  useEffect(() => {
    if (!selectedAsset && balances.length > 0) {
      setSelectedAsset(balances[0]!.asset);
    }
  }, [balances, selectedAsset]);

  const movementsQuery = useInfiniteQuery({
    queryKey: ['account-movements', urn, selectedAsset],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const result = await bloque.accounts.movements({
        urn,
        asset: (selectedAsset ||
          balances[0]?.asset ||
          'COPM/2') as MovementParams['asset'],
        limit: 10,
        next: pageParam,
      });

      return {
        transactions: (result.data ?? []) as Array<{
          reference: string;
          createdAt: string;
          amount: string;
          asset: string;
          status: string;
          direction?: string;
          type?: string;
          railName?: string;
          fromAccountId?: string;
          toAccountId?: string;
          details?: { type?: string };
        }>,
        hasMore: result.hasMore,
        next: result.next,
      };
    },
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.next || undefined : undefined,
    enabled: !!urn && (!!selectedAsset || balances.length > 0),
  });

  const movements = useMemo(
    () =>
      (movementsQuery.data?.pages ?? [])
        .flatMap((page) => page.transactions)
        .map((transaction) => toMovement(transaction))
        .filter((movement): movement is Movement => movement !== null),
    [movementsQuery.data?.pages],
  );

  const account = accountQuery.data;
  const Icon = getMediumIcon(account?.medium);
  const title =
    (account?.metadata?.card_name as string) ||
    (account?.metadata?.name as string) ||
    getMediumLabel(account?.medium);

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
        <h1 className="text-xl font-bold tracking-tight text-foreground">
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
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border/80 bg-background/85">
                <Icon className="h-4 w-4 text-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-foreground">
                  {title}
                </p>
                <p className="text-sm text-muted-foreground">
                  {getMediumLabel(account.medium)} •{' '}
                  {account.status ?? 'sin estado'}
                </p>
                <p className="mt-1 break-all text-[11px] text-muted-foreground">
                  {account.urn}
                </p>
                {account.ledgerId ? (
                  <p className="mt-1 break-all text-[11px] text-muted-foreground">
                    Ledger: {account.ledgerId}
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-3 rounded-3xl border border-border/75 bg-card/85 p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-foreground">
                Balances
              </h2>
              {balanceQuery.isLoading ? (
                <span className="text-xs text-muted-foreground">
                  Cargando...
                </span>
              ) : null}
            </div>

            {balances.length === 0 ? (
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
                      {formatBalance(
                        balances.find(
                          (balance) => balance.asset === selectedAsset,
                        ) ?? balances[0]!,
                      )}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </>
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
    </div>
  );
}
