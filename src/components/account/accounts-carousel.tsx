import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Account } from '~/domain/accounts/types';
import { formatCOP, formatUSD, sortBalancesForDisplay } from '~/lib/formatters';
import { cn } from '~/lib/utils';
import { getProductKindIcon } from './product-presentation';

function formatAccountBalanceChip(asset: string, current: string): string {
  const [assetKey, precisionStr] = asset.split('/');
  const precision = Number.parseInt(precisionStr ?? '0', 10);
  const parsed = Number.parseInt(current, 10);
  const amount = Number.isNaN(parsed)
    ? 0
    : parsed / 10 ** (Number.isNaN(precision) ? 0 : precision);

  if (assetKey === 'DUSD' || assetKey === 'USD') return formatUSD(amount);
  return formatCOP(amount);
}

function AccountMiniCard({
  account,
  onClick,
}: {
  account: Account;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const primary = account.products.find(
    (product) => product.urn === account.primaryUrn,
  );
  const Icon = getProductKindIcon(primary?.kind ?? 'other');
  const balance = sortBalancesForDisplay(account.balances)[0];

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex h-[6.5rem] w-[9.5rem] shrink-0 snap-center flex-col justify-between overflow-hidden rounded-2xl border border-border/90 bg-card/80 p-3.5 text-left shadow-[0_14px_25px_-26px_color-mix(in_oklch,var(--foreground)_55%,transparent)] transition-all duration-200 hover:opacity-100 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:shadow-[0_14px_25px_-26px_rgb(0_0_0_/_0.65)]"
      aria-label={t('accountsCarousel.accountAria', { label: account.label })}
    >
      <div className="flex items-center justify-end">
        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-primary/25 bg-primary/[0.06]">
          <Icon className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
        </div>
      </div>

      <div className="flex flex-col gap-0.5">
        <p className="truncate text-xs font-medium text-foreground">
          {account.label}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {balance
            ? formatAccountBalanceChip(balance.asset, balance.current)
            : t('accountsCarousel.noBalance')}
        </p>
      </div>
    </button>
  );
}

export function AccountsCarousel({
  accounts,
  onSelectAccount,
  onAddAccount,
  highlightAdd = false,
}: {
  accounts: Account[];
  onSelectAccount: (urn: string) => void;
  onAddAccount: () => void;
  /**
   * Highlights the "+ new account" card to guide a genuinely accountless
   * user there. Callers must gate this on their accounts query having
   * settled — `accounts` reads as `[]` while it's still loading too, and
   * that must not read as "confirmed empty" (see BQE-2653).
   */
  highlightAdd?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none"
      role="listbox"
      aria-label={t('accountsCarousel.myAccountsAria')}
    >
      {accounts.map((account) => (
        <AccountMiniCard
          key={account.ledgerId}
          account={account}
          onClick={() => onSelectAccount(account.primaryUrn)}
        />
      ))}
      <button
        type="button"
        onClick={onAddAccount}
        className={cn(
          'flex h-[6.5rem] w-[9.5rem] shrink-0 snap-center flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed bg-card/35 transition-colors hover:bg-muted',
          highlightAdd ? 'border-primary/60' : 'border-border',
        )}
        aria-label={t('accountsCarousel.createNewAria')}
      >
        <div
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-2xl border',
            highlightAdd ? 'border-primary/60' : 'border-border',
          )}
        >
          <Plus
            className={cn(
              'h-4 w-4',
              highlightAdd ? 'text-primary' : 'text-muted-foreground',
            )}
            strokeWidth={1.5}
          />
        </div>
        <span
          className={cn(
            'text-[10px] font-medium',
            highlightAdd
              ? 'text-primary underline underline-offset-2'
              : 'text-muted-foreground',
          )}
        >
          {t('accountsCarousel.newAccount')}
        </span>
      </button>
    </div>
  );
}
