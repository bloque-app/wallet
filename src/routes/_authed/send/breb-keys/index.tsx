import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Landmark, Send } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
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

const MIN_TRANSFER_AMOUNT = 10_000;
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

async function ensureBrebSourceAccount(params: {
  email: string;
  name: string;
  ledgerId: string;
}) {
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

  if (!params.email.trim()) {
    throw new Error('No encontramos un email para crear tu cuenta BRE-B.');
  }

  if (!params.ledgerId.trim()) {
    throw new Error('No encontramos una cuenta base para crear BRE-B.');
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
    keyType: 'EMAIL',
    key: params.email.trim(),
    displayName: params.name.trim() || 'Usuario Bloque',
    ledgerId: params.ledgerId,
    metadata: {
      source: 'wallet',
      purpose: 'breb-send',
    },
  });

  if (created.error || !created.data?.urn) {
    throw new Error(
      created.error?.message ?? 'No se pudo crear la cuenta BRE-B origen.',
    );
  }

  return created.data.urn;
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
  const [lastOrder, setLastOrder] = useState<{
    id: string;
    redirectUrl?: string;
  } | null>(null);

  const normalizedKey = key.replace(/\D/g, '').slice(0, 10);
  const parsedAmount = Number.parseInt(amount.replace(/\D/g, ''), 10) || 0;
  const amountSrc = useMemo(() => {
    if (parsedAmount <= 0) return '';
    return majorToMinor(parsedAmount, FROM_PRECISION);
  }, [parsedAmount]);

  const ledgerId = cardsData?.accounts?.[0]?.ledgerId ?? '';
  const hasValidKey = normalizedKey.length === 10;

  const resolutionQuery = useQuery({
    queryKey: ['breb-key-resolution', normalizedKey],
    enabled: hasValidKey,
    queryFn: async () => {
      const resolution = await (
        bloque.accounts as typeof bloque.accounts & {
          breb: {
            resolveKey: (params: { keyType: string; key: string }) => Promise<{
              data: {
                resolutionId: string;
                key: { keyValue: string };
                owner: {
                  name: string | null;
                  businessName: string | null;
                } | null;
                participant: { name: string | null } | null;
              } | null;
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
    staleTime: 30_000,
    retry: 1,
  });

  const ratesQuery = useQuery({
    queryKey: ['breb-transfer-rates', amountSrc],
    enabled:
      parsedAmount >= MIN_TRANSFER_AMOUNT &&
      !!amountSrc &&
      resolutionQuery.isSuccess,
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
    if (resolutionQuery.isError) {
      return resolutionQuery.error instanceof Error
        ? resolutionQuery.error.message
        : 'No pudimos validar la llave BRE-B.';
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
      resolutionQuery.isSuccess &&
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
    resolutionQuery.error,
    resolutionQuery.isError,
    resolutionQuery.isSuccess,
    selectedRate,
  ]);

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!resolutionQuery.data?.resolutionId) {
        throw new Error('Primero valida una llave BRE-B.');
      }
      if (!selectedRate?.sig) {
        throw new Error('No hay tasa disponible para enviar.');
      }
      if (!amountSrc) {
        throw new Error('Monto inválido para crear la orden.');
      }

      const sourceAccountUrn = await ensureBrebSourceAccount({
        email: user.email,
        name: user.name,
        ledgerId,
      });

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
          resolutionId: resolutionQuery.data.resolutionId,
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
    hasValidKey &&
    parsedAmount >= MIN_TRANSFER_AMOUNT &&
    !!resolutionQuery.data?.resolutionId &&
    !!selectedRate &&
    !createOrderMutation.isPending;

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
            {resolutionQuery.isFetching && hasValidKey ? (
              <p className="text-xs text-muted-foreground">
                Validando llave BRE-B...
              </p>
            ) : null}
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

          {resolutionQuery.data ? (
            <div className="rounded-2xl border border-border/85 bg-background/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Destinatario</p>
                  <p className="text-sm font-semibold text-foreground">
                    {getRecipientName(resolutionQuery.data)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Llave {resolutionQuery.data.key.keyValue}
                  </p>
                </div>
                <span className="rounded-full border border-border px-2 py-1 text-[10px] text-muted-foreground">
                  BRE-B
                </span>
              </div>
            </div>
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
            onClick={() => createOrderMutation.mutate()}
            disabled={!canSubmit}
            className="h-12 w-full gap-2 rounded-2xl text-sm font-medium"
          >
            <Send className="h-4 w-4" />
            {createOrderMutation.isPending ? 'Enviando...' : 'Enviar dinero'}
          </Button>
        </div>
      </section>
    </div>
  );
}
