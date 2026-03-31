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
import { useAuth } from '~/contexts/auth/auth-context';
import { bloque } from '~/lib/bloque';
import { formatCOP } from '~/lib/mock-data';
import { useCards } from '../../card/-hooks/use-card';
import { TopUpErrorStep } from '../../topup/-components/error-step';
import { TopUpPendingStep } from '../../topup/-components/pending-step';

type ViewState = 'form' | 'pending' | 'error';
type BrebKeyType = 'ID' | 'PHONE' | 'EMAIL' | 'ALPHA' | 'BCODE';
type ResolvedRecipient = {
  resolutionId: string;
  key: { keyValue: string };
  owner: { name: string | null; businessName: string | null } | null;
  participant: { name: string | null } | null;
};

const MIN_TRANSFER_AMOUNT = 10_000;
const FROM_ASSET = 'COPM/2';
const TO_ASSET = 'COP/2';
const FROM_MEDIUM = 'kusama';
const TO_MEDIUM = 'breb' as const;
const BREB_KEY_TYPES: Array<{
  value: BrebKeyType;
  label: string;
  placeholder: string;
}> = [
  { value: 'PHONE', label: 'Celular', placeholder: '3001234567' },
  { value: 'EMAIL', label: 'Email', placeholder: 'nombre@correo.com' },
  { value: 'ID', label: 'Documento', placeholder: '123456789' },
  { value: 'ALPHA', label: 'Alfanumérica', placeholder: 'nestor.bloque' },
  { value: 'BCODE', label: 'Código bancario', placeholder: '0016027228' },
];

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

function getRecipientName(data: {
  owner: { name: string | null; businessName: string | null } | null;
  participant: { name: string | null } | null;
}) {
  return (
    data.owner?.name ??
    data.owner?.businessName ??
    data.participant?.name ??
    'Destinatario BRE-B'
  );
}

async function getBrebSourceAccountUrn() {
  const existing = await bloque.accounts.list({ medium: 'breb' } as never);
  const activeAccount = (
    existing.accounts as unknown as Array<{
      urn: string;
      medium: string;
      status: string;
    }>
  ).find(
    (account) => account.medium === 'breb' && account.status !== 'deleted',
  );

  if (activeAccount?.urn) {
    return activeAccount.urn;
  }
  throw new Error('Primero debes crear una llave BRE-B.');
}

