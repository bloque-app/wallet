import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ComingSoonScreen } from '~/components/coming-soon';
import { CARDS_ENABLED } from '~/config/features';

export const Route = createFileRoute('/_authed/card')({
  component: CARDS_ENABLED ? Outlet : CardsComingSoon,
});

function CardsComingSoon() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <ComingSoonScreen
      title={t('card.title')}
      onBack={() => void navigate({ to: '/' })}
    />
  );
}
