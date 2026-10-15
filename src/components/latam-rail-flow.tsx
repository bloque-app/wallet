import type { PixDocumentType, PixKeyType } from '@bloque/sdk-swap';
import { Copy } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { AccountCarousel } from '~/components/account/account-carousel';
import { BackButton } from '~/components/back-button';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '~/components/ui/select';
import type { ExecutionOutcome } from '~/domain/payments/types';
import { useAccountPicker } from '~/hooks/accounts/use-account-picker';
import {
  useCreatePixDepositOrder,
  useCreatePixOrder,
  useCreateSpeiDepositOrder,
  useCreateSpeiOrder,
} from '~/hooks/payments/use-latam-rails';
import { useRates } from '~/hooks/payments/use-rates';
import { formatAmount } from '~/lib/formatters';

type Rail = 'spei' | 'pix';
type Direction = 'topup' | 'send';
type Step = 'amount' | 'details' | 'confirm' | 'result' | 'error';

const RAIL_CONFIG = {
  spei: {
    fiatAsset: 'MXN/2',
    balanceAsset: 'MXNB/2',
    currency: 'MXN' as const,
  },
  pix: {
    fiatAsset: 'BRL/2',
    balanceAsset: 'BRLB/2',
    currency: 'BRL' as const,
  },
};

function majorToMinor(amount: number) {
  return (BigInt(amount) * 100n).toString();
}

