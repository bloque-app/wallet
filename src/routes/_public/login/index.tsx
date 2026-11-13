import { createFileRoute } from '@tanstack/react-router';
import { useRef, useState } from 'react';
import { useAuth } from '~/contexts/auth/auth-context';
import {
  type OnboardingProfile as OnboardingProfileData,
  WALLET_ORIGIN,
} from '~/contexts/auth/types';
import { safeRedirectPath } from '~/lib/safe-redirect';
import { LoginMethodSelect } from './-components/login-method-select';
import { OnboardingProfile } from './-components/onboarding-profile';
import { OTPVerify } from './-components/otp-verify';
import {
  clearPendingLogin,
  readPendingLogin,
  savePendingLogin,
} from './-lib/pending-login';

export const Route = createFileRoute('/_public/login/')({
  component: RouteComponent,
});

const OTP_RESEND_INTERVAL_MS = 60_000;

function RouteComponent() {
  const {
    checkAlias,
    sendOTP,
    setPendingProfileOnboarding,
    resetOnboardingState,
  } = useAuth();
  const { redirect } = Route.useSearch();

  const [pendingLogin] = useState(() => {
    const restored = readPendingLogin();
    setPendingProfileOnboarding(
      restored?.profile
        ? {
            method: restored.method,
            alias: restored.contact,
            origin: WALLET_ORIGIN,
            profile: restored.profile,
          }
        : null,
    );
    return restored;
  });
  const [step, setStep] = useState<'method' | 'otp' | 'onboarding'>(
    pendingLogin ? 'otp' : 'method',
  );
  const [method, setMethod] = useState<'email' | 'phone'>(
    pendingLogin?.method ?? 'email',
  );
  const [contact, setContact] = useState(pendingLogin?.contact ?? '');
  const [resendAvailableAt, setResendAvailableAt] = useState(
    pendingLogin?.resendAvailableAt ?? 0,
  );
  const profileRef = useRef<OnboardingProfileData | undefined>(
    pendingLogin?.profile,
  );

  function forgetProfile() {
    setPendingProfileOnboarding(null);
    profileRef.current = undefined;
  }

  async function handleMethodSelect(m: 'email' | 'phone', c: string) {
    resetOnboardingState();
    forgetProfile();
    setMethod(m);
    setContact(c);
    const aliasStatus = await checkAlias(m, c);
    if (aliasStatus.status === 'registered') {
      await sendOTP(m, c);
      const availableAt = Date.now() + OTP_RESEND_INTERVAL_MS;
      setResendAvailableAt(availableAt);
      savePendingLogin({
        method: m,
        contact: c,
        resendAvailableAt: availableAt,
      });
      setStep('otp');
      return;
    }
    setStep('onboarding');
  }

  async function handleProfileSubmit(submitted: OnboardingProfileData) {
    setPendingProfileOnboarding({
      method,
      alias: contact,
      origin: WALLET_ORIGIN,
      profile: submitted,
    });
    profileRef.current = submitted;
    await sendOTP(method, contact);
    const availableAt = Date.now() + OTP_RESEND_INTERVAL_MS;
    setResendAvailableAt(availableAt);
    savePendingLogin({
      method,
      contact,
      resendAvailableAt: availableAt,
      profile: submitted,
    });
    setStep('otp');
  }

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center bg-background px-5 py-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(95%_55%_at_50%_0%,rgba(18,175,225,0.16),transparent_65%)] dark:bg-[radial-gradient(95%_55%_at_50%_0%,color-mix(in_oklch,var(--muted)_70%,transparent),transparent_65%)]"
      />
      <div className="w-full max-w-sm rounded-[1.9rem] border border-border/70 bg-card/85 p-6 shadow-[0_24px_45px_-35px_color-mix(in_oklch,var(--foreground)_38%,transparent)] dark:shadow-[0_24px_45px_-35px_rgb(0_0_0_/_0.76)] backdrop-blur-xl">
        {step === 'method' ? (
          <LoginMethodSelect onContinue={handleMethodSelect} />
        ) : step === 'otp' ? (
          <OTPVerify
            method={method}
            contact={contact}
            resendAvailableAt={resendAvailableAt}
            redirectTo={safeRedirectPath(redirect)}
            onResendAvailableAtChange={(availableAt) => {
              setResendAvailableAt(availableAt);
              savePendingLogin({
                method,
                contact,
                resendAvailableAt: availableAt,
                profile: profileRef.current,
              });
            }}
            onVerified={() => clearPendingLogin()}
            onBack={() => {
              resetOnboardingState();
              forgetProfile();
              clearPendingLogin();
              setStep('method');
            }}
            onOnboardingRequired={() => {
              clearPendingLogin();
              forgetProfile();
              setStep('onboarding');
            }}
            onAlreadyRegistered={() => {
              forgetProfile();
              savePendingLogin({ method, contact, resendAvailableAt });
            }}
          />
        ) : (
          <OnboardingProfile
            onBack={() => {
              resetOnboardingState();
              forgetProfile();
              clearPendingLogin();
              setStep('method');
            }}
            onSubmitProfile={handleProfileSubmit}
          />
        )}
      </div>
    </div>
  );
}
