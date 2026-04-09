import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import {
  ArrowLeft,
  ChevronRight,
  CreditCard,
  Landmark,
  Wallet,
} from 'lucide-react';
import { bloque } from '~/lib/bloque';

export const Route = createFileRoute('/_authed/accounts/')({
  component: RouteComponent,
});

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

function RouteComponent() {
  const accountsQuery = useQuery({
    queryKey: ['all-accounts'],
    queryFn: async () => bloque.accounts.list(),
    staleTime: 30_000,
  });

  const accounts = (accountsQuery.data?.accounts ?? []) as Array<{
    id: string;
    urn: string;
    medium?: string;
    status?: string;
    ledgerId?: string;
    metadata?: Record<string, unknown>;
  }>;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Link
          to="/profile"
          className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Cuentas
        </h1>
      </div>

      {accountsQuery.isLoading ? (
        <div className="rounded-2xl border border-border/75 bg-card/80 p-4 text-sm text-muted-foreground">
          Cargando cuentas...
        </div>
      ) : accounts.length === 0 ? (
        <div className="rounded-2xl border border-border/75 bg-card/80 p-4 text-sm text-muted-foreground">
          No encontramos cuentas para este usuario.
        </div>
      ) : (
        <section className="flex flex-col gap-3">
          {accounts.map((account) => {
            const Icon = getMediumIcon(account.medium);
            const title =
              (account.metadata?.card_name as string) ||
              (account.metadata?.name as string) ||
              getMediumLabel(account.medium);

            return (
              <Link
                key={account.urn}
                to="/accounts/$urn"
                params={{ urn: account.urn }}
                className="flex items-center gap-3 rounded-2xl border border-border/75 bg-card/80 p-4 transition-colors hover:bg-muted/60"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border/80 bg-background/85">
                  <Icon className="h-4 w-4 text-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getMediumLabel(account.medium)} •{' '}
                    {account.status ?? 'sin estado'}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {account.urn}
                  </p>
                  {account.ledgerId ? (
                    <p className="truncate text-[11px] text-muted-foreground">
                      Ledger: {account.ledgerId}
                    </p>
                  ) : null}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
}
