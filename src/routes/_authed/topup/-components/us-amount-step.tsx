'use client';

import { useTranslation } from 'react-i18next';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { formatUSD } from '~/lib/formatters';

interface UsAmountStepProps {
  amount: string;
  minAmount: number;
  isLoadingRate: boolean;
  rateError: string | null;
  rateSummary: {
    amountDst: number;
    ratio: number;
    /** e.g. "1 DUSD = 0.9998 USD" */
    ratioLabel: string;
  } | null;
  onAmountChange: (v: string) => void;
  onNext: () => void;
}

const quickAmounts = [50, 100, 250, 500];

/** USD counterpart of `TopUpAmountStep` — reused by RTP payout and ACH payin. */
export function UsAmountStep({
  amount,
  minAmount,
  isLoadingRate,
  rateError,
  rateSummary,
  onAmountChange,
  onNext,
}: UsAmountStepProps) {
  const { t } = useTranslation();
  const parsed = Number.parseFloat(amount) || 0;
  const isValid = parsed >= minAmount;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label
          htmlFor="us-amount"
          className="text-sm font-medium text-foreground"
        >
          {t('topup.usAmountStep.label')}
        </Label>
        <Input
          id="us-amount"
          type="text"
          inputMode="numeric"
          placeholder="$0"
          value={amount}
          onChange={(e) => {
            const cleaned = e.target.value.replace(/[^\d.]/g, '');
            const [intPart, ...rest] = cleaned.split('.');
            const next =
              rest.length > 0
                ? `${intPart}.${rest.join('').slice(0, 2)}`
                : intPart;
            onAmountChange(next);
          }}
          className="h-14 rounded-2xl text-center text-xl font-bold tabular-nums"
          autoFocus
        />
        {parsed > 0 && parsed < minAmount && (
          <p className="text-xs text-destructive">
            {t('topup.usAmountStep.minAmount')}
          </p>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {quickAmounts.map((qa) => (
          <button
            key={qa}
            type="button"
            onClick={() => onAmountChange(String(qa))}
            className="rounded-xl border border-border bg-card px-2 py-2 text-xs font-medium text-foreground transition-all hover:bg-muted/80"
          >
            {formatUSD(qa)}
          </button>
        ))}
      </div>

      {isValid && (
        <div className="rounded-2xl border border-border/85 bg-card/85 p-4">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-foreground">
              {t('topup.usAmountStep.appliedRate')}
            </p>
            {isLoadingRate ? (
              <p className="text-xs text-muted-foreground">
                {t('topup.usAmountStep.checkingRate')}
              </p>
            ) : rateError ? (
              <p className="text-xs text-destructive">{rateError}</p>
            ) : rateSummary ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t('convert.rate')}
                  </span>
                  <span className="font-medium text-foreground">
                    {rateSummary.ratioLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t('topup.usAmountStep.youWillReceive')}
                  </span>
                  <span className="font-semibold text-foreground">
                    {formatUSD(rateSummary.amountDst)}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t('topup.usAmountStep.enterAmountToQuery')}
              </p>
            )}
          </div>
        </div>
      )}

      <Button
        onClick={onNext}
        disabled={!isValid || !rateSummary || isLoadingRate}
        className="h-12 w-full rounded-2xl text-sm font-medium"
      >
        {isLoadingRate ? t('convert.queryingRate') : t('common.continue')}
      </Button>
    </div>
  );
}
