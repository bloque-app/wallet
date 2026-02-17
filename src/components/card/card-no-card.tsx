'use client';

import { CreditCard, Shield } from 'lucide-react';
import { Button } from '~/components/ui/button';

interface CardNoCardProps {
  onCreateCard: () => void;
}

export function CardNoCard({ onCreateCard }: CardNoCardProps) {
  return (
    <div className="flex flex-col items-center gap-6 py-6">
      <div className="relative flex h-48 w-full max-w-xs items-center justify-center rounded-[1.6rem] border-2 border-dashed border-border bg-card/80">
        <div className="flex flex-col items-center gap-3">
          <CreditCard
            className="h-10 w-10 text-muted-foreground"
            strokeWidth={1}
          />
          <p className="text-sm font-medium text-muted-foreground">
            Aún no tienes tarjetas
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="text-lg font-bold text-foreground">
          Crea tu primera tarjeta virtual Nyv
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Paga en cualquier comercio online con tus saldos en USD. Sin costos de
          emisión.
        </p>
      </div>

      <Button
        onClick={onCreateCard}
        className="h-12 w-full max-w-xs gap-2 rounded-2xl text-sm font-medium"
      >
        <CreditCard className="h-4 w-4" />
        Crear tarjeta
      </Button>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Shield className="h-3.5 w-3.5" />
        <span>Requiere verificación de identidad (KYC)</span>
      </div>
    </div>
  );
}
