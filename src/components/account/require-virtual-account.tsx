import { useNavigate } from '@tanstack/react-router';
import { Wallet } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CreateAccountDrawer } from '~/components/account/create-account-drawer';
import { BackButton } from '~/components/back-button';
import { Button } from '~/components/ui/button';
import type { Account } from '~/domain/accounts/types';
import { hasActiveVirtualAccount } from '~/domain/accounts/virtual-account';
import { useAccounts } from '~/hooks/accounts/use-accounts';

const PENDING_POCKET_POLL_MS = 3000;

function hasPendingPocket(accounts: Account[] | undefined): boolean {
  return (accounts ?? []).some((account) =>
    account.products.some(
      (product) =>
        product.kind === 'pocket' &&
        product.urn === account.primaryUrn &&
        product.status !== 'active',
    ),
  );
}

/** Renders `children` only once the user holds an active virtual account. */
export function RequireVirtualAccount({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const accountsQuery = useAccounts({
    refetchInterval: (query) =>
      hasPendingPocket(query.state.data) &&
      !hasActiveVirtualAccount(query.state.data ?? [])
        ? PENDING_POCKET_POLL_MS
        : false,
  });

  if (accountsQuery.isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {['a', 'b', 'c'].map((key) => (
          <div
            key={key}
            className="h-16 animate-pulse rounded-2xl border border-border/75 bg-card/80"
          />
        ))}
      </div>
    );
  }

  if (hasActiveVirtualAccount(accountsQuery.data ?? [])) {
    return children;
  }

  const isError = accountsQuery.isError;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <BackButton onClick={() => void navigate({ to: '/' })} />
      </div>
      <section className="flex flex-col items-center gap-3 rounded-3xl border border-border/75 bg-card/85 px-6 py-10 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/25 bg-primary/[0.06]">
          <Wallet className="h-5 w-5 text-primary" />
        </div>
        <p className="text-base font-semibold text-foreground">
          {isError
            ? t('virtualAccountGate.loadError')
            : t('virtualAccountGate.title')}
        </p>
        {isError ? null : (
          <p className="text-sm text-muted-foreground">
            {t('virtualAccountGate.description')}
          </p>
        )}
        <Button
          className="mt-2 h-11 w-full rounded-xl text-sm font-medium"
          onClick={() =>
            isError ? void accountsQuery.refetch() : setShowCreate(true)
          }
        >
          {isError ? t('common.retry') : t('createAccountDrawer.createAccount')}
        </Button>
      </section>
      <CreateAccountDrawer open={showCreate} onOpenChange={setShowCreate} />
    </div>
  );
}
