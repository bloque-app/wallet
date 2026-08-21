import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

/**
 * Dispatched on `window` whenever a query or mutation fails with a 401 — the
 * session's token was rejected outright, not just stale locally. Nothing
 * else in the app re-checks session validity mid-session (`checkAuth` in
 * `AuthProvider` only runs once, on mount), so without this a token that
 * expires while the wallet is open leaves `isAuthenticated` stuck `true`
 * while every request quietly fails. `AuthProvider` listens for this event
 * to actually close the session.
 */
export const SESSION_EXPIRED_EVENT = 'bloque:session-expired';

function notifyIfSessionExpired(error: unknown) {
  if (
    error &&
    typeof error === 'object' &&
    'status' in error &&
    (error as { status?: unknown }).status === 401
  ) {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: notifyIfSessionExpired }),
  mutationCache: new MutationCache({ onError: notifyIfSessionExpired }),
});
