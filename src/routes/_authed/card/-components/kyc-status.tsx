'use client';

import { ArrowLeft, Clock, Mail } from 'lucide-react';
import { Button } from '~/components/ui/button';
import type { KycStatus as KycStatusType } from '~/lib/mock-data';

interface KycStatusProps {
  status: KycStatusType;
  onBack: () => void;
}

export function KycStatus({ onBack }: KycStatusProps) {
  return (
    <div className="flex flex-col gap-5">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver
      </button>

      <div className="flex flex-col items-center gap-6 py-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-border/80 bg-card">
          <Clock className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
        </div>

        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-lg font-bold text-foreground">
            Verificación enviada
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Tu información ha sido enviada exitosamente. Estamos revisando tus
            datos y te notificaremos cuando tu verificación esté completa.
          </p>
        </div>

        <div className="w-full rounded-2xl border border-border/85 bg-card/85 p-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Estado</span>
              <span className="font-medium text-foreground">En revisión</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tiempo estimado</span>
              <span className="font-medium text-foreground">
                24 horas hábiles
              </span>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3">
          <Button
            onClick={onBack}
            className="h-12 w-full rounded-2xl text-sm font-medium"
          >
            Volver al inicio
          </Button>
          <Button
            variant="outline"
            className="h-12 w-full gap-2 rounded-2xl text-sm font-medium bg-transparent"
          >
            <Mail className="h-4 w-4" />
            Contactar soporte
          </Button>
        </div>
      </div>
    </div>
  );
}
