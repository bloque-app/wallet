import type { Alias } from '@bloque/sdk-identity';
import { useMutation } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Send, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
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
import { useAccountPicker } from '~/hooks/accounts/use-account-picker';
import { useTransfer } from '~/hooks/accounts/use-transfer';
import { bloque } from '~/lib/bloque';
import { formatAmount } from '~/lib/formatters';

export const Route = createFileRoute('/_authed/send/bloque-friends/')({
  component: RouteComponent,
});

type ViewState = 'form' | 'pending' | 'error';
type AssetOption = 'USD' | 'COP';
type TransferAsset = 'DUSD/6' | 'COPM/2';

const ASSET_OPTIONS: Array<{
  value: AssetOption;
  sdkAsset: TransferAsset;
  precision: number;
}> = [
  { value: 'USD', sdkAsset: 'DUSD/6', precision: 6 },
  { value: 'COP', sdkAsset: 'COPM/2', precision: 2 },
];

function majorToMinor(amountMajor: number, precision: number) {
  return (BigInt(amountMajor) * 10n ** BigInt(precision)).toString();
}

/** `metadata` is an `{ [key: string]: unknown }` bag — validate `name` before use. */
function getAliasDisplayName(aliasResult: Alias) {
  const metadataName = aliasResult.metadata.name;
  if (typeof metadataName === 'string' && metadataName.trim()) {
    return metadataName;
  }
  return aliasResult.metadata.alias || aliasResult.alias;
}

