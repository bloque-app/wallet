import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  isSupportedBank,
  SUPPORTED_BANK_LABELS,
} from '~/domain/payments/supported-bank';
import type { ExecutionOutcome } from '~/domain/payments/types';
import { useAccountPicker } from '~/hooks/accounts/use-account-picker';
import { useCreateBankTransferOrder } from '~/hooks/payments/use-bank-transfer';
import { useRates } from '~/hooks/payments/use-rates';
import { TopUpAmountStep } from '../../topup/-components/amount-step';
import {
  type TopUpBankAccountData,
  TopUpBankStep,
} from '../../topup/-components/bank-step';
import { TopUpConfirmStep } from '../../topup/-components/confirm-step';
import { TopUpErrorStep } from '../../topup/-components/error-step';
import { ExecutionOutcomeStep } from '../../topup/-components/execution-outcome-step';

type TransferStep = 'amount' | 'bank' | 'confirm' | 'pending' | 'error';

const MIN_TRANSFER_AMOUNT = 5_000;
const FROM_ASSET = 'COPM/2';
const TO_ASSET = 'COP/2';
const FROM_MEDIUM = 'kusama';

function getAssetPrecision(assetWithPrecision: string) {
  const [, precisionStr] = assetWithPrecision.split('/');
  const parsed = Number.parseInt(precisionStr ?? '0', 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function majorToMinor(amountMajor: number, precision: number) {
  return (BigInt(amountMajor) * 10n ** BigInt(precision)).toString();
}

function minorToMajor(amountMinor: number, precision: number) {
  return amountMinor / 10 ** precision;
}

const FROM_PRECISION = getAssetPrecision(FROM_ASSET);

const DEFAULT_BANK_FORM: TopUpBankAccountData = {
  bankAccountType: 'savings',
  bankAccountNumber: '',
  bankAccountHolderName: '',
  bankAccountHolderIdentificationType: 'CC',
  bankAccountHolderIdentificationValue: '',
};

export const Route = createFileRoute('/_authed/send/colombian-banks/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useTranslation();
  const [step, setStep] = useState<TransferStep>('amount');
  const [amount, setAmount] = useState('');
  const [bankForm, setBankForm] =
    useState<TopUpBankAccountData>(DEFAULT_BANK_FORM);
  const [lastOrder, setLastOrder] = useState<{
    id: string;
    execution: ExecutionOutcome;
  } | null>(null);
  const [autoRetry, setAutoRetry] = useState(false);
  const [selectedBank, setSelectedBank] = useState('');
  const { accounts: sourceAccounts, isLoading: isLoadingAccounts } =
    useAccountPicker();
  const sourceAccountUrn = sourceAccounts[0]?.primaryUrn ?? '';

  const parsedAmount = Number.parseInt(amount.replace(/\D/g, ''), 10) || 0;
  const amountSrc = useMemo(() => {
    if (parsedAmount <= 0) return '';
    return majorToMinor(parsedAmount, FROM_PRECISION);
  }, [parsedAmount]);

  // Different destination banks can live on different swap graphs with their
  // own rateSig (e.g. bancolombia/nequi are quoted separately from the rest),
  // and the order endpoint rejects a toMedium that isn't covered by the
  // quoted rateSig's graph with E_UNSUPPORTED_TO_MEDIUM. Quote against the
  // selected bank once one is picked; fall back to bancolombia only for the
  // amount step's estimate, before a bank has been chosen.
  const rateToMedium = isSupportedBank(selectedBank)
    ? selectedBank
    : 'bancolombia';
  const ratesQuery = useRates(
    parsedAmount >= MIN_TRANSFER_AMOUNT && amountSrc && sourceAccountUrn
      ? {
          fromAsset: FROM_ASSET,
          toAsset: TO_ASSET,
          fromMediums: [FROM_MEDIUM],
          toMediums: [rateToMedium],
          amountSrc,
        }
      : undefined,
  );

  const selectedBankName = isSupportedBank(selectedBank)
    ? SUPPORTED_BANK_LABELS[selectedBank]
    : '';

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
    };
  }, [selectedRate, amountSrc]);

  const rateError = useMemo(() => {
    if (parsedAmount < MIN_TRANSFER_AMOUNT) return null;
    if (!sourceAccountUrn && !isLoadingAccounts) {
      return t('send.colombianBanks.noSourceAccount');
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

  const createOrderMutation = useCreateBankTransferOrder();

  const submitOrder = useCallback(() => {
    if (!selectedRate?.sig) {
      toast.error(t('send.colombianBanks.noRateForOrder'));
      return;
    }
    if (!amountSrc) {
      toast.error(t('send.colombianBanks.invalidAmountForOrder'));
      return;
    }
    if (!sourceAccountUrn) {
      toast.error(t('send.colombianBanks.noSourceAccount'));
      return;
    }
    if (!selectedBank) {
      toast.error(t('send.colombianBanks.selectDestinationBank'));
      return;
    }
    if (!isSupportedBank(selectedBank)) {
      toast.error(t('send.colombianBanks.unsupportedBank'));
      return;
    }

    createOrderMutation.mutate(
      {
        params: {
          rateSig: selectedRate.sig,
          amountSrc,
          toMedium: selectedBank,
          depositInformation: bankForm,
          args: {
            sourceAccountUrn,
          },
        },
      },
      {
        onSuccess: (result) => {
          const execution = result.execution ?? { kind: 'none' as const };
          setLastOrder({ id: result.order.id, execution });
          setStep('pending');
          toast.success(t('send.bloqueFriends.transferSentToast'));
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
          toast.error(message || t('send.bloqueFriends.transferErrorToast'));
          setStep('error');
        },
      },
    );
  }, [
    selectedRate,
    amountSrc,
    sourceAccountUrn,
    selectedBank,
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
    if (parsedAmount < MIN_TRANSFER_AMOUNT) {
      toast.error(t('send.colombianBanks.minAmountToast'));
      return;
    }
    if (!selectedRate) {
      toast.error(t('send.colombianBanks.noRateToContinue'));
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
        {t('send.colombianBanks.title')}
      </h1>

      <div className="flex items-center gap-2 rounded-2xl border border-border/75 bg-card/80 p-3">
        {[
          t('topup.stepAmount'),
          t('send.colombianBanks.stepAccount'),
          t('topup.stepConfirm'),
        ].map((label, i) => {
          const stepIndex =
            step === 'amount'
              ? 0
              : step === 'bank'
                ? 1
                : step === 'confirm'
                  ? 2
                  : step === 'pending'
                    ? 3
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
        <TopUpAmountStep
          amount={amount}
          fee={0}
          isLoadingRate={ratesQuery.isFetching}
          rateError={rateError}
          rateSummary={rateSummary}
          onAmountChange={setAmount}
          onNext={handleAmountNext}
        />
      )}

      {step === 'bank' && (
        <TopUpBankStep
          form={bankForm}
          selectedBank={selectedBank}
          onBankChange={setSelectedBank}
          onFormChange={setBankForm}
          onBack={() => setStep('amount')}
          onNext={() => setStep('confirm')}
        />
      )}

      {step === 'confirm' && (
        <TopUpConfirmStep
          amount={parsedAmount}
          amountDst={rateSummary?.amountDst ?? 0}
          ratio={rateSummary?.ratio ?? 0}
          bankName={selectedBankName}
          bankAccountType={bankForm.bankAccountType}
          bankAccountNumber={bankForm.bankAccountNumber}
          bankAccountHolderName={bankForm.bankAccountHolderName}
          identificationLabel={bankForm.bankAccountHolderIdentificationType}
          identificationValue={bankForm.bankAccountHolderIdentificationValue}
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
