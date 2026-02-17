'use client';

import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Separator } from '~/components/ui/separator';
import { formatCOP } from '~/lib/mock-data';

interface ConfirmStepProps {
  amount: number;
  amountDst: number;
  ratio: number;
  bankAccountType: 'savings' | 'checking';
  bankAccountNumber: string;
  bankAccountHolderName: string;
  identificationLabel: string;
  identificationValue: string;
  isSubmitting?: boolean;
  onBack: () => void;
  onConfirm: () => void;
}

export function TopUpConfirmStep({
  amount,
  amountDst,
  ratio,
  bankAccountType,
  bankAccountNumber,
  bankAccountHolderName,
  identificationLabel,
  identificationValue,
  isSubmitting = false,
  onBack,
  onConfirm,
}: ConfirmStepProps) {
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

      <div className="rounded-2xl border border-border/85 bg-card/85 p-5">
        <p className="mb-4 text-sm font-medium text-foreground">
          Resumen de recarga
        </p>
        <div className="flex flex-col gap-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Activo</span>
            <span className="font-medium text-foreground">COP</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Monto</span>
            <span className="font-medium text-foreground">
              {formatCOP(amount)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tasa</span>
            <span className="font-medium text-foreground">
              1 COPM = {ratio.toFixed(4)} COP
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Banco</span>
            <span className="font-medium text-foreground">Bancolombia</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tipo de cuenta</span>
            <span className="font-medium text-foreground">
              {bankAccountType === 'savings' ? 'Ahorros' : 'Corriente'}
            </span>
          </div>
          <div className="flex justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Número de cuenta</span>
            <span className="max-w-[60%] truncate text-right font-medium text-foreground">
              {bankAccountNumber}
            </span>
          </div>
          <div className="flex justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Titular</span>
            <span className="max-w-[60%] truncate text-right font-medium text-foreground">
              {bankAccountHolderName}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{identificationLabel}</span>
            <span className="font-medium text-foreground">
              {identificationValue}
            </span>
          </div>
          <Separator />
          <div className="flex justify-between text-sm">
            <span className="font-semibold text-foreground">Recibirás</span>
            <span className="font-bold text-foreground">
              {formatCOP(amountDst)}
            </span>
          </div>
        </div>
      </div>

      <Button
        onClick={onConfirm}
        disabled={isSubmitting}
        className="h-12 w-full gap-2 rounded-2xl text-sm font-medium"
      >
        <ExternalLink className="h-4 w-4" />
        {isSubmitting ? 'Enviando...' : 'Enviar retiro'}
      </Button>

      <p className="text-[10px] leading-relaxed text-muted-foreground text-center">
        Verifica que los datos bancarios sean correctos antes de enviar.
      </p>
    </div>
  );
}
