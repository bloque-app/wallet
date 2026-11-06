import { createFileRoute, Outlet } from '@tanstack/react-router';
import { RequireVirtualAccount } from '~/components/account/require-virtual-account';
import { RequireKyc } from '~/components/kyc/require-kyc';

export const Route = createFileRoute('/_authed/send')({
  component: () => (
    <RequireVirtualAccount>
      <RequireKyc>
        <Outlet />
      </RequireKyc>
    </RequireVirtualAccount>
  ),
});
