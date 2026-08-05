import {
  createRootRouteWithContext,
  Outlet,
  useLocation,
  useNavigate,
} from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { AppHeader } from '~/components/app-header';
import { BottomNav } from '~/components/bottom-nav';
import { KycProgressBanner } from '~/components/kyc/kyc-progress-banner';
import { type AuthContextProps, useAuth } from '~/contexts/auth/auth-context';
import { shouldShowKycBanner } from '~/contexts/auth/kyc-banner-visibility';
import { withTimeout } from '~/contexts/auth/kyc-status';
import { shouldStartTosGate } from '~/contexts/auth/tos-gate-redirect';
import { bloqueTosRepository } from '~/infra/bloque/tos-repository';

export const Route = createRootRouteWithContext<{
  auth: AuthContextProps;
}>()({
  component: RootComponent,
});

/**
 * How long the wallet will hold a blank screen waiting for a gate URL before
 * giving up and letting the user in. Longer than the 5s status ceilings
 * because this one is a deliberate interstitial rather than a background
 * lookup — but bounded, so a struggling compliance service delays the prompt
 * instead of blocking the app.
 */
const GATE_START_TIMEOUT_MS = 10_000;

/**
 * Mints a gate URL and navigates to it. Resolves `false` if that could not be
 * done, so the caller can let the user through instead.
 *
 * Deliberately a module-scope function rather than an inline closure in the
 * effect below. With `reactCompiler` on, the same code written inline compiled
 * to a memoized closure whose `catch (error)` binding got renamed by the
 * minifier while the reference to it did not:
 *
 *     catch(e){console.error("Could not start…",error),j(!0)}
 *
 * — a ReferenceError on the one path whose entire job is to recover from an
 * error, so the fail-open behaviour never ran and the blank screen stuck. It
 * only reproduces in a production build, which is what `test:e2e` runs
 * against. Keeping this outside the component keeps it out of the compiler's
 * output entirely.
 */
async function startTosGate(): Promise<boolean> {
  try {
    // Bounded, because the blank screen lasts exactly as long as this does.
    // The SDK retries a failed request 3 times with backoff up to 30s, so an
    // unbounded wait could hold someone on an empty screen for over a minute.
    const { url } = await withTimeout(
      bloqueTosRepository.start(`${window.location.origin}/`),
      GATE_START_TIMEOUT_MS,
    );
    // A full-page navigation rather than a router one: the gate is served by
    // compliance, not by this app. Returning re-runs `checkAuth`, which
    // re-derives `tosStatus` from the acceptance just recorded.
    window.location.href = url;
    return true;
  } catch (cause) {
    console.error('Could not start the terms acceptance flow', cause);
    return false;
  }
}

function RootComponent() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const tosGateStarted = useRef(false);
  const [gateUnavailable, setGateUnavailable] = useState(false);

  // `window.location.search`, not the router's — the gate is a hosted page on
  // another origin and hands the user back with a full page load, so the
  // browser's own URL is the authoritative record of having just returned.
  const mustAcceptTos = shouldStartTosGate({
    tosStatus: user?.tosStatus,
    search: typeof window === 'undefined' ? '' : window.location.search,
  });

  useEffect(() => {
    if (!isAuthenticated || !mustAcceptTos) return;
    // A ref, not state: this must fire once per page load even though the
    // effect re-runs on unrelated renders, and starting a second gate would
    // invalidate the first one's capability token.
    if (tosGateStarted.current) return;
    tosGateStarted.current = true;

    void startTosGate().then((started) => {
      if (!started) setGateUnavailable(true);
    });
  }, [isAuthenticated, mustAcceptTos]);

  const isKycRoute = location.pathname.startsWith('/kyc');
  const isHomeRoute = location.pathname === '/';
  const isBackToHomeRoute =
    /^\/(accounts|card|movements|profile|topup)\/?$/.test(location.pathname);

  useEffect(() => {
    if (!isAuthenticated || isHomeRoute || isKycRoute || !isBackToHomeRoute)
      return;

    const handlePopState = () => {
      const isDrawerBackHandling = (
        window as Window & { __drawerBackHandling?: boolean }
      ).__drawerBackHandling;
      if (isDrawerBackHandling) return;

      const hasOpenDrawer = !!document.querySelector(
        '[data-slot="drawer-content"]',
      );
      if (hasOpenDrawer) return;
      if (window.location.pathname === '/') return;
      navigate({ to: '/', replace: true });
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isAuthenticated, isHomeRoute, isKycRoute, isBackToHomeRoute, navigate]);

  if (!isAuthenticated) {
    return <Outlet />;
  }

  // Nothing of the wallet is rendered behind the gate: showing the home screen
  // for the beat before `window.location.href` takes effect would flash
  // balances at someone who has not accepted the terms yet.
  //
  // Only while the redirect is actually in flight — if minting the gate fails,
  // `gateUnavailable` lets them through to the wallet instead of stranding
  // them on a blank screen. Same fail-open reasoning as `deriveTosStatus`
  // returning 'unknown': being asked a day late beats being locked out.
  if (mustAcceptTos && !gateUnavailable) {
    return <div className="min-h-dvh bg-background" />;
  }

  if (isKycRoute) {
    return (
      <div className="relative min-h-dvh bg-background">
        <Outlet />
      </div>
    );
  }

  const showKycBanner = shouldShowKycBanner(user?.kycStatus);

  return (
    <div className="relative flex min-h-dvh flex-col bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120%_70%_at_50%_-15%,color-mix(in_oklch,var(--muted)_72%,transparent),transparent_60%)]"
      />
      {isHomeRoute && <AppHeader />}
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-28 pt-5">
        {showKycBanner && <KycProgressBanner kycStatus={user?.kycStatus} />}
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
