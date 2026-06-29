'use client';

import { useRouter } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '~/components/ui/button';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '~/components/ui/input-otp';
import { useAuth } from '~/contexts/auth/auth-context';
import type { PendingOnboarding } from '~/contexts/auth/types';

interface OTPVerifyProps {
  method: 'email' | 'phone';
  contact: string;
  onBack: () => void;
  onOnboardingRequired: (pending: PendingOnboarding) => void;
}

export function OTPVerify({
  method,
  contact,
  onBack,
  onOnboardingRequired,
}: OTPVerifyProps) {
  const { sendOTP, login } = useAuth();

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastFailedOtp, setLastFailedOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const { navigate } = useRouter();

  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((t) => t - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleVerify = useCallback(async () => {
    if (otp.length < 6) {
      setError('Ingresa el codigo completo');
      return;
    }
    if (otp === lastFailedOtp) {
      setError('Edita el codigo para volver a intentar.');
      return;
    }

    setLoading(true);
    setError('');

    const data = method === 'email' ? { email: contact } : { phone: contact };

    try {
      const result = await login({ code: otp, ...data });
      if (result.status === 'onboarding_required') {
        setLoading(false);
        setOtp('');
        setError('');
        onOnboardingRequired(result.pending);
        return;
      }

      navigate({ to: '/', replace: true });
    } catch (error) {
      if (isOtpError(error)) {
        setError('Codigo invalido o expirado. Intenta de nuevo.');
      } else {
        setError('No pudimos validar el codigo. Intenta otra vez.');
      }
      setLastFailedOtp(otp);
      setLoading(false);
    }
  }, [otp, lastFailedOtp, method, contact, login, onOnboardingRequired, navigate]);

  useEffect(() => {
    if (otp.length === 6 && !loading && otp !== lastFailedOtp) {
      void handleVerify();
    }
  }, [otp, loading, lastFailedOtp, handleVerify]);

  async function handleResend() {
    await sendOTP(method, contact);
    setResendTimer(60);
    setOtp('');
    setLastFailedOtp('');
    setError('');
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
          Verificar codigo
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Enviamos un codigo de 6 digitos a{' '}
          <span className="font-medium text-foreground">{contact}</span>
        </p>
      </div>

      <div className="flex flex-col items-center gap-4">
        <InputOTP
          maxLength={6}
          value={otp}
          onChange={(value) => {
            setOtp(value);
            if (value !== lastFailedOtp) {
              setError('');
            }
          }}
          autoFocus
        >
          <InputOTPGroup className="gap-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <InputOTPSlot
                key={index}
                index={index}
                className="h-12 w-11 text-lg dark:shadow-[0_8px_24px_-24px_rgb(0_0_0_/_0.72)]"
              />
            ))}
          </InputOTPGroup>
        </InputOTP>

        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      <Button
        onClick={handleVerify}
        disabled={loading || otp.length < 6 || otp === lastFailedOtp}
        className="h-12 w-full rounded-2xl text-sm font-medium dark:shadow-[0_14px_28px_-20px_rgb(0_0_0_/_0.72)]"
      >
        {loading ? 'Verificando...' : 'Verificar'}
      </Button>

      <div className="text-center">
        {resendTimer > 0 ? (
          <p className="text-xs text-muted-foreground">
            Reenviar codigo en{' '}
            <span className="font-medium tabular-nums text-foreground">
              {resendTimer}s
            </span>
          </p>
        ) : (
          <button
            type="button"
            onClick={() => void handleResend()}
            className="text-xs font-medium text-foreground underline underline-offset-2"
          >
            Reenviar codigo
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={onBack}
        className="text-center text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >
        Cambiar metodo
      </button>
    </div>
  );
}

function isOtpError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const maybeCode = (error as { code?: unknown }).code;
  const maybeMessage = (error as { message?: unknown }).message;
  const normalizedCode =
    typeof maybeCode === 'string' ? maybeCode.toUpperCase() : '';
  const normalizedMessage =
    typeof maybeMessage === 'string' ? maybeMessage.toUpperCase() : '';

  return (
    normalizedCode.includes('OTP') ||
    normalizedCode.includes('ASSERT') ||
    normalizedMessage.includes('OTP') ||
    normalizedMessage.includes('ASSERT')
  );
}
