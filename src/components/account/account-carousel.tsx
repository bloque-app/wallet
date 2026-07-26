import { Label } from '~/components/ui/label';
import type { Account } from '~/domain/accounts/types';
import { cn } from '~/lib/utils';
import { getProductKindIcon } from './product-presentation';

function getUrnTail(urn: string) {
  const segments = urn.split(':');
  return segments[segments.length - 1] || urn;
}

function formatAccountBalance(
  account: Account,
  asset: string,
  precision: number,
): string {
  const entry = account.balances.find((balance) => balance.asset === asset);
  const parsed = entry ? Number.parseInt(entry.current, 10) : Number.NaN;
  const amount = Number.isNaN(parsed) ? 0 : parsed / 10 ** precision;
  return amount.toFixed(2);
}

function AccountCard({
  account,
  asset,
  precision,
  unit,
  isActive,
  onClick,
}: {
  account: Account;
  asset: string;
  precision: number;
  unit: string;
  isActive: boolean;
  onClick: () => void;
}) {
  const primary = account.products.find(
    (product) => product.urn === account.primaryUrn,
  );
  const Icon = getProductKindIcon(primary?.kind ?? 'other');
  const balanceLabel = `${formatAccountBalance(account, asset, precision)} ${unit}`;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex h-[6.5rem] w-52 shrink-0 snap-center flex-col justify-between overflow-hidden rounded-2xl border bg-card/80 p-3.5 text-left transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        isActive
          ? 'border-primary ring-2 ring-primary/45 shadow-[0_20px_28px_-22px_color-mix(in_oklch,var(--foreground)_80%,transparent)] dark:shadow-[0_20px_28px_-22px_rgb(0_0_0_/_0.75)]'
          : 'border-border/90 shadow-[0_14px_25px_-26px_color-mix(in_oklch,var(--foreground)_55%,transparent)] dark:shadow-[0_14px_25px_-26px_rgb(0_0_0_/_0.65)] opacity-90 hover:opacity-100',
      )}
      aria-label={`Cuenta ${account.label}, disponible ${balanceLabel}`}
      aria-pressed={isActive}
    >
      {isActive ? (
        <span className="absolute top-2 left-2 z-10 rounded-full bg-primary px-2 py-0.5 text-[9px] font-semibold tracking-wide text-primary-foreground uppercase">
          Seleccionada
        </span>
      ) : null}

      <div className="flex items-center justify-end">
        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-primary/25 bg-primary/[0.06]">
          <Icon className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
        </div>
      </div>

      <div className="flex flex-col gap-0.5">
        <p className="truncate text-xs text-foreground">
          <span className="font-semibold">{account.label}</span>{' '}
          <span className="text-muted-foreground italic">
            · {getUrnTail(account.primaryUrn)}
          </span>
        </p>
        <p className="font-mono text-[11px] text-muted-foreground">
          {balanceLabel}
        </p>
      </div>
    </button>
  );
}

/**
 * Picks an Account (by ledgerId) from a horizontal carousel — used both to
 * choose which account a new product joins, and to choose which funded
 * account a send flow draws from.
 */
export function AccountCarousel({
  accounts,
  asset,
  precision,
  unit,
  value,
  onChange,
  label = 'Cuenta',
}: {
  accounts: Account[];
  asset: string;
  precision: number;
  unit: string;
  value: string | null;
  onChange: (ledgerId: string) => void;
  label?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <div
        className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none"
        role="listbox"
        aria-label="Cuentas disponibles"
      >
        {accounts.map((account) => (
          <AccountCard
            key={account.ledgerId}
            account={account}
            asset={asset}
            precision={precision}
            unit={unit}
            isActive={account.ledgerId === value}
            onClick={() => onChange(account.ledgerId)}
          />
        ))}
      </div>
    </div>
  );
}
