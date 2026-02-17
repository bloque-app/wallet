'use client';

import { ArrowLeft, CheckCircle, Clock, Shield, XCircle } from 'lucide-react';
import { Button } from '~/components/ui/button';
import type { KycStatus } from '~/lib/mock-data';

interface KycGateProps {
  kycStatus: KycStatus;
  onStartKyc: () => void;
  onBack: () => void;
}

export function KycGate({ kycStatus, onStartKyc, onBack }: KycGateProps) {
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

      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        Verificación de identidad
      </h1>

      {kycStatus === 'not_started' && (
        <div className="flex flex-col items-center gap-6 py-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-border/80 bg-card">
            <Shield
              className="h-7 w-7 text-muted-foreground"
              strokeWidth={1.5}
            />
          </div>
          <div className="flex flex-col items-center gap-2 text-center">
            <h2 className="text-lg font-bold text-foreground">
              Verifica tu identidad para continuar
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Para emitir tu tarjeta virtual necesitamos verificar tu identidad.
              El proceso toma menos de 5 minutos.
            </p>
          </div>

          <div className="w-full rounded-2xl border border-border/85 bg-card/85 p-4">
            <p className="mb-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Necesitarás
            </p>
            <ul className="flex flex-col gap-2.5">
              {[
                'Cédula de ciudadanía o pasaporte',
                'Foto del documento (frente y reverso)',
                'Selfie con tu documento',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" />
                  <span className="text-sm text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <Button
            onClick={onStartKyc}
            className="h-12 w-full rounded-2xl text-sm font-medium"
          >
            Comenzar verificación
          </Button>
        </div>
      )}

      {kycStatus === 'in_review' && (
        <div className="flex flex-col items-center gap-6 py-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-border/80 bg-card">
            <Clock
              className="h-7 w-7 text-muted-foreground"
              strokeWidth={1.5}
            />
          </div>
          <div className="flex flex-col items-center gap-2 text-center">
            <h2 className="text-lg font-bold text-foreground">
              Verificación en revisión
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Estamos revisando tu información. Este proceso puede tomar hasta
              24 horas hábiles.
            </p>
          </div>
          <Button
            onClick={onBack}
            variant="outline"
            className="h-12 w-full rounded-2xl text-sm font-medium bg-transparent"
          >
            Volver
          </Button>
        </div>
      )}

      {kycStatus === 'rejected' && (
        <div className="flex flex-col items-center gap-6 py-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-foreground bg-card">
            <XCircle className="h-7 w-7 text-foreground" strokeWidth={1.5} />
          </div>
          <div className="flex flex-col items-center gap-2 text-center">
            <h2 className="text-lg font-bold text-foreground">
              Verificación rechazada
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Tu verificación fue rechazada. Esto puede deberse a documentos
              ilegibles o información inconsistente. Puedes intentar nuevamente.
            </p>
          </div>
          <Button
            onClick={onStartKyc}
            className="h-12 w-full rounded-2xl text-sm font-medium"
          >
            Intentar de nuevo
          </Button>
        </div>
      )}

      {kycStatus === 'approved' && (
        <div className="flex flex-col items-center gap-6 py-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-foreground bg-card">
            <CheckCircle
              className="h-7 w-7 text-foreground"
              strokeWidth={1.5}
            />
          </div>
          <div className="flex flex-col items-center gap-2 text-center">
            <h2 className="text-lg font-bold text-foreground">
              Identidad verificada
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Tu identidad ha sido verificada exitosamente. Ya puedes crear tu
              tarjeta.
            </p>
          </div>
          <Button
            onClick={onBack}
            className="h-12 w-full rounded-2xl text-sm font-medium"
          >
            Crear tarjeta
          </Button>
        </div>
      )}
    </div>
  );
}
