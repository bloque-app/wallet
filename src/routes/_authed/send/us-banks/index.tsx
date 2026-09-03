import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { ExecutionOutcome } from '~/domain/payments/types';
import { useAccountPicker } from '~/hooks/accounts/use-account-picker';
import { useRates } from '~/hooks/payments/use-rates';
import { useCreateRtpOrder } from '~/hooks/payments/use-rtp-order';
import { getAssetPrecision } from '~/lib/formatters';
import { TopUpErrorStep } from '../../topup/-components/error-step';
import { ExecutionOutcomeStep } from '../../topup/-components/execution-outcome-step';
import { UsAmountStep } from '../../topup/-components/us-amount-step';
import {
  type UsBankAccountData,
  UsBankStep,
} from '../../topup/-components/us-bank-step';
import { UsConfirmStep } from '../../topup/-components/us-confirm-step';

type TransferStep = 'amount' | 'bank' | 'confirm' | 'pending' | 'error';

const MIN_TRANSFER_AMOUNT_USD = 10;
const FROM_ASSET = 'DUSD/6';
const TO_ASSET = 'USD/2';
const FROM_MEDIUM = 'kusama';
const TO_MEDIUM = 'rtp';
const FROM_PRECISION = getAssetPrecision(FROM_ASSET);

function majorToMinor(amountMajor: number, precision: number) {
  return (BigInt(amountMajor) * 10n ** BigInt(precision)).toString();
}

function minorToMajor(amountMinor: number, precision: number) {
  return amountMinor / 10 ** precision;
}

const DEFAULT_BANK_FORM: UsBankAccountData = {
  owner: '',
  accountNumber: '',
  routingNumber: '',
  accountType: 'checking',
  bankName: '',
};

