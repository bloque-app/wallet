import { useNavigate } from '@tanstack/react-router';
import { Clock, ShieldAlert, ShieldCheck } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackButton } from '~/components/back-button';
import { Button } from '~/components/ui/button';
import { useAuth } from '~/contexts/auth/auth-context';
import { type KycGateState, kycGateState } from '~/contexts/auth/kyc-gate';

const ICONS: Record<Exclude<KycGateState, 'allowed'>, typeof ShieldCheck> = {
  not_started: ShieldCheck,
  in_review: Clock,
  rejected: ShieldAlert,
  unconfirmed: ShieldAlert,
};

/** Renders `children` only once the user's KYC is approved. */
export function RequireKyc({
  children,
  onBack,
  variant = 'default',
}: {
  children: ReactNode;
  /** Back button target. Defaults to home. */
  onBack?: () => void;
  /** `brebKey` swaps the not-started copy for key registration. */
  variant?: 'default' | 'brebKey';
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const state = kycGateState(user?.kycStatus);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshedRef = useRef(false);

  // The status is read once per session; re-read it on entry so a user
  // approved since then is not stopped here.
  useEffect(() => {
    if (state === 'allowed' || refreshedRef.current) return;
    refreshedRef.current = true;
    void refreshUser();
  }, [state, refreshUser]);

  if (state === 'allowed') {
    return children;
  }

  const Icon = ICONS[state];
  const copyKey =
    variant === 'brebKey' && state === 'not_started'
      ? 'kycGate.brebKey'
      : `kycGate.${state}`;

  const handleAction = async () => {
    if (state !== 'unconfirmed') {
      void navigate({ to: '/kyc' });
      return;
    }
    setIsRefreshing(true);
    try {
      await refreshUser();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <BackButton onClick={onBack ?? (() => void navigate({ to: '/' }))} />
      </div>
      <section className="flex flex-col items-center gap-3 rounded-3xl border border-border/75 bg-card/85 px-6 py-10 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/25 bg-primary/[0.06]">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <p className="text-base font-semibold text-foreground">
          {t(`${copyKey}.title`)}
        </p>
        <p className="text-sm text-muted-foreground">
          {t(`${copyKey}.description`)}
        </p>
        <Button
          className="mt-2 h-11 w-full rounded-xl text-sm font-medium"
          disabled={isRefreshing}
          onClick={() => void handleAction()}
        >
          {t(`kycGate.${state}.cta`)}
        </Button>
      </section>
    </div>
  );
}
