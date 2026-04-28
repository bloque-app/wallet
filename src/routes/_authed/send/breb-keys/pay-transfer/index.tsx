import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Landmark, Send } from 'lucide-react';
import { useMemo, useState } from 'react';
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

type ViewState = 'form' | 'pending' | 'error';

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

export const Route = createFileRoute('/_authed/send/breb-keys/pay-transfer/')({
  component: RouteComponent,
});

function RouteComponent() {
  const [view, setView] = useState<ViewState>('form');
  const [key, setKey] = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [recipientPreview, setRecipientPreview] =
    useState<ResolvedRecipient | null>(null);
  const [lastOrder, setLastOrder] = useState<{
    id: string;
    redirectUrl?: string;
  } | null>(null);

  const normalizedKey = normalizeBrebKey(key);
  const inferredKeyType = inferBrebKeyType(normalizedKey);
  const parsedAmount = Number.parseInt(amount.replace(/\D/g, ''), 10) || 0;
  const amountSrc = useMemo(() => {
    if (parsedAmount <= 0) return '';
    return majorToMinor(parsedAmount, FROM_PRECISION);
  }, [parsedAmount]);

  const hasValidKey = inferredKeyType !== null;

  const brebAccountsQuery = useQuery({
    queryKey: ['breb-accounts'],
    queryFn: listBrebAccounts,
    staleTime: 30_000,
  });

  const activeBrebAccount = brebAccountsQuery.data?.find(
    (account) => account.status === 'active',
  );

  const ratesQuery = useQuery({
    queryKey: ['breb-transfer-rates', amountSrc],
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
    if (key.length > 0 && !hasValidKey) {
      return 'Ingresa una llave BRE-B valida, por ejemplo un celular, email o alias como @MBP313.';
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
    hasValidKey,
    key.length,
    parsedAmount,
    ratesQuery.isError,
    ratesQuery.isSuccess,
    selectedRate,
  ]);

  const previewRecipientMutation = useMutation({
    mutationFn: async () =>
      await resolveBrebKey({
        keyType: inferredKeyType ?? 'ALPHA',
        key: normalizedKey,
      }),
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

  const canSubmit =
    !!activeBrebAccount &&
    hasValidKey &&
    parsedAmount >= MIN_TRANSFER_AMOUNT &&
    !!selectedRate &&
    !previewRecipientMutation.isPending &&
    !createOrderMutation.isPending;

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
        <TopUpErrorStep onRetry={() => setView('form')} />
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
          <p className="text-xs text-muted-foreground">
            Ingresa la llave o escanea el QR
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
                Envio inmediato por llave
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="breb-key">Llave BRE-B</Label>
            <Input
              id="breb-key"
              inputMode="text"
              placeholder="3001234567 o @MBP313"
              value={key}
              onChange={(event) => setKey(event.target.value)}
              className="h-12 rounded-2xl"
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="breb-amount">Monto</Label>
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
            <Label htmlFor="breb-message">Mensaje</Label>
            <Textarea
              id="breb-message"
              placeholder="¿Para qué es este envio?"
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
                <span className="text-muted-foreground">Envias</span>
                <span className="font-medium text-foreground">
                  {formatCOP(parsedAmount)}
                </span>
              </div>
            </div>
          ) : null}

          <Button
            onClick={() => previewRecipientMutation.mutate()}
            disabled={!canSubmit}
            className="h-12 w-full gap-2 rounded-2xl text-sm font-medium"
          >
            <Send className="h-4 w-4" />
            {previewRecipientMutation.isPending
              ? 'Validando llave...'
              : createOrderMutation.isPending
                ? 'Enviando...'
                : 'Enviar dinero'}
          </Button>
        </div>
      </section>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader className="items-start text-left">
            <AlertDialogTitle>Confirmar envio</AlertDialogTitle>
            <AlertDialogDescription>
              Verifica la persona o entidad antes de enviar el dinero.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="rounded-2xl border border-border/85 bg-background/70 p-4">
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Destinatario</span>
                <span className="max-w-[60%] text-right font-semibold text-foreground">
                  {recipientPreview ? getRecipientName(recipientPreview) : '-'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Llave</span>
                <span className="font-medium text-foreground">
                  {recipientPreview?.key.keyValue ?? normalizedKey}
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
            <AlertDialogCancel
              disabled={createOrderMutation.isPending}
              onClick={() => setRecipientPreview(null)}
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
