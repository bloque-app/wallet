import { createFileRoute, Outlet } from '@tanstack/react-router';
import { RequireVirtualAccount } from '~/components/account/require-virtual-account';

export const Route = createFileRoute('/_authed/topup')({
  component: () => (
    <RequireVirtualAccount>
      <Outlet />
    </RequireVirtualAccount>
  ),
});
