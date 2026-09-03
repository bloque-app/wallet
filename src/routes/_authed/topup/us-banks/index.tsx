import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { ExecutionOutcome } from '~/domain/payments/types';
import { useAccountPicker } from '~/hooks/accounts/use-account-picker';
import { useAccounts } from '~/hooks/accounts/use-accounts';
import { useCreateExternalUsBankAccount } from '~/hooks/accounts/use-external-us-bank-account';
import { useCreateExternalUsBankOrder } from '~/hooks/payments/use-external-us-bank-order';
import { useRates } from '~/hooks/payments/use-rates';
import { formatUSD, getAssetPrecision } from '~/lib/formatters';
import { TopUpErrorStep } from '../-components/error-step';
import { ExecutionOutcomeStep } from '../-components/execution-outcome-step';
import { LinkBankStep } from '../-components/link-bank-step';
import { UsAmountStep } from '../-components/us-amount-step';
import { UsConfirmStep } from '../-components/us-confirm-step';

type PayinStep = 'link' | 'amount' | 'confirm' | 'pending' | 'error';

const PENDING_URN_KEY = 'bloque:pendingExternalUsBankUrn';
const MIN_TOPUP_AMOUNT_USD = 10;
const FROM_ASSET = 'USD/2';
const TO_ASSET = 'DUSD/6';
const FROM_MEDIUM = 'external-us-bank';
const TO_MEDIUM = 'kusama';
const FROM_PRECISION = getAssetPrecision(FROM_ASSET);

/** Converts a decimal major-unit string (e.g. "50.25") to a bigint-string of
 * minor units, via string manipulation to avoid float precision loss. */
function majorToMinor(amountMajorStr: string, precision: number) {
  const [intPartRaw, fracPartRaw = ''] = amountMajorStr.split('.');
  const intPart = intPartRaw || '0';
  const frac = (fracPartRaw + '0'.repeat(precision)).slice(0, precision);
  const combined = `${intPart}${frac}`.replace(/^0+(?=\d)/, '');
  return combined || '0';
}

function minorToMajor(amountMinor: number, precision: number) {
  return amountMinor / 10 ** precision;
}

