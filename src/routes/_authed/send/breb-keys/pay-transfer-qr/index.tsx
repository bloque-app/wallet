import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Landmark, Send } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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
import { bloque } from '~/lib/bloque';
import { formatCOP } from '~/lib/mock-data';
import { TopUpErrorStep } from '../../../topup/-components/error-step';
import { TopUpPendingStep } from '../../../topup/-components/pending-step';
import {
  type BrebKeyType,
  createBrebOrder,
  getRecipientName,
  listBrebAccounts,
  type ResolvedRecipient,
  resolveBrebKey,
} from '../-lib/breb';

type ViewState = 'loading' | 'pending' | 'error';

const MIN_TRANSFER_AMOUNT = 10;
const FROM_ASSET = 'COPM/2';
const TO_ASSET = 'COP/2';
const FROM_MEDIUM = 'kusama';
const TO_MEDIUM = 'breb' as const;

function getAssetPrecision(assetWithPrecision: string) {
  const [, precisionStr] = assetWithPrecision.split('/');
  const parsed = Number.parseInt(precisionStr ?? '0', 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

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

export const Route = createFileRoute(
  '/_authed/send/breb-keys/pay-transfer-qr/',
)({
  validateSearch: (
    search: Record<string, string>,
  ): {
    key?: string;
    amount?: string;
    qrType?: string;
    resolutionId?: string;
    recipientName?: string;
    recipientOwnerName?: string;
    recipientBusinessName?: string;
    recipientParticipantName?: string;
    merchantName?: string;
    qrCodeReference?: string;
  } => ({
    key: search.key,
    amount: search.amount,
    qrType: search.qrType,
    resolutionId: search.resolutionId,
    recipientName: search.recipientName,
    recipientOwnerName: search.recipientOwnerName,
    recipientBusinessName: search.recipientBusinessName,
    recipientParticipantName: search.recipientParticipantName,
    merchantName: search.merchantName,
    qrCodeReference: search.qrCodeReference,
  }),
  component: RouteComponent,
});

function getRecipientDisplayName(params: {
  recipientPreview: ResolvedRecipient | null;
  recipientOwnerName?: string;
  recipientName?: string;
  recipientBusinessName?: string;
  merchantName?: string;
  key?: string;
}) {
  const owner = params.recipientPreview?.owner;
  const ownerFullName =
    owner?.name ||
    [
      owner?.firstName,
      owner?.secondName,
      owner?.firstLastName,
      owner?.secondLastName,
    ]
      .filter((value): value is string => !!value?.trim())
      .join(' ')
      .trim();
  const explicitName =
    params.recipientBusinessName ||
    owner?.businessName ||
    params.recipientOwnerName ||
    ownerFullName ||
    params.recipientName;

  if (explicitName) {
    return explicitName;
  }

  if (params.recipientPreview) {
    const resolvedName = getRecipientName(params.recipientPreview);

    if (resolvedName && resolvedName !== 'Destinatario BRE-B') {
      return resolvedName;
    }
  }

  return (
    params.recipientBusinessName ||
    params.recipientName ||
    params.merchantName ||
    params.key ||
    'Destinatario BRE-B'
  );
}

function RouteComponent() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [view, setView] = useState<ViewState>('loading');
  const [amount, setAmount] = useState(String(search.amount ?? ''));
  const [message, setMessage] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [recipientPreview, setRecipientPreview] =
    useState<ResolvedRecipient | null>(() => {
      if (!search.resolutionId) {
        return null;
      }

      return {
        id: search.resolutionId,
        resolutionId: search.resolutionId,
        customerId: '',
        key: {
          keyType: inferBrebKeyType(search.key ?? '') ?? 'ALPHA',
          keyValue: search.key ?? '',
        },
        owner: {
          identificationType: null,
          identificationNumber: null,
          name: search.recipientOwnerName ?? null,
          businessName: search.recipientBusinessName ?? null,
          firstName: null,
          secondName: null,
          firstLastName: null,
          secondLastName: null,
          type: null,
        },
        participant: {
          name: search.recipientParticipantName ?? null,
          identificationNumber: null,
        },
        account: null,
        receptorNode: null,
        resolvedAt: null,
        expiresAt: null,
        raw: {},
      };
    });
  const [lastOrder, setLastOrder] = useState<{
    id: string;
    redirectUrl?: string;
  } | null>(null);

  const normalizedKey = normalizeBrebKey(search.key ?? '');
  const qrType = (search.qrType ?? '').toLowerCase();
  const isStaticQr =
    qrType.includes('static') ||
    qrType.includes('fixed') ||
    qrType.includes('estatico') ||
    qrType === '2';
  const parsedAmount =
    Number.parseInt(String(amount ?? '').replace(/\D/g, ''), 10) || 0;
  const amountSrc = useMemo(() => {
    if (parsedAmount <= 0) return '';
    return majorToMinor(parsedAmount, FROM_PRECISION);
  }, [parsedAmount]);

  const recipientDisplayName = getRecipientDisplayName({
    recipientPreview,
    recipientOwnerName: search.recipientOwnerName,
    recipientName: search.recipientName,
    recipientBusinessName: search.recipientBusinessName,
    merchantName: search.merchantName,
    key: search.key,
  });

  const brebAccountsQuery = useQuery({
    queryKey: ['breb-accounts'],
    queryFn: listBrebAccounts,
    staleTime: 30_000,
  });

  const activeBrebAccount = brebAccountsQuery.data?.find(
    (account) => account.status === 'active',
  );

  const ratesQuery = useQuery({
    queryKey: ['breb-transfer-qr-rates', amountSrc],
    enabled: parsedAmount >= MIN_TRANSFER_AMOUNT && !!amountSrc,
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
  const formError = useMemo(() => {
    if (!activeBrebAccount && brebAccountsQuery.isSuccess) {
      return 'Primero debes registrar una llave BRE-B activa.';
    }
    if (isStaticQr && !recipientPreview?.resolutionId) {
      return 'No encontramos la resolución del QR BRE-B.';
    }
    if (parsedAmount > 0 && parsedAmount < MIN_TRANSFER_AMOUNT) {
      return 'El monto mínimo es $10 COP.';
    }
    if (ratesQuery.isError) {
      return 'No pudimos consultar la tasa. Intenta de nuevo.';
    }
    if (
      parsedAmount >= MIN_TRANSFER_AMOUNT &&
      ratesQuery.isSuccess &&
      !selectedRate
    ) {
      return 'No hay tasas disponibles para este monto.';
    }
    return null;
  }, [
    activeBrebAccount,
    brebAccountsQuery.isSuccess,
    isStaticQr,
    parsedAmount,
    ratesQuery.isError,
    ratesQuery.isSuccess,
    recipientPreview,
    selectedRate,
  ]);

  useEffect(() => {
    if (!isStaticQr || view !== 'loading' || confirmOpen) {
      return;
    }

    if (formError) {
      setView('error');
      return;
    }

    if (
      activeBrebAccount?.urn &&
      recipientPreview?.resolutionId &&
      parsedAmount >= MIN_TRANSFER_AMOUNT &&
      selectedRate
    ) {
      setConfirmOpen(true);
    }
  }, [
    activeBrebAccount,
    confirmOpen,
    formError,
    parsedAmount,
    recipientPreview,
    selectedRate,
    view,
    isStaticQr,
  ]);

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!recipientPreview?.resolutionId) {
        throw new Error('No hay destinatario confirmado.');
      }
      if (!selectedRate?.sig) {
        throw new Error('No hay tasa disponible para enviar.');
      }
      if (!activeBrebAccount?.urn) {
        throw new Error('Primero debes registrar una llave BRE-B activa.');
      }

      return await createBrebOrder({
        rateSig: selectedRate.sig,
        amountSrc,
        resolutionId: recipientPreview.resolutionId,
        sourceAccountUrn: activeBrebAccount.urn,
        metadata: message.trim() ? { message: message.trim() } : undefined,
      });
    },
    onSuccess: (result) => {
      setConfirmOpen(false);
      setLastOrder({
        id: result.order.id,
        redirectUrl: result.execution?.result.how?.url,
      });
      setView('pending');
      toast.success('Transferencia BRE-B enviada correctamente.');
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'No se pudo enviar la transferencia BRE-B.',
      );
      setView('error');
    },
  });

  const previewRecipientMutation = useMutation({
    mutationFn: async () => {
      if (recipientPreview?.resolutionId) {
        return recipientPreview;
      }

      const inferredKeyType = inferBrebKeyType(normalizedKey);
      if (!inferredKeyType || !normalizedKey) {
        throw new Error('No encontramos una llave BRE-B válida en el QR.');
      }

      return await resolveBrebKey({
        keyType: inferredKeyType,
        key: normalizedKey,
      });
    },
    onSuccess: (result) => {
      setRecipientPreview(result);
      setConfirmOpen(true);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'No se pudo validar la llave BRE-B.',
      );
    },
  });

  if (view === 'pending') {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <Link
            to="/send/breb-keys"
            className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Pagar o transferir
          </h1>
        </div>

        <TopUpPendingStep
          amount={parsedAmount}
          orderId={lastOrder?.id}
          actionLabel={
            lastOrder?.redirectUrl ? 'Abrir instrucciones' : 'Verificar estado'
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
          onError={() => setView('error')}
        />
      </div>
    );
  }

  if (view === 'error') {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <Link
            to="/send/breb-keys"
            className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Pagar o transferir
          </h1>
        </div>
        <TopUpErrorStep onRetry={() => setView('loading')} />
      </div>
    );
  }

  if (!isStaticQr) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <Link
            to="/send/breb-keys"
            className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Pagar o transferir
            </h1>
            <p className="text-xs text-muted-foreground">
              Completa el monto para el QR BRE-B
            </p>
          </div>
        </div>

        <section className="rounded-3xl border border-border/75 bg-card/80 p-5">
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3 rounded-2xl border border-border/75 bg-background/70 p-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/80 bg-card">
                <Landmark className="h-5 w-5 text-foreground" />
              </div>
              <div className="flex flex-col">
                <p className="text-sm font-medium text-foreground">
                  Pago iniciado desde QR BRE-B
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="breb-qr-key">Llave BRE-B</Label>
              <Input
                id="breb-qr-key"
                value={normalizedKey}
                disabled
                className="h-12 rounded-2xl"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="breb-qr-amount">Monto</Label>
              <Input
                id="breb-qr-amount"
                inputMode="numeric"
                placeholder="$0"
                value={amount}
                onChange={(event) =>
                  setAmount(event.target.value.replace(/\D/g, ''))
                }
                className="h-12 rounded-2xl"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="breb-qr-message">Mensaje</Label>
              <Textarea
                id="breb-qr-message"
                placeholder="¿Para qué es este envio?"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="min-h-24 resize-none rounded-2xl"
                maxLength={140}
              />
            </div>

            <div className="rounded-2xl border border-border/85 bg-background/70 p-4">
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Destinatario</span>
                  <span className="max-w-[60%] text-right font-semibold text-foreground">
                    {recipientDisplayName}
                  </span>
                </div>
                {search.qrCodeReference ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Referencia QR</span>
                    <span className="max-w-[60%] break-all text-right font-medium text-foreground">
                      {search.qrCodeReference}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            {formError ? (
              <p className="text-xs text-destructive">{formError}</p>
            ) : null}

            {parsedAmount >= MIN_TRANSFER_AMOUNT ? (
              <div className="rounded-2xl border border-border/85 bg-background/70 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Envias</span>
                  <span className="font-medium text-foreground">
                    {formatCOP(parsedAmount)}
                  </span>
                </div>
              </div>
            ) : null}

            <Button
              type="button"
              onClick={() => previewRecipientMutation.mutate()}
              disabled={
                !activeBrebAccount ||
                parsedAmount < MIN_TRANSFER_AMOUNT ||
                !selectedRate ||
                !!formError ||
                createOrderMutation.isPending ||
                previewRecipientMutation.isPending
              }
              className="h-12 w-full gap-2 rounded-2xl text-sm font-medium"
            >
              <Send className="h-4 w-4" />
              {previewRecipientMutation.isPending
                ? 'Validando llave...'
                : 'Continuar'}
            </Button>
          </div>
        </section>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent size="sm">
            <AlertDialogHeader className="items-start text-left">
              <AlertDialogTitle>Confirmar envio</AlertDialogTitle>
              <AlertDialogDescription>
                {`Vas a enviar dinero a ${recipientDisplayName}.`}
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="rounded-2xl border border-border/85 bg-background/70 p-4">
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Destinatario</span>
                  <span className="max-w-[60%] text-right font-semibold text-foreground">
                    {recipientDisplayName}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Llave</span>
                  <span className="font-medium text-foreground">
                    {normalizedKey}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Monto</span>
                  <span className="font-medium text-foreground">
                    {formatCOP(parsedAmount)}
                  </span>
                </div>
                {message.trim() ? (
                  <div className="flex flex-col gap-1 pt-2">
                    <span className="text-muted-foreground">Mensaje</span>
                    <p className="text-foreground">{message.trim()}</p>
                  </div>
                ) : null}
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel disabled={createOrderMutation.isPending}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={createOrderMutation.isPending}
                onClick={(event) => {
                  event.preventDefault();
                  createOrderMutation.mutate();
                }}
              >
                {createOrderMutation.isPending
                  ? 'Enviando...'
                  : 'Confirmar envio'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Link
          to="/send/breb-keys"
          className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Pagar o transferir
          </h1>
          <p className="text-xs text-muted-foreground">Procesando QR BRE-B</p>
        </div>
      </div>

      <section className="rounded-3xl border border-border/75 bg-card/80 p-5">
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3 rounded-2xl border border-border/75 bg-background/70 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/80 bg-card">
              <Landmark className="h-5 w-5 text-foreground" />
            </div>
            <div className="flex flex-col">
              <p className="text-sm font-medium text-foreground">
                Pago iniciado desde QR BRE-B
              </p>
              <p className="text-xs text-muted-foreground">
                Consultando la tasa para abrir la confirmación.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border/85 bg-background/70 p-4">
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Destinatario</span>
                <span className="max-w-[60%] text-right font-semibold text-foreground">
                  {recipientDisplayName}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Llave</span>
                <span className="font-medium text-foreground">
                  {normalizedKey}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Monto</span>
                <span className="font-medium text-foreground">
                  {formatCOP(parsedAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader className="items-start text-left">
            <AlertDialogTitle>Confirmar envio</AlertDialogTitle>
            <AlertDialogDescription>
              {`Vas a enviar dinero a ${recipientDisplayName}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="rounded-2xl border border-border/85 bg-background/70 p-4">
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Destinatario</span>
                <span className="max-w-[60%] text-right font-semibold text-foreground">
                  {recipientDisplayName}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Llave</span>
                <span className="font-medium text-foreground">
                  {normalizedKey}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Monto</span>
                <span className="font-medium text-foreground">
                  {formatCOP(parsedAmount)}
                </span>
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={createOrderMutation.isPending}
              onClick={() => {
                setConfirmOpen(false);
                void navigate({ to: '/send/breb-keys' });
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={createOrderMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                createOrderMutation.mutate();
              }}
            >
              {createOrderMutation.isPending
                ? 'Enviando...'
                : 'Confirmar envio'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
