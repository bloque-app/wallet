import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { BackButton } from '~/components/back-button';
import { LegalMarkdown } from '~/routes/_authed/legal/-components/legal-markdown';
import { TERMS_CONTENT_ES } from '~/routes/_authed/legal/-content/terms';

export const Route = createFileRoute('/_authed/legal/terms/')({
  component: RouteComponent,
});

// The source document opens with its own "# Términos y Condiciones..."
// heading; the page renders its own h1 above instead, so that first block
// is dropped here rather than shown twice.
const TERMS_BODY = TERMS_CONTENT_ES.slice(TERMS_CONTENT_ES.indexOf('\n\n') + 2);

function RouteComponent() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <BackButton onClick={() => navigate({ to: '/profile' })} />
      </div>

      <h1 className="text-2xl font-bold tracking-[-0.025em] text-foreground">
        {t('profile.rows.termsAndConditions')}
      </h1>

      <LegalMarkdown content={TERMS_BODY} />
    </div>
  );
}
