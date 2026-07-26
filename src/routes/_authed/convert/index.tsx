import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowDownUp } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
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
import { useRates } from '~/hooks/payments/use-rates';
import { bloque } from '~/lib/bloque';
import { type Asset, formatAmount } from '~/lib/formatters';

const ASSET_KEY_MAP: Record<string, Asset> = {
  COPM: 'COP',
  DUSD: 'USD',
  KSM: 'KSM',
};

/**
 * SDK asset id (with precision) for each app-facing currency. Every leg of
 * a conversion here stays inside Bloque's own custody on the `'kusama'`
 * medium — the same internal medium string used as the Kusama-side of
 * topup (`TO_MEDIUM` in `topup/index.tsx`) and cash-out (`FROM_MEDIUM` in
 * `send/colombian-banks/index.tsx`), just on both sides of the rate query
 * instead of one.
 */
const ASSET_SDK: Record<Asset, { sdkAsset: string; precision: number }> = {
  COP: { sdkAsset: 'COPM/2', precision: 2 },
  USD: { sdkAsset: 'DUSD/6', precision: 6 },
  KSM: { sdkAsset: 'KSM/12', precision: 12 },
};
const INTERNAL_MEDIUM = 'kusama';

type BalancesData = Record<string, { current: string; pending: string }>;

function parseBalances(data: BalancesData | undefined): Record<Asset, number> {
  const out: Record<Asset, number> = { COP: 0, USD: 0, KSM: 0 };
  if (!data) return out;
  for (const [key, value] of Object.entries(data)) {
    const [assetKey, precisionStr] = key.split('/');
    const precision = Number.parseInt(precisionStr, 10);
    const mapped = ASSET_KEY_MAP[assetKey];
    if (mapped && !Number.isNaN(precision)) {
      out[mapped] = Number.parseInt(value.current, 10) / 10 ** precision;
    }
  }
  return out;
}

function majorToMinor(amountMajor: number, precision: number): string {
  if (!Number.isFinite(amountMajor) || amountMajor <= 0) return '';
  return Math.round(amountMajor * 10 ** precision).toString();
}

function minorToMajor(amountMinor: number, precision: number) {
  return amountMinor / 10 ** precision;
}

