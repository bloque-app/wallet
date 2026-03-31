import {
  createRootRouteWithContext,
  Outlet,
  useLocation,
  useNavigate,
} from '@tanstack/react-router';
import { useEffect } from 'react';
import { AppHeader } from '~/components/app-header';
import { BottomNav } from '~/components/bottom-nav';
import { KycProgressBanner } from '~/components/kyc/kyc-progress-banner';
import { type AuthContextProps, useAuth } from '~/contexts/auth/auth-context';

export const Route = createRootRouteWithContext<{
  auth: AuthContextProps;
}>()({
  component: RootComponent,
});

function RootComponent() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

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

  if (isKycRoute) {
    return (
      <div className="relative min-h-dvh bg-background">
        <Outlet />
      </div>
    );
  }

  const showKycBanner = user?.kycStatus !== 'approved';

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
