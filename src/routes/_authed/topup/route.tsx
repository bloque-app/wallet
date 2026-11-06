import {
  createFileRoute,
  Outlet,
  useLocation,
  useNavigate,
} from '@tanstack/react-router';
import { RequireVirtualAccount } from '~/components/account/require-virtual-account';
import { RequireKyc } from '~/components/kyc/require-kyc';

export const Route = createFileRoute('/_authed/topup')({
  component: RouteComponent,
});

/** The method list (and its fees) is open; each method asks for KYC. */
function RouteComponent() {
  const navigate = useNavigate();
  const pathname = useLocation({ select: (location) => location.pathname });
  const isMethodList = pathname.replace(/\/$/, '') === '/topup';

  return (
    <RequireVirtualAccount>
      {isMethodList ? (
        <Outlet />
      ) : (
        <RequireKyc onBack={() => void navigate({ to: '/topup' })}>
          <Outlet />
        </RequireKyc>
      )}
    </RequireVirtualAccount>
  );
}