export const Route = createFileRoute('/_authed/send/us-banks/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useTranslation();
  const [step, setStep] = useState<TransferStep>('amount');
  const [amount, setAmount] = useState('');
  const [bankForm, setBankForm] =
    useState<UsBankAccountData>(DEFAULT_BANK_FORM);
  const [lastOrder, setLastOrder] = useState<{
    id: string;
    execution: ExecutionOutcome;
  } | null>(null);
  const [autoRetry, setAutoRetry] = useState(false);
  const { accounts: sourceAccounts, isLoading: isLoadingAccounts } =
    useAccountPicker({ asset: FROM_ASSET });
  const sourceAccountUrn = sourceAccounts[0]?.primaryUrn ?? '';

  const parsedAmount = Number.parseInt(amount.replace(/\D/g, ''), 10) || 0;
  const amountSrc = useMemo(() => {
    if (parsedAmount <= 0) return '';
    return majorToMinor(parsedAmount, FROM_PRECISION);
  }, [parsedAmount]);

  const ratesQuery = useRates(
    parsedAmount >= MIN_TRANSFER_AMOUNT_USD && amountSrc && sourceAccountUrn
      ? {
          fromAsset: FROM_ASSET,
          toAsset: TO_ASSET,
          fromMediums: [FROM_MEDIUM],
          toMediums: [TO_MEDIUM],
          amountSrc,
        }
      : undefined,
  );

  const selectedRate = ratesQuery.data?.[0] ?? null;
  const rateSummary = useMemo(() => {
    if (!selectedRate || !amountSrc) return null;
    const srcAmountMinor = Number(amountSrc);
    if (!srcAmountMinor) return null;
    const srcAmountMajor = minorToMajor(srcAmountMinor, FROM_PRECISION);
    const ratio =
      typeof selectedRate.ratio === 'number' &&
      Number.isFinite(selectedRate.ratio)
        ? selectedRate.ratio
        : (selectedRate.rate?.[1] ?? 1) / (selectedRate.rate?.[0] ?? 1);
    const dstAmountMajor = srcAmountMajor * ratio;
    return {
      amountDst: dstAmountMajor,
      ratio,
      ratioLabel: `1 DUSD = ${ratio.toFixed(4)} USD`,
    };
  }, [selectedRate, amountSrc]);

  const rateError = useMemo(() => {
    if (parsedAmount < MIN_TRANSFER_AMOUNT_USD) return null;
    if (!sourceAccountUrn && !isLoadingAccounts) {
      return t('send.usBanks.noSourceAccount');
    }
    if (ratesQuery.isError) {
      return t('convert.rateFetchError');
    }
    if (ratesQuery.isSuccess && !selectedRate) {
      return t('convert.noRatesAvailable');
    }
    return null;
  }, [
    parsedAmount,
    sourceAccountUrn,
    isLoadingAccounts,
    ratesQuery.isError,
    ratesQuery.isSuccess,
    selectedRate,
    t,
  ]);

  const createOrderMutation = useCreateRtpOrder();

  const submitOrder = useCallback(() => {
    if (!selectedRate?.sig) {
      toast.error(t('send.usBanks.noRateForOrder'));
      return;
    }
    if (!amountSrc) {
      toast.error(t('send.usBanks.invalidAmountForOrder'));
      return;
    }
    if (!sourceAccountUrn) {
      toast.error(t('send.usBanks.noSourceAccount'));
      return;
    }

    createOrderMutation.mutate(
      {
        params: {
          rateSig: selectedRate.sig,
          amountSrc,
          depositInformation: {
            owner: bankForm.owner.trim(),
            accountNumber: bankForm.accountNumber.trim(),
            routingNumber: bankForm.routingNumber.trim(),
            accountType: bankForm.accountType,
            bankName: bankForm.bankName.trim() || undefined,
          },
          args: { sourceAccountUrn },
        },
      },
      {
        onSuccess: (result) => {
          const execution = result.execution ?? { kind: 'none' as const };
          setLastOrder({ id: result.order.id, execution });
          setStep('pending');
          toast.success(t('send.usBanks.transferSentToast'));
          if (execution.kind === 'redirect') {
            window.open(execution.url, '_blank', 'noopener,noreferrer');
          }
        },
        onError: (error) => {
          const message = error instanceof Error ? error.message : '';
          if (message.includes('E_RATE_EXPIRED')) {
            toast.info(t('topup.rateExpiredToast'));
            setAutoRetry(true);
            void ratesQuery.refetch();
            return;
          }
          toast.error(message || t('send.usBanks.transferErrorToast'));
          setStep('error');
        },
      },
    );
  }, [
    selectedRate,
    amountSrc,
    sourceAccountUrn,
    bankForm,
    createOrderMutation,
    ratesQuery,
    t,
  ]);

  useEffect(() => {
    if (!autoRetry || ratesQuery.isFetching) return;
    setAutoRetry(false);
    if (selectedRate) {
      submitOrder();
    } else {
      toast.error(t('topup.noRateRetryToast'));
      setStep('amount');
    }
  }, [autoRetry, ratesQuery.isFetching, selectedRate, submitOrder, t]);

  const handleAmountNext = () => {
    if (parsedAmount < MIN_TRANSFER_AMOUNT_USD) {
      toast.error(t('send.usBanks.minAmountToast'));
      return;
    }
    if (!selectedRate) {
      toast.error(t('send.usBanks.noRateToContinue'));
      return;
    }
    setStep('bank');
  };

  const handleConfirm = () => {
    submitOrder();
  };

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold tracking-[-0.025em] text-foreground">
        {t('send.usBanks.title')}
      </h1>

      <div className="flex items-center gap-2 rounded-2xl border border-border/75 bg-card/80 p-3">
        {[
          t('topup.stepAmount'),
          t('send.usBanks.stepBank'),
          t('topup.stepConfirm'),
        ].map((label, i) => {
          const stepIndex =
            step === 'amount'
              ? 0
              : step === 'bank'
                ? 1
                : step === 'confirm'
                  ? 2
                  : 3;
          const isActive = i <= stepIndex;
          return (
            <div key={label} className="flex items-center gap-2">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold ${
                    isActive
                      ? 'bg-foreground text-background'
                      : 'border border-border bg-card text-muted-foreground'
                  }`}
                >
                  {i + 1}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {label}
                </span>
              </div>
              {i < 2 && (
                <div
                  className={`mb-4 h-px w-7 ${isActive ? 'bg-foreground' : 'bg-border'}`}
                />
              )}
            </div>
          );
        })}
      </div>

      {step === 'amount' && (
        <UsAmountStep
          amount={amount}
          minAmount={MIN_TRANSFER_AMOUNT_USD}
          isLoadingRate={ratesQuery.isFetching}
          rateError={rateError}
          rateSummary={rateSummary}
          onAmountChange={setAmount}
          onNext={handleAmountNext}
        />
      )}

      {step === 'bank' && (
        <UsBankStep
          form={bankForm}
          onFormChange={setBankForm}
          onBack={() => setStep('amount')}
          onNext={() => setStep('confirm')}
        />
      )}

      {step === 'confirm' && (
        <UsConfirmStep
          amount={parsedAmount}
          amountDst={rateSummary?.amountDst ?? 0}
          ratioLabel={rateSummary?.ratioLabel ?? ''}
          details={[
            {
              label: t('send.usBanks.confirmStep.destinationBank'),
              value: bankForm.bankName || '—',
            },
            {
              label: t('send.usBanks.confirmStep.owner'),
              value: bankForm.owner,
            },
            {
              label: t('send.usBanks.bankStep.accountNumber'),
              value: bankForm.accountNumber,
            },
          ]}
          isSubmitting={createOrderMutation.isPending}
          onBack={() => setStep('bank')}
          onConfirm={handleConfirm}
        />
      )}

      {step === 'pending' && (
        <ExecutionOutcomeStep
          amount={parsedAmount}
          orderId={lastOrder?.id}
          execution={lastOrder?.execution}
          onError={() => setStep('error')}
        />
      )}

      {step === 'error' && <TopUpErrorStep onRetry={() => setStep('amount')} />}
    </div>
  );
}
