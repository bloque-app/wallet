import { CircleCheck, KeyRound, LoaderCircle, LogIn } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '~/components/ui/button';
import {
  type PasskeyFailureReason,
  PasskeyRegistrationError,
} from '~/domain/passkey/types';

type State =
  | { kind: 'idle' }
  | { kind: 'working' }
  | { kind: 'failed'; reason: PasskeyFailureReason };

/** Failures the user cannot fix by trying again from this page. */
const FINAL_REASONS: ReadonlySet<PasskeyFailureReason> = new Set([
  'blocked',
  'session',
  // The SDK already retried; another try now hits the same limit.
  'rate_limited',
]);

/**
 * Sends the signed-in user to register a passkey in Bloque's identity app,
 * and confirms it once they are back.
 */
export function PasskeyRegistration({
  registered,
  onStart,
  onSignInAgain,
}: {
  /** The identity app sent the person back after registering. */
  registered: boolean;
  /** Creates the registration link and leaves for it. */
  onStart: () => Promise<void>;
  /** Ends the session and comes back here once signed in again. */
  onSignInAgain: () => void;
}) {
  const { t } = useTranslation();
  const [state, setState] = useState<State>({ kind: 'idle' });

  // Coming back with the browser's back button can restore this page from
  // the back/forward cache, still `working` from the moment it left.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setState({ kind: 'idle' });
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  const start = async () => {
    setState({ kind: 'working' });
    try {
      // On success the page is already leaving: stay on `working`.
      await onStart();
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

  if (registered) {
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
