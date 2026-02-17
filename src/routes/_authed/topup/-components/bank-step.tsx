'use client';

import { ArrowLeft } from 'lucide-react';
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

export interface TopUpBankAccountData {
  bankAccountType: 'savings' | 'checking';
  bankAccountNumber: string;
  bankAccountHolderName: string;
  bankAccountHolderIdentificationType: 'CC' | 'CE' | 'NIT' | 'PP';
  bankAccountHolderIdentificationValue: string;
}

interface BankStepProps {
  form: TopUpBankAccountData;
  onFormChange: (value: TopUpBankAccountData) => void;
  onBack: () => void;
  onNext: () => void;
}

export function TopUpBankStep({
  form,
  onFormChange,
  onBack,
  onNext,
}: BankStepProps) {
  const isValid =
    !!form.bankAccountType &&
    !!form.bankAccountNumber.trim() &&
    !!form.bankAccountHolderName.trim() &&
    !!form.bankAccountHolderIdentificationType &&
    !!form.bankAccountHolderIdentificationValue.trim();

  const update = <K extends keyof TopUpBankAccountData>(
    key: K,
    value: TopUpBankAccountData[K],
  ) => {
    onFormChange({ ...form, [key]: value });
  };

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

      <div className="rounded-2xl border border-border/80 bg-card/80 p-4">
        <p className="text-sm font-medium text-foreground">Banco destino</p>
        <p className="mt-1 text-sm text-muted-foreground">Bancolombia</p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-foreground">
            Tipo de cuenta
          </Label>
          <Select
            value={form.bankAccountType}
            onValueChange={(value) =>
              update(
                'bankAccountType',
                value as TopUpBankAccountData['bankAccountType'],
              )
            }
          >
            <SelectTrigger className="h-12 rounded-2xl">
              <SelectValue placeholder="Selecciona tipo de cuenta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="savings">Ahorros</SelectItem>
              <SelectItem value="checking">Corriente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-foreground">
            Número de cuenta
          </Label>
          <Input
            value={form.bankAccountNumber}
            onChange={(e) =>
              update('bankAccountNumber', e.target.value.replace(/\D/g, ''))
            }
            inputMode="numeric"
            placeholder="Ej: 5740088718"
            className="h-12 rounded-2xl"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-foreground">
            Titular de la cuenta
          </Label>
          <Input
            value={form.bankAccountHolderName}
            onChange={(e) => update('bankAccountHolderName', e.target.value)}
            placeholder="Nombre completo"
            className="h-12 rounded-2xl"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-foreground">
              Tipo de documento
            </Label>
            <Select
              value={form.bankAccountHolderIdentificationType}
              onValueChange={(value) =>
                update(
                  'bankAccountHolderIdentificationType',
                  value as TopUpBankAccountData['bankAccountHolderIdentificationType'],
                )
              }
            >
              <SelectTrigger className="h-12 rounded-2xl">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CC">CC</SelectItem>
                <SelectItem value="CE">CE</SelectItem>
                <SelectItem value="NIT">NIT</SelectItem>
                <SelectItem value="PP">PP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-foreground">
              Número de documento
            </Label>
            <Input
              value={form.bankAccountHolderIdentificationValue}
              onChange={(e) =>
                update(
                  'bankAccountHolderIdentificationValue',
                  e.target.value.replace(/\D/g, ''),
                )
              }
              inputMode="numeric"
              placeholder="Ej: 123456789"
              className="h-12 rounded-2xl"
            />
          </div>
        </div>
      </div>

      <Button
        onClick={onNext}
        disabled={!isValid}
        className="h-12 w-full rounded-2xl text-sm font-medium"
      >
        Continuar
      </Button>
    </div>
  );
}
