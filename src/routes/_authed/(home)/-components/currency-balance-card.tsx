'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { type Asset, formatAmount } from '~/lib/formatters';
import { setShowBalances, useShowBalances } from '~/lib/show-balances';

interface CurrencyBalanceCardProps {
  asset: Asset;
  balance: number;
  onDetails?: () => void;
}

export function CurrencyBalanceCard({
  asset,
  balance,
  onDetails,
}: CurrencyBalanceCardProps) {
  const { t } = useTranslation();
  const showBalances = useShowBalances();
  const assetLabels: Record<Asset, string> = {
    COP: t('home.assetLabels.cop'),
    USD: t('home.assetLabels.usd'),
    KSM: t('home.assetLabels.ksm'),
  };

  return (
    <div className="flex items-center justify-between rounded-2xl border border-border/85 bg-card/90 px-4 py-3.5 shadow-[0_15px_30px_-32px_color-mix(in_oklch,var(--foreground)_50%,transparent)] dark:shadow-[0_15px_30px_-32px_rgb(0_0_0_/_0.72)]">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-xs font-bold text-primary-foreground">
            {asset}
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">{asset}</p>
            <p className="text-xs text-muted-foreground">
              {assetLabels[asset]}
            </p>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <p className="text-base font-semibold tabular-nums text-foreground">
          {showBalances ? formatAmount(asset, balance) : '••••••'}
        </p>
        {onDetails && (
          <button
            type="button"
            onClick={onDetails}
            className="rounded-full border border-border px-2.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            {t('home.viewDetails')}
          </button>
        )}
      </div>
    </div>
  );
}

export function BalanceToggle() {
  const { t } = useTranslation();
  const showBalances = useShowBalances();
  return (
    <button
      type="button"
      onClick={() => setShowBalances(!showBalances)}
      className="flex items-center gap-1.5 rounded-full border border-border bg-background/70 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
      aria-label={
        showBalances ? t('home.hideBalancesAria') : t('home.showBalancesAria')
      }
    >
      {showBalances ? (
        <>
          <EyeOff className="h-3.5 w-3.5" />
          {t('home.hide')}
        </>
      ) : (
        <>
          <Eye className="h-3.5 w-3.5" />
          {t('home.show')}
        </>
      )}
    </button>
  );
}
