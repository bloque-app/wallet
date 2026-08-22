import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Building2, CreditCard, KeyRound, Wallet } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '~/components/ui/select';
import { Separator } from '~/components/ui/separator';
import { useAuth } from '~/contexts/auth/auth-context';
import type { ExecutionOutcome } from '~/domain/payments/types';
import { useAccountPicker } from '~/hooks/accounts/use-account-picker';
import { useCreatePseOrder, usePseBanks } from '~/hooks/payments/use-pse-topup';
import { useRates } from '~/hooks/payments/use-rates';
import { formatAmount, formatCOP } from '~/lib/formatters';
import { cn } from '~/lib/utils';
import { TopUpErrorStep } from './-components/error-step';
import { ExecutionOutcomeStep } from './-components/execution-outcome-step';

type TopUpStep =
  | 'method'
  | 'amount'
  | 'details'
  | 'confirm'
  | 'pending'
  | 'error';
type ReceiveAsset = 'COP' | 'USD';

type PseForm = {
  bankCode: string;
  userType: '0' | '1';
  customerEmail: string;
  userLegalIdType: 'CC' | 'NIT' | 'CE';
  userLegalId: string;
  fullName: string;
  phoneNumber: string;
};

const MIN_TOPUP_AMOUNT = 5_000;
const FROM_ASSET = 'COP/2';
const FROM_MEDIUM = 'pse';
const TO_MEDIUM = 'kusama';

const RECEIVE_ASSETS: Array<{
  value: ReceiveAsset;
  sdkAsset: 'COPM/2' | 'DUSD/6';
  precision: number;
}> = [
  { value: 'COP', sdkAsset: 'COPM/2', precision: 2 },
  { value: 'USD', sdkAsset: 'DUSD/6', precision: 6 },
];

function majorToMinor(amountMajor: number, precision: number) {
  return (BigInt(amountMajor) * 10n ** BigInt(precision)).toString();
}

function minorToMajor(amountMinor: number, precision: number) {
  return amountMinor / 10 ** precision;
}

