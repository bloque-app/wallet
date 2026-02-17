'use client';

import { Mail, Phone } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';

interface LoginMethodSelectProps {
  onContinue: (method: 'email' | 'phone', contact: string) => Promise<void>;
}

export function LoginMethodSelect({ onContinue }: LoginMethodSelectProps) {
  const [tab, setTab] = useState<'email' | 'phone' | null>(null);
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalizedValue =
      tab === 'phone' ? value.replace('+', '').trim() : value.trim();

    if (!normalizedValue) {
      setError(
        tab === 'email'
          ? 'Ingresa tu correo electrónico'
          : 'Ingresa tu número de teléfono',
      );
      return;
    }
    if (tab === 'email' && !normalizedValue.includes('@')) {
      setError('Correo electrónico inválido');
      return;
    }
    if (tab === 'phone' && normalizedValue.length < 10) {
      setError('Número de teléfono inválido');
      return;
    }
    await onContinue(tab!, normalizedValue);
  }

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Wallet
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Inicia sesión para acceder a tu billetera
        </p>
      </div>

      {tab === null ? (
        <div className="flex flex-col gap-3">
          <Button
            variant="default"
            className="h-12 w-full justify-start gap-3 rounded-2xl px-4 text-sm font-medium dark:shadow-[0_14px_28px_-20px_rgb(0_0_0_/_0.72)]"
            onClick={() => {
              setTab('email');
              setValue('');
              setError('');
            }}
          >
            <Mail className="h-4 w-4" />
            Continuar con correo
          </Button>
          <Button
            variant="outline"
            className="h-12 w-full justify-start gap-3 rounded-2xl px-4 text-sm font-medium bg-transparent dark:shadow-[0_8px_24px_-22px_rgb(0_0_0_/_0.66)]"
            onClick={() => {
              setTab('phone');
              setValue('');
              setError('');
            }}
          >
            <Phone className="h-4 w-4" />
            Continuar con teléfono
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="login-input"
              className="text-sm font-medium text-foreground"
            >
              {tab === 'email' ? 'Correo electrónico' : 'Número de teléfono'}
            </Label>
            <Input
              id="login-input"
              type={tab === 'email' ? 'email' : 'tel'}
              placeholder={
                tab === 'email' ? 'tu@correo.com' : '+57 300 123 4567'
              }
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError('');
              }}
              autoFocus
              className="h-12 rounded-2xl dark:shadow-[0_10px_24px_-24px_rgb(0_0_0_/_0.66)]"
              inputMode={tab === 'phone' ? 'numeric' : 'email'}
              autoComplete={tab === 'email' ? 'email' : 'tel'}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <Button
            type="submit"
            className="h-12 w-full rounded-2xl text-sm font-medium dark:shadow-[0_14px_28px_-20px_rgb(0_0_0_/_0.72)]"
          >
            Enviar código
          </Button>
          <button
            type="button"
            onClick={() => {
              setTab(null);
              setValue('');
              setError('');
            }}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Cambiar método
          </button>
        </form>
      )}

      <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
        {'Al continuar, aceptas nuestros '}
        <span className="underline">Términos de servicio</span>
        {' y '}
        <span className="underline">Política de privacidad</span>
      </p>
    </div>
  );
}
