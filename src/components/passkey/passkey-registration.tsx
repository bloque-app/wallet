import { CircleCheck, KeyRound, LoaderCircle, LogIn } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '~/components/ui/button';
import {
  type PasskeyFailureReason,
  PasskeyRegistrationError,
} from '~/domain/passkey/types';

type State =
  | { kind: 'idle' }
  | { kind: 'working' }
  | { kind: 'done' }
  | { kind: 'failed'; reason: PasskeyFailureReason };

/** Failures the user cannot fix by trying again from this page. */
const FINAL_REASONS: ReadonlySet<PasskeyFailureReason> = new Set([
  'unsupported_browser',
  'blocked',
  'session',
]);

/**
 * Registers a passkey for the signed-in user. The ceremony only starts from
 * the button: browsers (iOS Safari in particular) refuse
 * `navigator.credentials.create` without user activation.
 */
export function PasskeyRegistration({
  supported,
  onRegister,
  onSignInAgain,
}: {
  /** Whether this browser can create passkeys at all. */
  supported: boolean;
  onRegister: () => Promise<void>;
  /** Ends the session and comes back here once signed in again. */
  onSignInAgain: () => void;
}) {
  const { t } = useTranslation();
  const [state, setState] = useState<State>(
    supported
      ? { kind: 'idle' }
      : { kind: 'failed', reason: 'unsupported_browser' },
  );

  const start = async () => {
    setState({ kind: 'working' });
    try {
      await onRegister();
      setState({ kind: 'done' });
    } catch (error) {
      setState({
        kind: 'failed',
        reason:
          error instanceof PasskeyRegistrationError
            ? error.reason
            : 'unavailable',
      });
    }
  };

  if (state.kind === 'done') {
    return (
      <div
        role="status"
        className="flex flex-col items-center gap-3 rounded-2xl border border-primary/20 bg-primary/[0.06] p-6 text-center"
      >
        <CircleCheck className="h-8 w-8 text-primary" strokeWidth={1.5} />
        <p className="text-sm font-semibold text-foreground">
          {t('passkey.success.title')}
        </p>
        <p className="text-sm text-muted-foreground">
          {t('passkey.success.description')}
        </p>
      </div>
    );
  }

  const failed = state.kind === 'failed';
  const canRetry = failed && !FINAL_REASONS.has(state.reason);

  return (
    <div className="flex flex-col gap-4">
      {state.kind === 'failed' && (
        <p
          role="alert"
          className="rounded-2xl border border-destructive/30 bg-destructive/[0.06] p-4 text-sm text-foreground"
        >
          {t(`passkey.errors.${state.reason}`)}
        </p>
      )}
      {failed && state.reason === 'session' && (
        <Button
          type="button"
          onClick={onSignInAgain}
          className="h-12 w-full gap-2 rounded-2xl text-sm font-medium"
        >
          <LogIn className="h-4 w-4" />
          {t('passkey.signInAgain')}
        </Button>
      )}
      {(!failed || canRetry) && (
        <Button
          type="button"
          onClick={start}
          disabled={state.kind === 'working'}
          className="h-12 w-full gap-2 rounded-2xl text-sm font-medium"
        >
          {state.kind === 'working' ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <KeyRound className="h-4 w-4" />
          )}
          {state.kind === 'working'
            ? t('passkey.working')
            : canRetry
              ? t('passkey.retry')
              : t('passkey.action')}
        </Button>
      )}
    </div>
  );
}
