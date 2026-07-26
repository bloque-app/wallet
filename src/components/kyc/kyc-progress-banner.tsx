import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import type { AuthContextProps } from '~/contexts/auth/auth-context';
import { KycStepItem } from './kyc-step-item';

interface KycProgressBannerProps {
  kycStatus?: AuthContextProps['user']['kycStatus'];
}

export function KycProgressBanner({ kycStatus }: KycProgressBannerProps) {
  const { t } = useTranslation();
  const verificationDone = kycStatus === 'approved';
  const verificationInReview = kycStatus === 'awaiting_verification';
  const verificationRejected = kycStatus === 'rejected';

  const title = verificationRejected
    ? t('kyc.banner.rejectedTitle')
    : t('kyc.banner.defaultTitle');
  const description = verificationRejected
    ? t('kyc.banner.rejectedDescription')
    : t('kyc.banner.defaultDescription');
  const ctaLabel = verificationRejected
    ? t('kyc.banner.retryCta')
    : t('kyc.banner.startCta');

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
        <KycStepItem
          label={t('kyc.banner.stepRegistration')}
          state="done"
          stepNumber={1}
        />
        <div className="h-px flex-1 bg-border" />
        <KycStepItem
          label={t('kyc.banner.stepVerification')}
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
        <KycStepItem
          label={t('kyc.banner.stepActivation')}
          state="pending"
          stepNumber={3}
        />
      </div>
    </section>
  );
}