export const Route = createFileRoute('/_authed/send/breb-keys/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { user } = useAuth();
  const { data: cardsData, isLoading: isLoadingCards } = useCards();

  const [view, setView] = useState<ViewState>('form');
  const [key, setKey] = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [createKeyType, setCreateKeyType] = useState<BrebKeyType>('PHONE');
  const [createKeyValue, setCreateKeyValue] = useState('');
  const [lastOrder, setLastOrder] = useState<{
    id: string;
    redirectUrl?: string;
  } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [recipientPreview, setRecipientPreview] =
    useState<ResolvedRecipient | null>(null);

  const normalizedKey = key.replace(/\D/g, '').slice(0, 10);
  const parsedAmount = Number.parseInt(amount.replace(/\D/g, ''), 10) || 0;
  const amountSrc = useMemo(() => {
    if (parsedAmount <= 0) return '';
    return majorToMinor(parsedAmount, FROM_PRECISION);
  }, [parsedAmount]);

  const ledgerId = cardsData?.accounts?.[0]?.ledgerId ?? '';
  const hasValidKey = normalizedKey.length === 10;
  const selectedCreateKeyType = BREB_KEY_TYPES.find(
    (option) => option.value === createKeyType,
  );

  const brebAccountsQuery = useQuery({
    queryKey: ['breb-accounts'],
    queryFn: async () => bloque.accounts.list({ medium: 'breb' } as never),
    staleTime: 30_000,
  });

  const activeBrebAccount = (
    brebAccountsQuery.data?.accounts as unknown as
      | Array<{
          urn: string;
          medium: string;
          status: string;
        }>
      | undefined
  )?.find(
    (account) => account.medium === 'breb' && account.status !== 'deleted',
  );

  const createKeyMutation = useMutation({
    mutationFn: async () => {
      if (!ledgerId) {
        throw new Error('No encontramos una cuenta base para crear tu llave.');
      }
      if (!createKeyValue.trim()) {
        throw new Error('Ingresa el valor de la llave BRE-B.');
      }

      const created = await (
        bloque.accounts as typeof bloque.accounts & {
          breb: {
            createKey: (params: {
              keyType: string;
              key: string;
              displayName?: string;
              ledgerId?: string;
              metadata?: Record<string, unknown>;
            }) => Promise<{
              data: { urn: string } | null;
              error: { message: string } | null;
            }>;
          };
        }
      ).breb.createKey({
        keyType: createKeyType,
        key: createKeyValue.trim(),
        displayName: user.name.trim() || 'Usuario Bloque',
        ledgerId,
        metadata: {
          source: 'wallet',
          purpose: 'breb-send',
        },
      });

      if (created.error || !created.data?.urn) {
        throw new Error(
          created.error?.message ?? 'No se pudo crear la llave BRE-B.',
        );
      }

      return created.data;
    },
    onSuccess: async () => {
      toast.success('Llave BRE-B creada correctamente.');
      setCreateKeyValue('');
      await brebAccountsQuery.refetch();
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'No se pudo crear la llave BRE-B.',
      );
    },
  });

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

  const formError = useMemo(() => {
    if (key.length > 0 && !hasValidKey) {
      return 'La llave debe ser un número celular de 10 dígitos.';
    }
    if (!ledgerId && !isLoadingCards) {
      return 'No encontramos una cuenta base para enviar.';
    }
    if (parsedAmount > 0 && parsedAmount < MIN_TRANSFER_AMOUNT) {
      return 'El monto mínimo es $10,000 COP.';
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
    hasValidKey,
    isLoadingCards,
    key.length,
    ledgerId,
    parsedAmount,
    ratesQuery.isError,
    ratesQuery.isSuccess,
    selectedRate,
  ]);

  const previewRecipientMutation = useMutation({
    mutationFn: async () => {
      const resolution = await (
        bloque.accounts as typeof bloque.accounts & {
          breb: {
            resolveKey: (params: { keyType: string; key: string }) => Promise<{
              data: ResolvedRecipient | null;
              error: { message: string } | null;
            }>;
          };
        }
      ).breb.resolveKey({
        keyType: 'PHONE',
        key: normalizedKey,
      });

      if (resolution.error || !resolution.data) {
        throw new Error(
          resolution.error?.message ?? 'No se pudo resolver la llave BRE-B.',
        );
      }

      return resolution.data;
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

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!recipientPreview?.resolutionId) {
        throw new Error('No hay destinatario confirmado.');
      }
      if (!selectedRate?.sig) {
        throw new Error('No hay tasa disponible para enviar.');
      }
      if (!amountSrc) {
        throw new Error('Monto inválido para crear la orden.');
      }

      const sourceAccountUrn =
        activeBrebAccount?.urn ?? (await getBrebSourceAccountUrn());

      return (
        bloque.swap as typeof bloque.swap & {
          breb: {
            create: (params: {
              rateSig: string;
              amountSrc: string;
              depositInformation: {
                resolutionId: string;
              };
              args: {
                sourceAccountUrn: string;
              };
              metadata?: Record<string, unknown>;
            }) => Promise<{
              order: { id: string };
              execution?: { result: { how?: { url?: string } } };
            }>;
          };
        }
      ).breb.create({
        rateSig: selectedRate.sig,
        amountSrc,
        depositInformation: {
          resolutionId: recipientPreview.resolutionId,
        },
        args: {
          sourceAccountUrn,
        },
        metadata: message.trim()
          ? {
              message: message.trim(),
            }
          : undefined,
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
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'No se pudo enviar la transferencia BRE-B.';
      toast.error(errorMessage);
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

  if (brebAccountsQuery.isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <Link
            to="/send"
            className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Llaves BRE-B
          </h1>
        </div>
        <div className="rounded-2xl border border-border/75 bg-card/80 p-4 text-sm text-muted-foreground">
          Cargando tus llaves BRE-B...
        </div>
      </div>
    );
  }

  if (!activeBrebAccount) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <Link
            to="/send"
            className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Llaves BRE-B
            </h1>
            <p className="text-xs text-muted-foreground">
              Primero crea tu llave para poder enviar dinero por BRE-B
            </p>
          </div>
        </div>

        <section className="rounded-3xl border border-border/75 bg-card/80 p-5">
          <div className="flex flex-col gap-5">
            <div className="rounded-2xl border border-border/75 bg-background/70 p-4">
              <p className="text-sm font-medium text-foreground">
                No tienes una llave BRE-B creada
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                El primer paso es registrar una llave propia. Luego podrás
                enviar dinero a cualquier banco colombiano al instante.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Tipo de llave</Label>
              <div className="grid grid-cols-2 gap-2">
                {BREB_KEY_TYPES.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setCreateKeyType(option.value)}
                    className={`rounded-2xl border px-3 py-3 text-sm transition-all ${
                      createKeyType === option.value
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border bg-background/70 text-foreground hover:bg-muted/70'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="breb-create-key">Valor de la llave</Label>
              <Input
                id="breb-create-key"
                inputMode={
                  createKeyType === 'PHONE' || createKeyType === 'ID'
                    ? 'numeric'
                    : 'text'
                }
                placeholder={selectedCreateKeyType?.placeholder}
                value={createKeyValue}
                onChange={(event) => setCreateKeyValue(event.target.value)}
                className="h-12 rounded-2xl"
              />
            </div>

            <Button
              onClick={() => createKeyMutation.mutate()}
              disabled={
                createKeyMutation.isPending ||
                !createKeyValue.trim() ||
                !ledgerId
              }
              className="h-12 w-full rounded-2xl text-sm font-medium"
            >
              {createKeyMutation.isPending
                ? 'Creando llave...'
                : 'Crear llave BRE-B'}
            </Button>

            {!ledgerId && !isLoadingCards ? (
              <p className="text-xs text-destructive">
                Necesitas una cuenta base disponible para crear tu llave BRE-B.
              </p>
            ) : null}
          </div>
        </section>
      </div>
    );
  }

  if (view === 'pending') {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <Link
            to="/send"
            className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Llaves BRE-B
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
            to="/send"
            className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Llaves BRE-B
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
          to="/send"
          className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Llaves BRE-B
          </h1>
          <p className="text-xs text-muted-foreground">
            Envia a cualquier banco colombiano al instante
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
              <p className="text-xs text-muted-foreground">
                Igual que en Nequi: escribe la llave, el monto y un mensaje.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="breb-key">Llave BRE-B</Label>
            <Input
              id="breb-key"
              inputMode="numeric"
              placeholder="3001234567"
              value={key}
              onChange={(event) =>
                setKey(event.target.value.replace(/\D/g, '').slice(0, 10))
              }
              className="h-12 rounded-2xl"
              autoFocus
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
              className="min-h-24 rounded-2xl resize-none"
              maxLength={140}
            />
          </div>

          {formError ? (
            <p className="text-xs text-destructive">{formError}</p>
          ) : null}

          {parsedAmount >= MIN_TRANSFER_AMOUNT ? (
            <div className="rounded-2xl border border-border/85 bg-background/70 p-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Envías</span>
                  <span className="font-medium text-foreground">
                    {formatCOP(parsedAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Recibe</span>
                  <span className="font-medium text-foreground">
                    {rateSummary ? formatCOP(rateSummary.amountDst) : '...'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tasa</span>
                  <span className="font-medium text-foreground">
                    {rateSummary
                      ? `1 COPM = ${rateSummary.ratio.toFixed(4)} COP`
                      : 'Consultando...'}
                  </span>
                </div>
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
                <span className="text-muted-foreground">Envías</span>
                <span className="font-medium text-foreground">
                  {formatCOP(parsedAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Recibe</span>
                <span className="font-medium text-foreground">
                  {rateSummary ? formatCOP(rateSummary.amountDst) : '-'}
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
