import { Link } from '@tanstack/react-router';
import type { AuthContextProps } from '~/contexts/auth/auth-context';
import { KycStepItem } from './kyc-step-item';

interface KycProgressBannerProps {
  kycStatus?: AuthContextProps['user']['kycStatus'];
}

export function KycProgressBanner({ kycStatus }: KycProgressBannerProps) {
  const verificationDone = kycStatus === 'approved';
  const verificationInReview = kycStatus === 'awaiting_verification';
  const verificationRejected = kycStatus === 'rejected';

  const title = verificationRejected
    ? 'No pudimos verificar tu identidad'
    : 'Completa tu verificación';
  const description = verificationRejected
    ? 'Tu verificación no fue aprobada. Inténtalo de nuevo para activar tu tarjeta.'
    : 'Falta verificar tu identidad para activar tu tarjeta.';
  const ctaLabel = verificationRejected
    ? 'Reintentar verificación'
    : 'Ir a verificar';

  return (
    <section className="mb-5 rounded-2xl border border-border/80 bg-card/85 p-4 shadow-[0_18px_30px_-32px_color-mix(in_oklch,var(--foreground)_45%,transparent)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <Link
          to="/kyc"
          className="shrink-0 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
        >
          {ctaLabel}
        </Link>
      </div>

      <div className="flex items-center justify-between gap-2">
        <KycStepItem label="Registro" state="done" stepNumber={1} />
        <div className="h-px flex-1 bg-border" />
        <KycStepItem
          label="Verificación"
          stepNumber={2}
          state={
            verificationDone
              ? 'done'
              : verificationRejected
                ? 'error'
                : verificationInReview
                  ? 'in_progress'
                  : 'pending'
          }
        />
        <div className="h-px flex-1 bg-border" />
        <KycStepItem label="Activación" state="pending" stepNumber={3} />
      </div>
    </section>
  );
}
