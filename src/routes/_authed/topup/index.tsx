import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Building2, CreditCard, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Separator } from '~/components/ui/separator';
import { useAuth } from '~/contexts/auth/auth-context';
import { bloque } from '~/lib/bloque';
import { formatAmount, formatCOP } from '~/lib/mock-data';
import { cn } from '~/lib/utils';
import { TopUpErrorStep } from './-components/error-step';
import { TopUpPendingStep } from './-components/pending-step';

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

const MIN_TOPUP_AMOUNT = 10_000;
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
    redirectUrl?: string;
  } | null>(null);

  const parsedAmount = Number.parseInt(amount.replace(/\D/g, ''), 10) || 0;
  const selectedReceiveAsset = RECEIVE_ASSETS.find(
    (asset) => asset.value === receiveAsset,
  )!;
  const amountSrc = useMemo(() => {
    if (parsedAmount <= 0) return '';
    return majorToMinor(parsedAmount, 2);
  }, [parsedAmount]);

  const accountsQuery = useQuery({
    queryKey: ['topup-destination-accounts'],
    queryFn: async () => bloque.accounts.list(),
    staleTime: 30_000,
  });

  const destinationAccountUrn = (
    (accountsQuery.data?.accounts ?? []) as unknown as Array<{
      urn: string;
      status?: string;
    }>
  ).find(
    (account) =>
      account.status !== 'deleted' &&
      account.status !== 'disabled' &&
      account.status !== 'inactive',
  )?.urn;

  const banksQuery = useQuery({
    queryKey: ['pse-banks'],
    queryFn: async () => bloque.swap.pse.banks(),
    staleTime: 5 * 60_000,
  });

  const ratesQuery = useQuery({
    queryKey: ['pse-topup-rates', selectedReceiveAsset.sdkAsset, amountSrc],
    enabled:
      parsedAmount >= MIN_TOPUP_AMOUNT &&
      !!amountSrc &&
      !!destinationAccountUrn,
    queryFn: () =>
      bloque.swap.findRates({
        fromAsset: FROM_ASSET,
        toAsset: selectedReceiveAsset.sdkAsset,
        fromMediums: [FROM_MEDIUM],
        toMediums: [TO_MEDIUM],
        amountSrc,
      }),
    staleTime: 30_000,
    retry: 1,
  });

  const selectedRate = ratesQuery.data?.rates?.[0] ?? null;
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
    if (!destinationAccountUrn && accountsQuery.isSuccess) {
      return 'No encontramos una cuenta destino disponible.';
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
    destinationAccountUrn,
    accountsQuery.isSuccess,
    ratesQuery.isError,
    ratesQuery.isSuccess,
    selectedRate,
  ]);

  const detailsValid =
    !!form.bankCode &&
    !!form.customerEmail.trim() &&
    !!form.userLegalIdType &&
    !!form.userLegalId.trim() &&
    !!form.fullName.trim() &&
    !!form.phoneNumber.trim();

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRate?.sig) {
        throw new Error('No hay tasa disponible para crear la orden.');
      }
      if (!destinationAccountUrn) {
        throw new Error('No hay cuenta destino disponible.');
      }

      return await bloque.swap.pse.create({
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
        },
      });
    },
    onSuccess: (result) => {
      const redirectUrl = result.execution?.result?.how?.url;
      setLastOrder({ id: result.order.id, redirectUrl });
      setStep('pending');
      toast.success('Recarga PSE iniciada correctamente.');
      if (redirectUrl) {
        window.open(redirectUrl, '_blank', 'noopener,noreferrer');
      }
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'No se pudo iniciar la recarga.',
      );
      setStep('error');
    },
  });

  const selectedBankName =
    banksQuery.data?.banks.find((bank) => bank.code === form.bankCode)?.name ??
    'Banco';

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        Recargar saldo
      </h1>

      {step !== 'method' && (
        <div className="flex items-center gap-2 rounded-2xl border border-border/75 bg-card/80 p-3">
          {['Monto', 'Datos', 'Confirmar'].map((label, i) => {
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
                toast.info('Recarga con tarjeta disponible proximamente.'),
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
        <section className="rounded-3xl border border-border/75 bg-card/80 p-5">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label>Quiero recibir</Label>
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
              <Label htmlFor="topup-amount">Monto a pagar por PSE (COP)</Label>
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
                  Monto minimo: $10,000 COP
                </p>
              ) : null}
            </div>

            {parsedAmount > 0 ? (
              <div className="rounded-2xl border border-border/85 bg-background/70 p-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Pagas</span>
                    <span className="font-medium text-foreground">
                      {formatCOP(parsedAmount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Recibes</span>
                    <span className="font-medium text-foreground">
                      {selectedRate
                        ? formatAmount(receiveAsset, receiveAmount)
                        : 'Consultando...'}
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
                Volver
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
                Continuar
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
              Volver
            </button>

            <div className="flex flex-col gap-2">
              <Label>Banco PSE</Label>
              <Select
                value={form.bankCode}
                onValueChange={(value) =>
                  setForm({ ...form, bankCode: value ?? '' })
                }
              >
                <SelectTrigger className="h-12 rounded-2xl">
                  <SelectValue placeholder="Selecciona tu banco" />
                </SelectTrigger>
                <SelectContent>
                  {banksQuery.data?.banks.map((bank) => (
                    <SelectItem key={bank.code} value={bank.code}>
                      {bank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label>Tipo de usuario</Label>
                <Select
                  value={form.userType}
                  onValueChange={(value) =>
                    setForm({ ...form, userType: value as '0' | '1' })
                  }
                >
                  <SelectTrigger className="h-12 rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Natural</SelectItem>
                    <SelectItem value="1">Juridica</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Tipo de documento</Label>
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
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CC">CC</SelectItem>
                    <SelectItem value="NIT">NIT</SelectItem>
                    <SelectItem value="CE">CE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="pse-id">Numero de documento</Label>
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
              <Label htmlFor="pse-name">Nombre completo</Label>
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
                <Label htmlFor="pse-email">Email</Label>
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
                <Label htmlFor="pse-phone">Celular</Label>
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
              Continuar
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
              Volver
            </button>

            <div className="rounded-2xl border border-border/85 bg-background/70 p-4">
              <div className="flex flex-col gap-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pagas</span>
                  <span className="font-medium text-foreground">
                    {formatCOP(parsedAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Recibes</span>
                  <span className="font-medium text-foreground">
                    {formatAmount(receiveAsset, receiveAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Banco</span>
                  <span className="font-medium text-foreground">
                    {selectedBankName}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Titular</span>
                  <span className="font-medium text-foreground">
                    {form.fullName}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Documento</span>
                  <span className="font-medium text-foreground">
                    {form.userLegalIdType} {form.userLegalId}
                  </span>
                </div>
                <Separator />
                <p className="text-xs text-muted-foreground">
                  Serás redirigido a PSE para completar el pago.
                </p>
              </div>
            </div>

            <Button
              onClick={() => createOrderMutation.mutate()}
              disabled={createOrderMutation.isPending}
              className="h-12 rounded-2xl"
            >
              {createOrderMutation.isPending ? 'Iniciando pago...' : 'Ir a PSE'}
            </Button>
          </div>
        </section>
      )}

      {step === 'pending' && (
        <TopUpPendingStep
          amount={parsedAmount}
          orderId={lastOrder?.id}
          actionLabel={
            lastOrder?.redirectUrl ? 'Abrir PSE' : 'Verificar estado'
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