export const Route = createFileRoute('/_authed/topup/us-banks/')({
  validateSearch: (search: Record<string, unknown>): { status?: string } =>
    typeof search.status === 'string' ? { status: search.status } : {},
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useTranslation();
  const search = Route.useSearch();
  const [step, setStep] = useState<PayinStep>('link');
  const [amount, setAmount] = useState('');
  const [lastOrder, setLastOrder] = useState<{
    id: string;
    execution: ExecutionOutcome;
  } | null>(null);
  const [autoRetry, setAutoRetry] = useState(false);
  const [pendingUrn, setPendingUrn] = useState<string | null>(() =>
    typeof window === 'undefined'
      ? null
      : window.sessionStorage.getItem(PENDING_URN_KEY),
  );

  const { accounts: activeBankAccounts } = useAccountPicker({
    requireProductKind: 'external-us-bank',
    requireActive: false,
    requireLinkStatus: 'active',
  });
  const sourceBankProduct = activeBankAccounts[0]?.products.find(
    (p) => p.kind === 'external-us-bank',
  );
  // A linked bank can be `linkStatus: 'active'` yet still need Plaid
  // re-authentication (`needsUpdate`) — not a usable ACH source until relinked.
  const bankNeedsUpdate =
    sourceBankProduct?.kind === 'external-us-bank' &&
    sourceBankProduct.needsUpdate === true;
  const sourceAccountUrn =
    sourceBankProduct?.kind === 'external-us-bank' && !bankNeedsUpdate
      ? sourceBankProduct.urn
      : '';

  const { accounts: destinationAccounts } = useAccountPicker({
    requireProductKind: 'pocket',
  });
  const ledgerAccountId = destinationAccounts[0]?.ledgerId ?? '';

  // Function form (not a static boolean): must inspect the *freshest* fetched
  // data on every tick to know when to stop — a value computed once per
  // render would keep re-scheduling forever once the account settles into
  // `link_failed` without any further data change to trigger a re-render.
  const accountsQuery = useAccounts({
    refetchInterval: (query) => {
      if (!pendingUrn) return false;
      const product = (query.state.data ?? [])
        .flatMap((account) => account.products)
        .find((p) => p.urn === pendingUrn);
      if (
        product?.kind === 'external-us-bank' &&
        product.linkStatus !== 'pending_link'
      ) {
        return false;
      }
      return 3000;
    },
  });

  const pendingProduct = pendingUrn
    ? (accountsQuery.data ?? [])
        .flatMap((account) => account.products)
        .find((product) => product.urn === pendingUrn)
    : undefined;

  const linkStepStatus: 'idle' | 'linking' | 'failed' | 'needs_update' =
    pendingProduct?.kind === 'external-us-bank' &&
    pendingProduct.linkStatus === 'link_failed'
      ? 'failed'
      : pendingUrn
        ? 'linking'
        : bankNeedsUpdate
          ? 'needs_update'
          : 'idle';

  useEffect(() => {
    if (sourceAccountUrn) {
      window.sessionStorage.removeItem(PENDING_URN_KEY);
      setPendingUrn((current) => (current ? null : current));
      setStep((current) => (current === 'link' ? 'amount' : current));
    }
  }, [sourceAccountUrn]);

  // A failed link must stop polling and not resume silently on a future
  // visit — clear the persisted marker while still rendering this render's
  // "failed" state from the in-memory `pendingUrn`.
  useEffect(() => {
    if (linkStepStatus === 'failed') {
      window.sessionStorage.removeItem(PENDING_URN_KEY);
    }
  }, [linkStepStatus]);

  // Plaid's hosted page echoes `?status=...` on redirect back — check
  // immediately instead of waiting for the first 3s poll tick. Only on
  // mount: reacting to these again on their own would refetch every render,
  // since `accountsQuery.refetch` is a fresh reference each render.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally mount-only
  useEffect(() => {
    if (search.status && pendingUrn) {
      void accountsQuery.refetch();
    }
  }, []);

  const createLinkMutation = useCreateExternalUsBankAccount();

  const handleStartLink = () => {
    createLinkMutation.mutate(
      { returnUrl: `${window.location.origin}/topup/us-banks` },
      {
        onSuccess: (product) => {
          if (product.kind !== 'external-us-bank' || !product.linkUrl) {
            toast.error(t('topup.usBanks.linkStep.startErrorToast'));
            return;
          }
          window.sessionStorage.setItem(PENDING_URN_KEY, product.urn);
          setPendingUrn(product.urn);
          window.location.href = product.linkUrl;
        },
        onError: () => {
          toast.error(t('topup.usBanks.linkStep.startErrorToast'));
        },
      },
    );
  };

  const parsedAmount = Number.parseFloat(amount) || 0;
  const amountSrc = useMemo(() => {
    if (parsedAmount <= 0) return '';
    return majorToMinor(amount, FROM_PRECISION);
  }, [amount, parsedAmount]);

  const ratesQuery = useRates(
    parsedAmount >= MIN_TOPUP_AMOUNT_USD && amountSrc && sourceAccountUrn
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
        : (selectedRate.rate?.[1] || 1) / (selectedRate.rate?.[0] || 1);
    const dstAmountMajor = srcAmountMajor * ratio;
    return {
      amountDst: dstAmountMajor,
      ratio,
      ratioLabel: `1 USD = ${ratio.toFixed(4)} DUSD`,
    };
  }, [selectedRate, amountSrc]);

  const rateError = useMemo(() => {
    if (parsedAmount < MIN_TOPUP_AMOUNT_USD) return null;
    if (!sourceAccountUrn) {
      return t('topup.usBanks.noSourceAccount');
    }
    if (!ledgerAccountId) {
      return t('topup.usBanks.noDestinationAccount');
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
    ledgerAccountId,
    ratesQuery.isError,
    ratesQuery.isSuccess,
    selectedRate,
    t,
  ]);

  const createOrderMutation = useCreateExternalUsBankOrder();

  const submitOrder = useCallback(() => {
    if (!selectedRate?.sig) {
      toast.error(t('topup.usBanks.noRateForOrder'));
      return;
    }
    if (!amountSrc) {
      toast.error(t('topup.usBanks.invalidAmountForOrder'));
      return;
    }
    if (!sourceAccountUrn) {
      toast.error(t('topup.usBanks.noSourceAccount'));
      return;
    }
    if (!ledgerAccountId) {
      toast.error(t('topup.usBanks.noDestinationAccount'));
      return;
    }

    createOrderMutation.mutate(
      {
        params: {
          rateSig: selectedRate.sig,
          amountSrc,
          depositInformation: { ledgerAccountId },
          args: { sourceAccountUrn },
        },
      },
      {
        onSuccess: (result) => {
          const execution = result.execution ?? { kind: 'none' as const };
          setLastOrder({ id: result.order.id, execution });
          setStep('pending');
          toast.success(t('topup.usBanks.topupStartedToast'));
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
          toast.error(message || t('topup.usBanks.startErrorToast'));
          setStep('error');
        },
      },
    );
  }, [
    selectedRate,
    amountSrc,
    sourceAccountUrn,
    ledgerAccountId,
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
    if (parsedAmount < MIN_TOPUP_AMOUNT_USD) {
      toast.error(t('topup.usBanks.minAmountToast'));
      return;
    }
    if (!selectedRate) {
      toast.error(t('topup.usBanks.noRateToContinue'));
      return;
    }
    setStep('confirm');
  };

  const sourceBankLabel =
    sourceBankProduct?.kind === 'external-us-bank'
      ? (sourceBankProduct.bankName ??
        activeBankAccounts[0]?.label ??
        t('topup.usBanks.linkedBankLabel'))
      : t('topup.usBanks.linkedBankLabel');

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold tracking-[-0.025em] text-foreground">
        {t('topup.usBanks.title')}
      </h1>

      {step !== 'link' && (
        <div className="flex items-center gap-2 rounded-2xl border border-border/75 bg-card/80 p-3">
          {[
            t('topup.usBanks.stepLink'),
            t('topup.stepAmount'),
            t('topup.stepConfirm'),
          ].map((label, i) => {
            const stepIndex =
              step === 'amount' ? 1 : step === 'confirm' ? 2 : 3;
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

      {step === 'link' && (
        <LinkBankStep
          status={linkStepStatus}
          isStarting={createLinkMutation.isPending}
          onStartLink={handleStartLink}
          onCheckAgain={() => void accountsQuery.refetch()}
        />
      )}

      {step === 'amount' && (
        <UsAmountStep
          amount={amount}
          minAmount={MIN_TOPUP_AMOUNT_USD}
          isLoadingRate={ratesQuery.isFetching}
          rateError={rateError}
          rateSummary={rateSummary}
          onAmountChange={setAmount}
          onNext={handleAmountNext}
        />
      )}

      {step === 'confirm' && (
        <UsConfirmStep
          amount={parsedAmount}
          amountDst={rateSummary?.amountDst ?? 0}
          ratioLabel={rateSummary?.ratioLabel ?? ''}
          details={[
            {
              label: t('topup.usBanks.confirmStep.sourceBank'),
              value: sourceBankLabel,
            },
          ]}
          isSubmitting={createOrderMutation.isPending}
          onBack={() => setStep('amount')}
          onConfirm={submitOrder}
        />
      )}

      {step === 'pending' && (
        <ExecutionOutcomeStep
          amount={parsedAmount}
          orderId={lastOrder?.id}
          execution={lastOrder?.execution}
          formatAmount={formatUSD}
          onError={() => setStep('error')}
        />
      )}

      {step === 'error' && <TopUpErrorStep onRetry={() => setStep('amount')} />}
    </div>
  );
}
