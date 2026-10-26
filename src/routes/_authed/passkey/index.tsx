import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { BackButton } from '~/components/back-button';
import { PasskeyRegistration } from '~/components/passkey/passkey-registration';
import { useAuth } from '~/contexts/auth/auth-context';
import { bloquePasskeyRepository } from '~/infra/bloque/passkey-repository';

/**
 * Where a person registers their passkey again, e.g. when the operation
 * approval page answers `passkey_not_registered`. Signed-out visitors go
 * through /login and come back here.
 *
 * The passkey itself is created in Bloque's identity app, under its relying
 * party: this page sends the person there and the app sends them back with
 * `?registered=1`.
 */
export const Route = createFileRoute('/_authed/passkey/')({
  validateSearch: (search: Record<string, unknown>): { registered?: true } =>
    search.registered === 1 || search.registered === '1'
      ? { registered: true }
      : {},
  component: RouteComponent,
});

const RETURN_PATH = '/passkey?registered=1';

function RouteComponent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { registered } = Route.useSearch();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <BackButton onClick={() => navigate({ to: '/profile' })} />
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-[-0.025em] text-foreground">
          {t('passkey.title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('passkey.description')}
        </p>
      </div>

      <PasskeyRegistration
        registered={registered === true}
        onStart={async () => {
          const { url } = await bloquePasskeyRepository.createLink(
            `${window.location.origin}${RETURN_PATH}`,
          );
          // A full-page navigation: the identity app is another site.
          window.location.assign(url);
        }}
        onSignInAgain={async () => {
          await logout();
          navigate({ to: '/login', search: { redirect: '/passkey' } });
        }}
      />
    </div>
  );
}