export function LatamRailFlow({
  rail,
  direction,
}: {
  rail: Rail;
  direction: Direction;
}) {
  const { t } = useTranslation();
  const config = RAIL_CONFIG[rail];
  const [step, setStep] = useState<Step>('amount');
  const [amount, setAmount] = useState('');
  const [accountLedgerId, setAccountLedgerId] = useState<string | null>(null);
  const [payerName, setPayerName] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [documentType, setDocumentType] = useState<PixDocumentType>('CPF');
  const [clabe, setClabe] = useState('');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [pixKeyType, setPixKeyType] = useState<PixKeyType>('CPF');
  const [pixKeyValue, setPixKeyValue] = useState('');
  const [execution, setExecution] = useState<ExecutionOutcome>();
  const [orderId, setOrderId] = useState('');

  const parsedAmount = Number.parseInt(amount.replace(/\D/g, ''), 10) || 0;
  const amountSrc = parsedAmount >= 10 ? majorToMinor(parsedAmount) : '';
  const { accounts, isLoading: isLoadingAccounts } = useAccountPicker({
    requireVirtualAccount: true,
    ...(direction === 'send' ? { asset: config.balanceAsset } : {}),
  });

  useEffect(() => {
    if (accounts.length === 1 && accounts[0]) {
      setAccountLedgerId(accounts[0].ledgerId);
      return;
    }
    setAccountLedgerId((current) =>
      current && accounts.some((account) => account.ledgerId === current)
        ? current
        : null,
    );
  }, [accounts]);

  const account =
    accounts.find((candidate) => candidate.ledgerId === accountLedgerId) ??
    null;
  const accountUrn = account?.primaryUrn ?? '';
  const fromAsset =
    direction === 'topup' ? config.fiatAsset : config.balanceAsset;
  const toAsset =
    direction === 'topup' ? config.balanceAsset : config.fiatAsset;
  const fromMedium = direction === 'topup' ? rail : 'kusama';
  const toMedium = direction === 'topup' ? 'kusama' : rail;
  const ratesQuery = useRates(
    amountSrc && accountUrn
      ? {
          fromAsset,
          toAsset,
          fromMediums: [fromMedium],
          toMediums: [toMedium],
          amountSrc,
        }
      : undefined,
  );
  const rate = ratesQuery.data?.[0] ?? null;
  const receiveAmount = useMemo(() => {
    if (!rate) return 0;
    if (Number.isFinite(rate.ratio)) return parsedAmount * rate.ratio;
    return (rate.rate[1] ?? 0) / 100;
  }, [parsedAmount, rate]);

  const speiDeposit = useCreateSpeiDepositOrder();
  const speiPayout = useCreateSpeiOrder();
  const pixDeposit = useCreatePixDepositOrder();
  const pixPayout = useCreatePixOrder();
  const isSubmitting =
    speiDeposit.isPending ||
    speiPayout.isPending ||
    pixDeposit.isPending ||
    pixPayout.isPending;

  const detailsValid =
    direction === 'topup'
      ? payerName.trim().length >= 2 &&
        (rail === 'spei' || documentNumber.trim().length > 0)
      : rail === 'spei'
        ? /^\d{18}$/.test(clabe) && beneficiaryName.trim().length >= 2
        : pixKeyValue.trim().length > 0;

  const onSuccess = (result: {
    order: { id: string };
    execution?: ExecutionOutcome;
  }) => {
    setOrderId(result.order.id);
    setExecution(result.execution ?? { kind: 'none' });
    setStep('result');
    toast.success(t('latamRails.orderCreated'));
  };

  const onError = (error: Error) => {
    if (error.message.includes('E_RATE_EXPIRED')) {
      toast.info(t('topup.rateExpiredToast'));
      setStep('amount');
      void ratesQuery.refetch();
      return;
    }
    toast.error(error.message || t('latamRails.orderError'));
    setStep('error');
  };

  const submit = () => {
    if (!rate?.sig || !amountSrc || !accountUrn) {
      toast.error(t('latamRails.missingRateOrAccount'));
      return;
    }
    const options = { onSuccess, onError };
    if (direction === 'topup' && rail === 'spei') {
      speiDeposit.mutate(
        {
          params: {
            rateSig: rate.sig,
            amountSrc,
            depositInformation: {
              urn: accountUrn,
              payerName: payerName.trim(),
              ...(documentNumber.trim()
                ? { payerDocumentNumber: documentNumber.trim() }
                : {}),
            },
          },
        },
        options,
      );
      return;
    }
    if (direction === 'topup' && rail === 'pix') {
      pixDeposit.mutate(
        {
          params: {
            rateSig: rate.sig,
            amountSrc,
            depositInformation: {
              urn: accountUrn,
              payerName: payerName.trim(),
              payerDocumentNumber: documentNumber.trim(),
              payerDocumentType: documentType,
            },
          },
        },
        options,
      );
      return;
    }
    if (rail === 'spei') {
      speiPayout.mutate(
        {
          params: {
            rateSig: rate.sig,
            amountSrc,
            depositInformation: {
              clabe,
              beneficiaryName: beneficiaryName.trim(),
              ...(documentNumber.trim() ? { rfc: documentNumber.trim() } : {}),
            },
          },
        },
        options,
      );
      return;
    }
    pixPayout.mutate(
      {
        params: {
          rateSig: rate.sig,
          amountSrc,
          depositInformation: {
            pixKeyType,
            pixKeyValue: pixKeyValue.trim(),
            ...(beneficiaryName.trim()
              ? { beneficiaryName: beneficiaryName.trim() }
              : {}),
          },
        },
      },
      options,
    );
  };

  const title = t(`latamRails.${rail}.${direction}.title`);
  const displayAsset = config.currency;

  if (step === 'result') {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        <section className="flex flex-col gap-4 rounded-3xl border border-border/75 bg-card/80 p-5">
          <h2 className="text-lg font-semibold">
            {direction === 'topup'
              ? t('latamRails.depositInstructions')
              : t('latamRails.transferSubmitted')}
          </h2>
          {execution?.kind === 'spei-deposit' && (
            <InstructionRow label="CLABE" value={execution.clabe} />
          )}
          {execution?.kind === 'pix-deposit' && (
            <InstructionRow
              label={t('latamRails.pixCopyPaste')}
              value={execution.qrCodePayload}
            />
          )}
          {(execution?.kind === 'spei-deposit' ||
            execution?.kind === 'pix-deposit') && (
            <InstructionRow
              label={t('latamRails.reference')}
              value={execution.reference}
            />
          )}
          <p className="text-xs text-muted-foreground">
            {t('latamRails.orderId', { orderId })}
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <BackButton
          onClick={() => {
            if (step === 'amount') history.back();
            else setStep(step === 'confirm' ? 'details' : 'amount');
          }}
        />
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
      </div>

      <section className="flex flex-col gap-5 rounded-3xl border border-border/75 bg-card/80 p-5">
        {step === 'amount' && (
          <>
            {accounts.length > 0 && (
              <AccountCarousel
                accounts={accounts}
                asset={config.balanceAsset}
                precision={2}
                unit={displayAsset}
                value={accountLedgerId}
                onChange={setAccountLedgerId}
                label={
                  direction === 'topup'
                    ? t('topup.destinationAccountLabel')
                    : t('send.bloqueFriends.sourceAccountLabel')
                }
              />
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${rail}-${direction}-amount`}>
                {t('latamRails.amount', { currency: displayAsset })}
              </Label>
              <Input
                id={`${rail}-${direction}-amount`}
                inputMode="numeric"
                value={amount}
                onChange={(event) =>
                  setAmount(event.target.value.replace(/\D/g, ''))
                }
                placeholder="0"
                className="h-14 rounded-2xl text-center text-xl font-bold"
              />
            </div>
            {parsedAmount > 0 && (
              <div className="rounded-2xl border border-border/85 bg-background/70 p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t('topup.youReceive')}
                  </span>
                  <span>
                    {rate ? formatAmount(displayAsset, receiveAmount) : '...'}
                  </span>
                </div>
                {rate?.fee?.formula && (
                  <div className="mt-2 flex justify-between gap-4">
                    <span className="text-muted-foreground">
                      {t('latamRails.fee')}
                    </span>
                    <span className="text-right text-xs">
                      {rate.fee.formula}
                    </span>
                  </div>
                )}
              </div>
            )}
            {!accountUrn && !isLoadingAccounts && (
              <p className="text-xs text-destructive">
                {t('latamRails.noEligibleAccount')}
              </p>
            )}
            <Button
              disabled={!rate || parsedAmount < 10 || !accountUrn}
              onClick={() => setStep('details')}
              className="h-12 rounded-2xl"
            >
              {t('common.continue')}
            </Button>
          </>
        )}

        {step === 'details' && (
          <>
            {direction === 'topup' ? (
              <>
                <Field
                  id="payer-name"
                  label={t('latamRails.payerName')}
                  value={payerName}
                  onChange={setPayerName}
                />
                {rail === 'pix' && (
                  <div className="flex flex-col gap-2">
                    <Label>{t('latamRails.documentType')}</Label>
                    <Select
                      value={documentType}
                      onValueChange={(value) =>
                        setDocumentType(value as PixDocumentType)
                      }
                    >
                      <SelectTrigger className="h-12 rounded-2xl">
                        {documentType}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CPF">CPF</SelectItem>
                        <SelectItem value="CNPJ">CNPJ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Field
                  id="payer-document"
                  label={
                    rail === 'pix'
                      ? t('latamRails.cpfCnpj')
                      : t('latamRails.rfcOptional')
                  }
                  value={documentNumber}
                  onChange={setDocumentNumber}
                />
              </>
            ) : rail === 'spei' ? (
              <>
                <Field
                  id="clabe"
                  label="CLABE"
                  value={clabe}
                  onChange={(value) =>
                    setClabe(value.replace(/\D/g, '').slice(0, 18))
                  }
                />
                <Field
                  id="beneficiary-name"
                  label={t('latamRails.beneficiaryName')}
                  value={beneficiaryName}
                  onChange={setBeneficiaryName}
                />
                <Field
                  id="beneficiary-rfc"
                  label={t('latamRails.rfcOptional')}
                  value={documentNumber}
                  onChange={setDocumentNumber}
                />
              </>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <Label>{t('latamRails.pixKeyType')}</Label>
                  <Select
                    value={pixKeyType}
                    onValueChange={(value) =>
                      setPixKeyType(value as PixKeyType)
                    }
                  >
                    <SelectTrigger className="h-12 rounded-2xl">
                      {pixKeyType}
                    </SelectTrigger>
                    <SelectContent>
                      {(['CPF', 'CNPJ', 'EMAIL', 'PHONE', 'EVP'] as const).map(
                        (type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <Field
                  id="pix-key"
                  label={t('latamRails.pixKey')}
                  value={pixKeyValue}
                  onChange={setPixKeyValue}
                />
                <Field
                  id="pix-beneficiary-name"
                  label={t('latamRails.beneficiaryNameOptional')}
                  value={beneficiaryName}
                  onChange={setBeneficiaryName}
                />
              </>
            )}
            <Button
              disabled={!detailsValid}
              onClick={() => setStep('confirm')}
              className="h-12 rounded-2xl"
            >
              {t('common.continue')}
            </Button>
          </>
        )}

        {step === 'confirm' && (
          <>
            <div className="rounded-2xl border border-border/85 bg-background/70 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {direction === 'topup'
                    ? t('topup.youPay')
                    : t('send.bloqueFriends.youSend')}
                </span>
                <span>{formatAmount(displayAsset, parsedAmount)}</span>
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {t('topup.youReceive')}
                </span>
                <span>{formatAmount(displayAsset, receiveAmount)}</span>
              </div>
            </div>
            <Button
              disabled={isSubmitting}
              onClick={submit}
              className="h-12 rounded-2xl"
            >
              {isSubmitting ? t('common.loading') : t('latamRails.confirm')}
            </Button>
          </>
        )}

        {step === 'error' && (
          <Button
            onClick={() => setStep('amount')}
            className="h-12 rounded-2xl"
          >
            {t('common.retry')}
          </Button>
        )}
      </section>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 rounded-2xl"
      />
    </div>
  );
}

function InstructionRow({ label, value }: { label: string; value: string }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-2xl border border-border/85 bg-background/70 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-start justify-between gap-3">
        <p className="break-all font-mono text-sm font-medium">{value}</p>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => {
            void navigator.clipboard
              .writeText(value)
              .then(() => toast.success(t('latamRails.copied')));
          }}
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
