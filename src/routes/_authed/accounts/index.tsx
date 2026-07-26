import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, ChevronRight, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CreateAccountDrawer } from '~/components/account/create-account-drawer';
import {
  getProductKindIcon,
  getProductKindLabel,
} from '~/components/account/product-presentation';
import { Button } from '~/components/ui/button';
import type { Account } from '~/domain/accounts/types';
import { useAccounts } from '~/hooks/accounts/use-accounts';
import { formatCOP, formatUSD, sortBalancesForDisplay } from '~/lib/formatters';

export const Route = createFileRoute('/_authed/accounts/')({
  component: RouteComponent,
});

function formatAssetBalanceChip(asset: string, current: string): string {
  const [assetKey, precisionStr] = asset.split('/');
  const precision = Number.parseInt(precisionStr ?? '0', 10);
  const parsed = Number.parseInt(current, 10);
  const amount = Number.isNaN(parsed)
    ? 0
    : parsed / 10 ** (Number.isNaN(precision) ? 0 : precision);

  if (assetKey === 'DUSD' || assetKey === 'USD') return formatUSD(amount);
  return formatCOP(amount);
}

function getCompositionLabel(account: Account) {
  const associated = account.products.filter(
    (product) => product.urn !== account.primaryUrn,
  );

  if (associated.length === 0) {
    const primary = account.products.find(
      (product) => product.urn === account.primaryUrn,
    );
    return primary
      ? `${getProductKindLabel(primary.kind)} • ${primary.status}`
      : 'Sin productos asociados';
  }

  return associated
    .map((product) => getProductKindLabel(product.kind))
    .join(' • ');
}

function RouteComponent() {
  const navigate = useNavigate();
  const accountsQuery = useAccounts();
  const accounts = accountsQuery.data ?? [];
  const [showCreateDrawer, setShowCreateDrawer] = useState(false);

  useEffect(() => {
    if (accounts.length === 1 && accounts[0]) {
      navigate({
        to: '/accounts/$urn',
        params: { urn: accounts[0].primaryUrn },
        replace: true,
      });
    }
  }, [accounts, navigate]);

  if (accounts.length === 1) {
    return null;
  }

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
        <h1 className="text-xl font-bold tracking-[-0.025em] text-foreground">
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
            const primary = account.products.find(
              (product) => product.urn === account.primaryUrn,
            );
            const Icon = getProductKindIcon(primary?.kind ?? 'other');
            const displayBalances = sortBalancesForDisplay(account.balances);

            return (
              <Link
                key={account.ledgerId}
                to="/accounts/$urn"
                params={{ urn: account.primaryUrn }}
                className="flex items-center gap-3 rounded-2xl border border-border/75 bg-card/80 p-4 transition-colors hover:bg-muted/60"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/[0.06]">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {account.label}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {getCompositionLabel(account)}
                  </p>
                  {displayBalances.length > 0 ? (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {displayBalances.map((balance) => (
                        <span
                          key={balance.asset}
                          className="rounded-full border border-border/70 bg-background/70 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                        >
                          {formatAssetBalanceChip(
                            balance.asset,
                            balance.current,
                          )}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            );
          })}
        </section>
      )}

      <Button
        variant="outline"
        onClick={() => setShowCreateDrawer(true)}
        className="h-12 w-full gap-2 rounded-2xl text-sm font-medium"
      >
        <Plus className="h-4 w-4" />
        Crear Nueva Cuenta
      </Button>

      <CreateAccountDrawer
        open={showCreateDrawer}
        onOpenChange={setShowCreateDrawer}
      />
    </div>
  );
}
