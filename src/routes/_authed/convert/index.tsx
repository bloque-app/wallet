import { createFileRoute } from '@tanstack/react-router';
import { ArrowDownUp } from 'lucide-react';
import { useState } from 'react';
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
import { type Asset, formatAmount } from '~/lib/mock-data';
import { useWallet } from '~/lib/wallet-mock';

const rates: Record<string, number> = {
  'COP-USD': 1 / 4150,
  'USD-COP': 4150,
  'COP-KSM': 1 / 120_000,
  'KSM-COP': 120_000,
  'USD-KSM': 1 / 28.92,
  'KSM-USD': 28.92,
};

const feeRate = 0.006; // 0.6%

export const Route = createFileRoute('/_authed/convert/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { balances } = useWallet();
  const [fromAsset, setFromAsset] = useState<Asset>('COP');
  const [toAsset, setToAsset] = useState<Asset>('USD');
  const [amount, setAmount] = useState('');

  const parsed = Number.parseFloat(amount) || 0;
  const rateKey = `${fromAsset}-${toAsset}`;
  const rate = rates[rateKey] ?? 1;
  const fee = parsed * feeRate;
  const received = (parsed - fee) * rate;
  const available = balances[fromAsset];
  const isValid = parsed > 0 && parsed <= available && fromAsset !== toAsset;

  function handleSwap() {
    setFromAsset(toAsset);
    setToAsset(fromAsset);
    setAmount('');
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        Convertir
      </h1>

      {/* From */}
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
              <SelectItem value="COP">COP</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="KSM">KSM</SelectItem>
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

      {/* Swap button */}
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

      {/* To */}
      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground">A</Label>
        <div className="flex gap-2">
          <Select value={toAsset} onValueChange={(v) => setToAsset(v as Asset)}>
            <SelectTrigger className="h-12 w-28 rounded-2xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="COP">COP</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="KSM">KSM</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex h-12 flex-1 items-center justify-end rounded-2xl border border-border bg-muted px-3 text-right font-bold tabular-nums text-foreground">
            {parsed > 0 ? formatAmount(toAsset, received) : '0'}
          </div>
        </div>
      </div>

      {/* Rate & fee */}
      {parsed > 0 && fromAsset !== toAsset && (
        <div className="rounded-2xl border border-border/85 bg-card/85 p-4">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tasa</span>
              <span className="font-medium text-foreground tabular-nums">
                1 {fromAsset} ={' '}
                {rate < 0.01 ? rate.toFixed(6) : rate.toFixed(2)} {toAsset}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Comisión (0.6%)</span>
              <span className="font-medium text-foreground">
                {formatAmount(fromAsset, fee)}
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

      <Button
        disabled={!isValid}
        className="h-12 w-full rounded-2xl text-sm font-medium"
      >
        Confirmar conversión
      </Button>

      <p className="text-center text-[10px] text-muted-foreground leading-relaxed">
        Las tasas de cambio son indicativas y pueden variar al momento de
        ejecutar la operación.
      </p>
    </div>
  );
}