export const Route = createFileRoute('/_authed/convert/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: balancesData } = useQuery({
    queryKey: ['balances'],
    queryFn: async () => bloque.accounts.balances(),
  });

  const balances = useMemo(
    () => parseBalances(balancesData as BalancesData),
    [balancesData],
  );

  const [fromAsset, setFromAsset] = useState<Asset>('COP');
  const [toAsset, setToAsset] = useState<Asset>('USD');
  const [amount, setAmount] = useState('');

  const parsed = Number.parseFloat(amount) || 0;
  const fromConfig = ASSET_SDK[fromAsset];
  const toConfig = ASSET_SDK[toAsset];
  const available = balances[fromAsset];

  const amountSrc = useMemo(
    () => majorToMinor(parsed, fromConfig.precision),
    [parsed, fromConfig.precision],
  );

  const ratesQuery = useRates(
    parsed > 0 && fromAsset !== toAsset && amountSrc
      ? {
          fromAsset: fromConfig.sdkAsset,
          toAsset: toConfig.sdkAsset,
          fromMediums: [INTERNAL_MEDIUM],
          toMediums: [INTERNAL_MEDIUM],
          amountSrc,
        }
      : undefined,
  );

  const selectedRate = ratesQuery.data?.[0] ?? null;

  const received = useMemo(() => {
    if (!selectedRate || parsed <= 0) return 0;
    if (
      typeof selectedRate.ratio === 'number' &&
      Number.isFinite(selectedRate.ratio)
    ) {
      return parsed * selectedRate.ratio;
    }
    const dstAmountMinor = selectedRate.rate?.[1] ?? 0;
    return minorToMajor(dstAmountMinor, toConfig.precision);
  }, [selectedRate, parsed, toConfig.precision]);

  const rateError = useMemo(() => {
    if (parsed <= 0 || fromAsset === toAsset) return null;
    if (ratesQuery.isError) {
      return 'No pudimos consultar la tasa. Intenta de nuevo.';
    }
    if (ratesQuery.isSuccess && !selectedRate) {
      return 'No hay tasas disponibles para este monto.';
    }
    return null;
  }, [
    parsed,
    fromAsset,
    toAsset,
    ratesQuery.isError,
    ratesQuery.isSuccess,
    selectedRate,
  ]);

  const isValid =
    parsed > 0 &&
    parsed <= available &&
    fromAsset !== toAsset &&
    !!selectedRate?.sig &&
    !ratesQuery.isFetching;

  function handleSwap() {
    setFromAsset(toAsset);
    setToAsset(fromAsset);
    setAmount('');
  }

  const submitConversion = useCallback(() => {
    if (!selectedRate?.sig) {
      toast.error('No hay una tasa vigente para confirmar la conversión.');
      return;
    }

    // NOTE for reviewers: as of @bloque/sdk-swap 0.2.7, `bloque.swap` has no
    // order-creation endpoint for a pure Kusama-internal conversion (both
    // fromMedium and toMedium === 'kusama'). Every typed client —
    // pse.create, bankTransfer.create, breb.create, rtp.create,
    // externalUsBank.create — pins one leg of the swap to an EXTERNAL rail
    // and mandates real third-party deposit info for that leg (a PSE bank +
    // legal ID, a Colombian bank account, a resolved BRE-B key, or a US
    // bank account) that a same-custody COP<->USD<->KSM conversion has no
    // legitimate value to fill in. Fabricating placeholder values for those
    // mandatory fields just to force a call through would risk misrouting
    // real funds to an unintended external destination, so this handler
    // stops short of creating an order rather than guessing. Flagged in the
    // PR description for a human to confirm, and to point at the right
    // endpoint if/when the backend exposes one.
    toast.error(
      'La conversión directa entre saldos aún no está disponible desde la app. Usa Recargar o Enviar mientras tanto.',
    );
  }, [selectedRate]);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold tracking-[-0.025em] text-foreground">
        Convertir
      </h1>

      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground">De</Label>
        <div className="flex gap-2">
          <Select
            value={fromAsset}
            onValueChange={(v) => setFromAsset(v as Asset)}
          >
            <SelectTrigger className="h-12 w-28 rounded-2xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="COP">COP</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-12 flex-1 rounded-2xl text-right font-bold tabular-nums"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Disponible: {formatAmount(fromAsset, available)}
        </p>
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={handleSwap}
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card transition-all hover:bg-muted"
          aria-label="Intercambiar activos"
        >
          <ArrowDownUp className="h-4 w-4 text-foreground" />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground">A</Label>
        <div className="flex gap-2">
          <Select value={toAsset} onValueChange={(v) => setToAsset(v as Asset)}>
            <SelectTrigger className="h-12 w-28 rounded-2xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="COP">COP</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex h-12 flex-1 items-center justify-end rounded-2xl border border-border bg-muted px-3 text-right font-bold tabular-nums text-foreground">
            {parsed > 0 && selectedRate
              ? formatAmount(toAsset, received)
              : parsed > 0 && ratesQuery.isFetching
                ? 'Consultando...'
                : '0'}
          </div>
        </div>
      </div>

      {parsed > 0 && fromAsset !== toAsset && selectedRate && (
        <div className="rounded-2xl border border-border/85 bg-card/85 p-4">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tasa</span>
              <span className="font-medium text-foreground tabular-nums">
                1 {fromAsset} ={' '}
                {selectedRate.ratio < 0.01
                  ? selectedRate.ratio.toFixed(6)
                  : selectedRate.ratio.toFixed(2)}{' '}
                {toAsset}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="font-medium text-foreground">Recibes</span>
              <span className="font-bold text-foreground">
                {formatAmount(toAsset, received)}
              </span>
            </div>
          </div>
        </div>
      )}

      {rateError ? (
        <p className="text-xs text-destructive">{rateError}</p>
      ) : null}

      <Button
        disabled={!isValid}
        onClick={submitConversion}
        className="h-12 w-full rounded-2xl text-sm font-medium"
      >
        {ratesQuery.isFetching ? 'Consultando tasa...' : 'Confirmar conversión'}
      </Button>

      <p className="text-center text-[10px] text-muted-foreground leading-relaxed">
        Las tasas de cambio son indicativas y pueden variar al momento de
        ejecutar la operación.{' '}
        <Link to="/send" className="underline">
          Enviar
        </Link>{' '}
        y{' '}
        <Link to="/topup" className="underline">
          Recargar
        </Link>{' '}
        siguen disponibles mientras tanto.
      </p>
    </div>
  );
}
