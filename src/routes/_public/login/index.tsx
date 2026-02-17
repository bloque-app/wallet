import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useAuth } from '~/contexts/auth/auth-context';
import { LoginMethodSelect } from './-components/login-method-select';
import { OTPVerify } from './-components/otp-verify';

export const Route = createFileRoute('/_public/login/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { sendOTP } = useAuth();

  const [step, setStep] = useState<'method' | 'otp'>('method');
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [contact, setContact] = useState('');

  async function handleMethodSelect(m: 'email' | 'phone', c: string) {
    await sendOTP(m, c);
    setMethod(m);
    setContact(c);
    setStep('otp');
  }

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center bg-background px-5 py-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(95%_55%_at_50%_0%,color-mix(in_oklch,var(--muted)_70%,transparent),transparent_65%)]"
      />
      <div className="w-full max-w-sm rounded-[1.9rem] border border-border/70 bg-card/85 p-6 shadow-[0_24px_45px_-35px_color-mix(in_oklch,var(--foreground)_38%,transparent)] dark:shadow-[0_24px_45px_-35px_rgb(0_0_0_/_0.76)] backdrop-blur-xl">
        {step === 'method' ? (
          <LoginMethodSelect onContinue={handleMethodSelect} />
        ) : (
          <OTPVerify
            method={method}
            contact={contact}
            onBack={() => setStep('method')}
          />
        )}
      </div>
    </div>
  );
}
