'use client';

import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { formatCOP } from '~/lib/mock-data';

interface AmountStepProps {
  amount: string;
  fee: number;
  isLoadingRate: boolean;
  rateError: string | null;
  rateSummary: {
    amountDst: number;
    ratio: number;
  } | null;
  onAmountChange: (v: string) => void;
  onNext: () => void;
}

const quickAmounts = [50_000, 100_000, 200_000, 500_000];

export function TopUpAmountStep({
  amount,
  fee,
  isLoadingRate,
  rateError,
  rateSummary,
  onAmountChange,
  onNext,
}: AmountStepProps) {
  const parsed = Number.parseInt(amount.replace(/\D/g, ''), 10) || 0;
  const isValid = parsed >= 10_000;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label
          htmlFor="topup-amount"
          className="text-sm font-medium text-foreground"
        >
          Monto a recargar (COP)
        </Label>
        <Input
          id="topup-amount"
          type="text"
          inputMode="numeric"
          placeholder="$0"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value.replace(/\D/g, ''))}
          className="h-14 rounded-2xl text-center text-xl font-bold tabular-nums"
          autoFocus
        />
        {parsed > 0 && parsed < 10_000 && (
          <p className="text-xs text-destructive">Monto mínimo: $10,000 COP</p>
        )}
      </div>

      {/* Quick amounts */}
      <div className="grid grid-cols-4 gap-2">
        {quickAmounts.map((qa) => (
          <button
            key={qa}
            type="button"
            onClick={() => onAmountChange(String(qa))}
            className="rounded-xl border border-border bg-card px-2 py-2 text-xs font-medium text-foreground transition-all hover:bg-muted/80"
          >
            {formatCOP(qa)}
          </button>
        ))}
      </div>

      {/* Fee & total */}
      {isValid && (
        <div className="rounded-2xl border border-border/85 bg-card/85 p-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Monto</span>
              <span className="font-medium text-foreground">
                {formatCOP(parsed)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Comisión PSE</span>
              <span className="font-medium text-foreground">
                {formatCOP(fee)}
              </span>
            </div>
            <div className="my-1 h-px bg-border" />
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">
                Total a debitar
              </span>
              <span className="font-bold text-foreground">
                {formatCOP(parsed + fee)}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Tiempo estimado de llegada: 5-15 minutos
            </p>
          </div>
        </div>
      )}

      {isValid && (
        <div className="rounded-2xl border border-border/85 bg-card/85 p-4">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-foreground">Tasa aplicada</p>
            {isLoadingRate ? (
              <p className="text-xs text-muted-foreground">
                Consultando tasa disponible...
              </p>
            ) : rateError ? (
              <p className="text-xs text-destructive">{rateError}</p>
            ) : rateSummary ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tasa</span>
                  <span className="font-medium text-foreground">
                    1 COPM = {rateSummary.ratio.toFixed(4)} COP
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Recibirás</span>
                  <span className="font-semibold text-foreground">
                    {formatCOP(rateSummary.amountDst)}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                Ingresa un monto para consultar la tasa.
              </p>
            )}
          </div>
        </div>
      )}

      <Button
        onClick={onNext}
        disabled={!isValid || !rateSummary || isLoadingRate}
        className="h-12 w-full rounded-2xl text-sm font-medium"
      >
        {isLoadingRate ? 'Consultando tasa...' : 'Continuar'}
      </Button>

      <p className="text-[10px] leading-relaxed text-muted-foreground text-center">
        Transacción procesada mediante PSE (Pagos Seguros en Línea). Regulado
        por la Superintendencia Financiera de Colombia.
      </p>
    </div>
  );
}