function RouteComponent() {
  const { t } = useTranslation();
  const [view, setView] = useState<ViewState>('form');
  const [selectedAsset, setSelectedAsset] = useState<AssetOption>('USD');
  const [alias, setAlias] = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [recipientPreview, setRecipientPreview] = useState<Alias | null>(null);
  const [lastTransfer, setLastTransfer] = useState<{
    destinationUrn: string;
    amount: number;
  } | null>(null);

  const { accounts: sourceAccounts, isLoading: isLoadingAccounts } =
    useAccountPicker();
  const sourceAccount = sourceAccounts[0];

  const selectedAssetConfig = ASSET_OPTIONS.find(
    (asset) => asset.value === selectedAsset,
  )!;
  const normalizedAlias = alias.trim();
  const parsedAmount = Number.parseInt(amount.replace(/\D/g, ''), 10) || 0;
  const amountMinor = useMemo(() => {
    if (parsedAmount <= 0) return '';
    return majorToMinor(parsedAmount, selectedAssetConfig.precision);
  }, [parsedAmount, selectedAssetConfig.precision]);

  const formError = useMemo(() => {
    if (!sourceAccount && !isLoadingAccounts) {
      return t('send.bloqueFriends.noSourceAccount');
    }
    if (!normalizedAlias && alias.length > 0) {
      return t('send.bloqueFriends.invalidAlias');
    }
    if (parsedAmount > 0 && parsedAmount < 1) {
      return t('send.bloqueFriends.invalidAmount');
    }
    return null;
  }, [
    isLoadingAccounts,
    alias.length,
    normalizedAlias,
    parsedAmount,
    sourceAccount,
    t,
  ]);

  const validateAliasMutation = useMutation({
    mutationFn: async () => await bloque.identity.aliases.get(normalizedAlias),
    onSuccess: (result) => {
      if (!result?.urn) {
        toast.error(t('send.bloqueFriends.aliasNotFound'));
        return;
      }
      setRecipientPreview(result);
      setConfirmOpen(true);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : t('send.bloqueFriends.aliasValidationError'),
      );
    },
  });

  const transferMutation = useTransfer();

  const submitTransfer = () => {
    if (!sourceAccount?.primaryUrn) {
      toast.error(t('send.bloqueFriends.noSourceAccount'));
      return;
    }
    if (!recipientPreview?.urn) {
      toast.error(t('send.bloqueFriends.noConfirmedRecipient'));
      return;
    }
    if (!amountMinor) {
      toast.error(t('send.bloqueFriends.invalidTransferAmount'));
      return;
    }

    transferMutation.mutate(
      {
        sourceUrn: sourceAccount.primaryUrn,
        destinationUrn: recipientPreview.urn,
        amount: amountMinor,
        asset: selectedAssetConfig.sdkAsset,
        metadata: {
          reference: `bloque-friend-${Date.now()}`,
          note: message.trim(),
        },
      },
      {
        onSuccess: () => {
          setConfirmOpen(false);
          setLastTransfer({
            destinationUrn: recipientPreview.urn,
            amount: parsedAmount,
          });
          setView('pending');
          toast.success(t('send.bloqueFriends.transferSentToast'));
        },
        onError: (error) => {
          toast.error(
            error instanceof Error
              ? error.message
              : t('send.bloqueFriends.transferErrorToast'),
          );
          setView('error');
        },
      },
    );
  };

  const canSubmit =
    !!sourceAccount?.primaryUrn &&
    !!normalizedAlias &&
    parsedAmount > 0 &&
    !validateAliasMutation.isPending &&
    !transferMutation.isPending;

  if (view === 'pending') {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <Link
            to="/send"
            className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('common.back')}
          </Link>
          <h1 className="text-xl font-bold tracking-[-0.025em] text-foreground">
            {t('send.options.bloqueFriends.title')}
          </h1>
        </div>

        <div className="rounded-2xl border border-border/75 bg-card/80 p-5">
          <p className="text-sm font-medium text-foreground">
            {t('send.bloqueFriends.transferSentTitle')}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('send.bloqueFriends.transferSentDescription', {
              amount: formatAmount(selectedAsset, lastTransfer?.amount ?? 0),
            })}
          </p>
        </div>
      </div>
    );
  }

  if (view === 'error') {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <Link
            to="/send"
            className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('common.back')}
          </Link>
          <h1 className="text-xl font-bold tracking-[-0.025em] text-foreground">
            {t('send.options.bloqueFriends.title')}
          </h1>
        </div>

        <div className="rounded-2xl border border-border/75 bg-card/80 p-5">
          <p className="text-sm font-medium text-foreground">
            {t('send.bloqueFriends.transferFailedTitle')}
          </p>
          <Button
            onClick={() => setView('form')}
            className="mt-4 h-11 rounded-2xl"
          >
            {t('common.retry')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Link
          to="/send"
          className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('common.back')}
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-[-0.025em] text-foreground">
            {t('send.options.bloqueFriends.title')}
          </h1>
          <p className="text-xs text-muted-foreground">
            {t('send.bloqueFriends.subtitle')}
          </p>
        </div>
      </div>

      <section className="rounded-3xl border border-border/75 bg-card/80 p-5">
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3 rounded-2xl border border-border/75 bg-background/70 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/[0.06]">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div className="flex flex-col">
              <p className="text-sm font-medium text-foreground">
                {t('send.bloqueFriends.transferBetweenUsers')}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t('send.bloqueFriends.currency')}</Label>
            <div className="grid grid-cols-3 gap-2">
              {ASSET_OPTIONS.map((asset) => (
                <button
                  key={asset.value}
                  type="button"
                  onClick={() => setSelectedAsset(asset.value)}
                  className={`rounded-2xl border px-3 py-3 text-sm transition-all ${
                    selectedAsset === asset.value
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
            <Label htmlFor="friend-alias">
              {t('send.bloqueFriends.alias')}
            </Label>
            <Input
              id="friend-alias"
              placeholder="alias"
              value={alias}
              onChange={(event) => setAlias(event.target.value)}
              className="h-12 rounded-2xl"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="friend-amount">
              {t('send.bloqueFriends.amount')}
            </Label>
            <Input
              id="friend-amount"
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
            <Label htmlFor="friend-message">
              {t('send.bloqueFriends.message')}
            </Label>
            <Textarea
              id="friend-message"
              placeholder={t('send.bloqueFriends.messagePlaceholder')}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="min-h-24 resize-none rounded-2xl"
              maxLength={140}
            />
          </div>

          {formError ? (
            <p className="text-xs text-destructive">{formError}</p>
          ) : null}

          {parsedAmount > 0 ? (
            <div className="rounded-2xl border border-border/85 bg-background/70 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {t('send.bloqueFriends.youSend')}
                </span>
                <span className="font-medium text-foreground">
                  {formatAmount(selectedAsset, parsedAmount)}
                </span>
              </div>
            </div>
          ) : null}

          <Button
            onClick={() => validateAliasMutation.mutate()}
            disabled={!canSubmit}
            className="h-12 w-full gap-2 rounded-2xl text-sm font-medium"
          >
            <Send className="h-4 w-4" />
            {validateAliasMutation.isPending
              ? t('send.bloqueFriends.validatingAlias')
              : transferMutation.isPending
                ? t('send.bloqueFriends.sending')
                : t('send.bloqueFriends.sendMoney')}
          </Button>
        </div>
      </section>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader className="items-start text-left">
            <AlertDialogTitle>
              {t('send.bloqueFriends.confirmSend')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('send.bloqueFriends.confirmSendDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="rounded-2xl border border-border/85 bg-background/70 p-4">
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  {t('send.bloqueFriends.recipient')}
                </span>
                <span className="max-w-[60%] text-right font-semibold text-foreground">
                  {recipientPreview
                    ? getAliasDisplayName(recipientPreview)
                    : '-'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  {t('send.bloqueFriends.alias')}
                </span>
                <span className="font-medium text-foreground">
                  {recipientPreview?.alias ?? normalizedAlias}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  {t('send.bloqueFriends.amount')}
                </span>
                <span className="font-medium text-foreground">
                  {formatAmount(selectedAsset, parsedAmount)}
                </span>
              </div>
              {message.trim() ? (
                <div className="flex flex-col gap-1 pt-2">
                  <span className="text-muted-foreground">
                    {t('send.bloqueFriends.message')}
                  </span>
                  <p className="text-foreground">{message.trim()}</p>
                </div>
              ) : null}
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={transferMutation.isPending}
              onClick={() => setRecipientPreview(null)}
            >
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={transferMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                submitTransfer();
              }}
            >
              {transferMutation.isPending
                ? t('send.bloqueFriends.sending')
                : t('send.bloqueFriends.confirmSend')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
