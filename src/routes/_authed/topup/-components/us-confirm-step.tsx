'use client';

import { ArrowLeft, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '~/components/ui/button';
import { Separator } from '~/components/ui/separator';
import { formatUSD } from '~/lib/formatters';

interface UsConfirmStepProps {
  amount: number;
  amountDst: number;
  ratioLabel: string;
  /** Extra summary rows, rendered between the rate and the receive total. */
  details: { label: string; value: string }[];
  isSubmitting?: boolean;
  onBack: () => void;
  onConfirm: () => void;
}

/** USD counterpart of `TopUpConfirmStep` — reused by RTP payout and ACH payin. */
export function UsConfirmStep({
  amount,
  amountDst,
  ratioLabel,
  details,
  isSubmitting = false,
  onBack,
  onConfirm,
}: UsConfirmStepProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-5">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('common.back')}
      </button>

      <div className="rounded-2xl border border-border/85 bg-card/85 p-5">
        <p className="mb-4 text-sm font-medium text-foreground">
          {t('topup.usConfirmStep.summary')}
        </p>
        <div className="flex flex-col gap-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {t('topup.usAmountStep.amount')}
            </span>
            <span className="font-medium text-foreground">
              {formatUSD(amount)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('convert.rate')}</span>
            <span className="font-medium text-foreground">{ratioLabel}</span>
          </div>
          {details.map((detail) => (
            <div
              key={detail.label}
              className="flex justify-between gap-3 text-sm"
            >
              <span className="text-muted-foreground">{detail.label}</span>
              <span className="max-w-[60%] truncate text-right font-medium text-foreground">
                {detail.value}
              </span>
            </div>
          ))}
          <Separator />
          <div className="flex justify-between text-sm">
            <span className="font-semibold text-foreground">
              {t('topup.usAmountStep.youWillReceive')}
            </span>
            <span className="font-bold text-foreground">
              {formatUSD(amountDst)}
            </span>
          </div>
        </div>
      </div>

      <Button
        onClick={onConfirm}
        disabled={isSubmitting}
        className="h-12 w-full gap-2 rounded-2xl text-sm font-medium"
      >
        <ExternalLink className="h-4 w-4" />
        {isSubmitting
          ? t('topup.usConfirmStep.sending')
          : t('topup.usConfirmStep.send')}
      </Button>

      <p className="text-[10px] leading-relaxed text-muted-foreground text-center">
        {t('topup.usConfirmStep.verifyDisclaimer')}
      </p>
    </div>
  );
}
