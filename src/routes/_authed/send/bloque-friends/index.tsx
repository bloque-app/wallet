import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Send, Users } from 'lucide-react';
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
import { formatAmount } from '~/lib/mock-data';

export const Route = createFileRoute('/_authed/send/bloque-friends/')({
  component: RouteComponent,
});

type ViewState = 'form' | 'pending' | 'error';
type AssetOption = 'COP' | 'USD' | 'KSM';
type TransferAsset = 'COPM/2' | 'DUSD/6' | 'KSM/12';
type AliasResult = {
  alias: string;
  urn: string;
  type: string;
  origin: string;
  details: {
    phone?: string;
  };
  metadata: {
    alias: string;
    [key: string]: unknown;
  };
  status: 'active' | 'inactive' | 'revoked';
};

const ASSET_OPTIONS: Array<{
  value: AssetOption;
  sdkAsset: TransferAsset;
  precision: number;
}> = [
  { value: 'COP', sdkAsset: 'COPM/2', precision: 2 },
  { value: 'USD', sdkAsset: 'DUSD/6', precision: 6 },
  { value: 'KSM', sdkAsset: 'KSM/12', precision: 12 },
];

function majorToMinor(amountMajor: number, precision: number) {
  return (BigInt(amountMajor) * 10n ** BigInt(precision)).toString();
}

function getAliasDisplayName(aliasResult: AliasResult) {
  return (
    (aliasResult.metadata.name as string) ||
    (aliasResult.metadata.alias as string) ||
    aliasResult.alias
  );
}

function RouteComponent() {
  const [view, setView] = useState<ViewState>('form');
  const [selectedAsset, setSelectedAsset] = useState<AssetOption>('COP');
  const [alias, setAlias] = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [recipientPreview, setRecipientPreview] = useState<AliasResult | null>(
    null,
  );
  const [lastTransfer, setLastTransfer] = useState<{
    destinationUrn: string;
    amount: number;
  } | null>(null);

  const accountsQuery = useQuery({
    queryKey: ['send-bloque-friends-accounts'],
    queryFn: async () => bloque.accounts.list(),
    staleTime: 30_000,
  });

  const selectedAssetConfig = ASSET_OPTIONS.find(
    (asset) => asset.value === selectedAsset,
  )!;
  const normalizedAlias = alias.trim();
  const parsedAmount = Number.parseInt(amount.replace(/\D/g, ''), 10) || 0;
  const amountMinor = useMemo(() => {
    if (parsedAmount <= 0) return '';
    return majorToMinor(parsedAmount, selectedAssetConfig.precision);
  }, [parsedAmount, selectedAssetConfig.precision]);

  const sourceAccount = (
    (accountsQuery.data?.accounts ?? []) as unknown as Array<{
      urn: string;
      status?: string;
    }>
  ).find(
    (account) =>
      account.status !== 'deleted' &&
      account.status !== 'disabled' &&
      account.status !== 'inactive',
  );

  const formError = useMemo(() => {
    if (!sourceAccount && accountsQuery.isSuccess) {
      return 'No encontramos una cuenta origen disponible.';
    }
    if (!normalizedAlias && alias.length > 0) {
      return 'Ingresa un alias valido.';
    }
    if (parsedAmount > 0 && parsedAmount < 1) {
      return 'Ingresa un monto valido.';
    }
    return null;
  }, [
    accountsQuery.isSuccess,
    alias.length,
    normalizedAlias,
    parsedAmount,
    sourceAccount,
  ]);

  const validateAliasMutation = useMutation({
    mutationFn: async () =>
      (await bloque.identity.aliases.get(normalizedAlias)) as AliasResult,
    onSuccess: (result) => {
      if (!result?.urn) {
        toast.error('No encontramos ese alias.');
        return;
      }
      setRecipientPreview(result);
      setConfirmOpen(true);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'No se pudo validar el alias.',
      );
    },
  });

  const transferMutation = useMutation({
    mutationFn: async () => {
      if (!sourceAccount?.urn) {
        throw new Error('No encontramos una cuenta origen disponible.');
      }
      if (!recipientPreview?.urn) {
        throw new Error('No hay destinatario confirmado.');
      }
      if (!amountMinor) {
        throw new Error('Monto invalido para transferir.');
      }

      return await bloque.accounts.transfer({
        sourceUrn: sourceAccount.urn,
        destinationUrn: recipientPreview.urn,
        amount: amountMinor,
        asset: selectedAssetConfig.sdkAsset,
        metadata: {
          reference: `bloque-friend-${Date.now()}`,
          note: message.trim(),
        },
      });
    },
    onSuccess: () => {
      setConfirmOpen(false);
      setLastTransfer({
        destinationUrn: recipientPreview?.urn ?? '',
        amount: parsedAmount,
      });
      setView('pending');
      toast.success('Transferencia enviada correctamente.');
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'No se pudo enviar la transferencia.',
      );
      setView('error');
    },
  });

  const canSubmit =
    !!sourceAccount?.urn &&
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
            Volver
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Amigos en bloque
          </h1>
        </div>

        <div className="rounded-2xl border border-border/75 bg-card/80 p-5">
          <p className="text-sm font-medium text-foreground">
            Transferencia enviada
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Enviamos {formatAmount(selectedAsset, lastTransfer?.amount ?? 0)} a
            tu contacto de Bloque.
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
            Volver
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Amigos en bloque
          </h1>
        </div>

        <div className="rounded-2xl border border-border/75 bg-card/80 p-5">
          <p className="text-sm font-medium text-foreground">
            No se pudo enviar la transferencia
          </p>
          <Button
            onClick={() => setView('form')}
            className="mt-4 h-11 rounded-2xl"
          >
            Reintentar
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
          Volver
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Amigos en bloque
          </h1>
          <p className="text-xs text-muted-foreground">
            Envia dinero a un alias de Bloque
          </p>
        </div>
      </div>

      <section className="rounded-3xl border border-border/75 bg-card/80 p-5">
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3 rounded-2xl border border-border/75 bg-background/70 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/80 bg-card">
              <Users className="h-5 w-5 text-foreground" />
            </div>
            <div className="flex flex-col">
              <p className="text-sm font-medium text-foreground">
                Transferencia entre usuarios Bloque
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Moneda</Label>
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
            <Label htmlFor="friend-alias">Alias</Label>
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
            <Label htmlFor="friend-amount">Monto</Label>
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
            <Label htmlFor="friend-message">Mensaje</Label>
            <Textarea
              id="friend-message"
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

          {parsedAmount > 0 ? (
            <div className="rounded-2xl border border-border/85 bg-background/70 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Envias</span>
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
              ? 'Validando alias...'
              : transferMutation.isPending
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
              Verifica la persona antes de enviar el dinero.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="rounded-2xl border border-border/85 bg-background/70 p-4">
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Destinatario</span>
                <span className="max-w-[60%] text-right font-semibold text-foreground">
                  {recipientPreview
                    ? getAliasDisplayName(recipientPreview)
                    : '-'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Alias</span>
                <span className="font-medium text-foreground">
                  {recipientPreview?.alias ?? normalizedAlias}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Monto</span>
                <span className="font-medium text-foreground">
                  {formatAmount(selectedAsset, parsedAmount)}
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
              disabled={transferMutation.isPending}
              onClick={() => setRecipientPreview(null)}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={transferMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                transferMutation.mutate();
              }}
            >
              {transferMutation.isPending ? 'Enviando...' : 'Confirmar envio'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
