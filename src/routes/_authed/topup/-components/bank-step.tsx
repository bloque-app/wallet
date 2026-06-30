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
} from '~/components/ui/select';
import { cn } from '~/lib/utils';

export interface TopUpBankAccountData {
  bankAccountType: 'savings' | 'checking';
  bankAccountNumber: string;
  bankAccountHolderName: string;
  bankAccountHolderIdentificationType: 'CC' | 'CE' | 'NIT' | 'PP';
  bankAccountHolderIdentificationValue: string;
}

export const COLOMBIAN_BANKS = [
  { code: 'banco_agrario_de_colombia', name: 'Banco Agrario de Colombia' },
  { code: 'banco_av_villas', name: 'Banco AV Villas' },
  { code: 'banco_bancamia', name: 'Banco Bancamia' },
  { code: 'banco_bbva_colombia', name: 'BBVA Colombia' },
  { code: 'banco_btg_pactual_colombia', name: 'Banco BTG Pactual Colombia' },
  { code: 'citibank_colombia', name: 'Citibank Colombia' },
  { code: 'banco_caja_social_bcsc', name: 'Banco Caja Social BCSC' },
  { code: 'davibank', name: 'Davibank' },
  { code: 'banco_contactar', name: 'Banco Contactar' },
  {
    code: 'banco_cooperativo_coopcentral',
    name: 'Banco Cooperativo Coopcentral',
  },
  { code: 'ban100', name: 'Ban100' },
  { code: 'banco_de_bogota', name: 'Banco de Bogotá' },
  { code: 'banco_de_occidente', name: 'Banco de Occidente' },
  { code: 'banco_gnb_sudameris', name: 'Banco GNB Sudameris' },
  { code: 'banco_jp_morgan_colombia', name: 'Banco JP Morgan Colombia' },
  { code: 'banco_popular', name: 'Banco Popular' },
  { code: 'banco_itau', name: 'Banco Itaú' },
  { code: 'banco_w', name: 'Banco W' },
  { code: 'daviplata', name: 'Daviplata' },
  { code: 'banco_coomeva', name: 'Banco Coomeva' },
  { code: 'banco_finandina_bic', name: 'Banco Finandina BIC' },
  { code: 'banco_falabella', name: 'Banco Falabella' },
  { code: 'banco_pichincha', name: 'Banco Pichincha' },
  {
    code: 'banco_santander_de_negocios_colombia',
    name: 'Banco Santander de Negocios Colombia',
  },
  { code: 'banco_mundo_mujer', name: 'Banco Mundo Mujer' },
  { code: 'banco_serfinanza', name: 'Banco Serfinanza' },
  { code: 'mibanco', name: 'Mibanco' },
  { code: 'lulo_bank', name: 'Lulo Bank' },
  { code: 'banco_union', name: 'Banco Unión' },
  { code: 'nubank', name: 'Nubank' },
  { code: 'rappipay', name: 'RappiPay' },
  { code: 'banco_davivienda', name: 'Banco Davivienda' },
  { code: 'nequi', name: 'Nequi' },
] as const;

const ID_TYPE_LABELS: Record<
  TopUpBankAccountData['bankAccountHolderIdentificationType'],
  string
> = {
  CC: 'Cédula de ciudadanía (CC)',
  CE: 'Cédula de extranjería (CE)',
  NIT: 'NIT',
  PP: 'Pasaporte (PP)',
};

interface BankStepProps {
  form: TopUpBankAccountData;
  selectedBank: string;
  onBankChange: (code: string) => void;
  onFormChange: (value: TopUpBankAccountData) => void;
  onBack: () => void;
  onNext: () => void;
}

export function TopUpBankStep({
  form,
  selectedBank,
  onBankChange,
  onFormChange,
  onBack,
  onNext,
}: BankStepProps) {
  const selectedBankName =
    COLOMBIAN_BANKS.find((b) => b.code === selectedBank)?.name ?? '';

  const isValid =
    !!selectedBank &&
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

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-foreground">
            Banco destino
          </Label>
          <Select
            value={selectedBank}
            onValueChange={(v) => onBankChange(v ?? '')}
          >
            <SelectTrigger className="h-12 rounded-2xl">
              {selectedBank ? (
                <span>{selectedBankName}</span>
              ) : (
                <span className="text-muted-foreground">
                  Selecciona un banco
                </span>
              )}
            </SelectTrigger>
            <SelectContent>
              {COLOMBIAN_BANKS.map((bank) => (
                <SelectItem key={bank.code} value={bank.code}>
                  {bank.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-foreground">
            Tipo de cuenta
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['savings', 'Ahorros'],
                ['checking', 'Corriente'],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => update('bankAccountType', val)}
                className={cn(
                  'h-12 rounded-2xl border px-3 text-sm font-medium transition-all',
                  form.bankAccountType === val
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-background/70 text-foreground hover:bg-muted/70',
                )}
              >
                {label}
              </button>
            ))}
          </div>
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
                <span>
                  {ID_TYPE_LABELS[form.bankAccountHolderIdentificationType]}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CC">Cédula de ciudadanía (CC)</SelectItem>
                <SelectItem value="CE">Cédula de extranjería (CE)</SelectItem>
                <SelectItem value="NIT">NIT</SelectItem>
                <SelectItem value="PP">Pasaporte (PP)</SelectItem>
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
