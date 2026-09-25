import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { BackButton } from '~/components/back-button';
import { LegalMarkdown } from '~/routes/_authed/legal/-components/legal-markdown';
import { PRIVACY_CONTENT_ES } from '~/routes/_authed/legal/-content/privacy';

export const Route = createFileRoute('/_authed/legal/privacy/')({
  component: RouteComponent,
});

// Body without the document's leading title.
const PRIVACY_BODY = PRIVACY_CONTENT_ES.slice(
  PRIVACY_CONTENT_ES.indexOf('\n\n') + 2,
);

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

      <LegalMarkdown content={PRIVACY_BODY} />
    </div>
  );
}
