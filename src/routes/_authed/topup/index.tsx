import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Building2, CreditCard, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { bloque } from '~/lib/bloque';
import { cn } from '~/lib/utils';
import { useCards } from '../card/-hooks/use-card';
import { TopUpAmountStep } from './-components/amount-step';
import {
  type TopUpBankAccountData,
  TopUpBankStep,
} from './-components/bank-step';
import { TopUpConfirmStep } from './-components/confirm-step';
import { TopUpErrorStep } from './-components/error-step';
import { TopUpPendingStep } from './-components/pending-step';

type TopUpStep = 'method' | 'amount' | 'bank' | 'confirm' | 'pending' | 'error';

const MIN_TOPUP_AMOUNT = 10_000;
const FROM_ASSET = 'COPM/2';
const TO_ASSET = 'COP/2';
const FROM_MEDIUM = 'kusama';
const TO_MEDIUM = 'bancolombia' as const;

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
const TO_PRECISION = getAssetPrecision(TO_ASSET);

const DEFAULT_BANK_FORM: TopUpBankAccountData = {
  bankAccountType: 'savings',
  bankAccountNumber: '',
  bankAccountHolderName: '',
  bankAccountHolderIdentificationType: 'CC',
  bankAccountHolderIdentificationValue: '',
};

export const Route = createFileRoute('/_authed/topup/')({
  component: RouteComponent,
});

function RouteComponent() {
  const [step, setStep] = useState<TopUpStep>('method');
  const [amount, setAmount] = useState('');
  const [bankForm, setBankForm] =
    useState<TopUpBankAccountData>(DEFAULT_BANK_FORM);
  const [lastOrder, setLastOrder] = useState<{
    id: string;
    redirectUrl?: string;
  } | null>(null);
  const { data: cardsData, isLoading: isLoadingCards } = useCards();

  const parsedAmount = Number.parseInt(amount.replace(/\D/g, ''), 10) || 0;
  const amountSrc = useMemo(() => {
    if (parsedAmount <= 0) return '';
    return majorToMinor(parsedAmount, FROM_PRECISION);
  }, [parsedAmount]);

  const sourceAccountUrn = cardsData?.accounts?.[0]?.urn ?? '';

  const ratesQuery = useQuery({
    queryKey: ['topup-rates', amountSrc],
    enabled:
      parsedAmount >= MIN_TOPUP_AMOUNT && !!amountSrc && !!sourceAccountUrn,
    queryFn: () =>
      bloque.swap.findRates({
        fromAsset: FROM_ASSET,
        toAsset: TO_ASSET,
        fromMediums: [FROM_MEDIUM],
        toMediums: [TO_MEDIUM],
        amountSrc,
      }),
    staleTime: 30_000,
    retry: 1,
  });

  const selectedRate = ratesQuery.data?.rates?.[0] ?? null;
  const rateSummary = useMemo(() => {
    if (!selectedRate || !amountSrc) return null;
    const srcAmountMinor = Number(amountSrc);
    const dstAmountMinor = selectedRate.rate?.[1] ?? 0;
    if (!srcAmountMinor || !dstAmountMinor) return null;
    const srcAmountMajor = minorToMajor(srcAmountMinor, FROM_PRECISION);
    const dstAmountMajor = minorToMajor(dstAmountMinor, TO_PRECISION);
    return {
      amountDst: dstAmountMajor,
      ratio: dstAmountMajor / srcAmountMajor,
    };
  }, [selectedRate, amountSrc]);

  const rateError = useMemo(() => {
    if (parsedAmount < MIN_TOPUP_AMOUNT) return null;
    if (!sourceAccountUrn && !isLoadingCards) {
      return 'No encontramos una tarjeta para hacer la recarga.';
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

      return bloque.swap.bankTransfer.create({
        rateSig: selectedRate.sig,
        amountSrc,
        toMedium: TO_MEDIUM,
        depositInformation: bankForm,
        args: {
          sourceAccountUrn,
        },
      });
    },
    onSuccess: (result) => {
      const redirectUrl = result.execution?.result?.how?.url;
      setLastOrder({ id: result.order.id, redirectUrl });
      setStep('pending');
      toast.success('Transferencia enviada correctamente.');
      if (redirectUrl) {
        window.open(redirectUrl, '_blank', 'noopener,noreferrer');
      }
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudo enviar la transferencia.';
      toast.error(message);
      setStep('error');
    },
  });

  const handleAmountNext = () => {
    if (parsedAmount < MIN_TOPUP_AMOUNT) {
      toast.error('El monto mínimo es $10,000 COP.');
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
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        Recargar saldo
      </h1>

      {step !== 'method' && (
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
      )}

      {step === 'method' && (
        <section className="flex flex-col gap-3">
          {[
            {
              title: 'Bancos colombianos',
              subtitle: 'PSE',
              icon: Building2,
              enabled: true,
              onClick: () => setStep('amount'),
            },
            {
              title: 'Desde bancos en EE.UU.',
              subtitle: 'ACH / Wire',
              icon: Building2,
              enabled: true,
              onClick: () =>
                toast.info(
                  'Recarga desde bancos en EE.UU. disponible proximamente.',
                ),
            },
            {
              title: 'Desde direcciones blockchain',
              subtitle: 'Wallets externas',
              icon: Wallet,
              enabled: true,
              onClick: () =>
                toast.info(
                  'Recarga desde direcciones blockchain disponible proximamente.',
                ),
            },
            {
              title: 'Con tarjeta',
              subtitle: 'Visa, Mastercard, etc',
              icon: CreditCard,
              enabled: true,
              onClick: () =>
                toast.info('Recarga con tarjeta disponible próximamente.'),
            },
          ].map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.title}
                type="button"
                onClick={option.onClick}
                className={cn(
                  'flex w-full items-start gap-3 rounded-2xl border border-border/75 bg-card/80 p-4 text-left transition-all',
                  option.enabled
                    ? 'hover:bg-muted/70'
                    : 'cursor-not-allowed opacity-60',
                )}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border/80 bg-background/85">
                  <Icon className="h-4 w-4 text-foreground" />
                </div>
                <div className="flex flex-col">
                  <p className="text-sm font-medium text-foreground">
                    {option.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {option.subtitle}
                  </p>
                </div>
              </button>
            );
          })}
        </section>
      )}

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
