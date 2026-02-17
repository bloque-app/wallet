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

interface OTPVerifyProps {
  method: 'email' | 'phone';
  contact: string;
  onBack: () => void;
}

export function OTPVerify({ method, contact, onBack }: OTPVerifyProps) {
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
      setError('Ingresa el código completo');
      return;
    }
    if (otp === lastFailedOtp) {
      setError('Edita el código para volver a intentar.');
      return;
    }
    setLoading(true);
    setError('');
    // Simulate verification delay
    await new Promise((r) => setTimeout(r, 1200));
    if (otp === '000000') {
      setLastFailedOtp(otp);
      setError('Código incorrecto. Intenta de nuevo.');
      setLoading(false);
      return;
    }

    const data = method === 'email' ? { email: contact } : { phone: contact };
    try {
      await login({ code: otp, ...data });
      navigate({ to: '/', replace: true });
    } catch {
      setLastFailedOtp(otp);
      setError('Código incorrecto. Intenta de nuevo.');
      setLoading(false);
    }
  }, [otp, login, method, navigate, contact, lastFailedOtp]);

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
          Verificar código
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Enviamos un código de 6 dígitos a{' '}
          <span className="font-medium text-foreground">{contact}</span>
        </p>
      </div>

      <div className="flex flex-col items-center gap-4">
        <InputOTP
          maxLength={6}
          value={otp}
          onChange={(val) => {
            setOtp(val);
            if (val !== lastFailedOtp) {
              setError('');
            }
          }}
          autoFocus
        >
          <InputOTPGroup className="gap-2">
            <InputOTPSlot
              index={0}
              className="h-12 w-11 text-lg dark:shadow-[0_8px_24px_-24px_rgb(0_0_0_/_0.72)]"
            />
            <InputOTPSlot
              index={1}
              className="h-12 w-11 text-lg dark:shadow-[0_8px_24px_-24px_rgb(0_0_0_/_0.72)]"
            />
            <InputOTPSlot
              index={2}
              className="h-12 w-11 text-lg dark:shadow-[0_8px_24px_-24px_rgb(0_0_0_/_0.72)]"
            />
            <InputOTPSlot
              index={3}
              className="h-12 w-11 text-lg dark:shadow-[0_8px_24px_-24px_rgb(0_0_0_/_0.72)]"
            />
            <InputOTPSlot
              index={4}
              className="h-12 w-11 text-lg dark:shadow-[0_8px_24px_-24px_rgb(0_0_0_/_0.72)]"
            />
            <InputOTPSlot
              index={5}
              className="h-12 w-11 text-lg dark:shadow-[0_8px_24px_-24px_rgb(0_0_0_/_0.72)]"
            />
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
            Reenviar código en{' '}
            <span className="font-medium tabular-nums text-foreground">
              {resendTimer}s
            </span>
          </p>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            className="text-xs font-medium text-foreground underline underline-offset-2"
          >
            Reenviar código
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={onBack}
        className="text-center text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >
        Cambiar método de inicio de sesión
      </button>
    </div>
  );
}
