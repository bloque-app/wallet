import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { BackButton } from '~/components/back-button';
import { PasskeyRegistration } from '~/components/passkey/passkey-registration';
import { registerPasskey } from '~/domain/passkey/register';
import { bloquePasskeyRepository } from '~/infra/bloque/passkey-repository';

/**
 * Where a person registers their passkey again, e.g. when the operation
 * approval page answers `passkey_not_registered`. This is the URL Origins'
 * `ORIGINS_OPERATION_APPROVAL_REREGISTER_URL` points to; signed-out visitors
 * go through /login and come back here.
 */
export const Route = createFileRoute('/_authed/passkey/')({
  component: RouteComponent,
});

const supportsPasskeys = () =>
  typeof window !== 'undefined' &&
  typeof window.PublicKeyCredential !== 'undefined' &&
  typeof navigator.credentials?.create === 'function';

function RouteComponent() {
  const { t } = useTranslation();
  const navigate = useNavigate();

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
        supported={supportsPasskeys()}
        onRegister={() =>
          registerPasskey(bloquePasskeyRepository, (options) =>
            navigator.credentials.create(options),
          )
        }
      />
    </div>
  );
}
