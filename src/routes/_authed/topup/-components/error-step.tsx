'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '~/components/ui/button';

interface ErrorStepProps {
  onRetry: () => void;
}

export function TopUpErrorStep({ onRetry }: ErrorStepProps) {
  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-foreground bg-card">
        <AlertTriangle className="h-7 w-7 text-foreground" strokeWidth={1.5} />
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="text-lg font-bold text-foreground">Pago fallido</h2>
        <p className="text-sm text-muted-foreground">
          No pudimos procesar tu pago. Esto puede ocurrir por fondos
          insuficientes, sesión expirada o un error temporal del banco.
        </p>
      </div>

      <div className="flex w-full flex-col gap-3">
        <Button
          onClick={onRetry}
          className="h-12 w-full rounded-2xl text-sm font-medium"
        >
          Intentar de nuevo
        </Button>
        <Button
          variant="outline"
          className="h-12 w-full rounded-2xl text-sm font-medium bg-transparent"
        >
          Contactar soporte
        </Button>
      </div>
    </div>
  );
}
