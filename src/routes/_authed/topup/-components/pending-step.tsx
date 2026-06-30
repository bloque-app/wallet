'use client';

import { Clock, RefreshCw } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { formatCOP } from '~/lib/formatters';

interface PendingStepProps {
  amount: number;
  orderId?: string;
  actionLabel?: string;
  onRefresh: () => void;
  onError: () => void;
}

export function TopUpPendingStep({
  amount,
  orderId,
  actionLabel = 'Verificar estado',
  onRefresh,
  onError,
}: PendingStepProps) {
  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-primary/25 bg-primary/[0.06]">
        <Clock className="h-7 w-7 text-primary" strokeWidth={1.5} />
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="text-lg font-bold text-foreground">Orden creada</h2>
        <p className="text-sm text-muted-foreground">
          Tu orden está siendo procesada. Puede completarse, quedar pendiente o
          ser rechazada.
        </p>
        <p className="text-2xl font-bold tabular-nums text-foreground">
          {formatCOP(amount)}
        </p>
        {orderId && (
          <p className="text-xs text-muted-foreground">Orden: {orderId}</p>
        )}
      </div>

      <div className="flex w-full flex-col gap-3">
        <Button
          onClick={onRefresh}
          variant="default"
          className="h-12 w-full gap-2 rounded-2xl text-sm font-medium"
        >
          <RefreshCw className="h-4 w-4" />
          {actionLabel}
        </Button>
        <Button
          onClick={onError}
          variant="outline"
          className="h-12 w-full rounded-2xl text-sm font-medium bg-transparent"
        >
          Reportar problema
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground text-center">
        Si tienes dudas sobre el estado de tu orden, contacta soporte.
      </p>
    </div>
  );
}
