import { createFileRoute, useRouter } from '@tanstack/react-router';
import { ArrowLeft, Landmark, Send } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { AccountCarousel } from '~/components/account/account-carousel';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Textarea } from '~/components/ui/textarea';
import type { ExecutionOutcome } from '~/domain/payments/types';
import { useAccountPicker } from '~/hooks/accounts/use-account-picker';
import { useCreateBrebOrder } from '~/hooks/payments/use-breb-order';
import { useRates } from '~/hooks/payments/use-rates';
import { formatCOP, getAssetPrecision } from '~/lib/formatters';
import { goBackOrFallback } from '~/lib/navigation';
import { TopUpErrorStep } from '../../topup/-components/error-step';
import { ExecutionOutcomeStep } from '../../topup/-components/execution-outcome-step';
import {
  type BrebKeyType,
  buildUnverifiedRecipient,
  getRecipientName,
  type ResolvedRecipient,
} from '../-lib/breb';

type ViewState = 'form' | 'pending' | 'error';

const MIN_TRANSFER_AMOUNT = 10;
const FROM_ASSET = 'COPM/2';
const TO_ASSET = 'COP/2';
const FROM_MEDIUM = 'kusama';
const TO_MEDIUM = 'breb' as const;

function majorToMinor(amountMajor: number, precision: number) {
  return (BigInt(amountMajor) * 10n ** BigInt(precision)).toString();
}

const FROM_PRECISION = getAssetPrecision(FROM_ASSET);

function normalizeBrebKey(value: string) {
  return value.trim();
}

function inferBrebKeyType(value: string): BrebKeyType | null {
  const normalized = normalizeBrebKey(value);

  if (!normalized) return null;
  if (normalized.includes('@') && !normalized.startsWith('@')) return 'EMAIL';
  if (normalized.startsWith('@')) return 'ALPHA';
  if (/^\d{10}$/.test(normalized)) return 'PHONE';
  if (/^\d+$/.test(normalized)) return 'ID';
  return 'ALPHA';
}