export const Route = createFileRoute('/_authed/topup/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<TopUpStep>('method');
  const [receiveAsset, setReceiveAsset] = useState<ReceiveAsset>('COP');
  const [amount, setAmount] = useState('');
  const [form, setForm] = useState<PseForm>({
    bankCode: '',
    userType: '0',
    customerEmail: user.email ?? '',
    userLegalIdType: 'CC',
    userLegalId: '',
    fullName: user.name ?? '',
    phoneNumber: '',
  });
  const [lastOrder, setLastOrder] = useState<{
    id: string;
    execution: ExecutionOutcome;
  } | null>(null);
  const [autoRetry, setAutoRetry] = useState(false);

  const parsedAmount = Number.parseInt(amount.replace(/\D/g, ''), 10) || 0;
  const selectedReceiveAsset = RECEIVE_ASSETS.find(
    (asset) => asset.value === receiveAsset,
  )!;
  const amountSrc = useMemo(() => {
    if (parsedAmount <= 0) return '';
    return majorToMinor(parsedAmount, 2);
  }, [parsedAmount]);

  const { accounts: destinationAccounts, isLoading: isLoadingAccounts } =
    useAccountPicker();
  const destinationAccountUrn = destinationAccounts[0]?.primaryUrn;

  const banksQuery = usePseBanks();

  const ratesQuery = useRates(
    parsedAmount >= MIN_TOPUP_AMOUNT && amountSrc && destinationAccountUrn
      ? {
          fromAsset: FROM_ASSET,
          toAsset: selectedReceiveAsset.sdkAsset,
          fromMediums: [FROM_MEDIUM],
          toMediums: [TO_MEDIUM],
          amountSrc,
        }
      : undefined,
  );

  const selectedRate = ratesQuery.data?.[0] ?? null;
  const receiveAmount = useMemo(() => {
    if (!selectedRate || !amountSrc || parsedAmount <= 0) return 0;
    if (
      typeof selectedRate.ratio === 'number' &&
      Number.isFinite(selectedRate.ratio)
    ) {
      return parsedAmount * selectedRate.ratio;
    }
    const dstAmountMinor = selectedRate.rate?.[1] ?? 0;
    return minorToMajor(dstAmountMinor, selectedReceiveAsset.precision);
  }, [selectedRate, amountSrc, parsedAmount, selectedReceiveAsset.precision]);

  const rateError = useMemo(() => {
    if (parsedAmount < MIN_TOPUP_AMOUNT) return null;
    if (!destinationAccountUrn && !isLoadingAccounts) {
      return t('topup.noDestinationAccount');
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
    destinationAccountUrn,
    isLoadingAccounts,
    ratesQuery.isError,
    ratesQuery.isSuccess,
    selectedRate,
    t,
  ]);

  const detailsValid =
    !!form.bankCode &&
    !!form.customerEmail.trim() &&
    !!form.userLegalIdType &&
    !!form.userLegalId.trim() &&
    !!form.fullName.trim() &&
    !!form.phoneNumber.trim();

  const createOrderMutation = useCreatePseOrder();

  const submitOrder = useCallback(() => {
    if (!selectedRate?.sig) {
      toast.error(t('topup.noRateForOrder'));
      return;
    }
    if (!destinationAccountUrn) {
      toast.error(t('topup.noDestinationAccountShort'));
      return;
    }

    createOrderMutation.mutate(
      {
        params: {
          rateSig: selectedRate.sig,
          toMedium: TO_MEDIUM,
          amountSrc,
          depositInformation: {
            urn: destinationAccountUrn,
          },
          args: {
            bankCode: form.bankCode,
            userType: Number(form.userType) as 0 | 1,
            customerEmail: form.customerEmail.trim(),
            userLegalIdType: form.userLegalIdType,
            userLegalId: form.userLegalId.trim(),
            customerData: {
              fullName: form.fullName.trim(),
              phoneNumber: form.phoneNumber.trim(),
            },
            // Required as of @bloque/sdk-swap 0.8.0 — payment-rails now
            // rejects a PSE order up front without it. This is where the
            // bank sends the user's tab back once they finish paying (or
            // abandon); it opens in a new tab (see `window.open` below), so
            // the original tab keeps showing the pending step regardless.
            redirectUrl: `${window.location.origin}/topup`,
          },
        },
      },
      {
        onSuccess: (result) => {
          const execution = result.execution ?? { kind: 'none' as const };
          setLastOrder({ id: result.order.id, execution });
          setStep('pending');
          toast.success(t('topup.pseStartedToast'));
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
          toast.error(message || t('topup.startErrorToast'));
          setStep('error');
        },
      },
    );
  }, [
    selectedRate,
    destinationAccountUrn,
    amountSrc,
    form,
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

  const selectedBankName =
    banksQuery.data?.find((bank) => bank.code === form.bankCode)?.name ??
    t('topup.bankFallback');

  const stepLabels = [
    t('topup.stepAmount'),
    t('topup.stepDetails'),
    t('topup.stepConfirm'),
  ];

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold tracking-[-0.025em] text-foreground">
        {t('topup.title')}
      </h1>

      {step !== 'method' && (
        <div className="flex items-center gap-2 rounded-2xl border border-border/75 bg-card/80 p-3">
          {stepLabels.map((label, i) => {
            const stepIndex =
              step === 'amount'
                ? 0
                : step === 'details'
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
      )}

      {step === 'method' && (
        <section className="flex flex-col gap-3">
          {[
            {
              title: t('topup.methods.colombianBanks.title'),
              subtitle: t('topup.methods.colombianBanks.subtitle'),
              icon: Building2,
              enabled: true,
              onClick: () => setStep('amount'),
            },
            {
              title: t('topup.methods.brebKeys.title'),
              subtitle: t('topup.methods.brebKeys.subtitle'),
              icon: KeyRound,
              enabled: true,
              onClick: () =>
                navigate({
                  to: '/breb-keys/deposit',
                  search: { from: '/topup' },
                }),
            },
            {
              title: t('topup.methods.usBanks.title'),
              subtitle: t('topup.methods.usBanks.subtitle'),
              icon: Building2,
              enabled: false,
              onClick: () => toast.info(t('topup.methods.usBanks.comingSoon')),
            },
            {
              title: t('topup.methods.blockchain.title'),
              subtitle: t('topup.methods.blockchain.subtitle'),
              icon: Wallet,
              enabled: false,
              onClick: () =>
                toast.info(t('topup.methods.blockchain.comingSoon')),
            },
            {
              title: t('topup.methods.card.title'),
              subtitle: t('topup.methods.card.subtitle'),
              icon: CreditCard,
              enabled: false,
              onClick: () => toast.info(t('topup.methods.card.comingSoon')),
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
                  option.enabled ? 'hover:bg-muted/70' : 'opacity-60',
                )}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/[0.06]">
                  <Icon className="h-4 w-4 text-primary" />
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
        <section className="rounded-3xl border border-border/75 bg-card/80 p-5">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label>{t('topup.iWantToReceive')}</Label>
              <div className="grid grid-cols-2 gap-2">
                {RECEIVE_ASSETS.map((asset) => (
                  <button
                    key={asset.value}
                    type="button"
                    onClick={() => setReceiveAsset(asset.value)}
                    className={`rounded-2xl border px-3 py-3 text-sm transition-all ${
                      receiveAsset === asset.value
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border bg-background/70 text-foreground hover:bg-muted/70'
                    }`}
                  >
                    {asset.value}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="topup-amount">{t('topup.pseAmountLabel')}</Label>
              <Input
                id="topup-amount"
                inputMode="numeric"
                placeholder="$0"
                value={amount}
                onChange={(event) =>
                  setAmount(event.target.value.replace(/\D/g, ''))
                }
                className="h-14 rounded-2xl text-center text-xl font-bold tabular-nums"
              />
              {parsedAmount > 0 && parsedAmount < MIN_TOPUP_AMOUNT ? (
                <p className="text-xs text-destructive">
                  {t('topup.minAmount')}
                </p>
              ) : null}
            </div>

            {parsedAmount > 0 ? (
              <div className="rounded-2xl border border-border/85 bg-background/70 p-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t('topup.youPay')}
                    </span>
                    <span className="font-medium text-foreground">
                      {formatCOP(parsedAmount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t('topup.youReceive')}
                    </span>
                    <span className="font-medium text-foreground">
                      {selectedRate
                        ? formatAmount(receiveAsset, receiveAmount)
                        : t('convert.querying')}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}

            {rateError ? (
              <p className="text-xs text-destructive">{rateError}</p>
            ) : null}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep('method')}
                className="h-12 flex-1 rounded-2xl"
              >
                {t('common.back')}
              </Button>
              <Button
                onClick={() => setStep('details')}
                disabled={
                  parsedAmount < MIN_TOPUP_AMOUNT ||
                  !selectedRate ||
                  ratesQuery.isFetching
                }
                className="h-12 flex-1 rounded-2xl"
              >
                {t('common.continue')}
              </Button>
            </div>
          </div>
        </section>
      )}

      {step === 'details' && (
        <section className="rounded-3xl border border-border/75 bg-card/80 p-5">
          <div className="flex flex-col gap-5">
            <button
              type="button"
              onClick={() => setStep('amount')}
              className="text-left text-sm text-muted-foreground hover:text-foreground"
            >
              {t('common.back')}
            </button>

            <div className="flex flex-col gap-2">
              <Label>{t('topup.pseBank')}</Label>
              <Select
                value={form.bankCode}
                onValueChange={(value) =>
                  setForm({ ...form, bankCode: value ?? '' })
                }
              >
                <SelectTrigger className="h-12 rounded-2xl">
                  {form.bankCode ? (
                    <span>{selectedBankName}</span>
                  ) : (
                    <span className="text-muted-foreground">
                      {t('topup.selectYourBank')}
                    </span>
                  )}
                </SelectTrigger>
                <SelectContent>
                  {banksQuery.data?.map((bank) => (
                    <SelectItem key={bank.code} value={bank.code}>
                      {bank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>{t('topup.userType')}</Label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ['0', t('topup.userTypeNatural')],
                    ['1', t('topup.userTypeLegal')],
                  ] as const
                ).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setForm({ ...form, userType: val })}
                    className={cn(
                      'h-12 rounded-2xl border px-3 text-sm font-medium transition-all',
                      form.userType === val
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
              <Label>{t('topup.documentType')}</Label>
              <Select
                value={form.userLegalIdType}
                onValueChange={(value) =>
                  setForm({
                    ...form,
                    userLegalIdType: value as 'CC' | 'NIT' | 'CE',
                  })
                }
              >
                <SelectTrigger className="h-12 rounded-2xl">
                  {form.userLegalIdType === 'CC' && (
                    <span>{t('topup.idTypeCc')}</span>
                  )}
                  {form.userLegalIdType === 'NIT' && <span>NIT</span>}
                  {form.userLegalIdType === 'CE' && (
                    <span>{t('topup.idTypeCe')}</span>
                  )}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CC">{t('topup.idTypeCc')}</SelectItem>
                  <SelectItem value="NIT">NIT</SelectItem>
                  <SelectItem value="CE">{t('topup.idTypeCe')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="pse-id">{t('topup.documentNumber')}</Label>
              <Input
                id="pse-id"
                inputMode="numeric"
                value={form.userLegalId}
                onChange={(event) =>
                  setForm({
                    ...form,
                    userLegalId: event.target.value.replace(/\D/g, ''),
                  })
                }
                className="h-12 rounded-2xl"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="pse-name">{t('topup.fullName')}</Label>
              <Input
                id="pse-name"
                value={form.fullName}
                onChange={(event) =>
                  setForm({ ...form, fullName: event.target.value })
                }
                className="h-12 rounded-2xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="pse-email">{t('topup.email')}</Label>
                <Input
                  id="pse-email"
                  value={form.customerEmail}
                  onChange={(event) =>
                    setForm({ ...form, customerEmail: event.target.value })
                  }
                  className="h-12 rounded-2xl"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="pse-phone">{t('topup.phone')}</Label>
                <Input
                  id="pse-phone"
                  inputMode="numeric"
                  value={form.phoneNumber}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      phoneNumber: event.target.value.replace(/\D/g, ''),
                    })
                  }
                  className="h-12 rounded-2xl"
                />
              </div>
            </div>

            <Button
              onClick={() => setStep('confirm')}
              disabled={!detailsValid || banksQuery.isLoading}
              className="h-12 rounded-2xl"
            >
              {t('common.continue')}
            </Button>
          </div>
        </section>
      )}

      {step === 'confirm' && (
        <section className="rounded-3xl border border-border/75 bg-card/80 p-5">
          <div className="flex flex-col gap-5">
            <button
              type="button"
              onClick={() => setStep('details')}
              className="text-left text-sm text-muted-foreground hover:text-foreground"
            >
              {t('common.back')}
            </button>

            <div className="rounded-2xl border border-border/85 bg-background/70 p-4">
              <div className="flex flex-col gap-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t('topup.youPay')}
                  </span>
                  <span className="font-medium text-foreground">
                    {formatCOP(parsedAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t('topup.youReceive')}
                  </span>
                  <span className="font-medium text-foreground">
                    {formatAmount(receiveAsset, receiveAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t('topup.bank')}
                  </span>
                  <span className="font-medium text-foreground">
                    {selectedBankName}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t('topup.accountHolder')}
                  </span>
                  <span className="font-medium text-foreground">
                    {form.fullName}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t('topup.document')}
                  </span>
                  <span className="font-medium text-foreground">
                    {form.userLegalIdType} {form.userLegalId}
                  </span>
                </div>
                <Separator />
                <p className="text-xs text-muted-foreground">
                  {t('topup.redirectDisclaimer')}
                </p>
              </div>
            </div>

            <Button
              onClick={submitOrder}
              disabled={createOrderMutation.isPending}
              className="h-12 rounded-2xl"
            >
              {createOrderMutation.isPending
                ? t('topup.startingPayment')
                : t('topup.goToPse')}
            </Button>
          </div>
        </section>
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
