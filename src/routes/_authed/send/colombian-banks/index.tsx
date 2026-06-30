import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { bloque } from '~/lib/bloque';
import { useCards } from '../../card/-hooks/use-card';
import { TopUpAmountStep } from '../../topup/-components/amount-step';
import {
  type TopUpBankAccountData,
  TopUpBankStep,
} from '../../topup/-components/bank-step';
import { TopUpConfirmStep } from '../../topup/-components/confirm-step';
import { TopUpErrorStep } from '../../topup/-components/error-step';
import { TopUpPendingStep } from '../../topup/-components/pending-step';

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
  const [step, setStep] = useState<TransferStep>('amount');
  const [amount, setAmount] = useState('');
  const [bankForm, setBankForm] =
    useState<TopUpBankAccountData>(DEFAULT_BANK_FORM);
  const [lastOrder, setLastOrder] = useState<{
    id: string;
    redirectUrl?: string;
  } | null>(null);
  const [autoRetry, setAutoRetry] = useState(false);
  const [selectedBank, setSelectedBank] = useState('');
  const { data: cardsData, isLoading: isLoadingCards } = useCards();

  const parsedAmount = Number.parseInt(amount.replace(/\D/g, ''), 10) || 0;
  const amountSrc = useMemo(() => {
    if (parsedAmount <= 0) return '';
    return majorToMinor(parsedAmount, FROM_PRECISION);
  }, [parsedAmount]);

  const sourceAccountUrn = cardsData?.accounts?.[0]?.urn ?? '';

  const ratesQuery = useQuery({
    queryKey: ['transfer-rates', amountSrc],
    enabled:
      parsedAmount >= MIN_TRANSFER_AMOUNT && !!amountSrc && !!sourceAccountUrn,
    queryFn: () =>
      bloque.swap.findRates({
        fromAsset: FROM_ASSET,
        toAsset: TO_ASSET,
        fromMediums: [FROM_MEDIUM],
        toMediums: ['bancolombia'],
        amountSrc,
      }),
    staleTime: 30_000,
    retry: 1,
  });

  const selectedRate = ratesQuery.data?.rates?.[0] ?? null;
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
    if (!sourceAccountUrn && !isLoadingCards) {
      return 'No encontramos una tarjeta para enviar.';
    }
    if (ratesQuery.isError) {
      return 'No pudimos consultar la tasa. Intenta de nuevo.';
    }
    if (ratesQuery.isSuccess && !selectedRate) {
      return 'No hay tasas disponibles para este monto.';
    }
    return null;
  }, [
    parsedAmount,
    sourceAccountUrn,
    isLoadingCards,
    ratesQuery.isError,
    ratesQuery.isSuccess,
    selectedRate,
  ]);

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRate?.sig) {
        throw new Error('No hay tasa seleccionada para crear la orden.');
      }
      if (!amountSrc) {
        throw new Error('Monto inválido para crear la orden.');
      }
      if (!sourceAccountUrn) {
        throw new Error('No hay cuenta origen disponible.');
      }

      if (!selectedBank) {
        throw new Error('Selecciona un banco destino.');
      }

      return bloque.swap.bankTransfer.create({
        rateSig: selectedRate.sig,
        amountSrc,
        toMedium: selectedBank as Parameters<
          typeof bloque.swap.bankTransfer.create
        >[0]['toMedium'],
        depositInformation: bankForm,
        args: {
          sourceAccountUrn,
        },
      });
    },
    onSuccess: (result) => {
      const redirectUrl = getExecutionRedirectUrl(
        result.execution?.result?.how,
      );
      setLastOrder({ id: result.order.id, redirectUrl });
      setStep('pending');
      toast.success('Transferencia enviada correctamente.');
      if (redirectUrl) {
        window.open(redirectUrl, '_blank', 'noopener,noreferrer');
      }
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('E_RATE_EXPIRED')) {
        toast.info('La tasa expiró. Recalculando...');
        setAutoRetry(true);
        void ratesQuery.refetch();
        return;
      }
      toast.error(message || 'No se pudo enviar la transferencia.');
      setStep('error');
    },
  });

  const createOrderMutate = createOrderMutation.mutate;

  useEffect(() => {
    if (!autoRetry || ratesQuery.isFetching) return;
    setAutoRetry(false);
    if (selectedRate) {
      createOrderMutate();
    } else {
      toast.error('No hay tasa disponible. Intenta de nuevo.');
      setStep('amount');
    }
  }, [autoRetry, createOrderMutate, ratesQuery.isFetching, selectedRate]);

  const handleAmountNext = () => {
    if (parsedAmount < MIN_TRANSFER_AMOUNT) {
      toast.error('El monto mínimo es $5,000 COP.');
      return;
    }
    if (!selectedRate) {
      toast.error('No hay tasa disponible para continuar.');
      return;
    }
    setStep('bank');
  };

  const handleConfirm = () => {
    createOrderMutation.mutate();
  };

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold tracking-[-0.025em] text-foreground">
        Enviar a bancos colombianos
      </h1>

      <div className="flex items-center gap-2 rounded-2xl border border-border/75 bg-card/80 p-3">
        {['Monto', 'Cuenta', 'Confirmar'].map((label, i) => {
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
        <TopUpPendingStep
          amount={parsedAmount}
          orderId={lastOrder?.id}
          actionLabel={
            lastOrder?.redirectUrl
              ? 'Abrir enlace del banco'
              : 'Verificar estado'
          }
          onRefresh={() => {
            if (lastOrder?.redirectUrl) {
              window.open(
                lastOrder.redirectUrl,
                '_blank',
                'noopener,noreferrer',
              );
              return;
            }
            toast.info('Revisa el estado en movimientos.');
          }}
          onError={() => setStep('error')}
        />
      )}

      {step === 'error' && <TopUpErrorStep onRetry={() => setStep('amount')} />}
    </div>
  );
}

function getExecutionRedirectUrl(how: unknown): string | undefined {
  if (!how || typeof how !== 'object') return undefined;
  if ('url' in how && typeof how.url === 'string') {
    return how.url;
  }
  return undefined;
}
