'use client';

import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { useAuth } from '~/contexts/auth/auth-context';
import type {
  OnboardingProfile as OnboardingProfileData,
  PendingOnboarding,
} from '~/contexts/auth/types';

interface OnboardingProfileProps {
  pending: PendingOnboarding | null;
  isPreOtp: boolean;
  onBack: () => void;
  onSubmitProfile: (profile: OnboardingProfileData) => Promise<void>;
  onCompleted: () => void;
}

export function OnboardingProfile({
  pending,
  isPreOtp,
  onBack,
  onSubmitProfile,
  onCompleted,
}: OnboardingProfileProps) {
  const { completeOnboarding } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();

    if (!normalizedFirstName || !normalizedLastName) {
      setError('Completa nombre y apellido para continuar.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const profile = {
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
      };
      if (isPreOtp) {
        await onSubmitProfile(profile);
        return;
      }
      if (pending) {
        await completeOnboarding(pending, profile);
      } else {
        throw new Error('Missing onboarding state');
      }
      onCompleted();
    } catch (error) {
      setError(getOnboardingErrorMessage(error));
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-7">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        aria-label="Volver"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver
      </button>

      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          {isPreOtp ? 'Completa tu perfil' : 'Termina tu registro'}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {isPreOtp
            ? 'Necesitamos tus datos basicos antes de enviarte el codigo.'
            : 'Necesitamos tus datos basicos para terminar de crear tu identidad.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label
            htmlFor="first-name"
            className="text-sm font-medium text-foreground"
          >
            Nombre
          </Label>
          <Input
            id="first-name"
            type="text"
            value={firstName}
            onChange={(e) => {
              setFirstName(e.target.value);
              setError('');
            }}
            autoFocus
            className="h-12 rounded-2xl dark:shadow-[0_10px_24px_-24px_rgb(0_0_0_/_0.66)]"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label
            htmlFor="last-name"
            className="text-sm font-medium text-foreground"
          >
            Apellido
          </Label>
          <Input
            id="last-name"
            type="text"
            value={lastName}
            onChange={(e) => {
              setLastName(e.target.value);
              setError('');
            }}
            className="h-12 rounded-2xl dark:shadow-[0_10px_24px_-24px_rgb(0_0_0_/_0.66)]"
          />
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <Button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-2xl text-sm font-medium dark:shadow-[0_14px_28px_-20px_rgb(0_0_0_/_0.72)]"
        >
          {loading
            ? 'Guardando...'
            : isPreOtp
              ? 'Continuar a verificacion'
              : 'Continuar'}
        </Button>
      </form>
    </div>
  );
}

function getOnboardingErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return 'No pudimos completar el registro. Intenta de nuevo.';
  }

  const status = (error as { status?: unknown }).status;
  const code = (error as { code?: unknown }).code;
  if (status === 409 || code === 'E_IDENTITY_ALREADY_EXISTS') {
    return 'Tu identidad ya existe. Vuelve e intenta verificar el codigo otra vez.';
  }

  return 'No pudimos completar el registro. Intenta de nuevo.';
}
