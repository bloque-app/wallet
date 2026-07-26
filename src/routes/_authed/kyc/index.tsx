import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useVerification } from '~/hooks/kyc/use-verification';

export const Route = createFileRoute('/_authed/kyc/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useTranslation();
  const { history } = useRouter();
  const { url, status, isBootstrapping, isError, hasUser } = useVerification();

  if (!hasUser) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-muted-foreground">
          {t('kyc.route.noUserUrn')}
        </p>
        <Link
          to="/"
          replace
          className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          {t('kyc.route.backHome')}
        </Link>
      </div>
    );
  }

  if (isBootstrapping) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-6 text-center">
        <p className="text-sm text-muted-foreground">
          {t('kyc.route.starting')}
        </p>
      </div>
    );
  }

  if (status === 'approved') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-muted-foreground">
          {t('kyc.route.alreadyVerified')}
        </p>
        <Link
          to="/"
          replace
          className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          {t('kyc.route.backHome')}
        </Link>
      </div>
    );
  }

  if (isError || !url) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-muted-foreground">
          {t('kyc.route.startError')}
        </p>
        <Link
          to="/"
          replace
          className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          {t('kyc.route.backHome')}
        </Link>
      </div>
    );
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-background">
      <iframe
        src={url}
        title={t('kyc.route.iframeTitle')}
        className="h-full w-full border-0"
        sandbox="allow-forms allow-scripts allow-same-origin allow-popups"
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 p-3">
        <button
          type="button"
          onClick={() => history.back()}
          className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-border bg-background/85 px-2.5 py-1 text-xs text-muted-foreground backdrop-blur hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('common.back')}
        </button>
      </div>
    </div>
  );
}
