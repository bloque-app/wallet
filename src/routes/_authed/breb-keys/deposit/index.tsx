import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { ArrowLeft, Check, Copy, KeyRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { BrebKeyProduct } from '~/domain/accounts/types';
import { useAccounts } from '~/hooks/accounts/use-accounts';
import { goBackOrFallback } from '~/lib/navigation';

export const Route = createFileRoute('/_authed/breb-keys/deposit/')({
  validateSearch: (search: Record<string, unknown>) => ({
    from: (search.from as string | undefined) ?? '/breb-keys',
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useTranslation();
  const { from } = Route.useSearch();
  const { history } = useRouter();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const accountsQuery = useAccounts();
  const brebProducts = useMemo(
    () =>
      (accountsQuery.data ?? []).flatMap((account) =>
        account.products.filter(
          (product): product is BrebKeyProduct => product.kind === 'breb',
        ),
      ),
    [accountsQuery.data],
  );

  const activeKeys = brebProducts.filter((p) => p.status === 'active');

  const copyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedKey(key);
      toast.success(t('brebKeys.deposit.keyCopiedToast'));
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      toast.error(t('brebKeys.deposit.copyErrorToast'));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => goBackOrFallback(() => history.push(from))}
          className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('common.back')}
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-[-0.025em] text-foreground">
            {t('brebKeys.menu.deposit.title')}
          </h1>
          <p className="text-xs text-muted-foreground">
            {t('brebKeys.menu.deposit.description')}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-primary/20 bg-primary/[0.06] p-4">
        <p className="text-sm font-semibold tracking-[-0.015em] text-foreground">
          {t('brebKeys.deposit.receiveWithKeys')}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {t('brebKeys.deposit.receiveWithKeysDescription')}
        </p>
      </div>

      {accountsQuery.isLoading ? (
        <div className="flex flex-col gap-3">
          {['a', 'b', 'c'].map((k) => (
            <div
              key={k}
              className="h-20 animate-pulse rounded-2xl border border-border/75 bg-card/80"
            />
          ))}
        </div>
      ) : activeKeys.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border/75 bg-card/80 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/[0.06]">
            <KeyRound className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {t('brebKeys.deposit.noActiveKeys')}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('brebKeys.deposit.noActiveKeysHint')}
            </p>
          </div>
          <Link
            to="/breb-keys/manage-keys"
            search={{ ledgerId: undefined }}
            className="inline-flex h-10 items-center rounded-xl border border-primary/30 bg-primary/[0.06] px-4 text-xs font-medium text-primary"
          >
            {t('brebKeys.deposit.registerKey')}
          </Link>
        </div>
      ) : (
        <section className="flex flex-col gap-3">
          {activeKeys.map((account) => (
            <div
              key={account.urn}
              className="flex items-center gap-4 rounded-2xl border border-border/75 bg-card/80 px-4 py-4"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/[0.06]">
                <KeyRound className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {account.keyValue}
                </p>
                <p className="text-xs text-muted-foreground">
                  {account.displayName ??
                    account.keyType ??
                    t('accounts.detail.brebKeyLabel')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => copyKey(account.keyValue)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-background/70 transition-all hover:bg-muted/70"
              >
                {copiedKey === account.keyValue ? (
                  <Check className="h-4 w-4 text-primary" />
                ) : (
                  <Copy className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
