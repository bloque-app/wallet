import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { VerificationStatus } from '~/domain/kyc/types';
import { KycRequiredDrawer } from './kyc-required-drawer';

const navigate = vi.fn();
const refreshUser = vi.fn(async () => {});
let kycStatus: VerificationStatus | undefined;

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
}));

vi.mock('~/contexts/auth/auth-context', () => ({
  useAuth: () => ({ user: { kycStatus }, refreshUser }),
}));

vi.mock('~/components/ui/drawer', () => {
  const Pass = ({ children }: { children: ReactNode }) => <div>{children}</div>;
  return {
    Drawer: ({ open, children }: { open: boolean; children: ReactNode }) =>
      open ? <div>{children}</div> : null,
    DrawerContent: Pass,
    DrawerDescription: Pass,
    DrawerFooter: Pass,
    DrawerHeader: Pass,
    DrawerTitle: Pass,
  };
});

function renderDrawer() {
  return render(<KycRequiredDrawer open onOpenChange={() => {}} />);
}

describe('KycRequiredDrawer', () => {
  beforeEach(() => {
    navigate.mockClear();
    refreshUser.mockClear();
  });

  test('renders nothing for an approved user', () => {
    kycStatus = 'approved';
    const { container } = renderDrawer();

    expect(container).toBeEmptyDOMElement();
  });

  test('asks a user who never started to verify before registering a key', () => {
    kycStatus = 'not_started';
    renderDrawer();

    expect(
      screen.getByText('Verifica tu identidad para registrar tu llave'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText('Verificar identidad'));
    expect(navigate).toHaveBeenCalledWith({ to: '/kyc' });
  });

  test('shows the in-review copy for a verification in review', () => {
    kycStatus = 'awaiting_verification';
    renderDrawer();

    expect(
      screen.getByText('Tu verificación está en revisión'),
    ).toBeInTheDocument();
  });

  test('an unconfirmed status retries the lookup instead of opening verification', async () => {
    kycStatus = undefined;
    renderDrawer();

    fireEvent.click(screen.getByText('Reintentar'));
    await waitFor(() => expect(refreshUser).toHaveBeenCalledTimes(1));
    expect(navigate).not.toHaveBeenCalled();
  });
});