export const Route = createFileRoute('/_authed/breb-keys/pay-transfer/')({
  validateSearch: (search: Record<string, unknown>) => ({
    from: (search.from as string | undefined) ?? '/breb-keys',
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useTranslation();
  const { from } = Route.useSearch();
  const { history } = useRouter();
  const [view, setView] = useState<ViewState>('form');
  const [key, setKey] = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [recipientPreview, setRecipientPreview] =
    useState<ResolvedRecipient | null>(null);
  const [lastOrder, setLastOrder] = useState<{
    id: string;
    execution: ExecutionOutcome;
  } | null>(null);
  const [autoRetry, setAutoRetry] = useState(false);
  const [selectedLedgerId, setSelectedLedgerId] = useState<string | null>(null);

  const normalizedKey = normalizeBrebKey(key);
  const inferredKeyType = inferBrebKeyType(normalizedKey);
  const parsedAmount = Number.parseInt(amount.replace(/\D/g, ''), 10) || 0;
  const amountSrc = useMemo(() => {
    if (parsedAmount <= 0) return '';
    return majorToMinor(parsedAmount, FROM_PRECISION);
  }, [parsedAmount]);

  const hasValidKey = inferredKeyType !== null;
  // Cobre — the active BRE-B provider — only has ALPHA (@alias) keys
  // operationally verified for payouts today (see `buildUnverifiedRecipient`).
  const isAlphaKey = inferredKeyType === 'ALPHA';

  const { accounts: fundedAccounts, isLoading: isLoadingFundedAccounts } =
    useAccountPicker({ asset: FROM_ASSET, requireProductKind: 'breb' });

  useEffect(() => {
    if (fundedAccounts.length === 1 && fundedAccounts[0]) {
      setSelectedLedgerId(fundedAccounts[0].ledgerId);
      return;
    }
    setSelectedLedgerId((current) =>
      current && fundedAccounts.some((account) => account.ledgerId === current)
        ? current
        : null,
    );
  }, [fundedAccounts]);

  const selectedAccount =
    fundedAccounts.find((account) => account.ledgerId === selectedLedgerId) ??
    null;
  const selectedSourceBrebUrn = selectedAccount?.products.find(
    (product) => product.kind === 'breb',
  )?.urn;
  const selectedBalance = selectedAccount?.balances.find(
    (balance) => balance.asset === FROM_ASSET,
  );

  const ratesQuery = useRates(
    parsedAmount >= MIN_TRANSFER_AMOUNT && amountSrc
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

  const formError = useMemo(() => {
    if (!isLoadingFundedAccounts && fundedAccounts.length === 0) {
      return t('brebKeys.payTransfer.noFundedAccounts');
    }
    if (fundedAccounts.length > 1 && !selectedAccount) {
      return t('brebKeys.payTransfer.selectSourceAccount');
    }
    if (key.length > 0 && !hasValidKey) {
      return t('brebKeys.payTransfer.invalidKey');
    }
    if (key.length > 0 && hasValidKey && !isAlphaKey) {
      return t('brebKeys.payTransfer.onlyAlphaKeysSupported');
    }
    if (parsedAmount > 0 && parsedAmount < MIN_TRANSFER_AMOUNT) {
      return t('brebKeys.payTransfer.minAmount');
    }
    if (ratesQuery.isError) {
      return t('convert.rateFetchError');
    }
    if (
      parsedAmount >= MIN_TRANSFER_AMOUNT &&
      ratesQuery.isSuccess &&
      !selectedRate
    ) {
      return t('convert.noRatesAvailable');
    }
    return null;
  }, [
    isLoadingFundedAccounts,
    fundedAccounts.length,
    hasValidKey,
    isAlphaKey,
    key.length,
    parsedAmount,
    ratesQuery.isError,
    ratesQuery.isSuccess,
    selectedRate,
    selectedAccount,
    t,
  ]);

  const createOrderMutation = useCreateBrebOrder();

  const submitOrder = useCallback(() => {
    if (!recipientPreview?.resolutionId) {
      toast.error(t('brebKeys.payTransfer.noRecipientConfirmed'));
      return;
    }
    if (!selectedRate?.sig) {
      toast.error(t('brebKeys.payTransfer.noRateToSend'));
      return;
    }
    if (!selectedSourceBrebUrn) {
      toast.error(t('brebKeys.payTransfer.selectSourceAccount'));
      return;
    }

    createOrderMutation.mutate(
      {
        params: {
          rateSig: selectedRate.sig,
          amountSrc,
          depositInformation: {
            resolutionId: recipientPreview.resolutionId,
            destinationKey: {
              keyValue: recipientPreview.key.keyValue,
              keyType: recipientPreview.key.keyType,
            },
          },
          args: { sourceAccountUrn: selectedSourceBrebUrn },
          metadata: message.trim() ? { message: message.trim() } : undefined,
        },
      },
      {
        onSuccess: (result) => {
          setConfirmOpen(false);
          setLastOrder({
            id: result.order.id,
            execution: result.execution ?? { kind: 'none' },
          });
          setView('pending');
          toast.success(t('brebKeys.payTransfer.transferSentToast'));
        },
        onError: (error) => {
          const msg = error instanceof Error ? error.message : '';
          if (msg.includes('E_RATE_EXPIRED')) {
            toast.info(t('topup.rateExpiredToast'));
            setConfirmOpen(false);
            setAutoRetry(true);
            void ratesQuery.refetch();
            return;
          }
          toast.error(msg || t('brebKeys.payTransfer.transferErrorToast'));
          setView('error');
        },
      },
    );
  }, [
    recipientPreview,
    selectedRate,
    amountSrc,
    selectedSourceBrebUrn,
    message,
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
    }
  }, [autoRetry, ratesQuery.isFetching, selectedRate, submitOrder, t]);

  const canSubmit =
    !!selectedSourceBrebUrn &&
    isAlphaKey &&
    parsedAmount >= MIN_TRANSFER_AMOUNT &&
    !!selectedRate &&
    !createOrderMutation.isPending;

  const handleBack = () => {
    goBackOrFallback(() => history.push(from));
  };

  if (view === 'pending') {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('common.back')}
          </button>
          <h1 className="text-xl font-bold tracking-[-0.025em] text-foreground">
            {t('brebKeys.payTransfer.title')}
          </h1>
        </div>

        <ExecutionOutcomeStep
          amount={parsedAmount}
          orderId={lastOrder?.id}
          execution={lastOrder?.execution}
          onError={() => setView('error')}
        />
      </div>
    );
  }

  if (view === 'error') {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('common.back')}
          </button>
          <h1 className="text-xl font-bold tracking-[-0.025em] text-foreground">
            {t('brebKeys.payTransfer.title')}
          </h1>
        </div>
        <TopUpErrorStep onRetry={() => setView('form')} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('common.back')}
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-[-0.025em] text-foreground">
            {t('brebKeys.payTransfer.title')}
          </h1>
          <p className="text-xs text-muted-foreground">
            {t('brebKeys.payTransfer.subtitle')}
          </p>
        </div>
      </div>

      <section className="rounded-3xl border border-border/75 bg-card/80 p-5">
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3 rounded-2xl border border-border/75 bg-background/70 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/[0.06]">
              <Landmark className="h-4 w-4 text-primary" />
            </div>
            <div className="flex flex-col">
              <p className="text-sm font-medium text-foreground">
                {t('brebKeys.payTransfer.immediateByKey')}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="breb-key">
              {t('brebKeys.payTransfer.keyLabel')}
            </Label>
            <Input
              id="breb-key"
              inputMode="text"
              placeholder={t('brebKeys.payTransfer.keyPlaceholder')}
              value={key}
              onChange={(event) => setKey(event.target.value)}
              className="h-12 rounded-2xl"
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>

          {fundedAccounts.length > 1 ? (
            <AccountCarousel
              accounts={fundedAccounts}
              asset={FROM_ASSET}
              precision={FROM_PRECISION}
              unit="COP"
              value={selectedLedgerId}
              onChange={setSelectedLedgerId}
              label={t('brebKeys.payTransfer.sendFrom')}
            />
          ) : null}

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="breb-amount">
                {t('brebKeys.payTransfer.amount')}
              </Label>
              {selectedBalance ? (
                <span className="text-xs text-muted-foreground">
                  {t('brebKeys.payTransfer.available', {
                    amount: formatCOP(
                      Number.parseInt(selectedBalance.current, 10) /
                        10 ** FROM_PRECISION,
                    ),
                  })}
                </span>
              ) : null}
            </div>
            <Input
              id="breb-amount"
              inputMode="numeric"
              placeholder="$0"
              value={amount}
              onChange={(event) =>
                setAmount(event.target.value.replace(/\D/g, ''))
              }
              className="h-12 rounded-2xl"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="breb-message">
              {t('brebKeys.payTransfer.message')}
            </Label>
            <Textarea
              id="breb-message"
              placeholder={t('brebKeys.payTransfer.messagePlaceholder')}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="min-h-24 resize-none rounded-2xl"
              maxLength={140}
            />
          </div>

          {formError ? (
            <p className="text-xs text-destructive">{formError}</p>
          ) : null}

          {parsedAmount >= MIN_TRANSFER_AMOUNT ? (
            <div className="rounded-2xl border border-border/85 bg-background/70 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {t('brebKeys.payTransfer.youSend')}
                </span>
                <span className="font-medium text-foreground">
                  {formatCOP(parsedAmount)}
                </span>
              </div>
            </div>
          ) : null}

          <Button
            onClick={() => {
              setRecipientPreview(
                buildUnverifiedRecipient(
                  inferredKeyType ?? 'ALPHA',
                  normalizedKey,
                ),
              );
              setConfirmOpen(true);
            }}
            disabled={!canSubmit}
            className="h-12 w-full gap-2 rounded-2xl text-sm font-medium"
          >
            <Send className="h-4 w-4" />
            {createOrderMutation.isPending
              ? t('brebKeys.payTransfer.sending')
              : t('brebKeys.payTransfer.sendMoney')}
          </Button>
        </div>
      </section>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader className="items-start text-left">
            <AlertDialogTitle>
              {t('brebKeys.payTransfer.confirmSend')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('brebKeys.payTransfer.confirmSendDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="rounded-2xl border border-border/85 bg-background/70 p-4">
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  {t('brebKeys.payTransfer.recipient')}
                </span>
                <span className="max-w-[60%] text-right font-semibold text-foreground">
                  {recipientPreview ? getRecipientName(recipientPreview) : '-'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  {t('brebKeys.payTransfer.key')}
                </span>
                <span className="font-medium text-foreground">
                  {recipientPreview?.key.keyValue ?? normalizedKey}
                </span>
              </div>
              {selectedAccount ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">
                    {t('brebKeys.payTransfer.from')}
                  </span>
                  <span className="font-medium text-foreground">
                    {selectedAccount.label}
                  </span>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  {t('brebKeys.payTransfer.amount')}
                </span>
                <span className="font-medium text-foreground">
                  {formatCOP(parsedAmount)}
                </span>
              </div>
              {message.trim() ? (
                <div className="flex flex-col gap-1 pt-2">
                  <span className="text-muted-foreground">
                    {t('brebKeys.payTransfer.message')}
                  </span>
                  <p className="text-foreground">{message.trim()}</p>
                </div>
              ) : null}
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={createOrderMutation.isPending}
              onClick={() => setRecipientPreview(null)}
            >
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={createOrderMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                submitOrder();
              }}
            >
              {createOrderMutation.isPending
                ? t('brebKeys.payTransfer.sending')
                : t('brebKeys.payTransfer.confirmSend')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
