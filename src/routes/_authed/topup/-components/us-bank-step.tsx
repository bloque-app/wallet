'use client';

import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { cn } from '~/lib/utils';

export interface UsBankAccountData {
  owner: string;
  accountNumber: string;
  routingNumber: string;
  accountType: 'checking' | 'savings';
  bankName: string;
}

interface UsBankStepProps {
  form: UsBankAccountData;
  onFormChange: (value: UsBankAccountData) => void;
  onBack: () => void;
  onNext: () => void;
}

/** Destination US bank details for an RTP payout — mirrors `TopUpBankStep`'s shape. */
export function UsBankStep({
  form,
  onFormChange,
  onBack,
  onNext,
}: UsBankStepProps) {
  const { t } = useTranslation();

  const isValid =
    !!form.owner.trim() &&
    !!form.accountNumber.trim() &&
    !!form.routingNumber.trim() &&
    !!form.accountType;

  const update = <K extends keyof UsBankAccountData>(
    key: K,
    value: UsBankAccountData[K],
  ) => {
    onFormChange({ ...form, [key]: value });
  };

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

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-foreground">
            {t('send.usBanks.bankStep.owner')}
          </Label>
          <Input
            value={form.owner}
            onChange={(e) => update('owner', e.target.value)}
            placeholder={t('send.usBanks.bankStep.ownerPlaceholder')}
            className="h-12 rounded-2xl"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-foreground">
            {t('send.usBanks.bankStep.accountType')}
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['checking', t('send.usBanks.bankStep.checking')],
                ['savings', t('send.usBanks.bankStep.savings')],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => update('accountType', val)}
                className={cn(
                  'h-12 rounded-2xl border px-3 text-sm font-medium transition-all',
                  form.accountType === val
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-background/70 text-foreground hover:bg-muted/70',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-foreground">
            {t('send.usBanks.bankStep.accountNumber')}
          </Label>
          <Input
            value={form.accountNumber}
            onChange={(e) =>
              update('accountNumber', e.target.value.replace(/\D/g, ''))
            }
            inputMode="numeric"
            placeholder={t('send.usBanks.bankStep.accountNumberPlaceholder')}
            className="h-12 rounded-2xl"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-foreground">
            {t('send.usBanks.bankStep.routingNumber')}
          </Label>
          <Input
            value={form.routingNumber}
            onChange={(e) =>
              update('routingNumber', e.target.value.replace(/\D/g, ''))
            }
            inputMode="numeric"
            placeholder={t('send.usBanks.bankStep.routingNumberPlaceholder')}
            className="h-12 rounded-2xl"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-foreground">
            {t('send.usBanks.bankStep.bankName')}
          </Label>
          <Input
            value={form.bankName}
            onChange={(e) => update('bankName', e.target.value)}
            placeholder={t('send.usBanks.bankStep.bankNamePlaceholder')}
            className="h-12 rounded-2xl"
          />
        </div>
      </div>

      <Button
        onClick={onNext}
        disabled={!isValid}
        className="h-12 w-full rounded-2xl text-sm font-medium"
      >
        {t('common.continue')}
      </Button>
    </div>
  );
}
