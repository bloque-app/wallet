'use client';

import { ArrowLeft, Camera, Check, Upload } from 'lucide-react';
import { useState } from 'react';
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
import { useWallet } from '~/lib/wallet-mock';

interface KycStepperProps {
  onComplete: () => void;
  onBack: () => void;
}

type KycStep = 1 | 2 | 3 | 4;

const stepLabels = ['Datos', 'Documento', 'Selfie', 'Revisión'];

function StepIndicator({ currentStep }: { currentStep: KycStep }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-border/75 bg-card/80 p-3">
      {stepLabels.map((label, i) => {
        const stepNum = (i + 1) as KycStep;
        const isActive = stepNum <= currentStep;
        return (
          <div key={label} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold ${
                  isActive
                    ? 'bg-foreground text-background'
                    : 'border border-border bg-card text-muted-foreground'
                }`}
              >
                {stepNum < currentStep ? (
                  <Check className="h-3 w-3" />
                ) : (
                  stepNum
                )}
              </div>
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
            {i < 3 && (
              <div
                className={`mb-4 h-px w-5 ${isActive ? 'bg-foreground' : 'bg-border'}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function PersonalInfoStep({ onNext }: { onNext: () => void }) {
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [nationality, setNationality] = useState<string | null>('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState<string | null>('');

  const isValid = name && dob && nationality && address && city;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-medium text-foreground">
        Información personal
      </p>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="kyc-name" className="text-xs text-muted-foreground">
            Nombre completo
          </Label>
          <Input
            id="kyc-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Juan Pérez García"
            className="h-11 rounded-2xl"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="kyc-dob" className="text-xs text-muted-foreground">
            Fecha de nacimiento
          </Label>
          <Input
            id="kyc-dob"
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className="h-11 rounded-2xl"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Nacionalidad</Label>
          <Select value={nationality} onValueChange={setNationality}>
            <SelectTrigger className="h-11 rounded-2xl">
              <SelectValue placeholder="Selecciona..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CO">Colombiana</SelectItem>
              <SelectItem value="VE">Venezolana</SelectItem>
              <SelectItem value="EC">Ecuatoriana</SelectItem>
              <SelectItem value="PE">Peruana</SelectItem>
              <SelectItem value="OTHER">Otra</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="kyc-address"
            className="text-xs text-muted-foreground"
          >
            Dirección
          </Label>
          <Input
            id="kyc-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Cra 45 #26-85, Apto 302"
            className="h-11 rounded-2xl"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="kyc-city" className="text-xs text-muted-foreground">
            Ciudad
          </Label>
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger className="h-11 rounded-2xl">
              <SelectValue placeholder="Selecciona..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bogota">Bogotá</SelectItem>
              <SelectItem value="medellin">Medellín</SelectItem>
              <SelectItem value="cali">Cali</SelectItem>
              <SelectItem value="barranquilla">Barranquilla</SelectItem>
              <SelectItem value="cartagena">Cartagena</SelectItem>
              <SelectItem value="bucaramanga">Bucaramanga</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button
        onClick={onNext}
        disabled={!isValid}
        className="mt-2 h-12 w-full rounded-2xl text-sm font-medium"
      >
        Continuar
      </Button>
    </div>
  );
}

function DocumentStep({ onNext }: { onNext: () => void }) {
  const [docType, setDocType] = useState<string | null>('');
  const [frontUploaded, setFrontUploaded] = useState(false);
  const [backUploaded, setBackUploaded] = useState(false);

  const isValid =
    docType && frontUploaded && (docType === 'passport' || backUploaded);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-medium text-foreground">
        Documento de identidad
      </p>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">
          Tipo de documento
        </Label>
        <Select value={docType} onValueChange={setDocType}>
          <SelectTrigger className="h-11 rounded-2xl">
            <SelectValue placeholder="Selecciona..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cedula">Cédula de ciudadanía</SelectItem>
            <SelectItem value="passport">Pasaporte</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {docType && (
        <div className="flex flex-col gap-3">
          {/* Front */}
          <button
            type="button"
            onClick={() => setFrontUploaded(true)}
            className={`flex h-28 w-full items-center justify-center rounded-2xl border-2 border-dashed transition-colors ${
              frontUploaded
                ? 'border-foreground bg-muted'
                : 'border-border bg-card hover:border-muted-foreground'
            }`}
          >
            {frontUploaded ? (
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-foreground" />
                <span className="text-sm font-medium text-foreground">
                  Frente cargado
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Foto del frente del documento
                </span>
              </div>
            )}
          </button>

          {/* Back (only for cedula) */}
          {docType === 'cedula' && (
            <button
              type="button"
              onClick={() => setBackUploaded(true)}
              className={`flex h-28 w-full items-center justify-center rounded-2xl border-2 border-dashed transition-colors ${
                backUploaded
                  ? 'border-foreground bg-muted'
                  : 'border-border bg-card hover:border-muted-foreground'
              }`}
            >
              {backUploaded ? (
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    Reverso cargado
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Foto del reverso del documento
                  </span>
                </div>
              )}
            </button>
          )}
        </div>
      )}

      <Button
        onClick={onNext}
        disabled={!isValid}
        className="mt-2 h-12 w-full rounded-2xl text-sm font-medium"
      >
        Continuar
      </Button>
    </div>
  );
}

function SelfieStep({ onNext }: { onNext: () => void }) {
  const [captured, setCaptured] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-medium text-foreground">
        Selfie de verificación
      </p>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Toma una selfie sosteniendo tu documento junto a tu rostro. Asegúrate de
        que ambos sean claramente visibles.
      </p>

      <button
        type="button"
        onClick={() => setCaptured(true)}
        className={`flex h-48 w-full items-center justify-center rounded-2xl border-2 border-dashed transition-colors ${
          captured
            ? 'border-foreground bg-muted'
            : 'border-border bg-card hover:border-muted-foreground'
        }`}
      >
        {captured ? (
          <div className="flex flex-col items-center gap-2">
            <Check className="h-6 w-6 text-foreground" />
            <span className="text-sm font-medium text-foreground">
              Selfie capturada
            </span>
            <span className="text-xs text-muted-foreground">
              Toca para volver a tomar
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Camera className="h-8 w-8 text-muted-foreground" strokeWidth={1} />
            <span className="text-sm text-muted-foreground">
              Toca para tomar foto
            </span>
          </div>
        )}
      </button>

      <Button
        onClick={onNext}
        disabled={!captured}
        className="mt-2 h-12 w-full rounded-2xl text-sm font-medium"
      >
        Continuar
      </Button>
    </div>
  );
}

function ReviewStep({ onSubmit }: { onSubmit: () => void }) {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm font-medium text-foreground">
        Revisa tu información
      </p>

      <div className="rounded-2xl border border-border/85 bg-card/85 p-4">
        <div className="flex flex-col gap-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Nombre</span>
            <span className="font-medium text-foreground">
              Juan Pérez García
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Nacionalidad</span>
            <span className="font-medium text-foreground">Colombiana</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Documento</span>
            <span className="font-medium text-foreground">
              Cédula de ciudadanía
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Ciudad</span>
            <span className="font-medium text-foreground">Bogotá</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Archivos</span>
            <span className="font-medium text-foreground">3 cargados</span>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Al enviar, aceptas que la información proporcionada es verídica. Nyv
        realizará la verificación conforme a la normativa colombiana de
        prevención de lavado de activos (SARLAFT).
      </p>

      <Button
        onClick={onSubmit}
        className="h-12 w-full rounded-2xl text-sm font-medium"
      >
        Enviar verificación
      </Button>
    </div>
  );
}

export function KycStepper({ onComplete, onBack }: KycStepperProps) {
  const [step, setStep] = useState<KycStep>(1);
  const { setKycStatus } = useWallet();

  function handleSubmit() {
    setKycStatus('in_review');
    onComplete();
  }

  return (
    <div className="flex flex-col gap-5">
      <button
        type="button"
        onClick={step === 1 ? onBack : () => setStep((step - 1) as KycStep)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver
      </button>

      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        Verificación KYC
      </h1>

      <StepIndicator currentStep={step} />

      {step === 1 && <PersonalInfoStep onNext={() => setStep(2)} />}
      {step === 2 && <DocumentStep onNext={() => setStep(3)} />}
      {step === 3 && <SelfieStep onNext={() => setStep(4)} />}
      {step === 4 && <ReviewStep onSubmit={handleSubmit} />}
    </div>
  );
}
