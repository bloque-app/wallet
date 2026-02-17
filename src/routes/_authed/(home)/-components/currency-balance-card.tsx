'use client';

import { Eye, EyeOff } from 'lucide-react';
import { type Asset, formatAmount } from '~/lib/mock-data';
import { useWallet } from '~/lib/wallet-mock';

interface CurrencyBalanceCardProps {
  asset: Asset;
  balance: number;
  onDetails?: () => void;
}

const assetLabels: Record<Asset, string> = {
  COP: 'Peso Colombiano',
  USD: 'Dólar Estadounidense',
  KSM: 'Kusama',
};

export function CurrencyBalanceCard({
  asset,
  balance,
  onDetails,
}: CurrencyBalanceCardProps) {
  const { showBalances } = useWallet();

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
            Ver detalles
          </button>
        )}
      </div>
    </div>
  );
}

export function BalanceToggle() {
  const { showBalances, setShowBalances } = useWallet();
  return (
    <button
      type="button"
      onClick={() => setShowBalances(!showBalances)}
      className="flex items-center gap-1.5 rounded-full border border-border bg-background/70 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
      aria-label={showBalances ? 'Ocultar saldos' : 'Mostrar saldos'}
    >
      {showBalances ? (
        <>
          <EyeOff className="h-3.5 w-3.5" />
          Ocultar
        </>
      ) : (
        <>
          <Eye className="h-3.5 w-3.5" />
          Mostrar
        </>
      )}
    </button>
  );
}
