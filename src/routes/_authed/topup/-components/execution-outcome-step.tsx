'use client';

import { Copy, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';
import type { ExecutionOutcome } from '~/domain/payments/types';
import { formatCOP } from '~/lib/formatters';
import { TopUpPendingStep } from './pending-step';

interface ExecutionOutcomeStepProps {
  amount: number;
  orderId?: string;
  /** The `execution` returned alongside a created swap order, already
   * translated by `resolveExecutionOutcome` — never a raw SDK `how`. */
  execution: ExecutionOutcome | undefined;
  onError: () => void;
}

/**
 * Renders whatever the paused swap execution asked for next. Replaces the
 * previous pattern of silently dropping `ExecutionHowBrebDeposit` — that
 * case now surfaces the one-time BRE-B key the payer must send COP to,
 * instead of leaving the user with a bare "verify status" button and no
 * indication a manual BRE-B transfer is expected.
 */
export function ExecutionOutcomeStep({
  amount,
  orderId,
  execution,
  onError,
}: ExecutionOutcomeStepProps) {
  if (execution?.kind === 'breb-deposit') {
    const depositAmountMajor = Number.parseInt(execution.amount, 10) / 100;

    return (
      <div className="flex flex-col items-center gap-6 py-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-primary/25 bg-primary/[0.06]">
          <KeyRound className="h-7 w-7 text-primary" strokeWidth={1.5} />
        </div>

        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-lg font-bold text-foreground">
            Completa el pago por BRE-B
          </h2>
          <p className="text-sm text-muted-foreground">
            Envía{' '}
            {formatCOP(
              Number.isNaN(depositAmountMajor) ? amount : depositAmountMajor,
            )}{' '}
            desde tu app bancaria a esta llave BRE-B para completar la orden.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 rounded-2xl border border-border/85 bg-background/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">Llave BRE-B</span>
            <span className="font-mono text-sm font-medium text-foreground">
              {execution.keyValue}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">Estado</span>
            <span className="text-sm font-medium text-foreground">
              {execution.depositStatus === 'partial'
                ? 'Pago parcial recibido'
                : 'Esperando pago'}
            </span>
          </div>
          {orderId && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Orden</span>
              <span className="text-xs text-foreground">{orderId}</span>
            </div>
          )}
        </div>

        <div className="flex w-full flex-col gap-3">
          <Button
            onClick={() => {
              void navigator.clipboard
                .writeText(execution.keyValue)
                .then(() => toast.success('Llave BRE-B copiada.'));
            }}
            variant="default"
            className="h-12 w-full gap-2 rounded-2xl text-sm font-medium"
          >
            <Copy className="h-4 w-4" />
            Copiar llave
          </Button>
          <Button
            onClick={onError}
            variant="outline"
            className="h-12 w-full rounded-2xl text-sm font-medium bg-transparent"
          >
            Reportar problema
          </Button>
        </div>
      </div>
    );
  }

  const redirectUrl =
    execution?.kind === 'redirect' ? execution.url : undefined;

  return (
    <TopUpPendingStep
      amount={amount}
      orderId={orderId}
      actionLabel={redirectUrl ? 'Abrir enlace' : 'Verificar estado'}
      onRefresh={() => {
        if (redirectUrl) {
          window.open(redirectUrl, '_blank', 'noopener,noreferrer');
          return;
        }
        toast.info('Revisa el estado en movimientos.');
      }}
      onError={onError}
    />
  );
}
