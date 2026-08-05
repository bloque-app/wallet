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
import { shouldStartTosGate } from '~/contexts/auth/tos-gate-redirect';
import { bloqueTosRepository } from '~/infra/bloque/tos-repository';

export const Route = createRootRouteWithContext<{
  auth: AuthContextProps;
}>()({
  component: RootComponent,
});

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

    void (async () => {
      try {
        const { url } = await bloqueTosRepository.start(
          `${window.location.origin}/`,
        );
        // A full-page navigation rather than a router one: the gate is served
        // by compliance, not by this app. Returning re-runs `checkAuth`, which
        // re-derives `tosStatus` from the acceptance just recorded.
        window.location.href = url;
      } catch (error) {
        console.error('Could not start the terms acceptance flow', error);
        setGateUnavailable(true);
      }
    })();
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
