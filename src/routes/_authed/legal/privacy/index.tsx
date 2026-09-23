import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BackButton } from '~/components/back-button';

export const Route = createFileRoute('/_authed/legal/privacy/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <BackButton onClick={() => navigate({ to: '/profile' })} />
      </div>

      <h1 className="text-2xl font-bold tracking-[-0.025em] text-foreground">
        {t('profile.rows.privacyPolicy')}
      </h1>

      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border/85 bg-card/85 px-6 py-12 text-center">
        <Clock className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
        <p className="text-sm font-semibold text-foreground">
          {t('legal.privacy.comingSoonTitle')}
        </p>
        <p className="text-xs text-muted-foreground">
          {t('legal.privacy.comingSoonDescription')}
        </p>
      </div>
    </div>
  );
}
