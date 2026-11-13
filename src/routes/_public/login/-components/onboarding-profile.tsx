'use client';

import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import type { OnboardingProfile as OnboardingProfileData } from '~/contexts/auth/types';

interface OnboardingProfileProps {
  onBack: () => void;
  onSubmitProfile: (profile: OnboardingProfileData) => Promise<void>;
}

export function OnboardingProfile({
  onBack,
  onSubmitProfile,
}: OnboardingProfileProps) {
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
      await onSubmitProfile({
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
      });
    } catch {
      setError('No pudimos enviarte el codigo. Intenta de nuevo.');
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
          Completa tu perfil
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Necesitamos tus datos basicos antes de enviarte el codigo.
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
          {loading ? 'Guardando...' : 'Continuar a verificacion'}
        </Button>
      </form>
    </div>
  );
}
