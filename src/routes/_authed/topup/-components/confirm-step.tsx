'use client';

import { ArrowLeft, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '~/components/ui/button';
import { Separator } from '~/components/ui/separator';
import { formatCOP } from '~/lib/formatters';

interface ConfirmStepProps {
  amount: number;
  amountDst: number;
  ratio: number;
  bankName: string;
  bankAccountType: 'savings' | 'checkings';
  bankAccountNumber: string;
  bankAccountHolderName: string;
  identificationLabel: string;
  identificationValue: string;
  isSubmitting?: boolean;
  onBack: () => void;
  onConfirm: () => void;
}

export function TopUpConfirmStep({
  amount,
  amountDst,
  ratio,
  bankName,
  bankAccountType,
  bankAccountNumber,
  bankAccountHolderName,
  identificationLabel,
  identificationValue,
  isSubmitting = false,
  onBack,
  onConfirm,
}: ConfirmStepProps) {
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
          {t('topup.confirmStep.summary')}
        </p>
        <div className="flex flex-col gap-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {t('movements.detail.asset')}
            </span>
            <span className="font-medium text-foreground">COP</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {t('topup.amountStep.amount')}
            </span>
            <span className="font-medium text-foreground">
              {formatCOP(amount)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('convert.rate')}</span>
            <span className="font-medium text-foreground">
              1 COPM = {ratio.toFixed(4)} COP
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('topup.bank')}</span>
            <span className="font-medium text-foreground">{bankName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {t('topup.bankStep.accountType')}
            </span>
            <span className="font-medium text-foreground">
              {bankAccountType === 'savings'
                ? t('topup.bankStep.savings')
                : t('topup.bankStep.checking')}
            </span>
          </div>
          <div className="flex justify-between gap-3 text-sm">
            <span className="text-muted-foreground">
              {t('topup.bankStep.accountNumber')}
            </span>
            <span className="max-w-[60%] truncate text-right font-medium text-foreground">
              {bankAccountNumber}
            </span>
          </div>
          <div className="flex justify-between gap-3 text-sm">
            <span className="text-muted-foreground">
              {t('topup.accountHolder')}
            </span>
            <span className="max-w-[60%] truncate text-right font-medium text-foreground">
              {bankAccountHolderName}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{identificationLabel}</span>
            <span className="font-medium text-foreground">
              {identificationValue}
            </span>
          </div>
          <Separator />
          <div className="flex justify-between text-sm">
            <span className="font-semibold text-foreground">
              {t('topup.amountStep.youWillReceive')}
            </span>
            <span className="font-bold text-foreground">
              {formatCOP(amountDst)}
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
          ? t('topup.confirmStep.sending')
          : t('topup.confirmStep.sendWithdrawal')}
      </Button>

      <p className="text-[10px] leading-relaxed text-muted-foreground text-center">
        {t('topup.confirmStep.verifyDisclaimer')}
      </p>
    </div>
  );
}
